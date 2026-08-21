from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from roles.models import Role, RolePermission
from permissions.models import Permission
from folders.models import Folder, FolderPermission
from users.models import UserPermission

User = get_user_model()

class DocumentManagementSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Create permissions
        self.view_dashboard = Permission.objects.create(
            name="View Dashboard", codename="view_dashboard", description="View dashboard stats"
        )
        self.manage_users = Permission.objects.create(
            name="Manage Users", codename="manage_users", description="Manage users list"
        )
        self.view_folder = Permission.objects.create(
            name="View Folder", codename="view_folder", description="View explorer folders"
        )
        self.create_folder = Permission.objects.create(
            name="Create Folder", codename="create_folder", description="Create folders"
        )

        # 2. Create roles
        self.super_admin_role = Role.objects.create(name="Super Admin", description="Super Admin")
        self.admin_role = Role.objects.create(name="Admin", description="Admin")
        self.user_role = Role.objects.create(name="User", description="User")

        # Map some permissions to User role
        RolePermission.objects.create(role=self.user_role, permission=self.view_dashboard)
        RolePermission.objects.create(role=self.user_role, permission=self.view_folder)

        # Map all permissions to Admin role
        RolePermission.objects.create(role=self.admin_role, permission=self.view_dashboard)
        RolePermission.objects.create(role=self.admin_role, permission=self.manage_users)
        RolePermission.objects.create(role=self.admin_role, permission=self.view_folder)
        RolePermission.objects.create(role=self.admin_role, permission=self.create_folder)

        # 3. Create users
        self.super_admin = User.objects.create_user(
            email="superadmin@test.edu", password="password123", name="Super Admin", role=self.super_admin_role
        )
        self.admin_user = User.objects.create_user(
            email="admin@test.edu", password="password123", name="Admin User", role=self.admin_role
        )
        self.normal_user = User.objects.create_user(
            email="user@test.edu", password="password123", name="Normal User", role=self.user_role
        )

    def get_jwt_token(self, email, password):
        response = self.client.post('/api/users/auth/login/', {'email': email, 'password': password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data['access']

    def test_jwt_login_success(self):
        self.assertIsNone(self.normal_user.last_login)
        token = self.get_jwt_token("user@test.edu", "password123")
        self.assertIsNotNone(token)
        self.normal_user.refresh_from_db()
        self.assertIsNotNone(self.normal_user.last_login)

    def test_jwt_login_failed_with_disabled_user(self):
        self.normal_user.status = 'Disabled'
        self.normal_user.save()

        response = self.client.post('/api/users/auth/login/', {'email': 'user@test.edu', 'password': 'password123'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_google_login_missing_token(self):
        response = self.client.post('/api/users/auth/google/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_dashboard_permission_for_user(self):
        # Normal User has view_dashboard permission by role
        token = self.get_jwt_token("user@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_manage_users_permission_for_user_blocked(self):
        # Normal User does NOT have manage_users permission by role
        token = self.get_jwt_token("user@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # Accessing users list (which requires manage_users)
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_permission_override_grant(self):
        # Grant normal_user manage_users override permission
        UserPermission.objects.create(user=self.normal_user, permission=self.manage_users, is_granted=True)

        token = self.get_jwt_token("user@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # Now they should be allowed to view users
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_permission_override_revoke(self):
        # Revoke normal_user view_dashboard permission (which is normally granted by role)
        UserPermission.objects.create(user=self.normal_user, permission=self.view_dashboard, is_granted=False)

        token = self.get_jwt_token("user@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # Now they should be blocked
        response = self.client.get('/api/dashboard/stats/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_folder_access_inheritance(self):
        # Create a hierarchy: Root -> Company A -> Legal
        root_folder = Folder.objects.create(name="Company A", created_by=self.admin_user)
        child_folder = Folder.objects.create(name="Legal", parent=root_folder, created_by=self.admin_user)

        token = self.get_jwt_token("user@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # 1. By default, Normal User cannot access root folder (it falls back to False)
        self.assertFalse(root_folder.has_access(self.normal_user))
        
        # 2. Grant explicit access on root folder
        FolderPermission.objects.create(user=self.normal_user, folder=root_folder, is_granted=True)

        # 3. User should now have access to root folder and child folder (inherited!)
        self.assertTrue(root_folder.has_access(self.normal_user))
        self.assertTrue(child_folder.has_access(self.normal_user))

        # 4. Revoke access explicitly on child folder
        FolderPermission.objects.create(user=self.normal_user, folder=child_folder, is_granted=False)

        # 5. User has access to root, but blocked on child
        self.assertTrue(root_folder.has_access(self.normal_user))
        self.assertFalse(child_folder.has_access(self.normal_user))

    def test_create_user_invitation(self):
        # Authenticate as super admin
        token = self.get_jwt_token("superadmin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # Create invitation with email only
        response = self.client.post('/api/users/invite/', {
            'email': 'invitee@test.edu'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        
        # Verify invitation exists in DB with default stream, department and role
        from users.models import UserInvitation
        invitation = UserInvitation.objects.get(email='invitee@test.edu')
        self.assertEqual(invitation.department, '')
        self.assertEqual(invitation.stream, '')
        self.assertEqual(invitation.system_role.name, 'User')

    def test_public_get_invitation_by_token(self):
        # Create invitation directly
        from users.models import UserInvitation
        from django.utils import timezone
        from datetime import timedelta
        from users.invitation_services import TokenService

        expires_at = timezone.now() + timedelta(hours=24)
        token = TokenService.generate_token('invitee2@test.edu', 'Aided', 'Physics', self.user_role.id, expires_at)
        
        invitation = UserInvitation.objects.create(
            email='invitee2@test.edu',
            stream='Aided',
            department='Physics',
            system_role=self.user_role,
            token=token,
            expires_at=expires_at,
            created_by=self.super_admin
        )

        # Public user fetches invitation metadata
        response = self.client.get(f'/api/users/invitation/{token}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'invitee2@test.edu')
        self.assertEqual(response.data['department'], 'Physics')

    def test_register_via_invitation_success(self):
        # Create invitation directly
        from users.models import UserInvitation
        from django.utils import timezone
        from datetime import timedelta
        from users.invitation_services import TokenService

        expires_at = timezone.now() + timedelta(hours=24)
        token = TokenService.generate_token('invitee3@test.edu', 'Self-Financed (SFS)', 'Commerce', self.user_role.id, expires_at)
        
        invitation = UserInvitation.objects.create(
            email='invitee3@test.edu',
            stream='Self-Financed (SFS)',
            department='Commerce',
            system_role=self.user_role,
            token=token,
            expires_at=expires_at,
            created_by=self.super_admin
        )

        # Register using the token
        response = self.client.post('/api/users/register/', {
            'token': token,
            'name': 'New Registrant',
            'password': 'StrongPassword@123',
            'designation': 'Assistant Professor'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify CustomUser was created in database
        user_created = User.objects.get(email='invitee3@test.edu')
        self.assertEqual(user_created.name, 'New Registrant')
        self.assertEqual(user_created.department, 'Commerce')
        self.assertEqual(user_created.stream, 'Self-Financed (SFS)')
        self.assertEqual(user_created.role, self.user_role)
        self.assertEqual(user_created.designation, 'Assistant Professor')

        # Verify invitation is marked as used
        invitation.refresh_from_db()
        self.assertTrue(invitation.is_used)

    def test_register_via_invitation_fails_with_invalid_password(self):
        # Create invitation directly
        from users.models import UserInvitation
        from django.utils import timezone
        from datetime import timedelta
        from users.invitation_services import TokenService

        expires_at = timezone.now() + timedelta(hours=24)
        token = TokenService.generate_token('invitee4@test.edu', 'Aided', 'History', self.user_role.id, expires_at)
        
        invitation = UserInvitation.objects.create(
            email='invitee4@test.edu',
            stream='Aided',
            department='History',
            system_role=self.user_role,
            token=token,
            expires_at=expires_at,
            created_by=self.super_admin
        )

        # Register with simple password (missing uppercase/special)
        response = self.client.post('/api/users/register/', {
            'token': token,
            'name': 'Weak Pass User',
            'password': 'password123',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_list_super_admin_users(self):
        token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # Admin lists users
        response = self.client.get('/api/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify Super Admin is not in the list
        emails = [u['email'] for u in response.data]
        self.assertNotIn("superadmin@test.edu", emails)

    def test_admin_cannot_list_super_admin_role(self):
        token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # Admin lists roles
        response = self.client.get('/api/roles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify Super Admin role is not in the list
        role_names = [r['name'] for r in response.data]
        self.assertNotIn("Super Admin", role_names)

    def test_admin_cannot_invite_super_admin_role(self):
        token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # Admin tries to invite a user with Super Admin role
        response = self.client.post('/api/users/invite/', {
            'email': 'some_new_super@test.edu',
            'system_role_id': self.super_admin_role.id
        })
        # Verify it is blocked
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_view_super_admin_invitations(self):
        # Create Super Admin invitation (by super admin)
        from users.models import UserInvitation
        from django.utils import timezone
        from datetime import timedelta
        from users.invitation_services import TokenService

        expires_at = timezone.now() + timedelta(hours=24)
        token = TokenService.generate_token('some_super_invite@test.edu', 'Aided', 'History', self.super_admin_role.id, expires_at)
        
        UserInvitation.objects.create(
            email='some_super_invite@test.edu',
            stream='Aided',
            department='History',
            system_role=self.super_admin_role,
            token=token,
            expires_at=expires_at,
            created_by=self.super_admin
        )

        # Login as Admin
        admin_token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + admin_token)

        # Admin gets invitations list
        response = self.client.get('/api/users/invitations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify Super Admin invitation is not visible to Admin
        results = response.data.get('results') if isinstance(response.data, dict) else response.data
        invite_emails = [i['email'] for i in results]
        self.assertNotIn("some_super_invite@test.edu", invite_emails)

    def test_super_admin_can_manage_smtp_settings(self):
        token = self.get_jwt_token("superadmin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # 1. Create SMTPSetting
        response = self.client.post('/api/users/smtp-settings/', {
            'host': 'smtp.test.com',
            'port': 587,
            'username': 'testuser',
            'password': 'testpassword',
            'use_tls': True,
            'use_ssl': False,
            'sender_email': 'test@test.com',
            'is_active': True
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        smtp_id = response.data['id']

        # 2. List SMTP settings
        response = self.client.get('/api/users/smtp-settings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # 3. Update SMTP setting
        response = self.client.put(f'/api/users/smtp-settings/{smtp_id}/', {
            'host': 'smtp.updated.com',
            'port': 465,
            'username': 'updateduser',
            'use_tls': False,
            'use_ssl': True,
            'sender_email': 'updated@test.com',
            'is_active': True
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['host'], 'smtp.updated.com')

        # 4. Delete SMTP setting
        response = self.client.delete(f'/api/users/smtp-settings/{smtp_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_cannot_manage_smtp_settings(self):
        token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # Try to post
        response = self.client.post('/api/users/smtp-settings/', {
            'host': 'smtp.test.com',
            'port': 587,
            'username': 'testuser',
            'password': 'testpassword',
            'sender_email': 'test@test.com'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_cannot_manage_smtp_settings(self):
        token = self.get_jwt_token("user@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        # Try to get
        response = self.client.get('/api/users/smtp-settings/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_smtp_settings_deactivates_others(self):
        from users.models import SMTPSetting
        
        # Create two SMTP settings in DB
        s1 = SMTPSetting.objects.create(
            host='smtp1.com', username='u1', password='p1', sender_email='s1@test.com', is_active=True
        )
        s2 = SMTPSetting.objects.create(
            host='smtp2.com', username='u2', password='p2', sender_email='s2@test.com', is_active=False
        )

        # Activate the second via API as Super Admin
        token = self.get_jwt_token("superadmin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        response = self.client.patch(f'/api/users/smtp-settings/{s2.id}/', {
            'is_active': True
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify s1 is now deactivated
        s1.refresh_from_db()
        s2.refresh_from_db()
        self.assertFalse(s1.is_active)
        self.assertTrue(s2.is_active)


from unittest.mock import patch

class GoogleDriveOAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name="Super Admin", description="Super Admin")
        self.admin_role = Role.objects.create(name="Admin", description="Admin")
        self.user_role = Role.objects.create(name="User", description="User")

        self.super_admin = User.objects.create_user(
            email="superadmin@test.edu", password="password123", name="Super Admin", role=self.super_admin_role
        )
        self.admin_user = User.objects.create_user(
            email="admin@test.edu", password="password123", name="Admin User", role=self.admin_role
        )
        self.normal_user = User.objects.create_user(
            email="user@test.edu", password="password123", name="Normal User", role=self.user_role
        )

    def get_jwt_token(self, email, password):
        response = self.client.post('/api/users/auth/login/', {'email': email, 'password': password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data['access']

    def test_oauth_url_retrieval_success(self):
        token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        with self.settings(GOOGLE_DRIVE_CLIENT_ID="mock_client_id"):
            response = self.client.get('/api/users/google-drive-settings/oauth-url/?redirect_uri=http://localhost:5173/settings')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn("mock_client_id", response.data['url'])
            self.assertIn("response_type=code", response.data['url'])

    def test_oauth_url_blocked_for_normal_user(self):
        token = self.get_jwt_token("user@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        response = self.client.get('/api/users/google-drive-settings/oauth-url/?redirect_uri=http://localhost:5173/settings')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('requests.post')
    @patch('requests.get')
    def test_oauth_callback_success(self, mock_get, mock_post):
        class MockResponse:
            def __init__(self, json_data, status_code):
                self.json_data = json_data
                self.status_code = status_code

            def json(self):
                return self.json_data

            @property
            def text(self):
                return str(self.json_data)

        mock_post.return_value = MockResponse({
            'access_token': 'mock_access',
            'refresh_token': 'mock_refresh',
            'expires_in': 3600
        }, 200)

        def side_effect(url, *args, **kwargs):
            if 'userinfo' in url:
                return MockResponse({'email': 'connected@gmail.com'}, 200)
            elif 'about' in url:
                return MockResponse({'storageQuota': {'usage': '2000000', 'limit': '15000000'}}, 200)
            return MockResponse({}, 404)

        mock_get.side_effect = side_effect

        token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        with self.settings(GOOGLE_DRIVE_CLIENT_ID="mock_client_id", GOOGLE_DRIVE_CLIENT_SECRET="mock_secret"):
            response = self.client.post('/api/users/google-drive-settings/oauth-callback/', {
                'code': 'mock_code',
                'redirect_uri': 'http://localhost:5173/settings'
            })
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['connected_email'], 'connected@gmail.com')
            self.assertEqual(response.data['storage_usage'], 2000000)

            from users.models import GoogleDriveSetting
            setting = GoogleDriveSetting.objects.filter(is_active=True).first()
            self.assertIsNotNone(setting)
            self.assertEqual(setting.access_token, 'mock_access')
            self.assertEqual(setting.refresh_token, 'mock_refresh')
            self.assertEqual(setting.connected_email, 'connected@gmail.com')


class WebOAuthIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin_role = Role.objects.create(name="Super Admin", description="Super Admin")
        self.admin_role = Role.objects.create(name="Admin", description="Admin")
        self.user_role = Role.objects.create(name="User", description="User")

        self.super_admin = User.objects.create_user(
            email="superadmin@test.edu", password="password123", name="Super Admin", role=self.super_admin_role
        )
        self.admin_user = User.objects.create_user(
            email="admin@test.edu", password="password123", name="Admin User", role=self.admin_role
        )
        self.normal_user = User.objects.create_user(
            email="user@test.edu", password="password123", name="Normal User", role=self.user_role
        )

    def get_jwt_token(self, email, password):
        response = self.client.post('/api/users/auth/login/', {'email': email, 'password': password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data['access']

    def test_oauth_url_retrieval_success(self):
        token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        from users.models import GoogleDriveSetting
        GoogleDriveSetting.objects.all().delete()

        with self.settings(GOOGLE_OAUTH_CLIENT_ID="mock_oauth_client_id", GOOGLE_OAUTH_REDIRECT_URI="http://localhost:8000/api/google-drive/oauth/callback/"):
            response = self.client.get('/api/google-drive/oauth-url/?force_select=true')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn("mock_oauth_client_id", response.data['url'])
            self.assertIn("prompt=select_account+consent", response.data['url'])
            self.assertIn("http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fgoogle-drive%2Foauth%2Fcallback%2F", response.data['url'])

    def test_oauth_url_blocked_for_normal_user(self):
        token = self.get_jwt_token("user@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        response = self.client.get('/api/google-drive/oauth-url/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('requests.post')
    @patch('requests.get')
    def test_oauth_callback_success(self, mock_get, mock_post):
        class MockResponse:
            def __init__(self, json_data, status_code):
                self.json_data = json_data
                self.status_code = status_code

            def json(self):
                return self.json_data

            @property
            def text(self):
                return str(self.json_data)

        mock_post.return_value = MockResponse({
            'access_token': 'mock_access',
            'refresh_token': 'mock_refresh',
            'expires_in': 3600
        }, 200)

        def side_effect(url, *args, **kwargs):
            if 'userinfo' in url:
                return MockResponse({'email': 'connected_email@gmail.com'}, 200)
            elif 'about' in url:
                return MockResponse({'storageQuota': {'usage': '12930000000', 'limit': '5000000000000'}}, 200)
            return MockResponse({}, 404)

        mock_get.side_effect = side_effect

        with self.settings(GOOGLE_OAUTH_CLIENT_ID="mock_client_id", GOOGLE_OAUTH_CLIENT_SECRET="mock_secret", GOOGLE_OAUTH_REDIRECT_URI="http://localhost:8000/api/google-drive/oauth/callback/"):
            response = self.client.get('/api/google-drive/oauth/callback/?code=mock_code')
            # The callback must return a 302 Found redirect to React settings page
            self.assertEqual(response.status_code, status.HTTP_302_FOUND)
            self.assertIn("http://localhost:5173/settings?drive=connected", response.url)

            from users.models import GoogleDriveSetting
            setting = GoogleDriveSetting.objects.filter(is_active=True).first()
            self.assertIsNotNone(setting)
            self.assertEqual(setting.access_token, 'mock_access')
            self.assertEqual(setting.refresh_token, 'mock_refresh')
            self.assertEqual(setting.connected_email, 'connected_email@gmail.com')
            self.assertEqual(setting.connection_status, 'Connected')
            self.assertTrue(setting.oauth_connected)

    def test_status_retrieval(self):
        token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        from users.models import GoogleDriveSetting
        GoogleDriveSetting.objects.create(
            connected_email="connected_account@example.com",
            connection_status="Connected",
            oauth_connected=True,
            storage_limit=5000000000000,
            storage_usage=12930000000,
            root_folder_id="Default",
            default_upload_folder="Root Repository",
            is_active=True
        )

        response = self.client.get('/api/google-drive/status/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['connection_status'], 'Connected')
        self.assertEqual(response.data['connected_email'], 'connected_account@example.com')
        self.assertEqual(response.data['storage_limit'], 5000000000000)

    def test_disconnect(self):
        token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        from users.models import GoogleDriveSetting
        setting = GoogleDriveSetting.objects.create(
            connected_email="connected_account@example.com",
            connection_status="Connected",
            oauth_connected=True,
            is_active=True
        )

        response = self.client.post('/api/google-drive/disconnect/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        setting.refresh_from_db()
        self.assertFalse(setting.oauth_connected)
        self.assertEqual(setting.connection_status, 'Disconnected')

    def test_update_root_folder_id(self):
        token = self.get_jwt_token("admin@test.edu", "password123")
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

        from users.models import GoogleDriveSetting
        setting = GoogleDriveSetting.objects.create(
            connected_email="connected_account@example.com",
            connection_status="Connected",
            oauth_connected=True,
            is_active=True,
            root_folder_id="old_id"
        )

        # 1. Test updating with plain ID
        response = self.client.patch('/api/google-drive/update-root-folder/', {
            'root_folder_id': 'new_clean_id'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['root_folder_id'], 'new_clean_id')
        setting.refresh_from_db()
        self.assertEqual(setting.root_folder_id, 'new_clean_id')

        # 2. Test updating with full Google Drive URL
        response = self.client.patch('/api/google-drive/update-root-folder/', {
            'root_folder_id': 'https://drive.google.com/drive/folders/1v5kj8M_Ll2RXZaQuBJGoSWhq1IYb7n9u?usp=sharing'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['root_folder_id'], '1v5kj8M_Ll2RXZaQuBJGoSWhq1IYb7n9u')
        setting.refresh_from_db()
        self.assertEqual(setting.root_folder_id, '1v5kj8M_Ll2RXZaQuBJGoSWhq1IYb7n9u')

    def test_database_encryption_mechanism(self):
        from users.models import SMTPSetting, GoogleDriveSetting
        from django.db import connection

        # Test SMTP setting password encryption
        smtp = SMTPSetting.objects.create(
            sender_email="test_secure_smtp@test.com",
            password="my_super_secret_smtp_password"
        )
        # Verify it transparently decrypts
        self.assertEqual(smtp.password, "my_super_secret_smtp_password")

        # Verify that it is stored encrypted in the database
        with connection.cursor() as cursor:
            cursor.execute("SELECT password FROM users_smtpsetting WHERE id = %s", [smtp.id])
            row = cursor.fetchone()
            db_value = row[0]
            self.assertNotEqual(db_value, "my_super_secret_smtp_password")
            self.assertTrue(db_value.startswith("gAAAAA"))

        # Test Google Drive credentials encryption
        drive = GoogleDriveSetting.objects.create(
            project_id="test_proj",
            private_key="my_super_secret_private_key",
            client_secret="my_super_secret_client_secret"
        )
        # Verify it transparently decrypts
        self.assertEqual(drive.private_key, "my_super_secret_private_key")
        self.assertEqual(drive.client_secret, "my_super_secret_client_secret")

        # Verify that it is stored encrypted in the database
        with connection.cursor() as cursor:
            cursor.execute("SELECT private_key, client_secret FROM users_googledrivesetting WHERE id = %s", [drive.id])
            row = cursor.fetchone()
            db_private_key, db_client_secret = row
            self.assertNotEqual(db_private_key, "my_super_secret_private_key")
            self.assertTrue(db_private_key.startswith("gAAAAA"))
            self.assertNotEqual(db_client_secret, "my_super_secret_client_secret")
            self.assertTrue(db_client_secret.startswith("gAAAAA"))


class DashboardStatsAccuracyTests(DocumentManagementSystemTests):
    def test_dashboard_stats_accuracy(self):
        from mous.models import MOU
        from folders.models import Folder
        from files.models import File
        from rest_framework_simplejwt.tokens import RefreshToken
        import datetime

        # Authenticate as super admin directly
        access_token = str(RefreshToken.for_user(self.admin_user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + access_token)

        # 1. Clean test setup
        MOU.objects.all().delete()
        Folder.objects.all().delete()
        File.objects.all().delete()

        # Check initial stats (zero state)
        res = self.client.get('/api/dashboard/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total_folders'], 0)
        self.assertEqual(res.data['total_files'], 0)
        self.assertEqual(res.data['active_mous'], 0)
        self.assertEqual(res.data['pending_approval'], 0)
        self.assertEqual(res.data['expiring_30_days'], 0)

        # 2. Create non-deleted and soft-deleted folders
        active_folder = Folder.objects.create(name="Active Folder", created_by=self.admin_user, is_deleted=False)
        deleted_folder = Folder.objects.create(name="Deleted Folder", created_by=self.admin_user, is_deleted=True)

        # 3. Create non-deleted and soft-deleted files
        active_file = File.objects.create(name="active.pdf", folder=active_folder, size=1000, file_type="pdf", uploaded_by=self.admin_user, is_deleted=False)
        deleted_file = File.objects.create(name="deleted.pdf", folder=active_folder, size=1000, file_type="pdf", uploaded_by=self.admin_user, is_deleted=True)

        # 4. Create Active MOU and Expired MOU
        today = datetime.date.today()
        active_mou = MOU.objects.create(
            title="Active Industry Partnership MOU",
            mou_number="MOU-101",
            partner_organization="Tech Corp",
            status="Active",
            signed_date=today - datetime.timedelta(days=100),
            expiry_date=today + datetime.timedelta(days=200),
            created_by=self.admin_user
        )

        expired_mou = MOU.objects.create(
            title="Expired Research MOU",
            mou_number="MOU-102",
            partner_organization="Old Partner",
            status="Expired",
            signed_date=today - datetime.timedelta(days=500),
            expiry_date=today - datetime.timedelta(days=10),
            created_by=self.admin_user
        )

        res_updated = self.client.get('/api/dashboard/stats/')
        self.assertEqual(res_updated.status_code, status.HTTP_200_OK)

        # Verify soft-deleted folders and files are excluded
        self.assertEqual(res_updated.data['total_files'], 1) # Only active.pdf
        self.assertEqual(res_updated.data['active_mous'], 1) # Only active_mou



