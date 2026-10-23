from rest_framework import serializers
from .models import ActivityLog
from folders.serializers import UserMinimalSerializer
import datetime
from django.utils import timezone

class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    formatted_action = serializers.SerializerMethodField()
    action_type = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'action', 'formatted_action', 'action_type', 'module', 'created_at', 'time_ago', 'ip_address']

    def get_formatted_action(self, obj):
        action = obj.action or ''
        # Transform technical action strings into clear human sentences
        act_lower = action.lower()
        if 'logged in' in act_lower or 'login' in act_lower:
            return "Logged in to the system portal"
        if 'logged out' in act_lower or 'logout' in act_lower:
            return "Signed out of the system portal"
        if 'created folder' in act_lower:
            folder_name = action.split("Created folder", 1)[-1].strip(" ':\"")
            return f"Created department repository folder '{folder_name}'" if folder_name else "Created a new department repository folder"
        if 'uploaded file' in act_lower or 'uploaded' in act_lower:
            file_name = action.split("uploaded", 1)[-1].strip(" ':\"")
            return f"Uploaded agreement document '{file_name}'" if file_name else "Uploaded a new agreement document"
        if 'deleted file' in act_lower:
            file_name = action.split("Deleted file", 1)[-1].strip(" ':\"")
            return f"Removed document '{file_name}' from repository" if file_name else "Removed a document from repository"
        if 'updated mou' in act_lower or 'mou' in act_lower:
            return f"Updated agreement status: {action}"
        if 'created user' in act_lower or 'invited user' in act_lower:
            return f"Created & assigned new user account: {action}"
        
        return action

    def get_action_type(self, obj):
        act_lower = (obj.action or '').lower()
        mod_lower = (obj.module or '').lower()

        if 'login' in act_lower or 'logout' in act_lower or 'auth' in mod_lower:
            return 'AUTH'
        if 'delete' in act_lower or 'remove' in act_lower:
            return 'DELETE'
        if 'create' in act_lower or 'upload' in act_lower or 'add' in act_lower:
            return 'CREATE'
        if 'update' in act_lower or 'edit' in act_lower or 'change' in act_lower:
            return 'UPDATE'
        return 'INFO'

    def get_time_ago(self, obj):
        if not obj.created_at:
            return ""
        now = timezone.now()
        created_at = obj.created_at
        if timezone.is_naive(created_at):
            created_at = timezone.make_aware(created_at)
        if timezone.is_naive(now):
            now = timezone.make_aware(now)
        diff = now - created_at
        seconds = diff.total_seconds()

        if seconds < 60:
            return "Just now"
        elif seconds < 3600:
            mins = int(seconds // 60)
            return f"{mins} min{'s' if mins > 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds // 3600)
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif seconds < 172800:
            return "Yesterday"
        else:
            days = int(seconds // 86400)
            return f"{days} days ago"
