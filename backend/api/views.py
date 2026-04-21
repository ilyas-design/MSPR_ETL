from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ActivitePhysique,
    GymSession,
    Nutrition,
    Patient,
    PendingChange,
    Sante,
)
from .permissions import IsSupervisor, is_supervisor
from .serializers import (
    ActivitePhysiqueSerializer,
    GymSessionSerializer,
    NutritionSerializer,
    PatientSerializer,
    PendingChangeSerializer,
    SanteSerializer,
)


# ---------------------------------------------------------------------------
# Workflow d'approbation : mixin pour les tables ETL
# ---------------------------------------------------------------------------

def _pk_of(instance, viewset) -> str:
    """Retourne l'identifiant utilisé dans l'URL (lookup_field) sous forme str."""
    lookup = getattr(viewset, "lookup_field", "pk")
    value = getattr(instance, lookup, None)
    if value is None:
        value = instance.pk
    return str(value)


class ApprovalWorkflowMixin:
    """Bloque les mutations directes pour les utilisateurs non superviseurs.

    Comportement :
    - GET (list/retrieve) : non modifié.
    - PATCH / PUT / DELETE :
        * superviseur → appliqué immédiatement (comportement standard DRF) ;
        * utilisateur authentifié → crée une ``PendingChange`` et renvoie 202.
    - POST (création) : réservé aux superviseurs (les créations massives
      passent par l'ETL, pas par l'API publique).
    """

    #: nom logique de la table cible (ex. "patient", "sante"…)
    approval_table_name: str = ""

    def _table_name(self) -> str:
        return self.approval_table_name or self.queryset.model._meta.db_table

    def _queue_pending(self, request, *, operation, instance=None, changes=None):
        if instance is not None:
            record_id = _pk_of(instance, self)
        else:
            record_id = str(request.data.get(self.lookup_field or "pk", ""))
        pending = PendingChange.objects.create(
            table_name=self._table_name(),
            record_id=record_id,
            operation=operation,
            changes=dict(changes or {}),
            status=PendingChange.STATUS_PENDING,
            requested_by=request.user if request.user.is_authenticated else None,
        )
        payload = PendingChangeSerializer(pending).data
        payload["detail"] = "Modification soumise : en attente de validation."
        return Response(payload, status=status.HTTP_202_ACCEPTED)

    def create(self, request, *args, **kwargs):
        if not is_supervisor(request.user):
            return Response(
                {"detail": "La création directe est réservée aux superviseurs."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if is_supervisor(request.user):
            return super().update(request, *args, **kwargs)
        instance = self.get_object()
        return self._queue_pending(
            request, operation=PendingChange.OPERATION_UPDATE,
            instance=instance, changes=request.data,
        )

    def partial_update(self, request, *args, **kwargs):
        if is_supervisor(request.user):
            return super().partial_update(request, *args, **kwargs)
        instance = self.get_object()
        return self._queue_pending(
            request, operation=PendingChange.OPERATION_UPDATE,
            instance=instance, changes=request.data,
        )

    def destroy(self, request, *args, **kwargs):
        if is_supervisor(request.user):
            return super().destroy(request, *args, **kwargs)
        instance = self.get_object()
        return self._queue_pending(
            request, operation=PendingChange.OPERATION_DELETE, instance=instance,
        )


# ---------------------------------------------------------------------------
# ViewSets métier (tables ETL)
# ---------------------------------------------------------------------------

class PatientViewSet(ApprovalWorkflowMixin, viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    approval_table_name = "patient"


class SanteViewSet(ApprovalWorkflowMixin, viewsets.ModelViewSet):
    queryset = Sante.objects.all()
    serializer_class = SanteSerializer
    approval_table_name = "sante"


class NutritionViewSet(ApprovalWorkflowMixin, viewsets.ModelViewSet):
    queryset = Nutrition.objects.all()
    serializer_class = NutritionSerializer
    approval_table_name = "nutrition"


class ActivitePhysiqueViewSet(ApprovalWorkflowMixin, viewsets.ModelViewSet):
    queryset = ActivitePhysique.objects.all()
    serializer_class = ActivitePhysiqueSerializer
    approval_table_name = "activite_physique"


class GymSessionViewSet(ApprovalWorkflowMixin, viewsets.ModelViewSet):
    queryset = GymSession.objects.all()
    serializer_class = GymSessionSerializer
    approval_table_name = "gym_session"


# ---------------------------------------------------------------------------
# Workflow d'approbation : endpoints dédiés
# ---------------------------------------------------------------------------

_APPROVAL_TARGETS = {
    "patient": (Patient, "patient_id"),
    "sante": (Sante, "patient_id"),
    "nutrition": (Nutrition, "patient_id"),
    "activite_physique": (ActivitePhysique, "patient_id"),
    "gym_session": (GymSession, "id"),
}


def _apply_pending(pending: PendingChange) -> None:
    """Applique la modification approuvée sur la ligne cible.

    Les erreurs (ligne absente, table inconnue…) remontent en ValidationError
    pour que l'appelant renvoie un 400 explicite.
    """
    target = _APPROVAL_TARGETS.get(pending.table_name)
    if target is None:
        raise ValidationError(f"Table inconnue : {pending.table_name}")
    model, pk_field = target
    lookup = {pk_field: pending.record_id}
    try:
        instance = model.objects.get(**lookup)
    except model.DoesNotExist as exc:
        raise ValidationError(
            f"Ligne introuvable : {pending.table_name}/{pending.record_id}"
        ) from exc

    if pending.operation == PendingChange.OPERATION_DELETE:
        instance.delete()
        return

    changes = pending.changes or {}
    editable = {f.name for f in model._meta.get_fields() if hasattr(f, "attname")}
    for key, value in changes.items():
        if key in editable:
            setattr(instance, key, value)
    instance.save()


class PendingChangeViewSet(viewsets.ReadOnlyModelViewSet):
    """Lecture + actions ``approve`` / ``reject`` sur les modifications en attente."""

    serializer_class = PendingChangeSerializer
    queryset = PendingChange.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PendingChange.objects.all()
        user = self.request.user
        if not is_supervisor(user):
            qs = qs.filter(requested_by=user)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["post"], permission_classes=[IsSupervisor])
    def approve(self, request, pk=None):
        pending = get_object_or_404(PendingChange, pk=pk)
        if pending.status != PendingChange.STATUS_PENDING:
            return Response(
                {"detail": f"Demande déjà traitée ({pending.status})."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        _apply_pending(pending)
        pending.status = PendingChange.STATUS_APPROVED
        pending.reviewed_by = request.user
        pending.reviewed_at = timezone.now()
        pending.review_comment = request.data.get("comment", "") or ""
        pending.save(update_fields=["status", "reviewed_by", "reviewed_at", "review_comment"])
        return Response(PendingChangeSerializer(pending).data)

    @action(detail=True, methods=["post"], permission_classes=[IsSupervisor])
    def reject(self, request, pk=None):
        pending = get_object_or_404(PendingChange, pk=pk)
        if pending.status != PendingChange.STATUS_PENDING:
            return Response(
                {"detail": f"Demande déjà traitée ({pending.status})."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pending.status = PendingChange.STATUS_REJECTED
        pending.reviewed_by = request.user
        pending.reviewed_at = timezone.now()
        pending.review_comment = request.data.get("comment", "") or ""
        pending.save(update_fields=["status", "reviewed_by", "reviewed_at", "review_comment"])
        return Response(PendingChangeSerializer(pending).data)


class MeView(APIView):
    """Renvoie des infos sur l'utilisateur courant (pour le frontend)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response(
            {
                "username": user.get_username(),
                "is_supervisor": is_supervisor(user),
                "is_superuser": bool(user.is_superuser),
                "groups": list(user.groups.values_list("name", flat=True)),
            }
        )


# ---------------------------------------------------------------------------
# KPIs (inchangés)
# ---------------------------------------------------------------------------

class KPIView(APIView):
    """Endpoint principal pour tous les KPIs"""
    def get(self, request):
        diseases = Sante.objects.values('disease_type').annotate(count=Count('disease_type'))
        avg_cholesterol = Sante.objects.aggregate(Avg('cholesterol'))['cholesterol__avg']
        severity_dist = Sante.objects.values('severity').annotate(count=Count('severity'))

        avg_calories = Nutrition.objects.aggregate(Avg('daily_caloric_intake'))['daily_caloric_intake__avg']

        avg_exercise_hours = ActivitePhysique.objects.aggregate(Avg('weekly_exercice_hours'))['weekly_exercice_hours__avg']
        activity_levels = ActivitePhysique.objects.values('physical_activity_level').annotate(count=Count('physical_activity_level'))

        avg_calories_burned = GymSession.objects.aggregate(Avg('gym_calories_burned'))['gym_calories_burned__avg']
        workout_types = GymSession.objects.values('gym_workout_type').annotate(count=Count('gym_workout_type'))

        total_patients = Patient.objects.count()
        avg_age = Patient.objects.aggregate(Avg('age'))['age__avg']
        avg_bmi = Patient.objects.aggregate(Avg('bmi_calculated'))['bmi_calculated__avg']

        return Response({
            'total_patients': total_patients,
            'avg_age': round(avg_age, 2) if avg_age else 0,
            'avg_bmi': round(avg_bmi, 2) if avg_bmi else 0,
            'sante' : {
                'diseases': list(diseases),
                'avg_cholesterol': round(avg_cholesterol, 2) if avg_cholesterol else 0,
                'severity_distribution': list(severity_dist),
            },
            'nutrition': {
                'avg_calories': round(avg_calories, 2) if avg_calories else 0,
            },
            'activite_physique': {
                'avg_exercise_hours': round(float(avg_exercise_hours), 2) if avg_exercise_hours else 0,
                'activity_levels': list(activity_levels),
            },
            'gym':{
                'avg_calories_burned': round(avg_calories_burned, 2) if avg_calories_burned else 0,
                'workout_types': list(workout_types),
            },
        })


class EngagementKPIView(APIView):
    """KPI Engagement - participation et fréquence"""
    def get(self, request):
        total_patients = Patient.objects.count()
        active_patients = GymSession.objects.values('patient').distinct().count()
        total_sessions = GymSession.objects.count()
        avg_sessions_per_patient = total_sessions / active_patients if active_patients > 0 else 0

        engagement_rate = (active_patients / total_patients * 100) if total_patients > 0 else 0

        return Response({
            'total_patients': total_patients,
            'active_patients': active_patients,
            'engagement_rate': round(engagement_rate, 2),
            'total_sessions': total_sessions,
            'avg_sessions_per_patient': round(avg_sessions_per_patient, 2),
        })


class ConversionKPIView(APIView):
    """KPI Conversion - adhérence aux plans de régime et d'exercice"""
    def get(self, request):
        total_nutrition = Nutrition.objects.count()
        total_activity = ActivitePhysique.objects.count()

        high_adherence_nutrition = Nutrition.objects.filter(
            adherence_to_diet_plan__gte=0.75
        ).count()

        high_activity = ActivitePhysique.objects.filter(
            weekly_exercice_hours__gte=3
        ).count()

        conversion_nutrition = (high_adherence_nutrition / total_nutrition * 100) if total_nutrition > 0 else 0
        conversion_activity = (high_activity / total_activity * 100) if total_activity > 0 else 0

        return Response({
            'nutrition_conversion_rate': round(conversion_nutrition, 2),
            'activity_conversion_rate': round(conversion_activity, 2),
            'avg_conversion': round((conversion_nutrition + conversion_activity) / 2, 2),
            'high_adherence_nutrition': high_adherence_nutrition,
            'high_activity_patients': high_activity,
        })


class SatisfactionKPIView(APIView):
    """KPI Satisfaction - basé sur la santé et les résultats"""
    def get(self, request):
        total_patients = Patient.objects.count()

        healthy_cholesterol = Sante.objects.filter(
            cholesterol__gte=100, cholesterol__lte=200
        ).count()

        healthy_glucose = Sante.objects.filter(
            glucose__gte=70, glucose__lte=100
        ).count()

        low_severity = Sante.objects.filter(
            Q(severity='Low') | Q(severity__isnull=True)
        ).count()

        satisfaction_score = (
            (healthy_cholesterol + healthy_glucose + low_severity) / (total_patients * 3) * 100
        ) if total_patients > 0 else 0

        return Response({
            'overall_satisfaction_score': round(satisfaction_score, 2),
            'healthy_cholesterol_rate': round(healthy_cholesterol / total_patients * 100, 2) if total_patients > 0 else 0,
            'healthy_glucose_rate': round(healthy_glucose / total_patients * 100, 2) if total_patients > 0 else 0,
            'low_severity_rate': round(low_severity / total_patients * 100, 2) if total_patients > 0 else 0,
        })


class DataQualityKPIView(APIView):
    """KPI Qualité des données - Data profiling"""
    def get(self, request):
        total_patients = Patient.objects.count()

        complete_sante = Sante.objects.exclude(
            Q(cholesterol__isnull=True) | Q(glucose__isnull=True)
        ).count()

        complete_nutrition = Nutrition.objects.exclude(
            daily_caloric_intake__isnull=True
        ).count()

        complete_activity = ActivitePhysique.objects.exclude(
            weekly_exercice_hours__isnull=True
        ).count()

        completeness_sante = (complete_sante / total_patients * 100) if total_patients > 0 else 0
        completeness_nutrition = (complete_nutrition / total_patients * 100) if total_patients > 0 else 0
        completeness_activity = (complete_activity / total_patients * 100) if total_patients > 0 else 0

        overall_quality = (completeness_sante + completeness_nutrition + completeness_activity) / 3

        return Response({
            'overall_data_quality': round(overall_quality, 2),
            'completeness_sante': round(completeness_sante, 2),
            'completeness_nutrition': round(completeness_nutrition, 2),
            'completeness_activity': round(completeness_activity, 2),
            'total_records': {
                'patients': total_patients,
                'sante': Sante.objects.count(),
                'nutrition': Nutrition.objects.count(),
                'activite_physique': ActivitePhysique.objects.count(),
                'gym_sessions': GymSession.objects.count(),
            }
        })


# Ré-exporté pour les tests : permet de patcher `get_user_model` si besoin.
_User = get_user_model()
