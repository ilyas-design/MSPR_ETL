from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views import (
    PatientViewSet,
    SanteViewSet,
    NutritionViewSet,
    ActivitePhysiqueViewSet,
    GymSessionViewSet,
    PendingChangeViewSet,
    MeView,
    KPIView,
    EngagementKPIView,
    ConversionKPIView,
    SatisfactionKPIView,
    DataQualityKPIView,
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

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/kpis/', KPIView.as_view(), name='kpis'),
    path('api/engagement/', EngagementKPIView.as_view(), name='engagement-kpis'),
    path('api/conversion/', ConversionKPIView.as_view(), name='conversion-kpis'),
    path('api/satisfaction/', SatisfactionKPIView.as_view(), name='satisfaction-kpis'),
    path('api/data-quality/', DataQualityKPIView.as_view(), name='data-quality-kpis'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
