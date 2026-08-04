import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Alert, InputAdornment, IconButton, CircularProgress,
  Grid, Avatar, LinearProgress
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import KeyIcon from '@mui/icons-material/Key';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../services/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialEmail = queryParams.get('email') || '';
  const initialOtp = queryParams.get('otp') || queryParams.get('token') || '';

  const [step, setStep] = useState(initialEmail && initialOtp ? 2 : 1);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(initialOtp);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password strength logic
  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };

  const strength = calculateStrength(newPassword);
  const getStrengthColor = (score) => {
    if (score <= 25) return 'error';
    if (score <= 50) return 'warning';
    if (score <= 75) return 'info';
    return 'success';
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/users/auth/forgot-password/', { email });
      setSuccess(response.data.detail || 'If an account exists, a password reset OTP code has been sent.');
      setStep(2);
    } catch (err) {
      console.error("Forgot password request error:", err);
      setError(err.response?.data?.detail || 'Failed to send OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email || !otp) {
      setError('Email address and 6-digit OTP code are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/api/users/auth/reset-password/', {
        email,
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      setSuccess(response.data.detail || 'Password reset successfully! Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login', { state: { successMessage: 'Password reset successfully! Please sign in with your new password.' } });
      }, 2500);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.response?.data?.detail || 'Failed to reset password. Please check your OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ maxWidth: 460, width: '100%', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <LockIcon sx={{ color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                {step === 1 ? 'Forgot Password?' : 'Reset Password'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {step === 1 ? 'Enter your registered email to receive a 6-digit OTP.' : 'Verify your OTP code and enter your new password.'}
              </Typography>
            </Box>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{success}</Alert>}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5, fontWeight: 700, borderRadius: '12px', textTransform: 'none' }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset OTP Code'}
                </Button>

                <Button
                  component={Link}
                  to="/login"
                  startIcon={<ArrowBackIcon />}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Back to Sign In
                </Button>
              </Box>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }
                  }}
                />

                <TextField
                  label="6-Digit OTP Code"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  required
                  fullWidth
                  placeholder="e.g. 123456"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }
                  }}
                />

                <TextField
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />

                {newPassword && (
                  <Box sx={{ mt: -1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Password Strength</Typography>
                      <Typography variant="caption" fontWeight={700} color={`${getStrengthColor(strength)}.main`}>
                        {strength <= 25 ? 'Weak' : strength <= 50 ? 'Fair' : strength <= 75 ? 'Good' : 'Strong'}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={strength} color={getStrengthColor(strength)} sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                )}

                <TextField
                  label="Confirm New Password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      )
                    }
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5, fontWeight: 700, borderRadius: '12px', textTransform: 'none', mt: 1 }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    onClick={() => setStep(1)}
                    sx={{ textTransform: 'none', fontSize: '0.85rem' }}
                  >
                    Resend OTP
                  </Button>

                  <Button
                    component={Link}
                    to="/login"
                    startIcon={<ArrowBackIcon />}
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    Back to Sign In
                  </Button>
                </Box>
              </Box>
            </form>
          )}

        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPassword;
