from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from permissions.custom_permissions import HasDynamicPermission
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [HasDynamicPermission]
    required_permission = 'view_notifications'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Notification.objects.none()
        qs = Notification.objects.filter(user=user).order_by('-created_at')
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                qs = qs[:int(limit)]
            except (ValueError, TypeError):
                pass
        return qs

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        user = request.user
        Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        return Response({"detail": "All notifications marked as read."})

    @action(detail=False, methods=['post'], url_path='clear-all')
    def clear_all(self, request):
        user = request.user
        Notification.objects.filter(user=user).delete()
        return Response({"detail": "All notifications cleared."})

