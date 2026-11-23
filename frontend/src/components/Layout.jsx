import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box, Dialog, DialogContent, TextField, Typography,
  List, ListItemButton, ListItemText, IconButton,
  CircularProgress, Avatar, Paper, Button, Menu, MenuItem,
  ListItemIcon, Breadcrumbs, Link, Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderIcon from '@mui/icons-material/Folder';
import AppsIcon from '@mui/icons-material/Apps';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import Header from './Header';
import NavStrip from './NavStrip';
import SiteFooter from './SiteFooter';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';
import api from '../services/api';
import { canAccessRoute, getNormalizedRole, ROLE_SERVICES_CONFIG } from '../config/roles';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();

  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [cmdResults, setCmdResults] = useState({ folders: [], files: [], users: [] });
  const [searching, setSearching] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [moduleMenuAnchor, setModuleMenuAnchor] = useState(null);

  const userRole = getNormalizedRole(user);
  const allowedServices = ROLE_SERVICES_CONFIG[userRole] || [];

  // Fetch notifications
  const fetchNotifications = React.useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !user) return;
    try {
      const res = await api.get('/api/notifications/?limit=30');
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
        const unread = res.data.filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch {
      // Ignore background notification fetch errors
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  useAutoRefresh([REFRESH_CATEGORIES.NOTIFICATIONS, REFRESH_CATEGORIES.ALL], fetchNotifications);

  // Command palette shortcut Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === 'k') {
        const tag = e.target?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea' && !e.target?.isContentEditable) {
          e.preventDefault();
          setCmdOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search API for Command Palette
  useEffect(() => {
    if (!cmdQuery || cmdQuery.length < 2) {
      setCmdResults({ folders: [], files: [], users: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/api/search/?q=${encodeURIComponent(cmdQuery)}`);
        setCmdResults(res.data);
      } catch (err) {
        console.error('Command search error:', err);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [cmdQuery]);

  const handleCommandAction = (pathOrFn) => {
    setCmdOpen(false);
    setCmdQuery('');
    if (typeof pathOrFn === 'function') {
      pathOrFn();
    } else {
      navigate(pathOrFn);
    }
  };

  const isHomePage = location.pathname === '/';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--legal-cream-bg, #faf7f0)',
        color: 'var(--legal-text-primary, #0f172a)',
      }}
    >
      {/* 1. Top Legal Header */}
      <Header
        onOpenSearch={() => setCmdOpen(true)}
        notifications={notifications}
        unreadCount={unreadCount}
        onRefreshNotifications={fetchNotifications}
      />

      {/* 2. Navy Navigation Strip */}
      <NavStrip />

      {/* 3. Subpage Navigation Bar (shown when not on the home dashboard) */}
      {!isHomePage && (
        <Box
          sx={{
            backgroundColor: 'var(--legal-cream-card, #ffffff)',
            borderBottom: '1px solid var(--legal-border-tint, #dccb9a)',
            py: { xs: 1, sm: 1.2 },
            px: { xs: 2, md: 4 },
          }}
        >
          <Box
            sx={{
              maxWidth: 1400,
              mx: 'auto',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            {/* Left buttons: Return to Hub + Quick Module Switcher */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/')}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: 'var(--legal-navy, #0b1a3a)',
                  textTransform: 'none',
                  borderRadius: '10px',
                  px: 1.8,
                  py: 0.7,
                  minHeight: 40,
                  backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
                  border: '1px solid var(--legal-border-tint, #dccb9a)',
                  '&:hover': {
                    backgroundColor: 'var(--legal-cream-tint2, #f3ead2)',
                    borderColor: 'var(--legal-gold, #d4a82f)',
                  },
                }}
              >
                Back to Hub
              </Button>

              {/* Module Switcher Dropdown */}
              <Button
                startIcon={<AppsIcon sx={{ color: 'var(--legal-gold-border, #b8892b)' }} />}
                endIcon={<KeyboardArrowDownIcon />}
                onClick={(e) => setModuleMenuAnchor(e.currentTarget)}
                size="small"
                aria-label="Switch between services"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  color: 'var(--legal-navy, #0b1a3a)',
                  textTransform: 'none',
                  borderRadius: '10px',
                  px: 1.8,
                  py: 0.7,
                  minHeight: 40,
                  backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
                  border: '1px solid var(--legal-border-tint, #dccb9a)',
                  '&:hover': {
                    backgroundColor: 'var(--legal-cream-tint2, #f3ead2)',
                    borderColor: 'var(--legal-gold, #d4a82f)',
                  },
                }}
              >
                Switch Service
              </Button>

              <Menu
                anchorEl={moduleMenuAnchor}
                open={Boolean(moduleMenuAnchor)}
                onClose={() => setModuleMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{
                  sx: {
                    width: 280,
                    maxHeight: 420,
                    borderRadius: '16px',
                    p: 1,
                    border: '1.5px solid var(--legal-gold-border, #b8892b)',
                    boxShadow: 'var(--legal-shadow-md)',
                    backgroundColor: 'var(--legal-cream-card, #ffffff)',
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1, borderBottom: '1px solid var(--legal-border-tint, #dccb9a)', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--legal-gold-border, #b8892b)' }}>
                    Jump to Module
                  </Typography>
                </Box>
                {allowedServices.map((svc) => (
                  <MenuItem
                    key={svc.id}
                    onClick={() => {
                      setModuleMenuAnchor(null);
                      navigate(svc.path);
                    }}
                    selected={location.pathname === svc.path}
                    sx={{
                      borderRadius: '8px',
                      py: 1,
                      '&.Mui-selected': {
                        backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
                        fontWeight: 800,
                      },
                      '&:hover': {
                        backgroundColor: 'var(--legal-cream-tint2, #f3ead2)',
                      },
                    }}
                  >
                    <ListItemText
                      primary={svc.title}
                      secondary={svc.description}
                      primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--legal-navy, #0b1a3a)' }}
                      secondaryTypographyProps={{ fontSize: '0.72rem', noWrap: true }}
                    />
                  </MenuItem>
                ))}
              </Menu>
            </Box>

            {/* Right: Module Context & Breadcrumb */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: { xs: 'flex-start', sm: 'center' } }}>
              <Breadcrumbs
                separator="›"
                aria-label="breadcrumb"
                sx={{
                  fontSize: '0.78rem',
                  '& .MuiBreadcrumbs-separator': { color: 'var(--legal-gold-border, #b8892b)', fontWeight: 800 },
                }}
              >
                <Link
                  component={RouterLink}
                  underline="hover"
                  to="/"
                  sx={{ color: 'var(--legal-text-muted, #64748b)', fontWeight: 600 }}
                >
                  Hub
                </Link>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--legal-navy, #0b1a3a)',
                    textTransform: 'capitalize',
                  }}
                >
                  {location.pathname.replace(/^\//, '').split('/')[0] || 'Module'}
                </Typography>
              </Breadcrumbs>
              <Chip
                label="Legal System Module"
                size="small"
                sx={{
                  display: { xs: 'none', md: 'inline-flex' },
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
                  color: 'var(--legal-gold-border, #b8892b)',
                  border: '1px solid var(--legal-border-tint, #dccb9a)',
                  height: 22,
                }}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* 4. Main Body Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          py: { xs: 3, sm: 4, md: 5 },
          px: { xs: 1.5, sm: 3, md: 4 },
          maxWidth: 1440,
          width: '100%',
          mx: 'auto',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </Box>

      {/* 5. Legal Footer */}
      <SiteFooter />

      {/* 6. Command Palette Dialog (Ctrl+K) */}
      <Dialog
        open={cmdOpen}
        onClose={() => { setCmdOpen(false); setCmdQuery(''); }}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        BackdropProps={{
          sx: {
            backdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(11, 26, 58, 0.5)',
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: '18px',
            boxShadow: 'var(--legal-shadow-lg)',
            border: '1.5px solid var(--legal-gold-border, #b8892b)',
            backgroundColor: 'var(--legal-cream-card, #ffffff)',
            overflow: 'hidden',
            mt: '8vh',
            alignSelf: 'flex-start',
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid var(--legal-border-tint, #dccb9a)',
            gap: 1.5,
            backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
          }}
        >
          <SearchIcon sx={{ color: 'var(--legal-navy, #0b1a3a)' }} />
          <TextField
            autoFocus
            fullWidth
            variant="standard"
            placeholder="Search documents, MOUs, users or actions..."
            value={cmdQuery}
            onChange={(e) => setCmdQuery(e.target.value)}
            InputProps={{
              disableUnderline: true,
              endAdornment: (
                <IconButton size="small" onClick={() => { setCmdOpen(false); setCmdQuery(''); }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              ),
            }}
            sx={{
              '& input': {
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--legal-navy, #0b1a3a)',
              },
            }}
          />
        </Box>

        <DialogContent sx={{ p: 0, maxHeight: 380, overflowY: 'auto' }}>
          {!cmdQuery && (
            <Box>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  px: 2.5,
                  py: 1.5,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--legal-gold-border, #b8892b)',
                  backgroundColor: 'rgba(212, 168, 47, 0.08)',
                }}
              >
                Quick Institutional Navigation
              </Typography>
              <List sx={{ p: 0 }}>
                <ListItemButton onClick={() => handleCommandAction('/')} sx={{ py: 1.2, px: 2.5, gap: 2 }}>
                  <DashboardIcon sx={{ color: 'var(--legal-navy, #0b1a3a)', fontSize: '1.2rem' }} />
                  <ListItemText primary="Go to Legal Dashboard" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
                  <ArrowForwardIosIcon sx={{ fontSize: '0.65rem', color: 'text.secondary' }} />
                </ListItemButton>

                {canAccessRoute(user, '/explorer') && (
                  <ListItemButton onClick={() => handleCommandAction('/explorer')} sx={{ py: 1.2, px: 2.5, gap: 2 }}>
                    <FolderCopyIcon sx={{ color: 'var(--legal-gold-border, #b8892b)', fontSize: '1.2rem' }} />
                    <ListItemText primary="Go to MOU Repositories" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
                    <ArrowForwardIosIcon sx={{ fontSize: '0.65rem', color: 'text.secondary' }} />
                  </ListItemButton>
                )}

                {canAccessRoute(user, '/users') && (
                  <ListItemButton onClick={() => handleCommandAction('/users')} sx={{ py: 1.2, px: 2.5, gap: 2 }}>
                    <ManageAccountsIcon sx={{ color: 'var(--legal-navy, #0b1a3a)', fontSize: '1.2rem' }} />
                    <ListItemText primary="Go to User Management" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
                    <ArrowForwardIosIcon sx={{ fontSize: '0.65rem', color: 'text.secondary' }} />
                  </ListItemButton>
                )}

                {canAccessRoute(user, '/logs') && (
                  <ListItemButton onClick={() => handleCommandAction('/logs')} sx={{ py: 1.2, px: 2.5, gap: 2 }}>
                    <AdminPanelSettingsIcon sx={{ color: 'var(--legal-gold-border, #b8892b)', fontSize: '1.2rem' }} />
                    <ListItemText primary="Go to Activity Logs Audit" primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }} />
                    <ArrowForwardIosIcon sx={{ fontSize: '0.65rem', color: 'text.secondary' }} />
                  </ListItemButton>
                )}
              </List>
            </Box>
          )}

          {searching && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={28} sx={{ color: 'var(--legal-gold, #d4a82f)' }} />
            </Box>
          )}

          {cmdQuery && !searching && (
            <Box sx={{ p: 1 }}>
              {cmdResults.folders.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ px: 2, py: 0.5, fontWeight: 700, color: 'text.secondary', display: 'block' }}>
                    Folders ({cmdResults.folders.length})
                  </Typography>
                  {cmdResults.folders.slice(0, 5).map((f) => (
                    <ListItemButton key={f.id} onClick={() => handleCommandAction(`/explorer?folder=${f.id}`)} sx={{ py: 1, px: 2, borderRadius: '8px' }}>
                      <FolderIcon sx={{ color: 'var(--legal-gold-border, #b8892b)', fontSize: 20, mr: 1.5 }} />
                      <ListItemText primary={f.name} primaryTypographyProps={{ fontSize: '0.86rem', fontWeight: 600 }} />
                    </ListItemButton>
                  ))}
                </Box>
              )}

              {cmdResults.files.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ px: 2, py: 0.5, fontWeight: 700, color: 'text.secondary', display: 'block' }}>
                    Files &amp; Documents ({cmdResults.files.length})
                  </Typography>
                  {cmdResults.files.slice(0, 5).map((f) => (
                    <ListItemButton key={f.id} onClick={() => handleCommandAction(`/explorer?file=${f.id}`)} sx={{ py: 1, px: 2, borderRadius: '8px' }}>
                      <InsertDriveFileIcon sx={{ color: 'var(--legal-navy, #0b1a3a)', fontSize: 20, mr: 1.5 }} />
                      <ListItemText primary={f.name} secondary={f.department || ''} primaryTypographyProps={{ fontSize: '0.86rem', fontWeight: 600 }} />
                    </ListItemButton>
                  ))}
                </Box>
              )}

              {cmdResults.folders.length === 0 && cmdResults.files.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">No matching records found for "{cmdQuery}"</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
