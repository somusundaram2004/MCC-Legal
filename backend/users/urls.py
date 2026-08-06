from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserViewSet, CustomTokenObtainPairView, GoogleLoginView, GoogleLoginClientIdView,
    ForgotPasswordView, ResetPasswordView, 
    SMTPSettingViewSet, GoogleDriveSettingViewSet, CustomDynamicPageViewSet
)

router = DefaultRouter()
router.register(r'smtp-settings', SMTPSettingViewSet, basename='smtp-settings')
router.register(r'google-drive-settings', GoogleDriveSettingViewSet, basename='google-drive-settings')
router.register(r'custom-pages', CustomDynamicPageViewSet, basename='custom-pages')
router.register(r'', UserViewSet)

urlpatterns = [
    # Auth endpoints
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/google/', GoogleLoginView.as_view(), name='google_login'),
    path('auth/google-client-id/', GoogleLoginClientIdView.as_view(), name='google_client_id'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    
    # Invitation routes
    path('invitation/<uuid:pk>/', UserViewSet.as_view({'delete': 'delete_invitation'}), name='delete-invitation'),
    path('invitation/<str:token>/', UserViewSet.as_view({'get': 'get_invitation'}), name='get-invitation'),
    
    # User endpoints
    path('', include(router.urls)),
]
