import os
import io
import zipfile
import shutil
import tempfile
import logging
from datetime import datetime

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.http import HttpResponse, FileResponse
from django.db import transaction
from django.utils import timezone

from folders.models import Folder
from files.models import File
from users.models import CustomDynamicPage
from services import drive_service

logger = logging.getLogger(__name__)

def sanitize_filename(filename):
    """Clean filename to prevent path traversal attack."""
    filename = os.path.basename(filename)
    filename = filename.replace("..", "").replace("/", "").replace("\\", "").strip()
    return filename or "imported_file"

def get_module_destinations():
    """Returns all active module destinations for Import."""
    modules = [
        {
            'id': 'mou_repository',
            'name': 'MOU Repository',
            'type': 'system',
            'drive_id': drive_service.get_or_create_mou_repository_folder_id()
        }
    ]
    custom_pages = CustomDynamicPage.objects.filter(is_published=True, is_enabled=True)
    for cp in custom_pages:
        drive_id = drive_service.get_or_create_module_folder_id(cp)
        modules.append({
            'id': f"custom_{cp.id}",
            'real_id': cp.id,
            'name': cp.title,
            'type': 'custom_page',
            'drive_id': drive_id
        })
    return modules


class ImportExportTreeView(APIView):
    """
    Returns the hierarchy tree of modules, folders, and files for Export selection & Import destination choosing.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        tree = []

        # 1. MOU Repository Module
        mou_folders = Folder.objects.filter(
            module_type='mou_repository', parent__isnull=True, is_deleted=False
        )
        
        def build_folder_tree(folder):
            sub_folders = Folder.objects.filter(parent=folder, is_deleted=False)
            files = File.objects.filter(folder=folder, is_deleted=False)
            
            children = []
            for sf in sub_folders:
                children.append(build_folder_tree(sf))
            for fi in files:
                children.append({
                    'id': f"file_{fi.id}",
                    'real_id': fi.id,
                    'name': fi.name,
                    'item_type': 'file',
                    'size': fi.file_size or fi.size or 0,
                    'file_type': fi.file_type or fi.mime_type or '',
                    'folder_count': 0,
                    'file_count': 0,
                    'children': []
                })

            total_f_count = len(sub_folders)
            total_file_count = len(files)
            for c in children:
                if c['item_type'] == 'folder':
                    total_f_count += c.get('folder_count', 0)
                    total_file_count += c.get('file_count', 0)

            return {
                'id': f"folder_{folder.id}",
                'real_id': folder.id,
                'name': folder.name,
                'item_type': 'folder',
                'folder_count': total_f_count,
                'file_count': total_file_count,
                'children': children
            }

        mou_children = [build_folder_tree(f) for f in mou_folders]
        mou_f_count = sum(c.get('folder_count', 0) + 1 for c in mou_children)
        mou_file_count = sum(c.get('file_count', 0) for c in mou_children)

        mou_module_node = {
            'id': 'module_mou',
            'real_id': 'mou_repository',
            'name': 'MOU Repository',
            'item_type': 'module',
            'module_type': 'mou_repository',
            'folder_count': mou_f_count,
            'file_count': mou_file_count,
            'children': mou_children
        }
        tree.append(mou_module_node)

        # 2. Dynamic Custom Page Modules
        custom_pages = CustomDynamicPage.objects.filter(is_published=True, is_enabled=True)
        for cp in custom_pages:
            cp_folders = Folder.objects.filter(custom_page=cp, parent__isnull=True, is_deleted=False)
            cp_children = [build_folder_tree(f) for f in cp_folders]
            
            cp_f_count = sum(c.get('folder_count', 0) + 1 for c in cp_children)
            cp_file_count = sum(c.get('file_count', 0) for c in cp_children)

            tree.append({
                'id': f"module_custom_{cp.id}",
                'real_id': cp.id,
                'name': cp.title,
                'item_type': 'module',
                'module_type': 'custom_page',
                'folder_count': cp_f_count,
                'file_count': cp_file_count,
                'children': cp_children
            })

        # Calculate Root level metrics
        total_root_folders = sum(m.get('folder_count', 0) + 1 for m in tree)
        total_root_files = sum(m.get('file_count', 0) for m in tree)

        root_node = {
            'id': 'root',
            'real_id': 'root',
            'name': 'Entire Application Root',
            'item_type': 'root',
            'folder_count': total_root_folders,
            'file_count': total_root_files,
            'children': tree
        }

        modules_for_import = get_module_destinations()

        return Response({
            'root': root_node,
            'modules': modules_for_import
        }, status=status.HTTP_200_OK)


class ExportPreviewView(APIView):
    """
    Returns item metadata preview before Export download.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        target_type = request.data.get('target_type')  # 'root', 'module', 'folder', 'file'
        target_id = str(request.data.get('target_id', ''))

        if not target_type or not target_id:
            return Response({'detail': 'target_type and target_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        total_folders = 0
        total_files = 0
        total_size = 0
        title = "Export Package"
        export_format = "ZIP Archive"

        if target_type == 'file':
            try:
                file_id = target_id.replace('file_', '')
                fi = File.objects.get(id=int(file_id), is_deleted=False)
                title = fi.name
                total_folders = 0
                total_files = 1
                total_size = fi.file_size or fi.size or 0
                export_format = f"Direct Download ({fi.file_type or 'File'})"
            except File.DoesNotExist:
                return Response({'detail': 'File not found or deleted.'}, status=status.HTTP_404_NOT_FOUND)

        elif target_type == 'folder':
            try:
                folder_id = target_id.replace('folder_', '')
                folder = Folder.objects.get(id=int(folder_id), is_deleted=False)
                title = folder.name

                def get_folder_stats(f):
                    f_cnt = 1
                    fl_cnt = 0
                    sz = 0
                    files = File.objects.filter(folder=f, is_deleted=False)
                    fl_cnt += files.count()
                    for fi in files:
                        sz += (fi.file_size or fi.size or 0)
                    
                    sub_f = Folder.objects.filter(parent=f, is_deleted=False)
                    for sf in sub_f:
                        sub_f_cnt, sub_fl_cnt, sub_sz = get_folder_stats(sf)
                        f_cnt += sub_f_cnt
                        fl_cnt += sub_fl_cnt
                        sz += sub_sz
                    return f_cnt, fl_cnt, sz

                total_folders, total_files, total_size = get_folder_stats(folder)
            except Folder.DoesNotExist:
                return Response({'detail': 'Folder not found or deleted.'}, status=status.HTTP_404_NOT_FOUND)

        elif target_type == 'module':
            if target_id.startswith('module_custom_') or target_id.startswith('custom_') or target_id != 'module_mou':
                cp_id = target_id.replace('module_custom_', '').replace('custom_', '')
                try:
                    cp = CustomDynamicPage.objects.get(id=cp_id)
                    title = cp.title
                    root_folders = Folder.objects.filter(custom_page=cp, parent__isnull=True, is_deleted=False)
                except (CustomDynamicPage.DoesNotExist, ValueError):
                    return Response({'detail': 'Custom page module not found.'}, status=status.HTTP_404_NOT_FOUND)
            else:
                title = "MOU Repository"
                root_folders = Folder.objects.filter(module_type='mou_repository', parent__isnull=True, is_deleted=False)

            def get_folders_stats(folders):
                f_cnt = 0
                fl_cnt = 0
                sz = 0
                for f in folders:
                    files = File.objects.filter(folder=f, is_deleted=False)
                    fl_cnt += files.count()
                    for fi in files:
                        sz += (fi.file_size or fi.size or 0)
                    sub_f = Folder.objects.filter(parent=f, is_deleted=False)
                    sub_f_cnt, sub_fl_cnt, sub_sz = get_folders_stats(sub_f)
                    f_cnt += 1 + sub_f_cnt
                    fl_cnt += sub_fl_cnt
                    sz += sub_sz
                return f_cnt, fl_cnt, sz

            total_folders, total_files, total_size = get_folders_stats(root_folders)

        elif target_type == 'root':
            title = "Entire Application Root"
            all_folders = Folder.objects.filter(is_deleted=False)
            all_files = File.objects.filter(is_deleted=False)
            total_folders = all_folders.count()
            total_files = all_files.count()
            total_size = sum((fi.file_size or fi.size or 0) for fi in all_files)

        return Response({
            'title': title,
            'target_type': target_type,
            'target_id': target_id,
            'total_folders': total_folders,
            'total_files': total_files,
            'total_size': total_size,
            'export_format': export_format
        }, status=status.HTTP_200_OK)


class ExportDownloadView(APIView):
    """
    Downloads selected file directly or generates a ZIP archive package fetched from Google Drive.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        target_type = request.data.get('target_type')
        target_id = str(request.data.get('target_id', ''))

        if not target_type or not target_id:
            return Response({'detail': 'target_type and target_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Single File Export
        if target_type == 'file':
            file_id = target_id.replace('file_', '')
            try:
                fi = File.objects.get(id=int(file_id), is_deleted=False)
                file_bytes = None
                
                # Fetch content from Google Drive
                if fi.google_file_id and not fi.google_file_id.startswith('drive_file_'):
                    try:
                        file_bytes = drive_service.download_file(fi.google_file_id)
                    except Exception as e:
                        logger.error(f"Error fetching file from Drive: {e}")
                
                if not file_bytes and fi.file_field:
                    try:
                        file_bytes = fi.file_field.read()
                    except Exception as e:
                        logger.error(f"Error reading local file fallback: {e}")

                if not file_bytes:
                    return Response({'detail': f'Could not retrieve content for file "{fi.name}" from Google Drive.'}, status=status.HTTP_404_NOT_FOUND)

                mime_type = fi.file_type or fi.mime_type or 'application/octet-stream'
                response = HttpResponse(file_bytes, content_type=mime_type)
                clean_name = sanitize_filename(fi.name)
                response['Content-Disposition'] = f'attachment; filename="{clean_name}"'
                return response

            except File.DoesNotExist:
                return Response({'detail': 'File not found.'}, status=status.HTTP_404_NOT_FOUND)

        # 2. Folder / Module / Root Export (ZIP Archive)
        zip_buffer = io.BytesIO()
        zip_name = "Export_Package.zip"

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:

            def add_file_to_zip(fi, rel_path):
                file_bytes = None
                if fi.google_file_id and not fi.google_file_id.startswith('drive_file_'):
                    try:
                        file_bytes = drive_service.download_file(fi.google_file_id)
                    except Exception as err:
                        logger.warning(f"Failed to download '{fi.name}' from Drive during zip export: {err}")

                if not file_bytes and fi.file_field:
                    try:
                        file_bytes = fi.file_field.read()
                    except Exception as err:
                        logger.warning(f"Failed to read local fallback for '{fi.name}': {err}")

                if file_bytes:
                    zip_file.writestr(rel_path, file_bytes)

            def add_folder_to_zip(folder, current_path):
                folder_path = os.path.join(current_path, sanitize_filename(folder.name))
                # Add subfolders recursively
                sub_folders = Folder.objects.filter(parent=folder, is_deleted=False)
                for sf in sub_folders:
                    add_folder_to_zip(sf, folder_path)
                
                # Add files in this folder
                files = File.objects.filter(folder=folder, is_deleted=False)
                for fi in files:
                    file_rel_path = os.path.join(folder_path, sanitize_filename(fi.name))
                    add_file_to_zip(fi, file_rel_path)

            if target_type == 'folder':
                folder_id = target_id.replace('folder_', '')
                try:
                    folder = Folder.objects.get(id=int(folder_id), is_deleted=False)
                    zip_name = f"{sanitize_filename(folder.name)}_Export.zip"
                    add_folder_to_zip(folder, "")
                except Folder.DoesNotExist:
                    return Response({'detail': 'Folder not found.'}, status=status.HTTP_404_NOT_FOUND)

            elif target_type == 'module':
                if target_id.startswith('module_custom_') or target_id.startswith('custom_') or target_id != 'module_mou':
                    cp_id = target_id.replace('module_custom_', '').replace('custom_', '')
                    try:
                        cp = CustomDynamicPage.objects.get(id=cp_id)
                        zip_name = f"{sanitize_filename(cp.title)}_Module_Export.zip"
                        root_folders = Folder.objects.filter(custom_page=cp, parent__isnull=True, is_deleted=False)
                        for rf in root_folders:
                            add_folder_to_zip(rf, sanitize_filename(cp.title))
                    except (CustomDynamicPage.DoesNotExist, ValueError):
                        return Response({'detail': 'Module not found.'}, status=status.HTTP_404_NOT_FOUND)
                else:
                    zip_name = "MOU_Repository_Module_Export.zip"
                    root_folders = Folder.objects.filter(module_type='mou_repository', parent__isnull=True, is_deleted=False)
                    for rf in root_folders:
                        add_folder_to_zip(rf, "MOU Repository")

            elif target_type == 'root':
                zip_name = "Application_Root_Export.zip"
                # Add MOU Repository
                mou_folders = Folder.objects.filter(module_type='mou_repository', parent__isnull=True, is_deleted=False)
                for rf in mou_folders:
                    add_folder_to_zip(rf, "MOU Repository")
                
                # Add Custom Dynamic Modules
                custom_pages = CustomDynamicPage.objects.filter(is_published=True, is_enabled=True)
                for cp in custom_pages:
                    cp_folders = Folder.objects.filter(custom_page=cp, parent__isnull=True, is_deleted=False)
                    for rf in cp_folders:
                        add_folder_to_zip(rf, sanitize_filename(cp.title))

        zip_buffer.seek(0)
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{zip_name}"'
        return response


class ImportPreviewView(APIView):
    """
    Parses uploaded File, Folder tree, or ZIP archive and returns preview structure before importing.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        uploaded_files = request.FILES.getlist('files') or request.FILES.getlist('file')
        relative_paths = request.POST.getlist('relative_paths')

        if not uploaded_files:
            return Response({'detail': 'No file or folder uploaded for preview.'}, status=status.HTTP_400_BAD_REQUEST)

        folders_set = set()
        file_list = []

        # Case 1: Folder directory tree upload with relative paths
        if len(uploaded_files) > 1 and relative_paths and len(relative_paths) == len(uploaded_files):
            first_path = relative_paths[0].replace('\\', '/').strip('/')
            filename = first_path.split('/')[0] if '/' in first_path else 'Uploaded Folder'
            is_zip = False
            for f_obj, rel_path in zip(uploaded_files, relative_paths):
                clean_path = rel_path.replace('\\', '/').strip('/')
                parts = clean_path.split('/')
                if len(parts) > 1:
                    path_acc = ""
                    for p in parts[:-1]:
                        path_acc = f"{path_acc}/{p}" if path_acc else p
                        folders_set.add(path_acc)
                file_list.append({
                    'name': parts[-1],
                    'path': clean_path,
                    'size': f_obj.size
                })
        else:
            # Case 2: Single file or ZIP archive
            uploaded_file = uploaded_files[0]
            filename = uploaded_file.name
            is_zip = filename.lower().endswith('.zip')

            if is_zip:
                try:
                    with zipfile.ZipFile(uploaded_file, 'r') as zip_ref:
                        for info in zip_ref.infolist():
                            norm_path = os.path.normpath(info.filename).replace("\\", "/")
                            if norm_path.startswith("..") or norm_path.startswith("/"):
                                continue
                            
                            parts = [p for p in norm_path.split("/") if p and p != "."]
                            if not parts:
                                continue

                            if info.is_dir():
                                folders_set.add("/".join(parts))
                            else:
                                if len(parts) > 1:
                                    path_acc = ""
                                    for p in parts[:-1]:
                                        path_acc = f"{path_acc}/{p}" if path_acc else p
                                        folders_set.add(path_acc)

                                file_list.append({
                                    'name': parts[-1],
                                    'path': norm_path,
                                    'size': info.file_size
                                })
                except Exception as e:
                    return Response({'detail': f'Invalid or corrupted ZIP archive: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

            else:
                file_list.append({
                    'name': filename,
                    'path': filename,
                    'size': uploaded_file.size
                })

        return Response({
            'filename': filename,
            'is_zip': is_zip,
            'total_folders': len(folders_set),
            'total_files': len(file_list),
            'folder_paths': sorted(list(folders_set)),
            'file_list': file_list
        }, status=status.HTTP_200_OK)


class ImportExecuteView(APIView):
    """
    Executes import into selected destination module/folder, uploading to Google Drive & saving DB records.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        uploaded_files = request.FILES.getlist('files') or request.FILES.getlist('file')
        relative_paths = request.POST.getlist('relative_paths')
        module_id = request.data.get('module_id')
        parent_folder_id = request.data.get('parent_folder_id') or request.data.get('parent_id') or request.data.get('target_folder_id')
        duplicate_file_strategy = request.data.get('duplicate_file_strategy', 'create_copy')  # 'skip', 'replace', 'create_copy'
        duplicate_folder_strategy = request.data.get('duplicate_folder_strategy', 'merge')   # 'merge', 'create_new', 'skip'

        if not uploaded_files or not module_id:
            return Response({'detail': 'Both file(s) and destination module_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine destination module & Drive parent folder ID
        target_module_type = 'mou_repository'
        target_custom_page = None
        destination_drive_parent_id = None
        base_parent_folder = None

        if module_id == 'mou_repository':
            target_module_type = 'mou_repository'
            destination_drive_parent_id = drive_service.get_or_create_mou_repository_folder_id()
        elif str(module_id).startswith('custom_') or str(module_id).startswith('module_custom_') or module_id != 'mou_repository':
            cp_id = str(module_id).replace('module_custom_', '').replace('custom_', '')
            try:
                target_custom_page = CustomDynamicPage.objects.get(id=cp_id)
                target_module_type = 'custom_page'
                destination_drive_parent_id = drive_service.get_or_create_module_folder_id(target_custom_page)
            except (CustomDynamicPage.DoesNotExist, ValueError):
                return Response({'detail': 'Selected destination module was not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Override destination with specific target parent folder if specified
        if parent_folder_id and str(parent_folder_id).isdigit():
            try:
                base_parent_folder = Folder.objects.get(id=int(parent_folder_id), is_deleted=False)
                destination_drive_parent_id = base_parent_folder.google_folder_id or destination_drive_parent_id
                target_module_type = base_parent_folder.module_type
                target_custom_page = base_parent_folder.custom_page
            except Folder.DoesNotExist:
                pass

        if not destination_drive_parent_id:
            destination_drive_parent_id = drive_service.get_root_folder_id()

        successful_files = []
        failed_files = []
        user = request.user

        # Temporary working directory for ZIP processing
        temp_dir = tempfile.mkdtemp()

        try:
            # ── MODE 1: Directory Tree Upload (Multiple files with relative paths) ──
            if len(uploaded_files) > 1 and relative_paths and len(relative_paths) == len(uploaded_files):
                folder_map = {}  # path_key -> (Folder obj, drive_folder_id)

                for f_obj, rel_path in zip(uploaded_files, relative_paths):
                    clean_path = rel_path.replace('\\', '/').strip('/')
                    parts = clean_path.split('/')
                    
                    filename = sanitize_filename(parts[-1])
                    dir_parts = parts[:-1]

                    current_parent_folder = base_parent_folder
                    current_drive_parent = destination_drive_parent_id

                    path_key = ""
                    for part in dir_parts:
                        clean_dir_name = sanitize_filename(part)
                        path_key = f"{path_key}/{clean_dir_name}" if path_key else clean_dir_name

                        if path_key in folder_map:
                            current_parent_folder, current_drive_parent = folder_map[path_key]
                        else:
                            existing_folder = Folder.objects.filter(
                                name=clean_dir_name,
                                parent=current_parent_folder,
                                module_type=target_module_type,
                                custom_page=target_custom_page,
                                is_deleted=False
                            ).first()

                            if existing_folder and duplicate_folder_strategy == 'merge':
                                target_folder = existing_folder
                                target_drive_id = existing_folder.google_folder_id or drive_service.create_folder(clean_dir_name, current_drive_parent)
                            elif existing_folder and duplicate_folder_strategy == 'skip':
                                current_parent_folder = existing_folder
                                current_drive_parent = existing_folder.google_folder_id or current_drive_parent
                                folder_map[path_key] = (current_parent_folder, current_drive_parent)
                                continue
                            else:
                                final_name = clean_dir_name
                                if existing_folder and duplicate_folder_strategy == 'create_new':
                                    final_name = f"{clean_dir_name} ({datetime.now().strftime('%Y%m%d_%H%M%S')})"

                                target_drive_id = drive_service.create_folder(final_name, current_drive_parent)
                                target_folder = Folder.objects.create(
                                    name=final_name,
                                    parent=current_parent_folder,
                                    google_folder_id=target_drive_id,
                                    module_type=target_module_type,
                                    custom_page=target_custom_page,
                                    created_by=user
                                )

                            folder_map[path_key] = (target_folder, target_drive_id)
                            current_parent_folder = target_folder
                            current_drive_parent = target_drive_id

                    # Save File & Sync to Google Drive
                    try:
                        f_content = f_obj.read()
                        drive_result = drive_service.upload_file(
                            file_content=f_content,
                            filename=filename,
                            mime_type=f_obj.content_type,
                            parent_id=current_drive_parent
                        )
                        File.objects.create(
                            name=filename,
                            size=len(f_content),
                            file_size=len(f_content),
                            file_type=os.path.splitext(filename)[1].lstrip('.').upper() or 'FILE',
                            mime_type=drive_result.get('mimeType', f_obj.content_type),
                            folder=current_parent_folder,
                            uploaded_by=user,
                            google_file_id=drive_result.get('id'),
                            web_view_link=drive_result.get('webViewLink'),
                            web_content_link=drive_result.get('webContentLink')
                        )
                        successful_files.append(filename)
                    except Exception as file_err:
                        logger.error(f"Error importing directory file '{filename}': {file_err}")
                        failed_files.append({'name': filename, 'reason': str(file_err)})

            # ── MODE 2: ZIP Archive or Single File Upload ──
            else:
                uploaded_file = uploaded_files[0]
                filename = uploaded_file.name
                is_zip = filename.lower().endswith('.zip')

                # Determine root folder name from original file/zip name
                raw_root_name = sanitize_filename(os.path.splitext(filename)[0]) or "Imported Folder"

                if is_zip:
                    zip_path = os.path.join(temp_dir, 'import.zip')
                    with open(zip_path, 'wb') as f_out:
                        for chunk in uploaded_file.chunks():
                            f_out.write(chunk)

                    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                        zip_ref.extractall(temp_dir)

                    os.remove(zip_path)

                    folder_map = {}

                    for root, dirs, files in os.walk(temp_dir):
                        rel_root = os.path.relpath(root, temp_dir)
                        if rel_root == '.':
                            rel_root = ""

                        current_parent_folder = base_parent_folder
                        current_drive_parent = destination_drive_parent_id

                        if rel_root:
                            parent_rel = os.path.dirname(rel_root)
                            if parent_rel in folder_map:
                                current_parent_folder, current_drive_parent = folder_map[parent_rel]

                        for d_name in dirs:
                            clean_dir_name = sanitize_filename(d_name)
                            rel_dir_path = os.path.join(rel_root, d_name) if rel_root else d_name

                            existing_folder = Folder.objects.filter(
                                name=clean_dir_name,
                                parent=current_parent_folder,
                                module_type=target_module_type,
                                custom_page=target_custom_page,
                                is_deleted=False
                            ).first()

                            target_folder = None
                            target_drive_id = None

                            if existing_folder and duplicate_folder_strategy == 'merge':
                                target_folder = existing_folder
                                target_drive_id = existing_folder.google_folder_id or drive_service.create_folder(clean_dir_name, current_drive_parent)
                            elif existing_folder and duplicate_folder_strategy == 'skip':
                                continue
                            else:
                                final_name = clean_dir_name
                                if existing_folder and duplicate_folder_strategy == 'create_new':
                                    final_name = f"{clean_dir_name} ({datetime.now().strftime('%Y%m%d_%H%M%S')})"

                                target_drive_id = drive_service.create_folder(final_name, current_drive_parent)
                                target_folder = Folder.objects.create(
                                    name=final_name,
                                    parent=current_parent_folder,
                                    google_folder_id=target_drive_id,
                                    module_type=target_module_type,
                                    custom_page=target_custom_page,
                                    created_by=user
                                )

                            folder_map[rel_dir_path] = (target_folder, target_drive_id)

                        for f_name in files:
                            clean_f_name = sanitize_filename(f_name)
                            file_full_path = os.path.join(root, f_name)

                            file_parent_folder = current_parent_folder
                            file_drive_parent = current_drive_parent

                            if not file_parent_folder:
                                # Use original package name instead of generic name
                                root_folder = Folder.objects.filter(
                                    name=raw_root_name,
                                    parent=base_parent_folder,
                                    module_type=target_module_type,
                                    custom_page=target_custom_page,
                                    is_deleted=False
                                ).first()
                                if not root_folder:
                                    root_drive_id = drive_service.create_folder(raw_root_name, destination_drive_parent_id)
                                    root_folder = Folder.objects.create(
                                        name=raw_root_name,
                                        parent=base_parent_folder,
                                        google_folder_id=root_drive_id,
                                        module_type=target_module_type,
                                        custom_page=target_custom_page,
                                        created_by=user
                                    )
                                file_parent_folder = root_folder
                                file_drive_parent = root_folder.google_folder_id

                            existing_file = File.objects.filter(
                                name=clean_f_name,
                                folder=file_parent_folder,
                                is_deleted=False
                            ).first()

                            if existing_file and duplicate_file_strategy == 'skip':
                                continue

                            final_file_name = clean_f_name
                            if existing_file and duplicate_file_strategy == 'create_copy':
                                base_n, ext_n = os.path.splitext(clean_f_name)
                                final_file_name = f"{base_n} (copy){ext_n}"

                            try:
                                with open(file_full_path, 'rb') as f_in:
                                    f_content = f_in.read()

                                drive_result = drive_service.upload_file(
                                    file_content=f_content,
                                    filename=final_file_name,
                                    mime_type=None,
                                    parent_id=file_drive_parent
                                )

                                if existing_file and duplicate_file_strategy == 'replace':
                                    if existing_file.google_file_id:
                                        try:
                                            drive_service.delete_file(existing_file.google_file_id)
                                        except Exception:
                                            pass
                                    existing_file.name = final_file_name
                                    existing_file.google_file_id = drive_result.get('id')
                                    existing_file.size = len(f_content)
                                    existing_file.file_size = len(f_content)
                                    existing_file.web_view_link = drive_result.get('webViewLink')
                                    existing_file.web_content_link = drive_result.get('webContentLink')
                                    existing_file.save()
                                    successful_files.append(final_file_name)
                                else:
                                    File.objects.create(
                                        name=final_file_name,
                                        size=len(f_content),
                                        file_size=len(f_content),
                                        file_type=os.path.splitext(final_file_name)[1].lstrip('.').upper() or 'FILE',
                                        mime_type=drive_result.get('mimeType', ''),
                                        folder=file_parent_folder,
                                        uploaded_by=user,
                                        google_file_id=drive_result.get('id'),
                                        web_view_link=drive_result.get('webViewLink'),
                                        web_content_link=drive_result.get('webContentLink')
                                    )
                                    successful_files.append(final_file_name)

                            except Exception as file_err:
                                logger.error(f"Error importing file '{clean_f_name}': {file_err}")
                                failed_files.append({'name': clean_f_name, 'reason': str(file_err)})

                else:
                    clean_f_name = sanitize_filename(uploaded_file.name)
                    target_folder = base_parent_folder
                    
                    if not target_folder:
                        target_folder = Folder.objects.filter(
                            name=raw_root_name,
                            parent=base_parent_folder,
                            module_type=target_module_type,
                            custom_page=target_custom_page,
                            is_deleted=False
                        ).first()
                        if not target_folder:
                            target_drive_id = drive_service.create_folder(raw_root_name, destination_drive_parent_id)
                            target_folder = Folder.objects.create(
                                name=raw_root_name,
                                parent=base_parent_folder,
                                google_folder_id=target_drive_id,
                                module_type=target_module_type,
                                custom_page=target_custom_page,
                                created_by=user
                            )

                    f_content = uploaded_file.read()

                    drive_result = drive_service.upload_file(
                        file_content=f_content,
                        filename=clean_f_name,
                        mime_type=uploaded_file.content_type,
                        parent_id=target_folder.google_folder_id or destination_drive_parent_id
                    )

                    File.objects.create(
                        name=clean_f_name,
                        size=len(f_content),
                        file_size=len(f_content),
                        file_type=os.path.splitext(clean_f_name)[1].lstrip('.').upper() or 'FILE',
                        mime_type=drive_result.get('mimeType', uploaded_file.content_type),
                        folder=target_folder,
                        uploaded_by=user,
                        google_file_id=drive_result.get('id'),
                        web_view_link=drive_result.get('webViewLink'),
                        web_content_link=drive_result.get('webContentLink')
                    )
                    successful_files.append(clean_f_name)

        except Exception as e:
            logger.error(f"Import process error: {e}")
            return Response({'detail': f'Import execution failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

        return Response({
            'success': True,
            'processed_count': len(successful_files) + len(failed_files),
            'successful_count': len(successful_files),
            'failed_count': len(failed_files),
            'successful_files': successful_files,
            'failed_files': failed_files
        }, status=status.HTTP_200_OK)
