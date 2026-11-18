import hashlib
import logging
import mimetypes
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.db import transaction

from files.models import File
from folders.models import Folder
from mous.models import Stream, MOUCategory, Department, MOU
from services import drive_service

logger = logging.getLogger(__name__)

CLASSIFICATION_STATUSES = ('Ongoing', 'Expired', 'Others')
VALID_FOLDER_STATUSES = (
    'Active',
    'Signed',
    'Pending Review',
    'Expired',
    'Archived',
    'Ongoing',
    'Others',
)

CATEGORY_SUMMARIES = {
    'Ongoing': 'Active and ongoing MoU agreements (Green)',
    'Expired': 'Expired MoU agreements (Red)',
    'Others': 'Undated or supplementary MoU documents (Yellow)',
}

DEPARTMENT_CODES = {
    'Botany': 'BOT',
    'Commerce': 'COM',
    'History': 'HIS',
    'Mathematics': 'MATH',
    'Philosophy': 'PHIL',
    'Political Science': 'POL',
    'Public Administration': 'PUB',
    'Social Work': 'SW',
    'Zoology': 'ZOO',
    'Business Administration': 'BBA',
    'Business Administration & Tourism Studies': 'BBA-TS',
    'Chemistry': 'CHEM',
    'Computer Applications': 'BCA',
    'Computer Science': 'CS',
    'Microbiology': 'MCB',
    'Physics': 'PHY',
    'Psychology': 'PSY',
    'Tourism Studies': 'TS',
    'Visual Communication': 'VISCOM',
    "Centre for Women's Studies (CWS)": 'CWS',
    'Chaplaincy': 'CHAP',
    'College Union Society (CUS)': 'CUS',
    'Commerce (Stream Unspecified)': 'COM-GEN',
    'Department of Value Education': 'DVE',
    'Family Life Institute (FLI)': 'FLI',
    'Institutional & General': 'INST',
    'Joint Departments (Communication & English)': 'COMM-ENG',
    'Joint Departments (Zoology & Microbiology)': 'ZOO-MCB',
    'MCC Community College': 'MCCCC',
    'MCC-MRF Innovation Park (MMIP)': 'MMIP',
    'Miller Memorial Library': 'LIB',
    'Physics (Stream Unspecified)': 'PHY-GEN',
    'Pulicat Research Centre (MCC-PEBRC)': 'PEBRC',
    'School of Continuing Education (SCE)': 'SCE',
    'Social Work (Stream Unspecified)': 'SW-GEN',
}

STREAM_MAP = {
    'Aided': 'Aided',
    'SFS': 'Self-Financed (SFS)',
    'Self-Financed (SFS)': 'Self-Financed (SFS)',
    'Centres & General': 'Centres & General',
}


def _ensure_department_categories(records):
    """
    Ensure all unique (stream, department) combinations exist in MOUCategory and Department
    so that they display department-wise in the Department Directory tab.
    """
    unique_depts = set((r['stream'], r['department']) for r in records if r.get('department'))
    for stream_raw, dept_name in unique_depts:
        s_name = STREAM_MAP.get(stream_raw, stream_raw)
        stream_obj = Stream.objects.filter(name=s_name).first()
        if not stream_obj:
            stream_obj = Stream.objects.create(name=s_name, is_active=True)

        code = DEPARTMENT_CODES.get(dept_name) or re.sub(r'[^A-Z0-9]', '', dept_name.upper())[:6] or 'DEPT'
        MOUCategory.objects.get_or_create(
            name=dept_name,
            stream=stream_obj,
            defaults={
                'code': code,
                'color': '#3B82F6',
                'icon_type': 'school',
                'category_type': 'Department',
                'is_active': True,
            }
        )
        Department.objects.get_or_create(
            name=dept_name,
            stream=stream_obj,
            defaults={'is_active': True}
        )

_XLSX_NS = {
    'm': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}


