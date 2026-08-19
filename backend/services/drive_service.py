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

PREDEFINED_MODULES = [
    {'id': 'mou_repository', 'name': 'MOU Repository', 'type': 'system'},
    {'id': 'legal_cases', 'name': 'Legal Cases', 'type': 'system'},
    {'id': 'agreements', 'name': 'Agreements', 'type': 'system'},
    {'id': 'legal_notices', 'name': 'Legal Notices', 'type': 'system'},
    {'id': 'compliance', 'name': 'Compliance', 'type': 'system'},
    {'id': 'templates', 'name': 'Templates', 'type': 'system'},
    {'id': 'administrative_documents', 'name': 'Administrative Documents', 'type': 'system'},
    {'id': 'recycle_bin', 'name': 'Recycle Bin', 'type': 'system'},
]

def get_predefined_modules():
    return PREDEFINED_MODULES

def get_or_create_predefined_module_folder_id(module_id_or_name):
    """
    Retrieves or creates a dedicated Google Drive folder for any predefined system module
    directly under the Application Root folder on Google Drive.
    """
    if not module_id_or_name:
        return get_root_folder_id()
    
    mod_id = str(module_id_or_name).strip().lower()
    name_map = {m['id']: m['name'] for m in PREDEFINED_MODULES}
    module_name = name_map.get(mod_id, module_id_or_name)

    if mod_id == 'mou_repository':
        return get_or_create_mou_repository_folder_id()
    if mod_id == 'recycle_bin':
        return get_or_create_recycle_bin_folder_id()

    try:
        master_root_id = get_root_folder_id()
        if not master_root_id:
            return None
        service = authenticate()
        safe_name = module_name.replace("'", "\\'")
        query = f"name = '{safe_name}' and '{master_root_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        results = service.files().list(
            q=query,
            fields="files(id, name)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        files = results.get('files', [])
        if files:
            return files[0]['id']
        
        return create_folder(module_name, master_root_id)
    except Exception as e:
        logger.error(f"Failed to get or create predefined module folder '{module_name}' on Google Drive: {e}")
        return get_root_folder_id()

def get_or_create_mou_repository_folder_id():
    """
    Retrieves or creates a dedicated 'MOU Repository' folder directly under the Application Root folder on Google Drive.
    """
    try:
        master_root_id = get_root_folder_id()
        if not master_root_id:
            return None
        service = authenticate()
        query = f"name = 'MOU Repository' and '{master_root_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        results = service.files().list(
            q=query,
            fields="files(id, name)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        files = results.get('files', [])
        if files:
            return files[0]['id']
        
        # Create 'MOU Repository' folder under Application Root if not present
        return create_folder('MOU Repository', master_root_id)
    except Exception as e:
        logger.error(f"Failed to get or create MOU Repository folder on Google Drive: {e}")
        return get_root_folder_id()

def get_or_create_recycle_bin_folder_id():
    """
    Retrieves or creates a dedicated 'Recycle Bin' folder on Google Drive.
    """
    try:
        master_root_id = get_root_folder_id()
        if not master_root_id:
            return None
        service = authenticate()
        query = f"name = 'Recycle Bin' and '{master_root_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        results = service.files().list(
            q=query,
            fields="files(id, name)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        files = results.get('files', [])
        if files:
            return files[0]['id']
        
        # Create 'Recycle Bin' folder on Google Drive if not present
        return create_folder('Recycle Bin', master_root_id)
    except Exception as e:
        logger.error(f"Failed to get or create Recycle Bin folder on Google Drive: {e}")
        return get_root_folder_id()

