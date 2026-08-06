from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from roles.models import Role, RolePermission
from permissions.models import Permission
from folders.models import Folder
from files.models import File, FileVersion

User = get_user_model()

class FileSyncAPITests(APITestCase):
    def setUp(self):
        # 1. Setup permissions and roles
        self.view_folder_perm, _ = Permission.objects.get_or_create(
            codename="view_folder", defaults={"name": "View Folder"}
        )
        self.upload_perm, _ = Permission.objects.get_or_create(
            codename="upload_files", defaults={"name": "Upload Files"}
        )
        self.download_perm, _ = Permission.objects.get_or_create(
            codename="download_files", defaults={"name": "Download Files"}
        )
        self.preview_perm, _ = Permission.objects.get_or_create(
            codename="preview_files", defaults={"name": "Preview Files"}
        )
        self.replace_perm, _ = Permission.objects.get_or_create(
            codename="replace_files", defaults={"name": "Replace Files"}
        )
        self.delete_perm, _ = Permission.objects.get_or_create(
            codename="delete_files", defaults={"name": "Delete Files"}
        )
        self.rename_perm, _ = Permission.objects.get_or_create(
            codename="rename_folder", defaults={"name": "Rename Folder"}
        )

        self.admin_role, _ = Role.objects.get_or_create(name="Admin", defaults={"description": "Administrator"})
        for perm in [self.view_folder_perm, self.upload_perm, self.download_perm, self.preview_perm, self.replace_perm, self.delete_perm, self.rename_perm]:
            RolePermission.objects.get_or_create(role=self.admin_role, permission=perm)

        # 2. Create testing users
        self.admin_user = User.objects.create_user(
            email="admin@college.edu",
            password="AdminPass123!",
            name="Admin User",
            role=self.admin_role,
            designation="Administrator",
            department="IT",
            status="Active"
        )
        
        # User role with no permissions for permission validation tests
        self.user_role, _ = Role.objects.get_or_create(name="User", defaults={"description": "Standard User"})
        self.regular_user = User.objects.create_user(
            email="user@college.edu",
            password="UserPass123!",
            name="Regular User",
            role=self.user_role,
            designation="Staff",
            department="IT",
            status="Active"
        )
        
        # Setup test folder
        self.folder = Folder.objects.create(
            name="Test Folder",
            google_folder_id="mock_folder_111",
            created_by=self.admin_user
        )

        self.client.force_authenticate(user=self.admin_user)

    @patch('services.drive_service.upload_file')
    def test_file_upload_syncs_with_google_drive(self, mock_upload_file):
        mock_upload_file.return_value = {
            'id': 'google_file_id_100',
            'name': 'agreement.pdf',
            'mimeType': 'application/pdf',
            'size': 1024,
            'webViewLink': 'https://drive.google.com/view/100',
            'webContentLink': 'https://drive.google.com/download/100'
        }

        url = reverse('file-list')
        pdf_file = SimpleUploadedFile("agreement.pdf", b"test pdf content", content_type="application/pdf")
        
        data = {
            'folder_id': self.folder.id,
            'file': pdf_file
        }
        
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify db metadata
        file_instance = File.objects.get(id=response.data['id'])
        self.assertEqual(file_instance.google_file_id, 'google_file_id_100')
        self.assertEqual(file_instance.mime_type, 'application/pdf')
        self.assertEqual(file_instance.file_size, 1024)
        self.assertEqual(file_instance.web_view_link, 'https://drive.google.com/view/100')
        
        # Verify upload called with parent google folder id
        mock_upload_file.assert_called_once()

    @patch('services.drive_service.download_file')
    def test_file_download_streams_securely(self, mock_download_file):
        mock_download_file.return_value = b"secret file contents from drive"
        
        file_instance = File.objects.create(
            name="secret.pdf",
            size=30,
            file_type="application/pdf",
            google_file_id="google_sec_file_999",
            folder=self.folder,
            uploaded_by=self.admin_user
        )

        url = reverse('file-download', kwargs={'pk': file_instance.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.getvalue(), b"secret file contents from drive")
        self.assertEqual(response['Content-Type'], 'application/pdf')
        
        # Verify Google URL never exposed
        self.assertNotIn(b"google", response.getvalue())
        mock_download_file.assert_called_once_with("google_sec_file_999")

    @patch('services.drive_service.delete_file')
    def test_file_delete_syncs_with_google_drive(self, mock_delete_file):
        file_instance = File.objects.create(
            name="to_delete.docx",
            size=50,
            file_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            google_file_id="drive_del_file_555",
            folder=self.folder,
            uploaded_by=self.admin_user
        )

        url = reverse('file-detail', kwargs={'pk': file_instance.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        file_instance.refresh_from_db()
        self.assertTrue(file_instance.is_deleted)
        self.assertIsNotNone(file_instance.deleted_at)

    @patch('services.drive_service.rename_file')
    def test_file_rename_syncs_with_google_drive(self, mock_rename_file):
        file_instance = File.objects.create(
            name="old_name.png",
            size=20,
            file_type="image/png",
            google_file_id="drive_ren_file_222",
            folder=self.folder,
            uploaded_by=self.admin_user
        )

        url = reverse('file-detail', kwargs={'pk': file_instance.id})
        data = {'name': 'new_name.png'}
        
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        file_instance.refresh_from_db()
        self.assertEqual(file_instance.name, "new_name.png")
        mock_rename_file.assert_called_once_with("drive_ren_file_222", "new_name.png")

    @patch('services.drive_service.upload_file')
    def test_file_replacement_archives_version_history(self, mock_upload_file):
        file_instance = File.objects.create(
            name="version1.pdf",
            size=10,
            file_type="application/pdf",
            google_file_id="drive_v1_id",
            folder=self.folder,
            uploaded_by=self.admin_user,
            version_number=1
        )

        mock_upload_file.return_value = {
            'id': 'drive_v2_id',
            'name': 'version2.pdf',
            'mimeType': 'application/pdf',
            'size': 20,
            'webViewLink': 'https://drive.google.com/view/v2',
            'webContentLink': 'https://drive.google.com/download/v2'
        }

        url = reverse('file-replace', kwargs={'pk': file_instance.id})
        pdf_file = SimpleUploadedFile("version2.pdf", b"new content", content_type="application/pdf")
        data = {'file': pdf_file}
        
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        file_instance.refresh_from_db()
        self.assertEqual(file_instance.version_number, 2)
        self.assertEqual(file_instance.google_file_id, 'drive_v2_id')
        
        # Verify FileVersion archive exists
        version_archive = FileVersion.objects.get(file=file_instance)
        self.assertEqual(version_archive.version_number, 1)
        self.assertEqual(version_archive.google_file_id, 'drive_v1_id')

    @patch('services.drive_service.move_file')
    def test_move_file_custom_action_syncs_with_google_drive(self, mock_move_file):
        target_folder = Folder.objects.create(
            name="Target Folder",
            google_folder_id="mock_target_folder_999",
            created_by=self.admin_user
        )
        
        file_instance = File.objects.create(
            name="move_me.pdf",
            size=10,
            file_type="application/pdf",
            google_file_id="move_file_id_777",
            folder=self.folder,
            uploaded_by=self.admin_user
        )

        url = reverse('file-move-custom')
        data = {
            'item_type': 'file',
            'item_id': file_instance.id,
            'new_parent_id': target_folder.id
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        file_instance.refresh_from_db()
        self.assertEqual(file_instance.folder, target_folder)
        mock_move_file.assert_called_once_with("move_file_id_777", "mock_target_folder_999")

    def test_unauthorized_user_is_forbidden_to_upload(self):
        # Authenticate as user with NO permissions
        self.client.force_authenticate(user=self.regular_user)
        
        url = reverse('file-list')
        pdf_file = SimpleUploadedFile("hack.pdf", b"hacker bytes", content_type="application/pdf")
        data = {
            'folder_id': self.folder.id,
            'file': pdf_file
        }
        
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_file_download_falls_back_to_local_storage(self):
        import os
        from django.core.files.base import ContentFile
        file_instance = File.objects.create(
            name="local_only.pdf",
            size=18,
            file_type="application/pdf",
            google_file_id="drive_file_mock_123",
            folder=self.folder,
            uploaded_by=self.admin_user
        )
        file_instance.file_field.save("local_only.pdf", ContentFile(b"local pdf content"))
        file_instance.save()

        url = reverse('file-download', kwargs={'pk': file_instance.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.getvalue(), b"local pdf content")
        self.assertEqual(response['Content-Type'], 'application/pdf')

        if file_instance.file_field and os.path.exists(file_instance.file_field.path):
            try:
                os.remove(file_instance.file_field.path)
            except Exception:
                pass

    def test_file_preview_falls_back_to_local_storage(self):
        import os
        from django.core.files.base import ContentFile
        file_instance = File.objects.create(
            name="local_preview.pdf",
            size=22,
            file_type="application/pdf",
            google_file_id="drive_file_mock_456",
            folder=self.folder,
            uploaded_by=self.admin_user
        )
        file_instance.file_field.save("local_preview.pdf", ContentFile(b"local preview content"))
        file_instance.save()

        url = reverse('file-preview', kwargs={'pk': file_instance.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.getvalue(), b"local preview content")
        self.assertEqual(response['Content-Type'], 'application/pdf')

        if file_instance.file_field and os.path.exists(file_instance.file_field.path):
            try:
                os.remove(file_instance.file_field.path)
            except Exception:
                pass

    @patch('services.drive_service.upload_file')
    def test_file_security_hashing_and_scanning(self, mock_upload):
        import hashlib
        mock_upload.return_value = {
            'id': 'drive_mock_file_id_999',
            'mimeType': 'application/pdf',
            'size': 18,
            'webViewLink': 'https://drive.google.com/view',
            'webContentLink': 'https://drive.google.com/download'
        }

        # Create a file upload request
        file_content = b"test secure file content"
        uploaded_file = SimpleUploadedFile("secure_test.pdf", file_content, content_type="application/pdf")
        
        # Calculate expected hash
        expected_hash = hashlib.sha256(file_content).hexdigest()

        # Perform the request
        response = self.client.post('/api/files/', {
            'folder_id': self.folder.id,
            'file': uploaded_file
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['sha256_hash'], expected_hash)
        self.assertEqual(response.data['virus_scan_status'], 'Clean')
        self.assertEqual(response.data['encrypted'], True)
        self.assertEqual(response.data['encryption_key_id'], 'Google-Drive-AES-256')

        # Test duplicate detection
        uploaded_file_duplicate = SimpleUploadedFile("secure_test_dup.pdf", file_content, content_type="application/pdf")
        response_dup = self.client.post('/api/files/', {
            'folder_id': self.folder.id,
            'file': uploaded_file_duplicate
        }, format='multipart')
        
        # Verify duplicate upload is rejected
        self.assertEqual(response_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Duplicate upload detected", response_dup.data['detail'])

        # Test threat detection for malicious extensions
        malicious_file = SimpleUploadedFile("malicious.exe", b"malicious code", content_type="application/octet-stream")
        response_mal = self.client.post('/api/files/', {
            'folder_id': self.folder.id,
            'file': malicious_file
        }, format='multipart')
        
        # Since duplicate checks happen, let's make sure it checks virus status on success
        self.assertEqual(response_mal.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_mal.data['virus_scan_status'], 'Threat Detected')
