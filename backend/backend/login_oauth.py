import os
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def get_google_login_credentials():
    """
    Loads Google Login OAuth 2.0 Credentials ONLY from login_credentials.json / login_crendels.json.
    Completely isolated from Google Drive settings.
    """
    possible_files = ['login_credentials.json', 'login_crendels.json']
    client_id = ''
    client_secret = ''
    
    for filename in possible_files:
        path = os.path.join(settings.BASE_DIR, filename)
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    web_data = data.get('web') or data.get('installed') or {}
                    client_id = web_data.get('client_id', '')
                    client_secret = web_data.get('client_secret', '')
                    if client_id and client_secret:
                        logger.info(f"Loaded Google Login OAuth credentials from {filename}")
                        break
            except Exception as e:
                logger.error(f"Failed to load {filename}: {e}")

    # Fallback to settings / env variables
    if not client_id:
        client_id = getattr(settings, 'GOOGLE_LOGIN_CLIENT_ID', '') or os.environ.get('GOOGLE_LOGIN_CLIENT_ID', '')
    if not client_secret:
        client_secret = getattr(settings, 'GOOGLE_LOGIN_CLIENT_SECRET', '') or os.environ.get('GOOGLE_LOGIN_CLIENT_SECRET', '')

    return client_id, client_secret
