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
    print("Starting data seeding...")

    # Seeding Master Data Tables
    from mous.models import (
        TemplateCategory, OrganizationType, CollaborationType, DocumentType, Tag,
        DepartmentCategory, Department, MOUCategory
    )

    # 1. Seed Template Categories
    template_categories = [
        "Industry", "Research", "Academic", "International", "Placement", 
        "Internship", "Government", "NGO", "Consultancy", "Exchange Programme", 
        "MoA", "MoU"
    ]
    for name in template_categories:
        TemplateCategory.objects.get_or_create(name=name)

    # 2. Seed Organization Types
    org_types = [
        "IT Company", "University", "Government", "Private Company", "NGO", 
        "Research Institute", "Startup", "Industry", "Hospital", "School", "College"
    ]
    for name in org_types:
        OrganizationType.objects.get_or_create(name=name)

    # 3. Seed Collaboration Types
    collab_types = [
        "Internship", "Placement", "Research", "Training", "Faculty Exchange", 
        "Student Exchange", "Sponsored Project", "Consultancy", "Skill Development", 
        "Joint Research", "Industrial Visit", "Laboratory Sharing", "Other"
    ]
    for name in collab_types:
        CollaborationType.objects.get_or_create(name=name)

    # 4. Seed Document Types
    doc_types = [
        "Main MOU", "Annexure", "Addendum", "Renewal", "Legal Copy", "Draft", "Final Copy"
    ]
    for name in doc_types:
        DocumentType.objects.get_or_create(name=name)

    # 5. Seed Tags
    tags_list = ["Urgent", "Draft", "Approved", "Standard", "International"]
    for name in tags_list:
        Tag.objects.get_or_create(name=name)

    # 6. Seed Department Categories and Departments
    dept_categories = {
        "Aided": [
            "English", "Tamil", "Languages", "History", "Political Science", 
            "Public Administration", "Economics", "Philosophy", "Commerce", 
            "Social Work", "Mathematics", "Statistics", "Physics", "Chemistry", 
            "Botany", "Zoology", "Physical Education"
        ],
        "Self-Financed (SFS)": [
            "English", "Tamil", "Languages", "Journalism", "Social Work", 
            "Commerce", "Business Administration (BBA)", "Communication", 
            "Geography", "Tourism Studies", "Mathematics", "Physics", "Chemistry", 
            "Microbiology", "Computer Application (BCA)", "Computer Science", 
            "Master of Computer Applications (MCA)", "Visual Communication", 
            "Psychology", "Data Science"
        ],
        "Other / Administrative Units": [
            "Principal Office", "Administration Office", "Controller of Examinations", 
            "IQAC", "Library", "Placement Cell", "Research Centre", 
            "Institute for Advanced Christian Studies", 
            "Institute for Administrative Service Coaching", 
            "Centre for Women's Studies", "Centre for Peace Studies", 
            "Entrepreneurship Development Cell", "Institution Innovation Council (IIC)", 
            "Self-Financed Stream Office"
        ]
    }

    for cat_name, depts in dept_categories.items():
        cat, _ = DepartmentCategory.objects.get_or_create(name=cat_name)
        for dname in depts:
            # We save aided/sfs with suffix, administrative units plain
            if cat_name == "Aided":
                full_name = f"{dname} (Aided)"
            elif cat_name == "Self-Financed (SFS)":
                full_name = f"{dname} (SFS)"
            else:
                full_name = dname
            Department.objects.get_or_create(name=full_name, category=cat)

    # 6.5. Seed default MOU Categories
    default_cats = [
        { "name": 'Engineering & CSE', "code": 'ENG', "color": '#3B82F6', "icon_type": 'school', "coordinator_name": 'Dr. Robert Smith', "coordinator_email": 'eng.mou@college.edu', "category_type": 'Department' },
        { "name": 'Medical & Health Sciences', "code": 'MED', "color": '#14B8A6', "icon_type": 'hospital', "coordinator_name": 'Dr. Elena Vance', "coordinator_email": 'med.mou@college.edu', "category_type": 'Department' },
        { "name": 'Commerce & Business Studies', "code": 'COM', "color": '#F59E0B', "icon_type": 'business', "coordinator_name": 'Prof. Marcus Vance', "coordinator_email": 'com.mou@college.edu', "category_type": 'Department' },
        { "name": 'Arts & Humanities', "code": 'ART', "color": '#EC4899', "icon_type": 'palette', "coordinator_name": 'Dr. Clara Oswald', "coordinator_email": 'arts.mou@college.edu', "category_type": 'Department' },
        { "name": 'Science & Technology', "code": 'SCI', "color": '#8B5CF6', "icon_type": 'science', "coordinator_name": 'Dr. Alan Grant', "coordinator_email": 'sci.mou@college.edu', "category_type": 'Department' },
        { "name": 'School of Law & Policy', "code": 'LAW', "color": '#F97316', "icon_type": 'gavel', "coordinator_name": 'Prof. Harvey Specter', "coordinator_email": 'law.mou@college.edu', "category_type": 'Department' },
    ]
    for cat in default_cats:
        MOUCategory.objects.get_or_create(
            name=cat["name"],
            defaults=cat
        )

    # 1. Define Permissions
    permissions_list = [
        # Folders
        ("View Folder", "view_folder", "Can view folders in explorer"),
        ("Create Folder", "create_folder", "Can create folders in explorer"),
        ("Rename Folder", "rename_folder", "Can rename folders"),
        ("Delete Folder", "delete_folder", "Can delete folders"),
        ("Create Nested Folder", "create_nested_folder", "Can create subfolders inside folders"),
        # Files
        ("Upload Files", "upload_files", "Can upload files"),
        ("Download Files", "download_files", "Can download files"),
        ("Delete Files", "delete_files", "Can delete files"),
        ("Replace Files", "replace_files", "Can replace files (create new versions)"),
        ("Preview Files", "preview_files", "Can preview files inline"),
        # In-App System
        ("View Notifications", "view_notifications", "Can view system notifications"),
        ("View Dashboard", "view_dashboard", "Can view system dashboard stats"),
        # User Admin
        ("Manage Users", "manage_users", "Can view users lists and details"),
        ("Create Users", "create_users", "Can create new users"),
        ("Edit Users", "edit_users", "Can update user details, roles, permissions"),
        ("Delete Users", "delete_users", "Can delete users"),
    ]

    db_permissions = {}
    for name, codename, desc in permissions_list:
        perm, created = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": name, "description": desc}
        )
        db_permissions[codename] = perm
        if created:
            print(f"Created permission: {codename}")

    # 2. Define Roles
    roles_list = [
        ("Super Admin", "Super Administrator with full system control"),
        ("Admin", "Administrator who can manage files, folders, and users"),
        ("User", "Standard user who can read, preview, upload, and download files in assigned folders"),
    ]

    db_roles = {}
    for name, desc in roles_list:
        role, created = Role.objects.get_or_create(
            name=name,
            defaults={"description": desc}
        )
        db_roles[name] = role
        if created:
            print(f"Created role: {name}")

    # 3. Associate Permissions to Roles
    # Super Admin: In code they bypass check, but let's associate all just in case
    for perm in db_permissions.values():
        RolePermission.objects.get_or_create(role=db_roles["Super Admin"], permission=perm)

    # Admin: gets all permissions
    for perm in db_permissions.values():
        RolePermission.objects.get_or_create(role=db_roles["Admin"], permission=perm)

    # User: gets limited permissions
    user_perms_codenames = [
        "view_folder", "upload_files", "download_files", 
        "preview_files", "view_notifications", "view_dashboard"
    ]
    for code in user_perms_codenames:
        RolePermission.objects.get_or_create(role=db_roles["User"], permission=db_permissions[code])

    print("Role permissions mapped successfully.")

    # 4. Create default users for testing
    users_data = [
        ("superadmin@college.edu", "Super Admin", "superadmin@college.edu", "AdminPass123!", "Super Admin", "Super Admin", "Principal Office"),
        ("admin@college.edu", "System Admin", "admin@college.edu", "AdminPass123!", "Admin", "MOU Administrator", "Principal Office"),
        ("user@college.edu", "John Doe", "user@college.edu", "UserPass123!", "User", "MOU Analyst", "Principal Office"),
    ]

    for email, name, username, password, role_name, designation, department in users_data:
        if not User.objects.filter(email=email).exists():
            role = db_roles[role_name]
            
            # Superuser flag for Django Admin integration
            is_staff = (role_name in ["Super Admin", "Admin"])
            is_superuser = (role_name == "Super Admin")

            user = User.objects.create_user(
                email=email,
                password=password,
                name=name,
                role=role,
                designation=designation,
                department=department,
                is_staff=is_staff,
                is_superuser=is_superuser,
                status="Active"
            )
            print(f"Created user account: {email} with role: {role_name}")
        else:
            print(f"User account '{email}' already exists.")

    # 5. Seed MOU Templates & Sample MOUs
    from mous.models import MOUTemplate, MOU
    from datetime import date, timedelta

    templates = [
        ("Internship", "MOU template for student industrial internship & practical training programs", [
            {"name": "duration", "label": "Duration (Months)", "type": "number"},
            {"name": "students_count", "label": "Eligible Students", "type": "number"},
            {"name": "stipend", "label": "Monthly Stipend", "type": "text"},
        ]),
        ("Placement", "Template for campus recruitment and placement partnerships", [
            {"name": "eligible_depts", "label": "Eligible Departments", "type": "text"},
            {"name": "package", "label": "Expected CTC Package", "type": "text"},
            {"name": "selection_process", "label": "Selection Process", "type": "text"},
        ]),
        ("Research", "Joint research collaboration, funding, & IP agreements", [
            {"name": "funding", "label": "Funding Amount ($)", "type": "text"},
            {"name": "research_area", "label": "Research Domain", "type": "text"},
            {"name": "principal_investigator", "label": "Principal Investigator", "type": "text"},
        ]),
        ("Industry Collaboration", "General industry-academia partnership for workshops and labs", [
            {"name": "lab_setup", "label": "Co-Branded Lab Setup", "type": "text"},
            {"name": "mentor", "label": "Industry Mentor", "type": "text"},
        ]),
    ]

    tmpl_objs = {}
    for tname, tdesc, tfields in templates:
        tmpl, created = MOUTemplate.objects.get_or_create(
            name=tname,
            defaults={"description": tdesc, "fields_schema": tfields, "template_notes": f"Standard {tname} template notes for coordinators."}
        )
        tmpl_objs[tname] = tmpl

    print("Seeding completed successfully.")

if __name__ == "__main__":
    seed_data()