def resolve_imported_folder_status(path_parts, requested_status=None, parent_folder=None):
    """
    Determine the status to assign to an imported folder.
    If requested_status is an explicit valid choice (e.g. 'Ongoing', 'Expired', 'Others'), use it.
    Otherwise ('auto' or empty), infer from folder path segments or inherit classification from parent.
    """
    req = (requested_status or '').strip()
    if req and req.lower() != 'auto' and req in VALID_FOLDER_STATUSES:
        return req

    for part in path_parts:
        clean = (part or '').strip().lower()
        if clean == 'ongoing':
            return 'Ongoing'
        if clean == 'expired':
            return 'Expired'
        if clean == 'others':
            return 'Others'

    if parent_folder and getattr(parent_folder, 'status', None) in CLASSIFICATION_STATUSES:
        return parent_folder.status

    return 'Active'


def parse_classification_excel(excel_path):
    """
    Parse the 'All Files' sheet of MoU_Classification_Summary_By_Department.xlsx
    using Python stdlib zipfile + ElementTree (supports inline strings and sharedStrings).
    """
    excel_file = Path(excel_path)
    if not excel_file.exists():
        raise FileNotFoundError(f"Excel workbook not found: {excel_file}")

    with zipfile.ZipFile(excel_file, 'r') as zf:
        wb_xml = ET.fromstring(zf.read('xl/workbook.xml'))
        rels_xml = ET.fromstring(zf.read('xl/_rels/workbook.xml.rels'))
        rel_map = {}
        for rel in rels_xml:
            target = rel.attrib.get('Target', '').lstrip('/')
            if not target.startswith('xl/'):
                target = f"xl/{target}"
            rel_map[rel.attrib['Id']] = target

        shared_strings = []
        if 'xl/sharedStrings.xml' in zf.namelist():
            sst = ET.fromstring(zf.read('xl/sharedStrings.xml'))
            for si in sst.findall('m:si', _XLSX_NS):
                shared_strings.append(
                    ''.join(t.text or '' for t in si.iter(f"{{{_XLSX_NS['m']}}}t"))
                )

        target_sheet = None
        for sheet in wb_xml.findall('.//m:sheet', _XLSX_NS):
            if sheet.attrib.get('name', '').strip().lower() == 'all files':
                rid = sheet.attrib[f"{{{_XLSX_NS['r']}}}id"]
                target_sheet = rel_map.get(rid)
                break

        if not target_sheet:
            raise ValueError("Sheet 'All Files' was not found in workbook.")

        ws_xml = ET.fromstring(zf.read(target_sheet))
        raw_rows = []
        for row_el in ws_xml.findall('.//m:sheetData/m:row', _XLSX_NS):
            row_dict = {}
            for cell_el in row_el.findall('m:c', _XLSX_NS):
                ref = cell_el.attrib.get('r', '')
                col = ''.join(ch for ch in ref if ch.isalpha())
                t_attr = cell_el.attrib.get('t', '')
                if t_attr == 'inlineStr':
                    val = ''.join(x.text or '' for x in cell_el.iter(f"{{{_XLSX_NS['m']}}}t"))
                elif t_attr == 's':
                    v_el = cell_el.find('m:v', _XLSX_NS)
                    idx = int(v_el.text) if v_el is not None and v_el.text else -1
                    val = shared_strings[idx] if 0 <= idx < len(shared_strings) else ''
                else:
                    v_el = cell_el.find('m:v', _XLSX_NS)
                    val = v_el.text if v_el is not None and v_el.text else ''
                row_dict[col] = (val or '').strip()
            if any(row_dict.values()):
                raw_rows.append(row_dict)

    if not raw_rows:
        return []

    headers = raw_rows[0]
    col_by_header = {v: k for k, v in headers.items() if v}

    def get_val(r, header_name, fallback_col):
        col = col_by_header.get(header_name, fallback_col)
        return (r.get(col, '') or '').strip()

    records = []
    for r in raw_rows[1:]:
        cat = get_val(r, 'Category', 'A')
        stream = get_val(r, 'Stream', 'B')
        dept = get_val(r, 'Department / Unit', 'C')
        fname = get_val(r, 'File Name', 'D')
        if not (cat and fname):
            continue
        records.append({
            'category': cat,
            'stream': stream or 'Centres & General',
            'department': dept or 'General',
            'file_name': fname,
            'original_path': get_val(r, 'Original Path', 'E'),
            'extension': get_val(r, 'Extension', 'F'),
            'date_reason': get_val(r, 'Date Classification Reason', 'G'),
            'dept_reason': get_val(r, 'Department Detection Reason', 'H'),
            'expiry_min': get_val(r, 'Expiry Min', 'I'),
            'expiry_max': get_val(r, 'Expiry Max', 'J'),
            'new_folder_path': get_val(r, 'New Folder Path', 'K'),
        })
    return records


