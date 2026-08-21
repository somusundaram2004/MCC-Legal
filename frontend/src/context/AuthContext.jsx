import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Restore user session from tokens on startup
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const cachedUser = localStorage.getItem('user');

    if (accessToken) {
      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          setUser(null);
        }
        setLoading(false);
      } else {
        fetchCurrentUser();
      }
    } else {
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
      {!loading && children}
    </AuthContext.Provider>
  );
};
