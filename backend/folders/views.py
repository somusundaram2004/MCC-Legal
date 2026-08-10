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

def sync_drive_directory(parent_google_id=None, parent_folder_obj=None, user=None, force_sync=False):
    """
    Fetches live folders & files from Google Drive under parent_google_id and syncs them to the DB.
    Optimized: Skips live network cloud calls if local DB records already exist unless force_sync=True.
    """
    from django.conf import settings
    from files.models import File
    
    if not parent_google_id:
        parent_google_id = drive_service.get_root_folder_id()
        
    if not parent_google_id:
        return

    # DB-First Optimization: If local DB items already exist, skip live network latency
    if not force_sync:
        if parent_folder_obj and (parent_folder_obj.children.filter(is_deleted=False).exists() or parent_folder_obj.files.filter(is_deleted=False).exists()):
            return
        elif not parent_folder_obj and Folder.objects.filter(parent__isnull=True, is_deleted=False).exists():
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
        'move_module': 'rename_folder',
        'import_folder': 'create_folder',
    }


    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return Folder.objects.none()
        
        base_qs = Folder.objects.all() if getattr(self, 'action', None) == 'move_module' or self.kwargs.get('pk') else Folder.objects.filter(is_deleted=False)
        
        # Apply list filtering only when NOT performing detail action or pk lookup
        if not self.kwargs.get('pk') and getattr(self, 'action', None) not in ['retrieve', 'update', 'partial_update', 'destroy', 'move_module']:
            custom_page_id = self.request.query_params.get('custom_page_id')
            module_type = self.request.query_params.get('module_type')

            if custom_page_id:
                base_qs = base_qs.filter(custom_page_id=custom_page_id)
            elif module_type:
                base_qs = base_qs.filter(module_type=module_type)




        # Detail actions and pk lookups bypass list accessibility filtering.
        # Permission enforcement for detail actions is handled inside the respective view methods.
        if self.kwargs.get('pk') or getattr(self, 'action', None) in ['retrieve', 'contents', 'update', 'partial_update', 'destroy', 'move_module']:
            return base_qs.order_by('name')

        # Super Admin bypasses access filters
        if user.role and user.role.name == "Super Admin":
            return base_qs.order_by('name')

        # Filter by folder accessibility (recursive lookup)
        accessible_ids = [f.id for f in base_qs if f.has_access(user)]
        return base_qs.filter(id__in=accessible_ids).order_by('name')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        # Access check for retrieve
        has_access = instance.has_access(request.user)
        if not has_access:
            is_custom_page_system_root = (instance.parent is None and instance.custom_page_id is not None)
            has_child_access = any(child.has_access(request.user) for child in instance.children.all())
            if not is_custom_page_system_root and not has_child_access:
                return Response(
                    {"detail": "You do not have access to this folder."},
                    status=status.HTTP_403_FORBIDDEN
                )

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
                master_root_id = drive_service.get_root_folder_id()
                if parent_folder:
                    folder.module_type = parent_folder.module_type
                    folder.custom_page = parent_folder.custom_page
                    folder.save(update_fields=['module_type', 'custom_page'])

                    parent_google_id = parent_folder.google_folder_id
                    if not parent_google_id or (master_root_id and parent_google_id.strip() == master_root_id.strip()):
                        if parent_folder.custom_page:
                            parent_google_id = drive_service.get_or_create_module_folder_id(parent_folder.custom_page)
                        elif parent_folder.module_type == 'mou_repository':
                            parent_google_id = drive_service.get_or_create_mou_repository_folder_id()
                elif request.data.get('custom_page_id'):
                    from users.models import CustomDynamicPage
                    cp = CustomDynamicPage.objects.filter(id=request.data.get('custom_page_id')).first()
                    if cp:
                        folder.module_type = 'custom_page'
                        folder.custom_page = cp
                        parent_google_id = drive_service.get_or_create_module_folder_id(cp)
                        if cp.root_folder_id and not folder.parent:
                            try:
                                rf = Folder.objects.filter(id=int(cp.root_folder_id)).first()
                                if rf:
                                    folder.parent = rf
                                    if rf.google_folder_id:
                                        parent_google_id = rf.google_folder_id
                            except Exception:
                                pass
                        folder.save(update_fields=['module_type', 'custom_page', 'parent'])
                else:
                    folder.module_type = 'mou_repository'
                    folder.custom_page = None
                    folder.save(update_fields=['module_type', 'custom_page'])
                    parent_google_id = drive_service.get_or_create_mou_repository_folder_id()



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
            logger.exception(f"Folder creation view failed: {e}")
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
            logger.exception(f"Folder rename failed for folder '{old_name}' (ID: {folder.id}): {e}")
            return Response({"detail": f"Google Drive folder rename failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        
        return Response(FolderSerializer(updated_folder).data)

    def destroy(self, request, *args, **kwargs):
        folder = self.get_object()
        
        # Access check: user created the folder or has access
        if not folder.has_access(request.user):
            return Response(
                {"detail": "You do not have access to move this folder to Recycle Bin."},
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
                    
                # Move folder on Google Drive to Recycle Bin folder
                if folder.google_folder_id:
                    try:
                        bin_drive_id = drive_service.get_or_create_recycle_bin_folder_id()
                        if bin_drive_id:
                            drive_service.move_file(folder.google_folder_id, bin_drive_id)
                            logger.info(f"Moved folder '{folder_name}' on Google Drive to Recycle Bin folder '{bin_drive_id}'")
                    except Exception as d_err:
                        logger.warning(f"Google Drive move to Recycle Bin note for '{folder_name}': {d_err}")

                # Log & Notify
                log_activity(request.user, f"Moved folder '{folder_name}' to Recycle Bin", "folders", request)
                notify_admins("Folder Moved to Recycle Bin", f"Folder '{folder_name}' was moved to Recycle Bin by {request.user.name}.", metadata={'action': 'folder_deleted', 'folder_name': folder_name})

        except Exception as e:
            logger.exception(f"Moving folder to Recycle Bin failed for folder '{folder_name}' (ID: {folder.id}): {e}")
            return Response({"detail": f"Moving folder to Recycle Bin failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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

    @action(detail=False, methods=['post'], url_path='create-custom')
    def create_custom_alias(self, request):
        """
        Maps to POST /api/folders/create-custom/
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

                if folder.google_folder_id:
                    try:
                        bin_drive_id = drive_service.get_or_create_recycle_bin_folder_id()
                        if bin_drive_id:
                            drive_service.move_file(folder.google_folder_id, bin_drive_id)
                            logger.info(f"Moved folder '{folder_name}' on Google Drive to Recycle Bin folder '{bin_drive_id}'")
                    except Exception as d_err:
                        logger.warning(f"Google Drive move to Recycle Bin note: {d_err}")

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
        
        clean_ids = []
        for fid in folder_ids:
            try:
                clean_ids.append(int(fid))
            except (ValueError, TypeError):
                pass

        folders = Folder.objects.filter(id__in=clean_ids, is_deleted=False)
        if not folders.exists():
            return Response({"detail": "Selected folders are already in Recycle Bin or do not exist."}, status=status.HTTP_200_OK)

        
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
                    
                    if folder.google_folder_id:
                        try:
                            bin_drive_id = drive_service.get_or_create_recycle_bin_folder_id()
                            if bin_drive_id:
                                drive_service.move_file(folder.google_folder_id, bin_drive_id)
                        except Exception as d_err:
                            logger.warning(f"Google Drive bulk move to Recycle Bin note for '{folder_name}': {d_err}")

                    deleted_names.append(folder_name)

                
                if deleted_names:
                    log_activity(request.user, f"Moved folders to Recycle Bin: {', '.join(deleted_names)}", "folders", request)
                    notify_admins("Folders Moved to Recycle Bin", f"Folders: {', '.join(deleted_names)} were moved to Recycle Bin by {request.user.name}.", metadata={'action': 'folders_bulk_deleted', 'folder_names': deleted_names})
        except Exception as e:
            return Response({"detail": f"Moving folders to Recycle Bin failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({"detail": "Selected folders moved to Recycle Bin successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='move-module')
    def move_module(self, request, pk=None):
        """
        Moves a folder from one module repository to another.
        Payload: { "target_custom_page_id": "mou_repository" } OR { "target_custom_page_id": "uuid..." }
        """
        folder = self.get_object()
        
        if not folder.has_access(request.user):
            return Response(
                {"detail": "You do not have access to move this folder."},
                status=status.HTTP_403_FORBIDDEN
            )

        target_custom_page_id = request.data.get('target_custom_page_id')
        if not target_custom_page_id:
            return Response({"target_custom_page_id": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        old_module_name = folder.custom_page.title if folder.custom_page else "MOU Repositories"

        try:
            with transaction.atomic():
                target_parent = None
                new_parent_google_id = None
                target_module_name = "MOU Repositories"

                if target_custom_page_id in ['mou_repository', 'mou']:
                    folder.module_type = 'mou_repository'
                    folder.custom_page = None
                    folder.parent = None
                    new_parent_google_id = drive_service.get_root_folder_id()
                else:
                    from users.models import CustomDynamicPage
                    cp = CustomDynamicPage.objects.filter(id=target_custom_page_id).first()
                    if not cp:
                        return Response({"detail": "Selected target module was not found."}, status=status.HTTP_404_NOT_FOUND)
                    
                    target_module_name = cp.title
                    folder.module_type = 'custom_page'
                    folder.custom_page = cp
                    
                    if cp.root_folder_id:
                        try:
                            target_parent = Folder.objects.filter(id=int(cp.root_folder_id)).first()
                        except Exception:
                            pass
                    folder.parent = target_parent
                    new_parent_google_id = cp.google_drive_folder_id or drive_service.get_root_folder_id()

                if folder.is_deleted:
                    folder.is_deleted = False
                    folder.deleted_at = None
                    folder.deleted_by = None

                folder.save(update_fields=['module_type', 'custom_page', 'parent', 'is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])

                # Update all child subfolders & files to inherit the new module scoping and restore if deleted
                subfolder_ids = list(Folder.objects.filter(parent=folder).values_list('id', flat=True))
                if subfolder_ids:
                    Folder.objects.filter(id__in=subfolder_ids).update(
                        module_type=folder.module_type,
                        custom_page=folder.custom_page,
                        is_deleted=False,
                        deleted_at=None,
                        deleted_by=None
                    )

                
                # Move on Google Drive if folder has google_folder_id
                if folder.google_folder_id and new_parent_google_id:
                    try:
                        drive_service.move_file(folder.google_folder_id, new_parent_google_id)
                        logger.info(f"Moved folder '{folder.name}' on Google Drive to parent '{new_parent_google_id}'")
                    except Exception as drive_err:
                        logger.warning(f"Google Drive move note for folder '{folder.name}': {drive_err}")

                log_activity(request.user, f"Moved folder '{folder.name}' from '{old_module_name}' to '{target_module_name}'", "folders", request)
                notify_admins("Folder Moved to Module", f"Folder '{folder.name}' was moved from '{old_module_name}' to '{target_module_name}' by {request.user.name}.", metadata={'action': 'folder_moved_module', 'folder_id': folder.id, 'folder_name': folder.name, 'target_module': target_module_name})

        except Exception as e:
            logger.exception(f"Failed to move folder '{folder.name}' to module: {e}")
            return Response({"detail": f"Failed to move folder: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "detail": f"Folder '{folder.name}' successfully moved to module '{target_module_name}'!",
            "folder": FolderSerializer(folder).data
        })


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
                    # Folder synchronization - SKIP if soft-deleted in DB
                    from django.db.models import Q
                    if Folder.objects.filter(
                        Q(google_folder_id=item_id) | Q(name=item_name, parent=parent_folder_obj),
                        is_deleted=True
                    ).exists():
                        continue

                    if item_id in existing_folder_map:
                        continue
                    elif item_name in existing_folder_name_map:
                        f = existing_folder_name_map[item_name]
                        if f.is_deleted:
                            continue
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
                            cp = CustomDynamicPage.objects.filter(
                                Q(google_drive_folder_id=item_id) | Q(title__iexact=item_name)
                            ).first()
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
                    
                    # File synchronization - SKIP if soft-deleted in DB
                    if File.objects.filter(
                        Q(google_file_id=item_id) | Q(name=item_name, folder=parent_folder_obj),
                        is_deleted=True
                    ).exists():
                        continue

                    if item_id in existing_file_map:
                        continue
                    elif item_name in existing_file_name_map:
                        f = existing_file_name_map[item_name]
                        if f.is_deleted:
                            continue
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
        
        # Access check: allow access if user has direct access, or if this is a custom page system root folder,
        # or if user has access to any child folder inside
        has_access = folder.has_access(request.user)
        if not has_access:
            is_custom_page_system_root = (folder.parent is None and folder.custom_page_id is not None)
            has_child_access = any(child.has_access(request.user) for child in folder.children.filter(is_deleted=False))
            if not is_custom_page_system_root and not has_child_access:
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

        # Subfolders access filter (exclude soft-deleted folders)
        subfolders = folder.children.filter(is_deleted=False).order_by('name')
        if not (request.user.role and request.user.role.name == "Super Admin"):
            subfolders = [f for f in subfolders if f.has_access(request.user)]
            
        # Files in folder (exclude soft-deleted files)
        files = folder.files.filter(is_deleted=False).order_by('name')
        
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
        Enforces module isolation so custom module folders never leak into MOU Repositories.
        """
        custom_page_id = request.query_params.get('custom_page_id')
        user = request.user

        if custom_page_id:
            from users.models import CustomDynamicPage
            from django.db.models import Q
            cp = CustomDynamicPage.objects.filter(id=custom_page_id).first()
            if cp:
                root_folder = Folder.objects.filter(id=int(cp.root_folder_id)).first() if cp.root_folder_id else None
                if cp.google_drive_folder_id:
                    self.sync_drive_directory(cp.google_drive_folder_id, root_folder, request.user)
                
                if root_folder:
                    root_folders = Folder.objects.filter(
                        Q(parent=root_folder) | Q(custom_page=cp, parent=None),
                        is_deleted=False
                    ).exclude(id=root_folder.id).order_by('name')
                else:
                    root_folders = Folder.objects.filter(custom_page=cp, is_deleted=False).order_by('name')
            else:
                root_folders = Folder.objects.none()
        else:
            # Trigger sync from Google Drive using dedicated MOU Repository folder ID under Application Root
            mou_root_id = drive_service.get_or_create_mou_repository_folder_id()
            if mou_root_id:
                self.sync_drive_directory(mou_root_id, None, request.user)

            # Base query for root folders (no parent) isolated strictly to mou_repository with no custom_page
            root_folders = Folder.objects.filter(parent=None, is_deleted=False, module_type='mou_repository', custom_page=None).exclude(name__iexact='Recycle Bin').exclude(module_type='recycle_bin').order_by('name')



        # If user is Super Admin, they see all root folders for this module context
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
        # These are "orphaned" shared subfolders that should be shown at the root level of their respective module.
        if custom_page_id:
            all_subfolders = Folder.objects.filter(custom_page_id=custom_page_id, is_deleted=False).exclude(parent=None)
        else:
            all_subfolders = Folder.objects.filter(module_type='mou_repository', custom_page=None, is_deleted=False).exclude(parent=None)

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

    @action(detail=False, methods=['post'], url_path='import-folder')
    def import_folder(self, request):
        user = request.user
        parent_id = request.data.get('parent_id') or request.data.get('folder_id')
        custom_page_id = request.data.get('custom_page_id')

        parent_folder = None
        if parent_id:
            try:
                parent_folder = Folder.objects.get(pk=parent_id, is_deleted=False)
                if not parent_folder.has_access(user):
                    return Response({'detail': 'Permission denied to upload to target directory.'}, status=status.HTTP_403_FORBIDDEN)
            except Folder.DoesNotExist:
                return Response({'detail': 'Target parent folder not found.'}, status=status.HTTP_404_NOT_FOUND)

        files = request.FILES.getlist('files')
        relative_paths = request.POST.getlist('relative_paths')

        if not files or not relative_paths or len(files) != len(relative_paths):
            return Response({'detail': 'Invalid import payload. Files and relative_paths count must match.'}, status=status.HTTP_400_BAD_REQUEST)

        imported_folders_created = 0
        imported_files_created = 0
        folder_cache = {}

        try:
            with transaction.atomic():
                from files.models import File
                for file_obj, rel_path in zip(files, relative_paths):
                    clean_path = rel_path.replace('\\', '/').strip('/')
                    parts = clean_path.split('/')
                    
                    filename = parts[-1]
                    dir_parts = parts[:-1]

                    current_parent = parent_folder

                    path_key = ""
                    for part in dir_parts:
                        path_key = f"{path_key}/{part}" if path_key else part
                        if path_key in folder_cache:
                            current_parent = folder_cache[path_key]
                        else:
                            folder, created = Folder.objects.get_or_create(
                                name=part,
                                parent=current_parent,
                                custom_page_id=custom_page_id if current_parent is None else current_parent.custom_page_id,
                                is_deleted=False,
                                defaults={'created_by': user, 'status': 'Active'}
                            )
                            if created:
                                imported_folders_created += 1
                            folder_cache[path_key] = folder
                            current_parent = folder

                    File.objects.create(
                        name=filename,
                        folder=current_parent,
                        uploaded_by=user,
                        file=file_obj,
                        size=file_obj.size,
                        file_type=file_obj.content_type or 'application/octet-stream'
                    )
                    imported_files_created += 1

                log_activity(
                    user=user,
                    action=f"Imported directory tree containing {imported_folders_created} folders and {imported_files_created} files.",
                    module="Folders"
                )

                return Response({
                    'detail': f"Folder tree imported successfully with {imported_folders_created} new subfolders and {imported_files_created} files.",
                    'imported_folders': imported_folders_created,
                    'imported_files': imported_files_created
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Folder import failed: {e}")
            return Response({'detail': f"Folder import failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

