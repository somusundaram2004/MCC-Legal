from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import DashboardStatsView, GlobalSearchView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/google-drive/', include('users.urls_google_drive')),
    path('api/roles/', include('roles.urls')),
    path('api/permissions/', include('permissions.urls')),
    path('api/folders/', include('folders.urls')),
    path('api/files/', include('files.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/activity-logs/', include('activity_logs.urls')),
    path('api/mous/', include('mous.urls')),
    path('api/customization/', include('customization.urls')),
    path('api/recycle-bin/', include('folders.urls_recycle_bin')),
    
    # Dashboard & Global Search
    path('api/dashboard/stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('api/search/', GlobalSearchView.as_view(), name='global_search'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
