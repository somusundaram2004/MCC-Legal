from rest_framework import serializers
from .models import (
    MOUTemplate, MOU, MOUDocument, MOURenewal, MOUShare, MOUShareDownloadLog,
    TemplateCategory, OrganizationType, CollaborationType, DocumentType, Tag,
    DepartmentCategory, Department, TemplateCollection, TemplateDocument, MOUCategory, Stream
)
from files.serializers import FileSerializer
from folders.serializers import FolderSerializer
from users.serializers import CustomUserSerializer

class MOUTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    mou_count = serializers.IntegerField(source='mous.count', read_only=True)

    class Meta:
        model = MOUTemplate
        fields = [
            'id', 'name', 'description', 'template_notes', 
            'fields_schema', 'created_by', 'created_by_name', 
            'is_active', 'mou_count', 'created_at', 'updated_at'
        ]

class MOUDocumentSerializer(serializers.ModelSerializer):
    file_details = FileSerializer(source='file', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)

    class Meta:
        model = MOUDocument
        fields = ['id', 'mou', 'document_type', 'file', 'file_details', 'uploaded_by', 'uploaded_by_name', 'uploaded_at']

class MOUSerializer(serializers.ModelSerializer):
    mou_type_name = serializers.CharField(source='mou_type.name', read_only=True)
    department_folder_name = serializers.CharField(source='department.name', read_only=True)
    created_by_details = CustomUserSerializer(source='created_by', read_only=True)
    original_mou_details = FileSerializer(source='original_mou', read_only=True)
    signed_mou_details = FileSerializer(source='signed_mou', read_only=True)
    days_left = serializers.SerializerMethodField()
    documents = MOUDocumentSerializer(many=True, read_only=True)
    
    shares_list = serializers.SerializerMethodField()
    user_share_details = serializers.SerializerMethodField()
    submissions = serializers.SerializerMethodField()

    class Meta:
        model = MOU
        fields = '__all__'

    def get_days_left(self, obj):
        return obj.days_remaining()

    def get_shares_list(self, obj):
        from django.utils import timezone
        now = timezone.now()
        return [{
            'id': s.id,
            'department_id': s.department_id,
            'department_name': s.department.name if s.department else None,
            'user_id': s.user_id,
            'user_name': s.user.name if s.user else None,
            'user_email': s.user.email if s.user else None,
            'recipient_email': s.recipient_email or (s.user.email if s.user else None),
            'target_display': s.department.name if s.department else (s.recipient_email or (s.user.email if s.user else 'Unknown')),
            'shared_file_id': s.shared_file_id,
            'document_name': s.shared_file.name if s.shared_file else f"{s.mou.title}.pdf",
            'document_version': s.document_version,
            'permission': s.permission,
            'status': s.status,
            'download_status': 'Downloaded' if s.download_count > 0 else 'Not Downloaded',
            'download_count': s.download_count,
            'first_download_date': s.first_download_date,
            'last_download_date': s.last_download_date,
            'access_status': 'Revoked' if s.access_status == 'Revoked' else ('Expired' if s.expires_at and s.expires_at < now else 'Active'),
            'expires_at': s.expires_at,
            'secure_token': s.secure_token,
            'shared_by': s.shared_by.name if s.shared_by else None,
            'shared_by_email': s.shared_by.email if s.shared_by else None,
            'shared_at': s.shared_at,
            'email_template': s.email_template,
            'sharing_history': s.sharing_history
        } for s in obj.shares.all().order_by('-shared_at')]

    def get_user_share_details(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            user = request.user
            shares = obj.shares.all()
            if user.department:
                ds = shares.filter(department__name=user.department).first()
                if ds:
                    return {'permission': ds.permission, 'status': ds.status}
            us = shares.filter(user=user).first()
            if us:
                return {'permission': us.permission, 'status': us.status}
                
            # Check recursive FolderPermission shared by Admin
            if obj.department:
                from folders.models import FolderPermission
                current = obj.department
                while current is not None:
                    fp = FolderPermission.objects.filter(user=user, folder=current, is_granted=True).first()
                    if fp:
                        perm = 'View Only'
                        if fp.can_upload:
                            perm = 'Upload Only'
                        if fp.can_download and fp.can_upload:
                            perm = 'Edit'
                        return {'permission': perm, 'status': 'Shared'}
                    current = current.parent
        return None

    def get_submissions(self, obj):
        request = self.context.get('request')
        is_admin = False
        if request and request.user and request.user.is_authenticated:
            is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]
            
        subs = obj.department_submissions.all()
        if not is_admin and request and request.user and request.user.department:
            subs = subs.filter(department__name=request.user.department)
            
        return [{
            'id': s.id,
            'signed_file_id': s.signed_file_id,
            'signed_file_name': s.signed_file.name if s.signed_file else None,
            'signed_date': s.signed_date,
            'mou_month': s.mou_month,
            'mou_year': s.mou_year,
            'summary': s.summary,
            'purpose': s.purpose,
            'benefits': s.benefits,
            'remarks': s.remarks,
            'uploaded_by': s.uploaded_by.name if s.uploaded_by else None,
            'uploaded_at': s.uploaded_at,
            'review_status': s.review_status,
            'reviewer_comments': s.reviewer_comments
        } for s in subs]


class TemplateCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateCategory
        fields = '__all__'


class OrganizationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationType
        fields = '__all__'


class CollaborationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollaborationType
        fields = '__all__'


class DocumentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentType
        fields = '__all__'


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'


class DepartmentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartmentCategory
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    stream_name = serializers.CharField(source='stream.name', read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'category', 'category_name', 'stream', 'stream_name', 'is_active']
        validators = []

    def validate(self, attrs):
        name = attrs.get('name', getattr(self.instance, 'name', '') if self.instance else '').strip()
        stream = attrs.get('stream', getattr(self.instance, 'stream', None) if self.instance else None)
        category = attrs.get('category', getattr(self.instance, 'category', None) if self.instance else None)

        qs = Department.objects.filter(
            name__iexact=name,
            stream=stream,
            category=category
        )
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            stream_str = f" under stream '{stream.name}'" if stream else ""
            cat_str = f" ({category.name})" if category else ""
            raise serializers.ValidationError(
                {"detail": f"A department named '{name}' already exists{stream_str}{cat_str}."}
            )

        return attrs


class TemplateDocumentSerializer(serializers.ModelSerializer):
    document_type_name = serializers.CharField(source='document_type.name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.name', read_only=True)

    class Meta:
        model = TemplateDocument
        fields = '__all__'


class TemplateCollectionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    organization_type_name = serializers.CharField(source='organization_type.name', read_only=True)
    collaboration_type_name = serializers.CharField(source='collaboration_type.name', read_only=True)
    department_category_name = serializers.CharField(source='department_category.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    tags_details = TagSerializer(source='tags', many=True, read_only=True)
    documents = TemplateDocumentSerializer(many=True, read_only=True)
    document_count = serializers.IntegerField(source='documents.count', read_only=True)

    class Meta:
        model = TemplateCollection
        fields = '__all__'


class MOUCategorySerializer(serializers.ModelSerializer):
    stream_name = serializers.CharField(source='stream.name', read_only=True)

    class Meta:
        model = MOUCategory
        fields = '__all__'


class StreamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stream
        fields = '__all__'


class MOUShareDownloadLogSerializer(serializers.ModelSerializer):
    recipient_user_name = serializers.CharField(source='recipient_user.name', read_only=True)
    recipient_user_email = serializers.CharField(source='recipient_user.email', read_only=True)

    class Meta:
        model = MOUShareDownloadLog
        fields = '__all__'


class MOUShareSerializer(serializers.ModelSerializer):
    mou_id = serializers.IntegerField(source='mou.id', read_only=True)
    mou_title = serializers.CharField(source='mou.title', read_only=True)
    mou_number = serializers.CharField(source='mou.mou_number', read_only=True)
    partner_organization = serializers.CharField(source='mou.partner_organization', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    shared_by_name = serializers.CharField(source='shared_by.name', read_only=True)
    shared_by_email = serializers.CharField(source='shared_by.email', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    target_email = serializers.SerializerMethodField()
    document_name = serializers.SerializerMethodField()
    file_type = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    web_view_link = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    shared_date = serializers.DateTimeField(source='shared_at', read_only=True)
    download_date = serializers.DateTimeField(source='last_download_date', read_only=True)
    download_status = serializers.SerializerMethodField()
    computed_access_status = serializers.SerializerMethodField()
    download_logs = MOUShareDownloadLogSerializer(many=True, read_only=True)

    class Meta:
        model = MOUShare
        fields = '__all__'

    def get_target_email(self, obj):
        return obj.recipient_email or (obj.user.email if obj.user else None)

    def get_document_name(self, obj):
        if obj.shared_file:
            return obj.shared_file.name
        return f"{obj.mou.title}.pdf"

    def get_file_type(self, obj):
        if obj.shared_file:
            return obj.shared_file.file_type
        return 'pdf'

    def get_file_size(self, obj):
        if obj.shared_file:
            return obj.shared_file.size
        return None

    def get_file_url(self, obj):
        request = self.context.get('request')
        f = obj.shared_file or obj.mou.signed_mou or obj.mou.original_mou or (obj.mou.documents.first().file if obj.mou.documents.exists() else None)
        if f and f.file_field:
            if request:
                return request.build_absolute_uri(f.file_field.url)
            return f.file_field.url
        return None

    def get_web_view_link(self, obj):
        f = obj.shared_file or obj.mou.signed_mou or obj.mou.original_mou or (obj.mou.documents.first().file if obj.mou.documents.exists() else None)
        if f and f.web_view_link:
            return f.web_view_link
        return None

    def get_download_url(self, obj):
        return f"/api/mous/shared/download/{obj.secure_token}/"

    def get_download_status(self, obj):
        return 'Downloaded' if obj.download_count > 0 else 'Not Downloaded'

    def get_computed_access_status(self, obj):
        if obj.access_status == 'Revoked':
            return 'Revoked'
        from django.utils import timezone
        if obj.expires_at and timezone.now() > obj.expires_at:
            return 'Expired'
        return 'Active'





