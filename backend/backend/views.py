from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Q, Sum, Count
from permissions.custom_permissions import HasDynamicPermission
from folders.models import Folder
from files.models import File
from notifications.models import Notification
from activity_logs.models import ActivityLog
from folders.serializers import FolderSerializer
from files.serializers import FileSerializer
from users.serializers import CustomUserSerializer
from activity_logs.serializers import ActivityLogSerializer
from notifications.serializers import NotificationSerializer
from mous.models import MOU
import datetime


User = get_user_model()

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, HasDynamicPermission]
    required_permission = 'view_dashboard'

    def get(self, request):
        user = request.user
        role_name = user.role.name if user.role else 'User'

        # Auto-check expiries to ensure DB status is up-to-date
        try:
            from backend.middleware import check_mou_expiries
            check_mou_expiries()
        except Exception:
            pass

        # User counts
        if role_name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]:
            total_users = User.objects.count()
            active_users = User.objects.filter(status='Active').count()
        else:
            user_dept = getattr(user, 'department', None)
            if user_dept:
                total_users = User.objects.filter(department=user_dept).count()
                active_users = User.objects.filter(department=user_dept, status='Active').count()
            else:
                total_users = 0
                active_users = 0

        # Folder, File and MOU querysets based on role
        if role_name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]:
            mous_qs = MOU.objects.all()
            folders_qs = Folder.objects.all()
            files_qs = File.objects.all()
        else:
            # Standard User
            all_folders = Folder.objects.all()
            accessible_ids = [f.id for f in all_folders if f.has_access(user)]
            folders_qs = Folder.objects.filter(id__in=accessible_ids)
            files_qs = File.objects.filter(folder_id__in=accessible_ids)
            
            user_dept_name = getattr(user, 'department', '') or ''
            mous_qs = MOU.objects.filter(
                Q(department__in=folders_qs) | 
                Q(created_by=user) | 
                Q(department_name__iexact=user_dept_name) |
                Q(shares__department__name=user_dept_name) | 
                Q(shares__user=user)
            ).distinct()

        total_folders = folders_qs.count()
        total_files = files_qs.count()

        # User specific metrics
        my_files_qs = File.objects.filter(uploaded_by=user)
        my_files_count = my_files_qs.count()
        my_recent_files = my_files_qs.order_by('-created_at')[:5]
        my_recent_files_serializer = FileSerializer(my_recent_files, many=True, context={'request': request})

        # Recent uploads
        recent_files = files_qs.order_by('-created_at')[:5]
        recent_files_serializer = FileSerializer(recent_files, many=True, context={'request': request})

        # Recent activities (Admins & Super Admins)
        activities_data = []
        is_admin = role_name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]
        if is_admin:
            recent_activities = ActivityLog.objects.all().order_by('-created_at')[:6]
            recent_activities_serializer = ActivityLogSerializer(recent_activities, many=True)
            activities_data = recent_activities_serializer.data

        # Latest notifications
        latest_notifications = Notification.objects.filter(user=user, is_read=False).order_by('-created_at')[:5]
        notifications_serializer = NotificationSerializer(latest_notifications, many=True)

        # Real System Storage Stats
        import shutil
        from django.conf import settings
        from users.models import GoogleDriveSetting

        media_root = getattr(settings, 'MEDIA_ROOT', '')
        disk_total = 0
        disk_used = 0
        disk_free = 0
        storage_type = "local"
        drive_connected = False

        drive_setting = GoogleDriveSetting.objects.filter(is_active=True).first()
        if drive_setting and drive_setting.connection_status == 'Connected':
            disk_total = drive_setting.storage_limit or 0
            disk_used = drive_setting.storage_usage or 0
            disk_free = (disk_total - disk_used) if disk_total >= disk_used else 0
            storage_type = "google_drive"
            drive_connected = True
        else:
            try:
                usage = shutil.disk_usage(media_root if media_root else '.')
                disk_total = usage.total
                disk_used = usage.used
                disk_free = usage.free
            except Exception:
                pass

        def bytes_for_types(qs, types):
            result = qs.filter(file_type__in=types).aggregate(total=Sum('size'))
            return result['total'] or 0

        pdf_types = ['application/pdf', 'pdf']
        image_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'jpg', 'jpeg', 'png', 'gif', 'webp']
        doc_types = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'doc', 'docx']
        xls_types = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xls', 'xlsx']
        ppt_types = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'ppt', 'pptx']
        video_types = ['video/mp4', 'video/avi', 'video/mov', 'mp4', 'avi', 'mov']
        audio_types = ['audio/mpeg', 'audio/wav', 'mp3', 'wav']

        pdf_size = bytes_for_types(files_qs, pdf_types)
        image_size = bytes_for_types(files_qs, image_types)
        doc_size = bytes_for_types(files_qs, doc_types)
        xls_size = bytes_for_types(files_qs, xls_types)
        ppt_size = bytes_for_types(files_qs, ppt_types)
        video_size = bytes_for_types(files_qs, video_types)
        audio_size = bytes_for_types(files_qs, audio_types)
        total_db_size = files_qs.aggregate(total=Sum('size'))['total'] or 0

        # Recent folders
        recent_folders = folders_qs.order_by('-created_at')[:4]
        recent_folders_serializer = FolderSerializer(recent_folders, many=True)

        # Real MOU & Folder status counts from database
        today = datetime.date.today()

        # Active Agreements: Count active MOUs + active Repository Folders (excluding Draft, Pending, Expired, Archived)
        active_mou_count = mous_qs.filter(
            Q(status__in=['Active', 'Renewed', 'Signed']),
            Q(expiry_date__isnull=True) | Q(expiry_date__gte=today)
        ).exclude(status__in=['Draft', 'Pending Verification', 'Pending Review', 'Expired', 'Archived']).count()

        active_folder_count = folders_qs.filter(
            Q(status__in=['Active', 'Signed', 'Renewed']),
            Q(expiry_date__isnull=True) | Q(expiry_date__gte=today)
        ).count()

        active_mous = active_mou_count + active_folder_count

        # Pending Verification MOUs
        pending_approval = mous_qs.filter(
            status__in=['Pending Verification', 'Pending Review']
        ).count()
        if pending_approval == 0:
            pending_approval = folders_qs.filter(status='Pending Review').count()

        # Expiring in 30 Days
        expiring_30 = mous_qs.filter(
            status__in=['Active', 'Renewed', 'Signed'],
            expiry_date__gte=today,
            expiry_date__lte=today + datetime.timedelta(days=30)
        ).count()
        if expiring_30 == 0:
            expiring_30 = folders_qs.filter(
                status__in=['Active', 'Signed'],
                expiry_date__gte=today,
                expiry_date__lte=today + datetime.timedelta(days=30)
            ).count()

        # Real Department/Folder distribution from database
        dept_colors = {
            'Engineering': '#3B82F6',
            'Medical': '#14B8A6',
            'Commerce': '#F59E0B',
            'Arts': '#EC4899',
            'Science': '#8B5CF6',
            'Law': '#F97316',
        }

        mou_distribution_data = []
        mou_depts = mous_qs.values('department_name').annotate(value=Count('id')).order_by('-value')
        for item in mou_depts:
            name = item['department_name']
            if name:
                mou_distribution_data.append({
                    'name': name,
                    'value': item['value'],
                    'color': dept_colors.get(name, '#8B5CF6')
                })

        if not mou_distribution_data:
            for folder in folders_qs.filter(parent=None):
                cnt = files_qs.filter(folder=folder).count()
                if cnt > 0:
                    mou_distribution_data.append({
                        'name': folder.name,
                        'value': cnt,
                        'color': dept_colors.get(folder.name, '#8B5CF6')
                    })

        # Real Monthly Trend Data (Last 6 Months)
        trend_months = []
        for i in range(5, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            start_date = datetime.date(y, m, 1)
            month_name = start_date.strftime('%b')
            next_m = m + 1
            next_y = y
            if next_m > 12:
                next_m = 1
                next_y += 1
            end_date = datetime.date(next_y, next_m, 1)

            # Cumulative Active count for this month
            active_cnt = mous_qs.filter(
                Q(created_at__lt=datetime.datetime.combine(end_date, datetime.time.min)),
                Q(status__in=['Active', 'Renewed', 'Signed']),
                Q(expiry_date__isnull=True) | Q(expiry_date__gte=start_date)
            ).count()

            # Pending count for this month
            pending_cnt = mous_qs.filter(
                Q(created_at__lt=datetime.datetime.combine(end_date, datetime.time.min)),
                Q(status__in=['Pending Verification', 'Pending Review'])
            ).count()

            # Expiring count for this month
            expiring_cnt = mous_qs.filter(
                expiry_date__gte=start_date,
                expiry_date__lt=end_date
            ).count()

            trend_months.append({
                'month': month_name,
                'year': y,
                'Active': active_cnt,
                'Pending': pending_cnt,
                'Expiring': expiring_cnt
            })

        return Response({
            "total_users": total_users,
            "active_users": active_users,
            "total_folders": total_folders,
            "total_files": total_files,
            "my_files_count": my_files_count,
            "active_mous": active_mous,
            "pending_approval": pending_approval,
            "expiring_30_days": expiring_30,
            "distribution_data": mou_distribution_data,
            "trend_data": trend_months,
            "recent_uploads": recent_files_serializer.data,
            "my_recent_uploads": my_recent_files_serializer.data,
            "recent_folders": recent_folders_serializer.data,
            "recent_activities": activities_data,
            "latest_notifications": notifications_serializer.data,
            "storage": {
                "storage_type": storage_type,
                "drive_connected": drive_connected,
                "disk_total_bytes": disk_total,
                "disk_used_bytes": disk_used,
                "disk_free_bytes": disk_free,
                "breakdown": {
                    "pdf": pdf_size,
                    "image": image_size,
                    "doc": doc_size,
                    "xls": xls_size,
                    "ppt": ppt_size,
                    "video": video_size,
                    "audio": audio_size,
                    "total": total_db_size
                }
            }
        })


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response({"folders": [], "files": [], "users": []})

        user = request.user
        is_admin = user.role and user.role.name in ["Super Admin", "Admin"]

        # Search folders user has access to
        if user.role and user.role.name == "Super Admin":
            folders = Folder.objects.filter(name__icontains=query)
        else:
            all_folders = Folder.objects.filter(name__icontains=query)
            folders = [f for f in all_folders if f.has_access(user)]

        # Search files user has access to
        if user.role and user.role.name == "Super Admin":
            files = File.objects.filter(name__icontains=query)
        else:
            all_folders = Folder.objects.all()
            accessible_ids = [f.id for f in all_folders if f.has_access(user)]
            files = File.objects.filter(folder_id__in=accessible_ids, name__icontains=query)

        # Search users (Admins only)
        users = []
        if is_admin:
            users = User.objects.filter(
                Q(name__icontains=query) | 
                Q(email__icontains=query) |
                Q(department__icontains=query)
            )

        return Response({
            "folders": FolderSerializer(folders[:20], many=True).data,
            "files": FileSerializer(files[:20], many=True, context={'request': request}).data,
            "users": CustomUserSerializer(users[:20], many=True).data if is_admin else []
        })