def get_or_create_module_folder_id(custom_page):
    """
    Retrieves or creates a dedicated Google Drive folder for a custom dynamic page module directly under Application Root.
    Updates the CustomDynamicPage instance and binds its root_folder model record.
    """
    if not custom_page:
        return get_root_folder_id()
    try:
        master_root_id = get_root_folder_id()
        if not master_root_id:
            return None
        
        service = authenticate()
        
        # 1. Check if custom_page has an existing valid folder ID on Google Drive
        if custom_page.google_drive_folder_id and custom_page.google_drive_folder_id.strip() != master_root_id.strip():
            try:
                f_meta = service.files().get(
                    fileId=custom_page.google_drive_folder_id.strip(),
                    fields="id, name, trashed, parents",
                    supportsAllDrives=True
                ).execute()
                if f_meta and not f_meta.get('trashed', False):
                    return f_meta['id']
            except Exception:
                pass
        
        # 2. Search for existing folder named page.title under master_root_id
        safe_title = custom_page.title.replace("'", "\\'")
        query = f"name = '{safe_title}' and '{master_root_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        results = service.files().list(
            q=query,
            fields="files(id, name)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True
        ).execute()
        files = results.get('files', [])
        if files:
            drive_id = files[0]['id']
        else:
            # 3. Create folder under APPLICATION ROOT
            drive_id = create_folder(custom_page.title, master_root_id)

        if drive_id:
            custom_page.google_drive_folder_id = drive_id
            custom_page.save(update_fields=['google_drive_folder_id'])
            
            # Sync root_folder model binding
            from folders.models import Folder
            root_folder = None
            if custom_page.root_folder_id:
                try:
                    root_folder = Folder.objects.filter(id=int(custom_page.root_folder_id)).first()
                except (ValueError, TypeError):
                    root_folder = None
            if not root_folder:
                root_folder = Folder.objects.filter(google_folder_id=drive_id).first()
            if not root_folder:
                root_folder = Folder.objects.create(
                    name=custom_page.title,
                    google_folder_id=drive_id,
                    module_type='custom_page',
                    custom_page=custom_page
                )
            if root_folder:
                root_folder.name = custom_page.title
                root_folder.google_folder_id = drive_id
                root_folder.module_type = 'custom_page'
                root_folder.custom_page = custom_page
                root_folder.save(update_fields=['name', 'google_folder_id', 'module_type', 'custom_page'])

                if str(custom_page.root_folder_id) != str(root_folder.id) or custom_page.root_folder_name != root_folder.name:
                    custom_page.root_folder_id = str(root_folder.id)
                    custom_page.root_folder_name = root_folder.name
                    custom_page.save(update_fields=['root_folder_id', 'root_folder_name'])
        
        return drive_id or master_root_id
    except Exception as e:
        logger.error(f"Failed to get or create module folder on Google Drive for '{custom_page.title}': {e}")
        return get_root_folder_id()

def sync_and_organize_drive_hierarchy():
    """
    Verifies that all subfolders and files on Google Drive are located inside their proper parent/module folder,
    and moves any misplaced items from Application Root into their correct module Google Drive folder.
    """
    try:
        master_root_id = get_root_folder_id()
        if not master_root_id:
            return False

        mou_root_id = get_or_create_mou_repository_folder_id()
        service = authenticate()

        from folders.models import Folder
        from files.models import File

        bin_drive_id = get_or_create_recycle_bin_folder_id()

        # 1. Organize Folders (active & soft-deleted)
        folders = Folder.objects.all()
        for f in folders:
            if not f.google_folder_id or f.google_folder_id.startswith('drive_folder_'):
                continue
            
            if f.is_deleted:
                # Soft-deleted folders belong in Google Drive Recycle Bin folder
                target_parent_id = bin_drive_id
            elif f.name.strip().lower() == 'recycle bin' or f.module_type == 'recycle_bin':
                # System Recycle Bin folder belongs directly under APPLICATION_ROOT
                target_parent_id = master_root_id
            elif f.parent:
                target_parent_id = f.parent.google_folder_id
                if not target_parent_id or target_parent_id.strip() == master_root_id.strip():
                    if f.custom_page:
                        target_parent_id = get_or_create_module_folder_id(f.custom_page)
                    elif f.module_type == 'mou_repository':
                        target_parent_id = mou_root_id
            elif f.custom_page:
                target_parent_id = get_or_create_module_folder_id(f.custom_page)
            elif f.module_type == 'mou_repository':
                target_parent_id = mou_root_id


            if not target_parent_id or target_parent_id == f.google_folder_id:
                continue

            # Check item's current parents on Google Drive
            try:
                meta = service.files().get(
                    fileId=f.google_folder_id,
                    fields='id, name, parents',
                    supportsAllDrives=True
                ).execute()
                current_parents = meta.get('parents', [])
                if target_parent_id not in current_parents:
                    logger.info(f"Moving folder '{f.name}' ({f.google_folder_id}) on Google Drive to parent '{target_parent_id}'...")
                    move_file(f.google_folder_id, target_parent_id)
            except Exception as item_err:
                logger.debug(f"Drive parent check skipped for folder '{f.name}': {item_err}")

        # 2. Organize Files
        files = File.objects.filter(is_deleted=False)
        for fi in files:
            if not fi.google_file_id or fi.google_file_id.startswith('drive_file_') or not fi.folder:
                continue

            target_parent_id = fi.folder.google_folder_id
            if not target_parent_id or target_parent_id.strip() == master_root_id.strip():
                if fi.folder.custom_page:
                    target_parent_id = get_or_create_module_folder_id(fi.folder.custom_page)
                elif fi.folder.module_type == 'mou_repository':
                    target_parent_id = mou_root_id

            if not target_parent_id:
                continue

            try:
                meta = service.files().get(
                    fileId=fi.google_file_id,
                    fields='id, name, parents',
                    supportsAllDrives=True
                ).execute()
                current_parents = meta.get('parents', [])
                if target_parent_id not in current_parents:
                    logger.info(f"Moving file '{fi.name}' ({fi.google_file_id}) on Google Drive to parent '{target_parent_id}'...")
                    move_file(fi.google_file_id, target_parent_id)
            except Exception as item_err:
                logger.debug(f"Drive parent check skipped for file '{fi.name}': {item_err}")

        # 3. Organize Module Folders (CustomDynamicPage)
        from users.models import CustomDynamicPage
        pages = CustomDynamicPage.objects.all()
        for page in pages:
            drive_id = page.google_drive_folder_id
            if not drive_id or drive_id.startswith('drive_folder_'):
                continue
            
            if not page.is_enabled or not page.is_published:
                target_parent_id = bin_drive_id
            else:
                target_parent_id = master_root_id

            if not target_parent_id or target_parent_id == drive_id:
                continue

            try:
                meta = service.files().get(
                    fileId=drive_id,
                    fields='id, name, parents',
                    supportsAllDrives=True
                ).execute()
                current_parents = meta.get('parents', [])
                if target_parent_id not in current_parents:
                    logger.info(f"Moving module folder '{page.title}' ({drive_id}) on Google Drive to parent '{target_parent_id}'...")
                    move_file(drive_id, target_parent_id)
            except Exception as item_err:
                logger.debug(f"Drive parent check skipped for module '{page.title}': {item_err}")

        return True
    except Exception as e:
        logger.error(f"Failed to organize Google Drive hierarchy: {e}")
        return False


