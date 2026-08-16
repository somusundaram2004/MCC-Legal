import api from './api';

// --- Master Data Endpoints ---
export const getMasterCategories = () => api.get('/api/mous/master/categories/').then(res => res.data);
export const createMasterCategory = (data) => api.post('/api/mous/master/categories/', data).then(res => res.data);
export const updateMasterCategory = (id, data) => api.put(`/api/mous/master/categories/${id}/`, data).then(res => res.data);
export const deleteMasterCategory = (id) => api.delete(`/api/mous/master/categories/${id}/`).then(res => res.data);

export const getMasterOrgTypes = () => api.get('/api/mous/master/org-types/').then(res => res.data);
export const createMasterOrgType = (data) => api.post('/api/mous/master/org-types/', data).then(res => res.data);
export const updateMasterOrgType = (id, data) => api.put(`/api/mous/master/org-types/${id}/`, data).then(res => res.data);
export const deleteMasterOrgType = (id) => api.delete(`/api/mous/master/org-types/${id}/`).then(res => res.data);

export const getMasterCollabTypes = () => api.get('/api/mous/master/collab-types/').then(res => res.data);
export const createMasterCollabType = (data) => api.post('/api/mous/master/collab-types/', data).then(res => res.data);
export const updateMasterCollabType = (id, data) => api.put(`/api/mous/master/collab-types/${id}/`, data).then(res => res.data);
export const deleteMasterCollabType = (id) => api.delete(`/api/mous/master/collab-types/${id}/`).then(res => res.data);

export const getMasterDocTypes = () => api.get('/api/mous/master/doc-types/').then(res => res.data);
export const createMasterDocType = (data) => api.post('/api/mous/master/doc-types/', data).then(res => res.data);
export const updateMasterDocType = (id, data) => api.put(`/api/mous/master/doc-types/${id}/`, data).then(res => res.data);
export const deleteMasterDocType = (id) => api.delete(`/api/mous/master/doc-types/${id}/`).then(res => res.data);

export const getMasterTags = () => api.get('/api/mous/master/tags/').then(res => res.data);
export const createMasterTag = (data) => api.post('/api/mous/master/tags/', data).then(res => res.data);
export const updateMasterTag = (id, data) => api.put(`/api/mous/master/tags/${id}/`, data).then(res => res.data);
export const deleteMasterTag = (id) => api.delete(`/api/mous/master/tags/${id}/`).then(res => res.data);

export const getMasterDeptCategories = () => api.get('/api/mous/master/dept-categories/').then(res => res.data);
export const createMasterDeptCategory = (data) => api.post('/api/mous/master/dept-categories/', data).then(res => res.data);
export const updateMasterDeptCategory = (id, data) => api.put(`/api/mous/master/dept-categories/${id}/`, data).then(res => res.data);
export const deleteMasterDeptCategory = (id) => api.delete(`/api/mous/master/dept-categories/${id}/`).then(res => res.data);

export const getMasterDepartments = (params = {}) => api.get('/api/mous/master/departments/', { params }).then(res => res.data);
export const createMasterDepartment = (data) => api.post('/api/mous/master/departments/', data).then(res => res.data);
export const updateMasterDepartment = (id, data) => api.put(`/api/mous/master/departments/${id}/`, data).then(res => res.data);
export const deleteMasterDepartment = (id) => api.delete(`/api/mous/master/departments/${id}/`).then(res => res.data);

export const getMasterStreams = (params = {}) => api.get('/api/mous/master/streams/', { params }).then(res => res.data);
export const createMasterStream = (data) => api.post('/api/mous/master/streams/', data).then(res => res.data);
export const updateMasterStream = (id, data) => api.put(`/api/mous/master/streams/${id}/`, data).then(res => res.data);
export const deleteMasterStream = (id) => api.delete(`/api/mous/master/streams/${id}/`).then(res => res.data);


// --- Template Collections Endpoints ---
export const getTemplateCollections = (params = {}) => api.get('/api/mous/collections/', { params }).then(res => res.data);
export const getTemplateCollection = (id) => api.get(`/api/mous/collections/${id}/`).then(res => res.data);
export const createTemplateCollection = (data) => api.post('/api/mous/collections/', data).then(res => res.data);
export const updateTemplateCollection = (id, data) => api.put(`/api/mous/collections/${id}/`, data).then(res => res.data);
export const deleteTemplateCollection = (id) => api.delete(`/api/mous/collections/${id}/`).then(res => res.data);
export const getTemplateStats = () => api.get('/api/mous/collections/stats/').then(res => res.data);

// --- Upload Template Document inside Collection ---
export const uploadTemplateDocument = (collectionId, formData) => {
  return api.post(`/api/mous/collections/${collectionId}/upload-document/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }).then(res => res.data);
};

// --- Template Documents Endpoints ---
export const logDocumentPreview = (id) => api.get(`/api/mous/documents/${id}/log-preview/`).then(res => res.data);
export const logDocumentDownload = (id) => api.get(`/api/mous/documents/${id}/log-download/`).then(res => res.data);
export const archiveTemplateDocument = (id) => api.post(`/api/mous/documents/${id}/archive/`).then(res => res.data);
export const sendTemplateDocumentEmail = (id, data) => api.post(`/api/mous/documents/${id}/send-email/`, data).then(res => res.data);

export const getMOUCategories = () => api.get('/api/mous/categories/').then(res => res.data);
export const createMOUCategory = (data) => api.post('/api/mous/categories/', data).then(res => res.data);
export const deleteMOUCategory = (id) => api.delete(`/api/mous/categories/${id}/`).then(res => res.data);


