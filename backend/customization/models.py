from django.db import models
from django.conf import settings

def default_info():
    return {
        "website_name": "MCC Legal & MOU Enterprise Hub",
        "website_description": "Comprehensive document hub and MOU lifecycle management portal.",
        "sidebar_title": "MCC LEGAL",
        "sidebar_subtitle": "Documents"
    }

def default_branding():
    return {
        "website_logo": "",
        "small_logo": "",
        "white_logo": "",
        "login_logo": "",
        "login_bg": "",
        "favicon": "",
        "default_avatar": "",
        "loading_animation": "",
        "illustration_404": "",
        "illustration_empty": ""
    }

def default_theme():
    return {
        "primary_color": "#4F46E5",
        "secondary_color": "#0EA5E9",
        "accent_color": "#F59E0B",
        "success_color": "#10B981",
        "warning_color": "#F59E0B",
        "danger_color": "#EF4444",
        "info_color": "#3B82F6",
        "bg_color": "#F8FAFC",
        "card_color": "#FFFFFF",
        "sidebar_color": "#0F172A",
        "navbar_color": "#FFFFFF",
        "button_style": "rounded",
        "border_radius": 12,
        "font_family": "Inter, sans-serif",
        "font_size": "medium",
        "icon_pack": "Material UI",
        "spacing_scale": 1,
        "shadow_level": "medium",
        "animation_speed": "normal",
        "mode": "light"
    }

def default_navigation():
    return [
        {"id": "nav-1", "label": "Dashboard", "icon": "Dashboard", "route": "/", "order": 1, "roles": ["Super Admin", "Admin", "User"], "visible": True, "new_tab": False},
        {"id": "nav-2", "label": "Folder Explorer", "icon": "Folder", "route": "/folders", "order": 2, "roles": ["Super Admin", "Admin", "User"], "visible": True, "new_tab": False},
        {"id": "nav-3", "label": "MOUs & Agreements", "icon": "Assignment", "route": "/mous", "order": 3, "roles": ["Super Admin", "Admin", "User"], "visible": True, "new_tab": False},
        {"id": "nav-4", "label": "User Management", "icon": "People", "route": "/users", "order": 4, "roles": ["Super Admin", "Admin"], "visible": True, "new_tab": False},
        {"id": "nav-5", "label": "Master Data", "icon": "Category", "route": "/master-data", "order": 5, "roles": ["Super Admin", "Admin"], "visible": True, "new_tab": False},
        {"id": "nav-6", "label": "Settings & Customizer", "icon": "Settings", "route": "/settings", "order": 6, "roles": ["Super Admin", "Admin", "User"], "visible": True, "new_tab": False}
    ]

def default_login():
    return {
        "left_heading": "MCC LEGAL Documents",
        "left_subheading": "Professional Memorandum of Understanding Registry",
        "point_1": "Fully-integrated document version control",
        "point_2": "Granular user permission matrices",
        "point_3": "Automated expiry warning system logs",
        "heading": "Sign In",
        "subheading": "Welcome back! Enter credentials to manage institution agreements.",
        "button_text": "Sign In",
        "show_remember_me": True,
        "welcome_message": "Authorized Staff & Administrator Access Only"
    }

def default_dashboard():
    return {
        "welcome_text": "Welcome to your MCC Enterprise Workspace",
        "recent_activity_title": "Recent Organization Activities",
        "cards_order": ["total_mous", "active_mous", "expiring_soon", "total_files"],
        "widgets_visibility": {
            "stats_cards": True,
            "mou_status_chart": True,
            "department_distribution": True,
            "recent_activity_feed": True,
            "quick_actions": True
        }
    }

def default_footer():
    return {
        "footer_logo": "",
        "footer_description": "Empowering academic collaboration, institutional MOUs, and legal records compliance.",
        "social_links": {
            "facebook": "https://facebook.com",
            "instagram": "https://instagram.com",
            "linkedin": "https://linkedin.com",
            "twitter": "https://twitter.com",
            "youtube": "https://youtube.com",
            "github": "https://github.com"
        },
        "quick_links": [
            {"label": "Official MCC Website", "url": "https://mcc.edu.in"},
            {"label": "Privacy Policy", "url": "/privacy"},
            {"label": "Terms & Conditions", "url": "/terms"}
        ]
    }

def default_notification():
    return {
        "toast_style": "modern",
        "notification_color": "#4F46E5",
        "notification_duration": 4000,
        "success_msg": "Operation completed successfully.",
        "error_msg": "An unexpected error occurred. Please try again.",
        "warning_msg": "Please verify your input before proceeding.",
        "info_msg": "System notification update."
    }

