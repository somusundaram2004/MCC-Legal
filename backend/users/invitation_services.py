from django.core import signing
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from .models import UserInvitation, CustomUser
from services.email_service import send_invitation_email
import logging

logger = logging.getLogger(__name__)

class TokenService:
    @staticmethod
    def generate_token(email, stream, department, role_id, expires_at):
        """
        Generates a secure signed invitation token containing metadata.
        """
        data = {
            'email': email,
            'stream': stream,
            'department': department,
            'role_id': role_id,
            'expires_at': expires_at.isoformat()
        }
        return signing.dumps(data)

    @staticmethod
    def verify_token(token):
        """
        Verifies the token signature and returns the payload data.
        """
        if not token:
            return None
        import urllib.parse
        clean_token = str(token).strip().strip('"\'').rstrip('/')
        for candidate in [clean_token, urllib.parse.unquote(clean_token)]:
            try:
                return signing.loads(candidate)
            except Exception:
                pass
        return None

class InvitationService:
    @staticmethod
    def create_invitation(email, stream, department, system_role, created_by):
        """
        Creates a new invitation, generates the token, and sends it via email.
        """
        now = timezone.now()
        # Update existing pending invitation if already active
        existing = UserInvitation.objects.filter(
            email=email,
            is_used=False,
            is_cancelled=False,
            expires_at__gt=now
        ).first()

        # Prevent duplicate active users
        if CustomUser.objects.filter(email=email).exists():
            raise ValueError("A user account with this email address already exists.")

        expires_at = now + timedelta(hours=24)
        token = TokenService.generate_token(email, stream, department, system_role.id, expires_at)

        if existing:
            existing.token = token
            existing.stream = stream
            existing.department = department
            existing.system_role = system_role
            existing.expires_at = expires_at
            existing.created_by = created_by
            existing.save()
            invitation = existing
        else:
            invitation = UserInvitation.objects.create(
                email=email,
                stream=stream,
                department=department,
                system_role=system_role,
                token=token,
                expires_at=expires_at,
                created_by=created_by
            )
        
        # Construct registration URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        invite_url = f"{frontend_url}/register?token={token}"
        
        try:
            send_invitation_email(email, invite_url, expires_at)
            logger.info(f"Invitation created and sent to {email} by {created_by.email}")
        except Exception as e:
            logger.error(f"Failed to send invitation email to {email}: {e}")
            
        return invitation
