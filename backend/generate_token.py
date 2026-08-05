import os
import sys
import json
import logging
import datetime

# Configure UTF-8 encoding for console output
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.conf import settings
from django.utils import timezone
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from users.models import GoogleDriveSetting
from activity_logs.utils import log_activity

SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
]

def generate_google_drive_token():
    print("\n" + "=" * 70)
    print(" GOOGLE DRIVE CREDENTIALS & TOKEN GENERATOR ")
    print("=" * 70 + "\n")

    # Step 1: Locate credentials file
    cred_path = os.path.join(settings.BASE_DIR, 'credentials.json')
    if not os.path.exists(cred_path):
        cred_path = os.path.join(settings.BASE_DIR, 'new credentials.json')

    if not os.path.exists(cred_path):
        print(f"[ERROR] Could not find credentials.json file in {settings.BASE_DIR}")
        return False

    print(f"[INFO] Reading credentials file: {cred_path}")
    with open(cred_path, 'r', encoding='utf-8') as f:
        cred_data = json.load(f)

    # ──────────────────────────────────────────────────────────────────────────
    # CASE A: Service Account Credentials
    # ──────────────────────────────────────────────────────────────────────────
    if cred_data.get('type') == 'service_account':
        print("[INFO] Detected Google Service Account credentials.")
        client_email = cred_data.get('client_email')
        project_id = cred_data.get('project_id')
        private_key = cred_data.get('private_key')
        client_id = cred_data.get('client_id')
        
        print(f"[INFO] Service Account Email: {client_email}")
        print(f"[INFO] Project ID           : {project_id}")

        try:
            scopes = ['https://www.googleapis.com/auth/drive']
            sa_creds = service_account.Credentials.from_service_account_file(
                cred_path, scopes=scopes
            )
            sa_creds.refresh(Request())
            access_token = sa_creds.token
            print("[SUCCESS] Successfully authenticated Service Account & generated Access Token!")
        except Exception as e:
            print(f"[ERROR] Service Account authentication failed: {e}")
            return False

        # Test Drive API call & Quota
        storage_usage = 0
        storage_limit = 0
        try:
            service = build('drive', 'v3', credentials=sa_creds)
            about = service.about().get(fields='user,storageQuota').execute()
            quota_info = about.get('storageQuota', {})
            storage_usage = int(quota_info.get('usage', 0))
            storage_limit = int(quota_info.get('limit', 0)) if quota_info.get('limit') else None
        except Exception as e:
            print(f"[WARNING] Could not fetch storage quota: {e}")

        # Update database
        try:
            setting = GoogleDriveSetting.objects.filter(is_active=True).first()
            if not setting:
                setting = GoogleDriveSetting.objects.first()
            if not setting:
                setting = GoogleDriveSetting()

            setting.type = 'service_account'
            setting.project_id = project_id
            setting.private_key_id = cred_data.get('private_key_id')
            setting.private_key = private_key
            setting.client_email = client_email
            setting.client_id = client_id
            setting.connected_email = client_email
            setting.access_token = access_token
            setting.storage_usage = storage_usage
            setting.storage_limit = storage_limit
            setting.connection_status = 'Connected'
            setting.oauth_connected = True
            setting.is_active = True
            setting.last_connection_time = timezone.now()
            setting.save()

            print("\n" + "=" * 70)
            print(" [SUCCESS] SERVICE ACCOUNT CREDENTIALS SAVED TO DATABASE! ")
            print(f"  Connected Email   : {setting.connected_email}")
            print(f"  Connection Status : {setting.connection_status}")
            print(f"  Access Token      : {access_token[:25]}...")
            print("=" * 70 + "\n")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to save Service Account to database: {e}")
            return False

    # ──────────────────────────────────────────────────────────────────────────
    # CASE B: Web OAuth 2.0 Client Credentials
    # ──────────────────────────────────────────────────────────────────────────
    web_data = cred_data.get('web') or cred_data.get('installed') or {}
    client_id = web_data.get('client_id')
    client_secret = web_data.get('client_secret')
    project_id = web_data.get('project_id', 'Web OAuth Project')

    if not client_id or not client_secret:
        print("[ERROR] Credentials file is neither a valid Service Account nor a Web Client JSON.")
        return False

    print(f"[INFO] Web Client ID: {client_id}")
    try:
        flow = InstalledAppFlow.from_client_secrets_file(
            cred_path,
            scopes=SCOPES,
            redirect_uri='http://localhost:8080/'
        )
        print("\n[INSTRUCTION] Opening browser window for Google Authentication...")
        creds = flow.run_local_server(
            host='localhost',
            port=8080,
            prompt='consent',
            authorization_prompt_message='Please open this URL in your browser: {url}'
        )
    except Exception as e:
        print(f"[ERROR] OAuth authentication flow failed: {e}")
        return False

    if not creds or not creds.valid:
        print("[ERROR] Credentials returned are invalid or expired.")
        return False

    connected_email = 'unknown@google.com'
    storage_usage = 0
    storage_limit = 0

    try:
        service = build('drive', 'v3', credentials=creds)
        about = service.about().get(fields='user,storageQuota').execute()
        user_info = about.get('user', {})
        quota_info = about.get('storageQuota', {})
        connected_email = user_info.get('emailAddress', connected_email)
        storage_usage = int(quota_info.get('usage', 0))
        storage_limit = int(quota_info.get('limit', 0)) if quota_info.get('limit') else None
    except Exception as e:
        print(f"[WARNING] Could not fetch user details: {e}")

    try:
        setting = GoogleDriveSetting.objects.filter(is_active=True).first()
        if not setting:
            setting = GoogleDriveSetting.objects.first()
        if not setting:
            setting = GoogleDriveSetting()

        setting.type = 'web_client'
        setting.client_id = client_id
        setting.client_secret = client_secret
        setting.project_id = project_id
        setting.access_token = creds.token
        setting.refresh_token = creds.refresh_token or setting.refresh_token
        setting.token_expiry = creds.expiry if hasattr(creds, 'expiry') else timezone.now() + datetime.timedelta(hours=1)
        setting.connected_email = connected_email
        setting.storage_usage = storage_usage
        setting.storage_limit = storage_limit
        setting.connection_status = 'Connected'
        setting.oauth_connected = True
        setting.is_active = True
        setting.last_connection_time = timezone.now()
        setting.save()

        print("\n" + "=" * 70)
        print(" [SUCCESS] GOOGLE DRIVE OAUTH TOKEN SAVED TO DATABASE! ")
        print(f"  Connected Email   : {setting.connected_email}")
        print(f"  Connection Status : {setting.connection_status}")
        print("=" * 70 + "\n")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to save OAuth tokens to database: {e}")
        return False

if __name__ == '__main__':
    generate_google_drive_token()
