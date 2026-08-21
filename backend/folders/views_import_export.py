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
    modules = []
    predefined = drive_service.get_predefined_modules()
    for pm in predefined:
        if pm['id'] == 'recycle_bin':
            continue
        drive_id = drive_service.get_or_create_predefined_module_folder_id(pm['id'])
        modules.append({
            'id': pm['id'],
            'name': pm['name'],
            'type': 'system',
            'drive_id': drive_id
        })
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

        def build_folder_tree(folder, visited=None):
            if visited is None:
                visited = set()
            if folder.id in visited:
                return {
                    'id': f"folder_{folder.id}",
                    'real_id': folder.id,
                    'name': folder.name,
                    'item_type': 'folder',
                    'folder_count': 0,
                    'file_count': 0,
                    'children': []
                }
            visited.add(folder.id)
            sub_folders = Folder.objects.filter(parent=folder, is_deleted=False)
            files = File.objects.filter(folder=folder, is_deleted=False)
            
            children = []
            for sf in sub_folders:
                children.append(build_folder_tree(sf, visited))
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

        # 1. Predefined System Modules
        from django.db.models import Q
        predefined = drive_service.get_predefined_modules()
        for pm in predefined:
            if pm['id'] == 'recycle_bin':
                continue
            mou_sys_folder = None
            if pm['id'] == 'mou_repository':
                mou_root_id = drive_service.get_or_create_mou_repository_folder_id()
                if mou_root_id:
                    mou_sys_folder = Folder.objects.filter(google_folder_id=mou_root_id).first()
            if mou_sys_folder:
                mod_folders = Folder.objects.filter(
                    Q(parent=mou_sys_folder) | Q(module_type=pm['id'], parent__isnull=True, custom_page__isnull=True),
                    is_deleted=False
                ).exclude(id=mou_sys_folder.id)
            else:
                mod_folders = Folder.objects.filter(
                    module_type=pm['id'], parent__isnull=True, custom_page__isnull=True, is_deleted=False
                )
            mod_children = [build_folder_tree(f) for f in mod_folders]
            mod_f_count = sum(c.get('folder_count', 0) + 1 for c in mod_children)
            mod_file_count = sum(c.get('file_count', 0) for c in mod_children)

            tree.append({
                'id': f"module_{pm['id']}",
                'real_id': pm['id'],
                'name': pm['name'],
                'item_type': 'module',
                'module_type': pm['id'],
                'folder_count': mod_f_count,
                'file_count': mod_file_count,
                'children': mod_children
            })

        # 2. Dynamic Custom Page Modules
        custom_pages = CustomDynamicPage.objects.filter(is_published=True, is_enabled=True)
        for cp in custom_pages:
            rf = None
            if cp.root_folder_id:
                try:
                    rf = Folder.objects.filter(id=int(cp.root_folder_id)).first()
                except (ValueError, TypeError):
                    pass
            if not rf and cp.google_drive_folder_id:
                rf = Folder.objects.filter(google_folder_id=cp.google_drive_folder_id).first()
            
            if rf:
                cp_folders = Folder.objects.filter(
                    Q(parent=rf) | Q(custom_page=cp, parent__isnull=True),
                    is_deleted=False
                ).exclude(id=rf.id)
            else:
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


