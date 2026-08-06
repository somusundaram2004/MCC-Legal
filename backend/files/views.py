from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
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
from django.db import transaction
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

        # Super Admin sees all files
        if user.role and user.role.name == "Super Admin":
            return File.objects.all().order_by('-updated_at')

        # Filter files by folder access
        all_folders = Folder.objects.all()
        accessible_folder_ids = [f.id for f in all_folders if f.has_access(user)]
        return File.objects.filter(folder_id__in=accessible_folder_ids).order_by('-updated_at')

    def create(self, request, *args, **kwargs):
        # Read parameters
        folder_id = request.data.get('folder_id')
        uploaded_file = request.FILES.get('file')

        if not uploaded_file:
            return Response({"file": ["No file was uploaded."]}, status=status.HTTP_400_BAD_REQUEST)

        if not folder_id or folder_id == 'null' or folder_id == 'undefined':
            # Find or create a designated "General" root folder (parent=None)
            folder = Folder.objects.filter(name="General", parent=None).first()
            if not folder:
                drive_root_id = drive_service.get_root_folder_id()
                google_id = None
                try:
                    if drive_root_id:
                        google_id = drive_service.create_folder("General", drive_root_id)
                except Exception as e:
                    logger.warning(f"Failed to create General folder on Google Drive: {e}")
                
                folder = Folder.objects.create(
                    name="General",
                    parent=None,
                    google_folder_id=google_id,
                    created_by=request.user
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
            from folders.models import FolderPermission
            explicit_perm = FolderPermission.objects.filter(user=request.user, folder=folder).first()
            if explicit_perm:
                if not explicit_perm.can_upload:
                    return Response(
                        {"detail": "You do not have upload permission on this folder."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                share_perm = get_mou_share_permission(request.user, folder)
                if share_perm == 'View Only':
                    return Response(
                        {"detail": "You only have View Only access and cannot upload files here."},
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

        try:
            if hasattr(uploaded_file, 'seek'):
                try:
                    uploaded_file.seek(0)
                except Exception:
                    pass

            sha256_hash = calculate_sha256(uploaded_file)
            virus_status = perform_virus_scan(uploaded_file)

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
                    size=size,
                    file_type=file_type,
                    folder=folder,
                    uploaded_by=request.user,
                    is_signed=is_signed_copy,
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
                logger.info(f"Triggering upload to Google Drive for file '{name}' under folder '{folder.name}' (Google Folder ID: {folder.google_folder_id})...")
                drive_metadata = drive_service.upload_file(
                    uploaded_file,
                    name,
                    file_type,
                    folder.google_folder_id
                )
                logger.info(f"Upload successful. Received metadata: {drive_metadata}")
                file_instance.google_file_id = drive_metadata['id']
                file_instance.mime_type = drive_metadata['mimeType']
                file_instance.file_size = drive_metadata['size']
                file_instance.web_view_link = drive_metadata.get('webViewLink') or drive_metadata.get('web_view_link')
                file_instance.web_content_link = drive_metadata.get('webContentLink') or drive_metadata.get('web_content_link')

                # Clean up local file copy after successful Google Drive upload to conserve server disk space
                if file_instance.file_field and os.path.exists(file_instance.file_field.path):
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
                    parsed_dt = parse_datetime(custom_created_at)
                    if parsed_dt:
                        File.objects.filter(pk=file_instance.pk).update(created_at=parsed_dt)
                        file_instance.refresh_from_db()

                # Handle signed copy folder update and notifications
                if is_signed_copy:
                    folder.status = 'Signed'
                    if summary_text:
                        folder.summary = summary_text
                    folder.save(update_fields=['status', 'summary'])

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
        except Exception as e:
            logger.exception(f"File upload view failed for '{name}' in folder '{folder.name}': {e}")
            return Response({"detail": f"Google Drive file upload failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(FileSerializer(file_instance, context={'request': request}).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        # We handle renaming files via PUT/PATCH
        file_instance = self.get_object()
        
        # Access check: user uploaded the file, created the folder, or has folder access
        can_manage = (
            file_instance.uploaded_by == request.user or
            file_instance.folder.created_by == request.user or
            file_instance.folder.has_access(request.user)
        )
        if not can_manage:
            return Response({"detail": "You do not have access to rename this file."}, status=status.HTTP_403_FORBIDDEN)
            
        old_name = file_instance.name
        new_name = request.data.get('name')
        
        if not new_name:
            return Response({"name": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                file_instance.name = new_name
                file_instance.save(update_fields=['name', 'updated_at'])

                # Sync rename to Google Drive
                if file_instance.google_file_id:
                    logger.info(f"Syncing file rename to Google Drive. File ID: '{file_instance.google_file_id}', new name: '{new_name}'...")
                    drive_service.rename_file(file_instance.google_file_id, new_name)
                    logger.info("Rename sync successful.")

                log_activity(request.user, f"Renamed file from '{old_name}' to '{new_name}'", "files", request)
        except Exception as e:
            logger.exception(f"File rename failed for file '{old_name}' (ID: {file_instance.id}) to '{new_name}': {e}")
            return Response({"detail": f"Rename sync with Google Drive failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            from folders.models import FolderPermission
            explicit_perm = FolderPermission.objects.filter(user=request.user, folder=file_instance.folder).first()
            if explicit_perm:
                if not explicit_perm.can_upload:
                    return Response(
                        {"detail": "You do not have permission to delete files in this folder."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                share_perm = get_mou_share_permission(request.user, file_instance.folder)
                if share_perm in ['View Only', 'Upload Only']:
                    return Response(
                        {"detail": "You only have read/upload access and cannot delete files here."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
        name = file_instance.name
        folder_name = file_instance.folder.name
        google_file_id = file_instance.google_file_id
        
        try:
            with transaction.atomic():
                # Delete main file from Google Drive first
                if google_file_id:
                    logger.info(f"Attempting to delete main file from Google Drive. File ID: '{google_file_id}'...")
                    try:
                        drive_service.delete_file(google_file_id)
                        logger.info("Main file deleted successfully from Google Drive.")
                    except Exception as drive_err:
                        logger.warning(f"Failed to delete file '{google_file_id}' on Google Drive: {drive_err}")

                # Delete all previous file versions from Google Drive
                for version in file_instance.versions.all():
                    if version.google_file_id:
                        logger.info(f"Attempting to delete file version {version.version_number} from Google Drive. File ID: '{version.google_file_id}'...")
                        try:
                            drive_service.delete_file(version.google_file_id)
                            logger.info(f"Version {version.version_number} deleted successfully from Google Drive.")
                        except Exception as version_err:
                            logger.warning(f"Failed to delete file version '{version.google_file_id}' on Google Drive: {version_err}")

                # Delete local database record
                folder = file_instance.folder
                file_instance.delete()

                # Revert folder status back to Active if folder is Signed but no signed files remain
                if folder.status == 'Signed':
                    remaining_signed_exists = File.objects.filter(folder=folder, is_signed=True).exists()
                    if not remaining_signed_exists:
                        folder.status = 'Active'
                        folder.save(update_fields=['status'])
                        logger.info(f"Folder '{folder.name}' status reverted back to Active as no signed files remain in it.")

                # Audit logging
                log_activity(request.user, f"Deleted file '{name}' from folder '{folder_name}'", "files", request)
                notify_admins("File Deleted", f"File '{name}' was deleted from '{folder_name}' by {request.user.name}.", metadata={'action': 'file_deleted', 'file_name': name, 'folder_name': folder_name})
        except Exception as e:
            logger.exception(f"File deletion failed for file '{name}' (ID: {file_instance.id}): {e}")
            return Response({"detail": f"Database file deletion failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        file_instance = self.get_object()
        
        # Access check: user uploaded file or has folder access
        can_view = (
            file_instance.uploaded_by == request.user or
            file_instance.folder.created_by == request.user or
            file_instance.folder.has_access(request.user)
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
        
        # Access check: user uploaded file or has folder access
        can_view = (
            file_instance.uploaded_by == request.user or
            file_instance.folder.created_by == request.user or
            file_instance.folder.has_access(request.user)
        )
        if not can_view:
            return Response({"detail": "You do not have access to preview this file."}, status=status.HTTP_403_FORBIDDEN)

        # Check if local file exists first (extremely fast and robust fallback)
        if file_instance.file_field and os.path.exists(file_instance.file_field.path):
            response = FileResponse(open(file_instance.file_field.path, 'rb'), as_attachment=False)
            response['Content-Type'] = file_instance.mime_type or file_instance.file_type
            return response

        if not file_instance.google_file_id or file_instance.google_file_id.startswith('drive_file_'):
            raise Http404("File does not exist on storage.")

        try:
            # Download file from Google Drive
            file_bytes = drive_service.download_file(file_instance.google_file_id)

            # Stream response securely
            response = FileResponse(io.BytesIO(file_bytes), as_attachment=False)
            response['Content-Type'] = file_instance.mime_type or file_instance.file_type
            
            log_activity(request.user, f"Previewed file '{file_instance.name}'", "files", request)
            return response
        except Exception as e:
            return Response({"detail": f"Failed to preview file from Google Drive: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Check if Google File ID is stored
        if not file_instance.google_file_id:
            # Fallback to local storage (for old files)
            if file_instance.file_field and os.path.exists(file_instance.file_field.path):
                response = FileResponse(open(file_instance.file_field.path, 'rb'), as_attachment=False)
                response['Content-Type'] = file_instance.file_type
                return response
            raise Http404("File does not exist on storage.")

        try:
            # Download file from Google Drive
            file_bytes = drive_service.download_file(file_instance.google_file_id)

            # Stream response securely, hiding real Google URL
            response = FileResponse(io.BytesIO(file_bytes), as_attachment=False)
            response['Content-Type'] = file_instance.mime_type or file_instance.file_type
            
            log_activity(request.user, f"Previewed file '{file_instance.name}'", "files", request)
            return response
        except Exception as e:
            return Response({"detail": f"Failed to preview file from Google Drive: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            from folders.models import FolderPermission
            explicit_perm = FolderPermission.objects.filter(user=request.user, folder=file_instance.folder).first()
            if explicit_perm:
                if not explicit_perm.can_upload:
                    return Response(
                        {"detail": "You do not have permission to replace files in this folder."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                share_perm = get_mou_share_permission(request.user, file_instance.folder)
                if share_perm in ['View Only', 'Upload Only']:
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

                # Clean up local file copy after successful Google Drive upload to conserve server disk space
                if file_instance.file_field and os.path.exists(file_instance.file_field.path):
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
                    parsed_dt = parse_datetime(custom_created_at)
                    if parsed_dt:
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

        try:
            with transaction.atomic():
                if item_type == 'file':
                    file_instance = get_object_or_404(File, id=item_id)
                    if not file_instance.folder.has_access(request.user):
                        return Response({"detail": "You do not have access to the source file."}, status=status.HTTP_403_FORBIDDEN)

                    # Share permission check
                    is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
                    if not is_admin:
                        src_perm = get_mou_share_permission(request.user, file_instance.folder)
                        if src_perm in ['View Only', 'Upload Only']:
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
