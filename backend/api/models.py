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


class FoodLog(models.Model):
    id = models.AutoField(primary_key=True)
    date = models.CharField(max_length=20)
    user_id = models.IntegerField()
    food_item = models.CharField(max_length=200)
    category = models.CharField(max_length=100, null=True, blank=True)
    calories_kcal = models.IntegerField(null=True, blank=True)
    protein_g = models.FloatField(null=True, blank=True)
    carbohydrates_g = models.FloatField(null=True, blank=True)
    fat_g = models.FloatField(null=True, blank=True)
    fiber_g = models.FloatField(null=True, blank=True)
    sugars_g = models.FloatField(null=True, blank=True)
    sodium_mg = models.FloatField(null=True, blank=True)
    cholesterol_mg = models.FloatField(null=True, blank=True)
    meal_type = models.CharField(max_length=50, null=True, blank=True)
    water_intake_ml = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'food_log'
        managed = False

    def __str__(self):
        return f"FoodLog {self.id} - {self.food_item}"


class Exercise(models.Model):
    exercise_id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=200)
    body_part = models.CharField(max_length=100, null=True, blank=True)
    target = models.CharField(max_length=100, null=True, blank=True)
    equipment = models.CharField(max_length=100, null=True, blank=True)
    level = models.CharField(max_length=50, null=True, blank=True)
    instructions = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'exercise'
        managed = False

    def __str__(self):
        return f"Exercise {self.exercise_id} - {self.name}"


class UserProfile(models.Model):
    GOAL_CHOICES = [
        ('weight_loss', 'Weight Loss'),
        ('muscle_gain', 'Muscle Gain'),
        ('maintenance', 'Maintenance'),
        ('endurance', 'Endurance'),
    ]
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile'
    )
    goal = models.CharField(max_length=50, choices=GOAL_CHOICES, default='maintenance')
    daily_calorie_target = models.IntegerField(null=True, blank=True)
    allergies = models.JSONField(default=list)
    dietary_restrictions = models.JSONField(default=list)
    equipment_available = models.JSONField(default=list)
    experience_level = models.CharField(
        max_length=20, choices=LEVEL_CHOICES, null=True, blank=True
    )

    def __str__(self):
        return f"Profile({self.user.username})"


class MealEntry(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='meal_entries'
    )
    analyzed_at = models.DateTimeField(auto_now_add=True)
    meal_type = models.CharField(max_length=50, null=True, blank=True)
    detected_foods = models.JSONField(default=list)
    total_calories = models.FloatField(null=True, blank=True)
    macros = models.JSONField(default=dict)
    image_hash = models.CharField(max_length=64, null=True, blank=True)

    class Meta:
        ordering = ['-analyzed_at']

    def __str__(self):
        return f"MealEntry({self.user.username}, {self.analyzed_at:%Y-%m-%d})"


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


#Profil utilisateur 

class UserProfile(models.Model):

    class Goal(models.TextChoices):
        WEIGHT_LOSS = 'weight_loss', 'Perdre du poids'
        MUSCLE_GAIN = 'muscle_gain', 'Prendre du muscle'
        ENDURANCE = 'endurance', 'Améliorer mon endurance'
        GENERAL_HEALTH = 'general_health', 'Maintenir ma forme'

    class ExperienceLevel(models.TextChoices):
        BEGINNER = 'beginner', 'Débutant'
        INTERMEDIATE = 'intermediate', 'Intermédiaire'
        ADVANCED = 'advanced', 'Avancé'

    class DietaryRestriction(models.TextChoices):
        NONE = 'none', 'Aucune'
        VEGETARIAN = 'vegetarian', 'Végétarien'
        VEGAN = 'vegan', 'Végan'
        GLUTEN_FREE = 'gluten_free', 'Sans gluten'
        LACTOSE_FREE = 'lactose_free', 'Sans lactose'

    class Gender(models.TextChoices):
        MALE = 'M', 'Homme'
        FEMALE = 'F', 'Femme'
        OTHER = 'O', 'Autre / Préfère ne pas dire'


    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    goal = models.CharField(max_length=30, choices=Goal.choices, blank=True)
    experience_level = models.CharField(max_length=20, choices=ExperienceLevel.choices, blank=True)
    dietary_restrictions = models.CharField(
        max_length=20,
        choices=DietaryRestriction.choices,
        default=DietaryRestriction.NONE,
    )
    allergies = models.TextField(blank=True, help_text='Allergies séparées par virgules')
    equipment_available = models.TextField(blank=True, help_text='Équipement séparé par virgules')
    daily_calorie_target = models.PositiveIntegerField(null=True, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=Gender.choices, blank=True)
    height_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    target_weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True) 
    onboarded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_profile'

    @property

    def bmi(self):
        if self.height_cm and self.weight_kg:
            height_m = self.height_cm / 100
            return round(float(self.weight_kg) / (height_m ** 2), 1)
        return None

    def __str__(self):
        return f"Profile of {self.user.username}"
    
    