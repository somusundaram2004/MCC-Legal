from rest_framework import serializers
from .models import (
    MOUTemplate, MOU, MOUDocument, MOURenewal,
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
        return [{
            'id': s.id,
            'department_id': s.department_id,
            'department_name': s.department.name if s.department else None,
            'user_email': s.user.email if s.user else None,
            'permission': s.permission,
            'status': s.status,
            'shared_at': s.shared_at
        } for s in obj.shares.all()]

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
    class Meta:
        model = MOUCategory
        fields = '__all__'


class StreamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stream
        fields = '__all__'




