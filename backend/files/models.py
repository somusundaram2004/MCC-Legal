from django.db import models
from django.conf import settings
from folders.models import Folder
import os

def file_upload_path(instance, filename):
    # Store files grouped by their folder ID
    folder_id = instance.folder.id if instance.folder else 'root'
    return os.path.join('folders', str(folder_id), filename)

def file_version_upload_path(instance, filename):
    # Store versions grouped by parent file ID and version number
    return os.path.join('versions', f"file_{instance.file.id}", f"v{instance.version_number}", filename)

class File(models.Model):
    name = models.CharField(max_length=255)
    size = models.BigIntegerField()  # File size in bytes
    file_type = models.CharField(max_length=100)  # MIME type or extension
    
    folder = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        related_name='files'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_files'
    )
    file_field = models.FileField(upload_to=file_upload_path, null=True, blank=True)
    version_number = models.IntegerField(default=1)
    is_signed = models.BooleanField(default=False)
    
    google_file_id = models.CharField(max_length=255, blank=True, null=True)
    mime_type = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.BigIntegerField(blank=True, null=True)
    web_view_link = models.URLField(max_length=1000, blank=True, null=True)
    web_content_link = models.URLField(max_length=1000, blank=True, null=True)
    import_source = models.CharField(max_length=50, default='local', blank=True, null=True)
    source_google_file_id = models.CharField(max_length=255, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Security & Integrity Fields
    sha256_hash = models.CharField(max_length=64, blank=True, null=True)
    virus_scan_status = models.CharField(max_length=50, default='Pending')
    encrypted = models.BooleanField(default=True)
    encryption_key_id = models.CharField(max_length=100, default='Google-Drive-AES-256')

    # Soft Delete / Recycle Bin Fields
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(blank=True, null=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_files'
    )

    def __str__(self):
        return f"{self.name} (v{self.version_number})"

class FileVersion(models.Model):
    file = models.ForeignKey(
        File,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.IntegerField()
    name = models.CharField(max_length=255)
    size = models.BigIntegerField()
    file_type = models.CharField(max_length=100)
    
    file_field = models.FileField(upload_to=file_version_upload_path, null=True, blank=True)
    google_file_id = models.CharField(max_length=255, blank=True, null=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_file_versions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # Security & Integrity Fields
    sha256_hash = models.CharField(max_length=64, blank=True, null=True)
    virus_scan_status = models.CharField(max_length=50, default='Pending')
    encrypted = models.BooleanField(default=True)
    encryption_key_id = models.CharField(max_length=100, default='Google-Drive-AES-256')

    class Meta:
        ordering = ['-version_number']

    def __str__(self):
        return f"{self.name} - Version {self.version_number} (File ID: {self.file.id})"
