import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { isTokenExpired } from '../services/api';
import LoadingScreen from '../components/LoadingScreen';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Synchronously initialize cached user to avoid rendering empty screen on load
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // If a cached user already exists, loading is immediately false so UI renders without delay
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('user');
      if (cached) return false;
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      return Boolean(accessToken || refreshToken);
    } catch {
      return false;
    }
  });

  // Function to load the currently authenticated user details
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get('/api/users/me/');
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
    } catch (error) {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore user session from tokens on startup and validate with backend
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    const hasValidAccess = accessToken && !isTokenExpired(accessToken, 5);
    const hasValidRefresh = refreshToken && !isTokenExpired(refreshToken, 5);

    if (hasValidAccess || hasValidRefresh) {
      // Validate token (api.js proactively refreshes if access expired) and refresh permissions
      fetchCurrentUser();
    } else {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/api/users/auth/login/', { email, password });
      const { access, refresh, user: loggedUser } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Google Login handler
  const googleLogin = async (googlePayload) => {
    setLoading(true);
    try {
      const payload = typeof googlePayload === 'string' 
        ? { credential: googlePayload } 
        : googlePayload;
      const response = await api.post('/api/users/auth/google/', payload);
      const { access, refresh, user: loggedUser } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return loggedUser;
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Helper to dynamically check permissions on the client side
  const hasPermission = useCallback((codename) => {
    if (!user) return false;
    
    // Super Admins automatically bypass any permission constraints
    if (user.role && user.role.name === 'Super Admin') return true;
    
    // Check if the permission codename is present in the active_permissions array
    return user.active_permissions && user.active_permissions.includes(codename);
  }, [user]);

  const value = {
    user,
    loading,
    login,
    googleLogin,
    logout,
    hasPermission,
    refreshUser: fetchCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <LoadingScreen loading={true} message="Authenticating session..." />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
