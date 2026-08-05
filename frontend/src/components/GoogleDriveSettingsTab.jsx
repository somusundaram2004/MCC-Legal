import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, TextField,
  Alert, Avatar, Chip, LinearProgress, CircularProgress, Paper
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StorageIcon from '@mui/icons-material/Storage';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import WarningIcon from '@mui/icons-material/Warning';
import api from '../services/api';

const GoogleDriveSettingsTab = () => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [rootFolderId, setRootFolderId] = useState('');
  const [savingFolderId, setSavingFolderId] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/google-drive/status/');
      setStatusData(response.data);
      setRootFolderId(response.data.root_folder_id || '');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch Google Drive status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const driveStatus = params.get('drive');
    const driveError = params.get('error');
    const code = params.get('code');

    const handleOAuthCodeExchange = async (authCode) => {
      setConnecting(true);
      setError(null);
      setSuccess(null);
      try {
        const redirectUri = `${window.location.origin}/settings`;
        const response = await api.post('/api/google-drive/oauth/callback/', {
          code: authCode,
          redirect_uri: redirectUri
        });
        setSuccess(response.data.detail || 'Google Drive connected successfully!');
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        fetchStatus();
      } catch (err) {
        console.error("Google Drive Code Exchange Failed:", err);
        setError(err.response?.data?.detail || 'Failed to exchange authorization code with Google Drive server.');
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        fetchStatus();
      } finally {
        setConnecting(false);
      }
    };

    if (code) {
      handleOAuthCodeExchange(code);
    } else if (driveStatus === 'connected') {
      setSuccess('Google Drive connected successfully!');
      // Clean query parameters from address bar
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      fetchStatus();
    } else if (driveStatus === 'failed') {
      setError(driveError ? decodeURIComponent(driveError) : 'Failed to authorize Google Drive connection.');
      // Clean query parameters from address bar
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      fetchStatus();
    } else {
      fetchStatus();
    }
  }, [fetchStatus]);

  const handleConnect = async (forceSelect = false) => {
    setConnecting(true);
    setError(null);
    setSuccess(null);
    try {
      const redirectUri = `${window.location.origin}/settings`;
      const response = await api.get(`/api/google-drive/oauth-url/?redirect_uri=${encodeURIComponent(redirectUri)}&force_select=${forceSelect}`);
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('OAuth URL not returned from server.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start Google Drive authorization.');
      setConnecting(false);
    }
  };

  const handleSaveRootFolder = async () => {
    setSavingFolderId(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.patch('/api/google-drive/update-root-folder/', {
        root_folder_id: rootFolderId
      });
      setSuccess(response.data.detail || 'Root folder ID updated successfully.');
      fetchStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update root folder ID.');
    } finally {
      setSavingFolderId(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Drive? This will revoke file storage sync.')) return;
    setError(null);
    setSuccess(null);
    try {
      await api.post('/api/google-drive/disconnect/');
      setSuccess('Google Drive disconnected successfully.');
      fetchStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to disconnect Google Drive.');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.post('/api/google-drive/test-connection/');
      setSuccess(response.data.detail || 'Connection test succeeded.');
      fetchStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === null || bytes === undefined) return '—';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isConnected = statusData?.connection_status === 'Connected';
  const showDetailCard = statusData && statusData.connection_status !== 'Disconnected';

  const limit = statusData?.storage_limit || 0;
  const usage = statusData?.storage_usage || 0;
  const limitStr = limit > 0 ? formatBytes(limit) : '5 TB';
  const usageStr = formatBytes(usage);
  const percentUsed = limit > 0 ? Math.round((usage / limit) * 100) : 0;
  const availableStr = limit > 0 ? formatBytes(limit - usage) : '4.99 TB';

  const formattedDate = statusData?.last_connection_time 
    ? new Date(statusData.last_connection_time).toLocaleString()
    : new Date().toLocaleString();

  return (
    <Box>
      {/* Header section with buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5 }}>
        <Box sx={{ pr: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Google Drive Connection (Dynamic OAuth 2.0)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Automatic Google OAuth 2.0 authentication for organization storage — no file uploads required.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <Button
            onClick={handleTestConnection}
            disabled={testing || !isConnected}
            variant="outlined"
            startIcon={testing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon sx={{ color: '#E28743' }} />}
            sx={{
              border: '1px solid #E28743',
              color: '#E28743',
              backgroundColor: '#FFF8F2',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              py: 1.2,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#FFEFE2',
                border: '1px solid #D97724',
              },
              '&.Mui-disabled': {
                border: '1px solid rgba(0, 0, 0, 0.12)',
                color: 'rgba(0, 0, 0, 0.26)',
                backgroundColor: 'transparent'
              }
            }}
          >
            Test Connection
          </Button>
          <Button
            onClick={() => handleConnect(true)}
            disabled={connecting}
            variant="contained"
            startIcon={<MenuOpenIcon />}
            sx={{
              background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
              color: '#fff',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              py: 1.2,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
              }
            }}
          >
            Change Google Account
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3.5, borderRadius: '12px' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3.5, borderRadius: '12px' }}>{success}</Alert>}

      {(!isConnected || !statusData?.connected_email) && !loading && !connecting && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3.5, borderRadius: '12px', fontWeight: 700 }}>
          No Google Drive Account Added: Click "Connect Google Drive" or "Change Google Account" below to authorize your Google Workspace storage.
        </Alert>
      )}

      {loading || connecting ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            {connecting ? 'Connecting Google Account credentials...' : 'Fetching Google Drive status...'}
          </Typography>
        </Box>
      ) : showDetailCard ? (
        <Grid container spacing={3.5}>
          {/* Main Info Card */}
          <Grid xs={12}>
            <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                {/* Header profile row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#E8F8F5', color: '#10B981', width: 48, height: 48, borderRadius: '12px' }}>
                      <StorageIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.25 }}>
                        {statusData.connected_email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Shared Organization Google Drive Storage
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={statusData.connection_status}
                    color={isConnected ? 'success' : 'warning'}
                    size="small"
                    sx={{ fontWeight: 800, borderRadius: '8px', px: 1 }}
                  />
                </Box>

                {/* Form fields grid */}
                <Grid container spacing={2.5}>
                  <Grid xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Status"
                      value={statusData.connection_status}
                      disabled
                      sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.primary', fontWeight: 600 } }}
                    />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Connected Google Account"
                      value={statusData.connected_email}
                      disabled
                      sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.primary', fontWeight: 600 } }}
                    />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <TextField
                        fullWidth
                        label="Current Root Folder ID"
                        value={rootFolderId}
                        onChange={(e) => setRootFolderId(e.target.value)}
                        placeholder="Paste folder ID or full Google Drive URL"
                        disabled={savingFolderId || !isConnected}
                        helperText="Subfolders/files will be created inside this folder. Paste URL or ID."
                      />
                      <Button
                        variant="contained"
                        onClick={handleSaveRootFolder}
                        disabled={savingFolderId || !isConnected || rootFolderId === (statusData.root_folder_id || '')}
                        sx={{
                          backgroundColor: '#4F46E5',
                          color: '#fff',
                          height: '56px',
                          px: 3,
                          borderRadius: '10px',
                          textTransform: 'none',
                          fontWeight: 700,
                          '&:hover': {
                            backgroundColor: '#4338CA',
                          }
                        }}
                      >
                        {savingFolderId ? <CircularProgress size={24} color="inherit" /> : 'Save'}
                      </Button>
                    </Box>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Default Upload Folder"
                      value={statusData.default_upload_folder}
                      disabled
                      sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.primary', fontWeight: 600 } }}
                    />
                  </Grid>
                </Grid>

                {/* Buttons row */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      onClick={() => handleConnect(false)}
                      variant="contained"
                      sx={{
                        backgroundColor: '#4F46E5',
                        color: '#fff',
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 3.5,
                        py: 1,
                        boxShadow: 'none',
                        '&:hover': {
                          backgroundColor: '#4338CA',
                          boxShadow: 'none'
                        }
                      }}
                    >
                      Reconnect Google Drive
                    </Button>
                    <Button
                      onClick={() => handleConnect(true)}
                      variant="outlined"
                      sx={{
                        borderColor: '#4F46E5',
                        color: '#4F46E5',
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 3.5,
                        py: 1,
                        boxShadow: 'none',
                        '&:hover': {
                          borderColor: '#4338CA',
                          backgroundColor: 'rgba(79, 70, 229, 0.04)',
                        }
                      }}
                    >
                      Change Google Account
                    </Button>
                  </Box>
                  <Button
                    onClick={handleDisconnect}
                    variant="outlined"
                    color="error"
                    sx={{
                      borderColor: '#FCA5A5',
                      color: '#EF4444',
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 3.5,
                      py: 1,
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.04)',
                      }
                    }}
                  >
                    Disconnect
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Storage Quota Card */}
          <Grid item xs={12} sm={6}>
            <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Storage Quota & Usage
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    Storage Used
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {usageStr} / {limitStr}
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={percentUsed}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: 'linear-gradient(90deg, #10B981, #34D399)',
                    }
                  }}
                />

                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: '14px',
                    borderColor: 'divider',
                    bgcolor: 'action.hover',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    mt: 1
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    Available Drive Storage
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981' }}>
                    {availableStr}
                  </Typography>
                </Paper>

                <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
                  Last Verified: {formattedDate}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: '20px',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            borderStyle: 'dashed'
          }}
        >
          <StorageIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
            Google Drive Disconnected
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, maxWidth: 480, mx: 'auto', lineHeight: 1.6 }}>
            Connect a single Google Drive account to dynamically backup and sync your repository files automatically.
          </Typography>
          <Button
            onClick={() => handleConnect(false)}
            variant="contained"
            startIcon={<CloudUploadIcon />}
            sx={{
              background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
              color: '#fff',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              px: 4,
              py: 1.2,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
              }
            }}
          >
            Connect Google Drive
          </Button>
        </Paper>
      )}

      {/* Guidelines Setup */}
      <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'action.hover', p: 4, mt: 4 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsSuggestIcon color="primary" /> Google Drive OAuth 2.0 Setup Guide
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
          Authentication uses Google's secure Web OAuth 2.0 protocol. Follow these configuration guidelines:
        </Typography>
        <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 1.5, fontSize: '0.82rem', lineHeight: 1.6, color: 'text.secondary' } }}>
          <li>
            <strong>Register Redirect URI:</strong> Add <code>http://localhost:5173/settings</code> (or your staging/production host domain) under <em>"Authorized redirect URIs"</em> in your Google Cloud Console project.
          </li>
          <li>
            <strong>Add Test Users:</strong> While the project is in publishing status "Testing", ensure that the target Gmail or Workspace account is explicitly added under the <strong>Test users</strong> section in the GCP OAuth consent screen configuration.
          </li>
          <li>
            <strong>Verify Scopes:</strong> Grant full read/write permission scopes to the drive context (<code>drive.file</code>, <code>drive</code>, and <code>userinfo.email</code>) during the authorization consent redirect.
          </li>
        </Box>
      </Card>
    </Box>
  );
};

export default GoogleDriveSettingsTab;
