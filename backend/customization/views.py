import json
import os
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
from .models import (
    WebsiteCustomization, default_info, default_branding, default_theme,
    default_navigation, default_login, default_dashboard, default_footer,
    default_notification, default_email_templates, default_error_pages,
    default_dynamic_text, default_custom_code
)
from .serializers import WebsiteCustomizationSerializer
from activity_logs.utils import log_activity


class IsSuperAdminOrReadOnly(permissions.BasePermission):
    """
    Allow any user (or unauthenticated guest) to READ settings.
    Only Super Admins (or staff with Super Admin role) can modify settings.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user 
            and request.user.is_authenticated 
            and (
                request.user.is_superuser 
                or (request.user.role and request.user.role.name == "Super Admin")
            )
        )


class WebsiteCustomizationViewSet(viewsets.ViewSet):
    permission_classes = [IsSuperAdminOrReadOnly]

    def list(self, request):
        config = WebsiteCustomization.get_active_config()
        serializer = WebsiteCustomizationSerializer(config)
        response = Response(serializer.data)
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        return response

    @action(detail=False, methods=['patch'], url_path='update-section')
    def update_section(self, request):
        section = request.data.get('section')
        section_data = request.data.get('data')

        if not section or section_data is None:
            return Response(
                {"detail": "Both 'section' and 'data' fields are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_sections = [
            'info', 'branding', 'theme', 'navigation', 'pages',
            'login', 'dashboard', 'footer', 'notification',
            'email_templates', 'error_pages', 'dynamic_text', 'custom_code'
        ]

        if section not in valid_sections:
            return Response(
                {"detail": f"Invalid section. Must be one of: {', '.join(valid_sections)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        config = WebsiteCustomization.get_active_config()
        setattr(config, section, section_data)
        config.updated_by = request.user if request.user.is_authenticated else None
        config.save()

        if request.user and request.user.is_authenticated:
            log_activity(request.user, f"Updated customization section: '{section}'", "customization")

        serializer = WebsiteCustomizationSerializer(config)
        return Response({
            "detail": f"Section '{section}' updated successfully.",
            "config": serializer.data
        })

    @action(detail=False, methods=['post'], url_path='upload-asset')
    def upload_asset(self, request):
        file_obj = request.FILES.get('file')
        asset_key = request.data.get('asset_key', 'asset')

        if not file_obj:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        # File validation
        allowed_extensions = ['.jpg', '.jpeg', '.png', '.svg', '.gif', '.webp', '.ico']
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in allowed_extensions:
            return Response(
                {"detail": f"File type not supported. Allowed: {', '.join(allowed_extensions)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        filename = f"customization/{asset_key}_{file_obj.name}"
        saved_path = default_storage.save(filename, ContentFile(file_obj.read()))
        media_url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)

        # Update active config
        config = WebsiteCustomization.get_active_config()
        branding_data = dict(config.branding)
        branding_data[asset_key] = media_url
        config.branding = branding_data
        config.save()

        if request.user and request.user.is_authenticated:
            log_activity(request.user, f"Uploaded customization asset: '{asset_key}'", "customization")

        return Response({
            "detail": f"Asset '{asset_key}' uploaded successfully.",
            "asset_url": media_url,
            "branding": config.branding
        })

    @action(detail=False, methods=['get'], url_path='export-json')
    def export_json(self, request):
        config = WebsiteCustomization.get_active_config()
        serializer = WebsiteCustomizationSerializer(config)
        data_json = json.dumps(serializer.data, indent=2)
        response = Response(data_json, content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="mcc_website_customization.json"'
        return response

    @action(detail=False, methods=['post'], url_path='import-json')
    def import_json(self, request):
        json_file = request.FILES.get('file')
        if not json_file:
            # Check raw JSON body payload
            payload = request.data.get('payload')
            if payload:
                try:
                    data = json.loads(payload) if isinstance(payload, str) else payload
                except Exception as e:
                    return Response({"detail": f"Invalid JSON payload: {e}"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"detail": "Please attach a JSON file or JSON payload."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            try:
                data = json.loads(json_file.read().decode('utf-8'))
            except Exception as e:
                return Response({"detail": f"Failed to parse JSON file: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        config = WebsiteCustomization.get_active_config()
        sections = ['info', 'branding', 'theme', 'navigation', 'pages', 'login', 'dashboard', 'footer', 'notification', 'email_templates', 'error_pages', 'dynamic_text', 'custom_code']
        for sec in sections:
            if sec in data and isinstance(data[sec], (dict, list)):
                setattr(config, sec, data[sec])
        
        config.updated_by = request.user if request.user.is_authenticated else None
        config.save()

        if request.user and request.user.is_authenticated:
            log_activity(request.user, "Imported complete website customization backup", "customization")

        serializer = WebsiteCustomizationSerializer(config)
        return Response({
            "detail": "Website customization imported successfully!",
            "config": serializer.data
        })

    @action(detail=False, methods=['post'], url_path='reset-defaults')
    def reset_defaults(self, request):
        config = WebsiteCustomization.get_active_config()
        config.info = default_info()
        config.branding = default_branding()
        config.theme = default_theme()
        config.navigation = default_navigation()
        config.pages = {}
        config.login = default_login()
        config.dashboard = default_dashboard()
        config.footer = default_footer()
        config.notification = default_notification()
        config.email_templates = default_email_templates()
        config.error_pages = default_error_pages()
        config.dynamic_text = default_dynamic_text()
        config.custom_code = default_custom_code()
        config.updated_by = request.user if request.user.is_authenticated else None
        config.save()

        if request.user and request.user.is_authenticated:
            log_activity(request.user, "Reset website customization to factory defaults", "customization")

        serializer = WebsiteCustomizationSerializer(config)
        return Response({
            "detail": "Customization reset to factory defaults successfully.",
            "config": serializer.data
        })