def _parse_iso_date(value):
    val = (value or '').strip()
    if not val:
        return None
    try:
        return date.fromisoformat(val[:10])
    except ValueError:
        return None


def extract_dates_from_metadata(date_reason, expiry_min, expiry_max):
    """
    Extract (start_date, expiry_date) safely from Excel metadata.
    Prefers Expiry Max, falling back to Expiry Min. Extracts leading start YYYY-MM-DD when present.
    """
    expiry_date = _parse_iso_date(expiry_max) or _parse_iso_date(expiry_min)
    start_date = None
    reason_str = (date_reason or '').strip()
    m = re.match(r'^start\s+(\d{4}-\d{2}-\d{2})', reason_str)
    if m:
        start_date = _parse_iso_date(m.group(1))
    if start_date and expiry_date and expiry_date < start_date:
        start_date = None
    return start_date, expiry_date


def _sha256_bytes(data_bytes):
    h = hashlib.sha256()
    h.update(data_bytes)
    return h.hexdigest()


@dataclass
class ImportSummary:
    folders_created: int = 0
    folders_updated: int = 0
    folders_reused: int = 0
    files_created: int = 0
    files_updated: int = 0
    files_skipped: int = 0
    legacy_archived: int = 0
    drive_uploads: int = 0
    errors: list = field(default_factory=list)


def _resolve_owner_user(owner_email=None):
    User = get_user_model()
    if owner_email:
        u = User.objects.filter(email__iexact=owner_email).first()
        if u:
            return u
    return (
        User.objects.filter(role__name='Super Admin', is_active=True).order_by('id').first()
        or User.objects.filter(role__name='Admin', is_active=True).order_by('id').first()
        or User.objects.filter(is_superuser=True).order_by('id').first()
        or User.objects.order_by('id').first()
    )


def _ensure_streams():
    Stream.objects.get_or_create(name='Aided', defaults={'is_active': True})
    if not Stream.objects.filter(name__in=['Self-Financed (SFS)', 'SFS']).exists():
        Stream.objects.create(name='Self-Financed (SFS)', is_active=True)
    Stream.objects.get_or_create(name='Centres & General', defaults={'is_active': True})


def _resolve_target_root(target_root, owner_user, dry_run=False):
    if target_root == 'mou_repository':
        root = Folder.objects.filter(
            name='MOU Repository',
            module_type='mou_repository',
            custom_page=None,
            parent=None,
            is_deleted=False,
        ).first()
        if not root and not dry_run:
            root = Folder.objects.create(
                name='MOU Repository',
                module_type='mou_repository',
                custom_page=None,
                parent=None,
                created_by=owner_user,
                status='Active',
            )
        return root, 'mou_repository', None

    if target_root.startswith('custom_page:'):
        slug = target_root.split(':', 1)[1].strip()
        from users.models import CustomDynamicPage

        cp = CustomDynamicPage.objects.filter(slug__iexact=slug).first()
        if not cp:
            raise ValueError(f"CustomDynamicPage with slug '{slug}' was not found.")
        root = None
        if cp.root_folder_id:
            root = Folder.objects.filter(id=int(cp.root_folder_id), is_deleted=False).first()
        if not root:
            root = Folder.objects.filter(custom_page=cp, parent=None, is_deleted=False).first()
        if not root and not dry_run:
            root = Folder.objects.create(
                name=cp.title,
                module_type='custom_page',
                custom_page=cp,
                parent=None,
                created_by=owner_user,
                status='Active',
            )
            cp.root_folder_id = str(root.id)
            cp.save(update_fields=['root_folder_id'])
        return root, 'custom_page', cp

    raise ValueError(f"Unsupported --target-root value: {target_root}")


