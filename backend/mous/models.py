from django.db import models
from django.conf import settings
from folders.models import Folder
from files.models import File
from datetime import timedelta, date

class MOUTemplate(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    template_notes = models.TextField(blank=True, null=True, help_text="Explanation for non-technical users on why this template exists and field meanings")
    fields_schema = models.JSONField(default=list, help_text="List of custom field definitions: [{name, label, type, required}]")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class MOU(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Shared', 'Shared'),
        ('Signed', 'Signed'),
        ('Pending Verification', 'Pending Verification'),
        ('Active', 'Active'),
        ('Expired', 'Expired'),
        ('Renewed', 'Renewed'),
    ]

    title = models.CharField(max_length=255)
    mou_number = models.CharField(max_length=100, unique=True)
    mou_type = models.ForeignKey(MOUTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name='mous')
    partner_organization = models.CharField(max_length=255)
    department = models.ForeignKey(Folder, on_delete=models.SET_NULL, null=True, blank=True, related_name='mous')
    department_name = models.CharField(max_length=255, blank=True, null=True)

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_mous')
    original_mou = models.ForeignKey(File, on_delete=models.SET_NULL, null=True, blank=True, related_name='original_mous')
    signed_mou = models.ForeignKey(File, on_delete=models.SET_NULL, null=True, blank=True, related_name='signed_mous')
    mou_file = models.FileField(upload_to='uploads/mous/', null=True, blank=True)

    effective_date = models.DateField(null=True, blank=True)
    signed_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    duration_months = models.IntegerField(default=12, help_text="Duration in months")

    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Draft')

    summary = models.TextField(blank=True, null=True)
    purpose = models.TextField(blank=True, null=True)
    objectives = models.TextField(blank=True, null=True)
    beneficiaries = models.JSONField(default=list, blank=True, null=True) # ['Students', 'Faculty', 'Researchers']
    opportunities = models.JSONField(default=list, blank=True, null=True) # ['Internship', 'Placement', 'Research']
    custom_fields_data = models.JSONField(default=dict, blank=True, null=True)

    # Coordinators
    coordinator_name = models.CharField(max_length=255, blank=True, null=True)
    coordinator_designation = models.CharField(max_length=255, blank=True, null=True)
    coordinator_email = models.EmailField(blank=True, null=True)
    coordinator_phone = models.CharField(max_length=50, blank=True, null=True)

    partner_name = models.CharField(max_length=255, blank=True, null=True)
    partner_designation = models.CharField(max_length=255, blank=True, null=True)
    partner_email = models.EmailField(blank=True, null=True)
    partner_phone = models.CharField(max_length=50, blank=True, null=True)

    additional_notes = models.TextField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    version_number = models.IntegerField(default=1)
    is_renewed = models.BooleanField(default=False)
    renewed_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='renewals')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_expiry(self, signed_dt=None, duration=None):
        sd = signed_dt or self.signed_date or date.today()
        dur = duration or self.duration_months or 12
        # Approx calculation: signed_date + dur * 30 days or month arithmetic
        month = sd.month - 1 + dur
        year = sd.year + month // 12
        month = month % 12 + 1
        day = min(sd.day, 28) # handle leap/month end safely
        return date(year, month, day)

    def days_remaining(self):
        if not self.expiry_date:
            return None
        today = date.today()
        return (self.expiry_date - today).days

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.department:
            from folders.models import Folder
            from services import drive_service
            
            # 1. Get or create parent department folder at root level
            dept_name = self.department_name or "General"
            parent_dept_folder, _ = Folder.objects.get_or_create(
                name=dept_name,
                parent=None,
                defaults={'created_by': self.created_by}
            )
            import logging
            logger = logging.getLogger(__name__)
            if not parent_dept_folder.google_folder_id:
                try:
                    google_id = drive_service.create_folder(parent_dept_folder.name, None)
                    parent_dept_folder.google_folder_id = google_id
                    parent_dept_folder.save(update_fields=['google_folder_id'])
                except Exception as drive_err:
                    logger.warning(f"Google Drive folder creation skipped for '{parent_dept_folder.name}': {drive_err}")
            
            # 2. Create specific MOU subfolder inside the department folder
            mou_folder = Folder.objects.create(
                name=self.title,
                parent=parent_dept_folder,
                created_by=self.created_by
            )
            try:
                google_id = drive_service.create_folder(mou_folder.name, parent_dept_folder.google_folder_id)
                mou_folder.google_folder_id = google_id
                mou_folder.save(update_fields=['google_folder_id'])
            except Exception as drive_err:
                logger.warning(f"Google Drive subfolder creation skipped for '{mou_folder.name}': {drive_err}")
                
            # 3. Update department FK on self
            self.department = mou_folder
            super().save(update_fields=['department'])

    def __str__(self):
        return f"{self.mou_number} - {self.title} ({self.status})"

