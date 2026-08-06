from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WebsiteCustomizationViewSet

router = DefaultRouter()
router.register(r'', WebsiteCustomizationViewSet, basename='customization')

urlpatterns = [
    path('', include(router.urls)),
]
