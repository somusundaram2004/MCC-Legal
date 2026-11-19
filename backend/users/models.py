from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.conf import settings
from django.utils import timezone
from roles.models import Role
import uuid
import base64
import hashlib
from cryptography.fernet import Fernet

def get_encryption_key():
    key = getattr(settings, 'FIELD_ENCRYPTION_KEY', None)
    if not key:
        secret = settings.SECRET_KEY.encode('utf-8')
        key_bytes = hashlib.sha256(secret).digest()
        key = base64.urlsafe_b64encode(key_bytes)
    return key

def encrypt_value(value):
    if not value:
        return value
    try:
        if value.startswith('gAAAAA'):
            return value
        key = get_encryption_key()
        f = Fernet(key)
        return f.encrypt(value.encode('utf-8')).decode('utf-8')
    except Exception:
        return value

def decrypt_value(value):
    if not value:
        return value
    if not value.startswith('gAAAAA'):
        return value
    key = get_encryption_key()
    f = Fernet(key)
    try:
        return f.decrypt(value.encode('utf-8')).decode('utf-8')
    except Exception:
        return value

class EncryptedCharField(models.CharField):
    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        return encrypt_value(value)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        return decrypt_value(value)

    def to_python(self, value):
        if value is None:
            return value
        if isinstance(value, str) and value.startswith('gAAAAA'):
            return decrypt_value(value)
        return value

class EncryptedTextField(models.TextField):
    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        return encrypt_value(value)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        return decrypt_value(value)

    def to_python(self, value):
        if value is None:
            return value
        if isinstance(value, str) and value.startswith('gAAAAA'):
            return decrypt_value(value)
        return value

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('status', 'Active')
        
        # Get or create Super Admin role
        super_admin_role, _ = Role.objects.get_or_create(
            name="Super Admin",
            defaults={"description": "Super Administrator with full system control"}
        )
        extra_fields.setdefault('role', super_admin_role)

        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Disabled', 'Disabled'),
    )

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, null=True)
    designation = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    stream = models.CharField(max_length=100, blank=True, null=True)
    company_name = models.CharField(max_length=200, blank=True, null=True)
    
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, related_name='users')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    password_changed_at = models.DateTimeField(default=timezone.now)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True) # Used by Django auth middleware

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    def __str__(self):
        return self.email

    @property
    def is_disabled(self):
        return self.status == 'Disabled'

class UserPermission(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='user_permissions_override')
    permission = models.ForeignKey('permissions.Permission', on_delete=models.CASCADE, related_name='user_permissions')
    is_granted = models.BooleanField(default=True) # True = Granted override, False = Revoked override

    class Meta:
        unique_together = ('user', 'permission')

    def __str__(self):
        status = "Granted" if self.is_granted else "Revoked"
        return f"{self.user.email} - {self.permission.codename} ({status})"

class UserInvitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    stream = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    system_role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='invitations')
    token = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    is_cancelled = models.BooleanField(default=False)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_invitations')
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invitation for {self.email} ({self.system_role.name})"


class SMTPSetting(models.Model):
    host = models.CharField(max_length=255)
    port = models.IntegerField(default=587)
    username = models.CharField(max_length=255, blank=True, null=True)
    password = EncryptedCharField(max_length=500, blank=True, null=True)
    auth_required = models.BooleanField(default=True)
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    sender_email = models.EmailField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"{self.sender_email} ({status})"

    def save(self, *args, **kwargs):
        if self.is_active:
            # Ensure only one is active at any time
            SMTPSetting.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class GoogleDriveSetting(models.Model):
    project_id = models.CharField(max_length=255, blank=True, null=True)
    private_key_id = models.CharField(max_length=255, blank=True, null=True)
    private_key = EncryptedTextField(blank=True, null=True)
    client_email = models.EmailField(blank=True, null=True)
    client_id = models.CharField(max_length=255, blank=True, null=True)
    client_secret = EncryptedCharField(max_length=500, blank=True, null=True)
    root_folder_id = models.CharField(max_length=255, blank=True, null=True)
    
    # OAuth tokens & credentials
    access_token = EncryptedTextField(blank=True, null=True)
    refresh_token = EncryptedTextField(blank=True, null=True)
    connected_email = models.EmailField(blank=True, null=True)
    token_expiry = models.DateTimeField(blank=True, null=True)
    storage_limit = models.BigIntegerField(blank=True, null=True)
    storage_usage = models.BigIntegerField(blank=True, null=True)
    token_data = EncryptedTextField(blank=True, null=True)
    default_upload_folder = models.CharField(max_length=255, blank=True, null=True, default='Root Repository')
    connection_status = models.CharField(max_length=50, default='Disconnected')
    oauth_connected = models.BooleanField(default=False)
    last_connection_time = models.DateTimeField(blank=True, null=True)

    # Optional fields for customization
    type = models.CharField(max_length=100, default='service_account')
    auth_uri = models.URLField(default='https://accounts.google.com/o/oauth2/auth')
    token_uri = models.URLField(default='https://oauth2.googleapis.com/token')
    auth_provider_x509_cert_url = models.URLField(default='https://www.googleapis.com/oauth2/v1/certs')
    client_x509_cert_url = models.URLField(max_length=500, blank=True, null=True)
    universe_domain = models.CharField(max_length=100, default='googleapis.com')
    
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"Google Drive - {self.project_id} ({status})"

    def save(self, *args, **kwargs):
        if self.is_active:
            # Ensure only one is active at any time
            GoogleDriveSetting.objects.filter(is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class PasswordResetOTP(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='password_reset_otps')
    otp_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Password Reset OTP for {self.user.email} (Expires: {self.expires_at})"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


class CustomDynamicPage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    icon = models.CharField(max_length=100, default='Folder')
    route = models.CharField(max_length=255, default='/custom-page')
    parent_slug = models.CharField(max_length=255, blank=True, null=True)
    root_folder_name = models.CharField(max_length=255, blank=True, null=True)
    root_folder_id = models.CharField(max_length=255, blank=True, null=True)
    google_drive_folder_id = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    order = models.IntegerField(default=0)
    badge = models.CharField(max_length=50, blank=True, null=True)
    badge_color = models.CharField(max_length=50, default='#3B82F6')
    page_type = models.CharField(max_length=100, default='Folder Repository')
    is_published = models.BooleanField(default=True)
    is_enabled = models.BooleanField(default=True)
    open_new_tab = models.BooleanField(default=False)
    allowed_roles = models.JSONField(default=list)
    allowed_permissions = models.JSONField(default=list)
    theme_colors = models.JSONField(default=dict)
    crud_permissions = models.JSONField(default=dict)
    entity_schema = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'title']

    def __str__(self):
        status = "Published" if self.is_published else "Draft"
        return f"{self.title} ({self.slug}) - {status}"