def default_email_templates():
    return {
        "header_title": "MCC Legal & MOU Portal",
        "footer_text": "Madras Christian College (Autonomous), Tambaram, Chennai.",
        "button_color": "#4F46E5",
        "welcome_email": "Welcome to MCC Data Bridge. Your account has been activated.",
        "password_reset": "Click the button below to reset your password.",
        "invitation_email": "You have been invited to join the MCC Legal & MOU Hub."
    }

def default_error_pages():
    return {
        "error_401": {"title": "401 - Unauthorized", "subtitle": "Authentication Required", "desc": "Please sign in to view this page.", "button_text": "Go to Login"},
        "error_403": {"title": "403 - Forbidden", "subtitle": "Access Denied", "desc": "You do not have permission to view this resource.", "button_text": "Back to Home"},
        "error_404": {"title": "404 - Page Not Found", "subtitle": "Lost in Space?", "desc": "The page you are looking for does not exist or has been moved.", "button_text": "Return to Dashboard"},
        "error_500": {"title": "500 - Server Error", "subtitle": "Internal Failure", "desc": "Something went wrong on our end. Please try again later.", "button_text": "Reload Page"},
        "maintenance": {"title": "Under Scheduled Maintenance", "subtitle": "Upgrading System Capabilities", "desc": "We will be back online shortly. Thank you for your patience.", "button_text": "Check Status"}
    }

def default_dynamic_text():
    return {
        "en": {
            "Dashboard": "Dashboard",
            "Folders": "Folder Explorer",
            "MOUs": "MOUs & Agreements",
            "Users": "User Management",
            "Settings": "Settings & Customizer",
            "Upload": "Upload Files",
            "Delete": "Delete",
            "Edit": "Edit",
            "Save": "Save Changes",
            "Cancel": "Cancel"
        },
        "ta": {
            "Dashboard": "முகப்பு பலகை",
            "Folders": "கோப்பு உலாவி",
            "MOUs": "புரிந்துணர்வு ஒப்பந்தங்கள்",
            "Users": "பயனர் மேலாண்மை",
            "Settings": "அமைப்புகள்",
            "Upload": "கோப்புகளை பதிவேற்றுக",
            "Delete": "நீக்குக",
            "Edit": "திருத்துக",
            "Save": "சேமிக்க",
            "Cancel": "ரத்துசெய்"
        }
    }

def default_custom_code():
    return {
        "custom_css": "/* Global Custom CSS injected by Super Admin */\n.custom-accent-badge { border-radius: 20px; }",
        "custom_js": "// Global Custom JavaScript injected by Super Admin\nconsole.log('MCC Customization Script Loaded');",
        "custom_html_head": "",
        "custom_html_body": ""
    }


class WebsiteCustomization(models.Model):
    name = models.CharField(max_length=100, default="Default Configuration", unique=True)
    is_active = models.BooleanField(default=True)
    
    info = models.JSONField(default=default_info)
    branding = models.JSONField(default=default_branding)
    theme = models.JSONField(default=default_theme)
    navigation = models.JSONField(default=default_navigation)
    pages = models.JSONField(default=dict)
    login = models.JSONField(default=default_login)
    dashboard = models.JSONField(default=default_dashboard)
    footer = models.JSONField(default=default_footer)
    notification = models.JSONField(default=default_notification)
    email_templates = models.JSONField(default=default_email_templates)
    error_pages = models.JSONField(default=default_error_pages)
    dynamic_text = models.JSONField(default=default_dynamic_text)
    custom_code = models.JSONField(default=default_custom_code)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customization_updates"
    )

    class Meta:
        verbose_name = "Website Customization"
        verbose_name_plural = "Website Customizations"

    def __str__(self):
        return f"{self.name} (Active: {self.is_active})"

    @classmethod
    def get_active_config(cls):
        config = cls.objects.filter(is_active=True).first()
        if not config:
            config = cls.objects.create(name="Default System Configuration", is_active=True)
        else:
            # Auto-populate any missing keys from defaults and delete obsolete ones
            info_changed = False
            if not isinstance(config.info, dict):
                config.info = {}
                info_changed = True
            
            # 1. Delete obsolete keys
            valid_keys = default_info().keys()
            obsolete_keys = [k for k in config.info.keys() if k not in valid_keys]
            for k in obsolete_keys:
                del config.info[k]
                info_changed = True

            # 2. Add missing keys
            for k, v in default_info().items():
                if k not in config.info:
                    config.info[k] = v
                    info_changed = True
            
            # 3. Migrate login config keys
            login_changed = False
            if not isinstance(config.login, dict):
                config.login = {}
                login_changed = True
            
            valid_login_keys = default_login().keys()
            obsolete_login_keys = [k for k in config.login.keys() if k not in valid_login_keys]
            for k in obsolete_login_keys:
                del config.login[k]
                login_changed = True
            
            for k, v in default_login().items():
                if k not in config.login:
                    config.login[k] = v
                    login_changed = True
            
            if info_changed or login_changed:
                config.save()
        return config
