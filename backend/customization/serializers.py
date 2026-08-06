from rest_framework import serializers
from .models import WebsiteCustomization

class WebsiteCustomizationSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.ReadOnlyField(source='updated_by.name', default='System')

    class Meta:
        model = WebsiteCustomization
        fields = [
            'id',
            'name',
            'is_active',
            'info',
            'branding',
            'theme',
            'navigation',
            'pages',
            'login',
            'dashboard',
            'footer',
            'notification',
            'email_templates',
            'error_pages',
            'dynamic_text',
            'custom_code',
            'updated_at',
            'updated_by_name'
        ]
