from django.contrib import admin
from .models import WebsiteCustomization

@admin.register(WebsiteCustomization)
class WebsiteCustomizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'updated_at', 'updated_by')
    list_filter = ('is_active',)
    search_fields = ('name',)
