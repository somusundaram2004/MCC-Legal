import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import ErrorIcon from '@mui/icons-material/Error';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            bgcolor: '#f8fafc',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              maxWidth: 500,
              width: '100%',
              p: 4,
              borderRadius: '20px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '16px',
                bgcolor: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2.5,
              }}
            >
              <ErrorIcon sx={{ fontSize: 36 }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#1e293b' }}>
              Something went wrong
            </Typography>

            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              {this.state.error?.message || 'An unexpected rendering error occurred. Please try reloading or clearing the session.'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleReload}
                sx={{
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                }}
              >
                Reload Page
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<LogoutIcon />}
                onClick={this.handleReset}
                sx={{
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 2.5,
                }}
              >
                Clear &amp; Login
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

