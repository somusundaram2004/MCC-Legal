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
            'id', 'user', 'user_id', 'is_granted', 'permission_level',
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
    department_name = serializers.SerializerMethodField()
    effective_expiry_date = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'parent_id', 'created_by', 
            'created_at', 'updated_at', 'subfolder_count', 
            'file_count', 'path', 'google_folder_id', 'status',
            'summary', 'expiry_date', 'signed_date', 'is_viewed',
            'custom_page_id', 'custom_page_slug', 'custom_page_title', 'module_type',
            'department_name', 'effective_expiry_date'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_subfolder_count(self, obj):
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

    def get_department_name(self, obj):
        # 1. Custom page module title
        if getattr(obj, 'custom_page', None):
            return obj.custom_page.title

        # 2. Direct MOU attached to folder
        try:
            mou = obj.mous.filter(department_name__isnull=False).exclude(department_name='').first()
            if mou and mou.department_name:
                return mou.department_name
        except Exception:
            pass

        # 3. Child MOU under this folder's subfolders
        try:
            from mous.models import MOU
            child_mou = MOU.objects.filter(department__parent=obj).exclude(department_name='').first()
            if child_mou and child_mou.department_name:
                return child_mou.department_name
        except Exception:
            pass

        # 4. Children with explicit department name
        try:
            for ch in obj.children.all()[:10]:
                if ch.name in ['BussAdministration', 'Tourism-Obed']:
                    return ch.name
        except Exception:
            pass

        # 5. Check if folder name matches known department
        try:
            from mous.models import Department
            dept = Department.objects.filter(name__iexact=obj.name).first()
            if dept:
                return dept.name
        except Exception:
            pass

        # 6. File inside folder with department
        try:
            file_with_dept = obj.files.exclude(department__isnull=True).exclude(department='').first()
            if file_with_dept and file_with_dept.department:
                return file_with_dept.department
        except Exception:
            pass

        # 7. Ancestors
        try:
            for anc in obj.get_ancestors():
                if anc.parent_id is not None and anc.name != 'MOU Repository':
                    return anc.name
        except Exception:
            pass

        return 'MOU Repository'

    def get_effective_expiry_date(self, obj):
        if obj.expiry_date:
            return str(obj.expiry_date)
        try:
            mou = obj.mous.filter(expiry_date__isnull=False).first()
            if mou and mou.expiry_date:
                return str(mou.expiry_date)
            from files.models import File
            file_exp = obj.files.filter(expiry_date__isnull=False).first()
            if file_exp and file_exp.expiry_date:
                return str(file_exp.expiry_date)
        except Exception:
            pass
        return None
