import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessRoute } from '../config/roles';
import LoadingScreen from './LoadingScreen';
import Forbidden403 from '../pages/Forbidden403';

export default function RoleGuard({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen loading={true} message="Verifying security credentials..." />;
  }

  if (!user) {
    const nextParam = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(nextParam)}`} replace />;
  }

  // Enforce central role permissions
  const isAllowed = canAccessRoute(user, location.pathname);
  if (!isAllowed) {
    return <Forbidden403 deniedPath={location.pathname} />;
  }

  return children;
}