def import_classified_mous(
    source_dir=r'C:\Users\acer\Desktop\MoU',
    excel_path=r'C:\Users\acer\Desktop\MoU\MoU_Classification_Summary_By_Department.xlsx',
    target_root='mou_repository',
    storage_mode='local',
    archive_legacy=False,
    dry_run=False,
    update_existing=False,
    owner_email=None,
):
    """
    Idempotently import classified Ongoing/Expired/Others folders and MoU documents into MCC Legal.
    """
    source_root = Path(source_dir)
    if not source_root.exists():
        raise FileNotFoundError(f"Source directory not found: {source_root}")

    records = parse_classification_excel(excel_path)

    # Also capture any extra non-temp files inside Ongoing/Expired/Others on disk if missing from Excel
    seen_paths = {
        (r['category'], r['stream'], r['department'], r['file_name'])
        for r in records
    }
    for cat in CLASSIFICATION_STATUSES:
        cat_dir = source_root / cat
        if not cat_dir.exists():
            continue
        for root_str, _, files in os.walk(cat_dir):
            rel = Path(root_str).relative_to(source_root)
            parts = rel.parts
            if len(parts) < 3:
                continue
            stream_name = parts[1]
            dept_name = parts[2]
            for fn in files:
                if fn.startswith('~$') or fn.upper().endswith('.TMP') or fn.lower() == 'desktop.ini':
                    continue
                key = (cat, stream_name, dept_name, fn)
                if key not in seen_paths:
                    records.append({
                        'category': cat,
                        'stream': stream_name,
                        'department': dept_name,
                        'file_name': fn,
                        'original_path': '',
                        'extension': Path(fn).suffix.lower(),
                        'date_reason': '',
                        'dept_reason': 'Detected on disk tree',
                        'expiry_min': '',
                        'expiry_max': '',
                        'new_folder_path': str(rel),
                    })
                    seen_paths.add(key)

    summary = ImportSummary()
    owner_user = _resolve_owner_user(owner_email=owner_email)

    if not dry_run:
        _ensure_streams()
        _ensure_department_categories(records)

    root_folder, module_type, custom_page = _resolve_target_root(target_root, owner_user, dry_run=dry_run)

    if archive_legacy and root_folder and not dry_run:
        legacy_backup, _ = Folder.objects.get_or_create(
            name='Legacy Unsorted Backup',
            parent=root_folder,
            module_type=module_type,
            custom_page=custom_page,
            is_deleted=False,
            defaults={
                'created_by': owner_user,
                'status': 'Archived',
                'summary': 'Pre-classification legacy folders',
                'import_source': 'local',
            },
        )
        legacy_children = Folder.objects.filter(
            parent=root_folder,
            is_deleted=False,
        ).exclude(
            id=legacy_backup.id,
        ).exclude(
            name__in=CLASSIFICATION_STATUSES,
        )
        for child in legacy_children:
            child.parent = legacy_backup
            child.save(update_fields=['parent', 'updated_at'])
            summary.legacy_archived += 1

    # Cache created/resolved folders across tiers
    folder_cache = {}
    planned_folders = set()

    def ensure_folder(name, parent, status_val, folder_summary=''):
        if dry_run:
            parent_ref = ('dry', parent) if isinstance(parent, tuple) else ('db', parent.id if parent else None)
            dry_key = (parent_ref, name)
            if dry_key in folder_cache:
                return folder_cache[dry_key]

            existing = None
            if not isinstance(parent, tuple):
                existing = Folder.objects.filter(
                    name=name,
                    parent=parent,
                    module_type=module_type,
                    custom_page=custom_page,
                    is_deleted=False,
                ).first()

            if existing:
                if update_existing and existing.status != status_val:
                    summary.folders_updated += 1
                else:
                    summary.folders_reused += 1
                folder_cache[dry_key] = existing
                return existing

            summary.folders_created += 1
            placeholder = dry_key
            folder_cache[dry_key] = placeholder
            return placeholder

        key = (parent.id if parent else None, name)
        if key in folder_cache:
            return folder_cache[key]

        existing = Folder.objects.filter(
            name=name,
            parent=parent,
            module_type=module_type,
            custom_page=custom_page,
            is_deleted=False,
        ).first()

        if existing:
            changed_fields = []
            if (update_existing or existing.import_source == 'excel_classified') and existing.status != status_val:
                existing.status = status_val
                changed_fields.append('status')
            if folder_summary and existing.summary != folder_summary and (update_existing or not existing.summary):
                existing.summary = folder_summary
                changed_fields.append('summary')
            if existing.import_source != 'excel_classified':
                existing.import_source = 'excel_classified'
                changed_fields.append('import_source')
            if changed_fields:
                existing.save(update_fields=changed_fields + ['updated_at'])
                summary.folders_updated += 1
            else:
                summary.folders_reused += 1
            folder_obj = existing
        else:
            drive_folder_id = None
            if storage_mode == 'hybrid':
                try:
                    parent_drive_id = parent.google_folder_id if parent else None
                    drive_folder_id = drive_service.create_folder(name, parent_drive_id)
                except Exception as exc:
                    logger.warning("Drive folder creation fallback for '%s': %s", name, exc)
            folder_obj = Folder.objects.create(
                name=name,
                parent=parent,
                module_type=module_type,
                custom_page=custom_page,
                google_folder_id=drive_folder_id,
                created_by=owner_user,
                status=status_val,
                summary=folder_summary,
                import_source='excel_classified',
            )
            summary.folders_created += 1

        folder_cache[key] = folder_obj
        return folder_obj

    for rec in records:
        cat = rec['category']
        stream = rec['stream']
        dept = rec['department']
        fname = rec['file_name']

        if fname.startswith('~$') or fname.upper().endswith('.TMP'):
            summary.files_skipped += 1
            continue

        disk_path = None
        orig_rel = rec.get('original_path')
        if orig_rel:
            candidate = source_root / orig_rel
            if candidate.exists() and candidate.is_file():
                disk_path = candidate

        if not disk_path:
            rel_folder = rec.get('new_folder_path') or os.path.join(cat, stream, dept)
            candidate = source_root / rel_folder / fname
            if candidate.exists() and candidate.is_file():
                disk_path = candidate
            elif (source_root / cat / stream / dept / fname).exists():
                disk_path = source_root / cat / stream / dept / fname
            elif (source_root / fname).exists():
                disk_path = source_root / fname
            else:
                matches = list(source_root.rglob(fname))
                if matches and matches[0].is_file():
                    disk_path = matches[0]

        if not disk_path or not disk_path.exists():
            summary.errors.append(f"Missing file on disk: {fname} (original: {orig_rel})")
            continue

        cat_status = cat if cat in CLASSIFICATION_STATUSES else 'Active'
        start_dt, expiry_dt = extract_dates_from_metadata(
            rec['date_reason'], rec['expiry_min'], rec['expiry_max']
        )

        desc_parts = [f"Category: {cat} | Stream: {stream}"]
        if rec['date_reason']:
            desc_parts.append(f"Date rule: {rec['date_reason']}")
        if rec['dept_reason']:
            desc_parts.append(f"Dept match: {rec['dept_reason']}")
        if rec['original_path']:
            desc_parts.append(f"Source: {rec['original_path']}")
        description_text = '\n'.join(desc_parts)

        cat_folder = ensure_folder(cat, root_folder, cat_status, CATEGORY_SUMMARIES.get(cat, ''))
        stream_folder = ensure_folder(stream, cat_folder, cat_status, f"{cat} MoUs - {stream}")
        dept_folder = ensure_folder(dept, stream_folder, cat_status, f"{dept} ({stream}) - {cat}")

        if dry_run:
            # Estimate create/skip counts
            existing_file = None
            if not isinstance(dept_folder, tuple):
                existing_file = File.objects.filter(
                    name=fname, folder=dept_folder, is_deleted=False
                ).first()
            if existing_file:
                if update_existing:
                    summary.files_updated += 1
                else:
                    summary.files_skipped += 1
            else:
                summary.files_created += 1
            continue

        try:
            with open(disk_path, 'rb') as fp:
                file_bytes = fp.read()
            file_size = len(file_bytes)
            sha256 = _sha256_bytes(file_bytes)
            guessed_mime, _ = mimetypes.guess_type(fname)
            mime_type = guessed_mime or 'application/octet-stream'
            ext_label = Path(fname).suffix.lstrip('.').upper() or 'FILE'
            clean_title = Path(fname).stem.replace('_', ' ').strip()[:255]

            existing_file = File.objects.filter(
                name=fname,
                folder=dept_folder,
                is_deleted=False,
            ).first()

            if existing_file and not update_existing:
                summary.files_skipped += 1
                continue

            drive_id = None
            web_view_link = None
            web_content_link = None
            if storage_mode == 'hybrid':
                try:
                    drive_res = drive_service.upload_file(
                        file_content=file_bytes,
                        filename=fname,
                        mime_type=mime_type,
                        parent_id=dept_folder.google_folder_id,
                    ) or {}
                    candidate_id = drive_res.get('id')
                    if candidate_id and not str(candidate_id).startswith('drive_file_'):
                        drive_id = candidate_id
                        web_view_link = drive_res.get('webViewLink')
                        web_content_link = drive_res.get('webContentLink')
                        summary.drive_uploads += 1
                except Exception as exc:
                    logger.warning("Drive upload fallback for '%s': %s", fname, exc)

            with transaction.atomic():
                if existing_file:
                    existing_file.title = clean_title or existing_file.title
                    existing_file.description = description_text
                    existing_file.department = dept
                    existing_file.size = file_size
                    existing_file.file_size = file_size
                    existing_file.file_type = ext_label
                    existing_file.mime_type = mime_type
                    existing_file.is_signed = (cat == 'Ongoing')
                    existing_file.start_date = start_dt
                    existing_file.expiry_date = expiry_dt
                    existing_file.sha256_hash = sha256
                    existing_file.import_source = 'excel_classified'
                    existing_file.virus_scan_status = 'Clean'
                    if drive_id:
                        existing_file.google_file_id = drive_id
                        existing_file.web_view_link = web_view_link
                        existing_file.web_content_link = web_content_link
                    if not existing_file.file_field or not os.path.exists(existing_file.file_field.path):
                        existing_file.file_field.save(fname, ContentFile(file_bytes), save=False)
                    existing_file.save()
                    saved_file = existing_file
                    summary.files_updated += 1
                else:
                    file_obj = File(
                        name=fname,
                        title=clean_title or fname,
                        description=description_text,
                        department=dept,
                        size=file_size,
                        file_size=file_size,
                        file_type=ext_label,
                        mime_type=mime_type,
                        folder=dept_folder,
                        uploaded_by=owner_user,
                        is_signed=(cat == 'Ongoing'),
                        start_date=start_dt,
                        expiry_date=expiry_dt,
                        google_file_id=drive_id,
                        web_view_link=web_view_link,
                        web_content_link=web_content_link,
                        import_source='excel_classified',
                        sha256_hash=sha256,
                        virus_scan_status='Clean',
                    )
                    file_obj.file_field.save(fname, ContentFile(file_bytes), save=False)
                    file_obj.save()
                    saved_file = file_obj
                    summary.files_created += 1

                # Sync corresponding MOU record for Department tab stats and tracking
                try:
                    mou_status = 'Active' if cat == 'Ongoing' else ('Expired' if cat == 'Expired' else 'Draft')
                    doc_num = f"MOU-{cat[:3].upper()}-{saved_file.id:04d}-{sha256[:4].upper()}"

                    mou_obj = MOU.objects.filter(original_mou=saved_file).first()
                    if not mou_obj:
                        mou_obj = MOU.objects.filter(mou_number=doc_num).first()

                    if mou_obj:
                        mou_obj.title = clean_title or saved_file.name
                        mou_obj.department = dept_folder
                        mou_obj.department_name = dept
                        mou_obj.partner_organization = dept
                        mou_obj.effective_date = start_dt
                        mou_obj.signed_date = start_dt
                        mou_obj.expiry_date = expiry_dt
                        mou_obj.status = mou_status
                        mou_obj.save()
                    else:
                        MOU.objects.create(
                            title=clean_title or saved_file.name,
                            mou_number=doc_num,
                            original_mou=saved_file,
                            department=dept_folder,
                            department_name=dept,
                            partner_organization=dept,
                            created_by=owner_user,
                            effective_date=start_dt,
                            signed_date=start_dt,
                            expiry_date=expiry_dt,
                            status=mou_status,
                            summary=description_text,
                        )
                except Exception as mou_err:
                    logger.warning("MOU sync skipped for '%s': %s", fname, mou_err)
        except Exception as exc:
            logger.exception("Failed importing file '%s': %s", disk_path, exc)
            summary.errors.append(f"{disk_path}: {exc}")

    return summary
