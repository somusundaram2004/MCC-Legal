import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach access token and custom time header to requests
api.interceptors.request.use(
  (config) => {
    const isPublicEndpoint = config.url && (
      config.url.includes('/auth/login/') ||
      config.url.includes('/auth/google/') ||
      config.url.includes('/auth/google-client-id/') ||
      config.url.includes('/auth/register/') ||
      config.url.includes('/auth/forgot-password/') ||
      config.url.includes('/auth/reset-password/')
    );

    const token = localStorage.getItem('access_token');
    if (token && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Attach simulated clock time if enabled
    const isCustom = localStorage.getItem('site_time_is_custom') === 'true';
    if (isCustom) {
      const customTime = localStorage.getItem('site_time_custom_val');
      if (customTime) {
        config.headers['X-Custom-Time'] = customTime;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

import { triggerGlobalAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';

// Helper to determine affected category from API URL
const getCategoryFromUrl = (url = '') => {
  const lower = url.toLowerCase();
  if (lower.includes('/folders/') || lower.includes('/files/')) return REFRESH_CATEGORIES.FOLDERS;
  if (lower.includes('/mous/') || lower.includes('/mou')) return REFRESH_CATEGORIES.MOUS;
  if (lower.includes('/users/') || lower.includes('/roles/')) return REFRESH_CATEGORIES.USERS;
  if (lower.includes('/departments/')) return REFRESH_CATEGORIES.DEPARTMENTS;
  if (lower.includes('/templates/')) return REFRESH_CATEGORIES.TEMPLATES;
  if (lower.includes('/notifications/')) return REFRESH_CATEGORIES.NOTIFICATIONS;
  if (lower.includes('/settings/') || lower.includes('/google-drive/')) return REFRESH_CATEGORIES.SETTINGS;
  if (lower.includes('/activity-logs/')) return REFRESH_CATEGORIES.ACTIVITY_LOGS;
  return REFRESH_CATEGORIES.ALL;
};

// Response Interceptor: Handle transparent token refreshing on 401 & dispatch auto refresh
api.interceptors.response.use(
  (response) => {
    // Automatically trigger data refresh on successful state mutations (POST, PUT, PATCH, DELETE)
    const method = response.config?.method?.toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const url = response.config?.url || '';
      // Exclude authentication/login requests
      if (!url.includes('/auth/login') && !url.includes('/auth/google') && !url.includes('/auth/refresh')) {
        const category = getCategoryFromUrl(url);
        triggerGlobalAutoRefresh(category);
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Do not attempt token refresh for login/auth endpoints
    const isAuthEndpoint = originalRequest && originalRequest.url && (
      originalRequest.url.includes('/auth/login/') ||
      originalRequest.url.includes('/auth/google/') ||
      originalRequest.url.includes('/auth/refresh/') ||
      originalRequest.url.includes('/auth/forgot-password/') ||
      originalRequest.url.includes('/auth/reset-password/')
    );

    // Check if error is 401 (Unauthorized) and we haven't already retried
    if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          // Attempt to refresh token
          const res = await axios.post(`${API_BASE_URL}/api/users/auth/refresh/`, {
            refresh: refreshToken,
          });
          
          if (res.status === 200) {
            const { access, refresh } = res.data;
            
            // Store new tokens
            localStorage.setItem('access_token', access);
            if (refresh) {
              localStorage.setItem('refresh_token', refresh);
            }
            
            // Re-auth header and retry original request
            originalRequest.headers.Authorization = `Bearer ${access}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh token expired or failed -> Force logout
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
