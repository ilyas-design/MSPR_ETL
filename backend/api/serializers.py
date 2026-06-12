from rest_framework import serializers
from .models import (
    Patient,
    Sante,
    Nutrition,
    ActivitePhysique,
    GymSession,
    PendingChange,
    UserProfile,
    FoodLog,
    Exercise,
    MealEntry,
    WorkoutSession,
)

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model=Patient
        fields='__all__'

class SanteSerializer(serializers.ModelSerializer):
    class Meta:
        model=Sante
        fields='__all__'

class NutritionSerializer(serializers.ModelSerializer):
    class Meta:
        model=Nutrition
        fields='__all__'

class ActivitePhysiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model=ActivitePhysique
        fields='__all__'

class GymSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model=GymSession
        fields='__all__'


class FoodLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodLog
        fields = '__all__'


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = '__all__'


class WorkoutSessionSerializer(serializers.ModelSerializer):
    focus_label = serializers.CharField(source='get_focus_display', read_only=True)

    class Meta:
        model = WorkoutSession
        fields = '__all__'
        read_only_fields = ['user', 'done_at']


class MealEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MealEntry
        fields = '__all__'
        read_only_fields = ['user', 'analyzed_at']


class PendingChangeSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(
        source="requested_by.username", read_only=True, default=None
    )
    reviewed_by_username = serializers.CharField(
        source="reviewed_by.username", read_only=True, default=None
    )

    class Meta:
        model = PendingChange
        fields = [
            "id",
            "table_name",
            "record_id",
            "operation",
            "changes",
            "status",
            "requested_by",
            "requested_by_username",
            "requested_at",
            "reviewed_by",
            "reviewed_by_username",
            "reviewed_at",
            "review_comment",
        ]
        read_only_fields = [
            "id",
            "status",
            "requested_by",
            "requested_by_username",
            "requested_at",
            "reviewed_by",
            "reviewed_by_username",
            "reviewed_at",
        ]

class UserProfileSerializer(serializers.ModelSerializer):
    bmi = serializers.ReadOnlyField()

    def validate_injuries(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('injuries must be a list of strings.')
        if len(value) > 20:
            raise serializers.ValidationError('Maximum 20 injuries/limitations.')
        return [str(item).strip()[:100] for item in value if str(item).strip()]

    def validate_meal_budget(self, value):
        if value is not None and (value < 0 or value > 10000):
            raise serializers.ValidationError('meal_budget must be between 0 and 10000.')
        return value

    class Meta:
        model = UserProfile
        fields = [
            'goal',
            'experience_level',
            'dietary_restrictions',
            'allergies',
            'equipment_available',
            'injuries',
            'meal_budget',
            'daily_calorie_target',
            'age',
            'gender',
            'height_cm',
            'weight_kg',
            'target_weight_kg',
            'bmi',
            'onboarded',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'bmi']

