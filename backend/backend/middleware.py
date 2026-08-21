import threading
from django.utils import timezone
from datetime import date as original_date
from django.utils.dateparse import parse_datetime

# Thread local to store simulated time
_thread_locals = threading.local()

def get_simulated_time():
    return getattr(_thread_locals, 'simulated_time', None)

def set_simulated_time(dt):
    _thread_locals.simulated_time = dt

def clear_simulated_time():
    if hasattr(_thread_locals, 'simulated_time'):
        delattr(_thread_locals, 'simulated_time')

# Monkeypatch django.utils.timezone.now
_original_timezone_now = timezone.now

def custom_timezone_now():
    simulated = get_simulated_time()
    if simulated:
        return simulated
    return _original_timezone_now()

timezone.now = custom_timezone_now

# Custom date class to override date.today
class SimulatedDate(original_date):
    @classmethod
    def today(cls):
        simulated = get_simulated_time()
        if simulated:
            return simulated.date()
        return original_date.today()

# Monkeypatch imported date in target modules
import mous.views
import mous.models

mous.views.date = SimulatedDate
mous.models.date = SimulatedDate

def check_mou_expiries():
    # Make sure we import at run-time to avoid circular imports
    from mous.models import MOU
    from django.contrib.auth import get_user_model
    from notifications.models import Notification
    from notifications.utils import create_notification

    current_dt = timezone.now()
    current_date = current_dt.date()

    # Find all Active MOUs
    active_mous = MOU.objects.filter(status='Active')
    
    for mou in active_mous:
        if not mou.expiry_date:
            continue
        
        days_rem = (mou.expiry_date - current_date).days
        
        # 1. Handle Expiry
        if days_rem <= 0:
            mou.status = 'Expired'
            mou.save(update_fields=['status'])
            
            # Send Expiry Notification to Admins and the Coordinator
            User = get_user_model()
            recipients = User.objects.filter(role__name__in=["Super Admin", "Admin"])
            if mou.coordinator_email:
                coord = User.objects.filter(email=mou.coordinator_email).first()
                if coord:
                    recipients = recipients | User.objects.filter(pk=coord.pk)
            
            for r in recipients.distinct():
                meta = {"mou_id": mou.id, "type": "expiry_reminder", "days_remaining": 0}
                if not Notification.objects.filter(user=r, metadata__mou_id=mou.id, metadata__type="expiry_reminder", metadata__days_remaining=0).exists():
                    create_notification(
                        user=r,
                        title="MOU Expired",
                        description=f"The agreement for '{mou.title}' has expired on {mou.expiry_date}.",
                        metadata=meta
                    )
            continue

        # 2. Handle Reminder Days: 30, 15, 7, 1
        reminder_days = [30, 15, 7, 1]
        
        for threshold in reminder_days:
            if days_rem <= threshold:
                # Send to Admins and the Coordinator
                User = get_user_model()
                recipients = User.objects.filter(role__name__in=["Super Admin", "Admin"])
                if mou.coordinator_email:
                    coord = User.objects.filter(email=mou.coordinator_email).first()
                    if coord:
                        recipients = recipients | User.objects.filter(pk=coord.pk)
                
                for r in recipients.distinct():
                    meta = {"mou_id": mou.id, "type": "expiry_reminder", "days_remaining": threshold}
                    if not Notification.objects.filter(user=r, metadata__mou_id=mou.id, metadata__type="expiry_reminder", metadata__days_remaining=threshold).exists():
                        create_notification(
                            user=r,
                            title=f"MOU Expiration Warning - {threshold} Day(s) Left",
                            description=f"Warning: The agreement '{mou.title}' will expire in {days_rem} days (on {mou.expiry_date}).",
                            metadata=meta
                        )

class CustomTimeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        custom_time_str = request.headers.get('X-Custom-Time') or request.META.get('HTTP_X_CUSTOM_TIME')
        if custom_time_str:
            parsed_dt = parse_datetime(custom_time_str)
            if parsed_dt:
                if timezone.is_naive(parsed_dt):
                    parsed_dt = timezone.make_aware(parsed_dt, timezone.utc)
                set_simulated_time(parsed_dt)
        
        # Check expiries and send notifications
        try:
            check_mou_expiries()
        except Exception as e:
            # Prevent failures in check_mou_expiries from breaking the app
            print(f"Error checking MOU expiries: {e}")

        try:
            response = self.get_response(request)
            return response
        finally:
            clear_simulated_time()


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Essential security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), camera=(), microphone=()'
        response['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'

        # Content Security Policy (CSP)
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "connect-src 'self' https: http://localhost:8000 http://127.0.0.1:8000 ws://localhost:5173 http://localhost:5173",
            "font-src 'self' data: https:",
            "object-src 'none'",
            "media-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
        response['Content-Security-Policy'] = "; ".join(csp_directives)

        return response