class ExportToDriveView(APIView):
    """
    Exports a local database item (Root, Module, Folder, or File) directly to Google Drive.
    Creates Google Drive folder structure and uploads/copies files to destination_drive_folder_id (defaults to My Drive 'root' or 'app_root').
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        target_type = request.data.get('target_type')
        target_id = request.data.get('target_id')
        destination_drive_folder_id = request.data.get('destination_drive_folder_id') or 'root'

        if destination_drive_folder_id == 'root':
            drive_parent_id = 'root'
        elif destination_drive_folder_id == 'app_root':
            drive_parent_id = drive_service.get_root_folder_id()
        else:
            drive_parent_id = destination_drive_folder_id

        files_exported = 0
        folders_created = 0

        def export_file_obj_to_drive(file_obj, parent_id):
            nonlocal files_exported
            try:
                if file_obj.google_file_id and not file_obj.google_file_id.startswith('drive_file_'):
                    drive_service.copy_google_drive_file(file_obj.google_file_id, parent_id, file_obj.name)
                    files_exported += 1
                elif file_obj.file_field:
                    content = file_obj.file_field.read()
                    drive_service.upload_file_to_drive(file_obj.name, content, parent_id)
                    files_exported += 1
            except Exception as e:
                logger.error(f"Failed to export file '{file_obj.name}' to Drive: {e}")

        def export_folder_obj_to_drive(folder_obj, parent_id):
            nonlocal folders_created
            drive_folder_id = drive_service.create_folder(folder_obj.name, parent_id)
            folders_created += 1

            files = File.objects.filter(folder=folder_obj, is_deleted=False)
            for fi in files:
                export_file_obj_to_drive(fi, drive_folder_id)

            sub_folders = Folder.objects.filter(parent=folder_obj, is_deleted=False)
            for sf in sub_folders:
                export_folder_obj_to_drive(sf, drive_folder_id)

        try:
            if target_type == 'file':
                file_id = str(target_id).replace('file_', '')
                fi = File.objects.get(id=int(file_id), is_deleted=False)
                export_file_obj_to_drive(fi, drive_parent_id)
            elif target_type == 'folder':
                folder_id = str(target_id).replace('folder_', '')
                fo = Folder.objects.get(id=int(folder_id), is_deleted=False)
                export_folder_obj_to_drive(fo, drive_parent_id)
            elif target_type == 'module':
                target_str = str(target_id)
                if target_str.startswith('module_custom_') or target_str.startswith('custom_') or target_str != 'module_mou':
                    cp_id = target_str.replace('module_custom_', '').replace('custom_', '')
                    cp = CustomDynamicPage.objects.get(id=cp_id)
                    module_folder_id = drive_service.create_folder(cp.title, drive_parent_id)
                    root_folders = Folder.objects.filter(custom_page=cp, parent__isnull=True, is_deleted=False)
                    for rf in root_folders:
                        export_folder_obj_to_drive(rf, module_folder_id)
                else:
                    mou_folder_id = drive_service.create_folder("MOU Repository", drive_parent_id)
                    root_folders = Folder.objects.filter(module_type='mou_repository', parent__isnull=True, is_deleted=False)
                    for rf in root_folders:
                        export_folder_obj_to_drive(rf, mou_folder_id)
            elif target_type == 'root':
                app_root_drive_id = drive_service.create_folder("MCC Legal Repository Backup", drive_parent_id)
                
                mou_folder_id = drive_service.create_folder("MOU Repository", app_root_drive_id)
                mou_folders = Folder.objects.filter(module_type='mou_repository', parent__isnull=True, is_deleted=False)
                for rf in mou_folders:
                    export_folder_obj_to_drive(rf, mou_folder_id)

                cps = CustomDynamicPage.objects.filter(is_published=True, is_enabled=True)
                for cp in cps:
                    cp_folder_id = drive_service.create_folder(cp.title, app_root_drive_id)
                    cp_folders = Folder.objects.filter(custom_page=cp, parent__isnull=True, is_deleted=False)
                    for rf in cp_folders:
                        export_folder_obj_to_drive(rf, cp_folder_id)

            return Response({
                'detail': 'Successfully exported items to Google Drive!',
                'files_exported': files_exported,
                'folders_created': folders_created,
                'destination_drive_folder_id': drive_parent_id
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Export to Drive error: {e}")
            return Response({'detail': f'Export to Google Drive failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


class GoogleDriveBrowseView(APIView):
    """
    Lists immediate subfolders and files inside a Google Drive folder for browsing.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        folder_id = request.query_params.get('folder_id')
        try:
            res = drive_service.browse_drive_folder(folder_id)
            return Response(res, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"GoogleDriveBrowseView error for folder_id='{folder_id}': {e}")
            return Response({
                'current_folder': {'id': folder_id or 'root', 'name': 'My Drive', 'parents': []},
                'root_folder_id': 'root',
                'items': [],
                'error': str(e)
            }, status=status.HTTP_200_OK)


