from django.urls import path
from .views_import_export import (
    ImportExportTreeView,
    ExportPreviewView,
    ExportDownloadView,
    ExportToDriveView,
    ImportPreviewView,
    ImportExecuteView,
    GoogleDriveBrowseView
)

urlpatterns = [
    path('tree/', ImportExportTreeView.as_view(), name='import_export_tree'),
    path('drive-browser/', GoogleDriveBrowseView.as_view(), name='google_drive_browser'),
    path('export/preview/', ExportPreviewView.as_view(), name='export_preview'),
    path('export/download/', ExportDownloadView.as_view(), name='export_download'),
    path('export/drive/', ExportToDriveView.as_view(), name='export_to_drive'),
    path('import/preview/', ImportPreviewView.as_view(), name='import_preview'),
    path('import/execute/', ImportExecuteView.as_view(), name='import_execute'),
]
