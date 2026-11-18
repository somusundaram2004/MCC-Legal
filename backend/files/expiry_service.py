import logging
from django.utils import timezone
from django.contrib.auth import get_user_model
from notifications.models import Notification
from notifications.utils import create_notification
from files.models import File
from mous.models import MOUCategory, Department

logger = logging.getLogger(__name__)

MILESTONE_THRESHOLDS = [1, 7, 15, 30, 60, 90]

def resolve_department_name(file_or_folder):
    """
    Resolves the department name from file attribute or traverses folder ancestry.
    """
    if hasattr(file_or_folder, 'department') and file_or_folder.department:
        return file_or_folder.department
    folder = file_or_folder if hasattr(file_or_folder, 'get_ancestors') else getattr(file_or_folder, 'folder', None)
    if not folder:
        return 'General'
    ancestors = folder.get_ancestors()
    for anc in ancestors:
        if anc.parent_id is None or (anc.parent and anc.parent.name in ['MOU Repository', 'root']):
            return anc.name
    return ancestors[0].name if ancestors else folder.name

def get_file_recipients(file):
    """
    Resolves eligible recipients for file expiry notifications:
    1. Authorized document owner/uploader.
    2. Assigned Department Coordinator.
    3. Authorized Legal Administrators.
    Each candidate is strictly checked for current folder access.
    """
    User = get_user_model()
    candidates = set()

    # 1. Document uploader
    if file.uploaded_by and getattr(file.uploaded_by, 'is_active', True) and getattr(file.uploaded_by, 'status', 'Active') == 'Active':
        candidates.add(file.uploaded_by)

    # 2. Responsible Department Coordinator
    folder_chain = [file.folder] + (file.folder.get_ancestors() if file.folder else [])
    for f in folder_chain:
        if not f:
            continue
        # Check MOUCategory coordinator
        cat = MOUCategory.objects.filter(name__iexact=f.name).first()
        if cat and cat.coordinator_email:
            coord = User.objects.filter(email__iexact=cat.coordinator_email, status='Active').first()
            if coord:
                candidates.add(coord)

        # Check Department name match
        dept = Department.objects.filter(name__iexact=f.name).first()
        if dept:
            dept_coords = User.objects.filter(department__iexact=dept.name, status='Active')
            for dc in dept_coords:
                if dc.role and 'coordinator' in dc.role.name.lower():
                    candidates.add(dc)

        # Check users with explicit manage permission on department/folder
        from folders.models import FolderPermission
        manage_perms = FolderPermission.objects.filter(folder=f, is_granted=True, permission_level='manage').select_related('user')
        for mp in manage_perms:
            if mp.user and getattr(mp.user, 'status', 'Active') == 'Active':
                candidates.add(mp.user)

    # 3. Authorized Legal Administrators
    legal_admins = User.objects.filter(
        role__name__in=["Super Admin", "Admin", "Lawyer / MOU Administrator"],
        status='Active'
    )
    for la in legal_admins:
        candidates.add(la)

    # Filter strictly by CURRENT active folder access
    authorized_recipients = []
    for user in candidates:
        if file.folder and file.folder.has_access(user):
            authorized_recipients.append(user)

    return authorized_recipients

def check_file_expiries():
    """
    Checks all active (non-deleted) files with an expiry date.
    Generates milestone reminder notifications before expiry and on expiry,
    plus expired alerts once expired.
    Ensures safe idempotency so repeated runs do not duplicate notifications.
    """
    today = timezone.now().date()
    files = File.objects.filter(is_deleted=False, expiry_date__isnull=False).select_related('folder')

    created_notifications = []

    for file in files:
        if not file.expiry_date:
            continue

        days_remaining = (file.expiry_date - today).days
        status_info = file.get_expiry_status_info()
        dept_name = resolve_department_name(file)
        date_str = file.expiry_date.strftime('%d %B %Y')

        # Determine if current days_remaining hits any reminder milestone
        target_milestones = []

        if days_remaining < 0:
            target_milestones.append(('expired', 'Document Expired', f'"{file.name}" in folder "{file.folder.name}" has expired on {date_str}.'))
        elif days_remaining == 0:
            target_milestones.append((0, 'Document Expiring Today', f'"{file.name}" in folder "{file.folder.name}" expires today, on {date_str}.'))
        else:
            # Check milestone thresholds in ascending order to trigger the most immediate/urgent milestone
            for m in [1, 7, 15, 30, 60, 90]:
                if days_remaining <= m:
                    target_milestones.append((m, f'Document Expiring Soon ({m} Days Left)', f'"{file.name}" in folder "{file.folder.name}" expires in {days_remaining} days, on {date_str}.'))
                    break

        if not target_milestones:
            continue

        recipients = get_file_recipients(file)

        for milestone_val, title, message in target_milestones:
            milestone_tag = str(milestone_val)

            for recipient in recipients:
                # Prevent duplicate notification for same file, recipient, expiry date, and milestone
                already_notified = Notification.objects.filter(
                    user=recipient,
                    metadata__type='file_expiry_reminder',
                    metadata__file_id=file.id,
                    metadata__milestone=milestone_tag,
                    metadata__expiry_date=str(file.expiry_date)
                ).exists()

                if already_notified:
                    continue

                meta = {
                    'type': 'file_expiry_reminder',
                    'action': 'file_expiry',
                    'file_id': file.id,
                    'file_name': file.name,
                    'folder_id': file.folder_id,
                    'folder_name': file.folder.name if file.folder else '',
                    'department': dept_name,
                    'expiry_date': str(file.expiry_date),
                    'days_remaining': days_remaining,
                    'milestone': milestone_tag,
                    'status': status_info['status']
                }

                notif = create_notification(
                    user=recipient,
                    title=title,
                    description=message,
                    metadata=meta
                )
                if notif:
                    created_notifications.append(notif)
                    logger.info(f"Dispatched file expiry notification to {recipient.email} for '{file.name}' (milestone: {milestone_tag})")

    return created_notifications