class EmailNotificationSetting(models.Model):
    REDIRECTION_CHOICES = (
        ('shared_files', 'Shared Files Section (/shared) — Recommended'),
        ('mou_detail', 'Direct MOU Page (/mou/{id})'),
        ('login_redirect', 'Login with Redirect (/login?next=/shared)'),
        ('custom', 'Custom Route Pattern'),
    )

    DOWNLOAD_CHOICES = (
        ('direct_api', 'Direct File Download (/api/mous/shared/download/{token}/) — Recommended & Instant'),
        ('portal_page', 'Portal Download Page (/shared/download/{token})'),
        ('custom', 'Custom Download URL Pattern'),
    )

    portal_base_url = models.CharField(
        max_length=500,
        default='https://legal.mccmrfip.in',
        help_text="Base URL for outgoing email links. Set this to your network IP (e.g. http://10.88.62.66:5173) or production domain (e.g. https://legal.mccmrfip.in) so recipients on other devices can access the portal."
    )
    download_link_type = models.CharField(
        max_length=50,
        choices=DOWNLOAD_CHOICES,
        default='direct_api',
        help_text="Direct File Download streams file directly to Downloads folder; Portal Download Page opens the portal UI."
    )
    custom_download_path = models.CharField(
        max_length=500,
        default='/api/mous/shared/download/{token}/',
        blank=True,
        help_text="Custom download path pattern (supports {token}, {mou_id})"
    )
    redirection_target = models.CharField(
        max_length=50,
        choices=REDIRECTION_CHOICES,
        default='shared_files',
        help_text="Where the email action button redirects the recipient."
    )
    custom_redirect_path = models.CharField(
        max_length=500,
        default='/shared',
        blank=True,
        help_text="Custom path pattern (supports {mou_id}, {token}, {recipient_email})"
    )
    always_require_login_redirect = models.BooleanField(
        default=True,
        help_text="When enabled, portal button routes recipients through /login?email={email}&next={target} so unauthenticated users never see a blank screen or permission error."
    )
    mou_button_label = models.CharField(
        max_length=100,
        default='OPEN MOU PORTAL',
        help_text="Label for the primary portal navigation button in the email"
    )
    download_button_label = models.CharField(
        max_length=100,
        default='DOWNLOAD MOU',
        help_text="Label for the direct document download button in the email"
    )
    default_subject = models.CharField(
        max_length=500,
        default='Shared MOU: {mou_title} ({mou_number})',
        help_text="Default subject line template for sharing notifications"
    )
    default_body = models.TextField(
        blank=True,
        null=True,
        default="Dear Colleague / Partner,\n\nYou have been granted official access to the Memorandum of Understanding: {mou_title} ({mou_number}) between Madras Christian College (MCC) and {partner_organization}.\n\nThis document is accessible in your MCC Legal Document portal. You can download the agreement directly to your device or open the portal to inspect complete institutional records.\n\nRegards,\n{sender_name}\nMCC Legal Cell"
    )
    footer_notice = models.TextField(
        blank=True,
        null=True,
        default="This document is automatically preserved in your Shared Files repository. Downloading the file will not remove it from your portal view or alter ownership."
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Email Notification Setting"
        verbose_name_plural = "Email Notification Settings"

    def __str__(self):
        return f"Email Redirection & Content Config ({self.portal_base_url})"

    @classmethod
    def get_setting(cls):
        inst = cls.objects.first()
        if not inst:
            from django.conf import settings
            default_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            inst = cls.objects.create(portal_base_url=default_base)
        return inst



