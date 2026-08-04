import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeModeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FolderExplorer from './pages/FolderExplorer';
import UserManagement from './pages/UserManagement';
import ActivityLog from './pages/ActivityLog';
import Profile from './pages/Profile';
import SystemMap from './pages/SystemMap';
import MOUDetail from './pages/MOUDetail';
import MOUCreate from './pages/MOUCreate';

import Templates from './pages/Templates';
import TemplateDetail from './pages/TemplateDetail';
import MasterData from './pages/MasterData';
import SharedWithMe from './pages/SharedWithMe';
import Departments from './pages/Departments';
import NotificationsPage from './pages/NotificationsPage';
import Settings from './pages/Settings';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';

import { SiteTimeProvider } from './context/SiteTimeContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';

const GOOGLE_LOGIN_CLIENT_ID = (import.meta.env.VITE_GOOGLE_LOGIN_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim() 
  || "866710282157-csj1nb61f10tstlkjog2gm7uvf0gnm4i.apps.googleusercontent.com";

console.log("[Google Login Audit] Dedicated Google Login Client ID:", GOOGLE_LOGIN_CLIENT_ID);
console.log("[Google Login Audit] Current Origin:", window.location.origin);
console.log("[Google Login Audit] Current URL:", window.location.href);

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_LOGIN_CLIENT_ID}>
      <Toaster position="top-center" reverseOrder={false} />
      <Router>
        <ThemeModeProvider>
          <SiteTimeProvider>
            <AuthProvider>
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
                <ProtectedRoute requiredPermission="view_dashboard" blockUserRole={true}>
                  <Layout><Departments /></Layout>
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

            {/* /master-data is now merged into System Settings → redirect old links */}
            <Route path="/master-data" element={<Navigate to="/settings" replace />} />

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
                <ProtectedRoute requiredPermission="view_dashboard" blockUserRole={true}>
                  <Layout><Settings /></Layout>
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
              path="/users"
              element={
                <ProtectedRoute requiredPermission="manage_users" blockUserRole={true}>
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

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </SiteTimeProvider>
    </ThemeModeProvider>
  </Router>
</GoogleOAuthProvider>
);
}

export default App;
