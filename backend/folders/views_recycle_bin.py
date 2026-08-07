import logging
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from folders.models import Folder, RecycleBinSetting
from files.models import File
from services import drive_service
from activity_logs.utils import log_activity
from notifications.utils import notify_admins

logger = logging.getLogger(__name__)


class IsAdminOrSuperAdmin(permissions.BasePermission):
    """
    Permission class that grants access to Admin and Super Admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role
            and request.user.role.name in ["Super Admin", "Admin"]
        )


def calculate_retention_cutoff(retention_period):
    now = timezone.now()
    if retention_period == '7_days':
        return now - timedelta(days=7)
    elif retention_period == '14_days':
        return now - timedelta(days=14)
    elif retention_period == '30_days':
        return now - timedelta(days=30)
    elif retention_period == '6_weeks':
        return now - timedelta(weeks=6)
    elif retention_period == '3_months':
        return now - timedelta(days=90)
    elif retention_period == '6_months':
        return now - timedelta(days=180)
    elif retention_period == '1_year':
        return now - timedelta(days=365)
    return None


def calculate_days_remaining(deleted_at, retention_period):
    if not deleted_at or retention_period == 'never':
        return None
    period_days = {
        '7_days': 7,
        '14_days': 14,
        '30_days': 30,
        '6_weeks': 42,
        '3_months': 90,
        '6_months': 180,
        '1_year': 365
    }.get(retention_period, 30)
    expiry_dt = deleted_at + timedelta(days=period_days)
    remaining_seconds = (expiry_dt - timezone.now()).total_seconds()
    return max(0, int(remaining_seconds // 86400))


def recursive_purge_folder(folder):
    """
    Recursively purges a folder and all its child subfolders and files
    from Google Drive and database.
    """
    # 1. Purge all child files
    for file_obj in folder.files.all():
        if file_obj.google_file_id:
            try:
                drive_service.delete_file(file_obj.google_file_id)
            except Exception as e:
                logger.warning(f"Google Drive file delete error for '{file_obj.name}': {e}")
        file_obj.delete()

    # 2. Purge all child subfolders recursively
    for child in folder.children.all():
        recursive_purge_folder(child)

    # 3. Purge the folder itself from Google Drive and DB
    if folder.google_folder_id:
        try:
            drive_service.delete_file(folder.google_folder_id)
        except Exception as e:
            logger.warning(f"Google Drive folder delete error for '{folder.name}': {e}")
    folder.delete()


class RecycleBinViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrSuperAdmin]

    def list(self, request):
        """
        GET /api/recycle-bin/
        Returns all soft-deleted folders and files with metadata.
        Automatically checks and purges expired items if auto-delete is enabled.
        """
        setting = RecycleBinSetting.get_setting()
        if setting.auto_delete_enabled and setting.retention_period != 'never':
            try:
                self._purge_expired_items(setting.retention_period)
            except Exception as e:
                logger.error(f"Error auto-purging expired recycle bin items: {e}")

        # Filter by accessibility / permissions if not Super Admin
        user = request.user
        is_super = user and user.is_authenticated and (user.is_superuser or (user.role and user.role.name == "Super Admin"))

        deleted_folders_qs = Folder.objects.filter(is_deleted=True).select_related('created_by', 'deleted_by', 'parent', 'custom_page').order_by('-deleted_at')
        deleted_files_qs = File.objects.filter(is_deleted=True).select_related('uploaded_by', 'deleted_by', 'folder', 'folder__custom_page').order_by('-deleted_at')

        if not is_super:
            accessible_folder_ids = [f.id for f in deleted_folders_qs if f.has_access(user) or f.created_by == user or f.deleted_by == user]
            deleted_folders_qs = deleted_folders_qs.filter(id__in=accessible_folder_ids)

            accessible_file_ids = [f.id for f in deleted_files_qs if (f.folder and f.folder.has_access(user)) or f.uploaded_by == user or f.deleted_by == user]
            deleted_files_qs = deleted_files_qs.filter(id__in=accessible_file_ids)

        items = []

        for folder in deleted_folders_qs:
            ancestors = folder.get_ancestors()
            module_name = folder.custom_page.title if folder.custom_page else "MOU Repository"
            path_str = " > ".join([a.name for a in ancestors]) if ancestors else f"{module_name} Root"
            days_rem = calculate_days_remaining(folder.deleted_at, setting.retention_period)

            items.append({
                "id": f"folder_{folder.id}",
                "real_id": folder.id,
                "item_type": "folder",
                "name": folder.name,
                "module_name": module_name,
                "deleted_at": folder.deleted_at or folder.updated_at,
                "deleted_by_name": folder.deleted_by.name if folder.deleted_by else (folder.created_by.name if folder.created_by else "System"),
                "deleted_by_email": folder.deleted_by.email if folder.deleted_by else "",
                "original_path": path_str,
                "file_size": None,
                "google_drive_id": folder.google_folder_id,
                "status": folder.status,
                "days_remaining": days_rem
            })

        for file_obj in deleted_files_qs:
            module_name = file_obj.folder.custom_page.title if (file_obj.folder and file_obj.folder.custom_page) else "MOU Repository"
            folder_path = file_obj.folder.name if file_obj.folder else f"{module_name} Root"
            days_rem = calculate_days_remaining(file_obj.deleted_at, setting.retention_period)

            items.append({
                "id": f"file_{file_obj.id}",
                "real_id": file_obj.id,
                "item_type": "file",
                "name": file_obj.name,
                "module_name": module_name,
                "deleted_at": file_obj.deleted_at or file_obj.updated_at,
                "deleted_by_name": file_obj.deleted_by.name if file_obj.deleted_by else (file_obj.uploaded_by.name if file_obj.uploaded_by else "System"),
                "deleted_by_email": file_obj.deleted_by.email if file_obj.deleted_by else "",
                "original_path": folder_path,
                "file_size": file_obj.file_size or file_obj.size,
                "google_drive_id": file_obj.google_file_id,
                "mime_type": file_obj.mime_type or file_obj.file_type,
                "days_remaining": days_rem
            })

        # Sort all combined items by deleted_at descending
        items.sort(key=lambda x: str(x.get('deleted_at') or ''), reverse=True)

        return Response({
            "items": items,
            "total_count": len(items),
            "retention_period": setting.retention_period,
            "retention_display": setting.get_retention_period_display(),
            "auto_delete_enabled": setting.auto_delete_enabled
        })

    @action(detail=False, methods=['post'], url_path='restore')
    def restore(self, request):
        """
        POST /api/recycle-bin/restore/
        Restores selected folders or files back to active status.
        Body: { "items": [{"id": 1, "type": "folder"}, {"id": 5, "type": "file"}] }
        """
        items_payload = request.data.get('items', [])
        if not items_payload:
            return Response({"detail": "No items provided for restoration."}, status=status.HTTP_400_BAD_REQUEST)

        restored_count = 0
        try:
            with transaction.atomic():
                for item in items_payload:
                    item_type = item.get('type')
                    item_id = item.get('id')

                    if item_type == 'folder':
                        folder = Folder.objects.filter(id=item_id, is_deleted=True).first()
                        if folder:
                            # Auto-restore parent folder chain if parent was also deleted
                            parent_chain = folder.get_ancestors()
                            for ancestor in parent_chain:
                                if ancestor.is_deleted:
                                    ancestor.is_deleted = False
                                    ancestor.deleted_at = None
                                    ancestor.deleted_by = None
                                    ancestor.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

                            folder.is_deleted = False
                            folder.deleted_at = None
                            folder.deleted_by = None
                            folder.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

                            # Also restore all child files & subfolders if deleted together
                            Folder.objects.filter(parent=folder, is_deleted=True).update(is_deleted=False, deleted_at=None, deleted_by=None)
                            File.objects.filter(folder=folder, is_deleted=True).update(is_deleted=False, deleted_at=None, deleted_by=None)

                            restored_count += 1
                            log_activity(request.user, f"Restored folder '{folder.name}' from Recycle Bin", "folders", request)

                    elif item_type == 'file':
                        file_obj = File.objects.filter(id=item_id, is_deleted=True).first()
                        if file_obj:
                            # Auto-restore parent folder chain if parent was also deleted
                            if file_obj.folder and file_obj.folder.is_deleted:
                                parent_chain = file_obj.folder.get_ancestors() + [file_obj.folder]
                                for ancestor in parent_chain:
                                    if ancestor.is_deleted:
                                        ancestor.is_deleted = False
                                        ancestor.deleted_at = None
                                        ancestor.deleted_by = None
                                        ancestor.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

                            file_obj.is_deleted = False
                            file_obj.deleted_at = None
                            file_obj.deleted_by = None
                            file_obj.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
                            restored_count += 1
                            log_activity(request.user, f"Restored file '{file_obj.name}' from Recycle Bin", "files", request)

            notify_admins("Recycle Bin Items Restored", f"{restored_count} item(s) restored from Recycle Bin by {request.user.name}.")
            return Response({
                "detail": f"Successfully restored {restored_count} item(s) to original location.",
                "restored_count": restored_count
            })
        except Exception as e:
            logger.error(f"Failed to restore recycle bin items: {e}", exc_info=True)
            return Response({"detail": f"Restoration failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='permanent-delete')
    def permanent_delete(self, request):
        """
        POST /api/recycle-bin/permanent-delete/
        Permanently deletes selected folders/files from database and Google Drive.
        Body: { "items": [{"id": 1, "type": "folder"}, {"id": 5, "type": "file"}] }
        """
        items_payload = request.data.get('items', [])
        if not items_payload:
            return Response({"detail": "No items provided for permanent deletion."}, status=status.HTTP_400_BAD_REQUEST)

        purged_count = 0
        try:
            with transaction.atomic():
                for item in items_payload:
                    item_type = item.get('type')
                    item_id = item.get('id')

                    if item_type == 'folder':
                        folder = Folder.objects.filter(id=item_id).first()
                        if folder:
                            folder_name = folder.name
                            recursive_purge_folder(folder)
                            purged_count += 1
                            log_activity(request.user, f"Permanently deleted folder '{folder_name}' from Recycle Bin", "folders", request)

                    elif item_type == 'file':
                        file_obj = File.objects.filter(id=item_id).first()
                        if file_obj:
                            file_name = file_obj.name
                            if file_obj.google_file_id:
                                try:
                                    drive_service.delete_file(file_obj.google_file_id)
                                except Exception as d_err:
                                    logger.warning(f"Google Drive file deletion note: {d_err}")
                            file_obj.delete()
                            purged_count += 1
                            log_activity(request.user, f"Permanently deleted file '{file_name}' from Recycle Bin", "files", request)

            notify_admins("Recycle Bin Items Purged", f"{purged_count} item(s) permanently purged from Recycle Bin by {request.user.name}.")
            return Response({
                "detail": f"Permanently deleted {purged_count} item(s) from system and Google Drive.",
                "purged_count": purged_count
            })
        except Exception as e:
            logger.error(f"Permanent deletion failed: {e}", exc_info=True)
            return Response({"detail": f"Permanent deletion failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    @action(detail=False, methods=['post'], url_path='empty')
    def empty_bin(self, request):
        """
        POST /api/recycle-bin/empty/
        Permanently purges ALL items currently in the Recycle Bin.
        """
        deleted_folders = list(Folder.objects.filter(is_deleted=True))
        deleted_files = list(File.objects.filter(is_deleted=True))

        purged_count = 0
        try:
            with transaction.atomic():
                for file_obj in deleted_files:
                    if file_obj.google_file_id:
                        try:
                            drive_service.delete_file(file_obj.google_file_id)
                        except Exception:
                            pass
                    file_obj.delete()
                    purged_count += 1

                for folder in deleted_folders:
                    recursive_purge_folder(folder)
                    purged_count += 1

            log_activity(request.user, "Emptied entire Recycle Bin", "recycle_bin", request)
            notify_admins("Recycle Bin Emptied", f"Recycle Bin was completely emptied ({purged_count} items purged) by {request.user.name}.")
            return Response({
                "detail": f"Recycle Bin completely emptied! {purged_count} items permanently purged.",
                "purged_count": purged_count
            })
        except Exception as e:
            logger.error(f"Failed to empty recycle bin: {e}", exc_info=True)
            return Response({"detail": f"Emptying recycle bin failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get', 'patch'], url_path='settings')
    def settings_view(self, request):
        """
        GET/PATCH /api/recycle-bin/settings/
        Allows Super Admin to view and update the Auto-Delete Retention Policy.
        """
        is_super = request.user and request.user.is_authenticated and (request.user.is_superuser or (request.user.role and request.user.role.name == "Super Admin"))
        
        setting = RecycleBinSetting.get_setting()

        if request.method == 'PATCH':
            if not is_super:
                return Response({"detail": "Only Super Admin can update Recycle Bin retention settings."}, status=status.HTTP_403_FORBIDDEN)

            retention_period = request.data.get('retention_period')
            auto_delete_enabled = request.data.get('auto_delete_enabled')

            valid_periods = [c[0] for c in RecycleBinSetting.RETENTION_CHOICES]
            if retention_period and retention_period in valid_periods:
                setting.retention_period = retention_period
            
            if auto_delete_enabled is not None:
                setting.auto_delete_enabled = bool(auto_delete_enabled)

            setting.updated_by = request.user
            setting.save()

            log_activity(request.user, f"Updated Recycle Bin retention policy to '{setting.get_retention_period_display()}'", "recycle_bin", request)
            notify_admins("Recycle Bin Policy Updated", f"Recycle Bin retention policy updated to '{setting.get_retention_period_display()}' by {request.user.name}.")

        return Response({
            "retention_period": setting.retention_period,
            "retention_display": setting.get_retention_period_display(),
            "auto_delete_enabled": setting.auto_delete_enabled,
            "available_options": [
                {"value": c[0], "label": c[1]} for c in RecycleBinSetting.RETENTION_CHOICES
            ]
        })

    def _purge_expired_items(self, retention_period):
        cutoff_date = calculate_retention_cutoff(retention_period)
        if not cutoff_date:
            return 0

        expired_files = File.objects.filter(is_deleted=True, deleted_at__lt=cutoff_date)
        expired_folders = Folder.objects.filter(is_deleted=True, deleted_at__lt=cutoff_date)

        purged = 0
        for f in expired_files:
            if f.google_file_id:
                try:
                    drive_service.delete_file(f.google_file_id)
                except Exception:
                    pass
            f.delete()
            purged += 1

        for fld in expired_folders:
            recursive_purge_folder(fld)
            purged += 1

        if purged > 0:
            logger.info(f"Auto-purged {purged} expired items from Recycle Bin (Cutoff: {cutoff_date})")
        return purged
