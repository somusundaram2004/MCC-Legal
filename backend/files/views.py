from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import FileResponse, HttpResponse, Http404
from django.contrib.auth import get_user_model
from permissions.custom_permissions import HasDynamicPermission, get_user_permissions
from activity_logs.utils import log_activity
from notifications.utils import create_notification, notify_admins
from folders.models import Folder, get_mou_share_permission
from .models import File, FileVersion
from .serializers import FileSerializer, FileVersionSerializer
import mimetypes
import os
import io
import html
from django.db import transaction
from django.utils import timezone
from services import drive_service
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

def has_explicit_permission_grant(user, codename):
    from users.models import UserPermission
    return UserPermission.objects.filter(user=user, permission__codename=codename, is_granted=True).exists()

import hashlib

def calculate_sha256(uploaded_file):
    sha256 = hashlib.sha256()
    if hasattr(uploaded_file, 'seek'):
        try:
            uploaded_file.seek(0)
        except Exception:
            pass
    for chunk in uploaded_file.chunks():
        sha256.update(chunk)
    if hasattr(uploaded_file, 'seek'):
        try:
            uploaded_file.seek(0)
        except Exception:
            pass
    return sha256.hexdigest()

def perform_virus_scan(uploaded_file):
    # Static extension check for potential security threats
    name = getattr(uploaded_file, 'name', '').lower()
    if name.endswith(('.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.scr', '.pif')):
        return 'Threat Detected'
    return 'Clean'

