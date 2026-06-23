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
    Post,
    PostComment,
)


def _abs_url(context, path):
    """Construit une URL absolue pour un média si la requête est disponible."""
    if not path:
        return None
    request = context.get('request') if context else None
    if request is not None:
        return request.build_absolute_uri(path)
    return path

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


# ---------------------------------------------------------------------------
# Mini réseau social (MSPR 6.3/6.4)
# ---------------------------------------------------------------------------

class SocialAuthorSerializer(serializers.Serializer):
    """Représentation publique d'un auteur dans le flux social."""

    id = serializers.IntegerField(source='pk', read_only=True)
    username = serializers.CharField(read_only=True)
    display_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    def _profile(self, user):
        return getattr(user, 'profile', None)

    def get_display_name(self, user):
        profile = self._profile(user)
        if profile and profile.display_name:
            return profile.display_name
        return user.username

    def get_avatar_url(self, user):
        profile = self._profile(user)
        if profile and profile.avatar:
            return _abs_url(self.context, profile.avatar.url)
        return None


class SocialProfileSerializer(serializers.ModelSerializer):
    """Panneau de contrôle utilisateur : nom d'affichage + photo de profil."""

    username = serializers.CharField(source='user.username', read_only=True)
    avatar = serializers.FileField(write_only=True, required=False, allow_null=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['username', 'display_name', 'avatar', 'avatar_url']

    def validate_display_name(self, value):
        return (value or '').strip()[:50]

    def get_avatar_url(self, obj):
        if obj.avatar:
            return _abs_url(self.context, obj.avatar.url)
        return None


class PostCommentSerializer(serializers.ModelSerializer):
    author = SocialAuthorSerializer(read_only=True)

    class Meta:
        model = PostComment
        fields = ['id', 'author', 'text', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']

    def validate_text(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Le commentaire ne peut pas être vide.')
        return value[:1000]


class PostSerializer(serializers.ModelSerializer):
    author = SocialAuthorSerializer(read_only=True)
    media = serializers.FileField(write_only=True, required=False, allow_null=True)
    media_url = serializers.SerializerMethodField()
    like_count = serializers.IntegerField(read_only=True, default=0)
    comment_count = serializers.IntegerField(read_only=True, default=0)
    liked_by_me = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'text', 'media', 'media_url', 'media_type',
            'like_count', 'comment_count', 'liked_by_me', 'created_at',
        ]
        read_only_fields = ['id', 'author', 'media_type', 'created_at']

    def get_media_url(self, obj):
        if obj.media:
            return _abs_url(self.context, obj.media.url)
        return None

    def validate(self, attrs):
        text = (attrs.get('text') or '').strip()
        media = attrs.get('media')
        if not text and not media:
            raise serializers.ValidationError(
                'Une publication doit contenir du texte ou un média.'
            )
        return attrs

