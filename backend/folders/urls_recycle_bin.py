from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_recycle_bin import RecycleBinViewSet

router = DefaultRouter()
router.register(r'', RecycleBinViewSet, basename='recycle-bin')

urlpatterns = [
    path('', include(router.urls)),
]
