from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import (
    PatientViewSet,
    SanteViewSet,
    NutritionViewSet,
    ActivitePhysiqueViewSet,
    GymSessionViewSet,
    PendingChangeViewSet,
    FoodLogViewSet,
    ExerciseViewSet,
    MealEntryViewSet,
    MeView,
    PostViewSet,
    RegisterView,
    SocialProfileView,
    UserProfileView,
    AIAnalyzeView,
    AIMealPlanView,
    KPIView,
    EngagementKPIView,
    ConversionKPIView,
    SatisfactionKPIView,
    DataQualityKPIView,
    RecommendationsTodayView,
    CoachAdviceView,
    AIMealPlanLLMView,
    MealPlanListView,
    MealPlanDetailView,
    WorkoutSessionViewSet,
    AIWorkoutPlanView,
    WorkoutPlanListView,
    WorkoutPlanDetailView,

)
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


router = DefaultRouter()
router.register(r'patients', PatientViewSet)
router.register(r'sante', SanteViewSet)
router.register(r'nutrition', NutritionViewSet)
router.register(r'activite-physique', ActivitePhysiqueViewSet)
router.register(r'gym-sessions', GymSessionViewSet)
router.register(r'pending-changes', PendingChangeViewSet, basename='pending-changes')
router.register(r'food-logs', FoodLogViewSet, basename='food-logs')
router.register(r'exercises', ExerciseViewSet, basename='exercises')
router.register(r'me/meals', MealEntryViewSet, basename='me-meals')
router.register(r'me/workouts', WorkoutSessionViewSet, basename='me-workouts')
router.register(r'social/posts', PostViewSet, basename='social-posts')

urlpatterns = [
    path('', include('django_prometheus.urls')),
    path('api/', include(router.urls)),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/me/profile/', UserProfileView.as_view(), name='me-profile'),
    path('api/ai/analyze/', AIAnalyzeView.as_view(), name='ai-analyze'),
    path('api/ai/meal-plan/', AIMealPlanView.as_view(), name='ai-meal-plan'),
    path('api/kpis/', KPIView.as_view(), name='kpis'),
    path('api/engagement/', EngagementKPIView.as_view(), name='engagement-kpis'),
    path('api/conversion/', ConversionKPIView.as_view(), name='conversion-kpis'),
    path('api/satisfaction/', SatisfactionKPIView.as_view(), name='satisfaction-kpis'),
    path('api/data-quality/', DataQualityKPIView.as_view(), name='data-quality-kpis'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/me/recommendations/today/', RecommendationsTodayView.as_view(), name='recommendations-today'),
    path('api/me/coach-advice/', CoachAdviceView.as_view(), name='coach-advice'),
    path('api/ai/meal-plan-ai/', AIMealPlanLLMView.as_view(), name='ai-meal-plan-llm'),
    path('api/me/meal-plans/', MealPlanListView.as_view(), name='meal-plans-list'),
    path('api/me/meal-plans/<str:plan_id>/', MealPlanDetailView.as_view(), name='meal-plans-detail'),
    path('api/ai/workout-plan-ai/', AIWorkoutPlanView.as_view(), name='ai-workout-plan'),
    path('api/me/workout-plans/', WorkoutPlanListView.as_view(), name='workout-plans-list'),
    path('api/me/workout-plans/<str:plan_id>/', WorkoutPlanDetailView.as_view(), name='workout-plans-detail'),
    path('api/social/profile/', SocialProfileView.as_view(), name='social-profile'),
]

# Sert les médias uploadés (avatars, publications) en développement.
# En production, nginx ou un stockage objet (MinIO/S3) prend le relais.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
