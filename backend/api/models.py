from django.conf import settings
from django.db import models

class Patient(models.Model):
    patient_id = models.CharField(max_length=10, primary_key=True)  # Changé en CharField
    age = models.IntegerField()
    gender = models.CharField(max_length=12)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2)
    bmi_calculated = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        db_table = 'patient'
        managed = False

    def __str__(self):
        return f"Patient {self.patient_id}"


class Sante(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, db_column='patient_id', to_field='patient_id', primary_key=True)
    cholesterol = models.FloatField(null=True, blank=True)
    blood_pressure = models.IntegerField(null=True, blank=True)
    disease_type = models.CharField(max_length=100, null=True, blank=True)
    glucose = models.FloatField(null=True, blank=True)
    severity = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        db_table = 'sante'
        managed = False

    def __str__(self):
        return f"Sante {self.patient.patient_id}"


class Nutrition(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, db_column='patient_id', to_field='patient_id', primary_key=True)
    daily_caloric_intake = models.IntegerField(null=True, blank=True)
    dietary_restrictions = models.CharField(max_length=255, null=True, blank=True)
    allergies = models.CharField(max_length=255, null=True, blank=True)
    preferred_cuisine = models.CharField(max_length=100, null=True, blank=True)
    diet_recommendation = models.CharField(max_length=255, null=True, blank=True)
    adherence_to_diet_plan = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'nutrition'
        managed = False

    def __str__(self):
        return f"Nutrition {self.patient.patient_id}"


class ActivitePhysique(models.Model):
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, db_column='patient_id', to_field='patient_id', primary_key=True)
    physical_activity_level = models.CharField(max_length=50, null=True, blank=True)
    weekly_exercice_hours = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'activite_physique'
        managed = False

    def __str__(self):
        return f"Activite {self.patient.patient_id}"


class GymSession(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, db_column='patient_id', to_field='patient_id')
    gym_session_duration_hours = models.FloatField(null=True, blank=True)
    gym_calories_burned = models.IntegerField(null=True, blank=True)
    gym_workout_type = models.CharField(max_length=50, null=True, blank=True)
    gym_max_bpm = models.IntegerField(null=True, blank=True)
    gym_avg_bpm = models.IntegerField(null=True, blank=True)
    gym_resting_bpm = models.IntegerField(null=True, blank=True)
    gym_fat_percentage = models.FloatField(null=True, blank=True)
    gym_water_intake_liters = models.FloatField(null=True, blank=True)
    gym_workout_frequency_days_week = models.IntegerField(null=True, blank=True)
    gym_experience_level = models.IntegerField(null=True, blank=True)
    calories_per_hour = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'gym_session'
        managed = False

    def __str__(self):
        return f"Session {self.id} - Patient {self.patient.patient_id}"


class PendingChange(models.Model):
    """Modification admin en attente de validation par un superviseur.

    Les tables ETL sont `managed=False` (schéma fourni par `BDD.sql`).
    Les demandes de modification sont donc stockées ici, dans une table
    Django-gérée, puis appliquées à la ligne cible après approbation.
    """

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = [
        (STATUS_PENDING, "En attente"),
        (STATUS_APPROVED, "Approuvée"),
        (STATUS_REJECTED, "Rejetée"),
    ]

    OPERATION_UPDATE = "update"
    OPERATION_DELETE = "delete"
    OPERATION_CHOICES = [
        (OPERATION_UPDATE, "Mise à jour"),
        (OPERATION_DELETE, "Suppression"),
    ]

    table_name = models.CharField(max_length=64)
    record_id = models.CharField(max_length=64)
    operation = models.CharField(
        max_length=16, choices=OPERATION_CHOICES, default=OPERATION_UPDATE
    )
    changes = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pending_changes_submitted",
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pending_changes_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_comment = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["table_name", "record_id"]),
        ]

    def __str__(self):
        return f"PendingChange#{self.pk} {self.table_name}/{self.record_id} ({self.status})"

