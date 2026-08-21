import React from 'react';
import toast from 'react-hot-toast';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LottieAnimation from '../components/LottieAnimation';

// Hybrid function/object custom toast utility
const showCustomToastFn = (type, message) => {
  if (type === 'success') {
    showCustomToastFn.success(message);
  } else if (type === 'delete') {
    showCustomToastFn.delete(message);
  } else if (type === 'email') {
    showCustomToastFn.email(message);
  } else if (type === 'approved') {
    showCustomToastFn.approved(message);
  } else if (type === 'error') {
    showCustomToastFn.error(message);
  } else {
    toast(message);
  }
};

// 1. Success Toast with Lottie Green Tick Animation
showCustomToastFn.success = (msg) => {
  const lowerMsg = (msg || '').toLowerCase();
  const isLoginSuccess = !msg.includes(' ') || lowerMsg.includes('welcome') || lowerMsg.includes('login');

  toast.custom((t) => (
    <Box
      className={t.visible ? 'animate-toast-in' : 'animate-toast-out'}
      sx={{
        maxWidth: 440,
        width: '100%',
        bgcolor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(18px)',
        border: '1.5px solid rgba(16, 185, 129, 0.35)',
        borderRadius: '18px',
        p: 2,
        boxShadow: '0 20px 50px rgba(16, 185, 129, 0.22), 0 4px 12px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.8,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '12px',
          bgcolor: 'rgba(16, 185, 129, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        <LottieAnimation type="success" size={38} loop={false} />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem', mb: 0.2 }}>
          {isLoginSuccess ? 'Login Successful' : 'Success'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
          {isLoginSuccess && !lowerMsg.includes('welcome') ? `Welcome back, ${msg}!` : msg}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={() => toast.dismiss(t.id)}
        sx={{ color: '#94a3b8', p: 0.5, '&:hover': { color: '#475569' } }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  ), { duration: isLoginSuccess ? 2200 : 3800 });
};

// 2. Approved Toast with Lottie Green Tick Animation
showCustomToastFn.approved = (title = 'Agreement Approved') => {
  toast.custom((t) => (
    <Box
      className={t.visible ? 'animate-toast-in' : 'animate-toast-out'}
      sx={{
        maxWidth: 440,
        width: '100%',
        bgcolor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(18px)',
        border: '1.5px solid rgba(16, 185, 129, 0.4)',
        borderRadius: '18px',
        p: 2,
        boxShadow: '0 20px 50px rgba(16, 185, 129, 0.25), 0 4px 12px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.8,
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '14px',
          bgcolor: 'rgba(16, 185, 129, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        <LottieAnimation type="approved" size={42} loop={false} />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669', fontSize: '0.98rem', mb: 0.2 }}>
          MOU Approved & Active
        </Typography>
        <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
          {title}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={() => toast.dismiss(t.id)}
        sx={{ color: '#94a3b8', p: 0.5, '&:hover': { color: '#475569' } }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  ), { duration: 4000 });
};

// 3. Delete Toast with Lottie Trash/Delete Animation
showCustomToastFn.delete = (msg = 'Item moved to recycle bin') => {
  toast.custom((t) => (
    <Box
      className={t.visible ? 'animate-toast-in' : 'animate-toast-out'}
      sx={{
        maxWidth: 440,
        width: '100%',
        bgcolor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(18px)',
        border: '1.5px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '18px',
        p: 2,
        boxShadow: '0 20px 50px rgba(239, 68, 68, 0.2), 0 4px 12px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.8,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '12px',
          bgcolor: 'rgba(239, 68, 68, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        <LottieAnimation type="delete" size={38} loop={false} />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#dc2626', fontSize: '0.95rem', mb: 0.2 }}>
          Deleted
        </Typography>
        <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
          {msg}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={() => toast.dismiss(t.id)}
        sx={{ color: '#94a3b8', p: 0.5, '&:hover': { color: '#475569' } }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  ), { duration: 3800 });
};

// 4. Email / OTP Sent Toast with Lottie Animation
showCustomToastFn.email = (msg = 'Email dispatched successfully') => {
  toast.custom((t) => (
    <Box
      className={t.visible ? 'animate-toast-in' : 'animate-toast-out'}
      sx={{
        maxWidth: 440,
        width: '100%',
        bgcolor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(18px)',
        border: '1.5px solid rgba(59, 130, 246, 0.35)',
        borderRadius: '18px',
        p: 2,
        boxShadow: '0 20px 50px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.8,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '12px',
          bgcolor: 'rgba(59, 130, 246, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden'
        }}
      >
        <LottieAnimation type="email" size={38} loop={false} />
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2563eb', fontSize: '0.95rem', mb: 0.2 }}>
          Email Sent
        </Typography>
        <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
          {msg}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={() => toast.dismiss(t.id)}
        sx={{ color: '#94a3b8', p: 0.5, '&:hover': { color: '#475569' } }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  ), { duration: 4000 });
};

// 5. Generic Error Toast
showCustomToastFn.error = (msg) => {
  toast.custom((t) => (
    <Box
      className={t.visible ? 'animate-toast-in' : 'animate-toast-out'}
      sx={{
        maxWidth: 420,
        width: '100%',
        bgcolor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        borderRadius: '16px',
        p: 2,
        boxShadow: '0 20px 50px rgba(244, 63, 94, 0.15), 0 4px 12px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.8,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          bgcolor: 'rgba(244, 63, 94, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          flexShrink: 0
        }}
      >
        ❌
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#e11d48', fontSize: '0.95rem', mb: 0.2 }}>
          Error
        </Typography>
        <Typography variant="body2" sx={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
          {msg || 'An error occurred. Please try again.'}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={() => toast.dismiss(t.id)}
        sx={{ color: '#94a3b8', p: 0.5, '&:hover': { color: '#475569' } }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  ), { duration: 4000 });
};

// 6. Invalid Email or Password (401)
showCustomToastFn.invalidCredentials = (msg) => {
  toast.custom((t) => (
    <Box
      className={t.visible ? 'animate-toast-in' : 'animate-toast-out'}
      sx={{
        maxWidth: 420,
        width: '100%',
        bgcolor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '16px',
        p: 2.2,
        boxShadow: '0 20px 50px rgba(239, 68, 68, 0.18), 0 4px 12px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.8,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          bgcolor: 'rgba(239, 68, 68, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          flexShrink: 0
        }}
      >
        ❌
      </Box>
      <Box sx={{ flexGrow: 1, pr: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ef4444', fontSize: '0.95rem', mb: 0.3 }}>
          Login Failed
        </Typography>
        <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.45, fontWeight: 500 }}>
          {msg || 'Incorrect password. If you don\'t know your password, please click Forgot Password.'}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={() => toast.dismiss(t.id)}
        sx={{ color: '#94a3b8', p: 0.5, '&:hover': { color: '#475569' } }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  ), { duration: 5000 });
};

// 7. Google Login Errors
showCustomToastFn.googleError = (customMessage) => {
  toast.custom((t) => (
    <Box
      className={t.visible ? 'animate-toast-in' : 'animate-toast-out'}
      sx={{
        maxWidth: 420,
        width: '100%',
        bgcolor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '16px',
        p: 2.2,
        boxShadow: '0 20px 50px rgba(239, 68, 68, 0.18), 0 4px 12px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.8,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          bgcolor: 'rgba(239, 68, 68, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          flexShrink: 0
        }}
      >
        ❌
      </Box>
      <Box sx={{ flexGrow: 1, pr: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#ef4444', fontSize: '0.95rem', mb: 0.3 }}>
          Google Sign-in Failed
        </Typography>
        <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.45, fontWeight: 500 }}>
          {customMessage || 'Unable to sign in with Google. Please try again later or use your email and password.'}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={() => toast.dismiss(t.id)}
        sx={{ color: '#94a3b8', p: 0.5, '&:hover': { color: '#475569' } }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  ), { duration: 4000 });
};

// 8. Network Error
showCustomToastFn.networkError = () => {
  toast.custom((t) => (
    <Box
      className={t.visible ? 'animate-toast-in' : 'animate-toast-out'}
      sx={{
        maxWidth: 420,
        width: '100%',
        bgcolor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: '16px',
        p: 2.2,
        boxShadow: '0 20px 50px rgba(59, 130, 246, 0.18), 0 4px 12px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.8,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          bgcolor: 'rgba(59, 130, 246, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          flexShrink: 0
        }}
      >
        🌐
      </Box>
      <Box sx={{ flexGrow: 1, pr: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2563eb', fontSize: '0.95rem', mb: 0.3 }}>
          Connection Error
        </Typography>
        <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.45, fontWeight: 500 }}>
          Unable to connect to the server.<br />Please check your internet connection.
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={() => toast.dismiss(t.id)}
        sx={{ color: '#94a3b8', p: 0.5, '&:hover': { color: '#475569' } }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  ), { duration: 4000 });
};

// 9. Server Error (500)
showCustomToastFn.serverError = () => {
  toast.custom((t) => (
    <Box
      className={t.visible ? 'animate-toast-in' : 'animate-toast-out'}
      sx={{
        maxWidth: 420,
        width: '100%',
        bgcolor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '16px',
        p: 2.2,
        boxShadow: '0 20px 50px rgba(245, 158, 11, 0.18), 0 4px 12px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.8,
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          bgcolor: 'rgba(245, 158, 11, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          flexShrink: 0
        }}
      >
        ⚠
      </Box>
      <Box sx={{ flexGrow: 1, pr: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#d97706', fontSize: '0.95rem', mb: 0.3 }}>
          Server Error
        </Typography>
        <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.45, fontWeight: 500 }}>
          Something went wrong.<br />Please try again later.
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={() => toast.dismiss(t.id)}
        sx={{ color: '#94a3b8', p: 0.5, '&:hover': { color: '#475569' } }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  ), { duration: 4000 });
};

export const showCustomToast = showCustomToastFn;
