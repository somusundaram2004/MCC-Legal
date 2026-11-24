from datetime import timedelta
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def parse_email_list(raw_input):
    """
    Parses comma, semicolon, space, or newline separated emails, or a list/tuple of emails,
    returning a deduplicated list of lowercase, valid email strings.
    """
    if not raw_input:
        return []
    if isinstance(raw_input, (list, tuple, set)):
        items = list(raw_input)
    elif isinstance(raw_input, str):
        import re
        items = re.split(r'[,;\s\n]+', raw_input)
    else:
        items = [str(raw_input)]

    valid_emails = []
    seen = set()
    for item in items:
        if not item:
            continue
        clean = item.strip().lower()
        if clean and '@' in clean and '.' in clean:
            if clean not in seen:
                seen.add(clean)
                valid_emails.append(clean)
    return valid_emails

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


SHARE_EMAIL_TEMPLATES = {
    'standard': {
        'id': 'standard',
        'name': 'MOU Status & Signature Tracking',
        'category': 'MOU Repository Status',
        'subject': 'Action Required: MOU Status Update & Signature Tracking - {mou_title}',
        'description': 'Track MOU status, signature confirmation, execution date, and signed upload.',
        'body': (
            "Dear Colleague,\n\n"
            "The MCC Legal MOU Repository has been established to systematically monitor and maintain the operational lifecycle and compliance status of institutional Memoranda of Understanding.\n\n"
            "Please find attached for your review and records:\n"
            "\"{file_name}\"\n\n"
            "Kindly review the attached agreement and provide an updated status on the following:\n"
            "1. Has this Memorandum of Understanding (MOU) been officially signed?\n"
            "2. If yes, kindly confirm the execution / signing date.\n"
            "3. Detail the key beneficiaries and operational activities conducted under this MOU.\n"
            "4. If signed, kindly upload the executed / signed copy into the MCC Legal Repository for institutional records.\n\n"
            "Thank you for your prompt attention and cooperation.\n\n"
            "Warm regards,\n"
            "Dr. Selvi G\n"
            "Legal Coordinator\n"
            "Madras Christian College (MCC)"
        )
    },
    'review_and_sign': {
        'id': 'review_and_sign',
        'name': 'Action Required: Review & Sign MOU',
        'category': 'Signature Required',
        'subject': 'Action Required: Review and Sign MOU - {mou_title}',
        'description': 'Formal legal request to review terms, sign the document, and return verified signed copy.',
        'body': (
            "Dear Colleague / Partner,\n\n"
            "Please review the attached Memorandum of Understanding: {mou_title} ({mou_number}) "
            "between MCC and {partner_organization}.\n\n"
            "Action Required:\n"
            "1. Download and thoroughly review the agreement terms.\n"
            "2. Execute the document with authorized institutional signatures.\n"
            "3. Upload the executed copy via the MCC Legal Portal or return to the Legal Cell.\n\n"
            "Please complete this at your earliest convenience.\n\n"
            "Regards,\n{sender_name}\nMCC Legal Cell"
        )
    },
    'collaboration': {
        'id': 'collaboration',
        'name': 'Inter-Departmental Collaboration',
        'category': 'Departmental',
        'subject': 'Department Collaboration: {mou_title} ({mou_number})',
        'description': 'Notice for collaborating departments to coordinate execution and joint academic activities.',
        'body': (
            "Dear Department Team,\n\n"
            "This Memorandum of Understanding: {mou_title} ({mou_number}) with {partner_organization} "
            "has been shared with your department for joint coordination and academic implementation.\n\n"
            "Please access your Shared Files section to review the agreement objectives, duration, "
            "and operational guidelines.\n\n"
            "Regards,\n{sender_name}\nMCC Legal Cell"
        )
    },
    'urgent': {
        'id': 'urgent',
        'name': 'Urgent: Expedited MOU Notice',
        'category': 'Urgent',
        'subject': 'URGENT NOTICE: Expedited MOU Review - {mou_title}',
        'description': 'High-priority notification for time-sensitive legal agreements requiring prompt action.',
        'body': (
            "URGENT ATTENTION REQUIRED:\n\n"
            "This is a high-priority notification regarding the Memorandum of Understanding: {mou_title} ({mou_number}) "
            "with {partner_organization}.\n\n"
            "Your prompt review and acknowledgement of this document are requested. "
            "Please use the buttons below to download the file immediately and log in to the portal.\n\n"
            "Regards,\n{sender_name}\nMCC Legal Cell"
        )
    }
}


