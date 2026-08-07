from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
User = get_user_model()
from permissions.custom_permissions import HasDynamicPermission
from activity_logs.utils import log_activity
from notifications.utils import create_notification, notify_admins
from .models import Folder, FolderPermission, get_mou_share_permission
from .serializers import FolderSerializer, FolderPermissionSerializer
from files.serializers import FileSerializer # For listing files in folder
from django.db import transaction
from django.utils import timezone
from services import drive_service
import logging

logger = logging.getLogger(__name__)

def sync_drive_directory(parent_google_id=None, parent_folder_obj=None, user=None):
    """
    Fetches live folders & files from Google Drive under parent_google_id and syncs them to the DB.
    """
    from django.conf import settings
    from files.models import File
    
    if not parent_google_id:
        parent_google_id = drive_service.get_root_folder_id()
        
    if not parent_google_id:
        return

    try:
        items = drive_service.list_folder_contents(parent_google_id)
        for item in items:
            item_id = item.get('id')
            item_name = item.get('name')
            mime_type = item.get('mimeType')
            
            # Skip deleted legacy drive folders that cannot be removed from Google Drive root due to permissions
            if item_id in ['1bsme27EZ04QwaaHwWxPlaoHQWxA7iAUk', '1tgwbp0b9aYOnmXSUvIo8rRz69wmpYbf5'] or item_name in ['MCA (Comuputer Application)', 'Jeff2']:
                continue
            
            if mime_type == 'application/vnd.google-apps.folder':
                folder_obj, created = Folder.objects.get_or_create(
                    google_folder_id=item_id,
                    defaults={'name': item_name, 'parent': parent_folder_obj, 'created_by': user}
                )
                if not created and (folder_obj.name != item_name or folder_obj.parent != parent_folder_obj):
                    folder_obj.name = item_name
                    folder_obj.parent = parent_folder_obj
                    folder_obj.save(update_fields=['name', 'parent'])
            else:
                if parent_folder_obj:
                    file_obj, created = File.objects.get_or_create(
                        google_file_id=item_id,
                        defaults={
                            'name': item_name,
                            'folder': parent_folder_obj,
                            'uploaded_by': user,
                            'file_type': mime_type or 'application/octet-stream',
                            'file_size': item.get('size', 0),
                            'web_view_link': item.get('webViewLink'),
                            'web_content_link': item.get('webContentLink')
                        }
                    )
                    if not created and (file_obj.name != item_name or file_obj.folder != parent_folder_obj):
                        file_obj.name = item_name
                        file_obj.folder = parent_folder_obj
                        file_obj.save(update_fields=['name', 'folder'])
    except Exception as e:
        logger.warning(f"Google Drive sync error for folder '{parent_google_id}': {e}")


