from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Folder, FolderPermission

User = get_user_model()

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'designation', 'department']

class FolderPermissionSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True
    )

    class Meta:
        model = FolderPermission
        fields = [
            'id', 'user', 'user_id', 'is_granted',
            'can_read', 'can_download', 'can_upload', 'can_delete_own_uploads'
        ]

class FolderSerializer(serializers.ModelSerializer):
    created_by = UserMinimalSerializer(read_only=True)
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.all(),
        source='parent',
        required=False,
        allow_null=True
    )
    
    # Optional count of subfolders and files
    subfolder_count = serializers.SerializerMethodField()
    file_count = serializers.SerializerMethodField()
    path = serializers.SerializerMethodField()
    is_viewed = serializers.SerializerMethodField()
    custom_page_id = serializers.ReadOnlyField(source='custom_page.id')
    custom_page_slug = serializers.ReadOnlyField(source='custom_page.slug')
    custom_page_title = serializers.ReadOnlyField(source='custom_page.title')

    class Meta:

        model = Folder
        fields = [
            'id', 'name', 'parent_id', 'created_by', 
            'created_at', 'updated_at', 'subfolder_count', 
            'file_count', 'path', 'google_folder_id', 'status',
            'summary', 'expiry_date', 'is_viewed',
            'custom_page_id', 'custom_page_slug', 'custom_page_title', 'module_type'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']


    def get_subfolder_count(self, obj):
        # We only count subfolders that the user has access to, but in serializing we can just do raw count.
        # Filtered counts can be done on demand or simple count is fine.
        return obj.children.count()

    def get_file_count(self, obj):
        return obj.files.count()

    def get_path(self, obj):
        """
        Returns a list of ancestral folders from the root down to the folder with accessibility checks.
        """
        request = self.context.get('request')
        user = request.user if request and request.user and request.user.is_authenticated else None

        ancestors = obj.get_ancestors()
        path = []
        for f in ancestors:
            has_access = True
            if user and not (user.role and user.role.name == "Super Admin"):
                has_access = f.has_access(user)
            path.append({"id": f.id, "name": f.name, "accessible": has_access})
            
        path.append({"id": obj.id, "name": obj.name, "accessible": True})
        return path

    def get_is_viewed(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return True
        if obj.created_by == request.user:
            return True
        from .models import FolderView
        return FolderView.objects.filter(user=request.user, folder=obj).exists()
