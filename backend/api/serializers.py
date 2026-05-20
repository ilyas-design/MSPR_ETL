from rest_framework import serializers
from .models import (
    Patient,
    Sante,
    Nutrition,
    ActivitePhysique,
    GymSession,
    PendingChange,
    FoodLog,
    Exercise,
    UserProfile,
    MealEntry,
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


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ['user']


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

