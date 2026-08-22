import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, Typography, Button } from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';

const ProtectedRoute = ({ children, requiredPermission, blockUserRole, onlySuperAdmin }) => {
  const { user, loading, hasPermission, logout } = useAuth();

  if (loading) {
    return null; // AuthContext handles loading internally, or we can render a spinner
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (blockUserRole && user.role?.name?.toLowerCase() === 'user') {
    return <Navigate to="/" replace />;
  }

  if (onlySuperAdmin && user.role?.name !== 'Super Admin') {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    const { logout } = useAuth();
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '80vh', 
          textAlign: 'center', 
          p: 3 
        }}
      >
        <LockPersonIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 450, mb: 3 }}>
          You do not have the required permissions (<code>{requiredPermission}</code>) to view this module. 
          Please contact your administrator if you believe this is an error.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {hasPermission('view_folder') ? (
            <Button variant="contained" href="/explorer" sx={{ px: 3, borderRadius: '10px' }}>
              Go to Explorer
            </Button>
          ) : (
            <Button variant="contained" href="/" sx={{ px: 3, borderRadius: '10px' }}>
              Go to Dashboard
            </Button>
          )}
          <Button 
            variant="outlined" 
            color="error" 
            onClick={() => {
              logout();
              window.location.href = '/login';
            }} 
            sx={{ px: 3, borderRadius: '10px' }}
          >
            Log Out / Switch Account
          </Button>
        </Box>
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;
