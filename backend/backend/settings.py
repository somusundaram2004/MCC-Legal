from pathlib import Path
import os
from datetime import timedelta
import psycopg2
import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment variables reader
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ['*'])
)

# Read environment variables
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# Initialize environment variables reader
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ['*'])
)

# Read environment variables
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# Verify required configuration variables
required_vars = [
    'SECRET_KEY',
    'GOOGLE_SERVICE_ACCOUNT_FILE',
    'GOOGLE_DRIVE_ROOT_FOLDER_ID',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
]
for var in required_vars:
    if not env(var, default=None):
        if env.bool('DEBUG', default=True):
            print(f"WARNING: Missing environment variable: {var}")
        else:
            raise ImproperlyConfigured(f"Missing required environment variable: {var}")

SECRET_KEY = env('SECRET_KEY', default='django-insecure-+=t3a@n8j5g#$-rdym+*70zi*_8fvf=r*-jh5fm^u8#-6f%j7o')
DEBUG = env.bool('DEBUG', default=True)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])

# Google Drive API Configuration
GOOGLE_DRIVE_TYPE = env('GOOGLE_DRIVE_TYPE', default='service_account')
GOOGLE_DRIVE_PROJECT_ID = env('GOOGLE_DRIVE_PROJECT_ID', default='')
GOOGLE_DRIVE_PRIVATE_KEY_ID = env('GOOGLE_DRIVE_PRIVATE_KEY_ID', default='')
GOOGLE_DRIVE_PRIVATE_KEY = env('GOOGLE_DRIVE_PRIVATE_KEY', default='')
GOOGLE_DRIVE_CLIENT_EMAIL = env('GOOGLE_DRIVE_CLIENT_EMAIL', default='')
GOOGLE_DRIVE_CLIENT_ID = env('GOOGLE_DRIVE_CLIENT_ID', default='')
GOOGLE_DRIVE_CLIENT_SECRET = env('GOOGLE_DRIVE_CLIENT_SECRET', default='')
GOOGLE_DRIVE_AUTH_URI = env('GOOGLE_DRIVE_AUTH_URI', default='https://accounts.google.com/o/oauth2/auth')
GOOGLE_DRIVE_TOKEN_URI = env('GOOGLE_DRIVE_TOKEN_URI', default='https://oauth2.googleapis.com/token')
GOOGLE_DRIVE_AUTH_PROVIDER_CERT_URL = env('GOOGLE_DRIVE_AUTH_PROVIDER_CERT_URL', default='https://www.googleapis.com/oauth2/v1/certs')
GOOGLE_DRIVE_CLIENT_CERT_URL = env('GOOGLE_DRIVE_CLIENT_CERT_URL', default='')
GOOGLE_DRIVE_UNIVERSE_DOMAIN = env('GOOGLE_DRIVE_UNIVERSE_DOMAIN', default='googleapis.com')
GOOGLE_SERVICE_ACCOUNT_FILE = os.path.join(BASE_DIR, env('GOOGLE_SERVICE_ACCOUNT_FILE', default='credentials/google-drive.json'))
GOOGLE_DRIVE_ROOT_FOLDER_ID = env('GOOGLE_DRIVE_ROOT_FOLDER_ID', default='')

# Dedicated Google Login OAuth Configuration (login_credentials.json)
GOOGLE_LOGIN_CLIENT_ID = env('GOOGLE_LOGIN_CLIENT_ID', default='')
GOOGLE_LOGIN_CLIENT_SECRET = env('GOOGLE_LOGIN_CLIENT_SECRET', default='')

# Google Drive OAuth Web flow Configuration (Unchanged & Isolated)
GOOGLE_OAUTH_CLIENT_ID = env('GOOGLE_OAUTH_CLIENT_ID', default='')
GOOGLE_OAUTH_CLIENT_SECRET = env('GOOGLE_OAUTH_CLIENT_SECRET', default='')
GOOGLE_OAUTH_REDIRECT_URI = env('GOOGLE_OAUTH_REDIRECT_URI', default='http://localhost:5173/settings')

# Upload & File Constraints
MAX_UPLOAD_SIZE = env.int('MAX_UPLOAD_SIZE', default=52428800)
ALLOWED_FILE_TYPES = env.list('ALLOWED_FILE_TYPES', default=['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'])

# Logging configuration
LOG_LEVEL = env('LOG_LEVEL', default='INFO')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third Party Apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    
    # Custom Apps
    'roles',
    'permissions',
    'users',
    'folders',
    'files',
    'notifications',
    'activity_logs',
    'mous',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'backend.middleware.CustomTimeMiddleware',
    'backend.middleware.SecurityHeadersMiddleware',
    'corsheaders.middleware.CorsMiddleware', # CORS Headers Middleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# Database Configuration (PostgreSQL with SQLite fallback)
DB_NAME = env('DB_NAME', default='mou_dashboard')
DB_USER = env('DB_USER', default='postgres')
DB_PASSWORD = env('DB_PASSWORD', default='password')
DB_HOST = env('DB_HOST', default='localhost')
DB_PORT = env('DB_PORT', default='5432')

DATABASES = {}

try:
    # Attempt to connect to PostgreSQL to test configuration
    conn = psycopg2.connect(
        dbname="postgres",
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        connect_timeout=2
    )
    conn.close()
    
    # If connection succeeds, verify/create mou_dashboard database
    conn = psycopg2.connect(
        dbname="postgres",
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}';")
    exists = cursor.fetchone()
    if not exists:
        cursor.execute(f"CREATE DATABASE {DB_NAME};")
    cursor.close()
    conn.close()

    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': DB_NAME,
        'USER': DB_USER,
        'PASSWORD': DB_PASSWORD,
        'HOST': DB_HOST,
        'PORT': DB_PORT,
    }
    print("Database Configured: PostgreSQL database 'mou_dashboard' is ready.")
except Exception as e:
    print(f"PostgreSQL connection failed ({e}). Falling back to SQLite.")
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Auth Model Override
AUTH_USER_MODEL = 'users.CustomUser'

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static & Media Files
STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': env('THROTTLE_RATE_ANON', default='120/minute'),
        'user': env('THROTTLE_RATE_USER', default='600/minute'),
    }
}

# SimpleJWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15), # Increased to 15 mins for smoother development experience
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# CORS Settings
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
])
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOW_CREDENTIALS = True

# Django Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Strict cookie & redirect settings for production environments
if not DEBUG:
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
    SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=31536000) # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True)
    SECURE_HSTS_PRELOAD = env.bool('SECURE_HSTS_PRELOAD', default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Email Configuration
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = env('EMAIL_HOST', default='localhost')
EMAIL_PORT = env('EMAIL_PORT', default=25, cast=int)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = env('EMAIL_USE_TLS', default=False, cast=bool)
EMAIL_USE_SSL = env('EMAIL_USE_SSL', default=False, cast=bool)
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='MCC LEGAL DOCUMENT <no-reply@mcc.edu>')
COMPANY_LOGO_URL = env('COMPANY_LOGO_URL', default='https://example.com/logo.png')
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')

# Google OAuth 2.0 Settings
GOOGLE_OAUTH_CLIENT_ID = env('GOOGLE_OAUTH_CLIENT_ID', default='')
GOOGLE_OAUTH_CLIENT_SECRET = env('GOOGLE_OAUTH_CLIENT_SECRET', default='')
GOOGLE_OAUTH_REDIRECT_URI = env('GOOGLE_OAUTH_REDIRECT_URI', default='http://localhost:8000/api/google-drive/oauth/callback/')

CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8000',
    'http://127.0.0.1:8000',
])
