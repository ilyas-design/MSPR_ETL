import hashlib

import httpx
from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import transaction
from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .filter_backends import PatientSearchFilter

from .models import (
    ActivitePhysique,
    Exercise,
    FoodLog,
    GymSession,
    MealEntry,
    Nutrition,
    Patient,
    PendingChange,
    Sante,
    UserProfile,
)
from .permissions import IsSupervisor, is_supervisor
from .serializers import (
    ActivitePhysiqueSerializer,
    ExerciseSerializer,
    FoodLogSerializer,
    GymSessionSerializer,
    MealEntrySerializer,
    NutritionSerializer,
    PatientSerializer,
    PendingChangeSerializer,
    SanteSerializer,
    UserProfileSerializer,
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
    queryset = Patient.objects.all().order_by("patient_id")
    serializer_class = PatientSerializer
    approval_table_name = "patient"
    filter_backends = [PatientSearchFilter, OrderingFilter]
    ordering_fields = (
        "patient_id",
        "age",
        "gender",
        "weight_kg",
        "height_cm",
        "bmi_calculated",
    )
    ordering = ("patient_id",)


class SanteViewSet(ApprovalWorkflowMixin, viewsets.ModelViewSet):
    queryset = Sante.objects.all().order_by("patient_id")
    serializer_class = SanteSerializer
    approval_table_name = "sante"
    pagination_class = None
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ("patient_id", "disease_type", "severity")
    ordering_fields = ("patient_id",)
    ordering = ("patient_id",)


class NutritionViewSet(ApprovalWorkflowMixin, viewsets.ModelViewSet):
    queryset = Nutrition.objects.all().order_by("patient_id")
    serializer_class = NutritionSerializer
    approval_table_name = "nutrition"
    pagination_class = None
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = (
        "patient_id",
        "diet_recommendation",
        "dietary_restrictions",
        "preferred_cuisine",
        "allergies",
    )
    ordering_fields = ("patient_id",)
    ordering = ("patient_id",)


class ActivitePhysiqueViewSet(ApprovalWorkflowMixin, viewsets.ModelViewSet):
    queryset = ActivitePhysique.objects.all().order_by("patient_id")
    serializer_class = ActivitePhysiqueSerializer
    approval_table_name = "activite_physique"
    pagination_class = None
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ("patient_id", "physical_activity_level")
    ordering_fields = ("patient_id",)
    ordering = ("patient_id",)


class GymSessionViewSet(ApprovalWorkflowMixin, viewsets.ModelViewSet):
    queryset = GymSession.objects.all().order_by("id")
    serializer_class = GymSessionSerializer
    approval_table_name = "gym_session"
    pagination_class = None
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ("patient_id", "gym_workout_type")
    ordering_fields = (
        "id",
        "patient_id",
        "gym_calories_burned",
        "gym_session_duration_hours",
        "gym_workout_type",
    )
    ordering = ("id",)


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


# Inscription utilisateur 

from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username= (request.data.get('username') or '').strip()
        email = (request.data.get('email') or '').strip() or username
        password = request.data.get('password') or ''

        if not username:
            return Response(
                {'detail': 'Username is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        if len(password) < 8:
            return Response(
                {'detail': 'Password must be at least 8 characters long.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        User = get_user_model()
        if User.objects.filter(username=username).exists():
            return Response(
                {'detail': 'Username already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try: 
            validate_password(password)
        except DjangoValidationError as exc:
            return Response(
                {'detail': exc.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )
        

        user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
            )


        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )
    




class UserProfileView(APIView):

    def _get_profile(self, user):
        # get_or_create pour gérer les vieux users qui n'ont pas de profil
        # (créés avant l'ajout de UserProfile)
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile
    
    def get(self, request):
        profile = self._get_profile(request.user)
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile = self._get_profile(request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

      
    
# ---------------------------------------------------------------------------
# Data ViewSets — ETL tables (read-only, SQLite via db_router)
# ---------------------------------------------------------------------------

class FoodLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FoodLog.objects.all().order_by('food_item')
    serializer_class = FoodLogSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ('food_item', 'category', 'meal_type')
    ordering_fields = ('food_item', 'calories_kcal', 'protein_g', 'category')
    ordering = ('food_item',)


class ExerciseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Exercise.objects.all().order_by('name')
    serializer_class = ExerciseSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ('name', 'body_part', 'target', 'level', 'equipment')
    ordering_fields = ('name', 'body_part', 'level')
    ordering = ('name',)


# ---------------------------------------------------------------------------
# User layer — registration, profile, meal history (PostgreSQL)
# ---------------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — creates User + UserProfile atomically."""

    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        User = get_user_model()
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return Response(
                {'detail': 'username and password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username=username).exists():
            return Response(
                {'detail': 'Username already taken.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile_data = {
            'goal': request.data.get('goal', 'maintenance'),
            'daily_calorie_target': request.data.get('daily_calorie_target'),
            'allergies': request.data.get('allergies', []),
            'dietary_restrictions': request.data.get('dietary_restrictions', []),
            'equipment_available': request.data.get('equipment_available', []),
            'experience_level': request.data.get('experience_level',''),
        }

        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
            profile = UserProfile.objects.create(user=user, **profile_data)

        return Response(
            {'username': user.username, 'profile': UserProfileSerializer(profile).data},
            status=status.HTTP_201_CREATED,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/me/profile/ — returns or updates the current user's profile."""

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class MealEntryViewSet(viewsets.ModelViewSet):
   

    serializer_class = MealEntrySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    filter_backends = [OrderingFilter]
    ordering_fields = ('analyzed_at', 'total_calories')
    ordering = ('-analyzed_at',)

    def get_queryset(self):
        return MealEntry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Si l'user n'a pas fourni meal_type, on le devine par l'heure
        meal_type = serializer.validated_data.get('meal_type')
        if not meal_type:
            from django.utils import timezone
            hour = timezone.localtime().hour
            if 5 <= hour < 11:
                meal_type = MealEntry.MealType.BREAKFAST
            elif 11 <= hour < 15:
                meal_type = MealEntry.MealType.LUNCH
            elif 18 <= hour < 23:
                meal_type = MealEntry.MealType.DINNER
            else:
                meal_type = MealEntry.MealType.SNACK
        serializer.save(user=self.request.user, meal_type=meal_type)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Repas du jour pour l'utilisateur courant."""
        from django.utils import timezone
        today = timezone.localtime().date()
        meals = self.get_queryset().filter(analyzed_at__date=today)
        serializer = self.get_serializer(meals, many=True)

        totals = {
            'calories': sum((m.total_calories or 0) for m in meals),
            'protein': sum((m.total_protein or 0) for m in meals),
            'carbohydrates': sum((m.total_carbohydrates or 0) for m in meals),
            'fat': sum((m.total_fat or 0) for m in meals),
            'meals_count': meals.count(),
        }
        return Response({'meals': serializer.data, 'totals': totals})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Totaux agrégés par jour, sur les 14 derniers jours par défaut.
        Pour graphiques d'évolution.
        """
        from django.utils import timezone
        from django.db.models import Sum, Count
        from datetime import timedelta

        days = int(request.query_params.get('days', 14))
        days = max(1, min(days, 90))  # garde-fou : 1 à 90 jours
        since = timezone.localtime().date() - timedelta(days=days - 1)

        rows = (
            self.get_queryset()
            .filter(analyzed_at__date__gte=since)
            .extra(select={'day': 'date(analyzed_at)'})
            .values('day')
            .annotate(
                calories=Sum('total_calories'),
                protein=Sum('total_protein'),
                carbohydrates=Sum('total_carbohydrates'),
                fat=Sum('total_fat'),
                count=Count('id'),
            )
            .order_by('day')
        )
        return Response(list(rows))


# ---------------------------------------------------------------------------
# AI proxy views — forward to nutrition-api microservice
# ---------------------------------------------------------------------------

NUTRITION_API_URL = getattr(django_settings, 'NUTRITION_API_URL', 'http://nutrition-api:8001')


@method_decorator(ratelimit(key='user', rate='10/m', method='POST', block=True), name='dispatch')
class AIAnalyzeView(APIView):
    """
    POST /api/ai/analyze/
    Accepts a multipart image. Computes SHA-256 of the bytes for a 1-hour cache key,
    then proxies to nutrition-api/analyze. Persists a MealEntry on success.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image_file = request.FILES.get('file')
        if not image_file:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        image_bytes = image_file.read()
        cache_key = 'ai_analyze_' + hashlib.sha256(image_bytes).hexdigest()

        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            resp = httpx.post(
                f'{NUTRITION_API_URL}/analyze',
                files={'file': (image_file.name, image_bytes, image_file.content_type)},
                timeout=60.0,
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            return Response(
                {'detail': f'AI service unavailable: {exc}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        data = resp.json()
        cache.set(cache_key, data, timeout=3600)

        total_calories = sum(
            (p.get('macros') or {}).get('avg_calories') or 0
            for p in data
            if p.get('matched_food')
        )
        MealEntry.objects.create(
            user=request.user,
            detected_foods=data,
            total_calories=total_calories or None,
            image_hash=hashlib.sha256(image_bytes).hexdigest(),
        )

        return Response(data)


@method_decorator(ratelimit(key='user', rate='20/m', method='POST', block=True), name='dispatch')
class AIMealPlanView(APIView):
    """
    POST /api/ai/meal-plan/
    Proxies to nutrition-api/meal-plan with the request JSON body.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            resp = httpx.post(
                f'{NUTRITION_API_URL}/meal-plan',
                json=request.data,
                timeout=30.0,
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            return Response(
                {'detail': f'AI service unavailable: {exc}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(resp.json())


# ---------------------------------------------------------------------------
# Recommandations nutritionnelles personnalisées (chantier 1 MSPR2)
# ---------------------------------------------------------------------------

def _compute_targets(profile):
    """
    Calcule les cibles journalières selon la formule Mifflin-St Jeor + ajustement objectif.
    Si l'user n'a pas renseigné assez de données biométriques, on tombe back sur
    profile.daily_calorie_target ou 2000 kcal par défaut.
    """
    has_biometrics = (
        profile.weight_kg
        and profile.height_cm
        and profile.age
    )

    if has_biometrics:
        weight = float(profile.weight_kg)
        height = float(profile.height_cm)
        age = profile.age
        # Mifflin-St Jeor (BMR)
        if profile.gender == 'F':
            bmr = 10 * weight + 6.25 * height - 5 * age - 161
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        # Facteur d'activité moyen (sédentaire-léger)
        tdee = bmr * 1.4
        # Ajustement selon objectif
        if profile.goal == 'weight_loss':
            calorie_target = tdee - 500
        elif profile.goal == 'muscle_gain':
            calorie_target = tdee + 300
        else:
            calorie_target = tdee
    else:
        calorie_target = profile.daily_calorie_target or 2000

    # Si l'user a fixé sa propre cible, on la respecte
    if profile.daily_calorie_target:
        calorie_target = profile.daily_calorie_target

    # Répartition macros selon objectif (en % des calories)
    if profile.goal == 'weight_loss':
        pct = {'protein': 0.35, 'carbohydrates': 0.35, 'fat': 0.30}
    elif profile.goal == 'muscle_gain':
        pct = {'protein': 0.30, 'carbohydrates': 0.45, 'fat': 0.25}
    elif profile.goal == 'endurance':
        pct = {'protein': 0.20, 'carbohydrates': 0.55, 'fat': 0.25}
    else:
        pct = {'protein': 0.25, 'carbohydrates': 0.50, 'fat': 0.25}

    return {
        'calories': round(calorie_target),
        'protein': round(calorie_target * pct['protein'] / 4, 1),   # 4 kcal/g
        'carbohydrates': round(calorie_target * pct['carbohydrates'] / 4, 1),
        'fat': round(calorie_target * pct['fat'] / 9, 1),           # 9 kcal/g
    }


def _detect_imbalances(totals, targets):
    """Pour chaque nutriment, calcule % de la cible et tag deficit/excess/ok."""
    imbalances = []
    for nutrient in ['calories', 'protein', 'carbohydrates', 'fat']:
        eaten = totals.get(nutrient, 0) or 0
        target = targets.get(nutrient, 0) or 0
        if target == 0:
            continue
        pct = (eaten / target) * 100
        if pct < 70:
            status = 'deficit'
        elif pct > 115:
            status = 'excess'
        else:
            status = 'ok'
        imbalances.append({
            'nutrient': nutrient,
            'eaten': round(eaten, 1),
            'target': target,
            'percentage': round(pct, 1),
            'status': status,
        })
    return imbalances


def _generate_suggestions(profile, totals, imbalances):
    """
    Règles métier : croise objectif user + déséquilibres détectés pour produire
    des conseils actionnables. Triés par priorité.
    """
    suggestions = []

    if totals.get('meals_count', 0) == 0:
        suggestions.append({
            'priority': 'high',
            'icon': '📷',
            'title': "Tu n'as encore rien enregistré aujourd'hui",
            'detail': "Va sur « Analyser un repas » dès ton prochain repas pour suivre tes apports.",
        })

    for imb in imbalances:
        if imb['status'] == 'ok':
            continue

        nutrient = imb['nutrient']
        status = imb['status']
        gap = abs(imb['eaten'] - imb['target'])

        if nutrient == 'calories' and status == 'deficit':
            if profile.goal == 'muscle_gain':
                suggestions.append({
                    'priority': 'high',
                    'icon': '⚠️',
                    'title': f"Il te manque ~{round(gap)} kcal aujourd'hui",
                    'detail': "Pour ta prise de muscle, ajoute une collation : 30 g d'amandes (180 kcal) ou un yogourt grec + miel (250 kcal).",
                })
            else:
                suggestions.append({
                    'priority': 'medium',
                    'icon': '🍽️',
                    'title': f"Tu n'as mangé que {round(imb['percentage'])}% de ta cible calorique",
                    'detail': "Pense à un dernier repas équilibré si tu as encore faim.",
                })

        elif nutrient == 'calories' and status == 'excess':
            if profile.goal == 'weight_loss':
                suggestions.append({
                    'priority': 'high',
                    'icon': '⚠️',
                    'title': f"+{round(gap)} kcal au-dessus de ta cible",
                    'detail': "Privilégie demain des aliments à faible densité calorique : légumes, fruits, protéines maigres.",
                })
            else:
                suggestions.append({
                    'priority': 'low',
                    'icon': '👀',
                    'title': "Léger excès calorique aujourd'hui",
                    'detail': "Pas de panique sur une journée, surveille la moyenne sur la semaine.",
                })

        elif nutrient == 'protein' and status == 'deficit':
            suggestions.append({
                'priority': 'high' if profile.goal in ('muscle_gain', 'weight_loss') else 'medium',
                'icon': '💪',
                'title': f"Il te manque ~{round(gap)} g de protéines",
                'detail': "Ajoute des œufs (12 g/œuf), du fromage blanc 0% (10 g/100g), du poulet (25 g/100g) ou des lentilles (9 g/100g).",
            })

        elif nutrient == 'carbohydrates' and status == 'deficit' and profile.goal == 'endurance':
            suggestions.append({
                'priority': 'high',
                'icon': '🏃',
                'title': "Tes glucides sont bas pour un objectif endurance",
                'detail': "Tu auras du mal à tenir ton entraînement. Ajoute du riz complet, des pâtes ou de la patate douce.",
            })

        elif nutrient == 'carbohydrates' and status == 'excess' and profile.goal == 'weight_loss':
            suggestions.append({
                'priority': 'medium',
                'icon': '🍞',
                'title': "Apport glucidique élevé pour ton objectif perte de poids",
                'detail': "Remplace une portion de féculents par des légumes verts ou des protéines maigres.",
            })

        elif nutrient == 'fat' and status == 'excess':
            suggestions.append({
                'priority': 'medium',
                'icon': '🧈',
                'title': f"+{round(gap)} g de lipides au-dessus de ta cible",
                'detail': "Privilégie les bonnes graisses (poisson, huile d'olive, avocat) plutôt que charcuteries ou fritures.",
            })

    # Tri par priorité
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    suggestions.sort(key=lambda s: priority_order.get(s['priority'], 99))

    return suggestions


class RecommendationsTodayView(APIView):
    """
    GET /api/me/recommendations/today/
    Analyse les apports du jour vs cibles personnalisées + suggestions
    adaptées à l'objectif. C'est le cœur du chantier 1 MSPR2.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = UserProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response(
                {'detail': 'Profil non configuré. Termine ton onboarding.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils import timezone
        today = timezone.localtime().date()
        meals = MealEntry.objects.filter(user=request.user, analyzed_at__date=today)

        totals = {
            'calories': sum((m.total_calories or 0) for m in meals),
            'protein': sum((m.total_protein or 0) for m in meals),
            'carbohydrates': sum((m.total_carbohydrates or 0) for m in meals),
            'fat': sum((m.total_fat or 0) for m in meals),
            'meals_count': meals.count(),
        }

        targets = _compute_targets(profile)
        imbalances = _detect_imbalances(totals, targets)
        suggestions = _generate_suggestions(profile, totals, imbalances)

        return Response({
            'profile': {
                'goal': profile.goal,
                'goal_label': profile.get_goal_display() if profile.goal else 'Non défini',
            },
            'totals_today': totals,
            'targets': targets,
            'imbalances': imbalances,
            'suggestions': suggestions,
        })

