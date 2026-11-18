from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import File, FileVersion
from folders.serializers import UserMinimalSerializer

class FileVersionSerializer(serializers.ModelSerializer):
    uploaded_by = UserMinimalSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = FileVersion
        fields = [
            'id', 'version_number', 'name', 'size', 
            'file_type', 'file_url', 'uploaded_by', 'created_at', 'google_file_id',
            'sha256_hash', 'virus_scan_status', 'encrypted', 'encryption_key_id'
        ]
        read_only_fields = ['version_number', 'created_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file_field:
            return request.build_absolute_uri(obj.file_field.url)
        return obj.file_field.url if obj.file_field else None

class FileSerializer(serializers.ModelSerializer):
    uploaded_by = UserMinimalSerializer(read_only=True)
    folder_id = serializers.IntegerField(source='folder.id', read_only=True)
    folder_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    versions = FileVersionSerializer(many=True, read_only=True)
    size_formatted = serializers.SerializerMethodField()
    submission_metadata = serializers.SerializerMethodField()
    
    # Expiry tracking fields
    duration = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    expiry_status = serializers.SerializerMethodField()
    status_color = serializers.SerializerMethodField()
    status_color_code = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = [
            'id', 'name', 'title', 'description', 'department', 'size', 'size_formatted', 'file_type', 
            'folder_id', 'folder_name', 'department_name', 'uploaded_by', 'file_url', 
            'version_number', 'versions', 'is_signed', 'signed_date', 'start_date', 'expiry_date',
            'duration', 'days_remaining', 'expiry_status', 'status_color', 'status_color_code',
            'created_at', 'updated_at',
            'google_file_id', 'mime_type', 'file_size', 'web_view_link', 'web_content_link',
            'submission_metadata', 'sha256_hash', 'virus_scan_status', 'encrypted', 'encryption_key_id'
        ]
        read_only_fields = ['size', 'file_type', 'version_number', 'created_at', 'updated_at', 'sha256_hash', 'virus_scan_status', 'encrypted', 'encryption_key_id']

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        expiry_date = attrs.get('expiry_date')
        if self.instance:
            if start_date is None:
                start_date = self.instance.start_date
            if expiry_date is None:
                expiry_date = self.instance.expiry_date

        if start_date and expiry_date and expiry_date < start_date:
            raise serializers.ValidationError({"expiry_date": "Expiry date cannot be earlier than start date."})
        return attrs

    def get_folder_name(self, obj):
        return obj.folder.name if obj.folder else ''

    def get_department_name(self, obj):
        if getattr(obj, 'department', None):
            return obj.department
        if not obj.folder:
            return ''
        ancestors = obj.folder.get_ancestors()
        # Look for department root (ancestor just under module root or top-level folder)
        for anc in ancestors:
            if anc.parent_id is None or anc.parent.name in ['MOU Repository', 'root']:
                return anc.name
        return ancestors[0].name if ancestors else obj.folder.name

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file_field:
            return request.build_absolute_uri(obj.file_field.url)
        return obj.file_field.url if obj.file_field else None

    def get_size_formatted(self, obj):
        size = obj.size or 0
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} GB"

    def get_duration(self, obj):
        return obj.get_duration_display()

    def get_days_remaining(self, obj):
        return obj.get_remaining_days()

    def get_expiry_status(self, obj):
        return obj.get_expiry_status_info()['status']

    def get_status_color(self, obj):
        return obj.get_expiry_status_info()['color']

    def get_status_color_code(self, obj):
        return obj.get_expiry_status_info()['color_code']

    def get_submission_metadata(self, obj):
        sub = obj.department_submissions_signed.first()
        if sub:
            return {
                'id': sub.id,
                'signed_date': sub.signed_date,
                'mou_month': sub.mou_month,
                'mou_year': sub.mou_year,
                'summary': sub.summary,
                'purpose': sub.purpose,
                'benefits': sub.benefits,
                'remarks': sub.remarks,
                'uploaded_by': sub.uploaded_by.name if sub.uploaded_by else '',
                'uploaded_at': sub.uploaded_at,
                'review_status': sub.review_status,
                'reviewer_comments': sub.reviewer_comments,
                'department_name': sub.department.name if sub.department else ''
            }
        return None
