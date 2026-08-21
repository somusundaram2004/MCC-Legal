import os
import sys
from waitress import serve
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
application = get_wsgi_application()

if __name__ == '__main__':
    host = '127.0.0.1'
    port = 8000
    print(f"Starting robust Waitress WSGI server on http://{host}:{port} with 8 threads...")
    serve(
        application,
        host=host,
        port=port,
        threads=8,
        channel_timeout=120,
        cleanup_interval=30,
        connection_limit=200
    )
