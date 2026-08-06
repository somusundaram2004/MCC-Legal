import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Grid, TextField, 
  Button, Alert, Divider, Avatar, Chip, Tooltip
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';

import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
  const { user } = useAuth();
  
  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/users/change-password/', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setStatusMsg({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error("Change password failed:", err);
      setStatusMsg({ 
        type: 'error', 
        text: err.response?.data?.current_password?.[0] || err.response?.data?.detail || "Failed to update password." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, maxWidth: 900, mx: 'auto' }} className="animate-fade-slide-up">
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ background: 'linear-gradient(135deg, var(--indigo), var(--violet))', width: 44, height: 44, borderRadius: '14px' }}>
          <AccountBoxIcon />
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            My Account & Security Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your personal profile details, role permissions baseline, and password credentials.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Details Card */}
        <Grid xs={12} md={6}>
          <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ background: 'linear-gradient(135deg, var(--indigo), var(--violet))', width: 64, height: 64, fontSize: '1.8rem', fontWeight: 800, color: '#fff', border: '3px solid', borderColor: 'primary.main' }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    {user?.name}
                  </Typography>
                  <Chip
                    label={user?.role?.name || "Standard User"}
                    size="small"
                    sx={{ bgcolor: 'rgba(var(--indigo-rgb), 0.12)', color: 'primary.main', fontWeight: 700, mt: 0.5 }}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 2.5 }} />

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid xs={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Email:</Typography>
                </Grid>
                <Grid xs={8}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{user?.email}</Typography>
                </Grid>

                <Grid xs={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Department:</Typography>
                </Grid>
                <Grid xs={8}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.department || 'MOU Administration'}</Typography>
                </Grid>

                <Grid xs={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Designation:</Typography>
                </Grid>
                <Grid xs={8}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.designation || 'Coordinator'}</Typography>
                </Grid>

                <Grid xs={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Account Status:</Typography>
                </Grid>
                <Grid xs={8}>
                  <Chip label="Active" color="success" size="small" sx={{ fontWeight: 700, height: 22 }} />
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: '#10B981', fontSize: '1.1rem' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#059669' }}>
                    Authenticated & Security Verified
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.72rem' }}>
                  Your account is protected by role-based dynamic permissions and audit logging.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Change Password Card */}
        <Grid xs={12} md={6}>
          <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LockIcon sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Change Password
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                Update your account password to ensure ongoing system security.
              </Typography>

              {statusMsg && (
                <Alert severity={statusMsg.type} sx={{ mb: 2, borderRadius: '12px' }}>
                  {statusMsg.text}
                </Alert>
              )}

              <Box component="form" onSubmit={handlePasswordChangeSubmit}>
                <TextField
                  fullWidth
                  required
                  size="small"
                  type="password"
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  required
                  size="small"
                  type="password"
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  required
                  size="small"
                  type="password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    borderRadius: '12px',
                    fontWeight: 700,
                    py: 1.2,
                    background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)'
                  }}
                >
                  {loading ? 'Updating Password...' : 'Update Password Credentials'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile;