def initialize_and_sync_all_drive_modules(new_root_id=None):
    """
    Verifies and initializes all system modules under the Application Root folder:
    - APPLICATION ROOT -> MOU Repository
    - APPLICATION ROOT -> Recycle Bin
    - APPLICATION ROOT -> All Custom Dynamic Page Modules
    - Organizes all existing subfolders/files on Google Drive inside their correct module folder
    """
    try:
        mou_id = get_or_create_mou_repository_folder_id()
        bin_id = get_or_create_recycle_bin_folder_id()
        
        from users.models import CustomDynamicPage
        active_pages = CustomDynamicPage.objects.filter(is_enabled=True)
        for page in active_pages:
            get_or_create_module_folder_id(page)
            
        sync_and_organize_drive_hierarchy()
        logger.info("Successfully initialized Google Drive module root architecture under Application Root.")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Google Drive module architecture: {e}")
        return False


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
    If a folder with the same name already exists in target_parent, returns its ID without creating a duplicate.
    """
    target_parent = parent_id
    if not target_parent:
        target_parent = get_root_folder_id()
    try:
        service = authenticate()

        # Check if folder with exact name already exists in target_parent to prevent duplicate creation
        if target_parent and target_parent != 'root':
            try:
                safe_name = name.replace("'", "\\'")
                query = f"name = '{safe_name}' and '{target_parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
                search_results = service.files().list(
                    q=query,
                    fields="files(id, name)",
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True
                ).execute()
                existing_files = search_results.get('files', [])
                if existing_files:
                    existing_id = existing_files[0].get('id')
                    logger.info(f"Reusing existing Google Drive folder '{name}' (ID: {existing_id}) to prevent duplicate folder creation.")
                    return existing_id
            except Exception as search_err:
                logger.debug(f"Pre-creation search for existing folder '{name}' skipped: {search_err}")

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
    if not file_id or file_id.startswith('drive_file_') or file_id.startswith('drive_folder_'):
        logger.warning(f"Skipping rename for fallback or empty Google Drive ID: '{file_id}'")
        return None
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
    if not file_id or file_id.startswith('drive_file_') or file_id.startswith('drive_folder_'):
        logger.warning(f"Skipping move for fallback or empty Google Drive ID: '{file_id}'")
        return None
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

def browse_drive_folder(folder_id=None):
    """
    Lists immediate subfolders and files inside a Google Drive folder for frontend browsing.
    If folder_id is None, empty, or 'root', defaults to master application root ID if configured, or 'root' (My Drive).
    """
    master_root_id = get_root_folder_id()
    
    clean_id = folder_id.strip() if (folder_id and isinstance(folder_id, str)) else None

    if not clean_id or clean_id.lower() in ['root', 'app_root', 'my_drive']:
        target_id = master_root_id if master_root_id else 'root'
    else:
        target_id = clean_id

    service = authenticate()
    
    current_name = 'Application Root' if (master_root_id and target_id == master_root_id) else ('My Drive' if target_id == 'root' else 'Google Drive Folder')
    current_meta = {'id': target_id, 'name': current_name, 'parents': []}

    if target_id not in ['root', master_root_id]:
        try:
            m = service.files().get(fileId=target_id, fields='id, name, parents', supportsAllDrives=True).execute()
            current_meta = {'id': m.get('id'), 'name': m.get('name', 'Google Drive Folder'), 'parents': m.get('parents', [])}
        except Exception as err:
            logger.warning(f"Could not fetch metadata for folder '{target_id}': {err}")

    query = f"'{target_id}' in parents and trashed = false"
    try:
        results = service.files().list(
            q=query,
            fields="files(id, name, mimeType, size, webViewLink, webContentLink)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            pageSize=200
        ).execute()
    except Exception as err:
        logger.error(f"Failed to list Google Drive contents for '{target_id}': {err}")
        # Fallback to 'root' if specific target_id fails or is invalid
        if target_id != 'root':
            target_id = 'root'
            current_meta = {'id': 'root', 'name': 'My Drive', 'parents': []}
            results = service.files().list(
                q="'root' in parents and trashed = false",
                fields="files(id, name, mimeType, size, webViewLink, webContentLink)",
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
                pageSize=200
            ).execute()
        else:
            raise

    raw_files = results.get('files', [])
    items = []
    for f in raw_files:
        is_folder = (f.get('mimeType') == 'application/vnd.google-apps.folder')
        items.append({
            'id': f.get('id'),
            'name': f.get('name'),
            'mimeType': f.get('mimeType'),
            'is_folder': is_folder,
            'size': int(f.get('size', 0)) if f.get('size') else 0,
            'webViewLink': f.get('webViewLink'),
            'webContentLink': f.get('webContentLink')
        })

    items.sort(key=lambda x: (not x['is_folder'], x['name'].lower()))

    return {
        'current_folder': current_meta,
        'root_folder_id': master_root_id or 'root',
        'items': items
    }

def scan_google_drive_folder_tree(source_drive_folder_id):
    """
    Recursively scans a source Google Drive folder tree for Import Preview.
    """
    if not source_drive_folder_id:
        raise ValueError("source_drive_folder_id is required.")

    service = authenticate()
    
    source_meta = service.files().get(
        fileId=source_drive_folder_id,
        fields='id, name, mimeType',
        supportsAllDrives=True
    ).execute()
    
    root_name = source_meta.get('name', 'Google Drive Folder')
    folders_set = set()
    file_list = []
    
    def walk_drive_folder(current_folder_id, current_rel_path):
        query = f"'{current_folder_id}' in parents and trashed = false"
        results = service.files().list(
            q=query,
            fields="files(id, name, mimeType, size)",
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
            pageSize=500
        ).execute()

        for item in results.get('files', []):
            item_name = item.get('name', 'unnamed')
            item_rel_path = f"{current_rel_path}/{item_name}" if current_rel_path else item_name
            is_dir = (item.get('mimeType') == 'application/vnd.google-apps.folder')

            if is_dir:
                folders_set.add(item_rel_path)
                walk_drive_folder(item.get('id'), item_rel_path)
            else:
                f_size = int(item.get('size', 0)) if item.get('size') else 0
                file_list.append({
                    'id': item.get('id'),
                    'name': item_name,
                    'path': item_rel_path,
                    'size': f_size,
                    'mimeType': item.get('mimeType', '')
                })

    walk_drive_folder(source_drive_folder_id, root_name)

    total_size = sum(f['size'] for f in file_list)
    return {
        'filename': root_name,
        'is_drive_import': True,
        'total_folders': len(folders_set),
        'total_files': len(file_list),
        'total_size': total_size,
        'folder_paths': sorted(list(folders_set)),
        'file_list': file_list
    }

def copy_google_drive_file(source_file_id, target_file_name, target_parent_drive_id):
    """
    Copies a single file on Google Drive natively via service.files().copy() without downloading binary content.
    """
    try:
        service = authenticate()
        body = {
            'name': target_file_name,
            'parents': [target_parent_drive_id]
        }
        res = service.files().copy(
            fileId=source_file_id,
            body=body,
            fields='id, name, mimeType, size, webViewLink, webContentLink',
            supportsAllDrives=True
        ).execute()
        return {
            'id': res.get('id'),
            'name': res.get('name'),
            'mimeType': res.get('mimeType'),
            'size': int(res.get('size', 0)) if res.get('size') else 0,
            'webViewLink': res.get('webViewLink'),
            'webContentLink': res.get('webContentLink')
        }
    except Exception as e:
        logger.warning(f"Native Google Drive copy failed for file '{source_file_id}' -> fallback to download/upload: {e}")
        file_bytes = download_file(source_file_id)
        meta = get_metadata(source_file_id)
        mtype = meta.get('mimeType') or 'application/octet-stream'
        return upload_file(file_bytes, target_file_name, mtype, target_parent_drive_id)

def validate_drive_hierarchy():
    """
    Validates that all top-level system modules and dynamic custom page module folders
    are located directly under APPLICATION ROOT.
    """
    master_root_id = get_root_folder_id()
    if not master_root_id:
        return []

    service = authenticate()
    statuses = []

    for mod in PREDEFINED_MODULES:
        mod_id = mod['id']
        mod_name = mod['name']
        drive_folder_id = get_or_create_predefined_module_folder_id(mod_id)

        status_label = 'Connected'
        actual_parent = None

        if drive_folder_id and not drive_folder_id.startswith('drive_folder_'):
            try:
                meta = service.files().get(
                    fileId=drive_folder_id,
                    fields='id, name, parents, trashed',
                    supportsAllDrives=True
                ).execute()
                parents = meta.get('parents', [])
                if parents:
                    actual_parent = parents[0]
                if meta.get('trashed'):
                    status_label = 'Trashed'
                elif master_root_id not in parents:
                    status_label = 'Incorrect Location'
            except Exception as err:
                logger.error(f"Error validating folder for module '{mod_name}': {err}")
                status_label = 'Access Error'
        else:
            status_label = 'Local Fallback'

        statuses.append({
            'module_id': mod_id,
            'module_name': mod_name,
            'type': 'system',
            'drive_folder_id': drive_folder_id,
            'expected_parent_id': master_root_id,
            'actual_parent_id': actual_parent,
            'status': status_label
        })

    from users.models import CustomDynamicPage
    pages = CustomDynamicPage.objects.filter(is_published=True, is_enabled=True)
    for cp in pages:
        drive_folder_id = get_or_create_module_folder_id(cp)
        status_label = 'Connected'
        actual_parent = None

        if drive_folder_id and not drive_folder_id.startswith('drive_folder_'):
            try:
                meta = service.files().get(
                    fileId=drive_folder_id,
                    fields='id, name, parents, trashed',
                    supportsAllDrives=True
                ).execute()
                parents = meta.get('parents', [])
                if parents:
                    actual_parent = parents[0]
                if meta.get('trashed'):
                    status_label = 'Trashed'
                elif master_root_id not in parents:
                    status_label = 'Incorrect Location'
            except Exception as err:
                status_label = 'Access Error'
        else:
            status_label = 'Local Fallback'

        statuses.append({
            'module_id': f"custom_{cp.id}",
            'module_name': cp.title,
            'type': 'custom_page',
            'drive_folder_id': drive_folder_id,
            'expected_parent_id': master_root_id,
            'actual_parent_id': actual_parent,
            'status': status_label
        })

    return statuses

def repair_module_drive_parent(module_id):
    """
    Safely moves a misplaced module folder back directly under APPLICATION ROOT.
    """
    master_root_id = get_root_folder_id()
    if not master_root_id:
        return False, "APPLICATION ROOT is not configured."

    drive_folder_id = None
    module_name = str(module_id)

    if str(module_id).startswith('custom_') or str(module_id).startswith('module_custom_'):
        cp_id = str(module_id).replace('module_custom_', '').replace('custom_', '')
        from users.models import CustomDynamicPage
        cp = CustomDynamicPage.objects.filter(id=cp_id).first()
        if cp:
            drive_folder_id = get_or_create_module_folder_id(cp)
            module_name = cp.title
    else:
        drive_folder_id = get_or_create_predefined_module_folder_id(module_id)

    if not drive_folder_id or drive_folder_id.startswith('drive_folder_'):
        return False, f"Module '{module_name}' does not have a valid Google Drive folder."

    try:
        move_file(drive_folder_id, master_root_id)
        logger.info(f"Successfully repaired Google Drive parent for module '{module_name}' (ID: {drive_folder_id}) -> moved to APPLICATION ROOT ({master_root_id})")
        return True, f"Successfully moved module folder '{module_name}' to APPLICATION ROOT."
    except Exception as e:
        logger.error(f"Failed to repair module folder parent for '{module_name}': {e}")
        return False, str(e)
