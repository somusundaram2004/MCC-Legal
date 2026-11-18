import os
import sys

# Ensure backend root is current working directory and in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from waitress import serve
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
application = get_wsgi_application()

if __name__ == '__main__':
    host = '127.0.0.1'
    port = 8000
    print(f"Starting robust Waitress WSGI server on http://{host}:{port} with 8 threads...", flush=True)
    serve(
        application,
        host=host,
        port=port,
        threads=8,
        channel_timeout=120,
        cleanup_interval=30,
        connection_limit=200
    )
