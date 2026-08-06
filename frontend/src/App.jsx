import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider } from './context/ThemeContext';
import { SiteTimeProvider } from './context/SiteTimeContext';
import { SiteCustomizationProvider } from './context/SiteCustomizationContext';
import { AutoRefreshProvider, useAutoRefresh, REFRESH_CATEGORIES } from './context/AutoRefreshContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import api from './services/api';

// Lazy Loaded Page Components
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FolderExplorer = lazy(() => import('./pages/FolderExplorer'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ActivityLog = lazy(() => import('./pages/ActivityLog'));
const Profile = lazy(() => import('./pages/Profile'));
const SystemMap = lazy(() => import('./pages/SystemMap'));
const MOUDetail = lazy(() => import('./pages/MOUDetail'));
const MOUCreate = lazy(() => import('./pages/MOUCreate'));
const Templates = lazy(() => import('./pages/Templates'));
const TemplateDetail = lazy(() => import('./pages/TemplateDetail'));
const SharedWithMe = lazy(() => import('./pages/SharedWithMe'));
const Departments = lazy(() => import('./pages/Departments'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const Settings = lazy(() => import('./pages/Settings'));
const Register = lazy(() => import('./pages/Register'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const DynamicPageContainer = lazy(() => import('./pages/DynamicPageContainer'));

// Dynamic Google OAuth Provider Wrapper
const DynamicGoogleOAuthProvider = ({ children }) => {
  const [googleClientId, setGoogleClientId] = useState(
    (import.meta.env.VITE_GOOGLE_LOGIN_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
  );

  const fetchGoogleClientId = React.useCallback(() => {
    api.get('/api/users/auth/google-client-id/')
      .then((res) => {
        if (res.data?.client_id) {
          setGoogleClientId(res.data.client_id.trim());
        }
      })
      .catch((err) => {
        console.debug('Failed to fetch dynamic Google Client ID:', err);
      });
  }, []);

  useEffect(() => {
    fetchGoogleClientId();
  }, [fetchGoogleClientId]);

  // Dynamically update Google Client ID whenever Super Admin changes OAuth settings
  useAutoRefresh(REFRESH_CATEGORIES.SETTINGS, fetchGoogleClientId);

  return (
    <GoogleOAuthProvider clientId={googleClientId || '1234567890-placeholder.apps.googleusercontent.com'}>
      {children}
    </GoogleOAuthProvider>
  );
};

function App() {
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        <SiteCustomizationProvider>
          <ThemeModeProvider>
            <SiteTimeProvider>
              <AutoRefreshProvider>
                <DynamicGoogleOAuthProvider>
                  <AuthProvider>
                    <Suspense fallback={<LoadingScreen loading={true} message="Loading module..." />}>
                  <Routes>
                    {/* Public Login & Register Pages */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* Protected Application Routes */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute requiredPermission="view_dashboard">
                          <Layout><Dashboard /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/explorer"
                      element={
                        <ProtectedRoute requiredPermission="view_folder">
                          <Layout><FolderExplorer /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/folders"
                      element={
                        <ProtectedRoute requiredPermission="view_folder">
                          <Layout><FolderExplorer /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute requiredPermission="manage_users">
                          <Layout><UserManagement /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/logs"
                      element={
                        <ProtectedRoute requiredPermission="manage_users">
                          <Layout><ActivityLog /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/mou/create"
                      element={
                        <ProtectedRoute requiredPermission="view_dashboard">
                          <Layout><MOUCreate /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/mou/:id"
                      element={
                        <ProtectedRoute requiredPermission="view_dashboard">
                          <Layout><MOUDetail /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/templates"
                      element={
                        <ProtectedRoute requiredPermission="manage_users">
                          <Layout><Templates /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/template-detail/:id"
                      element={
                        <ProtectedRoute requiredPermission="manage_users">
                          <Layout><TemplateDetail /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route path="/master-data" element={<Navigate to="/settings" replace />} />

                    <Route
                      path="/shared"
                      element={
                        <ProtectedRoute requiredPermission="view_dashboard">
                          <Layout><SharedWithMe /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/departments"
                      element={
                        <ProtectedRoute requiredPermission="view_dashboard">
                          <Layout><Departments /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/notifications"
                      element={
                        <ProtectedRoute requiredPermission="view_notifications">
                          <Layout><NotificationsPage /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute requiredPermission="view_dashboard">
                          <Layout><Settings /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute>
                          <Layout><Profile /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/system-map"
                      element={
                        <ProtectedRoute requiredPermission="view_dashboard">
                          <Layout><SystemMap /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/custom-page/:slug"
                      element={
                        <ProtectedRoute>
                          <Layout><DynamicPageContainer /></Layout>
                        </ProtectedRoute>
                      }
                    />

                    {/* Fallback redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </AuthProvider>
              </DynamicGoogleOAuthProvider>
            </AutoRefreshProvider>
          </SiteTimeProvider>
        </ThemeModeProvider>
      </SiteCustomizationProvider>
    </Router>
  </>
);
}

export default App;
