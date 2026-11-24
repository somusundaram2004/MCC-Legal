from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework import status, generics, viewsets, permissions
from rest_framework.permissions import IsAuthenticated, AllowAny, SAFE_METHODS
from django.db.models import Q, Count
from django.db import transaction
from django.db import IntegrityError, OperationalError
from django.db.models.deletion import ProtectedError
from datetime import date, timedelta
import time
import os
import io
import secrets
import logging
from django.http import FileResponse, Http404
from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()

from .models import MOUTemplate, MOU, MOUDocument, MOURenewal, MOUShare, MOUShareDownloadLog, DepartmentSubmission, Stream
from .serializers import (
    MOUTemplateSerializer, MOUSerializer, MOUDocumentSerializer, StreamSerializer,
    MOUShareSerializer, MOUShareDownloadLogSerializer
)
from services.email_service import SHARE_EMAIL_TEMPLATES, send_mou_share_email
from activity_logs.models import ActivityLog
from notifications.models import Notification
from notifications.utils import create_notification, notify_admins
from files.models import File
from folders.models import Folder

def log_activity(user, action, module="MOUs", ip_address=None):
    ActivityLog.objects.create(
        user=user,
        action=action,
        module=module,
        ip_address=ip_address or "127.0.0.1"
    )

def send_notification(user, title, description):
    Notification.objects.create(
        user=user,
        title=title,
        description=description
    )

class MOUTemplateListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = MOUTemplate.objects.all().order_by('-created_at')
    serializer_class = MOUTemplateSerializer

    def perform_create(self, serializer):
        tmpl = serializer.save(created_by=self.request.user)
        log_activity(self.request.user, f"Created MOU Template '{tmpl.name}'", module="Templates")

class MOUTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    queryset = MOUTemplate.objects.all()
    serializer_class = MOUTemplateSerializer

def generate_unique_mou_number():
    """Safely calculates and guarantees the next available unique MOU number for the current year."""
    year = date.today().year
    prefix = f"MOU-{year}-"
    existing = MOU.objects.filter(mou_number__startswith=prefix).values_list('mou_number', flat=True)
    max_seq = 0
    for num in existing:
        try:
            seq = int(num.split('-')[-1])
            if seq > max_seq:
                max_seq = seq
        except (ValueError, IndexError):
            pass
    candidate = max_seq + 1
    while MOU.objects.filter(mou_number=f"{prefix}{candidate:04d}").exists():
        candidate += 1
    return f"{prefix}{candidate:04d}"

class MOUListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        qs = MOU.objects.all().order_by('-created_at')

        # Role filtering
        is_admin = user.role and user.role.name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]
        if not is_admin:
            # Department users see MOUs in accessible folders or created by them
            all_folders = Folder.objects.all()
            accessible_ids = [f.id for f in all_folders if f.has_access(user)]
            qs = qs.filter(Q(department_id__in=accessible_ids) | Q(created_by=user))

        # Query Filters
        status_filter = request.query_params.get('status')
        type_filter = request.query_params.get('type')
        dept_filter = request.query_params.get('department')
        dept_name_filter = request.query_params.get('department_name')
        dept_category_filter = request.query_params.get('department_category')
        stream_filter = request.query_params.get('stream')
        search_query = request.query_params.get('q', '').strip()

        if status_filter:
            qs = qs.filter(status__iexact=status_filter)
        if type_filter:
            qs = qs.filter(mou_type_id=type_filter)
        if dept_filter:
            qs = qs.filter(department_id=dept_filter)
        if dept_name_filter:
            qs = qs.filter(department_name__iexact=dept_name_filter)
        if stream_filter:
            from .models import Department
            matching_depts = Department.objects.filter(
                Q(stream_id=stream_filter) | Q(stream__name__iexact=stream_filter)
            ).values_list('name', flat=True)
            if matching_depts:
                qs = qs.filter(Q(department_name__in=matching_depts) | Q(department_name__icontains=stream_filter))
            else:
                qs = qs.filter(Q(department_name__icontains=stream_filter))
        if dept_category_filter:
            if dept_category_filter == 'Aided':
                qs = qs.filter(department_name__endswith='(Aided)')
            elif dept_category_filter == 'Self-Financed (SFS)':
                qs = qs.filter(department_name__endswith='(SFS)')
            elif dept_category_filter in ['Administrative Units', 'Other / Administrative Units']:
                qs = qs.exclude(department_name__endswith='(Aided)').exclude(department_name__endswith='(SFS)')
        if search_query:
            qs = qs.filter(
                Q(title__icontains=search_query) |
                Q(mou_number__icontains=search_query) |
                Q(partner_organization__icontains=search_query) |
                Q(coordinator_name__icontains=search_query) |
                Q(summary__icontains=search_query)
            )

        serializer = MOUSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        data = request.data.copy()
        user = request.user
        custom_mou_number = bool(data.get('mou_number'))

        max_attempts = 8
        for attempt in range(max_attempts):
            try:
                with transaction.atomic():
                    if not custom_mou_number:
                        data['mou_number'] = generate_unique_mou_number()

                    serializer = MOUSerializer(data=data)
                    if serializer.is_valid():
                        mou = serializer.save(created_by=user)
                        
                        # Link original document if file_id provided
                        original_file_id = request.data.get('original_mou_id')
                        if original_file_id:
                            try:
                                f = File.objects.get(id=original_file_id)
                                mou.original_mou = f
                                mou.save()
                                MOUDocument.objects.create(mou=mou, document_type='original', file=f, uploaded_by=user)
                            except File.DoesNotExist:
                                pass

                        log_activity(user, f"Created MOU record '{mou.title}' ({mou.mou_number})")
                        send_notification(user, f"MOU Created: {mou.title}", f"MOU {mou.mou_number} is currently in {mou.status} status.")
                        
                        return Response(MOUSerializer(mou, context={'request': request}).data, status=status.HTTP_201_CREATED)
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            except Exception as err:
                err_str = str(err).lower()
                is_lock = 'locked' in err_str or 'busy' in err_str or 'deadlock' in err_str
                is_mou_dup = 'mou_number' in err_str and not custom_mou_number
                if (is_lock or is_mou_dup) and attempt < max_attempts - 1:
                    time.sleep(0.08 * (2 ** min(attempt, 4)))
                    continue
                if is_lock or is_mou_dup:
                    return Response(
                        {"detail": "Server is busy processing requests. Please retry in a moment."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )
                raise

        return Response({"detail": "Server is busy processing requests. Please retry in a moment."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

def user_is_admin_or_legal(user):
    if not user or not user.is_authenticated:
        return False
    if getattr(user, 'is_superuser', False):
        return True
    role_name = getattr(getattr(user, 'role', None), 'name', '')
    return role_name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]

def user_can_access_mou(user, mou):
    if user_is_admin_or_legal(user):
        return True
    if mou.created_by == user:
        return True
    if mou.department and hasattr(mou.department, 'has_access') and mou.department.has_access(user):
        return True
    user_dept = getattr(user, 'department', None)
    if user_dept and (mou.department_name == user_dept or (mou.department and mou.department.name == user_dept)):
        return True
    if MOUShare.objects.filter(mou=mou, user=user).exists():
        return True
    if user.email and MOUShare.objects.filter(mou=mou, recipient_email__iexact=user.email).exists():
        return True
    if user_dept and MOUShare.objects.filter(mou=mou, department__name=user_dept).exists():
        return True
    return False

def user_can_manage_mou(user, mou):
    if user_is_admin_or_legal(user):
        return True
    if mou.created_by == user:
        return True
    return False

class MOUDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        try:
            return MOU.objects.get(pk=pk)
        except MOU.DoesNotExist:
            return None

    def get(self, request, pk):
        mou = self.get_object(pk)
        if not mou:
            return Response({"detail": "MOU not found."}, status=status.HTTP_404_NOT_FOUND)
        
        if not user_can_access_mou(request.user, mou):
            return Response({"detail": "You do not have permission to view this MOU."}, status=status.HTTP_403_FORBIDDEN)
        
        # Update share status to Viewed if viewed by department user
        if request.user.department:
            MOUShare.objects.filter(mou=mou, department__name=request.user.department, status='Shared').update(status='Viewed')
            
        serializer = MOUSerializer(mou, context={'request': request})
        return Response(serializer.data)

    def put(self, request, pk):
        mou = self.get_object(pk)
        if not mou:
            return Response({"detail": "MOU not found."}, status=status.HTTP_404_NOT_FOUND)

        if not user_can_manage_mou(request.user, mou):
            return Response({"detail": "You do not have permission to edit this MOU."}, status=status.HTTP_403_FORBIDDEN)

        serializer = MOUSerializer(mou, data=request.data, partial=True)
        if serializer.is_valid():
            updated_mou = serializer.save()
            log_activity(request.user, f"Updated MOU details for '{updated_mou.title}'")
            return Response(MOUSerializer(updated_mou, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        mou = self.get_object(pk)
        if not mou:
            return Response({"detail": "MOU not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if not user_can_manage_mou(request.user, mou):
            return Response({"detail": "You do not have permission to delete this MOU."}, status=status.HTTP_403_FORBIDDEN)
            
        mou.delete()
        log_activity(request.user, f"Deleted MOU record #{pk}")
        return Response({"detail": "MOU deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

class MOUSubmitSignedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            mou = MOU.objects.get(pk=pk)
        except MOU.DoesNotExist:
            return Response({"detail": "MOU not found."}, status=status.HTTP_404_NOT_FOUND)

        signed_date_str = request.data.get('signed_date')
        signed_file_id = request.data.get('signed_mou_id')
        duration = request.data.get('duration_months')
        uploaded_file = request.FILES.get('file') or request.FILES.get('mou_file')

        if signed_date_str:
            try:
                mou.signed_date = date.fromisoformat(signed_date_str)
            except ValueError:
                pass
        else:
            mou.signed_date = date.today()

        if duration:
            mou.duration_months = int(duration)

        # Calculate Expiry
        mou.expiry_date = mou.calculate_expiry(mou.signed_date, mou.duration_months)

        with transaction.atomic():
            if uploaded_file:
                mou.mou_file = uploaded_file
                
                # Setup Google Drive upload under Signed copies
                import mimetypes
                file_type, _ = mimetypes.guess_type(uploaded_file.name)
                if not file_type:
                    file_type = "application/octet-stream"
                
                submission_folder = None
                if mou.department:
                    from folders.models import Folder
                    from services import drive_service
                    submission_folder, _ = Folder.objects.get_or_create(
                        name="Signed Copies",
                        parent=mou.department,
                        defaults={'created_by': request.user}
                    )
                    if not submission_folder.google_folder_id:
                        try:
                            google_id = drive_service.create_folder(submission_folder.name, mou.department.google_folder_id)
                            submission_folder.google_folder_id = google_id
                            submission_folder.save(update_fields=['google_folder_id'])
                        except Exception:
                            pass
                
                target_folder = submission_folder or mou.department
                if not target_folder:
                    target_folder = Folder.objects.filter(is_deleted=False).first()
                    if not target_folder:
                        target_folder = Folder.objects.create(name="Signed Copies", module_type="mou_repository", created_by=request.user)

                from files.models import File
                from services import drive_service
                signed_file = File.objects.create(
                    name=uploaded_file.name,
                    size=uploaded_file.size,
                    file_type=file_type,
                    folder=target_folder,
                    uploaded_by=request.user
                )
                
                try:
                    drive_meta = drive_service.upload_file(
                        uploaded_file,
                        uploaded_file.name,
                        file_type,
                        submission_folder.google_folder_id if submission_folder else None
                    )
                    signed_file.google_file_id = drive_meta['id']
                    signed_file.mime_type = drive_meta['mimeType']
                    signed_file.file_size = drive_meta['size']
                    signed_file.web_view_link = drive_meta['webViewLink']
                    signed_file.web_content_link = drive_meta['webContentLink']
                except Exception as drive_err:
                    logger.warning(f"Google Drive sync skipped: {drive_err}")
                signed_file.save()
                
                mou.signed_mou = signed_file
                MOUDocument.objects.create(mou=mou, document_type='signed', file=signed_file, uploaded_by=request.user)
            elif signed_file_id:
                try:
                    f = File.objects.get(id=signed_file_id)
                    mou.signed_mou = f
                    MOUDocument.objects.create(mou=mou, document_type='signed', file=f, uploaded_by=request.user)
                except File.DoesNotExist:
                    pass

            mou.status = 'Pending Verification'
            mou.save()

        log_activity(request.user, f"Submitted signed MOU for '{mou.title}'. Expiry date: {mou.expiry_date}")
        send_notification(request.user, f"Signed MOU Uploaded: {mou.title}", f"Status is now Pending Verification. Expiry date calculated as {mou.expiry_date}.")

        return Response(MOUSerializer(mou, context={'request': request}).data)

class MOUApproveRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not user_is_admin_or_legal(request.user):
            return Response({"detail": "Only administrators or legal officers can approve or reject MOUs."}, status=status.HTTP_403_FORBIDDEN)

        try:
            mou = MOU.objects.get(pk=pk)
        except MOU.DoesNotExist:
            return Response({"detail": "MOU not found."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action') # 'approve' or 'reject'
        remarks = request.data.get('remarks', '')

        if action == 'approve':
            mou.status = 'Active'
            mou.remarks = remarks
            mou.save()
            log_activity(request.user, f"Approved MOU '{mou.title}' → Active")
            send_notification(request.user, f"MOU Approved!", f"MOU '{mou.title}' is now Active.")
        elif action == 'reject':
            mou.status = 'Draft'
            mou.remarks = remarks
            mou.save()
            log_activity(request.user, f"Rejected MOU '{mou.title}'. Remarks: {remarks}")
            send_notification(request.user, f"MOU Rejection Notice", f"MOU '{mou.title}' requires changes. Remarks: {remarks}")
        else:
            return Response({"detail": "Invalid action. Use 'approve' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)

        return Response(MOUSerializer(mou, context={'request': request}).data)

class MOURenewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            original = MOU.objects.get(pk=pk)
        except MOU.DoesNotExist:
            return Response({"detail": "MOU not found."}, status=status.HTTP_404_NOT_FOUND)

        if not user_can_access_mou(request.user, original):
            return Response({"detail": "You do not have permission to renew this MOU."}, status=status.HTTP_403_FORBIDDEN)

        if original.status not in ['Active', 'Expired']:
            return Response(
                {"detail": f"Cannot renew MOU in '{original.status}' status. Only Active or Expired MOUs can be renewed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        max_attempts = 8
        for attempt in range(max_attempts):
            try:
                with transaction.atomic():
                    new_mou_number = generate_unique_mou_number()
                    renewed_mou = MOU.objects.create(
                        title=f"{original.title} (Renewed)",
                        mou_number=new_mou_number,
                        mou_type=original.mou_type,
                        partner_organization=original.partner_organization,
                        department=original.department,
                        department_name=original.department_name,
                        created_by=request.user,
                        original_mou=original.signed_mou or original.original_mou,
                        duration_months=original.duration_months,
                        status='Draft',
                        summary=original.summary,
                        purpose=original.purpose,
                        objectives=original.objectives,
                        beneficiaries=original.beneficiaries,
                        opportunities=original.opportunities,
                        coordinator_name=original.coordinator_name,
                        coordinator_designation=original.coordinator_designation,
                        coordinator_email=original.coordinator_email,
                        coordinator_phone=original.coordinator_phone,
                        partner_name=original.partner_name,
                        partner_designation=original.partner_designation,
                        partner_email=original.partner_email,
                        partner_phone=original.partner_phone,
                        version_number=original.version_number + 1,
                        renewed_from=original
                    )

                    original.is_renewed = True
                    original.status = 'Renewed'
                    original.save()

                    MOURenewal.objects.create(
                        original_mou=original,
                        renewed_mou=renewed_mou,
                        renewed_by=request.user,
                        notes=request.data.get('notes', 'One-click renewal initiated.')
                    )

                    log_activity(request.user, f"Initiated One-Click Renewal for MOU #{original.id} → New Draft #{renewed_mou.id}")
                    send_notification(request.user, f"Renewal Created", f"New renewal draft {renewed_mou.mou_number} created from previous agreement.")

                    return Response(MOUSerializer(renewed_mou, context={'request': request}).data, status=status.HTTP_201_CREATED)
            except Exception as err:
                err_str = str(err).lower()
                is_lock = 'locked' in err_str or 'busy' in err_str or 'deadlock' in err_str
                is_mou_dup = 'mou_number' in err_str
                if (is_lock or is_mou_dup) and attempt < max_attempts - 1:
                    time.sleep(0.08 * (2 ** min(attempt, 4)))
                    continue
                if is_lock or is_mou_dup:
                    return Response(
                        {"detail": "Server is busy processing requests. Please retry in a moment."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )
                raise

        return Response({"detail": "Server is busy processing requests. Please retry in a moment."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    def get(self, request, pk):
        try:
            mou = MOU.objects.get(pk=pk)
        except MOU.DoesNotExist:
            return Response({"detail": "MOU not found."}, status=status.HTTP_404_NOT_FOUND)

        renewals = MOURenewal.objects.filter(original_mou=mou).order_by('-renewed_at')
        data = [{
            'id': r.id,
            'original_mou_id': r.original_mou_id,
            'renewed_mou_id': r.renewed_mou_id,
            'renewed_mou_title': r.renewed_mou.title if r.renewed_mou else None,
            'renewed_mou_number': r.renewed_mou.mou_number if r.renewed_mou else None,
            'renewed_by': r.renewed_by.name if (r.renewed_by and hasattr(r.renewed_by, 'name')) else (r.renewed_by.email if r.renewed_by else None),
            'renewed_at': r.renewed_at,
            'notes': r.notes
        } for r in renewals]
        return Response(data)

class MOUReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mous = MOU.objects.all()

        # Status counts
        status_counts = {}
        for choice, _ in MOU.STATUS_CHOICES:
            status_counts[choice] = mous.filter(status=choice).count()

        # Department counts
        dept_counts = list(mous.values('department_name').annotate(total=Count('id')))

        # Expiry buckets
        today = date.today()
        expiring_30 = mous.filter(status='Active', expiry_date__lte=today + timedelta(days=30), expiry_date__gte=today).count()
        expiring_7 = mous.filter(status='Active', expiry_date__lte=today + timedelta(days=7), expiry_date__gte=today).count()
        expired_count = mous.filter(status='Expired').count()

        return Response({
            "total_mous": mous.count(),
            "status_breakdown": status_counts,
            "department_breakdown": dept_counts,
            "expiring_30_days": expiring_30,
            "expiring_7_days": expiring_7,
            "expired_total": expired_count,
        })

class MOUShareTemplateListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        templates = list(SHARE_EMAIL_TEMPLATES.values())
        return Response(templates)


class MOUShareView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        shares = MOUShare.objects.filter(mou_id=pk).select_related('mou', 'shared_file', 'department', 'user', 'shared_by').order_by('-shared_at')
        serializer = MOUShareSerializer(shares, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, pk):
        mou = get_object_or_404(MOU, id=pk)
        department_name = request.data.get('department_name')
        raw_email = request.data.get('user_email') or request.data.get('recipient_email') or request.data.get('recipient_emails')
        raw_cc = request.data.get('cc_email') or request.data.get('cc_emails') or request.data.get('cc')
        permission = request.data.get('permission', 'View Only')
        template_key = request.data.get('email_template') or request.data.get('template_key', 'standard')
        email_subject = request.data.get('email_subject')
        custom_message = request.data.get('custom_message') or request.data.get('message')
        expires_at_val = request.data.get('expires_at')

        from services.email_service import parse_email_list
        recipient_list = parse_email_list(raw_email)
        cc_list = [e for e in parse_email_list(raw_cc) if e not in recipient_list]

        if not department_name and not recipient_list:
            return Response({"detail": "Please provide a recipient email address or select a department."}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve department folder if department sharing
        dept_folder = None
        if department_name:
            from folders.models import Folder
            from services import drive_service
            dept_folder, _ = Folder.objects.get_or_create(
                name=department_name,
                parent=None,
                defaults={'created_by': request.user}
            )
            if not dept_folder.google_folder_id:
                try:
                    google_id = drive_service.create_folder(dept_folder.name, None)
                    dept_folder.google_folder_id = google_id
                    dept_folder.save(update_fields=['google_folder_id'])
                except Exception as drive_err:
                    logger.warning(f"Could not create Google Drive folder for {dept_folder.name}: {drive_err}")

        # Resolve document file reference
        shared_file = mou.signed_mou or mou.original_mou or (mou.documents.first().file if mou.documents.exists() else None)
        doc_version = (shared_file.version_number if (shared_file and hasattr(shared_file, 'version_number')) else mou.version_number) or 1

        primary_share = None
        created_any = False
        primary_temp_password = None

        with transaction.atomic():
            now_iso = timezone.now().isoformat()

            # 1. Process Department Sharing if requested
            if dept_folder:
                existing_share = MOUShare.objects.filter(mou=mou, department=dept_folder).first()
                if existing_share:
                    existing_share.permission = permission
                    existing_share.shared_by = request.user
                    existing_share.shared_file = shared_file
                    existing_share.document_version = doc_version
                    existing_share.email_template = template_key
                    if email_subject:
                        existing_share.email_subject = email_subject
                    if custom_message:
                        existing_share.custom_message = custom_message
                    if expires_at_val:
                        existing_share.expires_at = expires_at_val
                    existing_share.access_status = 'Active'
                    history = list(existing_share.sharing_history or [])
                    history.append({
                        'action': 'Department Share Updated',
                        'shared_by': request.user.name or request.user.email,
                        'shared_at': now_iso,
                        'permission': permission,
                        'department': dept_folder.name
                    })
                    existing_share.sharing_history = history
                    existing_share.save()
                    primary_share = existing_share
                else:
                    primary_share = MOUShare.objects.create(
                        mou=mou,
                        department=dept_folder,
                        shared_by=request.user,
                        permission=permission,
                        status='Shared',
                        shared_file=shared_file,
                        document_version=doc_version,
                        email_template=template_key,
                        email_subject=email_subject,
                        custom_message=custom_message,
                        access_status='Active',
                        expires_at=expires_at_val,
                        sharing_history=[{
                            'action': 'Initial Department Share',
                            'shared_by': request.user.name or request.user.email,
                            'shared_at': now_iso,
                            'permission': permission,
                            'department': dept_folder.name
                        }]
                    )
                    created_any = True

                if mou.department:
                    from folders.models import Folder
                    from services import drive_service
                    sub_folder, sf_created = Folder.objects.get_or_create(
                        name="Department Submission",
                        parent=mou.department,
                        defaults={'created_by': request.user}
                    )
                    if sf_created or not sub_folder.google_folder_id:
                        try:
                            google_id = drive_service.create_folder(sub_folder.name, mou.department.google_folder_id)
                            sub_folder.google_folder_id = google_id
                            sub_folder.save(update_fields=['google_folder_id'])
                        except Exception:
                            pass

            # 2. Process Email Recipients (Primary + CC)
            all_target_tuples = [(em, permission, 'to') for em in recipient_list] + [(em, 'View Only', 'cc') for em in cc_list]
            shares_to_notify = []

            for target_email, perm, r_type in all_target_tuples:
                target_user = User.objects.filter(email__iexact=target_email).first()
                temp_password = None

                if not target_user:
                    try:
                        import random
                        from roles.models import Role

                        rand_digits = ''.join(random.choices('0123456789', k=6))
                        temp_password = f"Mcc@{rand_digits}"

                        raw_handle = target_email.split('@')[0]
                        clean_name = raw_handle.replace('.', ' ').replace('_', ' ').replace('-', ' ').title()

                        default_role = Role.objects.filter(name='User').first() or Role.objects.first()
                        target_dept = department_name or (mou.department_name if mou else '') or 'External Partner'

                        target_user = User.objects.create_user(
                            email=target_email,
                            password=temp_password,
                            name=clean_name or 'Partner User',
                            role=default_role,
                            department=target_dept,
                            status='Active',
                            is_active=True
                        )
                        logger.info(f"Auto-registered user account for share recipient: {target_email}")

                        try:
                            from users.models import UserInvitation
                            from users.invitation_services import TokenService
                            now_time = timezone.now()
                            invite_expires = now_time + timedelta(days=7)
                            signed_token = TokenService.generate_token(
                                email=target_email,
                                stream='',
                                department=target_dept,
                                role_id=default_role.id if default_role else 3,
                                expires_at=invite_expires
                            )
                            UserInvitation.objects.create(
                                email=target_email,
                                system_role=default_role,
                                department=target_dept,
                                token=signed_token,
                                expires_at=invite_expires,
                                created_by=request.user
                            )
                        except Exception as inv_err:
                            logger.warning(f"Could not record UserInvitation for {target_email}: {inv_err}")
                    except Exception as reg_err:
                        logger.error(f"Failed to auto-register user for {target_email}: {reg_err}", exc_info=True)

                if r_type == 'to' and not primary_temp_password and temp_password:
                    primary_temp_password = temp_password

                q = Q(recipient_email__iexact=target_email)
                if target_user:
                    q |= Q(user=target_user)
                existing_share = MOUShare.objects.filter(mou=mou).filter(q).first()

                if existing_share:
                    existing_share.permission = perm
                    existing_share.shared_by = request.user
                    existing_share.shared_file = shared_file
                    existing_share.document_version = doc_version
                    existing_share.email_template = template_key
                    if email_subject:
                        existing_share.email_subject = email_subject
                    if custom_message:
                        existing_share.custom_message = custom_message
                    if expires_at_val:
                        existing_share.expires_at = expires_at_val
                    existing_share.access_status = 'Active'

                    history = list(existing_share.sharing_history or [])
                    history.append({
                        'action': 'Share Updated & Resent',
                        'shared_by': request.user.name or request.user.email,
                        'shared_at': now_iso,
                        'permission': perm,
                        'role_in_mail': r_type,
                        'template': template_key,
                        'cc': cc_list
                    })
                    existing_share.sharing_history = history
                    existing_share.save()
                    target_share = existing_share
                    if r_type == 'to' and not primary_share:
                        primary_share = existing_share
                else:
                    new_share = MOUShare.objects.create(
                        mou=mou,
                        department=dept_folder,
                        user=target_user,
                        recipient_email=target_email,
                        shared_by=request.user,
                        permission=perm,
                        status='Shared',
                        shared_file=shared_file,
                        document_version=doc_version,
                        email_template=template_key,
                        email_subject=email_subject,
                        custom_message=custom_message,
                        access_status='Active',
                        expires_at=expires_at_val,
                        sharing_history=[{
                            'action': f'Initial Share ({r_type.upper()})',
                            'shared_by': request.user.name or request.user.email,
                            'shared_at': now_iso,
                            'permission': perm,
                            'recipient': target_email,
                            'template': template_key,
                            'cc': cc_list
                        }]
                    )
                    created_any = True
                    target_share = new_share
                    if r_type == 'to' and not primary_share:
                        primary_share = new_share

                # Notify registered users in-app
                if target_user:
                    send_notification(
                        target_user,
                        "MOU Shared With You",
                        f"MOU '{mou.title}' has been shared with you with permission '{perm}'."
                    )

                shares_to_notify.append({
                    'share': target_share,
                    'email': target_email,
                    'role_type': r_type,
                    'temp_password': temp_password,
                    'user': target_user
                })

        # Send separate, personalized emails to each recipient (never cross-leaking temporary passwords)
        email_sent = False
        target_display = ", ".join(recipient_list) if recipient_list else (dept_folder.name if dept_folder else "Recipient")
        if cc_list:
            target_display += f" (CC: {', '.join(cc_list)})"

        if shares_to_notify:
            sent_count = 0
            for item in shares_to_notify:
                ok = send_mou_share_email(
                    item['share'],
                    email_template_key=template_key,
                    custom_subject=email_subject,
                    custom_message=custom_message,
                    sender_name=request.user.name or request.user.email,
                    temp_password=item['temp_password'],
                    request=request,
                    role_type=item['role_type'],
                    all_to_recipients=recipient_list,
                    all_cc_recipients=cc_list,
                    target_recipient_email=item['email']
                )
                if ok:
                    sent_count += 1
            email_sent = (sent_count > 0)

        # Log & Notify
        action_desc = "Shared" if created_any else "Updated share for"
        log_activity(
            request.user,
            f"{action_desc} MOU '{mou.title}' with {target_display} ({permission})",
            module="MOUs",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        detail_msg = f"MOU shared successfully with {target_display}." if created_any else f"Sharing record updated and email sent to {target_display}."
        if recipient_list and not email_sent:
            detail_msg = f"Document access granted in Shared Files, but the notification email could not be delivered to {target_display}. Please check SMTP configuration."

        return Response({
            "detail": detail_msg,
            "created": created_any,
            "email_sent": email_sent,
            "recipients": recipient_list,
            "cc": cc_list,
            "share": MOUShareSerializer(primary_share, context={'request': request}).data if primary_share else None
        }, status=status.HTTP_201_CREATED if created_any else status.HTTP_200_OK)


class MOUShareFileView(APIView):
    """
    Direct endpoint to share any repository file through email or department.
    Auto-associates or creates an MOU reference for tracking and email delivery.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_id = request.data.get('file_id')
        if not file_id:
            return Response({"detail": "File ID is required to share a file."}, status=status.HTTP_400_BAD_REQUEST)

        from files.models import File
        file_obj = get_object_or_404(File, id=file_id)

        # Find existing MOU or create lightweight MOU wrapper for the repository file
        mou = MOU.objects.filter(
            Q(original_mou=file_obj) | Q(signed_mou=file_obj) | Q(documents__file=file_obj)
        ).first()

        if not mou:
            folder_inst = file_obj.folder
            if not folder_inst:
                from folders.models import Folder
                folder_inst, _ = Folder.objects.get_or_create(
                    name="MOU Repository",
                    parent=None,
                    defaults={'created_by': request.user}
                )

            dept_name = folder_inst.name if folder_inst else "MOU Repository"
            doc_num = f"DOC-{file_obj.id:04d}"
            if MOU.objects.filter(mou_number=doc_num).exists():
                import secrets
                doc_num = f"DOC-{file_obj.id:04d}-{secrets.token_hex(2).upper()}"

            mou = MOU.objects.create(
                title=file_obj.name,
                mou_number=doc_num,
                original_mou=file_obj,
                created_by=request.user,
                department=folder_inst,
                department_name=dept_name,
                partner_organization="Internal Repository Share",
                status="Active"
            )

        # Delegate execution to MOUShareView logic
        share_view = MOUShareView()
        return share_view.post(request, pk=mou.id)


class MOUShareDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, pk):
        share = get_object_or_404(MOUShare, id=pk)
        mou_title = share.mou.title
        dept_or_user = share.department.name if share.department else (share.recipient_email or (share.user.email if share.user else "Unknown"))
        
        share.delete()
        log_activity(request.user, f"Deleted MOU share for '{mou_title}' from {dept_or_user}", ip_address=request.META.get('REMOTE_ADDR'))
        return Response({"detail": "Share entry deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class MOUShareRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        share = get_object_or_404(MOUShare, id=pk)
        is_admin = bool(request.user.is_superuser or (request.user.role and request.user.role.name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]))
        if not is_admin and share.shared_by != request.user:
            return Response({"detail": "You do not have permission to revoke this share."}, status=status.HTTP_403_FORBIDDEN)

        share.access_status = 'Revoked'
        share.revoked_at = timezone.now()
        history = list(share.sharing_history or [])
        history.append({
            'action': 'Revoked Access',
            'revoked_by': request.user.name or request.user.email,
            'revoked_at': timezone.now().isoformat()
        })
        share.sharing_history = history
        share.save(update_fields=['access_status', 'revoked_at', 'sharing_history'])

        log_activity(
            request.user,
            f"Revoked MOU share for '{share.mou.title}' from {share.recipient_email or (share.department.name if share.department else 'Unknown')}",
            module="MOUs",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({"detail": "Share access revoked successfully."})


class MOUShareResendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        share = get_object_or_404(MOUShare, id=pk)
        is_admin = bool(request.user.is_superuser or (request.user.role and request.user.role.name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]))
        if not is_admin and share.shared_by != request.user:
            return Response({"detail": "You do not have permission to resend this share."}, status=status.HTTP_403_FORBIDDEN)

        template_key = request.data.get('email_template') or share.email_template or 'standard'
        custom_subject = request.data.get('email_subject') or share.email_subject
        custom_message = request.data.get('custom_message') or share.custom_message
        raw_cc = request.data.get('cc_email') or request.data.get('cc_emails') or request.data.get('cc')
        from services.email_service import parse_email_list
        cc_list = parse_email_list(raw_cc)

        email_sent = send_mou_share_email(
            share,
            email_template_key=template_key,
            custom_subject=custom_subject,
            custom_message=custom_message,
            sender_name=request.user.name or request.user.email,
            request=request,
            cc_emails=cc_list
        )

        history = list(share.sharing_history or [])
        history.append({
            'action': 'Resent Email',
            'resent_by': request.user.name or request.user.email,
            'resent_at': timezone.now().isoformat()
        })
        share.sharing_history = history
        share.access_status = 'Active'
        share.save(update_fields=['sharing_history', 'access_status'])

        log_activity(
            request.user,
            f"Resent MOU share email for '{share.mou.title}' to {share.recipient_email}",
            module="MOUs",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({"detail": "Sharing email resent successfully.", "email_sent": email_sent})


class MOUShareTrackingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        share = get_object_or_404(MOUShare, id=pk)
        is_admin = bool(request.user.is_superuser or (request.user.role and request.user.role.name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]))
        if not is_admin and share.shared_by != request.user and share.user != request.user:
            return Response({"detail": "You do not have permission to view download tracking for this share."}, status=status.HTTP_403_FORBIDDEN)

        logs = share.download_logs.all().order_by('-downloaded_at')
        logs_data = MOUShareDownloadLogSerializer(logs, many=True).data

        return Response({
            'share_id': share.id,
            'mou_id': share.mou.id,
            'mou_title': share.mou.title,
            'mou_number': share.mou.mou_number,
            'shared_file_id': share.shared_file.id if share.shared_file else None,
            'document_name': share.shared_file.name if share.shared_file else f"{share.mou.title}.pdf",
            'document_version': share.document_version,
            'recipient_email': share.recipient_email or (share.user.email if share.user else None),
            'recipient_name': share.user.name if share.user else None,
            'shared_by': share.shared_by.name if share.shared_by else None,
            'shared_by_email': share.shared_by.email if share.shared_by else None,
            'shared_date': share.shared_at,
            'permission': share.permission,
            'download_status': 'Downloaded' if share.download_count > 0 else 'Not Downloaded',
            'download_count': share.download_count,
            'first_download_date': share.first_download_date,
            'last_download_date': share.last_download_date,
            'access_status': share.access_status,
            'expires_at': share.expires_at,
            'sharing_history': share.sharing_history,
            'download_logs': logs_data
        })


class MOUSharedFilesView(APIView):
    """
    Returns the Shared Files section data accessible to both ADMIN and USER.
    Tabs supported:
    - 'with_me': Documents shared with the logged-in user
    - 'by_me': Documents shared by the logged-in user
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            from users.views import associate_pending_shares
            associate_pending_shares(user)
        except Exception:
            pass

        tab = request.query_params.get('tab', 'with_me')
        search = request.query_params.get('search', '').strip()
        status_filter = request.query_params.get('status') # 'Downloaded', 'Not Downloaded'
        access_status_filter = request.query_params.get('access_status') # 'Active', 'Revoked', 'Expired'
        mou_id_filter = request.query_params.get('mou_id')

        is_admin = bool(user.is_superuser or (user.role and user.role.name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]))

        if tab == 'by_me':
            if is_admin and request.query_params.get('all') == 'true':
                shares = MOUShare.objects.all()
            else:
                shares = MOUShare.objects.filter(shared_by=user)
        else:
            # tab == 'with_me'
            if is_admin and request.query_params.get('all') == 'true':
                shares = MOUShare.objects.all()
            else:
                q = Q(user=user)
                if user.email:
                    q |= Q(recipient_email__iexact=user.email)
                if user.department:
                    q |= Q(department__name=user.department)
                shares = MOUShare.objects.filter(q)
                if not is_admin:
                    shares = shares.exclude(access_status='Revoked')

        if mou_id_filter:
            shares = shares.filter(mou_id=mou_id_filter)

        if access_status_filter:
            shares = shares.filter(access_status=access_status_filter)

        if search:
            shares = shares.filter(
                Q(mou__title__icontains=search) |
                Q(mou__mou_number__icontains=search) |
                Q(mou__partner_organization__icontains=search) |
                Q(recipient_email__icontains=search) |
                Q(shared_by__name__icontains=search) |
                Q(shared_by__email__icontains=search)
            )

        if status_filter == 'Downloaded':
            shares = shares.filter(download_count__gt=0)
        elif status_filter == 'Not Downloaded':
            shares = shares.filter(download_count=0)

        shares = shares.select_related('mou', 'shared_file', 'shared_by', 'user', 'department').prefetch_related('download_logs').order_by('-shared_at')
        serializer = MOUShareSerializer(shares, many=True, context={'request': request})
        return Response(serializer.data)


class MOUShareDownloadView(APIView):
    """
    Token-authenticated secure download for MOU document.
    Downloads the actual file to device Downloads folder and records download metrics.
    Does NOT remove document from Shared Files or change ownership.
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        share = MOUShare.objects.filter(secure_token=token).first()
        if not share:
            return Response({"detail": "Invalid or expired document download link."}, status=status.HTTP_404_NOT_FOUND)

        is_valid, err_msg = share.is_valid_access()
        if not is_valid:
            return Response({"detail": err_msg}, status=status.HTTP_403_FORBIDDEN)

        # Record download tracking
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        ip_addr = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        recipient_user = request.user if (request.user and request.user.is_authenticated) else share.user

        if request.user and request.user.is_authenticated and not share.user:
            if request.user.email and share.recipient_email and request.user.email.strip().lower() == share.recipient_email.strip().lower():
                share.user = request.user
                share.save(update_fields=['user'])
                recipient_user = request.user

        share.record_download(recipient_user=recipient_user, ip_address=ip_addr, user_agent=user_agent)

        user_display = request.user if (request.user and request.user.is_authenticated) else share.user
        log_activity(
            user_display,
            f"Downloaded shared MOU '{share.mou.title}' (recipient: {share.recipient_email})",
            module="MOUs",
            ip_address=ip_addr
        )

        # Resolve the actual file
        file_obj = share.shared_file or share.mou.signed_mou or share.mou.original_mou or (share.mou.documents.first().file if share.mou.documents.exists() else None)

        if file_obj:
            if file_obj.file_field and os.path.exists(file_obj.file_field.path):
                response = FileResponse(open(file_obj.file_field.path, 'rb'), as_attachment=True, filename=file_obj.name)
                response['Content-Disposition'] = f'attachment; filename="{file_obj.name}"'
                response['Content-Type'] = file_obj.mime_type or file_obj.file_type or 'application/pdf'
                return response

            if file_obj.google_file_id and not file_obj.google_file_id.startswith('drive_file_'):
                try:
                    from services import drive_service
                    file_bytes = drive_service.download_file(file_obj.google_file_id)
                    response = FileResponse(io.BytesIO(file_bytes), as_attachment=True, filename=file_obj.name)
                    response['Content-Disposition'] = f'attachment; filename="{file_obj.name}"'
                    response['Content-Type'] = file_obj.mime_type or file_obj.file_type or 'application/pdf'
                    return response
                except Exception as drive_err:
                    logger.error(f"Google Drive download error for shared file: {drive_err}")

        # Fallback to mou.mou_file if present
        if share.mou.mou_file and os.path.exists(share.mou.mou_file.path):
            filename = os.path.basename(share.mou.mou_file.name)
            response = FileResponse(open(share.mou.mou_file.path, 'rb'), as_attachment=True, filename=filename)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            response['Content-Type'] = 'application/pdf'
            return response

        # Safe fallback valid PDF stream
        safe_name = f"{share.mou.mou_number}_{share.mou.title}".replace(' ', '_').replace('/', '_') + ".pdf"
        dummy_content = (
            f"%PDF-1.4\n"
            f"% MCC Legal Enterprise Document Hub\n"
            f"% MOU Reference: {share.mou.mou_number}\n"
            f"% Title: {share.mou.title}\n"
            f"% Partner: {share.mou.partner_organization}\n"
            f"% Version: v{share.document_version}\n"
            f"% Recipient: {share.recipient_email}\n"
            f"%%EOF"
        )
        response = FileResponse(io.BytesIO(dummy_content.encode('utf-8')), as_attachment=True, filename=safe_name)
        response['Content-Disposition'] = f'attachment; filename="{safe_name}"'
        response['Content-Type'] = 'application/pdf'
        return response


class MOUSharePreviewView(APIView):
    """
    Public/Token preview info endpoint for shared document modal.
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        share = MOUShare.objects.filter(secure_token=token).first()
        if not share:
            return Response({"detail": "Invalid or expired document link."}, status=status.HTTP_404_NOT_FOUND)

        is_valid, err_msg = share.is_valid_access()
        if not is_valid:
            return Response({"detail": err_msg}, status=status.HTTP_403_FORBIDDEN)

        file_obj = share.shared_file or share.mou.signed_mou or share.mou.original_mou or (share.mou.documents.first().file if share.mou.documents.exists() else None)
        
        # Mark Viewed if status was Shared
        if share.status == 'Shared':
            share.status = 'Viewed'
            share.save(update_fields=['status'])

        file_url = None
        if file_obj and file_obj.file_field:
            file_url = request.build_absolute_uri(file_obj.file_field.url)
        elif file_obj and file_obj.web_view_link:
            file_url = file_obj.web_view_link

        return Response({
            'share_id': share.id,
            'mou_id': share.mou.id,
            'mou_title': share.mou.title,
            'mou_number': share.mou.mou_number,
            'partner_organization': share.mou.partner_organization,
            'department_name': share.department.name if share.department else None,
            'version': share.document_version,
            'document_name': file_obj.name if file_obj else f"{share.mou.title}.pdf",
            'file_type': file_obj.file_type if file_obj else 'pdf',
            'file_size': file_obj.size if file_obj else None,
            'file_url': file_url,
            'web_view_link': file_obj.web_view_link if file_obj else None,
            'web_content_link': file_obj.web_content_link if file_obj else None,
            'download_url': f"/api/mous/shared/download/{share.secure_token}/",
            'permission': share.permission,
            'status': share.status,
            'access_status': share.access_status,
            'expires_at': share.expires_at,
            'download_count': share.download_count
        })

class DepartmentSubmissionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        is_admin = request.user.role and request.user.role.name in ["Super Admin", "Admin", "Lawyer / MOU Administrator"]
        if is_admin:
            subs = DepartmentSubmission.objects.all().order_by('-uploaded_at')
        else:
            if not request.user.department:
                return Response([])
            subs = DepartmentSubmission.objects.filter(department__name=request.user.department).order_by('-uploaded_at')
            
        data = []
        for s in subs:
            data.append({
                'id': s.id,
                'mou_id': s.mou_id,
                'mou_title': s.mou.title,
                'mou_number': s.mou.mou_number,
                'department_name': s.department.name if s.department else None,
                'signed_file_id': s.signed_file_id,
                'signed_file_name': s.signed_file.name if s.signed_file else None,
                'signed_date': s.signed_date,
                'mou_month': s.mou_month,
                'mou_year': s.mou_year,
                'summary': s.summary,
                'purpose': s.purpose,
                'benefits': s.benefits,
                'remarks': s.remarks,
                'uploaded_by': s.uploaded_by.name if s.uploaded_by else None,
                'uploaded_at': s.uploaded_at,
                'review_status': s.review_status,
                'reviewer_comments': s.reviewer_comments
            })
        return Response(data)
        
    def post(self, request):
        mou_id = request.data.get('mou_id')
        uploaded_file = request.FILES.get('file')
        signed_file_id = request.data.get('signed_file_id')
        signed_date_str = request.data.get('signed_date')
        mou_month = request.data.get('mou_month')
        mou_year = request.data.get('mou_year')
        summary = request.data.get('summary')
        purpose = request.data.get('purpose')
        benefits_raw = request.data.get('benefits', '[]')
        remarks = request.data.get('remarks', '')
        
        # Parse benefits list
        import json
        if isinstance(benefits_raw, str):
            try:
                benefits = json.loads(benefits_raw)
            except Exception:
                benefits = [b.strip() for b in benefits_raw.split(',') if b.strip()]
        else:
            benefits = benefits_raw
            
        if not mou_id or (not uploaded_file and not signed_file_id) or not signed_date_str or not mou_month or not mou_year or not summary or not purpose:
            return Response({"detail": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)
            
        mou = get_object_or_404(MOU, id=mou_id)
        signed_date = date.fromisoformat(signed_date_str)
        
        duration_months_raw = request.data.get('duration_months')
        expiry_date_str = request.data.get('expiry_date')
        
        if duration_months_raw:
            try:
                mou.duration_months = int(duration_months_raw)
            except (ValueError, TypeError):
                pass
                
        if expiry_date_str:
            try:
                parsed_exp = date.fromisoformat(expiry_date_str)
                mou.expiry_date = parsed_exp
            except ValueError:
                mou.expiry_date = mou.calculate_expiry(signed_date, mou.duration_months)
        else:
            mou.expiry_date = mou.calculate_expiry(signed_date, mou.duration_months)

        # Validate that validity date is strictly after signed date
        if mou.expiry_date and mou.expiry_date <= signed_date:
            return Response(
                {"detail": f"Validation Error: MOU Validity Expiry Date ({mou.expiry_date}) must be strictly after the Signed Date ({signed_date})."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Determine department folder
        user_dept_name = request.user.department
        dept_folder = None
        if user_dept_name:
            from folders.models import Folder
            dept_folder = Folder.objects.filter(name=user_dept_name).first()
            
        with transaction.atomic():
            # Retrieve or create "Department Submission" folder under MOU folder
            submission_folder = None
            if mou.department:
                from folders.models import Folder
                from services import drive_service
                submission_folder, sf_created = Folder.objects.get_or_create(
                    name="Department Submission",
                    parent=mou.department,
                    defaults={'created_by': request.user}
                )
                if sf_created or not submission_folder.google_folder_id:
                    google_id = drive_service.create_folder(submission_folder.name, mou.department.google_folder_id if mou.department else None)
                    submission_folder.google_folder_id = google_id
                    submission_folder.save(update_fields=['google_folder_id'])
            
            signed_file = None
            if uploaded_file:
                import mimetypes
                file_type, _ = mimetypes.guess_type(uploaded_file.name)
                if not file_type:
                    file_type = "application/octet-stream"
                    
                target_submission_folder = submission_folder or mou.department or dept_folder
                if not target_submission_folder:
                    target_submission_folder = Folder.objects.filter(is_deleted=False).first()
                    if not target_submission_folder:
                        target_submission_folder = Folder.objects.create(name="Department Submissions", module_type="mou_repository", created_by=request.user)

                from files.models import File
                signed_file = File.objects.create(
                    name=uploaded_file.name,
                    size=uploaded_file.size,
                    file_type=file_type,
                    folder=target_submission_folder,
                    uploaded_by=request.user
                )
                
                # Upload directly to Google Drive under Department Submission folder
                from services import drive_service
                logger.info(f"Triggering department submission file upload to Google Drive. File: '{uploaded_file.name}' under parent Google Folder ID: '{submission_folder.google_folder_id if submission_folder else None}'...")
                drive_metadata = drive_service.upload_file(
                    uploaded_file,
                    uploaded_file.name,
                    file_type,
                    submission_folder.google_folder_id if submission_folder else None
                )
                logger.info(f"Department submission file upload successful. Metadata: {drive_metadata}")
                signed_file.google_file_id = drive_metadata['id']
                signed_file.mime_type = drive_metadata['mimeType']
                signed_file.file_size = drive_metadata['size']
                signed_file.web_view_link = drive_metadata['webViewLink']
                signed_file.web_content_link = drive_metadata['webContentLink']
                signed_file.save()
            else:
                from files.models import File
                signed_file = get_object_or_404(File, id=signed_file_id)
                
            submission, created = DepartmentSubmission.objects.update_or_create(
                mou=mou,
                department=dept_folder,
                defaults={
                    'signed_file': signed_file,
                    'signed_date': signed_date,
                    'mou_month': mou_month,
                    'mou_year': int(mou_year),
                    'summary': summary,
                    'purpose': purpose,
                    'benefits': benefits,
                    'remarks': remarks,
                    'uploaded_by': request.user,
                    'review_status': 'Pending Verification'
                }
            )
            
            # Update MOU properties
            mou.signed_mou = signed_file
            mou.signed_date = signed_date
            mou.status = 'Pending Verification'
            if uploaded_file:
                mou.mou_file = uploaded_file
            mou.save(update_fields=['signed_mou', 'signed_date', 'duration_months', 'expiry_date', 'status', 'mou_file'])
            
            # Update folder status to Signed
            if mou.department:
                mou.department.status = 'Signed'
                mou.department.save(update_fields=['status'])
            
            # Create document link
            mou_doc = MOUDocument.objects.create(
                mou=mou,
                document_type='signed',
                file=signed_file,
                uploaded_by=request.user
            )
            
            # Support custom creation date/time
            custom_created_at = request.data.get('created_at')
            if custom_created_at:
                from django.utils.dateparse import parse_datetime
                from django.utils import timezone
                parsed_dt = parse_datetime(custom_created_at)
                if parsed_dt:
                    if timezone.is_naive(parsed_dt):
                        parsed_dt = timezone.make_aware(parsed_dt)
                    DepartmentSubmission.objects.filter(pk=submission.pk).update(uploaded_at=parsed_dt)
                    if signed_file:
                        File.objects.filter(pk=signed_file.pk).update(created_at=parsed_dt)
                    MOUDocument.objects.filter(pk=mou_doc.pk).update(uploaded_at=parsed_dt)

            # Update active shares status
            shares = MOUShare.objects.filter(mou=mou)
            if dept_folder:
                shares = shares.filter(department=dept_folder)
            shares.update(status='Signed MOU Uploaded')
            
        validity_text = f"Active from {signed_date} to {mou.expiry_date} ({mou.duration_months} Months)"
        log_activity(request.user, f"Submitted signed MOU for '{mou.title}' from department '{user_dept_name}'. {validity_text}")
        notify_admins("Signed MOU Uploaded", f"Signed MOU for '{mou.title}' uploaded by {request.user.name} from {user_dept_name}. {validity_text}.")
        
        return Response({
            "detail": "Signed MOU submitted successfully.",
            "signed_date": str(signed_date),
            "expiry_date": str(mou.expiry_date),
            "duration_months": mou.duration_months,
            "message": f"Signed MOU uploaded! Validity calculated: {validity_text}."
        }, status=status.HTTP_201_CREATED)

class DepartmentSubmissionReviewView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        if not user_is_admin_or_legal(request.user):
            return Response({"detail": "Only administrators or legal officers can review department submissions."}, status=status.HTTP_403_FORBIDDEN)

        submission = get_object_or_404(DepartmentSubmission, id=pk)
        action = request.data.get('action') # 'approve' or 'reject'
        comments = request.data.get('comments', '')
        
        if action not in ['approve', 'reject']:
            return Response({"detail": "Invalid action. Use 'approve' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)
            
        mou = submission.mou
        with transaction.atomic():
            if action == 'approve':
                submission.review_status = 'Verified'
                submission.reviewer_comments = comments
                submission.save(update_fields=['review_status', 'reviewer_comments'])
                
                mou.status = 'Active'
                mou.remarks = comments
                mou.save(update_fields=['status', 'remarks'])
                
                shares = MOUShare.objects.filter(mou=mou)
                if submission.department:
                    shares = shares.filter(department=submission.department)
                shares.update(status='Completed')
                
                log_activity(request.user, f"Approved department submission for MOU '{mou.title}'")
                if submission.uploaded_by:
                    send_notification(submission.uploaded_by, "Signed MOU Approved!", f"Signed MOU submission for '{mou.title}' has been verified and marked as Completed.")
            else:
                submission.review_status = 'Rejected'
                submission.reviewer_comments = comments
                submission.save(update_fields=['review_status', 'reviewer_comments'])
                
                mou.status = 'Draft'
                mou.remarks = comments
                mou.save(update_fields=['status', 'remarks'])
                
                shares = MOUShare.objects.filter(mou=mou)
                if submission.department:
                    shares = shares.filter(department=submission.department)
                shares.update(status='Pending Upload')
                
                log_activity(request.user, f"Rejected department submission for MOU '{mou.title}'. Comments: {comments}")
                if submission.uploaded_by:
                    send_notification(submission.uploaded_by, "Signed MOU Submission Rejected", f"Signed MOU for '{mou.title}' was rejected. Reason: {comments}")
                    
        return Response({"detail": f"Submission review completed: {action}."})

class MOUSharedDashboardView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        dept_name = request.user.department
        if not dept_name:
            return Response({
                "assigned": 0, "pending": 0, "completed": 0, "expiring": 0, "recently_shared": []
            })
            
        shares = MOUShare.objects.filter(department__name=dept_name)
        assigned_count = shares.count()
        pending_count = shares.filter(status__in=['Shared', 'Viewed', 'Pending Upload']).count()
        completed_count = shares.filter(status__in=['Verified by Legal Cell', 'Completed']).count()
        
        today = date.today()
        expiring_count = shares.filter(mou__expiry_date__lte=today + timedelta(days=30), mou__expiry_date__gte=today).count()
        
        recently_shared = []
        for s in shares.order_by('-shared_at')[:5]:
            recently_shared.append({
                'id': s.mou.id,
                'title': s.mou.title,
                'mou_number': s.mou.mou_number,
                'partner_organization': s.mou.partner_organization,
                'permission': s.permission,
                'status': s.status,
                'shared_at': s.shared_at
            })
            
        return Response({
            "assigned": assigned_count,
            "pending": pending_count,
            "completed": completed_count,
            "expiring": expiring_count,
            "recently_shared": recently_shared
        })


from rest_framework import viewsets
from rest_framework.decorators import action
from .models import (
    TemplateCategory, OrganizationType, CollaborationType, DocumentType, Tag,
    DepartmentCategory, Department, TemplateCollection, TemplateDocument, MOUCategory
)
from .serializers import (
    TemplateCategorySerializer, OrganizationTypeSerializer, CollaborationTypeSerializer,
    DocumentTypeSerializer, TagSerializer, DepartmentCategorySerializer, DepartmentSerializer,
    TemplateCollectionSerializer, TemplateDocumentSerializer, MOUCategorySerializer
)

class IsAdminOrSuperAdmin(permissions.BasePermission):
    """
    Grants access only to Admin and Super Admin roles.
    Prevents standard 'User' role accounts from viewing or modifying department records.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        role_name = getattr(getattr(request.user, 'role', None), 'name', '')
        return role_name in ['Super Admin', 'Admin', 'Lawyer / MOU Administrator']

class MasterDataMixin:
    """
    Shared mixin for all master-data ViewSets.
    - destroy(): catches ProtectedError (item is in use) → 409 Conflict
    - create() / update(): catches IntegrityError (duplicate name) → 400 Bad Request
    """
    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdminOrSuperAdmin()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError as e:
            linked = len(e.protected_objects)
            return Response(
                {"detail": f"Cannot delete '{instance.name}' — it is currently linked to {linked} record(s). "
                           "Deactivate it instead, or remove all linked records first."},
                status=status.HTTP_409_CONFLICT
            )

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {"detail": "A record with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {"detail": "A record with this name already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )


class TemplateCategoryViewSet(MasterDataMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TemplateCategory.objects.all().order_by('name')
    serializer_class = TemplateCategorySerializer

class OrganizationTypeViewSet(MasterDataMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = OrganizationType.objects.all().order_by('name')
    serializer_class = OrganizationTypeSerializer

class CollaborationTypeViewSet(MasterDataMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = CollaborationType.objects.all().order_by('name')
    serializer_class = CollaborationTypeSerializer

class DocumentTypeViewSet(MasterDataMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = DocumentType.objects.all().order_by('name')
    serializer_class = DocumentTypeSerializer

class TagViewSet(MasterDataMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Tag.objects.all().order_by('name')
    serializer_class = TagSerializer

class DepartmentCategoryViewSet(MasterDataMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = DepartmentCategory.objects.all().order_by('name')
    serializer_class = DepartmentCategorySerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdminOrSuperAdmin()]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        cat_id = instance.id
        response = super().destroy(request, *args, **kwargs)
        if response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]:
            Department.objects.filter(category_id=cat_id).update(category=None)
        return response

class DepartmentViewSet(MasterDataMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Department.objects.all().order_by('name')
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdminOrSuperAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        name = instance.name
        stream = instance.stream
        response = super().destroy(request, *args, **kwargs)
        if response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]:
            MOUCategory.objects.filter(name=name, stream=stream).delete()
        return response


class StreamViewSet(MasterDataMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Stream.objects.all().order_by('name')
    serializer_class = StreamSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsAdminOrSuperAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is not None:
            is_active_bool = is_active_param.lower() in ['true', '1']
            qs = qs.filter(is_active=is_active_bool)
        return qs

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        strm_id = instance.id
        response = super().destroy(request, *args, **kwargs)
        if response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]:
            Department.objects.filter(stream_id=strm_id).update(stream=None)
            MOUCategory.objects.filter(stream_id=strm_id).update(stream=None)
        return response





class MOUCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrSuperAdmin]
    queryset = MOUCategory.objects.all().order_by('name')
    serializer_class = MOUCategorySerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        name = instance.name
        stream = instance.stream
        response = super().destroy(request, *args, **kwargs)
        if response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]:
            Department.objects.filter(name=name, stream=stream).delete()
        return response

    def perform_create(self, serializer):
        category = serializer.save()
        # Automatically create a root folder for this category
        from folders.models import Folder
        from services import drive_service
        import logging
        logger = logging.getLogger(__name__)

        # Check if a folder already exists with this name at root
        folder, created = Folder.objects.get_or_create(
            name=category.name,
            parent=None,
            defaults={'created_by': self.request.user}
        )
    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_name = old_instance.name
        category = serializer.save()

        from folders.models import Folder
        from services import drive_service
        import logging
        logger = logging.getLogger(__name__)

        # Ensure root department folder exists or is renamed
        dept_folder = Folder.objects.filter(name=old_name, parent=None, is_deleted=False).first()
        if dept_folder:
            if old_name != category.name:
                dept_folder.name = category.name
                dept_folder.save(update_fields=['name'])
                if dept_folder.google_folder_id:
                    try:
                        drive_service.rename_file(dept_folder.google_folder_id, category.name)
                    except Exception as e:
                        logger.warning(f"Google Drive folder rename skipped for '{category.name}': {e}")
        else:
            dept_folder, created = Folder.objects.get_or_create(
                name=category.name,
                parent=None,
                defaults={'created_by': self.request.user}
            )
            if created:
                try:
                    google_id = drive_service.create_folder(dept_folder.name, None)
                    dept_folder.google_folder_id = google_id
                    dept_folder.save(update_fields=['google_folder_id'])
                except Exception as e:
                    logger.warning(f"Google Drive folder creation skipped for '{dept_folder.name}': {e}")

        # Sync rename to Department & MOUs if name changed
        if old_name != category.name:
            Department.objects.filter(name=old_name).update(name=category.name)
            MOU.objects.filter(department_name=old_name).update(department_name=category.name)

    @action(detail=True, methods=['get'], url_path='assigned-items')
    def assigned_items(self, request, pk=None):
        category = self.get_object()
        from folders.models import Folder
        from mous.models import MOU

        # Ensure root department folder exists or find it
        dept_folder = Folder.objects.filter(name=category.name, parent=None, is_deleted=False).first()
        dept_folder_id = dept_folder.id if dept_folder else None

        # Collect all active folders
        all_folders = list(Folder.objects.filter(is_deleted=False).select_related('parent').order_by('name'))
        folder_map = {f.id: f for f in all_folders}

        # Calculate children map
        children_map = {}
        for f in all_folders:
            if f.parent_id:
                children_map.setdefault(f.parent_id, []).append(f.id)

        # Helper to compute full breadcrumb path and depth
        def compute_path_and_depth(f):
            parts = [f.name]
            curr = f
            depth = 0
            visited = {f.id}
            is_inside_dept = False
            while curr.parent_id and curr.parent_id in folder_map:
                if dept_folder_id and curr.parent_id == dept_folder_id:
                    is_inside_dept = True
                curr = folder_map[curr.parent_id]
                if curr.id in visited:
                    break
                visited.add(curr.id)
                parts.append(curr.name)
                depth += 1
                if depth > 25:
                    break
            return ' / '.join(reversed(parts)), depth, is_inside_dept

        available_folders = []
        assigned_folder_ids = []

        for f in all_folders:
            # Skip the dept_folder itself from the selection list (cannot nest department inside itself)
            if dept_folder_id and f.id == dept_folder_id:
                continue

            path, depth, is_inside_dept = compute_path_and_depth(f)
            
            # Check if this folder is directly or indirectly assigned to the department
            if dept_folder_id and (f.parent_id == dept_folder_id or is_inside_dept):
                assigned_folder_ids.append(f.id)

            subfolder_count = len(children_map.get(f.id, []))

            available_folders.append({
                'id': f.id,
                'name': f.name,
                'parent_id': f.parent_id,
                'parent_name': f.parent.name if f.parent else None,
                'depth': depth,
                'path': path,
                'subfolder_count': subfolder_count,
                'has_subfolders': subfolder_count > 0,
                'status': f.status,
                'is_assigned': f.id in assigned_folder_ids
            })

        # Sort available folders hierarchically by path for natural tree ordering
        available_folders.sort(key=lambda x: x['path'].lower())

        assigned_mou_ids = list(MOU.objects.filter(department_name__iexact=category.name).values_list('id', flat=True))
        all_mous = list(MOU.objects.all().values('id', 'title', 'mou_number', 'partner_organization', 'department_name', 'status'))

        return Response({
            'department_folder_id': dept_folder_id,
            'department_name': category.name,
            'assigned_folder_ids': assigned_folder_ids,
            'assigned_mou_ids': assigned_mou_ids,
            'available_folders': available_folders,
            'available_mous': all_mous
        })

    @action(detail=True, methods=['post'], url_path='assign-items')
    def assign_items(self, request, pk=None):
        category = self.get_object()
        folder_ids = request.data.get('folder_ids', [])
        mou_ids = request.data.get('mou_ids', [])

        from folders.models import Folder
        from services import drive_service
        import logging
        logger = logging.getLogger(__name__)

        # Ensure parent department folder exists
        dept_folder, _ = Folder.objects.get_or_create(
            name=category.name,
            parent=None,
            defaults={'created_by': request.user}
        )
        if not dept_folder.google_folder_id:
            try:
                gid = drive_service.create_folder(dept_folder.name, None)
                dept_folder.google_folder_id = gid
                dept_folder.save(update_fields=['google_folder_id'])
            except Exception as e:
                logger.warning(f"Google Drive folder creation skipped: {e}")

        # Move selected folders under dept_folder
        moved_folders = 0
        if folder_ids:
            folders_to_move = Folder.objects.filter(id__in=folder_ids).exclude(id=dept_folder.id)
            for f in folders_to_move:
                # If folder is already directly or indirectly inside dept_folder, keep its parent
                is_already_descendant = False
                curr = f.parent
                visited = set()
                while curr:
                    if curr.id == dept_folder.id:
                        is_already_descendant = True
                        break
                    if curr.id in visited:
                        break
                    visited.add(curr.id)
                    curr = curr.parent

                if not is_already_descendant:
                    f.parent = dept_folder
                    f.save(update_fields=['parent'])
                    if f.google_folder_id and dept_folder.google_folder_id:
                        try:
                            drive_service.move_file(f.google_folder_id, dept_folder.google_folder_id)
                        except Exception as de:
                            logger.warning(f"Google Drive move failed: {de}")
                    moved_folders += 1

        # Assign selected MOUs to this department
        moved_mous = 0
        if mou_ids:
            mous_to_assign = MOU.objects.filter(id__in=mou_ids)
            for m in mous_to_assign:
                m.department_name = category.name
                m.save(update_fields=['department_name'])
                # If MOU has an associated folder, move it under dept_folder
                if m.department and m.department.id != dept_folder.id:
                    m.department.parent = dept_folder
                    m.department.save(update_fields=['parent'])
                    if m.department.google_folder_id and dept_folder.google_folder_id:
                        try:
                            drive_service.move_file(m.department.google_folder_id, dept_folder.google_folder_id)
                        except Exception:
                            pass
                moved_mous += 1

        return Response({
            'detail': f"Successfully updated assignments for {category.name}.",
            'moved_folders': moved_folders,
            'moved_mous': moved_mous,
            'department_folder_id': dept_folder.id
        })

    @action(detail=True, methods=['post'], url_path='create-subfolder')
    def create_subfolder(self, request, pk=None):
        category = self.get_object()
        folder_name = (request.data.get('name') or '').strip()
        parent_folder_id = request.data.get('parent_folder_id')

        if not folder_name:
            return Response({"detail": "Folder name is required."}, status=status.HTTP_400_BAD_REQUEST)

        from folders.models import Folder
        from services import drive_service
        import logging
        logger = logging.getLogger(__name__)

        # Ensure parent department folder exists
        dept_folder, _ = Folder.objects.get_or_create(
            name=category.name,
            parent=None,
            defaults={'created_by': request.user}
        )
        if not dept_folder.google_folder_id:
            try:
                gid = drive_service.create_folder(dept_folder.name, None)
                dept_folder.google_folder_id = gid
                dept_folder.save(update_fields=['google_folder_id'])
            except Exception as e:
                logger.warning(f"Google Drive folder creation skipped: {e}")

        # Target parent for the new subfolder (either dept_folder or a nested subfolder)
        target_parent = dept_folder
        if parent_folder_id:
            custom_parent = Folder.objects.filter(id=parent_folder_id, is_deleted=False).first()
            if custom_parent:
                target_parent = custom_parent

        # Create new folder in DB
        new_folder = Folder.objects.create(
            name=folder_name,
            parent=target_parent,
            created_by=request.user,
            status='Active',
            module_type='mou_repository'
        )

        # Create folder on Google Drive
        parent_google_id = target_parent.google_folder_id if target_parent else None
        try:
            gid = drive_service.create_folder(new_folder.name, parent_google_id)
            new_folder.google_folder_id = gid
            new_folder.save(update_fields=['google_folder_id'])
        except Exception as e:
            logger.warning(f"Google Drive subfolder creation skipped: {e}")

        return Response({
            'id': new_folder.id,
            'name': new_folder.name,
            'parent_id': target_parent.id,
            'parent_name': target_parent.name,
            'detail': f"Created subfolder '{new_folder.name}' under '{target_parent.name}'."
        }, status=status.HTTP_201_CREATED)



class TemplateCollectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TemplateCollection.objects.all().order_by('-created_at')
    serializer_class = TemplateCollectionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        
        category_id = self.request.query_params.get('category')
        org_type_id = self.request.query_params.get('organization_type')
        collab_type_id = self.request.query_params.get('collaboration_type')
        dept_cat_id = self.request.query_params.get('department_category')
        dept_id = self.request.query_params.get('department')
        search_query = self.request.query_params.get('q')

        if category_id:
            qs = qs.filter(category_id=category_id)
        if org_type_id:
            qs = qs.filter(organization_type_id=org_type_id)
        if collab_type_id:
            qs = qs.filter(collaboration_type_id=collab_type_id)
        if dept_cat_id:
            qs = qs.filter(department_category_id=dept_cat_id)
        if dept_id:
            qs = qs.filter(department_id=dept_id)
        if search_query:
            qs = qs.filter(
                Q(template_name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(tags__name__icontains=search_query)
            ).distinct()

        return qs

    def perform_create(self, serializer):
        collection = serializer.save(created_by=self.request.user)
        log_activity(self.request.user, f"Created Template Collection '{collection.template_name}'", module="Templates")

    def perform_update(self, serializer):
        collection = serializer.save()
        log_activity(self.request.user, f"Updated Template Collection '{collection.template_name}'", module="Templates")

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        collections = TemplateCollection.objects.all()
        documents = TemplateDocument.objects.all()
        categories = TemplateCategory.objects.all()

        total_templates = collections.count()
        total_pdfs = documents.count()
        total_categories = categories.count()

        cat_dist = list(collections.values('category__name').annotate(value=Count('id')))
        dept_dist = list(collections.values('department__name').annotate(value=Count('id')))

        recent_collections = collections.order_by('-created_at')[:5]
        recent_data = TemplateCollectionSerializer(recent_collections, many=True).data

        storage_mb = documents.count() * 1.5

        return Response({
            "total_templates": total_templates,
            "total_pdfs": total_pdfs,
            "total_categories": total_categories,
            "category_distribution": cat_dist,
            "department_distribution": dept_dist,
            "recent_templates": recent_data,
            "storage_usage_mb": round(storage_mb, 2)
        })

    @action(detail=True, methods=['post'], url_path='upload-document')
    def upload_document(self, request, pk=None):
        collection = self.get_object()
        doc_file = request.FILES.get('file')
        doc_name = request.data.get('document_name')
        doc_type_id = request.data.get('document_type_id')
        version = request.data.get('version', '1.0')
        effective_date = request.data.get('effective_date') or None
        expiry_date = request.data.get('expiry_date') or None
        revision_date = request.data.get('revision_date') or None
        remarks = request.data.get('remarks', '')

        if not doc_file or not doc_name or not doc_type_id:
            return Response({"detail": "File, document name, and document type are required."}, status=status.HTTP_400_BAD_REQUEST)

        doc_type = get_object_or_404(DocumentType, id=doc_type_id)

        import mimetypes
        file_type, _ = mimetypes.guess_type(doc_file.name)
        if not file_type:
            file_type = "application/pdf"

        if hasattr(doc_file, 'seek'):
            try:
                doc_file.seek(0)
            except Exception:
                pass

        from services import drive_service
        logger.info(f"Triggering template document file upload to Google Drive. File: '{doc_file.name}' under root folder...")
        drive_meta = drive_service.upload_file(
            doc_file,
            doc_file.name,
            file_type,
            None
        )
        logger.info(f"Template document file upload successful. Metadata: {drive_meta}")

        if hasattr(doc_file, 'seek'):
            try:
                doc_file.seek(0)
            except Exception:
                pass

        doc = TemplateDocument.objects.create(
            template_collection=collection,
            document_name=doc_name,
            document_type=doc_type,
            google_file_id=drive_meta['id'],
            file_path=doc_file,
            version=version,
            effective_date=effective_date,
            expiry_date=expiry_date,
            revision_date=revision_date,
            remarks=remarks,
            uploaded_by=request.user,
            status='Active'
        )

        log_activity(request.user, f"Uploaded template document '{doc.document_name}' v{doc.version} inside collection '{collection.template_name}'", module="Templates")

        return Response(TemplateDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class TemplateDocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = TemplateDocument.objects.all().order_by('-uploaded_at')
    serializer_class = TemplateDocumentSerializer

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        import io
        import os
        from django.http import FileResponse, Http404
        doc = self.get_object()
        
        # Serve local file if exists
        if doc.file_path and os.path.exists(doc.file_path.path):
            response = FileResponse(open(doc.file_path.path, 'rb'), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{doc.document_name}.pdf"'
            response['Content-Type'] = 'application/pdf'
            return response

        if not doc.google_file_id or doc.google_file_id.startswith('drive_file_'):
            raise Http404("Document does not exist on storage.")

        try:
            file_bytes = drive_service.download_file(doc.google_file_id)
            response = FileResponse(io.BytesIO(file_bytes), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{doc.document_name}.pdf"'
            response['Content-Type'] = 'application/pdf'
            return response
        except Exception as e:
            return Response({"detail": f"Failed to download template from Google Drive: {str(e)}"}, status=500)

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        import io
        import os
        from django.http import FileResponse, Http404
        doc = self.get_object()
        
        # Serve local file if exists
        if doc.file_path and os.path.exists(doc.file_path.path):
            response = FileResponse(open(doc.file_path.path, 'rb'), as_attachment=False)
            response['Content-Type'] = 'application/pdf'
            return response

        if not doc.google_file_id or doc.google_file_id.startswith('drive_file_'):
            raise Http404("Document does not exist on storage.")

        try:
            file_bytes = drive_service.download_file(doc.google_file_id)
            response = FileResponse(io.BytesIO(file_bytes), as_attachment=False)
            response['Content-Type'] = 'application/pdf'
            return response
        except Exception as e:
            return Response({"detail": f"Failed to preview template from Google Drive: {str(e)}"}, status=500)

    @action(detail=True, methods=['get'], url_path='log-preview')
    def log_preview(self, request, pk=None):
        doc = self.get_object()
        log_activity(request.user, f"Previewed template document '{doc.document_name}' v{doc.version}", module="Templates")
        return Response({"detail": "Preview logged."})

    @action(detail=True, methods=['get'], url_path='log-download')
    def log_download(self, request, pk=None):
        doc = self.get_object()
        log_activity(request.user, f"Downloaded template document '{doc.document_name}' v{doc.version}", module="Templates")
        return Response({"detail": "Download logged."})

    @action(detail=True, methods=['post'], url_path='send-email')
    def send_email(self, request, pk=None):
        doc = self.get_object()
        raw_email = request.data.get('recipient_email') or request.data.get('recipient_emails')
        raw_cc = request.data.get('cc_email') or request.data.get('cc_emails') or request.data.get('cc')
        subject = request.data.get('subject') or f"Attached Document: {doc.document_name}"
        body = request.data.get('body') or f"Please find the attached document: {doc.document_name}."

        from services.email_service import parse_email_list
        recipient_list = parse_email_list(raw_email)
        cc_list = [e for e in parse_email_list(raw_cc) if e not in recipient_list]

        if not recipient_list:
            return Response({"detail": "Please provide at least one recipient email address."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Retrieve the file bytes
        import os
        from django.core.mail import EmailMultiAlternatives
        from users.models import SMTPSetting
        from django.core.mail import get_connection
        from django.conf import settings

        file_bytes = None
        if doc.file_path and os.path.exists(doc.file_path.path):
            try:
                with open(doc.file_path.path, 'rb') as f:
                    file_bytes = f.read()
            except Exception as read_err:
                logger.warning(f"Failed to read local file: {read_err}")
                
        if not file_bytes and doc.google_file_id and not doc.google_file_id.startswith('drive_file_'):
            try:
                from services import drive_service
                file_bytes = drive_service.download_file(doc.google_file_id)
            except Exception as e:
                return Response({"detail": f"Failed to download template from Google Drive: {str(e)}"}, status=500)

        if not file_bytes:
            return Response({"detail": "Document PDF file not found or empty."}, status=status.HTTP_404_NOT_FOUND)

        # 2. Setup SMTP setting
        smtp_setting = SMTPSetting.objects.filter(is_active=True).first()
        connection = None
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@mcc.edu')

        if smtp_setting:
            connection = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=smtp_setting.host,
                port=smtp_setting.port,
                username=smtp_setting.username if smtp_setting.auth_required else None,
                password=smtp_setting.password if smtp_setting.auth_required else None,
                use_tls=smtp_setting.use_tls,
                use_ssl=smtp_setting.use_ssl,
            )
            from_email = f"MCC LEGAL DOCUMENT <{smtp_setting.sender_email}>"

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=body,
                from_email=from_email,
                to=recipient_list,
                cc=cc_list if cc_list else None,
                connection=connection
            )
            # Attach PDF
            msg.attach(f"{doc.document_name}.pdf", file_bytes, "application/pdf")
            msg.send()
            
            # Log activity
            target_desc = ", ".join(recipient_list)
            if cc_list:
                target_desc += f" (CC: {', '.join(cc_list)})"
            log_activity(request.user, f"Emailed template document '{doc.document_name}' to {target_desc}", module="Templates")
            return Response({"detail": f"Email sent successfully to {target_desc}."})
        except Exception as e:
            return Response({"detail": f"Failed to send email: {str(e)}"}, status=500)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        doc = self.get_object()
        doc.status = 'Archived'
        doc.save(update_fields=['status'])
        log_activity(request.user, f"Archived template document '{doc.document_name}' v{doc.version}", module="Templates")
        return Response(TemplateDocumentSerializer(doc).data)