class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer
    permission_classes = [HasDynamicPermission]

    action_permissions = {
        'list': 'view_folder',
        'retrieve': 'view_folder',
        'create': 'create_folder',
        'update': 'rename_folder',
        'partial_update': 'rename_folder',
        'destroy': 'delete_folder',
        'contents': 'view_folder',
        'root_contents': 'view_folder',
        'create_custom': 'create_folder',
        'rename_custom': 'rename_folder',
        'delete_custom': 'delete_folder',
        'bulk_delete': 'delete_folder',
        'drive_status': 'view_folder',
        'audit': 'view_folder',
    }

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Folder.objects.none()
        
        base_qs = Folder.objects.filter(is_deleted=False)
        custom_page_id = self.request.query_params.get('custom_page_id')
        module_type = self.request.query_params.get('module_type')

        if custom_page_id:
            base_qs = base_qs.filter(custom_page_id=custom_page_id)
        elif module_type:
            base_qs = base_qs.filter(module_type=module_type)

        # Super Admin bypasses access filters
        if user.role and user.role.name == "Super Admin":
            return base_qs.order_by('name')

        # Filter by folder accessibility (recursive lookup)
        accessible_ids = [f.id for f in base_qs if f.has_access(user)]
        return base_qs.filter(id__in=accessible_ids).order_by('name')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_authenticated and instance.created_by != request.user:
            from .models import FolderView
            FolderView.objects.get_or_create(user=request.user, folder=instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        # Validate parent access & nested folder permission
        parent_id = request.data.get('parent_id')
        user = request.data.get('user')
        
        # Determine permission required: create_folder or create_nested_folder
        required_perm = 'create_folder'
        parent_folder = None
        
        if parent_id:
            parent_folder = get_object_or_404(Folder, id=parent_id)
            required_perm = 'create_nested_folder'
            
            # Check if user has access to parent
            if not parent_folder.has_access(request.user):
                return Response(
                    {"detail": "You do not have access to this parent folder."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Share permission restriction
            is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
            if not is_admin and parent_folder.created_by != request.user:
                from folders.models import FolderPermission
                explicit_perm = FolderPermission.objects.filter(user=request.user, folder=parent_folder).first()
                if explicit_perm:
                    if not explicit_perm.can_upload:
                        return Response(
                            {"detail": "You only have read/view access and cannot create subfolders here."},
                            status=status.HTTP_403_FORBIDDEN
                        )
                else:
                    share_perm = get_mou_share_permission(request.user, parent_folder)
                    if share_perm in ['View Only', 'Upload Only']:
                        return Response(
                            {"detail": "You only have read/upload access and cannot create subfolders here."},
                            status=status.HTTP_403_FORBIDDEN
                        )

        try:
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                folder = serializer.save(created_by=request.user)

                # Get parent Google folder ID & inherit module scoping
                parent_google_id = None
                if parent_folder:
                    parent_google_id = parent_folder.google_folder_id
                    folder.module_type = parent_folder.module_type
                    folder.custom_page = parent_folder.custom_page
                    folder.save(update_fields=['module_type', 'custom_page'])
                elif request.data.get('custom_page_id'):
                    from users.models import CustomDynamicPage
                    cp = CustomDynamicPage.objects.filter(id=request.data.get('custom_page_id')).first()
                    if cp:
                        folder.module_type = 'custom_page'
                        folder.custom_page = cp
                        folder.save(update_fields=['module_type', 'custom_page'])
                        if not parent_google_id and cp.google_drive_folder_id:
                            parent_google_id = cp.google_drive_folder_id

                # Create folder on Google Drive (Strict: Google Drive is required)
                logger.info(f"Triggering folder creation on Google Drive. Folder name: '{folder.name}', parent Google Folder ID: '{parent_google_id}'...")
                google_folder_id = drive_service.create_folder(folder.name, parent_google_id)
                logger.info(f"Folder created successfully on Google Drive. ID: '{google_folder_id}'")
                folder.google_folder_id = google_folder_id
                folder.save(update_fields=['google_folder_id'])

                # Support custom creation date/time
                custom_created_at = request.data.get('created_at')
                if custom_created_at:
                    from django.utils.dateparse import parse_datetime
                    parsed_dt = parse_datetime(custom_created_at)
                    if parsed_dt:
                        Folder.objects.filter(pk=folder.pk).update(created_at=parsed_dt)
                        folder.refresh_from_db()

                # Audit & Notify
                log_activity(request.user, f"Created folder '{folder.name}'", "folders", request)
                notify_admins("Folder Created", f"Folder '{folder.name}' was created by {request.user.name}.", metadata={'action': 'folder_created', 'folder_id': folder.id, 'folder_name': folder.name})
        except Exception as e:
            logger.exception(f"Folder creation view failed for '{folder.name}': {e}")
            return Response({"detail": f"Google Drive folder creation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        headers = self.get_success_headers(serializer.data)
        return Response(FolderSerializer(folder).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        folder = self.get_object()
        old_name = folder.name
        
        # Access check: user created the folder or has folder access
        if not folder.has_access(request.user):
            return Response(
                {"detail": "You do not have access to edit this folder."},
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
                        {"detail": "You do not have permission to edit this folder."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                share_perm = get_mou_share_permission(request.user, folder)
                if share_perm in ['View Only', 'Upload Only']:
                    return Response(
                        {"detail": "You only have read/upload access and cannot edit folders here."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
        try:
            with transaction.atomic():
                serializer = self.get_serializer(folder, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                updated_folder = serializer.save()
                
                # Sync rename to Google Drive
                if updated_folder.google_folder_id and old_name != updated_folder.name:
                    logger.info(f"Syncing folder rename to Google Drive. Folder ID: '{updated_folder.google_folder_id}', old name: '{old_name}', new name: '{updated_folder.name}'...")
                    drive_service.rename_file(updated_folder.google_folder_id, updated_folder.name)
                    logger.info("Rename sync successful.")

                # Log & Notify
                if old_name != updated_folder.name:
                    log_activity(request.user, f"Renamed folder from '{old_name}' to '{updated_folder.name}'", "folders", request)
                    notify_admins("Folder Renamed", f"Folder '{old_name}' was renamed to '{updated_folder.name}' by {request.user.name}.", metadata={'action': 'folder_renamed', 'folder_id': updated_folder.id, 'folder_name': updated_folder.name})
                else:
                    log_activity(request.user, f"Updated folder '{updated_folder.name}' status to '{updated_folder.status}'", "folders", request)
                    notify_admins("Folder Updated", f"Folder '{updated_folder.name}' status was updated to '{updated_folder.status}' by {request.user.name}.", metadata={'action': 'folder_updated', 'folder_id': updated_folder.id, 'folder_name': updated_folder.name, 'status': updated_folder.status})
        except Exception as e:
            logger.exception(f"Folder rename failed for folder '{old_name}' (ID: {folder.id}) to '{updated_folder.name}': {e}")
            return Response({"detail": f"Google Drive folder rename failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(FolderSerializer(updated_folder).data)

    def destroy(self, request, *args, **kwargs):
        folder = self.get_object()
        
        # Access check: user created the folder or has access
        if not folder.has_access(request.user):
            return Response(
                {"detail": "You do not have access to delete this folder."},
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
                        {"detail": "You do not have permission to delete this folder."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                share_perm = get_mou_share_permission(request.user, folder)
                if share_perm in ['View Only', 'Upload Only']:
                    return Response(
                        {"detail": "You only have read/upload access and cannot delete folders here."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
        folder_name = folder.name
        google_folder_id = folder.google_folder_id
        
        try:
            with transaction.atomic():
                if google_folder_id:
                    logger.info(f"Attempting to delete folder from Google Drive. Folder ID: '{google_folder_id}'...")
                    try:
                        drive_service.delete_file(google_folder_id)
                        logger.info("Folder deleted successfully from Google Drive.")
                    except Exception as drive_err:
                        logger.warning(f"Failed to delete folder '{google_folder_id}' on Google Drive: {drive_err}")
                self.perform_destroy(folder)
                    
                # Log & Notify
                log_activity(request.user, f"Deleted folder '{folder_name}'", "folders", request)
                notify_admins("Folder Deleted", f"Folder '{folder_name}' was deleted by {request.user.name}.", metadata={'action': 'folder_deleted', 'folder_name': folder_name})
        except Exception as e:
            logger.exception(f"Folder deletion failed for folder '{folder_name}' (ID: {folder.id}): {e}")
            return Response({"detail": f"Database folder deletion failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='drive-status', permission_classes=[permissions.IsAuthenticated])
    def drive_status(self, request):
        """Tests Google Drive connectivity and returns status."""
        try:
            svc = drive_service.authenticate()
            # Try to get the root folder metadata as a live ping
            from django.conf import settings
            root_id = drive_service.get_root_folder_id()
            meta = svc.files().get(fileId=root_id, fields='id,name').execute()
            
            # Check if using dynamic db configuration
            from users.models import GoogleDriveSetting
            active = GoogleDriveSetting.objects.filter(is_active=True).first()
            sa_info = active.client_email if active else getattr(settings, 'GOOGLE_DRIVE_CLIENT_EMAIL', 'Default Env SA')
            
            return Response({
                'connected': True,
                'root_folder_id': root_id,
                'root_folder_name': meta.get('name'),
                'service_account': sa_info,
            })
        except Exception as e:
            return Response({
                'connected': False,
                'error': str(e),
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    @action(detail=False, methods=['post'], url_path='create')
    def create_custom(self, request):
        """
        Maps to POST /api/folders/create/
        """
        return self.create(request)

    @action(detail=False, methods=['put'], url_path='rename')
    def rename_custom(self, request):
        """
        Maps to PUT /api/folders/rename/
        """
        folder_id = request.data.get('folder_id')
        new_name = request.data.get('name')
        if not folder_id or not new_name:
            return Response({"folder_id": ["This field is required."], "name": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        
        folder = get_object_or_404(Folder, id=folder_id)
        if not folder.has_access(request.user):
            return Response({"detail": "You do not have access to this folder."}, status=status.HTTP_403_FORBIDDEN)
            
        # Share permission restriction
        is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
        if not is_admin:
            share_perm = get_mou_share_permission(request.user, folder)
            if share_perm in ['View Only', 'Upload Only']:
                return Response(
                    {"detail": "You only have read/upload access and cannot edit folders here."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
        old_name = folder.name
        try:
            with transaction.atomic():
                folder.name = new_name
                folder.save(update_fields=['name', 'updated_at'])
                
                if folder.google_folder_id:
                    drive_service.rename_file(folder.google_folder_id, new_name)
                    
                log_activity(request.user, f"Renamed folder from '{old_name}' to '{new_name}'", "folders", request)
                notify_admins("Folder Renamed", f"Folder '{old_name}' was renamed to '{new_name}' by {request.user.name}.", metadata={'action': 'folder_renamed', 'folder_id': folder.id, 'folder_name': folder.name})
        except Exception as e:
            return Response({"detail": f"Rename sync with Google Drive failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(FolderSerializer(folder).data)

    @action(detail=False, methods=['delete'], url_path='delete')
    def delete_custom(self, request):
        """
        Maps to DELETE /api/folders/delete/
        """
        folder_id = request.data.get('folder_id') or request.query_params.get('folder_id')
        if not folder_id:
            return Response({"folder_id": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        
        folder = get_object_or_404(Folder, id=folder_id)
        if not folder.has_access(request.user):
            return Response({"detail": "You do not have access to this folder."}, status=status.HTTP_403_FORBIDDEN)
            
        # Share permission restriction
        is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
        if not is_admin:
            share_perm = get_mou_share_permission(request.user, folder)
            if share_perm in ['View Only', 'Upload Only']:
                return Response(
                    {"detail": "You only have read/upload access and cannot delete folders here."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
        folder_name = folder.name
        now = timezone.now()
        
        try:
            with transaction.atomic():
                folder.is_deleted = True
                folder.deleted_at = now
                folder.deleted_by = request.user
                folder.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
                
                from files.models import File
                Folder.objects.filter(parent=folder).update(is_deleted=True, deleted_at=now, deleted_by=request.user)
                File.objects.filter(folder=folder).update(is_deleted=True, deleted_at=now, deleted_by=request.user)

                log_activity(request.user, f"Moved folder '{folder_name}' to Recycle Bin", "folders", request)
                notify_admins("Folder Moved to Recycle Bin", f"Folder '{folder_name}' was moved to Recycle Bin by {request.user.name}.", metadata={'action': 'folder_deleted', 'folder_name': folder_name})
        except Exception as e:
            return Response({"detail": f"Moving folder to Recycle Bin failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        Maps to POST /api/folders/bulk-delete/
        """
        folder_ids = request.data.get('folder_ids', [])
        if not folder_ids:
            return Response({"folder_ids": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
        
        folders = Folder.objects.filter(id__in=folder_ids, is_deleted=False)
        if len(folders) != len(folder_ids):
            return Response({"detail": "One or more of the selected folders do not exist."}, status=status.HTTP_404_NOT_FOUND)
        
        # Access & Permission check for all folders
        is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin"]
        for folder in folders:
            if not folder.has_access(request.user):
                return Response({"detail": f"You do not have access to delete folder '{folder.name}'."}, status=status.HTTP_403_FORBIDDEN)
            
            # Share permission restriction
            if not is_admin:
                share_perm = get_mou_share_permission(request.user, folder)
                if share_perm in ['View Only', 'Upload Only']:
                    return Response(
                        {"detail": f"You only have read/upload access and cannot delete folder '{folder.name}'."},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        deleted_names = []
        now = timezone.now()
        try:
            with transaction.atomic():
                from files.models import File
                for folder in folders:
                    folder_name = folder.name
                    folder.is_deleted = True
                    folder.deleted_at = now
                    folder.deleted_by = request.user
                    folder.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
                    
                    Folder.objects.filter(parent=folder).update(is_deleted=True, deleted_at=now, deleted_by=request.user)
                    File.objects.filter(folder=folder).update(is_deleted=True, deleted_at=now, deleted_by=request.user)
                    deleted_names.append(folder_name)
                
                if deleted_names:
                    log_activity(request.user, f"Moved folders to Recycle Bin: {', '.join(deleted_names)}", "folders", request)
                    notify_admins("Folders Moved to Recycle Bin", f"Folders: {', '.join(deleted_names)} were moved to Recycle Bin by {request.user.name}.", metadata={'action': 'folders_bulk_deleted', 'folder_names': deleted_names})
        except Exception as e:
            return Response({"detail": f"Moving folders to Recycle Bin failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({"detail": "Selected folders moved to Recycle Bin successfully."}, status=status.HTTP_200_OK)

    def sync_drive_directory(self, parent_google_id, parent_folder_obj, user):
        """
        Fetches live items from Google Drive under parent_google_id.
        Creates missing Folder and File database models.
        """
        if not parent_google_id:
            return
        
        from files.models import File
        try:
            # Fetch live list from Google Drive
            live_items = drive_service.list_folder_contents(parent_google_id)
            
            # Map of existing child folders: google_folder_id -> Folder
            existing_folders = Folder.objects.filter(parent=parent_folder_obj)
            existing_folder_map = {f.google_folder_id: f for f in existing_folders if f.google_folder_id}
            existing_folder_name_map = {f.name: f for f in existing_folders if not f.google_folder_id}

            # Map of existing files: google_file_id -> File
            if parent_folder_obj:
                existing_files = File.objects.filter(folder=parent_folder_obj)
                existing_file_map = {f.google_file_id: f for f in existing_files if f.google_file_id}
                existing_file_name_map = {f.name: f for f in existing_files if not f.google_file_id}
            else:
                existing_file_map = {}
                existing_file_name_map = {}

            for item in live_items:
                mime_type = item.get('mimeType')
                item_id = item.get('id')
                item_name = item.get('name')
                
                # Skip deleted legacy drive folders
                if item_id in ['1bsme27EZ04QwaaHwWxPlaoHQWxA7iAUk', '1tgwbp0b9aYOnmXSUvIo8rRz69wmpYbf5'] or item_name in ['MCA (Comuputer Application)', 'Jeff2']:
                    continue
                
                if mime_type == 'application/vnd.google-apps.folder':
                    # Folder synchronization
                    if item_id in existing_folder_map:
                        continue
                    elif item_name in existing_folder_name_map:
                        f = existing_folder_name_map[item_name]
                        f.google_folder_id = item_id
                        f.save(update_fields=['google_folder_id'])
                    else:
                        m_type = 'mou_repository'
                        c_page = None
                        if parent_folder_obj:
                            m_type = parent_folder_obj.module_type
                            c_page = parent_folder_obj.custom_page
                        else:
                            from users.models import CustomDynamicPage
                            cp = CustomDynamicPage.objects.filter(google_drive_folder_id=item_id).first()
                            if cp:
                                m_type = 'custom_page'
                                c_page = cp

                        Folder.objects.create(
                            name=item_name,
                            parent=parent_folder_obj,
                            google_folder_id=item_id,
                            created_by=user,
                            module_type=m_type,
                            custom_page=c_page
                        )
                else:
                    # File synchronization (files belong to folders in DB, so we skip if parent_folder_obj is None)
                    if not parent_folder_obj:
                        continue
                    
                    if item_id in existing_file_map:
                        continue
                    elif item_name in existing_file_name_map:
                        f = existing_file_name_map[item_name]
                        f.google_file_id = item_id
                        f.web_view_link = item.get('webViewLink')
                        f.web_content_link = item.get('webContentLink')
                        f.size = int(item.get('size', 0)) if item.get('size') else 0
                        f.file_size = f.size
                        f.mime_type = mime_type
                        f.save(update_fields=['google_file_id', 'web_view_link', 'web_content_link', 'size', 'file_size', 'mime_type'])
                    else:
                        File.objects.create(
                            name=item_name,
                            size=int(item.get('size', 0)) if item.get('size') else 0,
                            file_size=int(item.get('size', 0)) if item.get('size') else 0,
                            file_type=mime_type or "application/octet-stream",
                            mime_type=mime_type,
                            folder=parent_folder_obj,
                            uploaded_by=user,
                            google_file_id=item_id,
                            web_view_link=item.get('webViewLink'),
                            web_content_link=item.get('webContentLink')
                        )
        except Exception as e:
            logger.warning(f"Live Google Drive sync failed: {e}")

    @action(detail=True, methods=['get'])
    def contents(self, request, pk=None):
        """
        Returns subfolders and files inside the specified folder.
        Fetches live items from Google Drive subfolder first.
        """
        folder = self.get_object()
        
        # Access check
        if not folder.has_access(request.user):
            return Response(
                {"detail": "You do not have access to this folder."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Mark as viewed by the current user
        if request.user.is_authenticated and folder.created_by != request.user:
            from .models import FolderView
            FolderView.objects.get_or_create(user=request.user, folder=folder)

        # Trigger sync from Google Drive
        if folder.google_folder_id:
            self.sync_drive_directory(folder.google_folder_id, folder, request.user)

        # Subfolders access filter
        subfolders = folder.children.all().order_by('name')
        if not (request.user.role and request.user.role.name == "Super Admin"):
            subfolders = [f for f in subfolders if f.has_access(request.user)]
            
        # Files in folder
        files = folder.files.all().order_by('name')
        
        subfolders_data = FolderSerializer(subfolders, many=True).data
        files_data = FileSerializer(files, many=True, context={'request': request}).data

        return Response({
            "subfolders": subfolders_data,
            "files": files_data
        })

    @action(detail=False, methods=['get'], url_path='root')
    def root_contents(self, request):
        """
        Lists folders and files at the root level (no parent).
        Fetches live items from Google Drive root folder first.
        """
        # Trigger sync from Google Drive using Root ID
        root_id = drive_service.get_root_folder_id()
        if root_id:
            self.sync_drive_directory(root_id, None, request.user)

        user = request.user
        
        # 1. Base query for root folders (no parent) isolated strictly to mou_repository
        root_folders = Folder.objects.filter(parent=None, is_deleted=False, module_type='mou_repository').order_by('name')
        
        # 2. If user is Super Admin, they see all root folders and don't need orphaned subfolders
        if user.role and user.role.name == "Super Admin":
            subfolders_data = FolderSerializer(root_folders, many=True, context={'request': request}).data
            return Response({
                "subfolders": subfolders_data,
                "files": []
            })
            
        # 3. Filter root folders the user has access to
        accessible_folders = [f for f in root_folders if f.has_access(user)]
        
        # 4. Find all subfolders (parent is not None) that the user has direct access to,
        # but whose parent folder is NOT accessible to the user.
        # These are "orphaned" shared subfolders that should be shown at the root level.
        all_subfolders = Folder.objects.exclude(parent=None)
        for f in all_subfolders:
            if f.has_access(user):
                # Check if parent is accessible
                if f.parent and not f.parent.has_access(user):
                    # Only add if it's the highest accessible folder in its ancestral chain
                    ancestor = f.parent
                    highest_orphan = True
                    while ancestor is not None:
                        if ancestor.has_access(user) and (not ancestor.parent or not ancestor.parent.has_access(user)):
                            highest_orphan = False
                            break
                        ancestor = ancestor.parent
                    
                    if highest_orphan:
                        accessible_folders.append(f)
                        
        # Sort folders by name
        accessible_folders.sort(key=lambda x: x.name.lower())
        
        subfolders_data = FolderSerializer(accessible_folders, many=True, context={'request': request}).data
        
        return Response({
            "subfolders": subfolders_data,
            "files": []
        })

    @action(detail=False, methods=['get'], url_path='shared')
    def shared_folders(self, request):
        """
        Returns folders explicitly shared with the current user.
        """
        user = request.user
        if not user or not user.is_authenticated:
            return Response([])
            
        from folders.models import FolderPermission
        from mous.models import MOUShare
        from django.db.models import Q
        
        fp_folder_ids = FolderPermission.objects.filter(user=user, is_granted=True).values_list('folder_id', flat=True)
        mou_shares = MOUShare.objects.filter(Q(user=user) | Q(department__name=user.department) if user.department else Q(user=user))
        mou_folder_ids = mou_shares.values_list('mou__department_id', flat=True)
        
        shared_ids = set(list(fp_folder_ids) + list(mou_folder_ids))
        shared_folders = Folder.objects.filter(id__in=shared_ids).exclude(created_by=user).order_by('name')
        
        return Response(FolderSerializer(shared_folders, many=True).data)

    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        folder = self.get_object()
        user = request.user
        is_admin = user.role and user.role.name in ["Super Admin", "Admin"]
        is_creator = folder.created_by == user
        if not (is_admin or is_creator):
            return Response(
                {"detail": "You do not have permission to view access rules for this folder."},
                status=status.HTTP_403_FORBIDDEN
            )
        permissions = FolderPermission.objects.filter(folder=folder)
        return Response(FolderPermissionSerializer(permissions, many=True).data)

    @action(detail=True, methods=['post'], url_path='revoke-access')
    def revoke_access(self, request, pk=None):
        folder = self.get_object()
        user = request.user
        is_admin = user.role and user.role.name in ["Super Admin", "Admin"]
        is_creator = folder.created_by == user
        if not (is_admin or is_creator):
            return Response(
                {"detail": "You do not have permission to manage access for this folder."},
                status=status.HTTP_403_FORBIDDEN
            )
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({"user_id": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
            
        target_user = get_object_or_404(User, id=user_id)
        
        # Delete the explicit access rule
        deleted_count, _ = FolderPermission.objects.filter(user=target_user, folder=folder).delete()
        
        if deleted_count > 0:
            log_activity(
                request.user, 
                f"Removed explicit access rule to folder '{folder.name}' for user {target_user.email}", 
                "folders", 
                request
            )
            
            create_notification(
                target_user, 
                "Folder Access Removed", 
                f"Your explicit access rule to folder '{folder.name}' has been removed.",
                metadata={'action': 'folder_share_removed', 'folder_id': folder.id, 'folder_name': folder.name}
            )
            return Response({"detail": "Access rule removed successfully."})
        else:
            return Response({"detail": "No explicit access rule found for this user and folder."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='assign-access')
    def assign_access(self, request, pk=None):
        folder = self.get_object()
        user = request.user
        is_admin = user.role and user.role.name in ["Super Admin", "Admin"]
        is_creator = folder.created_by == user
        if not (is_admin or is_creator):
            return Response(
                {"detail": "You do not have permission to manage access for this folder."},
                status=status.HTTP_403_FORBIDDEN
            )
        user_id = request.data.get('user_id')
        is_granted = request.data.get('is_granted', True)
        
        if not user_id:
            return Response({"user_id": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
            
        target_user = get_object_or_404(User, id=user_id)
        
        # Create or update access rule with granular permissions
        can_read = request.data.get('can_read', True)
        can_download = request.data.get('can_download', True)
        can_upload = request.data.get('can_upload', False)
        can_delete_own_uploads = request.data.get('can_delete_own_uploads', False)
        
        folder_perm, created = FolderPermission.objects.update_or_create(
            user=target_user,
            folder=folder,
            defaults={
                'is_granted': is_granted,
                'can_read': can_read,
                'can_download': can_download,
                'can_upload': can_upload,
                'can_delete_own_uploads': can_delete_own_uploads,
            }
        )
        
        action_type = "granted" if is_granted else "revoked"
        log_activity(
            request.user, 
            f"Explicitly {action_type} access to folder '{folder.name}' for user {target_user.email}", 
            "folders", 
            request
        )
        
        create_notification(
            target_user, 
            "Folder Access Update", 
            f"You have been {action_type} access to folder '{folder.name}'.",
            metadata={'action': 'folder_share', 'folder_id': folder.id, 'folder_name': folder.name, 'share_type': action_type}
        )
        
        return Response({
            "detail": f"Access {action_type} successfully.",
            "permission": FolderPermissionSerializer(folder_perm).data
        })

    @action(detail=True, methods=['get'])
    def audit(self, request, pk=None):
        folder = self.get_object()
        
        def collect_directory_data(current_folder):
            subfolders = []
            files = []
            
            # Subfolders
            for sub in current_folder.children.all().order_by('name'):
                subfolders.append({
                    'id': sub.id,
                    'name': sub.name,
                    'created_by': sub.created_by.name if sub.created_by else 'System Admin',
                    'created_at': sub.created_at,
                    'updated_at': sub.updated_at,
                    'expiry_date': sub.expiry_date,
                    'status': sub.status,
                    'summary': sub.summary,
                    'path': [{"id": ancestor.id, "name": ancestor.name} for ancestor in sub.get_ancestors()]
                })
                # Recurse
                nested_subs, nested_files = collect_directory_data(sub)
                subfolders.extend(nested_subs)
                files.extend(nested_files)
                
            # Files in current folder
            for f in current_folder.files.all().order_by('-updated_at'):
                files.append({
                    'id': f.id,
                    'name': f.name,
                    'folder_name': current_folder.name,
                    'folder_id': current_folder.id,
                    'uploaded_by': f.uploaded_by.name if f.uploaded_by else 'System Admin',
                    'created_at': f.created_at,
                    'updated_at': f.updated_at,
                    'size': f.size,
                    'version_number': f.version_number
                })
                
            return subfolders, files

        if not folder.has_access(request.user):
            return Response({"detail": "You do not have access to this folder."}, status=status.HTTP_403_FORBIDDEN)
            
        subfolders, files = collect_directory_data(folder)
        
        folder_info = {
            'id': folder.id,
            'name': folder.name,
            'created_by': folder.created_by.name if folder.created_by else 'System Admin',
            'created_at': folder.created_at,
            'updated_at': folder.updated_at,
            'status': folder.status,
            'summary': folder.summary,
            'expiry_date': folder.expiry_date
        }
        
        return Response({
            'folder': folder_info,
            'subfolders': subfolders,
            'files': files
        })
