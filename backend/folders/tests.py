from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch
from roles.models import Role, RolePermission
from permissions.models import Permission
from folders.models import Folder, FolderPermission

User = get_user_model()

class FolderSyncAPITests(APITestCase):
    def setUp(self):
        # 1. Setup permissions and roles
        self.view_folder_perm, _ = Permission.objects.get_or_create(
            codename="view_folder", 
            defaults={"name": "View Folder", "description": "Can view folders"}
        )
        self.create_folder_perm, _ = Permission.objects.get_or_create(
            codename="create_folder", 
            defaults={"name": "Create Folder", "description": "Can create folders"}
        )
        self.create_nested_folder_perm, _ = Permission.objects.get_or_create(
            codename="create_nested_folder", 
            defaults={"name": "Create Nested Folder", "description": "Can create nested folders"}
        )
        self.rename_folder_perm, _ = Permission.objects.get_or_create(
            codename="rename_folder", 
            defaults={"name": "Rename Folder", "description": "Can rename folders"}
        )
        self.delete_folder_perm, _ = Permission.objects.get_or_create(
            codename="delete_folder", 
            defaults={"name": "Delete Folder", "description": "Can delete folders"}
        )
        self.manage_users_perm, _ = Permission.objects.get_or_create(
            codename="manage_users",
            defaults={"name": "Manage Users", "description": "Can manage users"}
        )

        self.admin_role, _ = Role.objects.get_or_create(
            name="Admin", 
            defaults={"description": "Administrator"}
        )
        
        # Map permissions to Admin role
        for perm in [self.view_folder_perm, self.create_folder_perm, self.create_nested_folder_perm, self.rename_folder_perm, self.delete_folder_perm, self.manage_users_perm]:
            RolePermission.objects.get_or_create(role=self.admin_role, permission=perm)

        # 2. Create testing users
        self.user = User.objects.create_user(
            email="admin@college.edu",
            password="AdminPass123!",
            name="Admin User",
            role=self.admin_role,
            designation="Administrator",
            department="IT",
            status="Active"
        )
        self.normal_role, _ = Role.objects.get_or_create(
            name="User", 
            defaults={"description": "Standard User"}
        )
        self.other_user = User.objects.create_user(
            email="normal@college.edu",
            password="UserPass123!",
            name="Normal User",
            role=self.normal_role,
            designation="Analyst",
            department="Physics",
            status="Active"
        )
        self.client.force_authenticate(user=self.user)

    @patch('services.drive_service.create_folder')
    def test_create_folder_syncs_with_google_drive(self, mock_create_folder):
        mock_create_folder.return_value = "mock_drive_folder_id_xyz"

        url = reverse('folder-list')
        data = {'name': 'New Department Folder'}
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify database record
        folder = Folder.objects.get(id=response.data['id'])
        self.assertEqual(folder.google_folder_id, "mock_drive_folder_id_xyz")
        self.assertEqual(folder.name, "New Department Folder")
        
        # Verify mock called
        mock_create_folder.assert_called_once()
        self.assertEqual(mock_create_folder.call_args[0][0], "New Department Folder")


    @patch('services.drive_service.create_folder')
    def test_create_nested_folder_syncs_with_google_drive(self, mock_create_folder):
        # Setup parent folder
        parent = Folder.objects.create(
            name="Parent Folder",
            google_folder_id="parent_google_id_123",
            created_by=self.user
        )
        
        mock_create_folder.return_value = "nested_google_id_456"

        url = reverse('folder-list')
        data = {
            'name': 'Nested Folder',
            'parent_id': parent.id
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify db
        nested_folder = Folder.objects.get(id=response.data['id'])
        self.assertEqual(nested_folder.parent, parent)
        self.assertEqual(nested_folder.google_folder_id, "nested_google_id_456")
        
        # Verify nested call used parent's google_folder_id
        mock_create_folder.assert_called_once_with("Nested Folder", "parent_google_id_123")

    @patch('services.drive_service.rename_file')
    def test_rename_folder_syncs_with_google_drive(self, mock_rename_file):
        folder = Folder.objects.create(
            name="Old Name",
            google_folder_id="drive_id_999",
            created_by=self.user
        )

        url = reverse('folder-detail', kwargs={'pk': folder.id})
        data = {'name': 'New Name'}
        
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        folder.refresh_from_db()
        self.assertEqual(folder.name, "New Name")
        mock_rename_file.assert_called_once_with("drive_id_999", "New Name")

    @patch('services.drive_service.delete_file')
    def test_delete_folder_moves_to_recycle_bin(self, mock_delete_file):
        folder = Folder.objects.create(
            name="Folder to Delete",
            google_folder_id="drive_delete_id_888",
            created_by=self.user
        )

        url = reverse('folder-delete') + f'?folder_id={folder.id}'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Check soft deletion in database
        folder.refresh_from_db()
        self.assertTrue(folder.is_deleted)
        self.assertIsNotNone(folder.deleted_at)
        self.assertEqual(folder.google_folder_id, "drive_delete_id_888")
        
        # STRICT REQUIREMENT: Soft delete must NOT delete from Google Drive!
        mock_delete_file.assert_not_called()

    @patch('services.drive_service.delete_file')
    def test_recycle_bin_restore_and_purge(self, mock_delete_file):
        folder = Folder.objects.create(
            name="Recycle Test Folder",
            google_folder_id="drive_recycle_999",
            created_by=self.user,
            is_deleted=True
        )

        # 1. Test List Recycle Bin
        list_url = reverse('recycle-bin-list')
        res = self.client.get(list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(i['real_id'] == folder.id for i in res.data['items']))

        # 2. Test Restore Folder
        restore_url = reverse('recycle-bin-restore')
        res = self.client.post(restore_url, {'items': [{'id': folder.id, 'type': 'folder'}]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        folder.refresh_from_db()
        self.assertFalse(folder.is_deleted)
        self.assertEqual(folder.google_folder_id, "drive_recycle_999")

        # 3. Test Permanent Delete Folder (ONLY permanent delete removes from Google Drive)
        folder.is_deleted = True
        folder.save()
        purge_url = reverse('recycle-bin-permanent-delete')
        res = self.client.post(purge_url, {'items': [{'id': folder.id, 'type': 'folder'}]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(Folder.objects.filter(id=folder.id).exists())
        mock_delete_file.assert_called_once_with("drive_recycle_999")

    def test_assign_and_revoke_access(self):
        # Create a folder
        folder = Folder.objects.create(name="Shared Folder", created_by=self.user)
        
        # Verify other user has no access initially (fallback is False)
        self.assertFalse(folder.has_access(self.other_user))

        # Assign access via API
        assign_url = reverse('folder-assign-access', kwargs={'pk': folder.id})
        response = self.client.post(assign_url, {'user_id': self.other_user.id, 'is_granted': True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify access granted in DB
        self.assertTrue(FolderPermission.objects.filter(user=self.other_user, folder=folder, is_granted=True).exists())
        self.assertTrue(folder.has_access(self.other_user))

        # Revoke access via API
        revoke_url = reverse('folder-revoke-access', kwargs={'pk': folder.id})
        response = self.client.post(revoke_url, {'user_id': self.other_user.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify access rule deleted and access revoked
        self.assertFalse(FolderPermission.objects.filter(user=self.other_user, folder=folder).exists())
        self.assertFalse(folder.has_access(self.other_user))

    def test_import_folder_endpoint(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from files.models import File

        self.client.force_authenticate(user=self.user)
        dummy_file1 = SimpleUploadedFile("doc1.txt", b"Hello world 1", content_type="text/plain")
        dummy_file2 = SimpleUploadedFile("doc2.txt", b"Hello world 2", content_type="text/plain")

        payload = {
            'files': [dummy_file1, dummy_file2],
            'relative_paths': ['ImportedTree/SubFolder/doc1.txt', 'ImportedTree/doc2.txt']
        }
        res = self.client.post('/api/folders/import-folder/', payload, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data.get('imported_files'), 2)

        # Verify DB records created correctly
        root_folder = Folder.objects.filter(name='ImportedTree', is_deleted=False).first()
        self.assertIsNotNone(root_folder)
        sub_folder = Folder.objects.filter(name='SubFolder', parent=root_folder, is_deleted=False).first()
        self.assertIsNotNone(sub_folder)

        file1 = File.objects.filter(name='doc1.txt', folder=sub_folder, is_deleted=False).first()
        self.assertIsNotNone(file1)
        self.assertEqual(file1.size, 13)
        self.assertEqual(file1.file_size, 13)

        file2 = File.objects.filter(name='doc2.txt', folder=root_folder, is_deleted=False).first()
        self.assertIsNotNone(file2)

    def test_import_execute_endpoint(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from files.models import File

        self.client.force_authenticate(user=self.user)
        dummy_file = SimpleUploadedFile("report.pdf", b"PDF content sample", content_type="application/pdf")

        payload = {
            'module_id': 'mou_repository',
            'files': [dummy_file],
            'relative_paths': ['ExecutionPackage/report.pdf'],
            'duplicate_file_strategy': 'create_copy',
            'duplicate_folder_strategy': 'merge'
        }
        res = self.client.post('/api/import-export/import/execute/', payload, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))

        # Verify DB records created correctly
        imported_file = File.objects.filter(name='report.pdf', is_deleted=False).first()
        self.assertIsNotNone(imported_file)
        self.assertEqual(imported_file.file_type, 'PDF')

    @patch('folders.views_import_export.drive_service.browse_drive_folder')
    def test_google_drive_browser_and_import(self, mock_browse):
        from files.models import File

        mock_browse.return_value = {
            'current_folder': {'id': 'root', 'name': 'My Drive', 'parents': []},
            'items': [{'id': 'folder1', 'name': 'Test Folder', 'mimeType': 'application/vnd.google-apps.folder', 'is_folder': True}]
        }

        self.client.force_authenticate(user=self.user)

        # 1. Test Drive Browser endpoints
        res_root = self.client.get('/api/import-export/drive-browser/?folder_id=root')
        self.assertEqual(res_root.status_code, status.HTTP_200_OK)
        self.assertIn('current_folder', res_root.data)

        res_app = self.client.get('/api/import-export/drive-browser/?folder_id=app_root')
        self.assertEqual(res_app.status_code, status.HTTP_200_OK)
        self.assertIn('current_folder', res_app.data)

        # 2. Test Import with source_drive_items payload
        payload = {
            'source_type': 'google_drive',
            'module_id': 'mou_repository',
            'source_drive_items': [
                {'id': 'drive_sample_file_123', 'name': 'SampleDriveDoc.pdf', 'is_folder': False, 'size': 2048}
            ],
            'duplicate_file_strategy': 'create_copy',
            'duplicate_folder_strategy': 'merge'
        }
        res_import = self.client.post('/api/import-export/import/execute/', payload, format='json')
        self.assertEqual(res_import.status_code, status.HTTP_200_OK)
        self.assertTrue(res_import.data.get('success'))

        imported_file = File.objects.filter(name='SampleDriveDoc.pdf', is_deleted=False).first()
        self.assertIsNotNone(imported_file)
        self.assertTrue(imported_file.file_size > 0)

    def test_global_search_excludes_soft_deleted_items(self):
        from files.models import File

        # Create active and soft-deleted items
        active_f = Folder.objects.create(name="SearchActiveFolder", created_by=self.user, is_deleted=False)
        deleted_f = Folder.objects.create(name="SearchDeletedFolder", created_by=self.user, is_deleted=True)

        active_file = File.objects.create(name="SearchActiveFile.pdf", folder=active_f, size=100, file_type="pdf", uploaded_by=self.user, is_deleted=False)
        deleted_file = File.objects.create(name="SearchDeletedFile.pdf", folder=active_f, size=100, file_type="pdf", uploaded_by=self.user, is_deleted=True)

        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/search/?q=Search')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        folder_names = [f['name'] for f in res.data.get('folders', [])]
        file_names = [fi['name'] for fi in res.data.get('files', [])]

        self.assertIn("SearchActiveFolder", folder_names)
        self.assertNotIn("SearchDeletedFolder", folder_names)

        self.assertIn("SearchActiveFile.pdf", file_names)
        self.assertNotIn("SearchDeletedFile.pdf", file_names)