class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [HasDynamicPermission]

    # Map actions to dynamic permissions
    action_permissions = {
        'list': 'view_folder',
        'retrieve': 'view_folder',
        'update': 'replace_files',  # Using replace_files for renaming
        'partial_update': 'replace_files',
        'destroy': 'delete_files',
        'download': 'download_files',
        'preview': 'preview_files',
        'replace': 'replace_files',
    }

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return File.objects.none()

        base_qs = File.objects.filter(is_deleted=False)

        # Super Admin sees all active files
        if user.role and user.role.name == "Super Admin":
            return base_qs.order_by('-updated_at')

        # Filter files by folder access
        all_folders = Folder.objects.filter(is_deleted=False)
        accessible_folder_ids = [f.id for f in all_folders if f.has_access(user)]
        return base_qs.filter(folder_id__in=accessible_folder_ids).order_by('-updated_at')

    def retrieve(self, request, *args, **kwargs):
        file_id = kwargs.get('pk')
        try:
            instance = File.objects.get(pk=file_id, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not instance.folder.has_access(request.user):
            return Response(
                {"detail": "You do not have permission to access this document."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        file_id = kwargs.get('pk')
        try:
            instance = File.objects.get(pk=file_id, is_deleted=False)
        except File.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not instance.folder.has_access(request.user):
            return Response(
                {"detail": "You do not have permission to access this document."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        # Read parameters
        folder_id = request.data.get('folder_id')
        uploaded_file = request.FILES.get('file')

        if not uploaded_file:
            return Response({"file": ["No file was uploaded."]}, status=status.HTTP_400_BAD_REQUEST)

        if not folder_id or folder_id == 'null' or folder_id == 'undefined':
            custom_page_id = request.data.get('custom_page_id')
            folder = None
            if custom_page_id:
                from users.models import CustomDynamicPage
                cp = CustomDynamicPage.objects.filter(id=custom_page_id).first()
                if cp and cp.root_folder_id:
                    folder = Folder.objects.filter(id=int(cp.root_folder_id), is_deleted=False).first()
                if not folder and cp:
                    drive_id = drive_service.get_or_create_module_folder_id(cp)
                    folder, _ = Folder.objects.get_or_create(
                        name=cp.title,
                        parent=None,
                        module_type='custom_page',
                        custom_page=cp,
                        is_deleted=False,
                        defaults={'google_folder_id': drive_id}
                    )
            if not folder:
                mou_drive_id = drive_service.get_or_create_mou_repository_folder_id()
                folder = Folder.objects.filter(name="MOU Repository", module_type='mou_repository', parent=None, is_deleted=False).first()
                if not folder:
                    folder, _ = Folder.objects.get_or_create(
                        name="MOU Repository",
                        parent=None,
                        module_type='mou_repository',
                        custom_page=None,
                        is_deleted=False,
                        defaults={'google_folder_id': mou_drive_id}
                    )
        else:
            folder = get_object_or_404(Folder, id=folder_id)

        # Check user access to parent folder
        if not folder.has_access(request.user):
            return Response(
                {"detail": "You do not have access to this folder."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Share permission restriction (unless user created the folder)
        is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
        if not is_admin and folder.created_by != request.user:
            perm_level = folder.get_user_permission_level(request.user)
            if perm_level in [None, 'view']:
                return Response(
                    {"detail": "You do not have upload permission on this folder."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Extract file info
        name = uploaded_file.name
        size = uploaded_file.size
        # Guess mime type
        file_type, _ = mimetypes.guess_type(name)
        if not file_type:
            file_type = "application/octet-stream"

        is_signed_copy = request.data.get('is_signed') == 'true'
        summary_text = request.data.get('summary', '')
        title_val = (request.data.get('title') or '').strip()
        description_val = (request.data.get('description') or summary_text or '').strip()
        department_val = (request.data.get('department') or '').strip()
        start_date_val = request.data.get('start_date') or request.data.get('effective_date')
        expiry_date_val = request.data.get('expiry_date')
        signed_date_val = request.data.get('signed_date')

        from datetime import date
        parsed_start_date = None
        parsed_expiry_date = None
        parsed_signed_date = None

        if start_date_val and str(start_date_val).strip() and str(start_date_val).strip() != 'null':
            try:
                parsed_start_date = date.fromisoformat(str(start_date_val).strip()[:10])
            except Exception as dt_err:
                logger.warning(f"Could not parse start_date '{start_date_val}': {dt_err}")

        if expiry_date_val and str(expiry_date_val).strip() and str(expiry_date_val).strip() != 'null':
            try:
                parsed_expiry_date = date.fromisoformat(str(expiry_date_val).strip()[:10])
            except Exception as dt_err:
                logger.warning(f"Could not parse expiry_date '{expiry_date_val}': {dt_err}")

        if signed_date_val and str(signed_date_val).strip() and str(signed_date_val).strip() != 'null':
            try:
                parsed_signed_date = date.fromisoformat(str(signed_date_val).strip()[:10])
            except Exception as dt_err:
                logger.warning(f"Could not parse signed_date '{signed_date_val}': {dt_err}")

        # Validation: Reject expiry date earlier than start date
        if parsed_start_date and parsed_expiry_date and parsed_expiry_date < parsed_start_date:
            return Response(
                {"expiry_date": ["Expiry date cannot be earlier than start date."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if hasattr(uploaded_file, 'seek'):
                try:
                    uploaded_file.seek(0)
                except Exception:
                    pass

            sha256_hash = calculate_sha256(uploaded_file)
            virus_status = perform_virus_scan(uploaded_file)
            if virus_status == 'Threat Detected':
                return Response(
                    {"detail": f"File '{name}' was rejected due to suspicious executable file extension."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Detect duplicate uploads in the same folder
            duplicate = File.objects.filter(folder=folder, sha256_hash=sha256_hash).first()
            if duplicate:
                return Response(

                    {"detail": f"Duplicate upload detected. The file '{name}' has the exact same content as the existing file '{duplicate.name}' in this folder."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                file_instance = File.objects.create(
                    name=name,
                    title=title_val or None,
                    description=description_val or None,
                    department=department_val or None,
                    size=size,
                    file_type=file_type,
                    folder=folder,
                    uploaded_by=request.user,
                    is_signed=is_signed_copy,
                    start_date=parsed_start_date,
                    signed_date=parsed_signed_date,
                    expiry_date=parsed_expiry_date,
                    file_field=uploaded_file,
                    sha256_hash=sha256_hash,
                    virus_scan_status=virus_status,
                    encrypted=True,
                    encryption_key_id='Google-Drive-AES-256'
                )

                if hasattr(uploaded_file, 'seek'):
                    try:
                        uploaded_file.seek(0)
                    except Exception:
                        pass

                # Mandatory Google Drive Upload
                target_google_folder_id = folder.google_folder_id
                master_root_id = drive_service.get_root_folder_id()

                if not target_google_folder_id or (master_root_id and target_google_folder_id.strip() == master_root_id.strip()):
                    if folder.custom_page:
                        target_google_folder_id = drive_service.get_or_create_module_folder_id(folder.custom_page)
                    elif folder.module_type == 'mou_repository':
                        target_google_folder_id = drive_service.get_or_create_mou_repository_folder_id()

                logger.info(f"Triggering upload to Google Drive for file '{name}' under folder '{folder.name}' (Google Folder ID: {target_google_folder_id})...")
                drive_metadata = drive_service.upload_file(
                    uploaded_file,
                    name,
                    file_type,
                    target_google_folder_id
                )

                logger.info(f"Upload successful. Received metadata: {drive_metadata}")
                file_instance.google_file_id = drive_metadata['id']
                file_instance.mime_type = drive_metadata['mimeType']
                file_instance.file_size = drive_metadata['size']
                file_instance.web_view_link = drive_metadata.get('webViewLink') or drive_metadata.get('web_view_link')
                file_instance.web_content_link = drive_metadata.get('webContentLink') or drive_metadata.get('web_content_link')

                # Clean up local file copy ONLY after genuine Google Drive upload (never for fallback/disconnected mode)
                if not file_instance.google_file_id.startswith('drive_file_') and file_instance.file_field and os.path.exists(file_instance.file_field.path):
                    try:
                        file_path = file_instance.file_field.path
                        file_instance.file_field = None
                        os.remove(file_path)
                        logger.info(f"Cleaned up local cached file '{file_path}' to conserve server disk space.")
                    except Exception as clean_err:
                        logger.warning(f"Failed to remove local cached file: {clean_err}")

                file_instance.save(update_fields=[
                    'google_file_id', 'mime_type', 'file_size',
                    'web_view_link', 'web_content_link', 'file_field'
                ])

                # Support custom creation date/time
                custom_created_at = request.data.get('created_at')
                if custom_created_at:
                    from django.utils.dateparse import parse_datetime
                    from django.utils import timezone
                    parsed_dt = parse_datetime(custom_created_at)
                    if parsed_dt:
                        if timezone.is_naive(parsed_dt):
                            parsed_dt = timezone.make_aware(parsed_dt)
                        File.objects.filter(pk=file_instance.pk).update(created_at=parsed_dt)
                        file_instance.refresh_from_db()

                # Handle signed copy folder update and notifications
                if is_signed_copy:
                    folder.status = 'Signed'
                    if summary_text or description_val:
                        folder.summary = summary_text or description_val
                    if parsed_signed_date:
                        folder.signed_date = parsed_signed_date
                    if parsed_expiry_date:
                        folder.expiry_date = parsed_expiry_date
                    
                    folder_update_fields = ['status']
                    if summary_text or description_val:
                        folder_update_fields.append('summary')
                    if parsed_signed_date:
                        folder_update_fields.append('signed_date')
                    if parsed_expiry_date:
                        folder_update_fields.append('expiry_date')
                    folder.save(update_fields=folder_update_fields)

                # Log & Notify
                log_activity(request.user, f"Uploaded file '{name}' to folder '{folder.name}'", "files", request)
                
                if is_signed_copy:
                    notify_admins(
                        "Signed Copy Uploaded",
                        f"User {request.user.name} uploaded a signed copy to folder '{folder.name}'. Summary: {summary_text}",
                        metadata={'action': 'folder_signed_upload', 'folder_id': folder.id, 'summary': summary_text}
                    )
                else:
                    notify_admins("File Uploaded", f"File '{name}' was uploaded to '{folder.name}' by {request.user.name}.", metadata={'action': 'file_uploaded', 'file_id': file_instance.id, 'file_name': file_instance.name, 'folder_id': folder.id, 'folder_name': folder.name})

                # Notify users who have access to this shared folder (excluding uploader)
                from folders.models import FolderPermission
                folder_perms = FolderPermission.objects.filter(folder=folder, is_granted=True).exclude(user=request.user)
                for fp in folder_perms:
                    create_notification(
                        fp.user,
                        "New File Uploaded",
                        f"File '{name}' was uploaded to folder '{folder.name}'.",
                        metadata={'action': 'file_uploaded', 'file_id': file_instance.id, 'file_name': file_instance.name, 'folder_id': folder.id, 'folder_name': folder.name}
                    )
        except Exception as e:
            logger.exception(f"File upload view failed for '{name}' in folder '{folder.name}': {e}")
            return Response({"detail": f"Google Drive file upload failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(FileSerializer(file_instance, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        # We handle renaming and metadata/validity updates via PUT/PATCH
        file_instance = self.get_object()
        
        # Access check: Super Admin / Admin, folder creator, or user with 'edit'/'manage' permission
        is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
        is_folder_creator = file_instance.folder and file_instance.folder.created_by == request.user
        perm_level = file_instance.folder.get_user_permission_level(request.user) if file_instance.folder else None

        can_edit = is_admin or is_folder_creator or (perm_level in ['edit', 'manage'])
        if not can_edit:
            return Response({"detail": "You do not have permission to edit this file or its metadata."}, status=status.HTTP_403_FORBIDDEN)
            
        old_name = file_instance.name
        new_name = request.data.get('name', old_name)
        new_title = request.data.get('title')
        new_description = request.data.get('description')
        start_date_val = request.data.get('start_date')
        expiry_date_val = request.data.get('expiry_date')

        from datetime import date
        parsed_start_date = file_instance.start_date
        parsed_expiry_date = file_instance.expiry_date

        if start_date_val is not None:
            if str(start_date_val).strip() in ['', 'null']:
                parsed_start_date = None
            else:
                try:
                    parsed_start_date = date.fromisoformat(str(start_date_val).strip()[:10])
                except Exception as dt_err:
                    return Response({"start_date": ["Invalid start date format."]}, status=status.HTTP_400_BAD_REQUEST)

        if expiry_date_val is not None:
            if str(expiry_date_val).strip() in ['', 'null']:
                parsed_expiry_date = None
            else:
                try:
                    parsed_expiry_date = date.fromisoformat(str(expiry_date_val).strip()[:10])
                except Exception as dt_err:
                    return Response({"expiry_date": ["Invalid expiry date format."]}, status=status.HTTP_400_BAD_REQUEST)

        # Validation: Reject expiry date earlier than start date
        if parsed_start_date and parsed_expiry_date and parsed_expiry_date < parsed_start_date:
            return Response(
                {"expiry_date": ["Expiry date cannot be earlier than start date."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                update_fields = ['updated_at']
                if new_name and new_name != old_name:
                    file_instance.name = new_name
                    update_fields.append('name')
                    # Sync rename to Google Drive
                    if file_instance.google_file_id:
                        logger.info(f"Syncing file rename to Google Drive. File ID: '{file_instance.google_file_id}', new name: '{new_name}'...")
                        drive_service.rename_file(file_instance.google_file_id, new_name)
                        logger.info("Rename sync successful.")
                    log_activity(request.user, f"Renamed file from '{old_name}' to '{new_name}'", "files", request)

                if new_title is not None:
                    file_instance.title = new_title.strip() or None
                    update_fields.append('title')
                if new_description is not None:
                    file_instance.description = new_description.strip() or None
                    update_fields.append('description')
                if 'department' in request.data:
                    file_instance.department = (request.data.get('department') or '').strip() or None
                    update_fields.append('department')
                if 'is_signed' in request.data:
                    file_instance.is_signed = str(request.data.get('is_signed')).lower() == 'true'
                    update_fields.append('is_signed')
                if 'department' in request.data:
                    file_instance.department = (request.data.get('department') or '').strip() or None
                    update_fields.append('department')
                if 'is_signed' in request.data:
                    file_instance.is_signed = str(request.data.get('is_signed')).lower() == 'true'
                    update_fields.append('is_signed')
                if start_date_val is not None:
                    file_instance.start_date = parsed_start_date
                    update_fields.append('start_date')
                if expiry_date_val is not None:
                    file_instance.expiry_date = parsed_expiry_date
                    update_fields.append('expiry_date')

                file_instance.save(update_fields=update_fields)
                log_activity(request.user, f"Updated file metadata for '{file_instance.name}'", "files", request)
        except Exception as e:
            logger.exception(f"File update failed for file '{old_name}' (ID: {file_instance.id}): {e}")
            return Response({"detail": f"File update failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(FileSerializer(file_instance, context={'request': request}).data)

    def destroy(self, request, *args, **kwargs):
        file_instance = self.get_object()
        
        # Access check: user uploaded the file, created the folder, or has folder access
        can_manage = (
            file_instance.uploaded_by == request.user or
            file_instance.folder.created_by == request.user or
            file_instance.folder.has_access(request.user)
        )
        if not can_manage:
            return Response({"detail": "You do not have access to delete this file."}, status=status.HTTP_403_FORBIDDEN)
            
        # Share permission restriction (unless user created the folder)
        is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
        if not is_admin and file_instance.folder.created_by != request.user:
            perm_level = file_instance.folder.get_user_permission_level(request.user)
            if perm_level in [None, 'view']:
                return Response(
                    {"detail": "You do not have permission to delete files in this folder."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
        name = file_instance.name
        folder_name = file_instance.folder.name
        now = timezone.now()
        
        try:
            with transaction.atomic():
                file_instance.is_deleted = True
                file_instance.deleted_at = now
                file_instance.deleted_by = request.user
                file_instance.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

                # Revert folder status back to Active if folder is Signed but no active signed files remain
                folder = file_instance.folder
                if folder.status == 'Signed':
                    remaining_signed_exists = File.objects.filter(folder=folder, is_signed=True, is_deleted=False).exists()
                    if not remaining_signed_exists:
                        folder.status = 'Active'
                        folder.save(update_fields=['status'])
                        logger.info(f"Folder '{folder.name}' status reverted back to Active as no signed files remain in it.")

                # Audit logging
                log_activity(request.user, f"Moved file '{name}' to Recycle Bin", "files", request)
                notify_admins("File Moved to Recycle Bin", f"File '{name}' was moved to Recycle Bin from '{folder_name}' by {request.user.name}.", metadata={'action': 'file_deleted', 'file_name': name, 'folder_name': folder_name})
        except Exception as e:
            logger.exception(f"Moving file to Recycle Bin failed for file '{name}' (ID: {file_instance.id}): {e}")
            return Response({"detail": f"Moving file to Recycle Bin failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        file_instance = self.get_object()
        
        # Access check: user is admin/superuser, uploaded the file, or has folder access
        can_view = (
            request.user.is_superuser or
            (request.user.role and request.user.role.name in ["Super Admin", "Admin"]) or
            file_instance.uploaded_by == request.user or
            (file_instance.folder and (
                file_instance.folder.created_by == request.user or
                file_instance.folder.has_access(request.user)
            ))
        )
        if not can_view:
            return Response({"detail": "You do not have access to download this file."}, status=status.HTTP_403_FORBIDDEN)

        # Check if local file exists first (extremely fast and robust fallback)
        if file_instance.file_field and os.path.exists(file_instance.file_field.path):
            response = FileResponse(open(file_instance.file_field.path, 'rb'), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{file_instance.name}"'
            response['Content-Type'] = file_instance.mime_type or file_instance.file_type
            return response

        if not file_instance.google_file_id or file_instance.google_file_id.startswith('drive_file_'):
            raise Http404("File does not exist on storage.")

        try:
            # Download file from Google Drive
            file_bytes = drive_service.download_file(file_instance.google_file_id)

            # Stream response securely
            response = FileResponse(io.BytesIO(file_bytes), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{file_instance.name}"'
            response['Content-Type'] = file_instance.mime_type or file_instance.file_type
            
            log_activity(request.user, f"Downloaded file '{file_instance.name}'", "files", request)
            return response
        except Exception as e:
            return Response({"detail": f"Failed to download file from Google Drive: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        file_instance = self.get_object()
        
        # Access check: user is admin/superuser, uploaded the file, or has folder access
        can_view = (
            request.user.is_superuser or
            (request.user.role and request.user.role.name in ["Super Admin", "Admin"]) or
            file_instance.uploaded_by == request.user or
            (file_instance.folder and (
                file_instance.folder.created_by == request.user or
                file_instance.folder.has_access(request.user)
            ))
        )
        if not can_view:
            return Response({"detail": "You do not have access to preview this file."}, status=status.HTTP_403_FORBIDDEN)

        fname_lower = file_instance.name.lower()
        is_pdf = fname_lower.endswith('.pdf') or (file_instance.mime_type == 'application/pdf')
        is_docx = fname_lower.endswith('.docx') or (file_instance.mime_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        is_doc = fname_lower.endswith('.doc') or (file_instance.mime_type == 'application/msword')

        def render_docx_stream(stream):
            try:
                import docx
                doc = docx.Document(stream)
                html_parts = [
                    '<!DOCTYPE html><html><head><meta charset="utf-8">',
                    f'<title>{html.escape(file_instance.name)}</title>',
                    '<style>',
                    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #1e293b; line-height: 1.6; }',
                    '.doc-container { max-width: 850px; margin: 0 auto; background: #ffffff; padding: 40px 48px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }',
                    'h1, h2, h3, h4, h5, h6 { color: #0f172a; margin-top: 1.4em; margin-bottom: 0.6em; font-weight: 700; line-height: 1.25; }',
                    'h1 { font-size: 1.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }',
                    'h2 { font-size: 1.4rem; }',
                    'h3 { font-size: 1.15rem; }',
                    'p { margin: 0.7em 0; min-height: 1.2em; font-size: 0.95rem; }',
                    'table { border-collapse: collapse; width: 100%; margin: 1.5em 0; font-size: 0.9rem; }',
                    'th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }',
                    'th { background-color: #f1f5f9; font-weight: 600; color: #334155; }',
                    'strong { font-weight: 600; }',
                    '</style></head><body>',
                    '<div class="doc-container">',
                    f'<div style="border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;"><span style="font-weight: 700; color: #2563eb; font-size: 1.1rem;">📄 {html.escape(file_instance.name)}</span><span style="font-size: 0.8rem; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">Microsoft Word Preview</span></div>'
                ]
                for p in doc.paragraphs:
                    if not p.text.strip():
                        html_parts.append('<p>&nbsp;</p>')
                        continue
                    p_style_name = getattr(p.style, 'name', '') or ''
                    if p_style_name.startswith('Heading'):
                        lvl = p_style_name.replace('Heading', '').strip()
                        tag = f'h{lvl}' if lvl in ['1', '2', '3', '4', '5', '6'] else 'h2'
                        html_parts.append(f'<{tag}>{html.escape(p.text)}</{tag}>')
                        continue
                    runs_html = []
                    for run in p.runs:
                        t = html.escape(run.text)
                        if run.bold:
                            t = f'<strong>{t}</strong>'
                        if run.italic:
                            t = f'<em>{t}</em>'
                        if run.underline:
                            t = f'<u>{t}</u>'
                        runs_html.append(t)
                    html_parts.append(f'<p>{"".join(runs_html)}</p>')
                for table in doc.tables:
                    html_parts.append('<table>')
                    for row_idx, row in enumerate(table.rows):
                        html_parts.append('<tr>')
                        for cell in row.cells:
                            cell_tag = 'th' if row_idx == 0 else 'td'
                            html_parts.append(f'<{cell_tag}>{html.escape(cell.text)}</{cell_tag}>')
                        html_parts.append('</tr>')
                    html_parts.append('</table>')
                html_parts.append('</div></body></html>')
                return "".join(html_parts)
            except Exception as docx_err:
                logger.error(f"Docx HTML conversion error: {docx_err}")
                return f'<!DOCTYPE html><html><body style="font-family: sans-serif; padding: 40px; text-align: center;"><p>Could not render document content: {html.escape(str(docx_err))}</p></body></html>'

        # 1. Local file on disk
        if file_instance.file_field and os.path.exists(file_instance.file_field.path):
            if is_docx:
                with open(file_instance.file_field.path, 'rb') as f:
                    html_content = render_docx_stream(f)
                log_activity(request.user, f"Previewed Word document '{file_instance.name}'", "files", request)
                return HttpResponse(html_content, content_type='text/html; charset=utf-8')

            mime = 'application/pdf' if is_pdf else (file_instance.mime_type or file_instance.file_type or 'application/octet-stream')
            response = FileResponse(open(file_instance.file_field.path, 'rb'), as_attachment=False)
            response['Content-Type'] = mime
            response['Content-Disposition'] = f'inline; filename="{file_instance.name}"'
            log_activity(request.user, f"Previewed file '{file_instance.name}'", "files", request)
            return response

        # 2. Google Drive file
        if file_instance.google_file_id and not file_instance.google_file_id.startswith('drive_file_'):
            try:
                file_bytes = drive_service.download_file(file_instance.google_file_id)
                if is_docx:
                    html_content = render_docx_stream(io.BytesIO(file_bytes))
                    log_activity(request.user, f"Previewed Word document '{file_instance.name}'", "files", request)
                    return HttpResponse(html_content, content_type='text/html; charset=utf-8')

                mime = 'application/pdf' if is_pdf else (file_instance.mime_type or file_instance.file_type or 'application/octet-stream')
                response = FileResponse(io.BytesIO(file_bytes), as_attachment=False)
                response['Content-Type'] = mime
                response['Content-Disposition'] = f'inline; filename="{file_instance.name}"'
                log_activity(request.user, f"Previewed file '{file_instance.name}'", "files", request)
                return response
            except Exception as e:
                logger.error(f"Failed to preview file from Google Drive: {e}")
                return Response({"detail": f"Failed to preview file from Google Drive: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        raise Http404("File does not exist on storage.")

    @action(detail=True, methods=['post'])
    def replace(self, request, pk=None):
        """
        Replaces the current file. The current file is archived in FileVersion,
        and the main File object is updated with the new upload.
        """
        file_instance = self.get_object()
        uploaded_file = request.FILES.get('file')

        if not file_instance.folder.has_access(request.user):
            return Response({"detail": "You do not have access to this file's folder."}, status=status.HTTP_403_FORBIDDEN)

        # Share permission restriction
        is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
        if not is_admin:
            perm_level = file_instance.folder.get_user_permission_level(request.user)
            if perm_level in [None, 'view']:
                return Response(
                    {"detail": "You do not have permission to replace files in this folder."},
                    status=status.HTTP_403_FORBIDDEN
                )

        if not uploaded_file:
            return Response({"file": ["No replacement file was uploaded."]}, status=status.HTTP_400_BAD_REQUEST)

        # Extract file info
        name = uploaded_file.name
        size = uploaded_file.size
        file_type, _ = mimetypes.guess_type(name)
        if not file_type:
            file_type = "application/octet-stream"

        try:
            if hasattr(uploaded_file, 'seek'):
                try:
                    uploaded_file.seek(0)
                except Exception:
                    pass

            sha256_hash = calculate_sha256(uploaded_file)
            virus_status = perform_virus_scan(uploaded_file)

            # Detect duplicate uploads in the same folder (excluding the file itself)
            duplicate = File.objects.filter(folder=file_instance.folder, sha256_hash=sha256_hash).exclude(pk=file_instance.pk).first()
            if duplicate:
                return Response(
                    {"detail": f"Duplicate upload detected. A file with the same content already exists: '{duplicate.name}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                # 1. Archive the current file version to FileVersion database table
                FileVersion.objects.create(
                    file=file_instance,
                    version_number=file_instance.version_number,
                    name=file_instance.name,
                    size=file_instance.size,
                    file_type=file_instance.file_type,
                    uploaded_by=file_instance.uploaded_by,
                    google_file_id=file_instance.google_file_id,
                    file_field=file_instance.file_field,
                    sha256_hash=file_instance.sha256_hash,
                    virus_scan_status=file_instance.virus_scan_status,
                    encrypted=file_instance.encrypted,
                    encryption_key_id=file_instance.encryption_key_id
                )

                if hasattr(uploaded_file, 'seek'):
                    try:
                        uploaded_file.seek(0)
                    except Exception:
                        pass

                # 2. Upload new version file to Google Drive under the parent folder
                logger.info(f"Triggering replacement file upload to Google Drive. File: '{name}', folder: '{file_instance.folder.name}' (Google Folder ID: {file_instance.folder.google_folder_id})...")
                drive_metadata = drive_service.upload_file(
                    uploaded_file, 
                    name, 
                    file_type, 
                    file_instance.folder.google_folder_id
                )
                logger.info(f"Replacement file upload successful. Metadata: {drive_metadata}")

                # 3. Update File instance with new info
                file_instance.name = name
                file_instance.size = size
                file_instance.file_type = file_type
                file_instance.uploaded_by = request.user
                file_instance.version_number += 1
                file_instance.file_field = uploaded_file
                
                file_instance.google_file_id = drive_metadata['id']
                file_instance.mime_type = drive_metadata['mimeType']
                file_instance.file_size = drive_metadata['size']
                file_instance.web_view_link = drive_metadata.get('webViewLink') or drive_metadata.get('web_view_link')
                file_instance.web_content_link = drive_metadata.get('webContentLink') or drive_metadata.get('web_content_link')
                
                # Update security fields
                file_instance.sha256_hash = sha256_hash
                file_instance.virus_scan_status = virus_status
                file_instance.save()

                # Clean up local file copy ONLY after genuine Google Drive upload (never for fallback/disconnected mode)
                if not file_instance.google_file_id.startswith('drive_file_') and file_instance.file_field and os.path.exists(file_instance.file_field.path):
                    try:
                        file_path = file_instance.file_field.path
                        file_instance.file_field = None
                        os.remove(file_path)
                        file_instance.save(update_fields=['file_field'])
                        logger.info(f"Cleaned up local replacement file '{file_path}' to conserve server disk space.")
                    except Exception as clean_err:
                        logger.warning(f"Failed to remove local replacement file: {clean_err}")

                # Support custom creation date/time
                custom_created_at = request.data.get('created_at')
                if custom_created_at:
                    from django.utils.dateparse import parse_datetime
                    from django.utils import timezone
                    parsed_dt = parse_datetime(custom_created_at)
                    if parsed_dt:
                        if timezone.is_naive(parsed_dt):
                            parsed_dt = timezone.make_aware(parsed_dt)
                        File.objects.filter(pk=file_instance.pk).update(created_at=parsed_dt)
                        file_instance.refresh_from_db()
                        latest_version = FileVersion.objects.filter(file=file_instance).order_by('-version_number').first()
                        if latest_version:
                            FileVersion.objects.filter(pk=latest_version.pk).update(created_at=parsed_dt)

                # Log & Notify
                log_activity(request.user, f"Replaced file '{file_instance.name}' (New Version: v{file_instance.version_number})", "files", request)
                notify_admins("File Updated", f"File '{file_instance.name}' was replaced with version {file_instance.version_number} by {request.user.name}.", metadata={'action': 'file_replaced', 'file_id': file_instance.id, 'file_name': file_instance.name, 'folder_id': file_instance.folder.id, 'folder_name': file_instance.folder.name})
        except Exception as e:
            logger.exception(f"File replacement failed for file '{file_instance.name}' (ID: {file_instance.id}): {e}")
            return Response({"detail": f"File replacement with Google Drive failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(FileSerializer(file_instance, context={'request': request}).data)

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_custom(self, request):
        """
        Maps to POST /api/files/upload/
        """
        return self.create(request)

    @action(detail=True, methods=['put'], url_path='rename')
    def rename_custom(self, request, pk=None):
        """
        Maps to PUT /api/files/<id>/rename/
        """
        return self.update(request, pk=pk)

    @action(detail=False, methods=['post'], url_path='move')
    def move_custom(self, request):
        """
        Maps to POST /api/files/move/
        """
        item_type = request.data.get('item_type')  # 'file' or 'folder'
        item_id = request.data.get('item_id')
        new_parent_id = request.data.get('new_parent_id')  # local Folder ID

        if not item_type or not item_id or not new_parent_id:
            return Response({
                "item_type": ["This field is required."],
                "item_id": ["This field is required."],
                "new_parent_id": ["This field is required."]
            }, status=status.HTTP_400_BAD_REQUEST)

        new_parent = get_object_or_404(Folder, id=new_parent_id)
        if not new_parent.has_access(request.user):
            return Response({"detail": "You do not have access to the target folder."}, status=status.HTTP_403_FORBIDDEN)

        is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
        if not is_admin and new_parent.created_by != request.user:
            dest_perm = new_parent.get_user_permission_level(request.user)
            if dest_perm in [None, 'view']:
                return Response({"detail": "You do not have permission to add files to the destination folder."}, status=status.HTTP_403_FORBIDDEN)

        try:
            with transaction.atomic():
                if item_type == 'file':
                    file_instance = get_object_or_404(File, id=item_id)
                    if not file_instance.folder.has_access(request.user):
                        return Response({"detail": "You do not have access to the source file."}, status=status.HTTP_403_FORBIDDEN)

                    # Source folder edit permission check
                    if not is_admin and file_instance.folder.created_by != request.user:
                        src_perm = file_instance.folder.get_user_permission_level(request.user)
                        if src_perm in [None, 'view', 'upload']:
                            return Response({"detail": "You do not have permission to move files from the source folder."}, status=status.HTTP_403_FORBIDDEN)

                    # Move file in Google Drive
                    if file_instance.google_file_id and new_parent.google_folder_id:
                        logger.info(f"Syncing file move to Google Drive. File ID: '{file_instance.google_file_id}' to target folder ID: '{new_parent.google_folder_id}'...")
                        drive_service.move_file(file_instance.google_file_id, new_parent.google_folder_id)
                        logger.info("File move sync successful.")

                    # Update database reference
                    file_instance.folder = new_parent
                    file_instance.save(update_fields=['folder', 'updated_at'])

                    log_activity(request.user, f"Moved file '{file_instance.name}' to folder '{new_parent.name}'", "files", request)
                    return Response(FileSerializer(file_instance, context={'request': request}).data)

                elif item_type == 'folder':
                    folder_instance = get_object_or_404(Folder, id=item_id)
                    if not folder_instance.has_access(request.user):
                        return Response({"detail": "You do not have access to the source folder."}, status=status.HTTP_403_FORBIDDEN)

                    # Share permission check
                    is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
                    if not is_admin:
                        src_perm = get_mou_share_permission(request.user, folder_instance)
                        if src_perm in ['View Only', 'Upload Only']:
                            return Response({"detail": "You do not have permission to move folders from the source folder."}, status=status.HTTP_403_FORBIDDEN)

                    # Move folder in Google Drive
                    if folder_instance.google_folder_id and new_parent.google_folder_id:
                        logger.info(f"Syncing folder move to Google Drive. Folder ID: '{folder_instance.google_folder_id}' to target parent ID: '{new_parent.google_folder_id}'...")
                        drive_service.move_file(folder_instance.google_folder_id, new_parent.google_folder_id)
                        logger.info("Folder move sync successful.")

                    # Update database reference
                    folder_instance.parent = new_parent
                    folder_instance.save(update_fields=['parent', 'updated_at'])

                    log_activity(request.user, f"Moved folder '{folder_instance.name}' to parent folder '{new_parent.name}'", "folders", request)
                    return Response(FolderSerializer(folder_instance).data)
                else:
                    return Response({"item_type": ["Invalid value. Must be 'file' or 'folder'."]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception(f"Item move failed (Item: {item_type}, ID: {item_id}) to new parent ID {new_parent_id}: {e}")
            return Response({"detail": f"Move sync with Google Drive failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
