import os
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def sanitize_secret(client_secret):
    if not client_secret:
        return ''
    client_secret = client_secret.strip()
    if 'GOCSPX-' in client_secret:
        idx = client_secret.find('GOCSPX-')
        sub = client_secret[idx:]
        parts = sub.split('"')[0].split("'")[0].split(',')[0].split('\\')[0].split('}')[0].strip()
        return parts
    return client_secret

def get_google_login_credentials():
    """
    Loads Google Login OAuth 2.0 Credentials.
    Prioritizes active database settings updated via Super Admin UI, then JSON files, then env.
    """
    client_id = ''
    client_secret = ''

    # 1. Check database setting first so Super Admin UI updates immediately apply to Login
    try:
        from users.models import GoogleDriveSetting
        setting = GoogleDriveSetting.objects.filter(is_active=True).first() or GoogleDriveSetting.objects.first()
        if setting:
            if setting.client_id:
                client_id = setting.client_id.strip()
            if setting.client_secret:
                client_secret = sanitize_secret(setting.client_secret)
    except Exception as e:
        logger.debug(f"Could not read DB setting for Google Login: {e}")

    # 2. Check JSON credentials files
    if not client_id or not client_secret:
        possible_files = ['login_credentials.json', 'login_crendels.json', 'credentials.json']
        for filename in possible_files:
            path = os.path.join(settings.BASE_DIR, filename)
            if os.path.exists(path):
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        web_data = data.get('web') or data.get('installed') or {}
                        if not client_id:
                            client_id = web_data.get('client_id', '') or data.get('client_id', '')
                        if not client_secret:
                            client_secret = sanitize_secret(web_data.get('client_secret', ''))
                        if client_id and client_secret:
                            break
                except Exception as e:
                    logger.error(f"Failed to load {filename}: {e}")

    # 3. Fallback to settings / env variables
    if not client_id:
        client_id = (
            getattr(settings, 'GOOGLE_LOGIN_CLIENT_ID', '') or 
            getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '') or 
            getattr(settings, 'GOOGLE_DRIVE_CLIENT_ID', '') or 
            os.environ.get('GOOGLE_LOGIN_CLIENT_ID', '') or 
            os.environ.get('GOOGLE_OAUTH_CLIENT_ID', '') or 
            os.environ.get('GOOGLE_DRIVE_CLIENT_ID', '')
        )
    if not client_secret:
        raw_secret = (
            getattr(settings, 'GOOGLE_LOGIN_CLIENT_SECRET', '') or 
            getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', '') or 
            os.environ.get('GOOGLE_LOGIN_CLIENT_SECRET', '') or 
            os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET', '')
        )
        client_secret = sanitize_secret(raw_secret)

    return client_id, client_secret
