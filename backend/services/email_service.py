from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_invitation_email(email, invite_url, expires_at):
    """
    Renders and sends a professional HTML invitation email using Django SMTP configurations.
    """
    try:
        subject = "You're Invited to Join MCC Legal Document"
        
        # Render HTML template with context
        context = {
            'invite_url': invite_url,
            'expires_at_str': expires_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
            'company_logo_url': getattr(settings, 'COMPANY_LOGO_URL', 'https://example.com/logo.png')
        }
        html_content = render_to_string('emails/user_invitation.html', context)
        text_content = f"You have been invited to join MCC LEGAL DOCUMENT. Complete your registration by visiting: {invite_url}"
        
        # Construct and send email
        from users.models import SMTPSetting
        from django.core.mail import get_connection
        
        # Check for active custom SMTP setting
        smtp_setting = SMTPSetting.objects.filter(is_active=True).first()
        connection = None
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@mcc.edu')
        
        if smtp_setting:
            connection = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=smtp_setting.host,
                port=smtp_setting.port,
                username=smtp_setting.username if smtp_setting.auth_required else None,
                password=smtp_setting.password if smtp_setting.auth_required else None,
                use_tls=smtp_setting.use_tls,
                use_ssl=smtp_setting.use_ssl,
            )
            from_email = f"MCC LEGAL DOCUMENT <{smtp_setting.sender_email}>"
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[email],
            connection=connection
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        
        logger.info(f"Invitation email sent successfully to {email}")
        return True
    except Exception as e:
        logger.error(f"SMTP error while sending invitation email to {email}: {e}", exc_info=True)
        raise e


def send_password_reset_otp_email(user, otp_code):
    """
    Renders and sends a 6-digit OTP email for password reset using configured SMTP settings.
    """
    try:
        subject = "Password Reset Request - OTP Verification Code"
        name = user.name or user.email.split('@')[0]
        
        context = {
            'user_name': name,
            'otp_code': otp_code,
            'expiry_minutes': 30,
            'company_logo_url': getattr(settings, 'COMPANY_LOGO_URL', 'https://example.com/logo.png')
        }
        
        try:
            html_content = render_to_string('emails/password_reset_otp.html', context)
        except Exception:
            html_content = f"""
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Password Reset Verification Code</h2>
                <p>Hi <strong>{name}</strong>,</p>
                <p>You requested a password reset. Use the following 6-digit OTP code to verify your identity:</p>
                <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #2563eb; padding: 15px 0;">{otp_code}</div>
                <p>This code will expire in 30 minutes. If you did not request this, please ignore this message.</p>
            </div>
            """

        text_content = f"Hi {name},\n\nYour password reset OTP code is: {otp_code}\n\nThis code will expire in 30 minutes. If you did not request a password reset, please ignore this email."
        
        from users.models import SMTPSetting
        from django.core.mail import get_connection
        
        smtp_setting = SMTPSetting.objects.filter(is_active=True).first()
        connection = None
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@mcc.edu')
        
        if smtp_setting:
            connection = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=smtp_setting.host,
                port=smtp_setting.port,
                username=smtp_setting.username if smtp_setting.auth_required else None,
                password=smtp_setting.password if smtp_setting.auth_required else None,
                use_tls=smtp_setting.use_tls,
                use_ssl=smtp_setting.use_ssl,
            )
            from_email = f"MCC LEGAL DOCUMENT <{smtp_setting.sender_email}>"
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[user.email],
            connection=connection
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        
        logger.info(f"Password reset OTP email sent successfully to {user.email}")
        return True
    except Exception as e:
        logger.error(f"SMTP error while sending password reset OTP to {user.email}: {e}", exc_info=True)
        return False


import threading

def send_welcome_user_email_async(user, temp_password):
    """
    Triggers send_welcome_user_email asynchronously in a non-blocking background thread.
    """
    thread = threading.Thread(target=send_welcome_user_email, args=(user, temp_password))
    thread.daemon = True
    thread.start()


def send_welcome_user_email(user, temp_password):
    """
    Renders and sends a high-contrast, professional HTML Welcome Card email to a newly created user.
    """
    try:
        subject = "Welcome to MCC LEGAL Portal - Your Account Credentials"
        name = user.name or user.email.split('@')[0]
        email = user.email
        login_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173') + '/login'

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to MCC LEGAL</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;">
            <!-- Header Banner -->
            <tr>
              <td style="background: linear-gradient(135deg, #0F172A 0%, #0EA5E9 100%); padding: 40px 30px; text-align: center;">
                <div style="font-size: 30px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; margin-bottom: 6px;">
                  MCC LEGAL
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #BAE6FD; text-transform: uppercase; letter-spacing: 2px;">
                  Official Portal Welcome Card
                </div>
              </td>
            </tr>

            <!-- Body Content -->
            <tr>
              <td style="padding: 35px 35px 25px 35px;">
                <h1 style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 12px 0;">
                  Welcome aboard, {name}! 👋
                </h1>
                <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 25px 0;">
                  An account has been successfully created for you on the <strong>MCC LEGAL Management System</strong>. Below are your system login credentials:
                </p>

                <!-- Credentials Card -->
                <div style="background: #F1F5F9; border-radius: 16px; border: 1px solid #CBD5E1; padding: 25px; margin-bottom: 25px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Username / Email ID</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 18px; font-size: 16px; font-weight: 800; color: #0F172A;">{email}</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Temporary Password</td>
                    </tr>
                    <tr>
                      <td>
                        <div style="display: inline-block; background-color: #0EA5E9; color: #FFFFFF; font-family: monospace, monospace; font-size: 20px; font-weight: 800; padding: 12px 24px; border-radius: 10px; letter-spacing: 2px;">
                          {temp_password}
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>

                <p style="font-size: 14px; line-height: 1.5; color: #64748B; margin: 0 0 28px 0;">
                  🔒 <strong>Security Notice:</strong> Please sign in using your temporary password and change your password under your Account Settings.
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin-bottom: 25px;">
                  <a href="{login_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%); color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 800; padding: 14px 36px; border-radius: 12px; box-shadow: 0 8px 16px rgba(14, 165, 233, 0.3);">
                    Sign In to Portal →
                  </a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #F8FAFC; padding: 20px 30px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="font-size: 12px; color: #94A3B8; margin: 0;">
                  This is an automated security email from MCC LEGAL. Please do not reply directly to this email.
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

        text_content = f"Welcome {name}!\n\nYour account has been created.\nUsername / Email: {email}\nTemporary Password: {temp_password}\nLogin URL: {login_url}"

        from users.models import SMTPSetting
        from django.core.mail import get_connection

        smtp_setting = SMTPSetting.objects.filter(is_active=True).first()
        connection = None
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@mcc.edu')

        if smtp_setting:
            connection = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=smtp_setting.host,
                port=smtp_setting.port,
                username=smtp_setting.username if smtp_setting.auth_required else None,
                password=smtp_setting.password if smtp_setting.auth_required else None,
                use_tls=smtp_setting.use_tls,
                use_ssl=smtp_setting.use_ssl,
            )
            from_email = f"MCC LEGAL DOCUMENT <{smtp_setting.sender_email}>"

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[email],
            connection=connection
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()

        logger.info(f"Welcome email sent successfully to {email}")
        return True
    except Exception as e:
        logger.error(f"Error sending welcome email to {user.email}: {e}")
        return False
