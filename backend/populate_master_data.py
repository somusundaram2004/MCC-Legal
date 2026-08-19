import os
import django
import re

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from mous.models import (
    Stream, DepartmentCategory, Department, MOUCategory,
    TemplateCategory, OrganizationType, CollaborationType, DocumentType, Tag
)

def generate_code(name, category_name, stream_name):
    clean = re.sub(r'[^a-zA-Z0-9\s]', '', name)
    words = clean.split()
    if len(words) == 1:
        code = words[0][:5].upper()
    elif len(words) <= 3:
        code = ''.join([w[0].upper() for w in words])
    else:
        code = ''.join([w[0].upper() for w in words[:4]])
    
    prefix = ""
    if "Aided" in stream_name:
        prefix = "A-"
    elif "Self-Financed" in stream_name or "SFS" in stream_name:
        prefix = "S-"
    elif "Admin" in stream_name:
        prefix = "ADM-"

    if category_name in ["UG", "PG", "Ph.D."]:
        cat_prefix = category_name.replace(".", "") + "-"
    else:
        cat_prefix = ""

    return f"{prefix}{cat_prefix}{code}"

def get_icon_and_color(name, stream_name, category_name):
    name_lower = name.lower()
    if "admin" in stream_name.lower() or "office" in name_lower or "cell" in name_lower or "deans" in name_lower:
        return 'gavel', '#64748B'
    if "science" in name_lower or "physics" in name_lower or "chemistry" in name_lower or "biology" in name_lower or "zoology" in name_lower or "microbiology" in name_lower or "botany" in name_lower or "math" in name_lower:
        return 'science', '#14B8A6'
    if "commerce" in name_lower or "accounting" in name_lower or "business" in name_lower or "finance" in name_lower:
        return 'business', '#F59E0B'
    if "medical" in name_lower or "psychiatry" in name_lower or "health" in name_lower:
        return 'hospital', '#EC4899'
    if "visual" in name_lower or "communication" in name_lower or "journalism" in name_lower:
        return 'palette', '#8B5CF6'
    return 'school', '#3B82F6'

