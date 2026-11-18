import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, Typography, Button } from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = ({ children, requiredPermission, blockUserRole, onlySuperAdmin }) => {
  const { user, loading, hasPermission, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen loading={true} message="Verifying session..." />;
  }

  if (!user) {
    const nextParam = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(nextParam)}`} replace />;
  }

  if (blockUserRole && user.role?.name?.toLowerCase() === 'user') {
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
          Department management is restricted to administrators and coordinators. Your current role does not have permission to view it.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" href="/" sx={{ px: 3, borderRadius: '10px' }}>
            Go to Dashboard
          </Button>
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

  if (onlySuperAdmin && user.role?.name !== 'Super Admin') {
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
          Site Settings are restricted to Super Administrators only. Please contact your system administrator if you require access.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" href="/" sx={{ px: 3, borderRadius: '10px' }}>
            Go to Dashboard
          </Button>
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

  if (requiredPermission && !hasPermission(requiredPermission)) {
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
