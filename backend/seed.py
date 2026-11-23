import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from roles.models import Role, RolePermission
from permissions.models import Permission

User = get_user_model()

def seed_data():
    print("Starting minimal Super Admin seeding...")
    # NOTE: All Master Data (Streams, Template Categories, Organization Types,
    # Collaboration Types, Document Types, Tags, Department Categories, Departments)
    # are managed dynamically via Master Data Management and are excluded from seed.py.


    # 1. Essential System Permissions
    permissions_list = [
        ("View Folder", "view_folder", "Can view folders in explorer"),
        ("Create Folder", "create_folder", "Can create folders in explorer"),
        ("Rename Folder", "rename_folder", "Can rename folders"),
        ("Delete Folder", "delete_folder", "Can delete folders"),
        ("Create Nested Folder", "create_nested_folder", "Can create subfolders inside folders"),
        ("Upload Files", "upload_files", "Can upload files"),
        ("Download Files", "download_files", "Can download files"),
        ("Delete Files", "delete_files", "Can delete files"),
        ("Replace Files", "replace_files", "Can replace files"),
        ("Preview Files", "preview_files", "Can preview files inline"),
        ("View Notifications", "view_notifications", "Can view system notifications"),
        ("View Dashboard", "view_dashboard", "Can view system dashboard stats"),
        ("Manage Users", "manage_users", "Can view users lists and details"),
        ("Create Users", "create_users", "Can create new users"),
        ("Edit Users", "edit_users", "Can update user details, roles, permissions"),
        ("Delete Users", "delete_users", "Can delete users"),
    ]

    db_permissions = {}
    for name, codename, desc in permissions_list:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": name, "description": desc}
        )
        db_permissions[codename] = perm

    # 2. Roles
    super_admin_role, _ = Role.objects.get_or_create(
        name="Super Admin",
        defaults={"description": "Super Administrator with full system control"}
    )
    admin_role, _ = Role.objects.get_or_create(
        name="Admin",
        defaults={"description": "Administrator"}
    )
    user_role, _ = Role.objects.get_or_create(
        name="User",
        defaults={"description": "Standard User"}
    )

    # 3. Associate permissions to roles
    # Super Admin gets all permissions
    RolePermission.objects.filter(role=super_admin_role).delete()
    for perm in db_permissions.values():
        RolePermission.objects.get_or_create(role=super_admin_role, permission=perm)

    # Admin gets department management permissions (no user management / system admin)
    RolePermission.objects.filter(role=admin_role).delete()
    admin_permissions = [
        "view_folder",
        "create_folder",
        "rename_folder",
        "delete_folder",
        "create_nested_folder",
        "upload_files",
        "download_files",
        "delete_files",
        "replace_files",
        "preview_files",
        "view_notifications",
        "view_dashboard"
    ]
    for codename in admin_permissions:
        if codename in db_permissions:
            RolePermission.objects.get_or_create(role=admin_role, permission=db_permissions[codename])

    # User gets specific default permissions
    RolePermission.objects.filter(role=user_role).delete()
    user_permissions = [
        "view_folder",
        "upload_files",
        "download_files",
        "preview_files",
        "view_notifications",
        "view_dashboard"
    ]
    for codename in user_permissions:
        if codename in db_permissions:
            RolePermission.objects.get_or_create(role=user_role, permission=db_permissions[codename])

    # 4. Demo Accounts for all three roles
    demo_accounts = [
        {
            "email": "superadmin@college.edu",
            "password": "AdminPass123!",
            "name": "Super Admin",
            "role": super_admin_role,
            "designation": "Super Administrator",
            "department": "Principal Office",
            "is_staff": True,
            "is_superuser": True
        },
        {
            "email": "admin@college.edu",
            "password": "AdminPass123!",
            "name": "Department Admin",
            "role": admin_role,
            "designation": "Department Administrator",
            "department": "Academic Office",
            "is_staff": False,
            "is_superuser": False
        },
        {
            "email": "user@college.edu",
            "password": "UserPass123!",
            "name": "Faculty User",
            "role": user_role,
            "designation": "Assistant Professor",
            "department": "Academic Office",
            "is_staff": False,
            "is_superuser": False
        }
    ]

    for acc in demo_accounts:
        user_obj = User.objects.filter(email=acc["email"]).first()
        if not user_obj:
            User.objects.create_user(
                email=acc["email"],
                password=acc["password"],
                name=acc["name"],
                role=acc["role"],
                designation=acc["designation"],
                department=acc["department"],
                is_staff=acc["is_staff"],
                is_superuser=acc["is_superuser"],
                status="Active"
            )
            print(f"Created {acc['role'].name} account: {acc['email']}")
        else:
            user_obj.set_password(acc["password"])
            user_obj.role = acc["role"]
            user_obj.name = acc["name"]
            user_obj.designation = acc["designation"]
            user_obj.department = acc["department"]
            user_obj.is_staff = acc["is_staff"]
            user_obj.is_superuser = acc["is_superuser"]
            user_obj.status = "Active"
            user_obj.save()
            print(f"Updated {acc['role'].name} account: {acc['email']}")

    print("Demo accounts seeding completed successfully.")

if __name__ == "__main__":
    seed_data()