def send_mou_share_email(
    share,
    email_template_key='standard',
    custom_subject=None,
    custom_message=None,
    sender_name=None,
    temp_password=None,
    request=None,
    cc_emails=None,
    extra_recipients=None,
    role_type='to',
    all_to_recipients=None,
    all_cc_recipients=None,
    target_recipient_email=None
):
    """
    Renders and sends a high-contrast, professional HTML email for MOU document sharing.
    Sends individual, personalized emails to each recipient with their OWN specific login
    credentials and download access token. Never leaks temporary credentials between recipients.
    Clearly distinguishes Primary Action Recipients (To) from Carbon Copy (CC) reference copies.
    """
    try:
        mou = share.mou
        recipient_email = (
            target_recipient_email
            or share.recipient_email
            or (share.user.email if share.user else None)
            or ''
        ).strip().lower()

        if not recipient_email:
            logger.warning(f"send_mou_share_email: No recipient email on MOUShare ID {share.id}")
            return False

        # Determine all primary and CC recipients for transparent specification table
        if all_to_recipients:
            to_list = parse_email_list(all_to_recipients)
        else:
            to_list = [recipient_email]
            if extra_recipients:
                for em in parse_email_list(extra_recipients):
                    if em not in to_list:
                        to_list.append(em)

        if all_cc_recipients:
            cc_list = parse_email_list(all_cc_recipients)
        elif cc_emails:
            cc_list = parse_email_list(cc_emails)
        else:
            cc_list = []

        if not sender_name:
            sender_name = "Legal Administrator"
            if share.shared_by:
                sender_name = share.shared_by.name or share.shared_by.email.split('@')[0]
        sender_email_display = share.shared_by.email if share.shared_by else "legal@mcc.edu"

        tmpl = SHARE_EMAIL_TEMPLATES.get(email_template_key, SHARE_EMAIL_TEMPLATES['standard'])

        doc_name = (share.shared_file.name if (share.shared_file and hasattr(share.shared_file, 'name')) else mou.title) or 'MOU Document'

        replacements = {
            '{mou_title}': doc_name,
            '{file_name}': doc_name,
            '"file name "': f'"{doc_name}"',
            '"file name"': f'"{doc_name}"',
            '{mou_number}': mou.mou_number,
            '{partner_organization}': mou.partner_organization or 'Partner Institution',
            '{sender_name}': sender_name,
            '{recipient_email}': recipient_email,
        }

        from users.models import EmailNotificationSetting
        email_config = EmailNotificationSetting.get_setting()

        base_subject = custom_subject or (email_config.default_subject if email_config else None) or tmpl['subject']
        for k, v in replacements.items():
            base_subject = base_subject.replace(k, str(v))

        # Distinct subject lines for CC vs Primary Action recipients
        if role_type == 'cc':
            if '[cc' not in base_subject.lower():
                subject = f"[CC: For Information] {base_subject}"
            else:
                subject = base_subject
        else:
            if not base_subject.lower().startswith('action required') and not base_subject.lower().startswith('[cc'):
                subject = f"Action Required: {base_subject}"
            else:
                subject = base_subject

        raw_body_template = custom_message or (email_config.default_body if email_config else None) or tmpl['body']
        raw_body = raw_body_template
        for k, v in replacements.items():
            raw_body = raw_body.replace(k, str(v))

        formatted_paragraphs = "".join([
            f'<p style="margin: 0 0 {"14px" if not line.strip() else "4px"}; line-height: 1.6; font-size: 15px; color: #334155;">{line.strip() if line.strip() else "&nbsp;"}</p>'
            for line in raw_body.split('\n')
        ])

        # Determine base frontend URL:
        configured_base = email_config.portal_base_url.strip().rstrip('/') if (email_config and email_config.portal_base_url) else None
        
        request_origin = None
        if request:
            try:
                request_origin = request.build_absolute_uri('/')[:-1]
            except Exception:
                pass

        if configured_base:
            frontend_url = configured_base
        elif request_origin:
            frontend_url = request_origin
        else:
            configured = getattr(settings, 'FRONTEND_URL', 'https://legal.mccmrfip.in').rstrip('/')
            frontend_url = configured

        token = share.secure_token

        # Resolve download URL dynamically based on Super Admin setting:
        download_type = getattr(email_config, 'download_link_type', 'direct_api')
        if download_type == 'portal_page':
            download_url = f"{frontend_url}/shared/download/{token}"
        elif download_type == 'custom' and getattr(email_config, 'custom_download_path', None):
            cpath = email_config.custom_download_path.replace('{token}', token).replace('{mou_id}', str(mou.id))
            if not cpath.startswith('/'):
                cpath = '/' + cpath
            download_url = f"{frontend_url}{cpath}"
        else:
            # direct_api: Direct secure stream download to recipient device Downloads folder
            download_url = f"{frontend_url}/api/mous/shared/download/{token}/"

        # Resolve destination path based on Super Admin email redirection configuration
        redirection_target = (email_config.redirection_target if email_config else None) or 'shared_files'
        if redirection_target == 'shared_files':
            target_path = '/shared'
        elif redirection_target == 'mou_detail':
            target_path = f"/mou/{mou.id}"
        elif redirection_target == 'login_redirect':
            target_path = f"/login?email={recipient_email}&next=/shared"
        elif redirection_target == 'custom' and email_config and email_config.custom_redirect_path:
            custom_path = email_config.custom_redirect_path
            for k, v in replacements.items():
                custom_path = custom_path.replace(k, str(v))
            custom_path = custom_path.replace('{mou_id}', str(mou.id)).replace('{id}', str(mou.id))
            target_path = custom_path
        else:
            target_path = '/shared'

        if not target_path.startswith('/'):
            target_path = '/' + target_path

        # Determine button labels and notices
        download_btn_text = (email_config.download_button_label if email_config else None) or "DOWNLOAD MOU"
        mou_btn_text = (email_config.mou_button_label if email_config else None) or "OPEN MOU PORTAL"
        footer_notice_text = (email_config.footer_notice if email_config else None) or (
            "This document is automatically preserved in your Shared Files repository. "
            "Downloading the file will not remove it from your portal view or alter ownership."
        )

        always_login = getattr(email_config, 'always_require_login_redirect', True)

        # Determine URLs and account credentials if auto-registered
        from django.contrib.auth import get_user_model
        User = get_user_model()
        has_account = bool(share.user or User.objects.filter(email__iexact=recipient_email).exists())
        login_url = f"{frontend_url}/login?email={recipient_email}"

        credentials_html = ""
        credentials_text = ""
        if temp_password:
            credentials_html = f"""
                <!-- Auto-Generated Login Credentials Card -->
                <div style="background-color: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 14px; padding: 20px; margin-bottom: 26px;">
                  <div style="font-size: 15px; font-weight: 800; color: #166534; margin-bottom: 6px;">
                    🎉 Your MCC Legal Account Has Been Created
                  </div>
                  <p style="margin: 0 0 14px 0; font-size: 13px; color: #15803D; line-height: 1.5;">
                    An account has been automatically provisioned for your email address so you can access and track institutional documents:
                  </p>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; background: #FFFFFF; border-radius: 10px; border: 1px solid #BBF7D0; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #F0FDF4; font-weight: 600; color: #4B5563; width: 38%;">Portal Login:</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #F0FDF4; font-weight: 700; color: #1E40AF;"><a href="{login_url}" style="color: #2563EB; text-decoration: underline;">{login_url}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #F0FDF4; font-weight: 600; color: #4B5563;">Your Email:</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #F0FDF4; font-weight: 700; color: #111827;">{recipient_email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; font-weight: 600; color: #4B5563;">Temporary Password:</td>
                      <td style="padding: 10px 14px; font-weight: 800; font-family: monospace; font-size: 16px; color: #047857; letter-spacing: 1px;">{temp_password}</td>
                    </tr>
                  </table>
                  <div style="font-size: 12px; color: #15803D; margin-top: 12px;">
                    💡 You can change your password anytime after logging in under <strong>Settings &rarr; Security</strong>.
                  </div>
                </div>
            """
            credentials_text = (
                f"\n\nYOUR PERSONAL MCC LEGAL ACCOUNT CREDENTIALS:\n"
                f"- Portal Login: {login_url}\n"
                f"- Registered Email: {recipient_email}\n"
                f"- Temporary Password: {temp_password}\n"
                f"(Use these credentials to sign in anytime at {login_url})\n\n"
            )
        else:
            credentials_html = f"""
                <!-- Existing Account Notification -->
                <div style="background-color: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                  <div style="font-size: 13px; font-weight: 800; color: #334155; margin-bottom: 4px;">
                    🔐 Registered Portal Account Found
                  </div>
                  <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 1.5;">
                    This document has been linked to your registered MCC Legal account (<strong>{recipient_email}</strong>). Sign in with your existing password at <a href="{login_url}" style="color: #2563EB; font-weight: 700; text-decoration: underline;">{login_url}</a> to view and manage your Shared Files.
                  </p>
                </div>
            """
            credentials_text = (
                f"\n\nPORTAL ACCOUNT ACCESS:\n"
                f"This document is accessible under your registered MCC Legal account ({recipient_email}).\n"
                f"Sign in at: {login_url}\n\n"
            )

        if has_account:
            if temp_password or always_login:
                mou_url = f"{frontend_url}/login?email={recipient_email}&next={target_path}"
            else:
                mou_url = f"{frontend_url}{target_path}"
            portal_url = mou_url
        else:
            from users.models import UserInvitation
            from roles.models import Role
            from users.invitation_services import TokenService
            now = timezone.now()
            invite = UserInvitation.objects.filter(
                email__iexact=recipient_email, 
                is_used=False, 
                is_cancelled=False,
                expires_at__gt=now
            ).order_by('-created_at').first()

            if not invite:
                UserInvitation.objects.filter(email__iexact=recipient_email, is_used=False).update(is_cancelled=True)
                default_role = Role.objects.filter(name='User').first() or Role.objects.first()
                invite_expires = now + timedelta(days=7)
                signed_token = TokenService.generate_token(
                    email=recipient_email,
                    stream='',
                    department=share.mou.department_name or '',
                    role_id=default_role.id if default_role else 3,
                    expires_at=invite_expires
                )
                invite = UserInvitation.objects.create(
                    email=recipient_email,
                    system_role=default_role,
                    department=share.mou.department_name or '',
                    token=signed_token,
                    expires_at=invite_expires,
                    created_by=share.shared_by
                )

            mou_url = f"{frontend_url}/register?token={invite.token}&next={target_path}"
            portal_url = mou_url

        doc_name = share.shared_file.name if share.shared_file else f"{mou.title}.pdf"
        version_label = f"v{share.document_version}"
        expiry_info = mou.expiry_date.strftime('%B %d, %Y') if mou.expiry_date else 'No Expiry Date'

        # Role indicator and badges distinguishing To vs CC
        if role_type == 'cc':
            role_badge_html = '<span style="background-color: #FEF3C7; color: #92400E; padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 700;">Carbon Copy (CC) &bull; For Information Only</span>'
            role_banner_html = f"""
                <!-- Carbon Copy Notice Banner -->
                <div style="background-color: #FFFBEB; border: 1.5px solid #FCD34D; border-left: 6px solid #D97706; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                  <div style="font-size: 13px; font-weight: 800; color: #B45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                    📋 Carbon Copy (CC) &bull; For Information &amp; Institutional Records
                  </div>
                  <p style="margin: 0; font-size: 13px; color: #92400E; line-height: 1.5;">
                    You have been carbon-copied (CC) on this document transmission for institutional awareness and record-keeping. <strong>No action is required from you.</strong> The primary recipient(s) have been requested to review and complete the status verification.
                  </p>
                </div>
            """
        else:
            role_badge_html = '<span style="background-color: #EFF6FF; color: #1D4ED8; padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 700;">Primary Recipient &bull; Action Required</span>'
            role_banner_html = f"""
                <!-- Primary Action Recipient Notice Banner -->
                <div style="background-color: #EFF6FF; border: 1.5px solid #BFDBFE; border-left: 6px solid #2563EB; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                  <div style="font-size: 13px; font-weight: 800; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                    ⚡ Action Required &bull; Primary Document Recipient
                  </div>
                  <p style="margin: 0; font-size: 13px; color: #1E40AF; line-height: 1.5;">
                    You have been designated as a primary recipient for this document. Please review the attached agreement and provide the status updates for the 4-point compliance checklist below in the repository.
                  </p>
                </div>
            """

        recipients_row = ""
        if len(to_list) > 1:
            recipients_display = ", ".join(to_list)
            recipients_row = f"""
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Primary Recipients (To):</td>
                      <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">{recipients_display}</td>
                    </tr>
            """

        cc_row = ""
        if cc_list:
            cc_display = ", ".join(cc_list)
            cc_row = f"""
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Carbon Copy (CC):</td>
                      <td style="padding: 6px 0; color: #D97706; font-weight: 600;">{cc_display}</td>
                    </tr>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>{subject}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 30px auto; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;">
            <!-- Header Banner -->
            <tr>
              <td style="background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%); padding: 38px 32px; text-align: center;">
                <div style="font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; margin-bottom: 6px;">
                  MCC LEGAL
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #93C5FD; text-transform: uppercase; letter-spacing: 2px;">
                  Enterprise Document Hub &bull; Document Transmission
                </div>
              </td>
            </tr>

            <!-- Main Content Area -->
            <tr>
              <td style="padding: 36px 36px 20px 36px;">
                <div style="display: inline-block; padding: 4px 12px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 999px; font-size: 12px; font-weight: 700; color: #2563EB; margin-bottom: 16px;">
                  Official MOU Document Notification
                </div>
                <h1 style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 16px 0; line-height: 1.3;">
                  {mou.title}
                </h1>

                <!-- Role Notice Banner -->
                {role_banner_html}

                <!-- Message Body -->
                <div style="background-color: #F8FAFC; border-left: 4px solid #2563EB; padding: 18px 20px; border-radius: 0 12px 12px 0; margin-bottom: 26px;">
                  {formatted_paragraphs}
                </div>

                <!-- Document Information Card -->
                <div style="background: #FFFFFF; border-radius: 14px; border: 1px solid #E2E8F0; padding: 20px; margin-bottom: 30px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                  <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin-bottom: 14px; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
                    Document Specifications &amp; Transmission Details
                  </div>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px;">
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; width: 40%; font-weight: 600;">Transmission Role:</td>
                      <td style="padding: 6px 0;">{role_badge_html}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">This Copy Sent To:</td>
                      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">{recipient_email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">MOU Reference:</td>
                      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">{mou.mou_number}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Document Name:</td>
                      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">{doc_name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Partner Organization:</td>
                      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">{mou.partner_organization or 'MCC Academic Partner'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Document Version:</td>
                      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;"><span style="background-color: #E2E8F0; padding: 2px 8px; border-radius: 6px; font-size: 12px;">{version_label}</span></td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Access Permission:</td>
                      <td style="padding: 6px 0; color: #16A34A; font-weight: 700;">{share.permission}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Agreement Expiry:</td>
                      <td style="padding: 6px 0; color: #0F172A;">{expiry_info}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Shared By:</td>
                      <td style="padding: 6px 0; color: #0F172A;">{sender_name} ({sender_email_display})</td>
                    </tr>
                    {recipients_row}
                    {cc_row}
                  </table>
                </div>

                {credentials_html}

                <!-- Two Distinct Action Buttons -->
                <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 26px;">
                  <div style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 18px;">
                    Choose an action to access your document:
                  </div>

                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom: 14px;">
                        <a href="{download_url}" target="_blank" style="display: block; width: 85%; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; text-decoration: none; font-size: 16px; font-weight: 800; padding: 15px 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35); text-align: center;">
                          &darr;&nbsp; {download_btn_text}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <a href="{mou_url}" target="_blank" style="display: block; width: 85%; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: #FFFFFF; text-decoration: none; font-size: 16px; font-weight: 800; padding: 15px 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25); text-align: center;">
                          &rarr;&nbsp; {mou_btn_text}
                        </a>
                      </td>
                    </tr>
                  </table>
                  <div style="font-size: 12px; color: #64748B; margin-top: 14px;">
                    &bull; <strong>{download_btn_text}:</strong> Downloads the document directly to your device.<br>
                    &bull; <strong>{mou_btn_text}:</strong> Opens the official MCC Legal portal and navigates directly to this MOU.
                  </div>
                </div>

                <!-- Shared Files Notice -->
                <div style="background-color: #EFF6FF; border-radius: 12px; border: 1px solid #BFDBFE; padding: 14px 18px; margin-bottom: 20px;">
                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #1E40AF;">
                    &#9432; <strong>Shared Files Availability:</strong> {footer_notice_text}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #F8FAFC; padding: 22px 36px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="font-size: 12px; color: #64748B; margin: 0 0 6px 0;">
                  This is an official automated document delivery from MCC LEGAL ENTERPRISE DOCUMENT HUB.
                </p>
                <p style="font-size: 11px; color: #94A3B8; margin: 0;">
                  Madras Christian College &bull; Chennai, Tamil Nadu, India &bull; Confidential Legal Communication
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """

        text_content = (
            f"MCC LEGAL - MOU DOCUMENT SHARING\n\n"
            f"Document: {mou.title} ({mou.mou_number})\n"
            f"Role: {'Carbon Copy (CC)' if role_type == 'cc' else 'Primary Recipient (Action Required)'}\n"
            f"Delivered To: {recipient_email}\n"
            f"Partner: {mou.partner_organization or 'MCC Partner'}\n"
            f"Shared By: {sender_name} ({sender_email_display})\n"
            f"Primary Recipients: {', '.join(to_list)}\n"
            f"{f'Carbon Copy (CC): {chr(44).join(cc_list)}' if cc_list else ''}\n\n"
            f"{raw_body}\n"
            f"{credentials_text}\n"
            f"Actions:\n"
            f"- {download_btn_text}: {download_url}\n"
            f"- {mou_btn_text}: {mou_url}\n\n"
            f"This document is automatically available under your Shared Files section in the MCC Legal portal."
        )

        from users.models import SMTPSetting
        from django.core.mail import get_connection

        smtp_setting = SMTPSetting.objects.filter(is_active=True).first()
        connection = None
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'MCC LEGAL DOCUMENT <no-reply@mcc.edu>')

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
            to=[recipient_email],
            connection=connection
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()

        logger.info(f"MOU share email successfully sent to {recipient_email} (role: {role_type}) for MOU '{mou.title}'")

        # If legacy call passed extra recipients or CC without views doing the loop, deliver to them too
        if not target_recipient_email:
            if extra_recipients:
                for extra_em in parse_email_list(extra_recipients):
                    if extra_em != recipient_email:
                        try:
                            send_mou_share_email(
                                share,
                                email_template_key=email_template_key,
                                custom_subject=custom_subject,
                                custom_message=custom_message,
                                sender_name=sender_name,
                                temp_password=None,
                                request=request,
                                role_type='to',
                                all_to_recipients=to_list,
                                all_cc_recipients=cc_list,
                                target_recipient_email=extra_em
                            )
                        except Exception as extra_err:
                            logger.error(f"Error delivering extra recipient email to {extra_em}: {extra_err}")

            if cc_emails:
                for cc_em in parse_email_list(cc_emails):
                    if cc_em != recipient_email:
                        try:
                            send_mou_share_email(
                                share,
                                email_template_key=email_template_key,
                                custom_subject=custom_subject,
                                custom_message=custom_message,
                                sender_name=sender_name,
                                temp_password=None,
                                request=request,
                                role_type='cc',
                                all_to_recipients=to_list,
                                all_cc_recipients=cc_list,
                                target_recipient_email=cc_em
                            )
                        except Exception as cc_err:
                            logger.error(f"Error delivering CC email to {cc_em}: {cc_err}")

        return True
    except Exception as e:
        logger.error(f"Error sending MOU share email to {getattr(share, 'recipient_email', 'unknown')}: {e}", exc_info=True)
        return False
