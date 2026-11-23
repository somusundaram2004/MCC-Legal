import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleBadge } from '../config/roles';

export default function Forbidden403({ deniedPath }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const roleBadge = getRoleBadge(user);

  return (
    <Box
      sx={{
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 580,
          width: '100%',
          p: { xs: 3.5, sm: 5 },
          borderRadius: '20px',
          textAlign: 'center',
          border: '1px solid var(--legal-gold-rule, #b8892b)',
          backgroundColor: 'var(--legal-cream-card, #ffffff)',
          boxShadow: '0 12px 36px rgba(11, 26, 58, 0.08)',
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
            border: '2px solid var(--legal-gold, #d4a82f)',
          }}
        >
          <GavelIcon sx={{ fontSize: 44, color: 'var(--legal-navy, #0b1a3a)' }} />
        </Box>

        <Typography
          variant="overline"
          sx={{
            letterSpacing: '2px',
            fontWeight: 800,
            color: 'var(--legal-gold-border, #b8892b)',
            fontSize: '0.85rem',
            display: 'block',
            mb: 0.5,
          }}
        >
          403 NOT AUTHORISED
        </Typography>

        <Typography
          variant="h4"
          sx={{
            fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
            fontWeight: 800,
            color: 'var(--legal-navy, #0b1a3a)',
            mb: 1.5,
          }}
        >
          Access Restricted
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'var(--legal-text-muted, #475569)',
            fontSize: '0.98rem',
            lineHeight: 1.6,
            mb: 3,
          }}
        >
          Your current session is authenticated as <strong>{user?.name || 'User'}</strong> ({roleBadge}). 
          This module is reserved for elevated institutional permissions and is not accessible under your current role.
        </Typography>

        {deniedPath && (
          <Box
            sx={{
              p: 1.5,
              mb: 3,
              borderRadius: '10px',
              backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
              border: '1px dashed var(--legal-border-tint, #dccb9a)',
              fontSize: '0.85rem',
              color: 'var(--legal-navy, #0b1a3a)',
              fontFamily: 'monospace',
            }}
          >
            Attempted resource: {deniedPath}
          </Box>
        )}

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            startIcon={<ArrowBackIcon />}
            sx={{
              backgroundColor: 'var(--legal-gold, #d4a82f)',
              color: '#0b1a3a',
              fontWeight: 700,
              px: 3,
              py: 1.2,
              borderRadius: '12px',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'var(--legal-gold-border, #b8892b)',
                color: '#ffffff',
              },
            }}
          >
            Return to Dashboard
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            startIcon={<LogoutIcon />}
            sx={{
              borderColor: 'var(--legal-gold-border, #b8892b)',
              color: 'var(--legal-navy, #0b1a3a)',
              fontWeight: 700,
              px: 3,
              py: 1.2,
              borderRadius: '12px',
              textTransform: 'none',
              '&:hover': {
                borderColor: 'var(--legal-navy, #0b1a3a)',
                backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
              },
            }}
          >
            Switch Account
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
