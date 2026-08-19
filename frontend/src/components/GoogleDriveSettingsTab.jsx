import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Alert, Avatar, Chip, LinearProgress, CircularProgress, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import WarningIcon from '@mui/icons-material/Warning';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SaveIcon from '@mui/icons-material/Save';
import api from '../services/api';

const GoogleDriveSettingsTab = () => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [rootFolderId, setRootFolderId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const codeExchangeRef = useRef(null);

  const [hierarchyStatuses, setHierarchyStatuses] = useState([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);
  const [repairingModule, setRepairingModule] = useState(null);

  const fetchHierarchyStatus = useCallback(async () => {
    setHierarchyLoading(true);
    try {
      const res = await api.get('/api/google-drive/hierarchy-status/');
      setHierarchyStatuses(res.data.statuses || []);
    } catch (err) {
      console.error("Failed to fetch hierarchy status:", err);
    } finally {
      setHierarchyLoading(false);
    }
  }, []);

  const handleRepairHierarchy = async (moduleId) => {
    setRepairingModule(moduleId);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post('/api/google-drive/repair-hierarchy/', { module_id: moduleId });
      setSuccess(res.data.detail || "Repaired module folder hierarchy.");
      fetchHierarchyStatus();
    } catch (err) {
      setError(err?.response?.data?.detail || "Repair operation failed.");
    } finally {
      setRepairingModule(null);
    }
  };

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/google-drive/status/');
      setStatusData(response.data);
      setRootFolderId(response.data.root_folder_id || '');
      setClientId(response.data.client_id || '');
      setClientSecret(response.data.client_secret || '');
      fetchHierarchyStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch Google Drive status.');
    } finally {
      setLoading(false);
    }
  }, [fetchHierarchyStatus]);

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
      if (codeExchangeRef.current === code) return;
      codeExchangeRef.current = code;
      handleOAuthCodeExchange(code);
    } else if (driveStatus === 'connected') {
      setSuccess('Google Drive connected successfully!');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      fetchStatus();
    } else if (driveStatus === 'failed') {
      setError(driveError ? decodeURIComponent(driveError) : 'Failed to authorize Google Drive connection.');
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
        setTimeout(() => setConnecting(false), 3000);
      } else {
        throw new Error('OAuth URL not returned from server.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail && detail.includes('Client ID is not configured')) {
        setError('Google Client ID is not configured. Please enter your Client ID and Client Secret in the form below and click "Save OAuth Credentials" first.');
      } else {
        setError(detail || 'Failed to start Google Drive authorization.');
      }
      setConnecting(false);
    }
  };

  const handleSaveCredentials = async () => {
    setSavingCreds(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.patch('/api/google-drive/update-credentials/', {
        client_id: clientId,
        client_secret: clientSecret,
        root_folder_id: rootFolderId
      });
      setSuccess(response.data.detail || 'Google Cloud credentials updated successfully!');
      fetchStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update Google Cloud credentials.');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleDisconnectClick = () => {
    setConfirmDisconnectOpen(true);
  };

  const executeDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/api/google-drive/disconnect/');
      setSuccess('Google Drive disconnected successfully.');
      setConfirmDisconnectOpen(false);
      fetchStatus();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to disconnect Google Drive.');
      setConfirmDisconnectOpen(false);
    } finally {
      setDisconnecting(false);
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

  const limit = statusData?.storage_limit || 0;
  const usage = statusData?.storage_usage || 0;
  const limitStr = limit > 0 ? formatBytes(limit) : '15 GB';
  const usageStr = formatBytes(usage);
  const percentUsed = limit > 0 ? Math.round((usage / limit) * 100) : 0;
  const clampedProgress = Math.min(100, Math.max(0, percentUsed));
  const isQuotaExceeded = percentUsed >= 100;

  return (
    <Box>
      {/* Header section with title & actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ pr: 2, maxWidth: 600 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Google Drive Connection (Dynamic OAuth 2.0)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            Automatic Google OAuth 2.0 authentication for organization storage — no manual file uploads required.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', flexShrink: 0 }}>
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
              px: 2.5,
              py: 1.2,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)',
              }
            }}
          >
            {isConnected ? 'Change Google Account' : 'Connect Google Drive'}
          </Button>

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
              px: 2.5,
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

          {isConnected && (
            <Button
              onClick={handleDisconnectClick}
              variant="outlined"
              color="error"
              startIcon={<LinkOffIcon />}
              sx={{
                borderColor: '#FCA5A5',
                color: '#EF4444',
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 700,
                px: 2.5,
                py: 1.2,
                boxShadow: 'none',
                '&:hover': {
                  borderColor: '#EF4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.04)',
                }
              }}
            >
              Disconnect
            </Button>
          )}
        </Box>
      </Box>

      {connecting && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress sx={{ borderRadius: '4px', mb: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Connecting Google Account credentials...
          </Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 3.5, borderRadius: '12px' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3.5, borderRadius: '12px' }}>{success}</Alert>}

      {!isConnected && !loading && !connecting && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3.5, borderRadius: '12px', fontWeight: 700 }}>
          No Google Drive Account Connected: Click "Connect Google Drive" above or save your Google OAuth credentials below to start syncing.
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Fetching Google Drive status...
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          {/* Main Account Details & Quota Card */}
          <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Profile Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: isConnected ? '#E8F8F5' : 'action.hover', color: isConnected ? '#10B981' : 'text.secondary', width: 48, height: 48, borderRadius: '12px' }}>
                    <StorageIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.25 }}>
                      {statusData?.connected_email || 'Not Connected'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Shared Organization Google Drive Storage
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={statusData?.connection_status || 'Disconnected'}
                  color={isConnected ? 'success' : 'default'}
                  size="small"
                  sx={{ fontWeight: 800, borderRadius: '8px', px: 1 }}
                />
              </Box>

              {/* Status & Default Upload Folder details */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Connection Status"
                  value={statusData?.connection_status || 'Disconnected'}
                  disabled
                  sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.primary', fontWeight: 600 } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Connected Google Account"
                  value={statusData?.connected_email || 'Not Connected'}
                  disabled
                  sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.primary', fontWeight: 600 } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="Default Upload Folder"
                  value={statusData?.default_upload_folder || 'Root Repository'}
                  disabled
                  sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.primary', fontWeight: 600 } }}
                />
              </Box>

              {/* Storage Quota Progress */}
              {isConnected && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Storage Used: <span style={{ color: 'var(--text-secondary, #64748B)', fontWeight: 500 }}>{usageStr} / {limitStr}</span>
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: isQuotaExceeded ? 'error.main' : percentUsed > 80 ? 'warning.main' : 'primary.main' }}>
                      {percentUsed}% Used {isQuotaExceeded ? '(Quota Exceeded)' : ''}
                    </Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={clampedProgress}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        background: isQuotaExceeded 
                          ? 'linear-gradient(90deg, #EF4444, #F87171)' 
                          : percentUsed > 80 
                          ? 'linear-gradient(90deg, #F59E0B, #FBBF24)' 
                          : 'linear-gradient(90deg, #10B981, #34D399)',
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Always Visible OAuth Credentials Panel */}
          <Paper id="oauth-credentials-panel" variant="outlined" sx={{ p: 4, borderRadius: '20px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                  🔑 Google Cloud API Credentials (OAuth Configuration)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Super Admins can update the Google Cloud OAuth Client ID, Client Secret, or Root Folder ID dynamically without restarting the server.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, mb: 2.5 }}>
              <TextField
                fullWidth
                label="Google OAuth Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                helperText="Obtained from Google Cloud Console > APIs & Services > Credentials"
              />

              <TextField
                fullWidth
                type="password"
                label="Google OAuth Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Paste new Client Secret or leave as ••••••••"
                helperText="Encrypted securely in server database"
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, gap: 2, alignItems: 'start' }}>
              <TextField
                fullWidth
                label="Root Repository Folder ID / URL"
                value={rootFolderId}
                onChange={(e) => setRootFolderId(e.target.value)}
                placeholder="Paste folder ID or full Google Drive folder URL"
                helperText="All subfolders and repository files will be stored inside this folder."
              />
              <Button
                variant="contained"
                onClick={handleSaveCredentials}
                disabled={savingCreds}
                startIcon={savingCreds ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                sx={{
                  backgroundColor: '#4F46E5',
                  color: '#ffffff !important',
                  height: '56px',
                  px: 4,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: '#4338CA', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }
                }}
              >
                {savingCreds ? 'Saving...' : 'Save Credentials'}
              </Button>
            </Box>
          </Paper>

          {/* Module Google Drive Folder Mapping & Integrity Status */}
          <Paper variant="outlined" sx={{ p: 4, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                  📁 Module → Google Drive Root Folder Hierarchy Mapping
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Every top-level application module must be mapped directly under APPLICATION ROOT. Misplaced folders can be repaired below.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                onClick={fetchHierarchyStatus}
                disabled={hierarchyLoading}
                startIcon={hierarchyLoading ? <CircularProgress size={14} /> : <CheckCircleIcon />}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
              >
                Check Integrity
              </Button>
            </Box>

            {hierarchyLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : hierarchyStatuses.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
                Click "Check Integrity" to validate module folder parent locations on Google Drive.
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { p: 1.5, textAlign: 'left', borderBottom: '1px solid', borderColor: 'divider' } }}>
                  <thead>
                    <tr>
                      <Typography component="th" variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>Module Name</Typography>
                      <Typography component="th" variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>Module Type</Typography>
                      <Typography component="th" variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>Google Drive Folder ID</Typography>
                      <Typography component="th" variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>Hierarchy Status</Typography>
                      <Typography component="th" variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>Actions</Typography>
                    </tr>
                  </thead>
                  <tbody>
                    {hierarchyStatuses.map((item) => {
                      const isOk = item.status === 'Connected';
                      const isMisplaced = item.status === 'Incorrect Location';
                      return (
                        <tr key={item.module_id}>
                          <td>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.module_name}</Typography>
                          </td>
                          <td>
                            <Chip label={item.type} size="small" variant="outlined" sx={{ fontSize: '0.7rem', fontWeight: 700 }} />
                          </td>
                          <td>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {item.drive_folder_id ? (item.drive_folder_id.length > 20 ? item.drive_folder_id.slice(0, 18) + '...' : item.drive_folder_id) : 'Not Provisioned'}
                            </Typography>
                          </td>
                          <td>
                            <Chip
                              label={item.status}
                              size="small"
                              color={isOk ? 'success' : isMisplaced ? 'warning' : 'error'}
                              sx={{ fontWeight: 800, borderRadius: '6px' }}
                            />
                          </td>
                          <td>
                            {isMisplaced && (
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                disabled={repairingModule === item.module_id}
                                onClick={() => handleRepairHierarchy(item.module_id)}
                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 800, fontSize: '0.75rem' }}
                              >
                                {repairingModule === item.module_id ? 'Repairing...' : 'Repair Location'}
                              </Button>
                            )}
                            {isOk && (
                              <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>✓ Verified Direct Child</Typography>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Box>
              </Box>
            )}
          </Paper>

          {/* Guidelines & Step-by-Step Setup Guide */}
          <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'action.hover', p: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
              <SettingsSuggestIcon color="primary" /> Steps to Follow for Google Account & Cloud Switch
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              Follow these clear steps whenever you want to connect a new Google Account or switch Google Cloud projects:
            </Typography>
            <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 2, fontSize: '0.86rem', lineHeight: 1.6, color: 'text.primary' } }}>
              <li>
                <strong>Step 1: Open Google Cloud Console & Enable Drive API</strong><br />
                Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">Google Cloud Console</a> with your target Google Account. Select or create your project, go to <em>APIs & Services &gt; Library</em>, search for <strong>Google Drive API</strong>, and click <strong>Enable</strong>.
              </li>
              <li>
                <strong>Step 2: Create OAuth 2.0 Credentials</strong><br />
                Go to <em>APIs & Services &gt; Credentials &gt; Create Credentials &gt; OAuth client ID</em> (Web application). Add your redirect URI:<br />
                <code>http://localhost:5173/settings</code> (and <code>http://localhost:8000/api/google-drive/oauth/callback/</code>).
              </li>
              <li>
                <strong>Step 3: Update OAuth Credentials in App</strong><br />
                Paste your new <strong>Client ID</strong> and <strong>Client Secret</strong> into the credentials form above, then click <strong>Save Credentials</strong>.
              </li>
              <li>
                <strong>Step 4: Set Up Root Repository Folder</strong><br />
                Create a main repository folder in your new Google Drive account. Copy the Folder ID from the browser URL, paste it into <strong>Root Repository Folder ID</strong>, and save.
              </li>
              <li>
                <strong>Step 5: Connect & Authorize Account</strong><br />
                Click <strong style={{ color: 'var(--indigo)' }}>"Connect Google Drive"</strong> at the top right to open Google's sign-in screen, pick your target Google account, and click <strong>Allow</strong> to grant Drive access.
              </li>
            </Box>
          </Card>
        </Box>
      )}

      {/* Disconnect Confirmation Modal */}
      <Dialog
        open={confirmDisconnectOpen}
        onClose={() => setConfirmDisconnectOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800, color: 'error.main' }}>
          <WarningAmberIcon sx={{ fontSize: 32, color: 'error.main' }} />
          Disconnect Google Drive
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            Are you sure you want to disconnect Google Drive?
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: '12px', fontSize: '0.82rem' }}>
            This will revoke automatic cloud synchronization for uploaded documents and agreements.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmDisconnectOpen(false)}
            variant="outlined"
            disabled={disconnecting}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            onClick={executeDisconnect}
            color="error"
            variant="contained"
            disabled={disconnecting}
            startIcon={disconnecting ? <CircularProgress size={18} color="inherit" /> : <LinkOffIcon />}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoogleDriveSettingsTab;