class MOUDocument(models.Model):
    DOC_TYPES = [
        ('original', 'Original MOU'),
        ('signed', 'Signed MOU'),
        ('summary', 'Summary Document'),
        ('supporting', 'Supporting Document'),
    ]
    mou = models.ForeignKey(MOU, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50, choices=DOC_TYPES)
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='mou_documents')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class MOURenewal(models.Model):
    original_mou = models.ForeignKey(MOU, on_delete=models.CASCADE, related_name='renewal_history')
    renewed_mou = models.ForeignKey(MOU, on_delete=models.CASCADE, related_name='renewed_instance')
    renewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    renewed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

class MOUShare(models.Model):
    PERMISSION_CHOICES = [
        ('View Only', 'View Only'),
        ('Upload Only', 'Upload Only'),
        ('Edit', 'Edit'),
        ('Full Access', 'Full Access'),
    ]

    STATUS_CHOICES = [
        ('Shared', 'Shared'),
        ('Viewed', 'Viewed'),
        ('Pending Upload', 'Pending Upload'),
        ('Signed MOU Uploaded', 'Signed MOU Uploaded'),
        ('Verified by Legal Cell', 'Verified by Legal Cell'),
        ('Completed', 'Completed'),
    ]

    mou = models.ForeignKey(MOU, on_delete=models.CASCADE, related_name='shares')
    department = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='mou_shares', null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='individual_shares', null=True, blank=True)
    shared_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='shares_created')
    permission = models.CharField(max_length=50, choices=PERMISSION_CHOICES, default='View Only')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Shared')
    shared_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('mou', 'department', 'user')

class DepartmentSubmission(models.Model):
    STATUS_CHOICES = [
        ('Pending Verification', 'Pending Verification'),
        ('Verified', 'Verified'),
        ('Rejected', 'Rejected'),
    ]

    mou = models.ForeignKey(MOU, on_delete=models.CASCADE, related_name='department_submissions')
    department = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='submissions', null=True, blank=True)
    signed_file = models.ForeignKey(File, on_delete=models.SET_NULL, null=True, blank=True, related_name='department_submissions_signed')
    
    # Metadata fields
    signed_date = models.DateField()
    mou_month = models.CharField(max_length=20)
    mou_year = models.IntegerField()
    summary = models.TextField()
    purpose = models.TextField()
    benefits = models.JSONField(default=list)
    remarks = models.TextField(blank=True, null=True)
    
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Legal Cell Review
    review_status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pending Verification')
    reviewer_comments = models.TextField(blank=True, null=True)


class TemplateCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class OrganizationType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class CollaborationType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class DocumentType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class DepartmentCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Department(models.Model):
    name = models.CharField(max_length=100)
    category = models.ForeignKey(DepartmentCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='departments')
    stream = models.ForeignKey('Stream', on_delete=models.SET_NULL, null=True, blank=True, related_name='departments')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        unique_together = ('name', 'stream', 'category')

    def __str__(self):
        cat_str = f" ({self.category.name})" if self.category else ""
        stream_str = f" [{self.stream.name}]" if self.stream else ""
        return f"{self.name}{stream_str}{cat_str}"


class TemplateCollection(models.Model):
    template_name = models.CharField(max_length=255)
    category = models.ForeignKey(TemplateCategory, on_delete=models.PROTECT, related_name='collections')
    organization_type = models.ForeignKey(OrganizationType, on_delete=models.PROTECT, related_name='collections')
    collaboration_type = models.ForeignKey(CollaborationType, on_delete=models.PROTECT, related_name='collections')
    department_category = models.ForeignKey(DepartmentCategory, on_delete=models.PROTECT, related_name='collections')
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='collections')
    description = models.TextField(blank=True, null=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name='collections')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_collections')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.template_name


class TemplateDocument(models.Model):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Active', 'Active'),
        ('Archived', 'Archived'),
    )
    template_collection = models.ForeignKey(TemplateCollection, on_delete=models.CASCADE, related_name='documents')
    document_name = models.CharField(max_length=255)
    document_type = models.ForeignKey(DocumentType, on_delete=models.PROTECT, related_name='documents')
    file_path = models.FileField(upload_to='template_pdfs/', null=True, blank=True)
    google_file_id = models.CharField(max_length=255, blank=True, null=True)
    version = models.CharField(max_length=50, default="1.0")
    effective_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    revision_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True, null=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_template_documents')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Active')

    def __str__(self):
        return f"{self.document_name} - v{self.version}"


class MOUCategory(models.Model):
    CATEGORY_TYPES = [
        ('Department', 'College Department'),
        ('Company', 'Company Name'),
    ]

    name = models.CharField(max_length=255)
    stream = models.ForeignKey('Stream', on_delete=models.SET_NULL, null=True, blank=True, related_name='mou_categories')
    code = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=50, default='#3B82F6')
    icon_type = models.CharField(max_length=50, default='school')  # 'school', 'hospital', 'business', 'palette', 'science', 'gavel'
    coordinator_name = models.CharField(max_length=255, blank=True, null=True)
    coordinator_email = models.EmailField(blank=True, null=True)
    category_type = models.CharField(max_length=50, choices=CATEGORY_TYPES, default='Department')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ('name', 'stream')

    def __str__(self):
        stream_str = f" [{self.stream.name}]" if self.stream else ""
        return f"{self.name}{stream_str} ({self.code})"


class Stream(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name




