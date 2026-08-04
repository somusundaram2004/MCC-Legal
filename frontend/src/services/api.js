import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach access token and custom time header to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
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

// Response Interceptor: Handle transparent token refreshing on 401
api.interceptors.response.use(
  (response) => response,
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
          const res = await axios.post('http://127.0.0.1:8000/api/users/auth/refresh/', {
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
