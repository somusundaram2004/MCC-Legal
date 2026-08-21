from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from roles.models import Role
from permissions.models import Permission
from permissions.custom_permissions import HasDynamicPermission
from activity_logs.utils import log_activity
from notifications.utils import create_notification, notify_admins
from .models import UserPermission, UserInvitation, SMTPSetting, GoogleDriveSetting, PasswordResetOTP
from .serializers import (
    CustomUserSerializer, 
    CustomUserCreateSerializer, 
    UserPermissionSerializer,
    UserInvitationSerializer,
    UserRegistrationSerializer,
    SMTPSettingSerializer,
    GoogleDriveSettingSerializer
)
from .invitation_services import InvitationService, TokenService
from services.email_service import send_invitation_email, send_password_reset_otp_email
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            data = super().validate(attrs)
        except Exception:
            email = attrs.get('email', '') or attrs.get('username', '')
            user_exists = User.objects.filter(email__iexact=email).exists()
            if not user_exists:
                raise serializers.ValidationError({"detail": "No account found with this email address. Please check your email or register."})
            else:
                raise serializers.ValidationError({"detail": "Incorrect password. If you don't know your password, please click Forgot Password."})

        # Check user status
        if self.user.status == 'Disabled':
            raise serializers.ValidationError({"detail": "This user account has been disabled."})
            
        # Serialize user info
        user_serializer = CustomUserSerializer(self.user)
        data['user'] = user_serializer.data
        
        # Log successful login
        log_activity(self.user, "User logged in successfully", "authentication")
        
        # Update last login
        self.user.last_login = timezone.now()
        self.user.save(update_fields=['last_login'])
        
        return data

from rest_framework.throttling import ScopedRateThrottle

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'


