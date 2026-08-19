from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework import status, generics, viewsets, permissions
from rest_framework.permissions import IsAuthenticated, AllowAny, SAFE_METHODS
from django.db.models import Q, Count
from django.db import transaction
from django.db import IntegrityError
from django.db.models.deletion import ProtectedError
from datetime import date, timedelta
import logging

logger = logging.getLogger(__name__)

from .models import MOUTemplate, MOU, MOUDocument, MOURenewal, MOUShare, DepartmentSubmission, Stream
from .serializers import MOUTemplateSerializer, MOUSerializer, MOUDocumentSerializer, StreamSerializer
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
        
        # Auto-generate MOU number if not provided
        if not data.get('mou_number'):
            count = MOU.objects.count() + 1
            data['mou_number'] = f"MOU-{date.today().year}-{count:04d}"

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
        
        # Update share status to Viewed if viewed by department user
        if request.user.department:
            MOUShare.objects.filter(mou=mou, department__name=request.user.department, status='Shared').update(status='Viewed')
            
        serializer = MOUSerializer(mou, context={'request': request})
        return Response(serializer.data)

    def put(self, request, pk):
        mou = self.get_object(pk)
        if not mou:
            return Response({"detail": "MOU not found."}, status=status.HTTP_404_NOT_FOUND)

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
                
                from files.models import File
                from services import drive_service
                signed_file = File.objects.create(
                    name=uploaded_file.name,
                    size=uploaded_file.size,
                    file_type=file_type,
                    folder=submission_folder or mou.department,
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

        # Clone MOU record as a new renewal version
        new_count = MOU.objects.count() + 1
        renewed_mou = MOU.objects.create(
            title=f"{original.title} (Renewed)",
            mou_number=f"MOU-{date.today().year}-{new_count:04d}",
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

class MOUShareView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        shares = MOUShare.objects.filter(mou_id=pk)
        data = []
        for s in shares:
            data.append({
                'id': s.id,
                'department_id': s.department_id,
                'department_name': s.department.name if s.department else None,
                'user_id': s.user_id,
                'user_email': s.user.email if s.user else None,
                'permission': s.permission,
                'status': s.status,
                'shared_by': s.shared_by.name if s.shared_by else None,
                'shared_at': s.shared_at
            })
        return Response(data)

    def post(self, request, pk):
        mou = get_object_or_404(MOU, id=pk)
        department_name = request.data.get('department_name')
        user_email = request.data.get('user_email')
        permission = request.data.get('permission', 'View Only')
        
        # Resolve department folder
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
                google_id = drive_service.create_folder(dept_folder.name, None)
                dept_folder.google_folder_id = google_id
                dept_folder.save(update_fields=['google_folder_id'])
        
        target_user = None
        if user_email:
            target_user = get_object_or_404(User, email=user_email)
            
        with transaction.atomic():
            share, created = MOUShare.objects.update_or_create(
                mou=mou,
                department=dept_folder,
                user=target_user,
                defaults={
                    'shared_by': request.user,
                    'permission': permission,
                    'status': 'Shared'
                }
            )
            
            # Create "Department Submission" folder under MOU folder
            if mou.department:
                from folders.models import Folder
                from services import drive_service
                sub_folder_name = "Department Submission"
                sub_folder, sf_created = Folder.objects.get_or_create(
                    name=sub_folder_name,
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
        
        # Log & notify
        log_activity(request.user, f"Shared MOU '{mou.title}' with {department_name or user_email} ({permission})")
        if target_user:
            send_notification(target_user, "MOU Shared With You", f"MOU '{mou.title}' has been shared with you with permission '{permission}'.")
            
        return Response({"detail": "MOU shared successfully."}, status=status.HTTP_201_CREATED)

class MOUShareDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, pk):
        share = get_object_or_404(MOUShare, id=pk)
        mou_title = share.mou.title
        dept_or_user = share.department.name if share.department else (share.user.email if share.user else "Unknown")
        
        share.delete()
        log_activity(request.user, f"Revoked MOU share for '{mou_title}' from {dept_or_user}")
        return Response({"detail": "Share revoked successfully."}, status=status.HTTP_204_NO_CONTENT)

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
                    
                from files.models import File
                signed_file = File.objects.create(
                    name=uploaded_file.name,
                    size=uploaded_file.size,
                    file_type=file_type,
                    folder=submission_folder or mou.department,
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

class MasterDataMixin:
    """
    Shared mixin for all master-data ViewSets.
    - destroy(): catches ProtectedError (item is in use) → 409 Conflict
    - create() / update(): catches IntegrityError (duplicate name) → 400 Bad Request
    """
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
        return [permissions.IsAuthenticated()]

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
        return [permissions.IsAuthenticated()]

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
        return [permissions.IsAuthenticated()]

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
    permission_classes = [IsAuthenticated]
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
        if created:
            try:
                # Trigger Google Drive folder creation
                google_id = drive_service.create_folder(folder.name, None)
                folder.google_folder_id = google_id
                folder.save(update_fields=['google_folder_id'])
            except Exception as e:
                logger.warning(f"Google Drive folder creation skipped for '{folder.name}': {e}")



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
        recipient_email = request.data.get('recipient_email')
        subject = request.data.get('subject') or f"Attached Document: {doc.document_name}"
        body = request.data.get('body') or f"Please find the attached document: {doc.document_name}."

        if not recipient_email:
            return Response({"detail": "recipient_email is required."}, status=status.HTTP_400_BAD_REQUEST)

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
                to=[recipient_email],
                connection=connection
            )
            # Attach PDF
            msg.attach(f"{doc.document_name}.pdf", file_bytes, "application/pdf")
            msg.send()
            
            # Log activity
            log_activity(request.user, f"Emailed template document '{doc.document_name}' to {recipient_email}", module="Templates")
            return Response({"detail": f"Email sent successfully to {recipient_email}."})
        except Exception as e:
            return Response({"detail": f"Failed to send email: {str(e)}"}, status=500)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        doc = self.get_object()
        doc.status = 'Archived'
        doc.save(update_fields=['status'])
        log_activity(request.user, f"Archived template document '{doc.document_name}' v{doc.version}", module="Templates")
        return Response(TemplateDocumentSerializer(doc).data)


