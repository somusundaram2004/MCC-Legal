from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from .models import ActivityLog
from .serializers import ActivityLogSerializer

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Returns activity logs scoped by role:
        - Super Admin: sees all activity logs
        - Admin: sees activity logs from their department
        - User: forbidden from accessing activity logs module
        """
        user = self.request.user
        role_name = user.role.name if (user and user.role) else 'User'

        if role_name == 'Super Admin' or getattr(user, 'is_superuser', False):
            return ActivityLog.objects.all().order_by('-created_at')

        if role_name in ['Admin', 'Lawyer / MOU Administrator']:
            dept = getattr(user, 'department', '')
            if dept:
                return ActivityLog.objects.filter(
                    Q(user__department__iexact=dept) | Q(module__icontains=dept)
                ).order_by('-created_at')
            return ActivityLog.objects.filter(user=user).order_by('-created_at')

        raise PermissionDenied("You do not have permission to view activity logs.")
