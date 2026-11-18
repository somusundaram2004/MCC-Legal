import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { triggerGlobalAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';

const getApiBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  const isLoopback = envUrl.includes('127.0.0.1') || envUrl.includes('localhost');
  
  // In production builds or when accessed from a production domain, never use loopback / localhost
  if (import.meta.env.PROD || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')) {
    return isLoopback ? '' : envUrl;
  }
  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();

export const isTokenExpired = (token, bufferSeconds = 30) => {
  if (!token || typeof token !== 'string') return true;
  try {
    const decoded = jwtDecode(token);
    if (!decoded || typeof decoded.exp !== 'number') return true;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return decoded.exp <= nowSeconds + bufferSeconds;
  } catch {
    return true;
  }
};

const clearSessionAndRedirect = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  if (typeof window !== 'undefined') {
    const isPublicPage = ['/login', '/register', '/reset-password'].some((p) =>
      window.location.pathname.startsWith(p)
    );
    if (!isPublicPage) {
      window.location.href = '/login';
    }
  }
};

let refreshPromise = null;

export const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken || isTokenExpired(refreshToken, 5)) {
    clearSessionAndRedirect();
    return null;
  }

  refreshPromise = axios
    .post(`${API_BASE_URL}/api/users/auth/refresh/`, {
      refresh: refreshToken,
    })
    .then((res) => {
      if (res.status === 200 && res.data?.access) {
        const { access, refresh } = res.data;
        localStorage.setItem('access_token', access);
        if (refresh) {
          localStorage.setItem('refresh_token', refresh);
        }
        return access;
      }
      clearSessionAndRedirect();
      return null;
    })
    .catch((err) => {
      clearSessionAndRedirect();
      throw err;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach valid access token (proactively refreshing if expired) and custom time header
api.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    const isPublicEndpoint = config.url && (
      config.url.includes('/auth/login/') ||
      config.url.includes('/auth/google/') ||
      config.url.includes('/auth/google-client-id/') ||
      config.url.includes('/auth/refresh/') ||
      config.url.includes('/auth/register/') ||
      config.url.includes('/auth/forgot-password/') ||
      config.url.includes('/auth/reset-password/') ||
      (config.url.includes('/users/invitation/') && method === 'get') ||
      config.url.includes('/users/register/') ||
      (config.url.includes('/customization/') && method === 'get')
    );

    if (!isPublicEndpoint) {
      let token = localStorage.getItem('access_token');
      if (!token || isTokenExpired(token, 30)) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken && !isTokenExpired(refreshToken, 5)) {
          try {
            token = await refreshAccessToken();
          } catch {
            return Promise.reject(new axios.CanceledError('Session expired.'));
          }
        } else {
          clearSessionAndRedirect();
          return Promise.reject(new axios.CanceledError('No valid authentication token.'));
        }
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
    const reqMethod = (originalRequest?.method || 'get').toLowerCase();
    
    // Do not attempt token refresh for login/auth/invitation GET endpoints
    const isAuthEndpoint = originalRequest && originalRequest.url && (
      originalRequest.url.includes('/auth/login/') ||
      originalRequest.url.includes('/auth/google/') ||
      originalRequest.url.includes('/auth/refresh/') ||
      originalRequest.url.includes('/auth/forgot-password/') ||
      originalRequest.url.includes('/auth/reset-password/') ||
      (originalRequest.url.includes('/users/invitation/') && reqMethod === 'get') ||
      originalRequest.url.includes('/users/register/')
    );

    // Check if error is 401 (Unauthorized) and we haven't already retried
    if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const newAccess = await refreshAccessToken();
        if (newAccess) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