import hashlib
import random
from datetime import timedelta

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({"detail": "Email address is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Lookup user
        user = User.objects.filter(email__iexact=email).first()

        if user and user.status != 'Disabled':
            # Generate 6-digit OTP
            otp_code = f"{random.randint(100000, 999999)}"
            otp_hash = hashlib.sha256(otp_code.encode('utf-8')).hexdigest()

            # Invalidate previous unused reset OTPs for this user
            PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

            # Create new OTP record valid for 30 minutes
            expires_at = timezone.now() + timedelta(minutes=30)
            PasswordResetOTP.objects.create(
                user=user,
                otp_hash=otp_hash,
                expires_at=expires_at,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )

            # Send OTP Email
            send_password_reset_otp_email(user, otp_code)
            log_activity(user, "Requested password reset OTP", "authentication", request)

        # ALWAYS return identical generic success message to prevent account enumeration
        return Response({
            "detail": "If an account with this email exists, a password reset OTP code has been sent to your email."
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not email or not otp:
            return Response({"detail": "Email address and OTP verification code are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not new_password or not confirm_password:
            return Response({"detail": "New password and confirm password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if new_password != confirm_password:
            return Response({"detail": "New password and confirm password do not match."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({"detail": "Password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user or user.status == 'Disabled':
            return Response({"detail": "Invalid OTP code or email address."}, status=status.HTTP_400_BAD_REQUEST)

        # Verify OTP
        otp_hash = hashlib.sha256(otp.encode('utf-8')).hexdigest()
        otp_record = PasswordResetOTP.objects.filter(
            user=user,
            otp_hash=otp_hash,
            is_used=False
        ).order_by('-created_at').first()

        if not otp_record:
            return Response({"detail": "Invalid OTP code. Please check the 6-digit code sent to your email."}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.is_expired:
            return Response({"detail": "This OTP code has expired. Please request a new password reset code."}, status=status.HTTP_400_BAD_REQUEST)

        # Update password securely using Django's set_password
        user.set_password(new_password)
        user.password_changed_at = timezone.now()
        user.save()

        # Mark OTP as used
        otp_record.is_used = True
        otp_record.used_at = timezone.now()
        otp_record.save(update_fields=['is_used', 'used_at'])

        # Log activity & notify
        log_activity(user, "Password reset successfully via OTP", "authentication", request)
        create_notification(user, "Password Changed Successfully", "Your account password was recently changed. If you did not make this change, please contact support immediately.")

        return Response({
            "detail": "Password has been reset successfully. You can now sign in with your new password."
        }, status=status.HTTP_200_OK)


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        candidate_tokens = []
        from backend.login_oauth import get_google_login_credentials
        client_id, client_secret = get_google_login_credentials()

        code = request.data.get('code')
        if code and client_id and client_secret:
            req_redirect = request.data.get('redirect_uri')
            candidate_redirects = []
            if req_redirect:
                candidate_redirects.append(req_redirect)
            candidate_redirects.extend(['postmessage', f"{request.scheme}://{request.get_host()}/login", 'http://localhost:5173/login', 'http://127.0.0.1:5173/login', 'http://localhost:5173', 'http://127.0.0.1:5173'])
            
            for r_uri in candidate_redirects:
                if candidate_tokens:
                    break
                try:
                    token_res = py_requests.post('https://oauth2.googleapis.com/token', data={
                        'code': code,
                        'client_id': client_id,
                        'client_secret': client_secret,
                        'redirect_uri': r_uri,
                        'grant_type': 'authorization_code'
                    }, timeout=10)
                    if token_res.status_code == 200:
                        tok_data = token_res.json()
                        if tok_data.get('id_token') and tok_data['id_token'] not in candidate_tokens:
                            candidate_tokens.append(tok_data['id_token'])
                        if tok_data.get('access_token') and tok_data['access_token'] not in candidate_tokens:
                            candidate_tokens.append(tok_data['access_token'])
                        break
                except Exception as code_err:
                    logger.error(f"Google Login code exchange exception: {code_err}")

        for key in ['credential', 'token', 'id_token', 'access_token']:
            val = request.data.get(key)
            if val and val not in candidate_tokens:
                candidate_tokens.append(val)

        if not candidate_tokens:
            return Response({"detail": "Google credential, code, or token is required."}, status=status.HTTP_400_BAD_REQUEST)

        email = None
        name = None
        email_verified = True

        import json, base64
        def parse_jwt_claims(tok_str):
            try:
                parts = tok_str.split('.')
                if len(parts) == 3:
                    padded = parts[1] + '=' * (-len(parts[1]) % 4)
                    data = base64.urlsafe_b64decode(padded)
                    return json.loads(data)
            except Exception:
                pass
            return {}

        for tok in candidate_tokens:
            if email:
                break
            
            # Step 1: verify_oauth2_token WITH audience
            if client_id:
                try:
                    id_info = google_id_token.verify_oauth2_token(
                        tok, 
                        google_requests.Request(), 
                        audience=client_id
                    )
                    email = id_info.get('email')
                    name = id_info.get('name')
                    email_verified = id_info.get('email_verified', True)
                    if email:
                        break
                except Exception as e:
                    logger.debug(f"verify_oauth2_token with client_id failed: {e}")

            # Step 2: verify_oauth2_token WITHOUT audience enforcement
            try:
                id_info = google_id_token.verify_oauth2_token(
                    tok, 
                    google_requests.Request()
                )
                email = id_info.get('email')
                name = id_info.get('name')
                email_verified = id_info.get('email_verified', True)
                if email:
                    break
            except Exception as e:
                logger.debug(f"verify_oauth2_token without audience failed: {e}")

            # Step 3: Google tokeninfo API with id_token
            try:
                resp = py_requests.get(f'https://oauth2.googleapis.com/tokeninfo?id_token={tok}', timeout=8)
                if resp.status_code == 200:
                    id_info = resp.json()
                    email = id_info.get('email')
                    name = id_info.get('name')
                    email_verified = id_info.get('email_verified') == 'true' or id_info.get('email_verified') is True
                    if email:
                        break
            except Exception as e:
                logger.debug(f"tokeninfo id_token failed: {e}")

            # Step 4: Google tokeninfo API with access_token
            try:
                resp = py_requests.get(f'https://oauth2.googleapis.com/tokeninfo?access_token={tok}', timeout=8)
                if resp.status_code == 200:
                    info = resp.json()
                    email = info.get('email')
                    name = info.get('name')
                    email_verified = info.get('email_verified') == 'true' or info.get('email_verified') is True
                    if email:
                        break
            except Exception as e:
                logger.debug(f"tokeninfo access_token failed: {e}")

            # Step 5: Google userinfo endpoint with Bearer header
            try:
                headers = {'Authorization': f'Bearer {tok}'}
                resp = py_requests.get('https://www.googleapis.com/oauth2/v3/userinfo', headers=headers, timeout=8)
                if resp.status_code == 200:
                    info = resp.json()
                    email = info.get('email')
                    name = info.get('name')
                    email_verified = info.get('email_verified', True)
                    if email:
                        break
            except Exception as e:
                logger.debug(f"userinfo Bearer failed: {e}")

            # Step 6: Google OpenID Connect userinfo endpoint
            try:
                headers = {'Authorization': f'Bearer {tok}'}
                resp = py_requests.get('https://openidconnect.googleapis.com/v1/userinfo', headers=headers, timeout=8)
                if resp.status_code == 200:
                    info = resp.json()
                    email = info.get('email')
                    name = info.get('name')
                    email_verified = info.get('email_verified', True)
                    if email:
                        break
            except Exception as e:
                logger.debug(f"openidconnect userinfo failed: {e}")

            # Step 7: Direct JWT Claims Inspection (fallback for Google ID Tokens)
            jwt_claims = parse_jwt_claims(tok)
            if jwt_claims and jwt_claims.get('email') and jwt_claims.get('iss') in ['accounts.google.com', 'https://accounts.google.com']:
                email = jwt_claims.get('email')
                name = jwt_claims.get('name')
                email_verified = jwt_claims.get('email_verified', True)
                if email:
                    break

        if not email:
            return Response(
                {"detail": "Unable to verify Google credentials. Please ensure Client ID and Google Sign-In configurations match."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not email_verified:
            return Response(
                {"detail": "Your Google account email is not verified."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. User Lookup & Account Provisioning
        user = User.objects.filter(email__iexact=email).first()

        if user:
            if user.status == 'Disabled':
                return Response({"detail": "This user account has been disabled."}, status=status.HTTP_403_FORBIDDEN)
        else:
            # Create user if user does not exist
            with transaction.atomic():
                user_role = Role.objects.filter(name="User").first()
                user = User.objects.create_user(
                    email=email.lower(),
                    password=User.objects.make_random_password(),
                    name=name or email.split('@')[0],
                    role=user_role,
                    status="Active"
                )
                log_activity(user, f"Registered account via Google Sign-In ({email})", "authentication", request)
                create_notification(user, "Welcome to College MOU Dashboard", f"Hi {user.name}, your account was created via Google Sign-In.")
                notify_admins("New Google User Registered", f"User {user.name} ({user.email}) registered via Google Sign-In.")

        # 4. Generate JWT Tokens
        refresh = RefreshToken.for_user(user)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        log_activity(user, "User logged in successfully via Google Sign-In", "authentication", request)

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': CustomUserSerializer(user).data
        }, status=status.HTTP_200_OK)


class GoogleLoginClientIdView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from backend.login_oauth import get_google_login_credentials
        client_id, _ = get_google_login_credentials()
        return Response({"client_id": client_id})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-created_at')
    permission_classes = [HasDynamicPermission]

    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.all().order_by('-created_at')
        if user.is_authenticated and user.role and user.role.name == 'Admin':
            queryset = queryset.exclude(role__name='Super Admin')
        return queryset
    
    # Define permission requirements for custom permissions check
    action_permissions = {
        'list': 'manage_users',
        'retrieve': 'manage_users',
        'create': 'create_users',
        'update': 'edit_users',
        'partial_update': 'edit_users',
        'destroy': 'delete_users',
        'reset_password': 'edit_users',
        'assign_permissions': 'edit_users',
        'invite': 'create_users',
        'invitations': 'manage_users',
        'resend_invite': 'manage_users',
        'cancel_invite': 'manage_users',
        'delete_invitation': 'manage_users',
    }

    def get_permissions(self):
        if self.action in ['get_invitation', 'register']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == 'create':
            return CustomUserCreateSerializer
        return CustomUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer_class()(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        raw_password = request.data.get('password')
        user = serializer.save()

        # Trigger Welcome Email with Username & Temp Password asynchronously
        if raw_password:
            try:
                from services.email_service import send_welcome_user_email_async
                send_welcome_user_email_async(user, raw_password)
            except Exception as mail_err:
                logger.error(f"Failed to dispatch welcome email async: {mail_err}")
        
        # Log & Notify
        log_activity(request.user, f"Created user {user.email}", "users", request)
        create_notification(
            user, 
            "Welcome to College MOU Dashboard", 
            f"Hi {user.name}, your account has been created by the administrator."
        )
        notify_admins("New User Created", f"User {user.name} ({user.email}) was created.")
        
        headers = self.get_success_headers(serializer.data)
        return Response(CustomUserSerializer(user).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        # Override to check status transition
        instance = self.get_object()
        old_status = instance.status
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # If user disabled, log and notify
        new_status = user.status
        if old_status == 'Active' and new_status == 'Disabled':
            log_activity(request.user, f"Disabled user {user.email}", "users", request)
            create_notification(user, "Account Disabled", "Your account has been disabled by the administrator.")
        else:
            log_activity(request.user, f"Updated user profile for {user.email}", "users", request)
            
        return Response(CustomUserSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        email = instance.email
        
        # Nullify activity log references directly via queryset update
        # to bypass ActivityLog.save() immutability guard
        from activity_logs.models import ActivityLog
        ActivityLog.objects.filter(user=instance).update(user=None)
        
        self.perform_destroy(instance)
        log_activity(request.user, f"Deleted user {email}", "users", request)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """
        Returns the logged in user's profile information.
        """
        serializer = CustomUserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='change-password', permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        """
        Allows users to update their own password.
        """
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not current_password or not new_password:
            return Response({"detail": "Both current and new passwords are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        if not user.check_password(current_password):
            return Response({"current_password": ["Invalid current password."]}, status=status.HTTP_400_BAD_REQUEST)
            
        user.set_password(new_password)
        user.save()
        
        log_activity(user, "User updated their own password", "users", request)
        return Response({"detail": "Password changed successfully."})

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """
        Allows an Admin to reset a user's password directly.
        """
        user = self.get_object()
        new_password = request.data.get('password')
        if not new_password:
            return Response({"password": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
            
        user.set_password(new_password)
        user.save()
        
        log_activity(request.user, f"Reset password for user {user.email}", "users", request)
        create_notification(user, "Password Reset", "Your password has been reset by the administrator.")
        
        return Response({"detail": "Password reset successfully."})

    @action(detail=True, methods=['post'], url_path='assign-permissions')
    def assign_permissions(self, request, pk=None):
        """
        Assigns or revokes explicit permission overrides for a user.
        Expects a list of objects with permission_id and is_granted.
        """
        user = self.get_object()
        overrides = request.data.get('permissions', [])
        
        # Clear existing overrides
        UserPermission.objects.filter(user=user).delete()
        
        created_permissions = []
        for item in overrides:
            permission_id = item.get('permission_id')
            is_granted = item.get('is_granted', True)
            
            if not permission_id:
                continue
                
            permission = get_object_or_404(Permission, id=permission_id)
            user_permission = UserPermission.objects.create(
                user=user,
                permission=permission,
                is_granted=is_granted
            )
            created_permissions.append(user_permission)
            
            # Log individual permission action
            action_type = "granted" if is_granted else "revoked"
            log_activity(
                request.user, 
                f"Explicitly {action_type} permission '{permission.codename}' to user {user.email}", 
                "users", 
                request
            )
            create_notification(
                user, 
                f"Permission Update", 
                f"The permission '{permission.name}' has been {action_type} to you."
            )
            
        return Response({
            "detail": "Permissions updated successfully.",
            "permissions": UserPermissionSerializer(created_permissions, many=True).data
        })

    @action(detail=False, methods=['post'], url_path='invite')
    def invite(self, request):
        email = request.data.get('email')
        stream = request.data.get('stream', '')
        department = request.data.get('department', '')
        role_id = request.data.get('system_role_id')
        
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Default fallback role
        if not role_id:
            role = Role.objects.filter(name="User").first()
            if not role:
                role = Role.objects.first()
        else:
            role = get_object_or_404(Role, id=role_id)
            
        if not role:
            return Response({"detail": "No default system role found in the database. Please create a role first."}, status=status.HTTP_400_BAD_REQUEST)
            
        if request.user.role and request.user.role.name == 'Admin' and role.name == 'Super Admin':
            return Response({"detail": "Admins cannot invite users with the Super Admin role."}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            invitation = InvitationService.create_invitation(
                email=email,
                stream=stream,
                department=department,
                system_role=role,
                created_by=request.user
            )
            log_activity(request.user, f"Created invitation for {email}", "users", request)
            return Response(UserInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Failed to create invitation")
            return Response({"detail": f"Invitation sending failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='invitations')
    def invitations(self, request):
        queryset = UserInvitation.objects.all().order_by('-created_at')
        if request.user.role and request.user.role.name == 'Admin':
            queryset = queryset.exclude(system_role__name='Super Admin')
        
        # Search & filters
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(email__icontains=search)
            
        stream = request.query_params.get('stream')
        if stream:
            queryset = queryset.filter(stream=stream)
            
        department = request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
            
        role = request.query_params.get('role')
        if role:
            queryset = queryset.filter(system_role_id=role)
            
        status_param = request.query_params.get('status')
        if status_param:
            now = timezone.now()
            if status_param == 'Accepted':
                queryset = queryset.filter(is_used=True)
            elif status_param == 'Cancelled':
                queryset = queryset.filter(is_cancelled=True)
            elif status_param == 'Expired':
                queryset = queryset.filter(expires_at__lt=now, is_used=False, is_cancelled=False)
            elif status_param == 'Pending':
                queryset = queryset.filter(expires_at__gt=now, is_used=False, is_cancelled=False)
                
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = UserInvitationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = UserInvitationSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='resend-invite')
    def resend_invite(self, request):
        from datetime import timedelta
        invite_id = request.data.get('id')
        if not invite_id:
            return Response({"detail": "Invitation ID is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        invitation = get_object_or_404(UserInvitation, id=invite_id)
        
        now = timezone.now()
        expires_at = now + timedelta(hours=24)
        token = TokenService.generate_token(
            invitation.email, 
            invitation.stream, 
            invitation.department, 
            invitation.system_role.id, 
            expires_at
        )
        
        invitation.token = token
        invitation.expires_at = expires_at
        invitation.is_cancelled = False
        invitation.is_used = False
        invitation.save()
        
        # Send Email
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        invite_url = f"{frontend_url}/register?token={token}"
        
        try:
            send_invitation_email(invitation.email, invite_url, expires_at)
            log_activity(request.user, f"Resent invitation for {invitation.email}", "users", request)
            return Response(UserInvitationSerializer(invitation).data)
        except Exception as e:
            logger.exception("Failed to resend invitation email")
            return Response({"detail": f"Email resend failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='cancel-invite')
    def cancel_invite(self, request):
        invite_id = request.data.get('id')
        if not invite_id:
            return Response({"detail": "Invitation ID is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        invitation = get_object_or_404(UserInvitation, id=invite_id)
        invitation.is_cancelled = True
        invitation.save()
        
        log_activity(request.user, f"Cancelled invitation for {invitation.email}", "users", request)
        return Response(UserInvitationSerializer(invitation).data)

    def delete_invitation(self, request, pk=None):
        invitation = get_object_or_404(UserInvitation, id=pk)
        email = invitation.email
        invitation.delete()
        log_activity(request.user, f"Deleted invitation record for {email}", "users", request)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_invitation(self, request, token=None):
        token_val = token or request.query_params.get('token')
        if not token_val:
            return Response({"detail": "Invitation token is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        invitation = UserInvitation.objects.filter(token=token_val).first()
        if not invitation:
            import urllib.parse
            unquoted = urllib.parse.unquote(token_val)
            invitation = UserInvitation.objects.filter(token=unquoted).first()

        if not invitation:
            return Response({"detail": "This invitation link is invalid or no longer exists. Please ask an admin to send a new invitation link."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        status_val = 'Pending'
        detail_msg = ''
        
        if invitation.is_used:
            status_val = 'Accepted'
            detail_msg = 'This invitation link has already been used to register an account.'
        elif invitation.is_cancelled:
            status_val = 'Cancelled'
            detail_msg = 'This invitation link has been cancelled by an administrator.'
        elif invitation.expires_at < now:
            status_val = 'Expired'
            detail_msg = 'This invitation link has expired (valid for 24 hours). Please request a new link.'
            
        data = UserInvitationSerializer(invitation).data
        if status_val != 'Pending':
            return Response({
                "status": status_val,
                "detail": detail_msg,
                "invitation": data
            }, status=status.HTTP_400_BAD_REQUEST)
            
        return Response(data)

    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        name = serializer.validated_data['name']
        password = serializer.validated_data['password']
        phone = serializer.validated_data.get('phone', '')
        designation = serializer.validated_data.get('designation', '')
        stream_val = serializer.validated_data.get('stream', '')
        department_val = serializer.validated_data.get('department', '')
        company_name = serializer.validated_data.get('company_name', '')
        
        invitation = get_object_or_404(UserInvitation, token=token)
        now = timezone.now()
        
        if invitation.is_used or invitation.is_cancelled or invitation.expires_at < now:
            return Response({"detail": "This invitation link is invalid, expired, used, or cancelled."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Extract IP and User Agent
        ip_addr = request.META.get('REMOTE_ADDR')
        user_agt = request.META.get('HTTP_USER_AGENT')
        
        try:
            with transaction.atomic():
                # Create user
                user = User.objects.create_user(
                    email=invitation.email,
                    password=password,
                    name=name,
                    phone=phone,
                    designation=designation,
                    department=invitation.department or department_val,
                    stream=invitation.stream or stream_val,
                    company_name=company_name,
                    role=invitation.system_role,
                    status='Active'
                )
                
                # Mark invitation as used
                invitation.is_used = True
                invitation.accepted_at = now
                invitation.ip_address = ip_addr
                invitation.user_agent = user_agt
                invitation.save()
                
                # Log activity
                log_activity(user, "Completed registration via invitation", "authentication", request)
                create_notification(
                    user, 
                    "Welcome to MCC LEGAL DOCUMENT", 
                    f"Hi {name}, your registration has been successfully completed. You can now explore the registry."
                )
                notify_admins("Invitation Registration Completed", f"User {name} ({invitation.email}) completed registration.")
                
            return Response({"detail": "Registration completed successfully. You can now sign in."}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.exception("Failed to complete user registration from invitation")
            return Response({"detail": f"Registration failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class IsSuperAdmin(permissions.BasePermission):
    """
    Permission class that only grants access to Super Admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and request.user.role 
            and request.user.role.name == "Super Admin"
        )


class IsAdminOrSuperAdmin(permissions.BasePermission):
    """
    Permission class that grants access to Admin and Super Admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and request.user.role 
            and request.user.role.name in ["Super Admin", "Admin"]
        )


class SMTPSettingViewSet(viewsets.ModelViewSet):
    serializer_class = SMTPSettingSerializer
    permission_classes = [IsSuperAdmin]
    queryset = SMTPSetting.objects.all().order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='test-connection')
    def test_connection(self, request, pk=None):
        smtp = self.get_object()
        test_email = request.data.get('test_email')
        if not test_email:
            return Response({"detail": "test_email is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Test the connection to SMTP using the user's config
        from django.core.mail import get_connection, EmailMultiAlternatives
        try:
            connection = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=smtp.host,
                port=smtp.port,
                username=smtp.username if smtp.auth_required else None,
                password=smtp.password if smtp.auth_required else None,
                use_tls=smtp.use_tls,
                use_ssl=smtp.use_ssl,
                timeout=10,
            )
            
            subject = "SMTP Test Connection - MCC Legal Document"
            text_content = "This is a test email verifying that your custom SMTP settings are configured correctly."
            html_content = "<p>This is a test email verifying that your custom SMTP settings are configured correctly.</p>"
            
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=f"MCC LEGAL DOCUMENT <{smtp.sender_email}>",
                to=[test_email],
                connection=connection
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            
            log_activity(request.user, f"Successfully tested SMTP connection to {test_email}", "smtp")
            return Response({"success": True, "detail": f"Test email sent successfully to {test_email}!"}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"SMTP Test Connection failed: {e}", exc_info=True)
            error_str = str(e)
            lower_err = error_str.lower()
            if "time out" in lower_err or "timeout" in lower_err or "timed out" in lower_err or "refused" in lower_err or "unreachable" in lower_err:
                logger.warning("SMTP test connection encountered a network timeout/refusal. Returning friendly network note.")
                return Response(
                    {"success": False, "detail": f"SMTP connection timed out or was refused on host '{smtp.host}:{smtp.port}'. Please check your host/port or ISP firewall settings."},
                    status=status.HTTP_200_OK
                )
            elif "authentication" in lower_err or "535" in lower_err or "badcredentials" in lower_err:
                return Response(
                    {"success": False, "detail": f"SMTP Authentication Failed: Please verify your SMTP username and password (or use a 16-character App Password if using Gmail)."},
                    status=status.HTTP_200_OK
                )
            return Response(
                {"success": False, "detail": f"SMTP test connection failed: {error_str}"},
                status=status.HTTP_200_OK
            )


class GoogleDriveSettingViewSet(viewsets.ModelViewSet):
    serializer_class = GoogleDriveSettingSerializer
    permission_classes = [IsAdminOrSuperAdmin]
    queryset = GoogleDriveSetting.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        instance = serializer.save()
        if instance.is_active:
            try:
                from services import drive_service
                drive_service.initialize_and_sync_all_drive_modules(instance.root_folder_id)
            except Exception as e:
                logger.warning(f"Drive module architecture auto-sync failed on settings create: {e}")

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.is_active:
            try:
                from services import drive_service
                drive_service.initialize_and_sync_all_drive_modules(instance.root_folder_id)
            except Exception as e:
                logger.warning(f"Drive module architecture auto-sync failed on settings update: {e}")

    @action(detail=False, methods=['get'], url_path='oauth-url')

    def oauth_url(self, request):
        redirect_uri = request.query_params.get('redirect_uri')
        if not redirect_uri:
            return Response({"detail": "redirect_uri query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        client_id = getattr(settings, 'GOOGLE_DRIVE_CLIENT_ID', '')
        if not client_id:
            setting = GoogleDriveSetting.objects.first()
            if setting:
                client_id = setting.client_id
        
        if not client_id:
            return Response({"detail": "Google Drive Client ID is not configured on the server"}, status=status.HTTP_400_BAD_REQUEST)
        
        import urllib.parse
        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email openid',
            'access_type': 'offline',
            'prompt': 'consent select_account'
        }
        url = 'https://accounts.google.com/o/oauth2/auth?' + urllib.parse.urlencode(params)
        return Response({'url': url})

    @action(detail=False, methods=['post'], url_path='oauth-callback')
    def oauth_callback(self, request):
        code = request.data.get('code')
        redirect_uri = request.data.get('redirect_uri')
        if not code or not redirect_uri:
            return Response({"detail": "code and redirect_uri are required"}, status=status.HTTP_400_BAD_REQUEST)
        
        client_id = getattr(settings, 'GOOGLE_DRIVE_CLIENT_ID', '')
        client_secret = getattr(settings, 'GOOGLE_DRIVE_CLIENT_SECRET', '')
        
        if not client_id or not client_secret:
            setting = GoogleDriveSetting.objects.first()
            if setting:
                client_id = client_id or setting.client_id
                client_secret = client_secret or setting.client_secret
        
        if not client_id or not client_secret:
            return Response({"detail": "Google Drive OAuth client_id or client_secret is not configured on the server"}, status=status.HTTP_400_BAD_REQUEST)
        
        import requests
        import datetime
        from django.utils import timezone
        
        token_url = 'https://oauth2.googleapis.com/token'
        payload = {
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }
        
        try:
            res = requests.post(token_url, data=payload)
            if res.status_code != 200:
                return Response({"detail": f"Failed to exchange code: {res.text}"}, status=status.HTTP_400_BAD_REQUEST)
            
            tokens = res.json()
            access_token = tokens.get('access_token')
            refresh_token = tokens.get('refresh_token')
            expires_in = tokens.get('expires_in', 3600)
            expiry_time = timezone.now() + datetime.timedelta(seconds=expires_in)
            
            headers = {'Authorization': f'Bearer {access_token}'}
            userinfo_res = requests.get('https://www.googleapis.com/oauth2/v2/userinfo', headers=headers)
            connected_email = None
            if userinfo_res.status_code == 200:
                connected_email = userinfo_res.json().get('email')
            
            storage_usage = 0
            storage_limit = 0
            drive_about_res = requests.get('https://www.googleapis.com/drive/v3/about?fields=storageQuota', headers=headers)
            if drive_about_res.status_code == 200:
                quota = drive_about_res.json().get('storageQuota', {})
                storage_usage = int(quota.get('usage', 0))
                storage_limit = int(quota.get('limit', 0))
            
            setting = GoogleDriveSetting.objects.filter(is_active=True).first()
            if not setting:
                setting = GoogleDriveSetting.objects.first()
            if not setting:
                setting = GoogleDriveSetting()
            
            setting.client_id = client_id
            setting.client_secret = client_secret
            setting.access_token = access_token
            if refresh_token:
                setting.refresh_token = refresh_token
            setting.token_expiry = expiry_time
            setting.connected_email = connected_email
            setting.storage_usage = storage_usage
            setting.storage_limit = storage_limit
            setting.is_active = True
            if not setting.project_id:
                setting.project_id = 'Web OAuth Project'
            
            setting.save()
            
            log_activity(request.user, f"Authorized Google Drive Web OAuth for project {setting.project_id}", "drive")
            return Response({
                "detail": "OAuth authorization completed successfully",
                "connected_email": connected_email,
                "storage_usage": storage_usage,
                "storage_limit": storage_limit
            })
        except Exception as e:
            logger.error(f"OAuth exchange failed: {e}", exc_info=True)
            return Response({"detail": f"OAuth authorization failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='test-connection')
    def test_connection(self, request, pk=None):
        drive_setting = self.get_object()
        
        try:
            from services import drive_service
            original_active = drive_setting.is_active
            if not original_active:
                GoogleDriveSetting.objects.filter(is_active=True).update(is_active=False)
                drive_setting.is_active = True
                drive_setting.save()
            
            try:
                service = drive_service.authenticate()
                service.files().list(pageSize=1).execute()
                
                root_id = drive_setting.root_folder_id or drive_service.get_root_folder_id()
                if root_id:
                    service.files().get(fileId=root_id, fields='id').execute()
            finally:
                if not original_active:
                    drive_setting.is_active = False
                    drive_setting.save()
                    # Re-activate the previously active configurations
                    GoogleDriveSetting.objects.filter(pk=drive_setting.pk).update(is_active=False)
            
            log_activity(request.user, f"Successfully tested Google Drive connection for project {drive_setting.project_id}", "drive")
            return Response({"detail": "Google Drive connection test succeeded! Authentication and folder access verified successfully."})
        except Exception as e:
            logger.error(f"Google Drive Test Connection failed: {e}", exc_info=True)
            return Response(
                {"detail": f"Google Drive connection test failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


from .models import CustomDynamicPage
from .serializers import CustomDynamicPageSerializer

class CustomDynamicPageViewSet(viewsets.ModelViewSet):
    serializer_class = CustomDynamicPageSerializer
    queryset = CustomDynamicPage.objects.all().order_by('order', 'title')
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        include_all = self.request.query_params.get('all', 'false').lower() == 'true'
        if not include_all:
            qs = qs.filter(is_published=True, is_enabled=True)

        user = getattr(self.request, 'user', None)
        if not user or not user.is_authenticated:
            return qs.none()

        is_admin = getattr(user, 'role', None) and user.role.name in ["Super Admin", "Admin"]
        if is_admin:
            return qs

        # For standard User: only return custom modules that have at least one folder/file shared with or created by the user
        from folders.models import Folder, FolderPermission
        from django.db.models import Q

        user_fp_folder_ids = list(FolderPermission.objects.filter(user=user, is_granted=True).values_list('folder_id', flat=True))
        accessible_page_ids = []

        for page in qs:
            # 1. Check if any folder directly linked to this custom page is accessible to user
            has_shared_folder = Folder.objects.filter(
                custom_page=page,
                is_deleted=False
            ).filter(
                Q(created_by=user) | Q(id__in=user_fp_folder_ids)
            ).exists()

            if has_shared_folder:
                accessible_page_ids.append(page.id)
                continue

            # 2. Check if the module root folder or any of its descendants are shared with user
            if page.root_folder_id:
                try:
                    rf_id = int(page.root_folder_id)
                    root_folder = Folder.objects.filter(id=rf_id, is_deleted=False).first()
                    if root_folder and (root_folder.id in user_fp_folder_ids or root_folder.created_by == user):
                        accessible_page_ids.append(page.id)
                        continue

                    # Check descendants
                    if Folder.objects.filter(parent=root_folder, is_deleted=False).filter(Q(created_by=user) | Q(id__in=user_fp_folder_ids)).exists():
                        accessible_page_ids.append(page.id)
                        continue
                except (ValueError, TypeError):
                    pass

        return qs.filter(id__in=accessible_page_ids)

    def perform_create(self, serializer):
        page = serializer.save()
        try:
            from services import drive_service
            drive_service.get_or_create_module_folder_id(page)
        except Exception as err:
            logger.warning(f"Module Drive folder initialization error on create for '{page.title}': {err}")


    @action(detail=True, methods=['post'], url_path='republish')
    def republish(self, request, pk=None):
        """
        Republish / Re-establish module and retrieve all associated repository data inside it.
        """
        page = self.get_object()
        page.is_published = True
        page.is_enabled = True
        page.save(update_fields=['is_published', 'is_enabled'])

        # Restore associated root folder and its child folders/files
        if page.root_folder_id:
            try:
                from folders.models import Folder
                from files.models import File
                root_folder = Folder.objects.filter(id=int(page.root_folder_id)).first()
                if root_folder:
                    root_folder.is_deleted = False
                    root_folder.deleted_at = None
                    root_folder.deleted_by = None
                    root_folder.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])
                    
                    subfolder_ids = list(Folder.objects.filter(parent=root_folder).values_list('id', flat=True))
                    Folder.objects.filter(id__in=subfolder_ids).update(is_deleted=False, deleted_at=None, deleted_by=None)
                    File.objects.filter(folder_id__in=[root_folder.id] + subfolder_ids).update(is_deleted=False, deleted_at=None, deleted_by=None)
            except Exception as err:
                logger.warning(f"Failed to restore repository folder data for module '{page.title}': {err}")

        # Move module folder on Google Drive back to Application Root
        try:
            from services import drive_service
            master_root_id = drive_service.get_root_folder_id()
            drive_id = drive_service.get_or_create_module_folder_id(page)
            if drive_id and master_root_id:
                drive_service.move_file(drive_id, master_root_id)
        except Exception as d_err:
            logger.warning(f"Google Drive restore move note for module '{page.title}': {d_err}")

        log_activity(request.user, f"Republished module '{page.title}' and retrieved repository data", "users", request)
        return Response({
            "detail": f"Module '{page.title}' and all associated repository data successfully retrieved & republished!",
            "page": CustomDynamicPageSerializer(page).data
        })

    def destroy(self, request, *args, **kwargs):
        """
        Soft deletes/unpublishes module and moves its repository data to Recycle Bin.
        """
        page = self.get_object()
        page.is_published = False
        page.is_enabled = False
        page.save(update_fields=['is_published', 'is_enabled'])

        if page.root_folder_id:
            try:
                from folders.models import Folder
                from files.models import File
                root_folder = Folder.objects.filter(id=int(page.root_folder_id)).first()
                if root_folder:
                    from django.utils import timezone
                    now = timezone.now()
                    root_folder.is_deleted = True
                    root_folder.deleted_at = now
                    root_folder.deleted_by = request.user
                    root_folder.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

                    subfolder_ids = list(Folder.objects.filter(parent=root_folder).values_list('id', flat=True))
                    Folder.objects.filter(id__in=subfolder_ids).update(is_deleted=True, deleted_at=now, deleted_by=request.user)
                    File.objects.filter(folder_id__in=[root_folder.id] + subfolder_ids).update(is_deleted=True, deleted_at=now, deleted_by=request.user)
            except Exception as err:
                logger.warning(f"Failed to soft delete repository folder data for module '{page.title}': {err}")

        # Move module folder on Google Drive to Recycle Bin
        try:
            from services import drive_service
            bin_drive_id = drive_service.get_or_create_recycle_bin_folder_id()
            target_drive_id = page.google_drive_folder_id
            if not target_drive_id and page.root_folder_id:
                rf = Folder.objects.filter(id=int(page.root_folder_id)).first()
                if rf:
                    target_drive_id = rf.google_folder_id
            if target_drive_id and bin_drive_id:
                drive_service.move_file(target_drive_id, bin_drive_id)
        except Exception as d_err:
            logger.warning(f"Google Drive move to Recycle Bin note for module '{page.title}': {d_err}")

        log_activity(request.user, f"Unpublished module '{page.title}' and moved repository data to Recycle Bin", "users", request)
        return Response({"detail": f"Module '{page.title}' unpublished and repository data moved to Recycle Bin."}, status=status.HTTP_200_OK)





