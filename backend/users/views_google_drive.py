import logging
import urllib.parse
import datetime
import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from users.models import GoogleDriveSetting
from users.serializers import GoogleDriveSettingSerializer
from activity_logs.utils import log_activity

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

import os
import json

def get_oauth_credentials():
    client_id = ''
    client_secret = ''
    
    # 1. Check credentials.json first
    cred_path = os.path.join(settings.BASE_DIR, 'credentials.json')
    if os.path.exists(cred_path):
        try:
            with open(cred_path, 'r') as f:
                data = json.load(f)
                web_data = data.get('web') or data.get('installed') or {}
                client_id = web_data.get('client_id', '')
                client_secret = web_data.get('client_secret', '')
        except Exception as e:
            logger.error(f"Error reading credentials.json: {e}")
                
    # 2. Fall back to settings / environment variables
    if not client_id:
        client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
    if not client_secret:
        client_secret = getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', '')

    # 3. Fall back to database setting
    if not client_id or not client_secret:
        db_setting = GoogleDriveSetting.objects.first()
        if db_setting:
            if not client_id:
                client_id = db_setting.client_id
            if not client_secret:
                client_secret = db_setting.client_secret
                
    return client_id, client_secret

def get_oauth_redirect_uri(request_redirect_uri=None):
    cred_path = os.path.join(settings.BASE_DIR, 'credentials.json')
    if os.path.exists(cred_path):
        try:
            with open(cred_path, 'r') as f:
                data = json.load(f)
                web_data = data.get('web', {})
                uris = web_data.get('redirect_uris', [])
                if uris:
                    if request_redirect_uri and request_redirect_uri in uris:
                        return request_redirect_uri
                    return uris[0]
        except Exception as e:
            logger.error(f"Error parsing redirect_uris from credentials.json: {e}")
            
    return request_redirect_uri or getattr(settings, 'GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:5173/settings')


class GoogleDriveViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminOrSuperAdmin]

    @action(detail=False, methods=['get'], url_path='status')
    def status(self, request):
        setting = GoogleDriveSetting.objects.filter(is_active=True).first()
        if not setting:
            # Fallback to check if any configuration exists
            setting = GoogleDriveSetting.objects.first()
            
        if not setting:
            return Response({
                "connection_status": "Disconnected",
                "connected_email": None,
                "storage_limit": None,
                "storage_usage": None,
                "available_storage": None,
                "root_folder_id": "Default",
                "default_upload_folder": "Root Repository",
                "last_connection_time": None
            })

        limit = setting.storage_limit
        usage = setting.storage_usage
        available = (limit - usage) if (limit is not None and usage is not None) else None

        return Response({
            "connection_status": setting.connection_status or ("Connected" if setting.oauth_connected else "Disconnected"),
            "connected_email": setting.connected_email,
            "storage_limit": limit,
            "storage_usage": usage,
            "available_storage": available,
            "root_folder_id": setting.root_folder_id or "Default",
            "default_upload_folder": setting.default_upload_folder or "Root Repository",
            "last_connection_time": setting.last_connection_time
        })

    @action(detail=False, methods=['get'], url_path='oauth-url')
    def oauth_url(self, request):
        force_select = request.query_params.get('force_select', 'false').lower() == 'true'

        client_id, _ = get_oauth_credentials()
        if not client_id:
            return Response({"detail": "Google Client ID is not configured on the server"}, status=status.HTTP_400_BAD_REQUEST)

        req_redirect = request.query_params.get('redirect_uri')
        redirect_uri = get_oauth_redirect_uri(req_redirect or getattr(settings, 'GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:8000/api/google-drive/oauth/callback/'))
        if not redirect_uri:
            return Response({"detail": "GOOGLE_OAUTH_REDIRECT_URI settings is required"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email openid',
            'access_type': 'offline',
            'include_granted_scopes': 'true',
            'prompt': 'select_account consent'
        }

        url = 'https://accounts.google.com/o/oauth2/auth?' + urllib.parse.urlencode(params)
        return Response({'url': url})

    @action(detail=False, methods=['get', 'post'], url_path='oauth/callback', permission_classes=[permissions.AllowAny])
    def oauth_callback(self, request):
        from django.http import HttpResponseRedirect
        
        code = request.data.get('code') or request.query_params.get('code')
        req_redirect_uri = request.data.get('redirect_uri') or request.query_params.get('redirect_uri')
        is_json_req = request.content_type == 'application/json' or request.data.get('code') is not None

        if not code:
            error_reason = request.data.get('error') or request.query_params.get('error', 'No authorization code received')
            if is_json_req:
                return Response({"detail": error_reason}, status=status.HTTP_400_BAD_REQUEST)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/') + f'/settings?drive=failed&error={urllib.parse.quote(error_reason)}'
            return HttpResponseRedirect(frontend_url)

        client_id, client_secret = get_oauth_credentials()
        redirect_uri = get_oauth_redirect_uri(req_redirect_uri or getattr(settings, 'GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:8000/api/google-drive/oauth/callback/'))

        if not client_id or not client_secret or not redirect_uri:
            if is_json_req:
                return Response({"detail": "Google OAuth credentials or redirect_uri missing on server"}, status=status.HTTP_400_BAD_REQUEST)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/') + '/settings?drive=failed&error=credentials_missing'
            return HttpResponseRedirect(frontend_url)

        token_url = 'https://oauth2.googleapis.com/token'
        payload = {
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }

        try:
            res = requests.post(token_url, data=payload)
            if res.status_code != 200:
                if is_json_req:
                    return Response({"detail": f"Failed to exchange code with Google: {res.text}"}, status=status.HTTP_400_BAD_REQUEST)
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/') + f'/settings?drive=failed&error={urllib.parse.quote(res.text)}'
                return HttpResponseRedirect(frontend_url)

            tokens = res.json()
            access_token = tokens.get('access_token')
            refresh_token = tokens.get('refresh_token')
            expires_in = tokens.get('expires_in', 3600)
            expiry_time = timezone.now() + datetime.timedelta(seconds=expires_in)

            # Get user info
            headers = {'Authorization': f'Bearer {access_token}'}
            userinfo_res = requests.get('https://www.googleapis.com/oauth2/v2/userinfo', headers=headers)
            connected_email = None
            if userinfo_res.status_code == 200:
                connected_email = userinfo_res.json().get('email')

            # Get storage quota
            storage_usage = 0
            storage_limit = 0
            drive_about_res = requests.get('https://www.googleapis.com/drive/v3/about?fields=storageQuota', headers=headers)
            if drive_about_res.status_code == 200:
                quota = drive_about_res.json().get('storageQuota', {})
                storage_usage = int(quota.get('usage', 0))
                storage_limit = int(quota.get('limit', 0))

            # Update or create database setting
            setting = GoogleDriveSetting.objects.filter(is_active=True).first()
            if not setting:
                setting = GoogleDriveSetting.objects.first()
            if not setting:
                setting = GoogleDriveSetting()

            # If switching to a new account, ensure refresh_token matches the new account
            if setting.connected_email and connected_email and setting.connected_email != connected_email:
                logger.info(f"Switching Google Drive account from '{setting.connected_email}' to '{connected_email}'")
                setting.refresh_token = refresh_token
            elif refresh_token:
                setting.refresh_token = refresh_token

            setting.client_id = client_id
            setting.client_secret = client_secret
            setting.access_token = access_token
            setting.token_expiry = expiry_time
            setting.connected_email = connected_email or 'unknown@google.com'
            setting.storage_usage = storage_usage
            setting.storage_limit = storage_limit
            setting.connection_status = 'Connected'
            setting.oauth_connected = True
            setting.is_active = True
            setting.last_connection_time = timezone.now()
            if not setting.project_id:
                setting.project_id = 'Web OAuth Project'
            setting.save()

            if request.user and request.user.is_authenticated:
                log_activity(request.user, f"Connected Google Drive account: {setting.connected_email}", "drive")
            
            print("\n" + "=" * 70)
            print(" [GOOGLE DRIVE SUCCESS] Google Drive Connected Successfully! ")
            print(f"  Connected Email   : {setting.connected_email}")
            print(f"  Connection Status : {setting.connection_status}")
            print(f"  Storage Limit     : {setting.storage_limit} bytes")
            print("=" * 70 + "\n")

            if is_json_req:
                return Response({
                    "detail": "Google Drive connected successfully!",
                    "connected_email": setting.connected_email,
                    "connection_status": "Connected"
                }, status=status.HTTP_200_OK)

            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/') + '/settings?drive=connected'
            return HttpResponseRedirect(frontend_url)
        except Exception as e:
            logger.error(f"Google Drive OAuth callback failed: {e}", exc_info=True)
            print("\n" + "=" * 70)
            print(f" [GOOGLE DRIVE ERROR] Google Drive OAuth Callback Failed: {e}")
            print("=" * 70 + "\n")
            if is_json_req:
                return Response({"detail": f"OAuth authorization failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/') + f'/settings?drive=failed&error={urllib.parse.quote(str(e))}'
            return HttpResponseRedirect(frontend_url)

    @action(detail=False, methods=['post'], url_path='disconnect')
    def disconnect(self, request):
        setting = GoogleDriveSetting.objects.filter(is_active=True).first()
        if not setting:
            setting = GoogleDriveSetting.objects.first()
            
        if setting:
            setting.oauth_connected = False
            setting.connection_status = 'Disconnected'
            setting.connected_email = ''
            setting.access_token = None
            setting.refresh_token = None
            setting.is_active = False
            setting.save()
            log_activity(request.user, "Disconnected Google Drive organization account", "drive")

        return Response({"detail": "Google Drive disconnected successfully"})

    @action(detail=False, methods=['post'], url_path='test-connection')
    def test_connection(self, request):
        setting = GoogleDriveSetting.objects.filter(is_active=True).first()
        if not setting:
            setting = GoogleDriveSetting.objects.first()

        if not setting or not setting.oauth_connected:
            return Response({"detail": "No active Google Drive connection found"}, status=status.HTTP_400_BAD_REQUEST)

        from services import drive_service
        try:
            # Force verify authentication credentials refresh logic
            service = drive_service.authenticate()
            # Test listing files to verify token validity
            service.files().list(pageSize=1).execute()
            
            # Verify root folder ID if specified
            root_id = setting.root_folder_id or drive_service.get_root_folder_id()
            if root_id and root_id.lower() != 'default':
                try:
                    service.files().get(fileId=root_id, fields='id', supportsAllDrives=True).execute()
                except Exception as folder_err:
                    logger.warning(f"Root folder ID '{root_id}' is not accessible by the connected account ({setting.connected_email}): {folder_err}")

            # Refresh storage quota details
            quota_res = service.about().get(fields='storageQuota').execute()
            quota = quota_res.get('storageQuota', {})
            setting.storage_usage = int(quota.get('usage', 0))
            setting.storage_limit = int(quota.get('limit', 0))
            setting.connection_status = 'Connected'
            setting.last_connection_time = timezone.now()
            setting.save()

            log_activity(request.user, "Tested Google Drive OAuth connection status: Success", "drive")
            
            print("\n" + "=" * 70)
            print(" [GOOGLE DRIVE SUCCESS] Connection Test Succeeded!")
            print(f"  Connected Email   : {setting.connected_email}")
            print(f"  Connection Status : Connected")
            print(f"  Storage Limit     : {setting.storage_limit} bytes")
            print("=" * 70 + "\n")

            return Response({"detail": "Google Drive connection test succeeded! Tokens and storage access verified successfully."})
        except Exception as e:
            logger.error(f"Google Drive test connection failed: {e}", exc_info=True)
            setting.connection_status = 'Refresh Failed'
            setting.save()
            print("\n" + "=" * 70)
            print(f" [GOOGLE DRIVE ERROR] Connection Test Failed: {e}")
            print("=" * 70 + "\n")
            return Response(
                {"detail": f"Google Drive connection test failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['patch'], url_path='update-root-folder')
    def update_root_folder(self, request):
        root_folder_id = request.data.get('root_folder_id')
        if root_folder_id is None:
            return Response({"detail": "root_folder_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Clean folder ID from full URL if pasted as a link
        root_folder_id = root_folder_id.strip()
        if 'drive.google.com' in root_folder_id:
            import re
            match = re.search(r'folders/([a-zA-Z0-9_-]+)', root_folder_id)
            if match:
                root_folder_id = match.group(1)

        setting = GoogleDriveSetting.objects.filter(is_active=True).first()
        if not setting:
            setting = GoogleDriveSetting.objects.first()
        if not setting:
            return Response({"detail": "No active Google Drive connection found to update"}, status=status.HTTP_400_BAD_REQUEST)

        setting.root_folder_id = root_folder_id
        setting.save()

        log_activity(request.user, f"Updated Google Drive root folder ID to: {root_folder_id}", "drive")
        return Response({
            "detail": "Root folder ID updated successfully",
            "root_folder_id": setting.root_folder_id
        })
