from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MOUTemplateListCreateView, MOUTemplateDetailView,
    MOUListCreateView, MOUDetailView,
    MOUSubmitSignedView, MOUApproveRejectView,
    MOURenewView, MOUReportsView,
    MOUShareView, MOUShareDeleteView,
    DepartmentSubmissionView, DepartmentSubmissionReviewView,
    MOUSharedDashboardView,
    TemplateCategoryViewSet, OrganizationTypeViewSet, CollaborationTypeViewSet,
    DocumentTypeViewSet, TagViewSet, DepartmentCategoryViewSet, DepartmentViewSet,
    TemplateCollectionViewSet, TemplateDocumentViewSet, MOUCategoryViewSet, StreamViewSet
)

router = DefaultRouter()
router.register('master/categories', TemplateCategoryViewSet, basename='master-category')
router.register('master/org-types', OrganizationTypeViewSet, basename='master-org-type')
router.register('master/collab-types', CollaborationTypeViewSet, basename='master-collab-type')
router.register('master/doc-types', DocumentTypeViewSet, basename='master-doc-type')
router.register('master/tags', TagViewSet, basename='master-tag')
router.register('master/dept-categories', DepartmentCategoryViewSet, basename='master-dept-category')
router.register('master/departments', DepartmentViewSet, basename='master-department')
router.register('master/streams', StreamViewSet, basename='master-stream')
router.register('collections', TemplateCollectionViewSet, basename='template-collection')
router.register('documents', TemplateDocumentViewSet, basename='template-document')
router.register('categories', MOUCategoryViewSet, basename='mou-category')

urlpatterns = [
    path('templates/', MOUTemplateListCreateView.as_view(), name='mou-template-list-create'),
    path('templates/<int:pk>/', MOUTemplateDetailView.as_view(), name='mou-template-detail'),
    path('', MOUListCreateView.as_view(), name='mou-list-create'),
    path('<int:pk>/', MOUDetailView.as_view(), name='mou-detail'),
    path('<int:pk>/submit-signed/', MOUSubmitSignedView.as_view(), name='mou-submit-signed'),
    path('<int:pk>/approve-reject/', MOUApproveRejectView.as_view(), name='mou-approve-reject'),
    path('<int:pk>/renew/', MOURenewView.as_view(), name='mou-renew'),
    path('reports/stats/', MOUReportsView.as_view(), name='mou-reports-stats'),
    
    # Sharing & Department Collaboration
    path('<int:pk>/share/', MOUShareView.as_view(), name='mou-share'),
    path('shares/<int:pk>/', MOUShareDeleteView.as_view(), name='mou-share-delete'),
    path('submissions/', DepartmentSubmissionView.as_view(), name='mou-submission'),
    path('submissions/<int:pk>/review/', DepartmentSubmissionReviewView.as_view(), name='mou-submission-review'),
    path('shared-dashboard/', MOUSharedDashboardView.as_view(), name='mou-shared-dashboard'),
    
    # Include Router ViewSets
    path('', include(router.urls)),
]
