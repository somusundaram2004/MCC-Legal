from django.db import models
from django.conf import settings

class Folder(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='children',
        db_index=True
    )
    google_folder_id = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_folders',
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=50, 
        choices=[
            ('Active', 'Active'),
            ('Signed', 'Signed'),
            ('Pending Review', 'Pending Review'),
            ('Expired', 'Expired'),
            ('Archived', 'Archived'),
        ],
        default='Active',
        db_index=True
    )
    summary = models.TextField(blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)

    # Module Isolation Fields
    module_type = models.CharField(max_length=100, default='mou_repository', db_index=True)
    custom_page = models.ForeignKey(
        'users.CustomDynamicPage',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='module_folders',
        db_index=True
    )

    # Soft Delete / Recycle Bin Fields
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(blank=True, null=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_folders'
    )

    def __str__(self):
        return self.name

    def get_ancestors(self):
        """Returns a list of ancestor folders from root down to parent."""
        ancestors = []
        current = self.parent
        while current is not None:
            ancestors.insert(0, current)
            current = current.parent
        return ancestors

    def has_access(self, user):
        """
        Recursively checks folder access up the ancestral chain.
        1. Unauthenticated users have no access.
        2. Super Admin or Admin has full access by default.
        3. Creator of this folder / ancestor folder has full access.
        4. Check for explicit FolderPermission (grant/revoke).
        5. Check for dynamic MOU sharing access.
        6. Default fallback: False (restrictive default for standard users).
        """
        if not user or not user.is_authenticated:
            return False
            
        if user.role and user.role.name in ["Super Admin", "Admin"]:
            return True

        current = self


        while current is not None:
            # Creator of folder or ancestor folder always has full access
            if current.created_by == user:
                return True

            perm = FolderPermission.objects.filter(user=user, folder=current).first()
            if perm is not None:
                return perm.is_granted
            current = current.parent

        # Check MOU shares
        share_perm = get_mou_share_permission(user, self)
        if share_perm is not None:
            return True

        # Default fallback for authenticated users (restrictive default for standard users)
        return False

def choose_higher_permission(p1, p2):
    levels = {
        None: 0,
        'View Only': 1,
        'Upload Only': 2,
        'Edit': 3,
        'Full Access': 4
    }
    if levels.get(p1, 0) >= levels.get(p2, 0):
        return p1
    return p2

def get_mou_share_permission(user, folder):
    """
    Checks if there is an active MOUShare for this folder or its ancestors.
    Returns the permission level ('View Only', 'Upload Only', 'Edit', 'Full Access') or None.
    """
    if not user or not user.is_authenticated:
        return None

    if user.role and user.role.name == "Super Admin":
        return 'Full Access'

    try:
        from mous.models import MOUShare, MOU
        current_folder = folder
        best_permission = None

        while current_folder is not None:
            mous = MOU.objects.filter(department=current_folder)
            for m in mous:
                shares = MOUShare.objects.filter(mou=m)
                
                # Check department shares
                if user.department:
                    dept_shares = shares.filter(department__name=user.department)
                    for ds in dept_shares:
                        best_permission = choose_higher_permission(best_permission, ds.permission)

                # Check individual shares
                user_shares = shares.filter(user=user)
                for us in user_shares:
                    best_permission = choose_higher_permission(best_permission, us.permission)
            
            current_folder = current_folder.parent
        
        return best_permission
    except Exception:
        return None


class FolderPermission(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='folder_permissions'
    )
    folder = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        related_name='folder_permissions'
    )
    is_granted = models.BooleanField(default=True) # True = Granted, False = Revoked
    can_read = models.BooleanField(default=True)
    can_download = models.BooleanField(default=True)
    can_upload = models.BooleanField(default=False)
    can_delete_own_uploads = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'folder')

    def __str__(self):
        status = "Granted" if self.is_granted else "Revoked"
        return f"{self.user.email} - {self.folder.name} ({status})"


class FolderView(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='folder_views'
    )
    folder = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        related_name='views'
    )
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'folder')

    def __str__(self):
        return f"{self.user.email} viewed {self.folder.name}"


class RecycleBinSetting(models.Model):
    RETENTION_CHOICES = [
        ('7_days', '7 Days'),
        ('14_days', '14 Days'),
        ('30_days', '30 Days (1 Month)'),
        ('6_weeks', '6 Weeks'),
        ('3_months', '3 Months'),
        ('6_months', '6 Months'),
        ('1_year', '1 Year'),
        ('never', 'Never (Manual Purge Only)'),
    ]
    retention_period = models.CharField(max_length=50, choices=RETENTION_CHOICES, default='30_days')
    auto_delete_enabled = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recycle_bin_setting_updates'
    )

    class Meta:
        verbose_name = "Recycle Bin Setting"
        verbose_name_plural = "Recycle Bin Settings"

    def __str__(self):
        return f"Recycle Bin Retention: {self.get_retention_period_display()}"

    @classmethod
    def get_setting(cls):
        setting = cls.objects.first()
        if not setting:
            setting = cls.objects.create(retention_period='30_days', auto_delete_enabled=True)
        return setting

