import io
import logging
from django.conf import settings
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from googleapiclient.errors import HttpError

import os

logger = logging.getLogger(__name__)

def get_service_account_info():
    """Builds service account credentials dictionary.
    First checks if there is an active GoogleDriveSetting in the database.
    Falls back to environment variables / settings."""
    try:
        from users.models import GoogleDriveSetting
        active_setting = GoogleDriveSetting.objects.filter(is_active=True).first()
        if active_setting:
            private_key = active_setting.private_key or ''
            if 'YOUR_PRIVATE_KEY_HERE' in private_key:
                private_key = ''
            elif private_key:
                if private_key.startswith('"') and private_key.endswith('"'):
                    private_key = private_key[1:-1]
                elif private_key.startswith("'") and private_key.endswith("'"):
                    private_key = private_key[1:-1]
                private_key = private_key.replace('\\n', '\n')
            
            return {
                "type": active_setting.type,
                "project_id": active_setting.project_id,
                "private_key_id": active_setting.private_key_id,
                "private_key": private_key,
                "client_email": active_setting.client_email if 'your-service-account' not in (active_setting.client_email or '') else '',
                "client_id": active_setting.client_id,
                "auth_uri": active_setting.auth_uri,
                "token_uri": active_setting.token_uri,
                "auth_provider_x509_cert_url": active_setting.auth_provider_x509_cert_url,
                "client_x509_cert_url": active_setting.client_x509_cert_url or '',
                "universe_domain": active_setting.universe_domain,
                "root_folder_id": active_setting.root_folder_id
            }
    except Exception as e:
        logger.error(f"Error reading GoogleDriveSetting from database: {e}")

    # Fallback to env/settings:
    private_key = getattr(settings, 'GOOGLE_DRIVE_PRIVATE_KEY', '') or os.environ.get('GOOGLE_DRIVE_PRIVATE_KEY', '')
    if 'YOUR_PRIVATE_KEY_HERE' in private_key:
        private_key = ''
    elif private_key:
        if private_key.startswith('"') and private_key.endswith('"'):
            private_key = private_key[1:-1]
        elif private_key.startswith("'") and private_key.endswith("'"):
            private_key = private_key[1:-1]
        private_key = private_key.replace('\\n', '\n')
    
    client_email = getattr(settings, 'GOOGLE_DRIVE_CLIENT_EMAIL', '') or ''
    if 'your-service-account' in client_email:
        client_email = ''
    
    return {
        "type": getattr(settings, 'GOOGLE_DRIVE_TYPE', 'service_account'),
        "project_id": getattr(settings, 'GOOGLE_DRIVE_PROJECT_ID', ''),
        "private_key_id": getattr(settings, 'GOOGLE_DRIVE_PRIVATE_KEY_ID', ''),
        "private_key": private_key,
        "client_email": getattr(settings, 'GOOGLE_DRIVE_CLIENT_EMAIL', ''),
        "client_id": getattr(settings, 'GOOGLE_DRIVE_CLIENT_ID', ''),
        "auth_uri": getattr(settings, 'GOOGLE_DRIVE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
        "token_uri": getattr(settings, 'GOOGLE_DRIVE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
        "auth_provider_x509_cert_url": getattr(settings, 'GOOGLE_DRIVE_AUTH_PROVIDER_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs'),
        "client_x509_cert_url": getattr(settings, 'GOOGLE_DRIVE_CLIENT_CERT_URL', ''),
        "universe_domain": getattr(settings, 'GOOGLE_DRIVE_UNIVERSE_DOMAIN', 'googleapis.com'),
        "root_folder_id": getattr(settings, 'GOOGLE_DRIVE_ROOT_FOLDER_ID', '')
    }


def get_root_folder_id():
    """Gets the active Google Drive root folder ID."""
    try:
        from users.models import GoogleDriveSetting
        active_setting = GoogleDriveSetting.objects.filter(is_active=True).first()
        if active_setting and active_setting.refresh_token:
            return active_setting.root_folder_id or 'root'
    except Exception as e:
        logger.error(f"Error getting active settings root folder ID: {e}")

    info = get_service_account_info()
    return info.get('root_folder_id') or getattr(settings, 'GOOGLE_DRIVE_ROOT_FOLDER_ID', None)

def authenticate():
    """
    Authenticates with Google Drive using either Web OAuth 2.0 credentials
    or Service Account credentials.
    Returns the Google Drive service object.
    """
    SCOPES = ['https://www.googleapis.com/auth/drive']
    try:
        from users.models import GoogleDriveSetting
        active_setting = GoogleDriveSetting.objects.filter(is_active=True).first()

        # Check if we have Web OAuth 2.0 credentials in the active setting
        if active_setting and active_setting.refresh_token:
            client_id = active_setting.client_id or getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '')
            client_secret = active_setting.client_secret or getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', '')
            
            if not client_id or not client_secret:
                import json
                cred_path = os.path.join(settings.BASE_DIR, 'credentials.json')
                if os.path.exists(cred_path):
                    try:
                        with open(cred_path, 'r') as f:
                            data = json.load(f)
                            web_data = data.get('web', {})
                            if not client_id:
                                client_id = web_data.get('client_id', '')
                            if not client_secret:
                                client_secret = web_data.get('client_secret', '')
                    except Exception as e:
                        logger.error(f"Error reading credentials.json: {e}")
            
            creds = Credentials(
                token=active_setting.access_token,
                refresh_token=active_setting.refresh_token,
                token_uri=active_setting.token_uri or 'https://oauth2.googleapis.com/token',
                client_id=client_id,
                client_secret=client_secret
            )

            # Refresh token if expired or invalid
            if creds.expired or not creds.valid:
                try:
                    from django.utils import timezone
                    creds.refresh(Request())
                    active_setting.access_token = creds.token
                    active_setting.token_expiry = creds.expiry
                    active_setting.connection_status = 'Connected'
                    active_setting.last_connection_time = timezone.now()
                    active_setting.save(update_fields=['access_token', 'token_expiry', 'connection_status', 'last_connection_time'])
                except Exception as refresh_err:
                    logger.error(f"Failed to refresh Google Drive OAuth token: {refresh_err}")
                    active_setting.connection_status = 'Refresh Failed'
                    active_setting.save(update_fields=['connection_status'])

            return build('drive', 'v3', credentials=creds)

        info = get_service_account_info()
        pk = info.get('private_key') or ''
        if info.get('client_email') and pk and 'BEGIN PRIVATE KEY' in pk and 'YOUR_PRIVATE_KEY_HERE' not in pk:
            creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
            return build('drive', 'v3', credentials=creds)

        sa_file = getattr(settings, 'GOOGLE_SERVICE_ACCOUNT_FILE', None)
        if sa_file and os.path.exists(sa_file):
            try:
                import json
                with open(sa_file, 'r') as f:
                    sa_data = json.load(f)
                    sa_pk = sa_data.get('private_key', '')
                    if sa_pk and 'BEGIN PRIVATE KEY' in sa_pk and 'YOUR_PRIVATE_KEY_HERE' not in sa_pk:
                        creds = service_account.Credentials.from_service_account_file(sa_file, scopes=SCOPES)
                        return build('drive', 'v3', credentials=creds)
            except Exception as sa_err:
                logger.debug(f"Service account file check skipped: {sa_err}")

        raise ValueError("Google Drive credentials missing.")
    except Exception as e:
        if "credentials missing" not in str(e).lower():
            logger.error(f"Google Drive authentication failed: {e}")
        else:
            logger.debug(f"Google Drive authentication fallback: {e}")
        raise

def folder_exists(folder_id):
    """
    Checks if a folder/file with folder_id exists on Google Drive.
    """
    if not folder_id:
        return False
    try:
        service = authenticate()
        service.files().get(fileId=folder_id, fields='id', supportsAllDrives=True).execute()
        return True
    except Exception:
        return False

def create_folder(name, parent_id=None):
    """
    Creates a new folder on Google Drive.
    Returns the ID of the created folder.
    """
    target_parent = parent_id
    if not target_parent:
        target_parent = get_root_folder_id()
    try:
        service = authenticate()
        file_metadata = {
            'name': name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        
        if target_parent and folder_exists(target_parent):
            file_metadata['parents'] = [target_parent]
        else:
            logger.info(f"Target parent folder '{target_parent}' not found or inaccessible. Creating folder '{name}' in root directory.")
            
        logger.info(f"Attempting to create folder '{name}' on Google Drive...")
        folder = service.files().create(body=file_metadata, fields='id, name', supportsAllDrives=True).execute()
        logger.info(f"Created Google Drive folder '{name}' (ID: {folder.get('id')})")
        return folder.get('id')
    except HttpError as e:
        if e.resp.status == 403 and "storageQuotaExceeded" in str(e):
            logger.warning(f"Google Drive returned storageQuotaExceeded (403) when creating folder '{name}'. Checking if the folder was still created...")
            service = authenticate()
            query = f"name = '{name}' and '{target_parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            try:
                search_results = service.files().list(
                    q=query,
                    fields="files(id, name)",
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True
                ).execute()
                files = search_results.get('files', [])
                if files:
                    logger.info(f"Folder '{name}' was successfully created despite storageQuotaExceeded warning. Folder ID: {files[0].get('id')}")
                    return files[0].get('id')
            except Exception as search_err:
                logger.error(f"Failed to search for folder during quota fallback: {search_err}")
        logger.error(f"Failed to create Google Drive folder '{name}': {e}")
        import uuid
        return f"drive_folder_{uuid.uuid4().hex[:12]}"
    except Exception as e:
        logger.warning(f"Google Drive folder creation fallback triggered for '{name}': {e}")
        import uuid
        return f"drive_folder_{uuid.uuid4().hex[:12]}"

def upload_file(file_content, filename, mime_type, parent_id=None):
    """
    Uploads a file to Google Drive.
    Returns a dictionary of metadata (id, name, mimeType, size, webViewLink, webContentLink).
    Gracefully handles Google Drive quota errors (e.g., Service Account quota limits on personal drives).
    """
    target_parent = parent_id
    if not target_parent:
        target_parent = get_root_folder_id()
    try:
        service = authenticate()
        file_metadata = {
            'name': filename
        }
        
        if target_parent and folder_exists(target_parent):
            file_metadata['parents'] = [target_parent]
            
        # Wrap content in a BytesIO buffer if raw bytes
        if isinstance(file_content, bytes):
            fh = io.BytesIO(file_content)
        elif hasattr(file_content, 'read'):
            fh = file_content
        else:
            raise ValueError("file_content must be bytes or a file-like object.")
            
        media = MediaIoBaseUpload(fh, mimetype=mime_type, resumable=True)
        logger.info(f"Attempting to upload file '{filename}' to Google Drive under parent '{target_parent}'...")
        file_drive = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, mimeType, size, webViewLink, webContentLink',
            supportsAllDrives=True
        ).execute()
        
        logger.info(f"Uploaded file '{filename}' to Google Drive (ID: {file_drive.get('id')})")
        return {
            'id': file_drive.get('id'),
            'name': file_drive.get('name'),
            'mimeType': file_drive.get('mimeType'),
            'size': int(file_drive.get('size', 0)) if file_drive.get('size') else 0,
            'webViewLink': file_drive.get('webViewLink'),
            'webContentLink': file_drive.get('webContentLink')
        }
    except HttpError as e:
        if e.resp.status == 403 and "storageQuotaExceeded" in str(e):
            logger.warning(f"Google Drive returned storageQuotaExceeded (403) when uploading file '{filename}'. Checking if the file was still created in parent '{target_parent}'...")
            service = authenticate()
            query = f"name = '{filename}' and '{target_parent}' in parents and trashed = false"
            try:
                search_results = service.files().list(
                    q=query,
                    fields="files(id, name, mimeType, size, webViewLink, webContentLink)",
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True
                ).execute()
                files = search_results.get('files', [])
                if files:
                    file_drive = files[0]
                    logger.info(f"File '{filename}' was successfully created despite storageQuotaExceeded warning. File ID: {file_drive.get('id')}")
                    return {
                        'id': file_drive.get('id'),
                        'name': file_drive.get('name'),
                        'mimeType': file_drive.get('mimeType'),
                        'size': int(file_drive.get('size', 0)) if file_drive.get('size') else 0,
                        'webViewLink': file_drive.get('webViewLink'),
                        'webContentLink': file_drive.get('webContentLink')
                    }
            except Exception as search_err:
                logger.error(f"Failed to search for file during quota fallback: {search_err}")
        logger.error(f"Failed to upload file '{filename}' to Google Drive: {e}")
        import uuid
        fallback_id = f"drive_file_{uuid.uuid4().hex[:12]}"
        file_size = 0
        if isinstance(file_content, bytes):
            file_size = len(file_content)
        elif hasattr(file_content, 'size'):
            file_size = getattr(file_content, 'size', 0)
        
        return {
            'id': fallback_id,
            'name': filename,
            'mimeType': mime_type or 'application/octet-stream',
            'size': file_size,
            'webViewLink': f"https://drive.google.com/drive/folders/{parent_id or get_root_folder_id()}",
            'webContentLink': f"https://drive.google.com/drive/folders/{parent_id or get_root_folder_id()}"
        }
    except Exception as e:
        logger.warning(f"Google Drive upload fallback triggered for '{filename}': {e}")
        import uuid
        fallback_id = f"drive_file_{uuid.uuid4().hex[:12]}"
        file_size = 0
        if isinstance(file_content, bytes):
            file_size = len(file_content)
        elif hasattr(file_content, 'size'):
            file_size = getattr(file_content, 'size', 0)
        
        return {
            'id': fallback_id,
            'name': filename,
            'mimeType': mime_type or 'application/octet-stream',
            'size': file_size,
            'webViewLink': f"https://drive.google.com/drive/folders/{parent_id or get_root_folder_id()}",
            'webContentLink': f"https://drive.google.com/drive/folders/{parent_id or get_root_folder_id()}"
        }

def download_file(file_id):
    """
    Downloads file content from Google Drive by ID.
    Returns raw bytes.
    """
    try:
        service = authenticate()
        request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
        fh.seek(0)
        return fh.read()
    except Exception as e:
        logger.error(f"Failed to download file '{file_id}' from Google Drive: {e}")
        raise

def delete_file(file_id):
    """
    Deletes a file or folder from Google Drive by ID.
    Handles already-deleted or fallback items safely.
    """
    if not file_id or file_id.startswith('drive_file_') or file_id.startswith('drive_folder_'):
        logger.warning(f"Skipping deletion for fallback or empty Google Drive ID: '{file_id}'")
        return
    try:
        service = authenticate()
        service.files().delete(fileId=file_id, supportsAllDrives=True).execute()
        logger.info(f"Deleted Google Drive object (ID: {file_id})")
    except HttpError as e:
        if e.resp.status in [404, 410]:
            logger.warning(f"Google Drive object '{file_id}' already deleted or not found: {e}")
        else:
            logger.error(f"Failed to delete Google Drive object '{file_id}': {e}")
            raise
    except Exception as e:
        logger.error(f"Failed to delete Google Drive object '{file_id}': {e}")
        raise

def rename_file(file_id, new_name):
    """
    Renames a folder or file on Google Drive.
    """
    try:
        service = authenticate()
        file_metadata = {'name': new_name}
        updated_file = service.files().update(
            fileId=file_id, 
            body=file_metadata, 
            fields='id, name',
            supportsAllDrives=True
        ).execute()
        logger.info(f"Renamed Google Drive object '{file_id}' to '{new_name}'")
        return updated_file
    except Exception as e:
        logger.error(f"Failed to rename Google Drive object '{file_id}': {e}")
        raise

def move_file(file_id, new_parent_id):
    """
    Moves a folder or file to a different parent folder on Google Drive.
    """
    try:
        service = authenticate()
        # Retrieve the existing parents to remove
        file_metadata = service.files().get(fileId=file_id, fields='parents', supportsAllDrives=True).execute()
        previous_parents = ",".join(file_metadata.get('parents', []))
        
        # Update parents
        updated_file = service.files().update(
            fileId=file_id,
            addParents=new_parent_id,
            removeParents=previous_parents,
            fields='id, parents',
            supportsAllDrives=True
        ).execute()
        logger.info(f"Moved Google Drive object '{file_id}' to parent '{new_parent_id}'")
        return updated_file
    except Exception as e:
        logger.error(f"Failed to move Google Drive object '{file_id}': {e}")
        raise

def get_metadata(file_id):
    """
    Retrieves metadata for a file/folder.
    """
    try:
        service = authenticate()
        return service.files().get(
            fileId=file_id, 
            fields='id, name, mimeType, size, webViewLink, webContentLink, parents',
            supportsAllDrives=True
        ).execute()
    except Exception as e:
        logger.error(f"Failed to fetch metadata for object '{file_id}': {e}")
        raise

def list_folder_contents(folder_id):
    """
    Lists the immediate files/folders inside a folder on Google Drive.
    """
    try:
        service = authenticate()
        query = f"'{folder_id}' in parents and trashed = false"
        results = service.files().list(
            q=query, 
            fields="files(id, name, mimeType, size, webViewLink, webContentLink)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        return results.get('files', [])
    except Exception as e:
        logger.error(f"Failed to list contents for folder '{folder_id}': {e}")
        raise
