from rest_framework import serializers
from django.contrib.auth import get_user_model
from roles.models import Role
from permissions.models import Permission
from .models import UserPermission, UserInvitation, SMTPSetting, GoogleDriveSetting, CustomDynamicPage
import re

User = get_user_model()

class RoleSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description']

class PermissionSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'description']

class UserPermissionSerializer(serializers.ModelSerializer):
    permission = PermissionSimpleSerializer(read_only=True)
    permission_id = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(),
        source='permission',
        write_only=True
    )
    
    class Meta:
        model = UserPermission
        fields = ['id', 'permission', 'permission_id', 'is_granted']

class CustomUserSerializer(serializers.ModelSerializer):
    role = RoleSimpleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source='role',
        write_only=True,
        required=False,
        allow_null=True
    )
    permissions_override = UserPermissionSerializer(source='user_permissions_override', many=True, read_only=True)
    active_permissions = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role and request.user.role.name == 'Admin':
            self.fields['role_id'].queryset = Role.objects.exclude(name='Super Admin')

    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'phone', 'designation', 
            'department', 'stream', 'company_name', 'role', 'role_id', 'status', 
            'last_login', 'created_at', 'updated_at',
            'permissions_override', 'active_permissions'
        ]
        read_only_fields = ['last_login', 'created_at', 'updated_at']

    def get_active_permissions(self, obj):
        from permissions.custom_permissions import get_user_permissions
        return list(get_user_permissions(obj))

class CustomUserCreateSerializer(serializers.ModelSerializer):
    role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source='role',
        required=True
    )
    password = serializers.CharField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role and request.user.role.name == 'Admin':
            self.fields['role_id'].queryset = Role.objects.exclude(name='Super Admin')

    class Meta:
        model = User
        fields = [
            'email', 'name', 'phone', 'designation', 
            'department', 'stream', 'role_id', 'status', 'password'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.pop('role')
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=password,
            name=validated_data['name'],
            phone=validated_data.get('phone', ''),
            designation=validated_data.get('designation', ''),
            department=validated_data.get('department', ''),
            stream=validated_data.get('stream', ''),
            role=role,
            status=validated_data.get('status', 'Active')
        )
        return user

class UserInvitationSerializer(serializers.ModelSerializer):
    system_role = RoleSimpleSerializer(read_only=True)
    system_role_id = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(),
        source='system_role',
        write_only=True
    )
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    status = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role and request.user.role.name == 'Admin':
            self.fields['system_role_id'].queryset = Role.objects.exclude(name='Super Admin')

    class Meta:
        model = UserInvitation
        fields = [
            'id', 'email', 'stream', 'department', 'system_role', 'system_role_id',
            'token', 'expires_at', 'is_used', 'is_cancelled', 'created_at',
            'accepted_at', 'ip_address', 'user_agent', 'created_by_email', 'status'
        ]
        read_only_fields = [
            'id', 'token', 'expires_at', 'is_used', 'is_cancelled',
            'created_at', 'accepted_at', 'ip_address', 'user_agent'
        ]

    def get_status(self, obj):
        from django.utils import timezone
        if obj.is_used:
            return 'Accepted'
        if obj.is_cancelled:
            return 'Cancelled'
        if obj.expires_at < timezone.now():
            return 'Expired'
        return 'Pending'

class UserRegistrationSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    name = serializers.CharField(required=True, max_length=150)
    password = serializers.CharField(write_only=True, required=True)
    phone = serializers.CharField(required=False, max_length=20, allow_blank=True, allow_null=True)
    designation = serializers.CharField(required=False, max_length=100, allow_blank=True, allow_null=True)
    stream = serializers.CharField(required=False, max_length=100, allow_blank=True, allow_null=True)
    department = serializers.CharField(required=False, max_length=100, allow_blank=True, allow_null=True)
    company_name = serializers.CharField(required=False, max_length=200, allow_blank=True, allow_null=True)

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain at least one lowercase letter.")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not re.search(r'[^A-Za-z0-9]', value):
            raise serializers.ValidationError("Password must contain at least one special character.")
        return value


class SMTPSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SMTPSetting
        fields = [
            'id', 'host', 'port', 'username', 'password', 'auth_required',
            'use_tls', 'use_ssl', 'sender_email', 'is_active',
            'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'password': {'required': False, 'write_only': True}
        }

    def update(self, instance, validated_data):
        # If password is empty or not provided, keep the existing one
        if 'password' in validated_data and not validated_data['password']:
            validated_data.pop('password')
        return super().update(instance, validated_data)


class GoogleDriveSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoogleDriveSetting
        fields = [
            'id', 'project_id', 'private_key_id', 'private_key', 'client_email',
            'client_id', 'root_folder_id', 'type', 'auth_uri', 'token_uri',
            'auth_provider_x509_cert_url', 'client_x509_cert_url', 'universe_domain',
            'is_active', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'private_key': {'required': False, 'write_only': True}
        }

    def update(self, instance, validated_data):
        if 'private_key' in validated_data and not validated_data['private_key']:
            validated_data.pop('private_key')
        return super().update(instance, validated_data)


class CustomDynamicPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomDynamicPage
        fields = '__all__'

    def create(self, validated_data):
        instance = super().create(validated_data)
        self.sync_google_drive_folder(instance)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        self.sync_google_drive_folder(instance)
        return instance

    def sync_google_drive_folder(self, instance):
        from services import drive_service

        # 1. Create dedicated Google Drive folder under connected Drive root if missing
        if not instance.google_drive_folder_id:
            try:
                drive_root_id = drive_service.get_root_folder_id()
                logger.info(f"Website Builder module created: '{instance.title}'")
                logger.info(f"Connected Drive root found: '{drive_root_id}'")
                logger.info(f"Creating Google Drive folder for module with exact title '{instance.title}'...")

                drive_folder_id = drive_service.create_folder(instance.title, parent_id=drive_root_id)
                logger.info(f"Folder created successfully on Google Drive with exact name '{instance.title}'. ID: '{drive_folder_id}'")

                instance.google_drive_folder_id = drive_folder_id
                instance.save(update_fields=['google_drive_folder_id'])
                logger.info(f"Drive Folder ID saved: '{drive_folder_id}'")
            except Exception as e:
                logger.error(f"Failed to create Google Drive folder for module '{instance.title}': {e}", exc_info=True)
                raise serializers.ValidationError({"google_drive_folder_id": f"Failed to create Google Drive folder: {str(e)}"})
        else:
            # Sync folder name on Google Drive if title was updated
            try:
                drive_service.rename_file(instance.google_drive_folder_id, instance.title)
                logger.info(f"Renamed Google Drive folder '{instance.google_drive_folder_id}' to match module title '{instance.title}'")
            except Exception as rename_err:
                logger.warning(f"Note: Google Drive folder rename check skipped: {rename_err}")

        # 2. Bind/sync with system repository Folder record so every module has its own folder
        if instance.root_folder_id:
            try:
                from folders.models import Folder
                Folder.objects.filter(id=int(instance.root_folder_id)).update(
                    name=instance.title,
                    google_folder_id=instance.google_drive_folder_id.strip(),
                    module_type='custom_page',
                    custom_page=instance
                )
            except Exception as e:
                logger.warning(f"Failed to sync root_folder_id for page '{instance.title}': {e}")
        elif instance.google_drive_folder_id:
            try:
                from folders.models import Folder
                existing = Folder.objects.filter(google_folder_id=instance.google_drive_folder_id.strip()).first()
                if existing:
                    existing.name = instance.title
                    existing.module_type = 'custom_page'
                    existing.custom_page = instance
                    existing.save(update_fields=['name', 'module_type', 'custom_page'])
                    instance.root_folder_id = str(existing.id)
                    instance.root_folder_name = existing.name
                    instance.save(update_fields=['root_folder_id', 'root_folder_name'])
                else:
                    new_folder = Folder.objects.create(
                        name=instance.title,
                        google_folder_id=instance.google_drive_folder_id.strip(),
                        module_type='custom_page',
                        custom_page=instance
                    )
                    instance.root_folder_id = str(new_folder.id)
                    instance.root_folder_name = new_folder.name
                    instance.save(update_fields=['root_folder_id', 'root_folder_name'])
            except Exception as e:
                logger.warning(f"Failed to auto-create repository folder for module '{instance.title}': {e}")


