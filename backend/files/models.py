from django.db import models
from django.conf import settings
from django.utils import timezone
from folders.models import Folder
import os
import calendar
from datetime import date

def file_upload_path(instance, filename):
    # Store files grouped by their folder ID
    folder_id = instance.folder.id if instance.folder else 'root'
    return os.path.join('folders', str(folder_id), filename)

def file_version_upload_path(instance, filename):
    # Store versions grouped by parent file ID and version number
    return os.path.join('versions', f"file_{instance.file.id}", f"v{instance.version_number}", filename)

class File(models.Model):
    name = models.CharField(max_length=255)
    title = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    department = models.CharField(max_length=150, blank=True, null=True)
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
    start_date = models.DateField(blank=True, null=True)
    signed_date = models.DateField(blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)
    
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

    def get_remaining_days(self):
        if not self.expiry_date:
            return None
        today = timezone.now().date()
        return (self.expiry_date - today).days

    def get_duration_display(self):
        """
        Calculates calendar duration from actual calendar dates; does not assume every month has 30 days.
        """
        d1 = self.start_date
        d2 = self.expiry_date
        if not d1 or not d2 or d2 < d1:
            return None
        years = d2.year - d1.year
        months = d2.month - d1.month
        days = d2.day - d1.day
        if days < 0:
            months -= 1
            prev_month = d2.month - 1 if d2.month > 1 else 12
            prev_year = d2.year if d2.month > 1 else d2.year - 1
            days_in_prev_month = calendar.monthrange(prev_year, prev_month)[1]
            days += days_in_prev_month
        if months < 0:
            years -= 1
            months += 12
        parts = []
        if years > 0:
            parts.append(f"{years} year{'s' if years > 1 else ''}")
        if months > 0:
            parts.append(f"{months} month{'s' if months > 1 else ''}")
        if days > 0 or not parts:
            parts.append(f"{days} day{'s' if days != 1 else ''}")
        total_days = (d2 - d1).days
        return f"{', '.join(parts)} ({total_days} days)"

    def get_expiry_status_info(self):
        """
        Determines expiry status and color-coded validity.
        Boundary behavior:
        - Exactly 90 days remaining: Yellow (Expiring Soon)
        - Exactly 30 days remaining: Orange (Urgent)
        - Zero days remaining on expiry date: Expiring Today (treated as urgent, not expired)
        - The day after expiry date (days < 0): Red (Expired)
        - Future start date: Blue (Not Yet Active)
        - No expiry date: Grey (No Expiry Date)
        - More than 90 days remaining: Green (Active)
        """
        today = timezone.now().date()

        if self.start_date and self.start_date > today:
            return {
                'status': 'Not Yet Active',
                'color': 'blue',
                'color_code': '#2563EB',
                'days_remaining': (self.expiry_date - today).days if self.expiry_date else None,
                'is_active': False,
                'is_expired': False
            }

        if not self.expiry_date:
            return {
                'status': 'No Expiry Date',
                'color': 'grey',
                'color_code': '#64748B',
                'days_remaining': None,
                'is_active': True,
                'is_expired': False
            }

        days = (self.expiry_date - today).days

        if days < 0:
            return {
                'status': 'Expired',
                'color': 'red',
                'color_code': '#DC2626',
                'days_remaining': days,
                'is_active': False,
                'is_expired': True
            }
        elif days == 0:
            return {
                'status': 'Expiring Today',
                'color': 'orange',
                'color_code': '#EA580C',
                'days_remaining': 0,
                'is_active': True,
                'is_expired': False
            }
        elif 1 <= days <= 30:
            return {
                'status': 'Urgent',
                'color': 'orange',
                'color_code': '#EA580C',
                'days_remaining': days,
                'is_active': True,
                'is_expired': False
            }
        elif 31 <= days <= 90:
            return {
                'status': 'Expiring Soon',
                'color': 'yellow',
                'color_code': '#EAB308',
                'days_remaining': days,
                'is_active': True,
                'is_expired': False
            }
        else:
            return {
                'status': 'Active',
                'color': 'green',
                'color_code': '#16A34A',
                'days_remaining': days,
                'is_active': True,
                'is_expired': False
            }

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
