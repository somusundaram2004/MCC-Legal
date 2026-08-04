import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Box, Card, CardContent, Typography, TextField, Button, 
  Alert, InputAdornment, IconButton, CircularProgress,
  Grid, FormControlLabel, Checkbox, Link, Avatar, LinearProgress,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import BusinessIcon from '@mui/icons-material/Business';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [validationError, setValidationError] = useState(null);
  const [invitation, setInvitation] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [stream, setStream] = useState('');
  const [department, setDepartment] = useState('');
  const [filteredDepts, setFilteredDepts] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Touch tracking for real-time error displays
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const deptCategories = [
    { id: 'aided', name: 'Aided' },
    { id: 'sfs', name: 'Self-Financed (SFS)' }
  ];

  const departmentsList = [
    { id: 1, name: 'Tamil (Aided)', category: 'aided' },
    { id: 2, name: 'English (Aided)', category: 'aided' },
    { id: 3, name: 'History (Aided)', category: 'aided' },
    { id: 4, name: 'Economics (Aided)', category: 'aided' },
    { id: 5, name: 'Mathematics (Aided)', category: 'aided' },
    { id: 6, name: 'Physics (Aided)', category: 'aided' },
    { id: 7, name: 'Chemistry (Aided)', category: 'aided' },
    { id: 8, name: 'Plant Biology & Plant Biotechnology (Aided)', category: 'aided' },
    { id: 9, name: 'Advanced Zoology & Biotechnology (Aided)', category: 'aided' },
    { id: 10, name: 'Commerce (Aided)', category: 'aided' },
    { id: 11, name: 'Physical Education (Aided)', category: 'aided' },
    { id: 12, name: 'Tamil (SFS)', category: 'sfs' },
    { id: 13, name: 'English (SFS)', category: 'sfs' },
    { id: 14, name: 'Mathematics (SFS)', category: 'sfs' },
    { id: 15, name: 'Physics (SFS)', category: 'sfs' },
    { id: 16, name: 'Chemistry (SFS)', category: 'sfs' },
    { id: 17, name: 'Computer Science (SFS)', category: 'sfs' },
    { id: 18, name: 'Computer Applications (BCA) (SFS)', category: 'sfs' },
    { id: 19, name: 'Bio-Chemistry (SFS)', category: 'sfs' },
    { id: 20, name: 'Micro-Biology (SFS)', category: 'sfs' },
    { id: 21, name: 'Biotechnology (SFS)', category: 'sfs' },
    { id: 22, name: 'Visual Communication (SFS)', category: 'sfs' },
    { id: 23, name: 'Commerce (General) (SFS)', category: 'sfs' },
    { id: 24, name: 'Commerce (Corporate Secretaryship) (SFS)', category: 'sfs' },
    { id: 25, name: 'Commerce (Computer Applications) (SFS)', category: 'sfs' },
    { id: 26, name: 'Commerce (Honours) (SFS)', category: 'sfs' },
    { id: 27, name: 'Commerce (Accounting & Finance) (SFS)', category: 'sfs' },
    { id: 28, name: 'Business Administration (BBA) (SFS)', category: 'sfs' },
    { id: 29, name: 'Social Work (BSW) (SFS)', category: 'sfs' },
    { id: 30, name: 'Social Work (MSW) (SFS)', category: 'sfs' },
  ];

  const handleStreamChange = (e) => {
    const catId = e.target.value;
    setStream(catId);
    setDepartment('');
    const foundStream = deptCategories.find(c => c.id === catId);
    if (foundStream) {
      setFilteredDepts(departmentsList.filter(d => d.category === catId));
    } else {
      setFilteredDepts([]);
    }
  };

  // Validate invitation token on load
  useEffect(() => {
    if (!token) {
      navigate('/login', { 
        state: { 
          successMessage: 'The invitation token is missing. Please sign in or request a new link.' 
        } 
      });
      return;
    }

    api.get(`/api/users/invitation/${token}/`)
      .then(res => {
        setInvitation(res.data);
        setLoading(false);
      })
      .catch(err => {
        // Redirect directly to login if invalid, expired, used, or cancelled
        navigate('/login', { 
          state: { 
            successMessage: 'This invitation link has already been used or is no longer valid. Please sign in.' 
          } 
        });
      });
  }, [token, navigate]);

  // Field validation helpers
  const validateName = (val) => {
    if (!val || !val.trim()) return 'Full Name is required.';
    if (val.trim().length < 2) return 'Full Name must be at least 2 characters.';
    return '';
  };

  const validatePhone = (val) => {
    if (!val || !val.trim()) return '';
    const phoneRegex = /^[0-9+\s\-()]{7,15}$/;
    if (!phoneRegex.test(val.trim())) return 'Please enter a valid phone number (7-15 digits).';
    return '';
  };

  const validatePasswordVal = (val) => {
    if (!val) return 'Password is required.';
    if (val.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(val)) return 'Password must include at least one uppercase letter.';
    if (!/[a-z]/.test(val)) return 'Password must include at least one lowercase letter.';
    if (!/[0-9]/.test(val)) return 'Password must include at least one digit.';
    if (!/[^A-Za-z0-9]/.test(val)) return 'Password must include at least one special character.';
    return '';
  };

  const validateConfirmPasswordVal = (val, pwd) => {
    if (!val) return 'Please confirm your password.';
    if (val !== pwd) return 'Passwords do not match.';
    return '';
  };

  // Live password validation checks
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    match: password && password === confirmPassword
  };

  const checkCount = Object.values(checks).filter(Boolean).length;
  const strengthPercentage = (checkCount / 6) * 100;

  const nameError = nameTouched ? validateName(name) : '';
  const phoneError = phoneTouched ? validatePhone(phone) : '';
  const passwordError = passwordTouched ? validatePasswordVal(password) : '';
  const confirmPasswordError = confirmPasswordTouched ? validateConfirmPasswordVal(confirmPassword, password) : '';
  
  const getStrengthColor = () => {
    if (checkCount <= 2) return 'error';
    if (checkCount <= 4) return 'warning';
    return 'success';
  };

  const getStrengthText = () => {
    if (checkCount <= 2) return 'Weak password';
    if (checkCount <= 4) return 'Medium strength';
    if (checkCount < 6) return 'Strong password';
    return 'Passwords match & all rules satisfied!';
  };

  const isFormValid = !validateName(name) && !validatePhone(phone) && checkCount === 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNameTouched(true);
    setPhoneTouched(true);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    if (!isFormValid) {
      setFormError('Please resolve all highlighted errors before submitting.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    const resolvedStream = invitation?.stream || (deptCategories.find(c => c.id === stream)?.name || stream || '');

    try {
      await api.post('/api/users/register/', {
        token,
        name,
        password,
        phone,
        designation,
        stream: resolvedStream,
        department: invitation?.department || department || '',
        company_name: companyName
      });
      
      // Redirect to login page using full page transition
      window.location.href = '/login?registered=true';
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to complete registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default' }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">Verifying your secure invitation...</Typography>
      </Box>
    );
  }

  if (validationError) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default', p: 3 }}>
        <Card sx={{ maxWidth: 480, width: '100%', borderRadius: '20px', boxShadow: '0 12px 40px rgba(0,0,0,0.05)', textAlign: 'center', overflow: 'hidden' }}>
          <Box sx={{ bgcolor: 'error.light', py: 4, display: 'flex', justifyContent: 'center' }}>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main' }} />
          </Box>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5, color: 'text.primary' }}>
              {validationError.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
              {validationError.detail}
            </Typography>
            <Button 
              variant="contained" 
              fullWidth 
              size="large"
              onClick={() => navigate('/login')}
              sx={{ borderRadius: '12px', textTransform: 'none', py: 1.5, fontWeight: 700 }}
            >
              Request New Invitation / Sign In
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      <Grid container sx={{ width: '100%' }}>
        
        {/* Left Panel: Branding */}
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
          <Box sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(var(--violet-rgb), 0.5) 0%, rgba(var(--indigo-rgb), 0) 70%)', filter: 'blur(60px)', top: '-5%', left: '10%' }} />
          <Box sx={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0) 70%)', filter: 'blur(60px)', bottom: '5%', right: '10%' }} />

          <Box sx={{ maxWidth: 460, textAlign: 'center', zIndex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.12)', width: 64, height: 64 }}>
                <CloudQueueIcon sx={{ color: '#ffffff', fontSize: 36 }} />
              </Avatar>
            </Box>
            
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.5px' }}>
              MCC LEGAL DOCUMENT
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 5, fontWeight: 500 }}>
              Professional Legal Document Registry
            </Typography>

            <Box sx={{ bgcolor: 'rgba(255,255,255,0.06)', p: 3, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>INCLUDED ASSIGNMENTS</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Stream:</strong> {invitation?.stream || (deptCategories.find(c => c.id === stream)?.name) || '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Department:</strong> {invitation?.department || department || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Role Level:</strong> {invitation?.system_role?.name || 'User'}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Right Panel: Form */}
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
            bgcolor: 'background.paper'
          }}
        >
          <Box sx={{ maxWidth: 480, width: '100%' }}>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.5px', color: 'text.primary' }}>
                Complete Account Creation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set up your login password and basic credentials for MCC LEGAL DOCUMENT.
              </Typography>
            </Box>

            {formError && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{formError}</Alert>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Email - Read-Only */}
              <TextField
                label="Email Address"
                value={invitation?.email || ''}
                slotProps={{
                  input: {
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }
                }}
                disabled
                fullWidth
              />

              {/* Full Name */}
              <TextField
                label="Full Name"
                placeholder="Enter your name..."
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => setNameTouched(true)}
                error={Boolean(nameError)}
                helperText={nameError}
                required
                fullWidth
                className={nameError ? 'input-field-shake' : ''}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: nameError ? 'error.main' : nameTouched && !nameError ? 'success.main' : 'text.secondary', fontSize: 20, transition: 'color 0.2s ease' }} />
                      </InputAdornment>
                    ),
                    endAdornment: nameTouched && !nameError && name.trim() ? (
                      <InputAdornment position="end">
                        <CheckCircleIcon fontSize="small" className="valid-icon-pop" sx={{ color: 'success.main' }} />
                      </InputAdornment>
                    ) : null
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87) !important',
                      borderRadius: '14px',
                    }
                  }
                }}
              />

              {/* Designation */}
              <TextField
                label="Designation / Title"
                placeholder="e.g. Associate Professor, Coordinator..."
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87) !important',
                      borderRadius: '14px',
                    }
                  }
                }}
              />

              {/* Phone */}
              <TextField
                label="Phone Number (Optional)"
                placeholder="Enter contact number..."
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onBlur={() => setPhoneTouched(true)}
                error={Boolean(phoneError)}
                helperText={phoneError}
                fullWidth
                className={phoneError ? 'input-field-shake' : ''}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: phoneError ? 'error.main' : phoneTouched && !phoneError && phone ? 'success.main' : 'text.secondary', fontSize: 20, transition: 'color 0.2s ease' }} />
                      </InputAdornment>
                    ),
                    endAdornment: phoneTouched && !phoneError && phone.trim() ? (
                      <InputAdornment position="end">
                        <CheckCircleIcon fontSize="small" className="valid-icon-pop" sx={{ color: 'success.main' }} />
                      </InputAdornment>
                    ) : null
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87) !important',
                      borderRadius: '14px',
                    }
                  }
                }}
              />

              {/* Company Name */}
              <TextField
                label="Company Name (Optional)"
                placeholder="Enter company name..."
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    )
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87) !important',
                      borderRadius: '14px',
                    }
                  }
                }}
              />

              {/* Dynamic Stream and Department selectors (if not pre-defined in invitation) */}
              {!invitation?.stream && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Stream</InputLabel>
                    <Select
                      value={stream}
                      label="Stream"
                      onChange={handleStreamChange}
                      sx={{ borderRadius: '14px' }}
                    >
                      {deptCategories.map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth disabled={!stream}>
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={department}
                      label="Department"
                      onChange={e => setDepartment(e.target.value)}
                      sx={{ borderRadius: '14px' }}
                    >
                      {filteredDepts.map(d => (
                        <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}

              {/* Password */}
              <TextField
                label="Set Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                error={Boolean(passwordError)}
                helperText={passwordError}
                required
                fullWidth
                className={passwordError ? 'input-field-shake' : ''}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: passwordError ? 'error.main' : passwordTouched && !passwordError ? 'success.main' : 'text.secondary', fontSize: 20, transition: 'color 0.2s ease' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end" sx={{ gap: 0.5 }}>
                        {passwordTouched && !passwordError && password && (
                          <CheckCircleIcon fontSize="small" className="valid-icon-pop" sx={{ color: 'success.main' }} />
                        )}
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87) !important',
                      borderRadius: '14px',
                    }
                  }
                }}
              />

              {/* Confirm Password */}
              <TextField
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onBlur={() => setConfirmPasswordTouched(true)}
                error={Boolean(confirmPasswordError)}
                helperText={confirmPasswordError}
                required
                fullWidth
                className={confirmPasswordError ? 'input-field-shake' : ''}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: confirmPasswordError ? 'error.main' : confirmPasswordTouched && !confirmPasswordError ? 'success.main' : 'text.secondary', fontSize: 20, transition: 'color 0.2s ease' }} />
                      </InputAdornment>
                    ),
                    endAdornment: confirmPasswordTouched && !confirmPasswordError && confirmPassword ? (
                      <InputAdornment position="end">
                        <CheckCircleIcon fontSize="small" className="valid-icon-pop" sx={{ color: 'success.main' }} />
                      </InputAdornment>
                    ) : null
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '14px',
                    '& input:-webkit-autofill': {
                      WebkitBoxShadow: '0 0 0 100px #ffffff inset !important',
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87) !important',
                      borderRadius: '14px',
                    }
                  }
                }}
              />

              {/* Password Strength Indicator */}
              {password && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8, alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      Strength: {getStrengthText()}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: `${getStrengthColor()}.main` }}>
                      {checkCount}/6 passed
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={strengthPercentage} 
                    color={getStrengthColor()} 
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                  
                  {/* Validation Checklist grid */}
                  <Grid container spacing={1} sx={{ mt: 1.5 }}>
                    {[
                      { check: checks.length, label: 'Min. 8 characters' },
                      { check: checks.upper, label: 'One uppercase letter' },
                      { check: checks.lower, label: 'One lowercase letter' },
                      { check: checks.number, label: 'One number' },
                      { check: checks.special, label: 'One special symbol' },
                      { check: checks.match, label: 'Passwords match' }
                    ].map((item, idx) => (
                      <Grid item xs={6} key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 14, color: item.check ? 'success.main' : 'text.disabled' }} />
                        <Typography variant="caption" color={item.check ? 'text.primary' : 'text.secondary'} sx={{ fontSize: '0.72rem' }}>
                          {item.label}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}



              {/* Submit Button */}
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={!isFormValid || submitting}
                sx={{
                  mt: 1,
                  py: 1.5,
                  borderRadius: '12px',
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: '0 8px 24px rgba(79, 70, 229, 0.2)'
                }}
              >
                {submitting ? <CircularProgress size={24} color="inherit" /> : 'Create Account & Sign In'}
              </Button>

            </form>

          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Register;