class ImportPreviewView(APIView):
    """
    Parses uploaded File, Folder tree, ZIP archive, or Google Drive folder(s) and returns preview structure before importing.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        source_type = request.data.get('source_type')
        source_drive_folder_id = request.data.get('source_drive_folder_id')
        source_drive_items = request.data.get('source_drive_items')

        # Mode 0: Google Drive Source (Single or Multi-item)
        if source_type == 'google_drive' or source_drive_folder_id or source_drive_items:
            items_to_scan = []
            if source_drive_items and isinstance(source_drive_items, list):
                items_to_scan = source_drive_items
            elif source_drive_folder_id:
                items_to_scan = [{'id': source_drive_folder_id, 'name': 'Google Drive Folder', 'is_folder': True}]

            if not items_to_scan:
                return Response({'detail': 'No Google Drive items provided for preview.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                combined_folders = set()
                combined_files = []
                folder_paths = set()

                for item in items_to_scan:
                    item_id = item.get('id')
                    is_folder = item.get('is_folder', True)
                    if is_folder:
                        scan_res = drive_service.scan_google_drive_folder_tree(item_id)
                        root_name = scan_res.get('filename', item.get('name', 'Drive Folder'))
                        combined_folders.add(root_name)
                        for fp in scan_res.get('folder_paths', []):
                            folder_paths.add(fp)
                        for fi in scan_res.get('file_list', []):
                            combined_files.append(fi)
                    else:
                        f_name = item.get('name', 'Drive File')
                        combined_files.append({
                            'id': item_id,
                            'name': f_name,
                            'path': f_name,
                            'size': item.get('size', 0)
                        })

                preview_title = f"{len(items_to_scan)} Google Drive Items" if len(items_to_scan) > 1 else (items_to_scan[0].get('name') if items_to_scan else 'Google Drive Import')

                return Response({
                    'filename': preview_title,
                    'is_zip': False,
                    'total_folders': len(combined_folders) + len(folder_paths),
                    'total_files': len(combined_files),
                    'folder_paths': sorted(list(folder_paths)),
                    'file_list': combined_files
                }, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Google Drive scan error: {e}")
                return Response({'detail': f'Google Drive scan failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_files = request.FILES.getlist('files') or request.FILES.getlist('file')
        relative_paths = request.POST.getlist('relative_paths')

        if not uploaded_files:
            return Response({'detail': 'No file, folder, or Google Drive source provided for preview.'}, status=status.HTTP_400_BAD_REQUEST)

        folders_set = set()
        file_list = []

        # Case 1: Folder directory tree upload with relative paths
        if relative_paths and len(relative_paths) == len(uploaded_files) and any('/' in str(rp).replace('\\', '/').strip('/') for rp in relative_paths):
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
            # Case 2: Single file, multiple flat files, or ZIP archive
            filename = f"{len(uploaded_files)} Selected Files" if len(uploaded_files) > 1 else uploaded_files[0].name
            is_zip = len(uploaded_files) == 1 and uploaded_files[0].name.lower().endswith('.zip')

            if is_zip:
                uploaded_file = uploaded_files[0]
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
                for uf in uploaded_files:
                    file_list.append({
                        'name': uf.name,
                        'path': uf.name,
                        'size': uf.size
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
    Supports Local Files, Local Folders, ZIP Archives, and Google Drive Folders.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        source_type = request.data.get('source_type')
        source_drive_folder_id = request.data.get('source_drive_folder_id')
        uploaded_files = request.FILES.getlist('files') or request.FILES.getlist('file')
        relative_paths = request.POST.getlist('relative_paths')
        module_id = request.data.get('module_id')
        parent_folder_id = request.data.get('parent_folder_id') or request.data.get('parent_id') or request.data.get('target_folder_id')
        duplicate_file_strategy = request.data.get('duplicate_file_strategy', 'create_copy')  # 'skip', 'replace', 'create_copy'
        duplicate_folder_strategy = request.data.get('duplicate_folder_strategy', 'merge')   # 'merge', 'create_new', 'skip'

        if not module_id:
            return Response({'detail': 'Destination module_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not (source_type == 'google_drive' or source_drive_folder_id) and not uploaded_files:
            return Response({'detail': 'Both import source files/folder and destination module_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine destination module & Drive parent folder ID
        target_module_type = 'mou_repository'
        target_custom_page = None
        destination_drive_parent_id = None
        base_parent_folder = None

        if str(module_id).startswith('custom_') or str(module_id).startswith('module_custom_'):
            cp_id = str(module_id).replace('module_custom_', '').replace('custom_', '')
            try:
                target_custom_page = CustomDynamicPage.objects.get(id=cp_id)
                target_module_type = 'custom_page'
                destination_drive_parent_id = drive_service.get_or_create_module_folder_id(target_custom_page)
            except (CustomDynamicPage.DoesNotExist, ValueError):
                return Response({'detail': 'Selected destination module was not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            target_module_type = str(module_id)
            destination_drive_parent_id = drive_service.get_or_create_predefined_module_folder_id(module_id)

        user = request.user if request.user and request.user.is_authenticated else None
        successful_files = []
        failed_files = []

        # Override destination with specific target parent folder if specified
        if parent_folder_id and str(parent_folder_id).isdigit():
            try:
                base_parent_folder = Folder.objects.get(id=int(parent_folder_id), is_deleted=False)
                destination_drive_parent_id = base_parent_folder.google_folder_id or destination_drive_parent_id
                target_module_type = base_parent_folder.module_type
                target_custom_page = base_parent_folder.custom_page
            except Folder.DoesNotExist:
                pass

        if not base_parent_folder:
            if target_custom_page:
                mod_name = target_custom_page.title
            else:
                from services.drive_service import PREDEFINED_MODULES
                name_map = {m['id']: m['name'] for m in PREDEFINED_MODULES}
                mod_name = name_map.get(target_module_type, 'MOU Repository')

            base_parent_folder = Folder.objects.filter(
                name=mod_name,
                parent=None,
                module_type=target_module_type,
                custom_page=target_custom_page,
                is_deleted=False
            ).first()

            if not base_parent_folder:
                if not destination_drive_parent_id and target_module_type == 'mou_repository':
                    destination_drive_parent_id = drive_service.get_or_create_mou_repository_folder_id()
                base_parent_folder = Folder.objects.create(
                    name=mod_name,
                    parent=None,
                    module_type=target_module_type,
                    custom_page=target_custom_page,
                    google_folder_id=destination_drive_parent_id,
                    created_by=user,
                    status='Active'
                )

        if not base_parent_folder.google_folder_id and target_module_type == 'mou_repository':
            m_id = drive_service.get_or_create_mou_repository_folder_id()
            if m_id:
                base_parent_folder.google_folder_id = m_id
                base_parent_folder.save(update_fields=['google_folder_id'])

        if not destination_drive_parent_id:
            destination_drive_parent_id = base_parent_folder.google_folder_id or drive_service.get_root_folder_id()

        # ── MODE 0: Import directly from Google Drive Folder(s) / File(s) ──
        if source_type == 'google_drive' or source_drive_folder_id or request.data.get('source_drive_items'):
            source_drive_items = request.data.get('source_drive_items')
            items_to_process = []
            if source_drive_items and isinstance(source_drive_items, list):
                items_to_process = source_drive_items
            elif source_drive_folder_id:
                items_to_process = [{'id': source_drive_folder_id, 'name': 'Google Drive Folder', 'is_folder': True}]

            if not items_to_process:
                return Response({'detail': 'No Google Drive items provided for import.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                for item_target in items_to_process:
                    target_id = item_target.get('id')
                    is_folder = item_target.get('is_folder', True)

                    if is_folder:
                        scan_res = drive_service.scan_google_drive_folder_tree(target_id)
                        root_folder_name = scan_res.get('filename', item_target.get('name', 'Google Drive Import'))

                        # 1. Move folder into destination parent on Google Drive
                        top_drive_id = target_id
                        try:
                            drive_service.move_file(target_id, destination_drive_parent_id)
                        except Exception as m_err:
                            logger.warning(f"Note: Drive move for '{root_folder_name}' skipped or duplicate: {m_err}")

                        # 2. Bind / create top folder in DB
                        top_folder, created = Folder.objects.get_or_create(
                            google_folder_id=target_id,
                            defaults={
                                'name': root_folder_name,
                                'parent': base_parent_folder,
                                'module_type': target_module_type,
                                'custom_page': target_custom_page,
                                'import_source': 'google_drive',
                                'source_google_folder_id': target_id,
                                'created_by': user,
                                'status': 'Active'
                            }
                        )
                        if not created:
                            top_folder.parent = base_parent_folder
                            top_folder.module_type = target_module_type
                            top_folder.custom_page = target_custom_page
                            top_folder.is_deleted = False
                            top_folder.save(update_fields=['parent', 'module_type', 'custom_page', 'is_deleted'])

                        folder_map = {root_folder_name: (top_folder, top_drive_id)}
                        folders_dict = scan_res.get('folders_dict', {})

                        # Process all subfolders
                        for rel_folder_path in scan_res.get('folder_paths', []):
                            if rel_folder_path == root_folder_name:
                                continue
                            parts = rel_folder_path.split('/')
                            sub_g_id = folders_dict.get(rel_folder_path)

                            path_acc = parts[0]
                            for p in parts[1:]:
                                parent_acc = path_acc
                                path_acc = f"{path_acc}/{p}"

                                if path_acc in folder_map:
                                    continue
                                
                                parent_f, parent_d = folder_map.get(parent_acc, (top_folder, top_drive_id))
                                clean_dir_name = sanitize_filename(p)

                                sub_f, _ = Folder.objects.get_or_create(
                                    google_folder_id=sub_g_id if sub_g_id else None,
                                    defaults={
                                        'name': clean_dir_name,
                                        'parent': parent_f,
                                        'module_type': target_module_type,
                                        'custom_page': target_custom_page,
                                        'import_source': 'google_drive',
                                        'created_by': user,
                                        'status': 'Active'
                                    }
                                )
                                if not sub_f.parent:
                                    sub_f.parent = parent_f
                                    sub_f.save(update_fields=['parent'])

                                folder_map[path_acc] = (sub_f, sub_g_id)

                        # Process all files directly referencing their Google Drive IDs & web links
                        for fi_info in scan_res.get('file_list', []):
                            f_name = fi_info['name']
                            f_path = fi_info['path']
                            source_f_id = fi_info['id']

                            dir_path = os.path.dirname(f_path)
                            target_f, target_d = folder_map.get(dir_path, (top_folder, top_drive_id))

                            clean_file_name = sanitize_filename(f_name)
                            f_size = fi_info.get('size', 0)

                            file_obj, f_created = File.objects.get_or_create(
                                google_file_id=source_f_id,
                                defaults={
                                    'name': clean_file_name,
                                    'folder': target_f,
                                    'size': f_size,
                                    'file_size': f_size,
                                    'file_type': os.path.splitext(clean_file_name)[1].lstrip('.').upper() or 'FILE',
                                    'mime_type': fi_info.get('mimeType', ''),
                                    'uploaded_by': user,
                                    'web_view_link': fi_info.get('webViewLink'),
                                    'web_content_link': fi_info.get('webContentLink'),
                                    'import_source': 'google_drive',
                                    'source_google_file_id': source_f_id,
                                    'status': 'Active'
                                }
                            )
                            if not f_created:
                                file_obj.folder = target_f
                                file_obj.name = clean_file_name
                                file_obj.is_deleted = False
                                file_obj.save(update_fields=['folder', 'name', 'is_deleted'])

                            successful_files.append(clean_file_name)
                    else:
                        # Single Drive File Import
                        clean_file_name = sanitize_filename(item_target.get('name', 'Drive File'))
                        source_f_id = target_id
                        existing_file = File.objects.filter(
                            name=clean_file_name,
                            folder=base_parent_folder,
                            is_deleted=False
                        ).first()

                        if existing_file and duplicate_file_strategy == 'skip':
                            continue

                        final_file_name = clean_file_name
                        if existing_file and duplicate_file_strategy == 'create_copy':
                            base_n, ext_n = os.path.splitext(clean_file_name)
                            final_file_name = f"{base_n} (copy){ext_n}"

                        try:
                            drive_result = drive_service.copy_google_drive_file(
                                source_file_id=source_f_id,
                                target_file_name=final_file_name,
                                target_parent_drive_id=destination_drive_parent_id
                            ) or {}

                            File.objects.create(
                                name=final_file_name,
                                size=drive_result.get('size', item_target.get('size', 0)),
                                file_size=drive_result.get('size', item_target.get('size', 0)),
                                file_type=os.path.splitext(final_file_name)[1].lstrip('.').upper() or 'FILE',
                                mime_type=drive_result.get('mimeType', ''),
                                folder=base_parent_folder,
                                uploaded_by=user,
                                google_file_id=drive_result.get('id'),
                                web_view_link=drive_result.get('webViewLink'),
                                web_content_link=drive_result.get('webContentLink'),
                                import_source='google_drive',
                                source_google_file_id=source_f_id
                            )
                            successful_files.append(final_file_name)
                        except Exception as file_err:
                            logger.error(f"Error copying single Google Drive file '{clean_file_name}': {file_err}")
                            failed_files.append({'name': clean_file_name, 'reason': str(file_err)})

                return Response({
                    'success': True,
                    'processed_count': len(successful_files) + len(failed_files),
                    'successful_count': len(successful_files),
                    'failed_count': len(failed_files),
                    'successful_files': successful_files,
                    'failed_files': failed_files
                }, status=status.HTTP_200_OK)

            except Exception as e:
                logger.error(f"Google Drive import error: {e}")
                return Response({'detail': f'Google Drive import execution failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            # ── MODE 1: Directory Tree Upload (Files with relative folder paths) ──
            if relative_paths and len(relative_paths) == len(uploaded_files) and any('/' in str(rp).replace('\\', '/').strip('/') for rp in relative_paths):
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
                    for uploaded_file in uploaded_files:
                        clean_f_name = sanitize_filename(uploaded_file.name)
                        target_folder = base_parent_folder
                        
                        f_content = uploaded_file.read()

                        drive_result = drive_service.upload_file(
                            file_content=f_content,
                            filename=clean_f_name,
                            mime_type=uploaded_file.content_type,
                            parent_id=target_folder.google_folder_id if target_folder else destination_drive_parent_id
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