def populate():
    print("=== Starting Master Data Seeding with Exact Explicit IDs ===")

    # 1. Streams
    aided_stream, _ = Stream.objects.get_or_create(name="Aided", defaults={"description": "Aided Stream Programs"})
    sfs_stream, _ = Stream.objects.get_or_create(name="Self-Financed (SFS)", defaults={"description": "Self-Financed Stream Programs"})
    admin_stream, _ = Stream.objects.get_or_create(name="Administrative", defaults={"description": "Administrative & Institutional Units"})

    Stream.objects.filter(name__iexact="sfs").exclude(id=sfs_stream.id).delete()

    # 2. Department Categories
    ug_cat, _ = DepartmentCategory.objects.get_or_create(name="UG", defaults={"is_active": True})
    pg_cat, _ = DepartmentCategory.objects.get_or_create(name="PG", defaults={"is_active": True})
    phd_cat, _ = DepartmentCategory.objects.get_or_create(name="Ph.D.", defaults={"is_active": True})
    admin_cat, _ = DepartmentCategory.objects.get_or_create(name="Administrative / Institutional Units", defaults={"is_active": True})

    DepartmentCategory.objects.filter(name="College Department").delete()

    # Data matrix for Departments
    master_structure = [
        # AIDED - UG
        (aided_stream, ug_cat, [
            "B.A. English Language and Literature",
            "B.A. Tamil Literature",
            "B.A. History",
            "B.A. Political Science",
            "B.A. Economics",
            "B.A. Philosophy",
            "B.Com. – Commerce",
            "B.Sc. Mathematics",
            "B.Sc. Statistics",
            "B.Sc. Physics",
            "B.Sc. Chemistry",
            "B.Sc. Plant Biology and Plant Biotechnology",
            "B.Sc. Zoology",
        ]),
        # AIDED - PG
        (aided_stream, pg_cat, [
            "M.A. English Language and Literature",
            "M.A. Tamil Literature",
            "M.A. History",
            "M.A. Political Science",
            "M.A. Public Administration",
            "M.A. Economics",
            "M.A. Philosophy",
            "M.Com. – Commerce",
            "M.S.W. – Social Work (Community Development & Medical Psychiatry)",
            "M.Sc. Mathematics",
            "M.Sc. Statistics",
            "M.Sc. Physics",
            "M.Sc. Chemistry",
            "M.Sc. Plant Biology and Plant Biotechnology",
            "M.Sc. Zoology",
        ]),
        # AIDED - Ph.D.
        (aided_stream, phd_cat, [
            "English",
            "Tamil",
            "History",
            "Political Science",
            "Public Administration",
            "Economics",
            "Philosophy",
            "Commerce",
            "Mathematics",
            "Statistics",
            "Physics",
            "Chemistry",
            "Botany",
            "Zoology",
            "Telugu — Part-Time",
            "Social Work — Part-Time",
        ]),
        # SFS - UG
        (sfs_stream, ug_cat, [
            "B.A. English Language and Literature",
            "B.A. Journalism",
            "B.A. History – Vocational (Archaeology and Museology)",
            "B.S.W. – Social Work",
            "B.Com. – Commerce",
            "B.Com. Accounting and Finance",
            "B.Com. Professional Accounting",
            "B.B.A. – Business Administration",
            "B.Sc. Geography, Tourism and Travel Management",
            "B.Sc. Hospitality and Tourism",
            "B.Sc. Mathematics",
            "B.Sc. Physics",
            "B.Sc. Microbiology",
            "B.C.A. – Computer Applications",
            "B.Sc. Computer Science",
            "B.Sc. Visual Communication",
            "B.Sc. Physical Education, Health Education and Sports",
            "B.Sc. Psychology",
        ]),
        # SFS - PG
        (sfs_stream, pg_cat, [
            "M.S.W. – Social Work (Human Resource Management)",
            "M.Com. – Computer-Oriented Business Applications",
            "M.A. Communication",
            "M.Sc. Chemistry",
            "M.Sc. Applied Microbiology",
            "M.C.A. – Computer Application",
            "M.Sc. Data Science",
        ]),
        # SFS - Ph.D.
        (sfs_stream, phd_cat, [
            "Microbiology",
            "Commerce — Part-Time",
            "Social Work — Part-Time",
        ]),
        # ADMINISTRATIVE / INSTITUTIONAL UNITS
        (admin_stream, admin_cat, [
            "Principal's Office",
            "Bursar's Office",
            "Registrar's Office",
            "Deans",
            "Controller of Examinations",
            "Self-Financed Stream Office",
            "Quality Assurance / IQAC",
            "Admissions Office",
            "Academic Office",
            "Finance & Accounts",
            "Human Resources / Establishment",
            "Legal Cell",
            "Research & Development",
            "International Relations",
            "Placement & Career Guidance",
            "Student Affairs",
            "Library",
            "IT / Computer Centre",
            "Purchase & Procurement",
            "Estate & Maintenance",
            "Hostel Administration",
            "Transport",
            "Security",
            "Public Relations / Communications",
            "Alumni Office",
        ])
    ]

    dept_count = 0
    mou_cat_count = 0

    for stream_obj, cat_obj, items in master_structure:
        for item_name in items:
            dept, _ = Department.objects.get_or_create(
                name=item_name,
                stream=stream_obj,
                category=cat_obj,
                defaults={"is_active": True}
            )
            dept.is_active = True
            dept.save()
            dept_count += 1

            code = generate_code(item_name, cat_obj.name, stream_obj.name)
            icon, color = get_icon_and_color(item_name, stream_obj.name, cat_obj.name)
            
            mou_cat, _ = MOUCategory.objects.get_or_create(
                name=item_name,
                stream=stream_obj,
                defaults={
                    "code": code,
                    "color": color,
                    "icon_type": icon,
                    "category_type": "Department",
                    "is_active": True
                }
            )
            mou_cat.code = code
            mou_cat.color = color
            mou_cat.icon_type = icon
            mou_cat.is_active = True
            mou_cat.save()
            mou_cat_count += 1

    # 3. Template Categories (IDs 1 - 18)
    template_categories = [
        "MOU",
        "MOA – Memorandum of Agreement",
        "Agreement",
        "Contract",
        "NDA – Non-Disclosure Agreement",
        "Service Agreement",
        "Consultancy Agreement",
        "Vendor Agreement",
        "Internship Agreement",
        "Collaboration Agreement",
        "Affiliation Agreement",
        "Lease / Rental Agreement",
        "Employment Agreement",
        "Amendment / Addendum",
        "Renewal Agreement",
        "Undertaking / Declaration",
        "Legal Notice",
        "Authorization / Power of Attorney",
    ]
    TemplateCategory.objects.all().delete()
    for idx, tc in enumerate(template_categories, start=1):
        TemplateCategory.objects.create(id=idx, name=tc, is_active=True)

    # 4. Organization Types (IDs 1 - 20)
    organization_types = [
        "University",
        "College / Higher Educational Institution",
        "School",
        "Government Organization",
        "Government Agency",
        "Corporate / Company",
        "Industry",
        "Bank / Financial Institution",
        "NGO / Non-Profit Organization",
        "Research Institution",
        "Research Laboratory",
        "Hospital / Healthcare Institution",
        "Professional Organization",
        "International Organization",
        "Training / Skill Development Institution",
        "Legal / Law Firm",
        "Community-Based Organization",
        "Government Department",
        "Trust / Foundation",
        "Other",
    ]
    OrganizationType.objects.all().delete()
    for idx, ot in enumerate(organization_types, start=1):
        OrganizationType.objects.create(id=idx, name=ot, is_active=True)

    # 5. Collaboration Types (IDs 1 - 21)
    collaboration_types = [
        "Academic Collaboration",
        "Research Collaboration",
        "Industry Collaboration",
        "International Collaboration",
        "Student Exchange",
        "Faculty Exchange",
        "Staff Exchange",
        "Internship & Placement",
        "Training & Skill Development",
        "Joint Research",
        "Joint Programme",
        "Knowledge Sharing",
        "Conference / Seminar Collaboration",
        "Consultancy Collaboration",
        "Community Outreach",
        "Institutional Partnership",
        "Administrative Cooperation",
        "Technology / Innovation Collaboration",
        "Entrepreneurship / Startup Collaboration",
        "Cultural Collaboration",
        "Other",
    ]
    CollaborationType.objects.all().delete()
    for idx, ct in enumerate(collaboration_types, start=1):
        CollaborationType.objects.create(id=idx, name=ct, is_active=True)

    # 6. Document Types (IDs 1 - 35)
    document_types = [
        "MOU",
        "MOA – Memorandum of Agreement",
        "Agreement",
        "Contract",
        "NDA / Confidentiality Agreement",
        "Service Agreement",
        "Consultancy Agreement",
        "Vendor Agreement",
        "Internship Agreement",
        "Affiliation Agreement",
        "Lease / Rental Agreement",
        "Employment Agreement",
        "Amendment / Addendum",
        "Renewal Agreement",
        "Legal Notice",
        "Reply to Legal Notice",
        "Court Notice / Summons",
        "Petition / Application",
        "Plaint",
        "Written Statement",
        "Counter Affidavit",
        "Affidavit",
        "Memorandum of Appeal",
        "Court Order",
        "Court Judgment",
        "Case Documents",
        "Case Correspondence",
        "Legal Opinion",
        "Legal Advice",
        "Undertaking / Declaration",
        "Power of Attorney / Authorization",
        "Compliance Document",
        "Policy / Regulation",
        "Government Order / Notification",
        "Other Legal Document",
    ]
    DocumentType.objects.all().delete()
    for idx, dt in enumerate(document_types, start=1):
        DocumentType.objects.create(id=idx, name=dt, is_active=True)

    # 7. Tags (IDs 1 - 36)
    tags = [
        "MOU",
        "MOA",
        "Agreement",
        "Contract",
        "Collaboration",
        "Academic",
        "Research",
        "International",
        "Industry",
        "Government",
        "Student",
        "Faculty",
        "Internship",
        "Placement",
        "Training",
        "Consultancy",
        "Vendor",
        "Finance",
        "HR",
        "Property",
        "Confidential",
        "Compliance",
        "Renewal",
        "Amendment",
        "Expiring Soon",
        "Litigation",
        "Court Matter",
        "Legal Notice",
        "Urgent",
        "High Priority",
        "Pending Review",
        "Pending Signature",
        "Signed",
        "Active Agreement",
        "Expired",
        "Terminated",
    ]
    Tag.objects.all().delete()
    for idx, t in enumerate(tags, start=1):
        Tag.objects.create(id=idx, name=t, is_active=True)

    print(f"Successfully seeded:")
    print(f" - {dept_count} Departments")
    print(f" - {mou_cat_count} MOU Categories")
    print(f" - {TemplateCategory.objects.count()} Template Categories (IDs: {list(TemplateCategory.objects.values_list('id', flat=True))})")
    print(f" - {OrganizationType.objects.count()} Organization Types (IDs: {list(OrganizationType.objects.values_list('id', flat=True))})")
    print(f" - {CollaborationType.objects.count()} Collaboration Types (IDs: {list(CollaborationType.objects.values_list('id', flat=True))})")
    print(f" - {DocumentType.objects.count()} Document Types (IDs: {list(DocumentType.objects.values_list('id', flat=True))})")
    print(f" - {Tag.objects.count()} Tags (IDs: {list(Tag.objects.values_list('id', flat=True))})")

if __name__ == "__main__":
    populate()
