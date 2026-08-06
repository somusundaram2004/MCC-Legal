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
        mock_create_folder.assert_called_once_with("New Department Folder", None)

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

    def test_recycle_bin_restore_and_purge(self):
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

        # 3. Test Permanent Delete Folder
        folder.is_deleted = True
        folder.save()
        purge_url = reverse('recycle-bin-permanent-delete')
        res = self.client.post(purge_url, {'items': [{'id': folder.id, 'type': 'folder'}]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(Folder.objects.filter(id=folder.id).exists())

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
