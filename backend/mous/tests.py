from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from datetime import date

from roles.models import Role
from folders.models import Folder
from files.models import File
from mous.models import MOU, MOUShare, DepartmentSubmission, MOUShareDownloadLog
from users.models import UserInvitation
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class MOUSharingTests(APITestCase):
    def setUp(self):
        # Create Roles
        self.super_admin_role = Role.objects.create(name='Super Admin', description='Super admin role')
        self.admin_role = Role.objects.create(name='Admin', description='Admin role')
        self.dept_user_role = Role.objects.create(name='Normal User', description='Department user role')

        # Create Users
        self.admin = User.objects.create_user(
            email='admin@mcc.edu',
            password='password123',
            name='Admin User',
            role=self.admin_role
        )
        self.dept_user = User.objects.create_user(
            email='cs_aided@mcc.edu',
            password='password123',
            name='CS Aided User',
            role=self.dept_user_role,
            department='Computer Science (Aided)'
        )

        # Create Folders
        self.mou_folder = Folder.objects.create(
            name='Infosys MOU Folder',
            google_folder_id='folder_infosys_123',
            created_by=self.admin
        )

        # Create MOU
        self.mou = MOU.objects.create(
            title='Infosys MOU',
            mou_number='MOU/2026/INF01',
            partner_organization='Infosys Ltd',
            duration_months=36,
            expiry_date=date(2029, 7, 27),
            department=self.mou_folder,
            status='Draft',
            created_by=self.admin
        )

    @patch('services.drive_service.create_folder')
    def test_share_mou_folder(self, mock_create_folder):
        mock_create_folder.return_value = 'mock_google_submission_folder_id'
        
        self.client.force_authenticate(user=self.admin)
        url = reverse('mou-share', args=[self.mou.id])
        
        data = {
            'department_name': 'Computer Science (Aided)',
            'permission': 'Upload Only'
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify share record was created
        shares = MOUShare.objects.filter(mou=self.mou)
        self.assertEqual(shares.count(), 1)
        self.assertEqual(shares.first().department.name, 'Computer Science (Aided)')
        self.assertEqual(shares.first().permission, 'Upload Only')
        self.assertEqual(shares.first().status, 'Shared')
        
        # Verify subfolder 'Department Submission' was created in DB and synced
        submission_folder = Folder.objects.filter(parent=self.mou_folder, name='Department Submission').first()
        self.assertIsNotNone(submission_folder)
        self.assertEqual(submission_folder.google_folder_id, 'mock_google_submission_folder_id')

    def test_revoke_mou_share(self):
        # Setup share
        dept_folder = Folder.objects.create(name='Computer Science (Aided)', created_by=self.admin)
        share = MOUShare.objects.create(
            mou=self.mou,
            department=dept_folder,
            permission='View Only',
            status='Shared',
            shared_by=self.admin
        )

        self.client.force_authenticate(user=self.admin)
        url = reverse('mou-share-delete', args=[share.id])
        
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MOUShare.objects.filter(id=share.id).exists())

    @patch('services.drive_service.upload_file')
    @patch('services.drive_service.create_folder')
    def test_department_submission_multipart(self, mock_create_folder, mock_upload_file):
        mock_create_folder.return_value = 'mock_sub_google_id'
        mock_upload_file.return_value = {
            'id': 'mock_uploaded_file_google_id',
            'mimeType': 'application/pdf',
            'size': 5000,
            'webViewLink': 'https://drive.google.com/mock',
            'webContentLink': 'https://drive.google.com/mock/download'
        }

        # First, share the folder with the department so the user has access
        dept_folder = Folder.objects.create(name='Computer Science (Aided)', created_by=self.admin)
        MOUShare.objects.create(
            mou=self.mou,
            department=dept_folder,
            permission='Upload Only',
            status='Shared',
            shared_by=self.admin
        )

        self.client.force_authenticate(user=self.dept_user)
        url = reverse('mou-submission')

        # Dummy signed copy PDF
        pdf_file = SimpleUploadedFile("signed_infosys.pdf", b"pdf content", content_type="application/pdf")

        data = {
            'mou_id': self.mou.id,
            'file': pdf_file,
            'signed_date': '2026-07-27',
            'mou_month': 'July',
            'mou_year': 2026,
            'summary': 'This agreement establishes Infosys academic linkage.',
            'purpose': 'Providing placement and internship opportunities.',
            'benefits': 'Placement links, guest lectures, curriculum audit.',
            'remarks': 'Uploaded signed scanned version.'
        }

        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify database changes
        sub = DepartmentSubmission.objects.filter(mou=self.mou).first()
        self.assertIsNotNone(sub)
        self.assertEqual(sub.review_status, 'Pending Verification')
        self.assertEqual(sub.mou_year, 2026)
        self.assertEqual(sub.mou_month, 'July')
        self.assertEqual(sub.signed_file.google_file_id, 'mock_uploaded_file_google_id')

        # Verify MOU status updated
        self.mou.refresh_from_db()
        self.assertEqual(self.mou.status, 'Pending Verification')

    @patch('services.drive_service.upload_file')
    @patch('services.drive_service.create_folder')
    def test_department_submission_backdated(self, mock_create_folder, mock_upload_file):
        mock_create_folder.return_value = 'mock_sub_google_id'
        mock_upload_file.return_value = {
            'id': 'mock_uploaded_file_google_id',
            'mimeType': 'application/pdf',
            'size': 5000,
            'webViewLink': 'https://drive.google.com/mock',
            'webContentLink': 'https://drive.google.com/mock/download'
        }

        dept_folder = Folder.objects.create(name='Computer Science (Aided)', created_by=self.admin)
        MOUShare.objects.create(
            mou=self.mou,
            department=dept_folder,
            permission='Upload Only',
            status='Shared',
            shared_by=self.admin
        )

        self.client.force_authenticate(user=self.dept_user)
        url = reverse('mou-submission')

        pdf_file = SimpleUploadedFile("signed_infosys.pdf", b"pdf content", content_type="application/pdf")

        data = {
            'mou_id': self.mou.id,
            'file': pdf_file,
            'signed_date': '2026-07-27',
            'mou_month': 'July',
            'mou_year': 2026,
            'summary': 'This agreement establishes Infosys academic linkage.',
            'purpose': 'Providing placement and internship opportunities.',
            'benefits': 'Placement links, guest lectures, curriculum audit.',
            'remarks': 'Uploaded signed scanned version.',
            'created_at': '2026-07-25T10:30:00'
        }

        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        sub = DepartmentSubmission.objects.filter(mou=self.mou).first()
        self.assertIsNotNone(sub)
        
        from django.utils.timezone import make_aware
        from datetime import datetime
        expected_dt = make_aware(datetime(2026, 7, 25, 10, 30, 0))
        self.assertEqual(sub.uploaded_at, expected_dt)
        self.assertEqual(sub.signed_file.created_at, expected_dt)

    def test_approve_department_submission(self):
        dept_folder = Folder.objects.create(name='Computer Science (Aided)', created_by=self.admin)
        share = MOUShare.objects.create(
            mou=self.mou,
            department=dept_folder,
            permission='Upload Only',
            status='Signed MOU Uploaded',
            shared_by=self.admin
        )
        dummy_file = File.objects.create(name='dummy.pdf', size=100, folder=dept_folder, uploaded_by=self.dept_user)
        
        submission = DepartmentSubmission.objects.create(
            mou=self.mou,
            department=dept_folder,
            signed_file=dummy_file,
            signed_date=date(2026, 7, 27),
            mou_month='July',
            mou_year=2026,
            summary='Linkage summary',
            purpose='Objective purpose',
            benefits=['Placements'],
            uploaded_by=self.dept_user,
            review_status='Pending Verification'
        )

        self.client.force_authenticate(user=self.admin)
        url = reverse('mou-submission-review', args=[submission.id])

        data = {
            'action': 'approve',
            'comments': 'All checks are compliant and clean.'
        }

        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        submission.refresh_from_db()
        self.assertEqual(submission.review_status, 'Verified')
        self.assertEqual(submission.reviewer_comments, 'All checks are compliant and clean.')

        self.mou.refresh_from_db()
        self.assertEqual(self.mou.status, 'Active')
        self.assertEqual(self.mou.remarks, 'All checks are compliant and clean.')

        share.refresh_from_db()
        self.assertEqual(share.status, 'Completed')

