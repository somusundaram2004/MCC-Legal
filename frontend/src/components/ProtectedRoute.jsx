import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessRoute } from '../config/roles';
import LoadingScreen from './LoadingScreen';
import Forbidden403 from '../pages/Forbidden403';

const ProtectedRoute = ({ children, requiredPermission, blockUserRole, onlySuperAdmin }) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen loading={true} message="Verifying session..." />;
  }

  if (!user) {
    const nextParam = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(nextParam)}`} replace />;
  }

  // 1. Central role route verification
  if (!canAccessRoute(user, location.pathname)) {
    return <Forbidden403 deniedPath={location.pathname} />;
  }

  // 2. Legacy guard fallbacks
  if (blockUserRole && user.role?.name?.toLowerCase() === 'user') {
    return <Forbidden403 deniedPath={location.pathname} />;
  }

  if (onlySuperAdmin && user.role?.name !== 'Super Admin' && !user.is_superuser) {
    return <Forbidden403 deniedPath={location.pathname} />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Forbidden403 deniedPath={location.pathname} />;
  }

  return children;
};

export default ProtectedRoute;
