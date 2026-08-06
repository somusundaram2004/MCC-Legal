import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Alert, InputAdornment, IconButton, CircularProgress,
  Grid, FormControlLabel, Checkbox, Link, Tooltip, Avatar, Divider,
  Dialog, DialogContent, DialogActions, Zoom, LinearProgress
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import KeyIcon from '@mui/icons-material/Key';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import { showCustomToast } from '../utils/customToast';

import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useSiteCustomization } from '../context/SiteCustomizationContext';

const Login = () => {
  const { login, googleLogin, user } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const { login: loginCustomization } = useSiteCustomization();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotShowPass, setForgotShowPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score += 25;
    if (/[A-Z]/.test(pass)) score += 25;
    if (/[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 25;
    return score;
  };
  const forgotPassStrength = calculateStrength(forgotNewPassword);
  const getForgotStrengthColor = (score) => {
    if (score <= 25) return 'error';
    if (score <= 50) return 'warning';
    if (score <= 75) return 'info';
    return 'success';
  };

  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const response = await api.post('/api/users/auth/forgot-password/', { email: forgotEmail });
      setForgotSuccess(response.data.detail || 'If an account exists, a password reset OTP code has been sent.');
      setForgotStep(2);
    } catch (err) {
      console.error("Send forgot OTP error:", err);
      setForgotError(err.response?.data?.detail || 'Failed to send reset OTP code. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetForgotPass = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotOtp) {
      setForgotError('Email address and 6-digit OTP code are required.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('New password and confirm password do not match.');
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError('Password must be at least 8 characters long.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const response = await api.post('/api/users/auth/reset-password/', {
        email: forgotEmail,
        otp: forgotOtp,
        new_password: forgotNewPassword,
        confirm_password: forgotConfirmPassword
      });

      setForgotSuccess(response.data.detail || 'Password has been reset successfully!');
      setEmail(forgotEmail);
      setTimeout(() => {
        setForgotModalOpen(false);
        setForgotStep(1);
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotSuccess('');
      }, 2000);
    } catch (err) {
      console.error("Reset password error:", err);
      setForgotError(err.response?.data?.detail || 'Failed to reset password. Please check your OTP code.');
    } finally {
      setForgotLoading(false);
    }
  };

  const queryParams = new URLSearchParams(location.search);
  const isRegistered = queryParams.get('registered') === 'true';
  const successMessage = isRegistered
    ? 'Registration completed successfully! You can now sign in with your password.'
    : location.state?.successMessage;

  // Redirect if already logged in and reset form inputs on load
  React.useEffect(() => {
    if (user) {
      navigate('/');
    } else {
      setEmail('');
      setPassword('');
    }
  }, [user, navigate]);

  const passwordRef = useRef(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateInputs = () => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');

    if (!email || !email.trim()) {
      setEmailError('Please enter your email address.');
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setEmailError('Please enter a valid email address.');
        isValid = false;
      }
    }

    if (!password) {
      setPasswordError('Please enter your password.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      showCustomToast.success(loggedUser?.name || 'User');
      await new Promise((resolve) => setTimeout(resolve, 800));
      navigate('/', { state: { successMessage: `Logged in successfully! Welcome back, ${loggedUser.name || 'user'}.` } });
    } catch (err) {
      console.error("Login failed error object:", err);
      
      // Preserve form values & focus password field
      setTimeout(() => {
        if (passwordRef.current) {
          passwordRef.current.focus();
        }
      }, 100);

      // Handle specific error codes with custom toasts
      if (!err.response || err.code === 'ERR_NETWORK') {
        showCustomToast.networkError();
      } else if (err.response.status === 401 || err.response.status === 400) {
        const detailMsg = err.response?.data?.detail 
          || err.response?.data?.non_field_errors?.[0]
          || (Array.isArray(err.response?.data) ? err.response?.data[0] : null)
          || 'Incorrect password. If you don\'t know your password, please click Forgot Password.';
        showCustomToast.invalidCredentials(detailMsg);
      } else if (err.response.status >= 500) {
        showCustomToast.serverError();
      } else {
        showCustomToast.invalidCredentials();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      const loggedUser = await googleLogin(credentialResponse.credential);
      showCustomToast.success(loggedUser?.name || 'User');
      await new Promise((resolve) => setTimeout(resolve, 800));
      navigate('/', { state: { successMessage: `Logged in via Google! Welcome back, ${loggedUser.name || 'user'}.` } });
    } catch (err) {
      console.error("Google login failed:", err);
      if (!err.response || err.code === 'ERR_NETWORK') {
        showCustomToast.networkError();
      } else {
        const detailMsg = err.response?.data?.detail || 'Unable to sign in with Google. Please try again later or use your email and password.';
        showCustomToast.googleError(detailMsg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleAccessTokenSuccess = async (tokenResponse) => {
    setGoogleLoading(true);
    try {
      const loggedUser = await googleLogin({ access_token: tokenResponse.access_token });
      showCustomToast.success(loggedUser?.name || 'User');
      await new Promise((resolve) => setTimeout(resolve, 800));
      navigate('/', { state: { successMessage: `Logged in via Google! Welcome back, ${loggedUser.name || 'user'}.` } });
    } catch (err) {
      console.error("Google login failed:", err);
      if (!err.response || err.code === 'ERR_NETWORK') {
        showCustomToast.networkError();
      } else {
        const detailMsg = err.response?.data?.detail || 'Unable to sign in with Google. Please try again later or use your email and password.';
        showCustomToast.googleError(detailMsg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    console.error("Google login error or closed popup:", err);
    showCustomToast.googleError('Unable to sign in with Google. Please try again later or use your email and password.');
  };

  const triggerGoogleSelectAccount = useGoogleLogin({
    onSuccess: handleGoogleAccessTokenSuccess,
    onError: handleGoogleError,
    prompt: 'select_account'
  });

  const isDark = mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }} className="animate-fade-in">
      <Grid container sx={{ width: '100%' }}>

        {/* Left Side: Modern SVG Artwork Illustration Panel */}
        <Grid
          item
          xs={0}
          md={6}
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)',
            color: '#ffffff',
            p: 6,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Animated/Glowing background blur orbs */}
          <Box sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--violet-rgb), 0.5) 0%, rgba(var(--indigo-rgb), 0) 70%)', filter: 'blur(60px)', top: '-5%', left: '10%' }} />
          <Box sx={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0) 70%)', filter: 'blur(60px)', bottom: '5%', right: '10%' }} />

          <Box sx={{ maxWidth: 460, textAlign: 'center', zIndex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.12)', width: 64, height: 64 }}>
                <CloudQueueIcon sx={{ color: '#ffffff', fontSize: 36 }} />
              </Avatar>
            </Box>

            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.5px' }}>
              {loginCustomization?.left_heading || "MCC LEGAL Documents"}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 5, fontWeight: 500 }}>
              {loginCustomization?.left_subheading || "Professional Memorandum of Understanding Registry"}
            </Typography>

            {/* Custom SVG Illustration */}
            <Box sx={{ my: 4, transform: 'scale(1.1)' }}>
              <svg width="280" height="180" viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Floating file templates */}
                <g style={{ filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.15))' }}>
                  <rect x="30" y="20" width="80" height="110" rx="8" fill="#ffffff" />
                  <path d="M42 35H98" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                  <path d="M42 47H98" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <path d="M42 59H80" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <path d="M42 71H60" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="88" cy="98" r="12" fill="#10b981" />
                  <path d="M84 98L87 101L93 95" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>

                <g style={{ filter: 'drop-shadow(0px 12px 24px rgba(0,0,0,0.2))' }}>
                  <rect x="90" y="40" width="100" height="120" rx="8" fill="#ffffff" />
                  <path d="M106 60H174" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
                  <path d="M106 76H174" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <path d="M106 90H174" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                  <path d="M106 104H150" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

                  {/* Decorative stamp on document */}
                  <rect x="150" y="120" width="24" height="24" rx="4" fill="rgba(37, 99, 235, 0.1)" stroke="#2563eb" strokeWidth="1" />
                  <circle cx="162" cy="132" r="6" fill="#2563eb" />
                </g>

                {/* Additional floating design details */}
                <circle cx="215" cy="55" r="10" fill="rgba(255, 255, 255, 0.15)" />
                <path d="M205 130L225 150" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="3" strokeLinecap="round" />
                <circle cx="230" cy="120" r="4" fill="#f59e0b" />
              </svg>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'flex-start', mt: 4, pl: 6 }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
                <ArrowRightAltIcon /> {loginCustomization?.point_1 || "Fully-integrated document version control"}
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
                <ArrowRightAltIcon /> {loginCustomization?.point_2 || "Granular user permission matrices"}
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
                <ArrowRightAltIcon /> {loginCustomization?.point_3 || "Automated expiry warning system logs"}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Right Side: Sign In Card Form Panel */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
            position: 'relative'
          }}
        >
          {/* Top Right Controls: Theme Toggle */}
          <Box sx={{ position: 'absolute', top: 24, right: 24 }}>
            <Tooltip title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <IconButton onClick={toggleTheme} sx={{ border: '1px solid', borderColor: 'divider', p: 1.2 }}>
                {isDark ? <LightModeIcon sx={{ fontSize: '1.25rem' }} /> : <DarkModeIcon sx={{ fontSize: '1.25rem' }} />}
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ maxWidth: 420, width: '100%' }}>

            {/* Header info */}
            <Box sx={{ mb: 4, textAlign: { xs: 'center', sm: 'left' } }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.5px', color: 'text.primary' }}>
                {loginCustomization?.heading || "Sign In"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loginCustomization?.subheading || "Welcome back! Enter credentials to manage institution agreements."}
              </Typography>
            </Box>

            {successMessage && <Alert severity="success" sx={{ mb: 3.5, borderRadius: '12px' }}>{successMessage}</Alert>}

            <form onSubmit={handleSubmit} noValidate autoComplete="off">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.8 }}>

                {/* Email Address */}
                <TextField
                  label="Email Address"
                  variant="outlined"
                  type="email"
                  value={email}
                  autoComplete="off"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  error={Boolean(emailError)}
                  helperText={emailError}
                  required
                  fullWidth
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '14px',
                      color: isDark ? '#ffffff' : '#000000',
                      '& .MuiInputBase-input': {
                        color: isDark ? '#ffffff !important' : '#000000 !important',
                        fontWeight: 600,
                      },
                      '& input:-webkit-autofill': {
                        WebkitBoxShadow: isDark ? '0 0 0 100px #1e293b inset !important' : '0 0 0 100px #ffffff inset !important',
                        WebkitTextFillColor: isDark ? '#ffffff !important' : '#000000 !important',
                        caretColor: isDark ? '#ffffff' : '#000000',
                        borderRadius: '14px',
                      }
                    }
                  }}
                />

                {/* Password Field */}
                <TextField
                  label="Password"
                  variant="outlined"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  inputRef={passwordRef}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  error={Boolean(passwordError)}
                  helperText={passwordError}
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
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '14px',
                      color: isDark ? '#ffffff' : '#000000',
                      '& .MuiInputBase-input': {
                        color: isDark ? '#ffffff !important' : '#000000 !important',
                        fontWeight: 600,
                      },
                      '& input:-webkit-autofill': {
                        WebkitBoxShadow: isDark ? '0 0 0 100px #1e293b inset !important' : '0 0 0 100px #ffffff inset !important',
                        WebkitTextFillColor: isDark ? '#ffffff !important' : '#000000 !important',
                        caretColor: isDark ? '#ffffff' : '#000000',
                        borderRadius: '14px',
                      }
                    }
                  }}
                />

                {/* Remember me & Forgot Password Row */}
                <Box sx={{ display: 'flex', justifyContent: loginCustomization?.show_remember_me !== false ? 'space-between' : 'flex-end', alignItems: 'center', mt: -0.5 }}>
                  {loginCustomization?.show_remember_me !== false && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          size="small"
                          color="primary"
                        />
                      }
                      label={<Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>Remember me</Typography>}
                    />
                  )}
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={() => {
                      setForgotModalOpen(true);
                      if (email) setForgotEmail(email);
                    }}
                    sx={{ fontWeight: 600, fontSize: '0.85rem', underline: 'hover', textTransform: 'none', color: 'primary.main' }}
                  >
                    Forgot Password?
                  </Link>
                </Box>

                {/* Sign In Trigger Button */}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || googleLoading}
                  sx={{
                    py: 1.6,
                    fontWeight: 700,
                    fontSize: '0.98rem',
                    borderRadius: '12px',
                    textTransform: 'none',
                    bgcolor: 'primary.main',
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: 'primary.dark'
                    }
                  }}
                  endIcon={!loading && <ArrowRightAltIcon />}
                >
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CircularProgress size={20} color="inherit" />
                      <span>Signing In...</span>
                    </Box>
                  ) : (
                    loginCustomization?.button_text || 'Sign In'
                  )}
                </Button>
              </Box>
            </form>

            <Divider sx={{ my: 3, color: 'text.secondary', fontSize: '0.8rem', fontWeight: 600 }}>
              OR CONTINUE WITH
            </Divider>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, width: '100%', minHeight: 44 }}>
              {googleLoading ? (
                <CircularProgress size={28} />
              ) : (
                <>
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled={loading || googleLoading}
                    onClick={() => triggerGoogleSelectAccount()}
                    startIcon={
                      <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z" />
                        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.72L.97 13.07C2.47 16.05 5.5 18 9 18z" />
                        <path fill="#FBBC05" d="M3.87 10.8c-.18-.53-.28-1.1-.28-1.8s.1-1.27.28-1.8L.97 4.93C.35 6.16 0 7.55 0 9s.35 2.84.97 4.07l2.9-2.27z" />
                        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.5 0 2.47 1.95.97 4.93l2.9 2.27c.72-2.15 2.75-3.62 5.13-3.62z" />
                      </svg>
                    }
                    sx={{
                      borderRadius: '14px',
                      py: 1.2,
                      fontWeight: 600,
                      textTransform: 'none',
                      borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#dadce0',
                      color: 'text.primary',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                      }
                    }}
                  >
                    Continue With Google Account
                  </Button>
                </>
              )}
            </Box>



          </Box>
        </Grid>

      </Grid>

      {/* Forgot Password & OTP Reset Modal */}
      <Dialog
        open={forgotModalOpen}
        slots={{ transition: Zoom }}
        onClose={() => {
          setForgotModalOpen(false);
          setForgotStep(1);
          setForgotError('');
          setForgotSuccess('');
        }}
        slotProps={{
          transition: { timeout: 280 },
          paper: {
            sx: {
              borderRadius: '24px',
              p: 1.5,
              maxWidth: 440,
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)'
            }
          }
        }}
      >
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <LockIcon sx={{ color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                {forgotStep === 1 ? 'Forgot Password' : 'Reset Password'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {forgotStep === 1 ? 'Enter your email to receive a 6-digit reset OTP.' : 'Verify 6-digit OTP code & enter new password.'}
              </Typography>
            </Box>
          </Box>

          {forgotError && <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>{forgotError}</Alert>}
          {forgotSuccess && <Alert severity="success" sx={{ mb: 2.5, borderRadius: '12px' }}>{forgotSuccess}</Alert>}

          {forgotStep === 1 ? (
            <form onSubmit={handleSendForgotOtp}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Email Address"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
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
                  disabled={forgotLoading}
                  sx={{ py: 1.4, fontWeight: 700, borderRadius: '12px', textTransform: 'none' }}
                >
                  {forgotLoading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset OTP Code'}
                </Button>
              </Box>
            </form>
          ) : (
            <form onSubmit={handleResetForgotPass}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
                <TextField
                  label="6-Digit OTP Code"
                  type="text"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.trim())}
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
                  type={forgotShowPass ? 'text' : 'password'}
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
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
                          <IconButton onClick={() => setForgotShowPass(!forgotShowPass)} edge="end">
                            {forgotShowPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />

                {forgotNewPassword && (
                  <Box sx={{ mt: -0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Strength</Typography>
                      <Typography variant="caption" fontWeight={700} color={`${getForgotStrengthColor(forgotPassStrength)}.main`}>
                        {forgotPassStrength <= 25 ? 'Weak' : forgotPassStrength <= 50 ? 'Fair' : forgotPassStrength <= 75 ? 'Good' : 'Strong'}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={forgotPassStrength} color={getForgotStrengthColor(forgotPassStrength)} sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                )}

                <TextField
                  label="Confirm New Password"
                  type={forgotShowPass ? 'text' : 'password'}
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
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
                  disabled={forgotLoading}
                  sx={{ py: 1.4, fontWeight: 700, borderRadius: '12px', textTransform: 'none', mt: 0.5 }}
                >
                  {forgotLoading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
                </Button>
              </Box>
            </form>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
          {forgotStep === 2 && (
            <Button onClick={() => setForgotStep(1)} sx={{ textTransform: 'none', fontSize: '0.85rem' }}>
              Resend OTP
            </Button>
          )}
          <Button
            onClick={() => {
              setForgotModalOpen(false);
              setForgotStep(1);
              setForgotError('');
              setForgotSuccess('');
            }}
            sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;