class CustomTimeMiddlewareTests(APITestCase):
    def setUp(self):
        # Create Roles
        self.super_admin_role = Role.objects.create(name='Super Admin', description='Super admin role')
        self.admin_role = Role.objects.create(name='Admin', description='Admin role')
        self.normal_role = Role.objects.create(name='Normal User', description='Normal user role')

        self.admin = User.objects.create_user(
            email='admin@mcc.edu',
            password='password123',
            name='Admin User',
            role=self.admin_role
        )
        self.dept_user = User.objects.create_user(
            email='coord@mcc.edu',
            password='password123',
            name='Coordinator User',
            role=self.normal_role,
            department='Computer Science (Aided)'
        )

        # Create Folder
        self.folder = Folder.objects.create(
            name='Test Dept Folder',
            created_by=self.admin
        )

        # Create Active MOU
        self.mou = MOU.objects.create(
            title='Test Expiry MOU',
            mou_number='MOU/2026/EXP01',
            partner_organization='Test Org',
            duration_months=12,
            signed_date=date(2026, 1, 1),
            expiry_date=date(2027, 1, 1), # Expires on Jan 1st 2027
            department=self.folder,
            status='Active',
            coordinator_email='coord@mcc.edu',
            created_by=self.admin
        )

    def test_middleware_simulated_clock_overrides_date(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('mou-reports-stats')

        # Request with simulated clock header (e.g. 2026-12-15) - 17 days remaining
        # Expiry is 2027-01-01. If we set date to 2026-12-15 (17 days remaining),
        # days remaining is <= 30, so a 30-day reminder warning should be triggered.
        response = self.client.get(
            url, 
            HTTP_X_CUSTOM_TIME='2026-12-15T10:00:00Z'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that warning notifications for 30 days were generated
        from notifications.models import Notification
        
        # Admin notifications
        admin_notis = Notification.objects.filter(user=self.admin, metadata__mou_id=self.mou.id)
        self.assertTrue(admin_notis.exists())
        self.assertEqual(admin_notis.first().metadata.get('days_remaining'), 30)

        # Coordinator notifications
        coord_notis = Notification.objects.filter(user=self.dept_user, metadata__mou_id=self.mou.id)
        self.assertTrue(coord_notis.exists())
        self.assertEqual(coord_notis.first().metadata.get('days_remaining'), 30)

    def test_middleware_simulated_clock_triggers_expiry(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('mou-reports-stats')

        # Request with simulated date post expiry (e.g. 2027-01-02)
        response = self.client.get(
            url, 
            HTTP_X_CUSTOM_TIME='2027-01-02T12:00:00Z'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # MOU should be expired
        self.mou.refresh_from_db()
        self.assertEqual(self.mou.status, 'Expired')

        # Verification of notifications
        from notifications.models import Notification
        admin_expiry_noti = Notification.objects.filter(
            user=self.admin, 
            metadata__mou_id=self.mou.id,
            metadata__days_remaining=0
        )
        self.assertTrue(admin_expiry_noti.exists())


class MOUCategoryTests(APITestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(name='Admin', description='Admin role')
        self.admin = User.objects.create_user(
            email='admin@mcc.edu',
            password='password123',
            name='Admin User',
            role=self.admin_role
        )

    def test_create_category(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('mou-category-list')
        data = {
            'name': 'Google Cloud Research Labs',
            'code': 'GCP',
            'color': '#8B5CF6',
            'icon_type': 'company',
            'coordinator_name': 'Sundar Pichai',
            'coordinator_email': 'sundar@google.com',
            'category_type': 'Company'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Google Cloud Research Labs')
        self.assertEqual(response.data['code'], 'GCP')
        self.assertEqual(response.data['category_type'], 'Company')


class MOUSharingAndDownloadManagementTests(APITestCase):
    def setUp(self):
        self.admin_role = Role.objects.create(name='Admin', description='Admin role')
        self.user_role = Role.objects.create(name='User', description='Standard User')

        self.admin = User.objects.create_user(
            email='admin_tester@mcc.edu',
            password='password123',
            name='Admin Tester',
            role=self.admin_role
        )
        self.registered_recipient = User.objects.create_user(
            email='recipient_verified@mcc.edu',
            password='password123',
            name='Recipient Verified',
            role=self.user_role
        )

        self.mou_folder = Folder.objects.create(name='Agreement Folder 2026', created_by=self.admin)
        self.test_file = File.objects.create(
            name='MOU_Agreement_2026.pdf',
            size=1024,
            file_type='pdf',
            folder=self.mou_folder,
            uploaded_by=self.admin
        )
        self.mou = MOU.objects.create(
            title='MOU Agreement 2026',
            mou_number='MOU/2026/TEST99',
            partner_organization='Global Technology Corp',
            original_mou=self.test_file,
            department=self.mou_folder,
            status='Active',
            created_by=self.admin,
            version_number=1
        )

    @patch('mous.views.send_mou_share_email')
    def test_share_new_file_with_unregistered_recipient(self, mock_send_email):
        mock_send_email.return_value = True

        self.client.force_authenticate(user=self.admin)
        url = reverse('mou-share', args=[self.mou.id])

        unregistered_email = 'external_partner@example.com'
        data = {
            'recipient_email': unregistered_email,
            'permission': 'View Only',
            'email_template': 'standard',
            'email_subject': 'Custom Subject for MOU',
            'custom_message': 'Please review the agreement.'
        }

        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data.get('created'))

        # Verify share record was created
        share = MOUShare.objects.filter(mou=self.mou, recipient_email=unregistered_email).first()
        self.assertIsNotNone(share)
        self.assertEqual(share.permission, 'View Only')
        self.assertEqual(share.status, 'Shared')
        self.assertEqual(share.download_count, 0)
        self.assertIsNotNone(share.secure_token)
        self.assertEqual(share.shared_file, self.test_file)
        self.assertEqual(share.document_version, 1)

        # Verify pending invitation was created
        invitation = UserInvitation.objects.filter(email=unregistered_email).first()
        self.assertIsNotNone(invitation)

        # Verify email was dispatched
        mock_send_email.assert_called_once()

    @patch('mous.views.send_mou_share_email')
    def test_share_duplicate_recipient_updates_without_duplication(self, mock_send_email):
        mock_send_email.return_value = True

        self.client.force_authenticate(user=self.admin)
        url = reverse('mou-share', args=[self.mou.id])

        # 1. First Share
        data_first = {
            'recipient_email': self.registered_recipient.email,
            'permission': 'View Only',
            'email_template': 'standard'
        }
        res1 = self.client.post(url, data_first)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MOUShare.objects.filter(mou=self.mou, recipient_email=self.registered_recipient.email).count(), 1)

        # 2. Second Share to same recipient
        data_second = {
            'recipient_email': self.registered_recipient.email,
            'permission': 'Edit',
            'email_template': 'review_and_sign',
            'email_subject': 'Updated Review Request',
            'custom_message': 'Updated terms to sign.'
        }
        res2 = self.client.post(url, data_second)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertFalse(res2.data.get('created'))

        # Verify NO duplicate share entries
        shares = MOUShare.objects.filter(mou=self.mou, recipient_email=self.registered_recipient.email)
        self.assertEqual(shares.count(), 1)
        updated_share = shares.first()
        self.assertEqual(updated_share.permission, 'Edit')
        self.assertEqual(updated_share.email_template, 'review_and_sign')
        self.assertGreaterEqual(len(updated_share.sharing_history), 2)

    def test_download_mou_button_and_tracking(self):
        # Create share
        share = MOUShare.objects.create(
            mou=self.mou,
            shared_file=self.test_file,
            user=self.registered_recipient,
            recipient_email=self.registered_recipient.email,
            shared_by=self.admin,
            permission='View Only',
            status='Shared',
            document_version=1
        )
        self.assertEqual(share.download_count, 0)
        self.assertEqual(share.status, 'Shared')

        download_url = reverse('mou-share-download', args=[share.secure_token])

        # Recipient clicks DOWNLOAD MOU
        response = self.client.get(download_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue('attachment' in response['Content-Disposition'])

        # Verify tracking recorded
        share.refresh_from_db()
        self.assertEqual(share.download_count, 1)
        self.assertEqual(share.status, 'Downloaded')
        self.assertIsNotNone(share.first_download_date)
        self.assertIsNotNone(share.last_download_date)

        # Verify audit log
        logs = MOUShareDownloadLog.objects.filter(share=share)
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertEqual(log.recipient_email, self.registered_recipient.email)
        self.assertEqual(log.document_version, 1)

        # Second download: verify download count increments to 2
        response2 = self.client.get(download_url)
        self.assertEqual(response2.status_code, 200)
        share.refresh_from_db()
        self.assertEqual(share.download_count, 2)
        self.assertEqual(MOUShareDownloadLog.objects.filter(share=share).count(), 2)

        # File is NOT removed from Shared Files or repository
        self.assertTrue(MOUShare.objects.filter(id=share.id).exists())
        self.assertTrue(MOU.objects.filter(id=self.mou.id).exists())

    def test_shared_files_section_views(self):
        share = MOUShare.objects.create(
            mou=self.mou,
            shared_file=self.test_file,
            user=self.registered_recipient,
            recipient_email=self.registered_recipient.email,
            shared_by=self.admin,
            permission='View Only',
            status='Shared'
        )

        # Recipient views "Shared With Me"
        self.client.force_authenticate(user=self.registered_recipient)
        url_with_me = reverse('mou-shared-files') + '?tab=with_me'
        res_with_me = self.client.get(url_with_me)
        self.assertEqual(res_with_me.status_code, 200)
        data = res_with_me.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['mou_title'], 'MOU Agreement 2026')
        self.assertEqual(data[0]['download_status'], 'Not Downloaded')

        # Admin views "Shared By Me"
        self.client.force_authenticate(user=self.admin)
        url_by_me = reverse('mou-shared-files') + '?tab=by_me'
        res_by_me = self.client.get(url_by_me)
        self.assertEqual(res_by_me.status_code, 200)
        data_by_me = res_by_me.json()
        self.assertEqual(len(data_by_me), 1)
        self.assertEqual(data_by_me[0]['mou_number'], 'MOU/2026/TEST99')

    def test_revoke_and_expiration_security(self):
        share = MOUShare.objects.create(
            mou=self.mou,
            shared_file=self.test_file,
            recipient_email='target@example.com',
            shared_by=self.admin,
            status='Shared',
            access_status='Active'
        )

        download_url = reverse('mou-share-download', args=[share.secure_token])

        # Revoke access
        self.client.force_authenticate(user=self.admin)
        revoke_url = reverse('mou-share-revoke', args=[share.id])
        res_revoke = self.client.post(revoke_url)
        self.assertEqual(res_revoke.status_code, 200)

        # Attempt download -> must be 403 Forbidden
        self.client.logout()
        res_download = self.client.get(download_url)
        self.assertEqual(res_download.status_code, status.HTTP_403_FORBIDDEN)

        # Test expiration
        share.access_status = 'Active'
        share.expires_at = timezone.now() - timedelta(hours=1)
        share.save()

        res_expired = self.client.get(download_url)
        self.assertEqual(res_expired.status_code, status.HTTP_403_FORBIDDEN)

    @patch('mous.views.send_mou_share_email')
    def test_direct_file_sharing(self, mock_email):
        mock_email.return_value = True
        self.client.force_authenticate(user=self.admin)
        url = reverse('mou-share-file')
        data = {
            'file_id': self.test_file.id,
            'recipient_email': 'file_recipient@example.com',
            'email_subject': 'Direct File Share Subject',
            'custom_message': 'Please review this file.',
            'permission': 'View Only'
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(MOUShare.objects.filter(recipient_email='file_recipient@example.com').exists())
        share = MOUShare.objects.get(recipient_email='file_recipient@example.com')
        self.assertEqual(share.shared_file.id, self.test_file.id)
        mock_email.assert_called_once()

    @patch('mous.views.send_mou_share_email')
    def test_direct_file_sharing_without_existing_mou_in_department_folder(self, mock_email):
        mock_email.return_value = True
        self.client.force_authenticate(user=self.admin)

        # Create a new department folder and standalone repository file with no prior MOU
        dept_folder = Folder.objects.create(name='BussAdministration', created_by=self.admin)
        unlinked_file = File.objects.create(
            name='AAI Internship Internal guidelines.docx',
            size=16384,
            file_type='docx',
            folder=dept_folder,
            uploaded_by=self.admin
        )

        url = reverse('mou-share-file')
        data = {
            'file_id': unlinked_file.id,
            'recipient_email': 'paulrenine9487@gmail.com',
            'email_subject': 'Shared File: AAI Internship Internal guidelines.docx',
            'custom_message': 'Please find the internship guidelines attached.',
            'permission': 'Full Access'
        }
        res = self.client.post(url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        # Verify MOU was automatically created with proper Folder instance
        created_mou = MOU.objects.filter(original_mou=unlinked_file).first()
        self.assertIsNotNone(created_mou)
        self.assertEqual(created_mou.department, dept_folder)
        self.assertEqual(created_mou.department_name, 'BussAdministration')

        # Verify MOUShare was created
        share = MOUShare.objects.filter(shared_file=unlinked_file, recipient_email='paulrenine9487@gmail.com').first()
        self.assertIsNotNone(share)
        self.assertEqual(share.permission, 'Full Access')
        self.assertEqual(share.shared_by, self.admin)
        mock_email.assert_called_once()




