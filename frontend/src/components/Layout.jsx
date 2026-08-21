import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, Box, Drawer, IconButton, Toolbar, Typography, 
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Divider, Badge, Menu, MenuItem, Avatar, Tooltip, 
  Popover, Button, TextField, InputAdornment, Dialog, DialogContent,
  BottomNavigation, BottomNavigationAction, Paper, CircularProgress,
  Chip, Switch, FormControlLabel
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import HistoryIcon from '@mui/icons-material/History';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import MapIcon from '@mui/icons-material/Map';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ShareIcon from '@mui/icons-material/Share';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ExtensionIcon from '@mui/icons-material/Extension';
import BusinessIcon from '@mui/icons-material/Business';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

import { useAuth } from '../context/AuthContext';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';
import { useThemeMode } from '../context/ThemeContext';
import { useSiteTime } from '../context/SiteTimeContext';
import { useSiteCustomization } from '../context/SiteCustomizationContext';
import api from '../services/api';

const drawerWidth = 260;
const drawerWidthCollapsed = 68;

const Layout = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const { siteTime, isCustom, setCustomTime, resetToLive, getFormattedSiteDateTime } = useSiteTime();
  const { info } = useSiteCustomization();
  const sidebarTitle = info?.sidebar_title || 'MCC LEGAL';
  const sidebarSubtitle = info?.sidebar_subtitle || 'Documents';
  const [clockAnchor, setClockAnchor] = useState(null);
  
  const handleClockOpen = (e) => setClockAnchor(e.currentTarget);
  const handleClockClose = () => setClockAnchor(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarLocked, setSidebarLocked] = useState(() => {
    try { return localStorage.getItem('sidebar_locked') === 'true'; } catch { return false; }
  });
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [notiAnchor, setNotiAnchor] = useState(null);
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  // Command Palette states
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [cmdResults, setCmdResults] = useState({ folders: [], files: [], users: [] });
  const [searching, setSearching] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token || !user) return;
    try {
      const res = await api.get('/api/notifications/');
      if (Array.isArray(res.data)) {
        setNotifications(res.data);
        const unread = res.data.filter(n => !n.is_read).length;
        setUnreadCount(unread);
        
        // Display welcome notification pop up once per session if unread notifications exist
        if (unread > 0 && !sessionStorage.getItem('login_notified')) {
          setShowLoginPopup(true);
          sessionStorage.setItem('login_notified', 'true');
        }
      }
    } catch (err) {
      // Silently ignore background polling errors
    }
  };


  // Keyboard shortcut listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll notifications only when user is authenticated
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Query search for Command Palette
  useEffect(() => {
    if (!cmdQuery || cmdQuery.length < 2) {
      setCmdResults({ folders: [], files: [], users: [] });
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/api/search/?q=${encodeURIComponent(cmdQuery)}`);
        setCmdResults(res.data);
      } catch (err) {
        console.error("Command palette search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [cmdQuery]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileOpen = (e) => {
    setProfileAnchor(e.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchor(null);
  };

  const handleNotiOpen = (e) => {
    setNotiAnchor(e.currentTarget);
  };

  const handleNotiClose = () => {
    setNotiAnchor(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('login_notified');
    logout();
    navigate('/login');
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/mark-read/`);
      fetchNotifications();
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read/');
      fetchNotifications();
    } catch (err) {
      console.error("Mark all read failed:", err);
    }
  };

  const handleClearNotification = async (id) => {
    try {
      await api.delete(`/api/notifications/${id}/`);
      fetchNotifications();
    } catch (err) {
      console.error("Clear notification failed:", err);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await api.post('/api/notifications/clear-all/');
      fetchNotifications();
    } catch (err) {
      console.error("Clear all notifications failed:", err);
    }
  };

  const [customPages, setCustomPages] = useState([]);

  const fetchCustomPages = React.useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await api.get('/api/users/custom-pages/');
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const userRole = (user?.role?.name || (user?.is_superuser ? 'Super Admin' : 'User')).trim();
      const isSuperOrAdmin = userRole.toLowerCase() === 'super admin' || userRole.toLowerCase() === 'admin' || !!user?.is_superuser;
      const userId = String(user?.id || '');

      setCustomPages(rawList.filter(p => {
        if (p.is_published === false || p.is_enabled === false) return false;
        if (isSuperOrAdmin) return true;
        const roles = p.allowed_roles || [];
        const allowedUserIds = (p.allowed_permissions || []).map(String);
        if (roles.length === 0 && allowedUserIds.length === 0) return true;
        return roles.some(r => r.toLowerCase() === userRole.toLowerCase()) || allowedUserIds.includes(userId);
      }));
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.debug('Failed to load custom pages for sidebar:', err);
      }
    }
  }, [user]);


  useEffect(() => {
    if (user) {
      fetchCustomPages();
    }
  }, [user, fetchCustomPages]);

  useAutoRefresh(REFRESH_CATEGORIES.SETTINGS, fetchCustomPages);
  useAutoRefresh([REFRESH_CATEGORIES.NOTIFICATIONS, REFRESH_CATEGORIES.FOLDERS, REFRESH_CATEGORIES.ALL], fetchNotifications);

  const menuItems = [
    { text: 'Dashboard',       icon: <DashboardIcon />,          path: '/',           permission: 'view_dashboard', iconColor: 'var(--indigo)' },
    { text: 'Shared With Me',  icon: <ShareIcon />,              path: '/shared',     permission: 'view_dashboard', iconColor: '#3B82F6' },
    { text: 'Departments',     icon: <BusinessIcon />,           path: '/departments', permission: 'view_dashboard', iconColor: '#14B8A6' },
    { text: 'Notifications',   icon: <NotificationsIcon />,      path: '/notifications', permission: 'view_notifications', iconColor: '#F43F5E' },
    { text: 'MOU Templates',   icon: <ExtensionIcon />,          path: '/templates',  permission: 'manage_users',   iconColor: '#F59E0B' },
    { text: 'MOU Repositories', icon: <FolderCopyIcon />,          path: '/explorer',   permission: 'view_folder',    iconColor: '#0EA5E9' },
    { text: 'User Management', icon: <ManageAccountsIcon />,      path: '/users',      permission: 'manage_users',   iconColor: '#EC4899' },
    { text: 'Activity Logs',   icon: <AdminPanelSettingsIcon />,  path: '/logs',       permission: 'manage_users',   iconColor: '#F97316' },
    { text: 'Recycle Bin',     icon: <DeleteIcon />,              path: '/recycle-bin',permission: 'manage_users',   iconColor: '#EF4444' },
    { text: 'Import & Export', icon: <SystemUpdateAltIcon />,     path: '/import-export', permission: 'manage_users', iconColor: '#10B981' },
    { text: 'System Settings', icon: <SettingsIcon />,           path: '/settings',   permission: 'view_dashboard', iconColor: '#64748B' },
    { text: 'System Map',      icon: <MapIcon />,                 path: '/system-map', permission: 'view_dashboard', iconColor: '#6366F1' },
  ];

  const handleCommandAction = (actionPath) => {
    setCmdOpen(false);
    setCmdQuery('');
    if (typeof actionPath === 'function') {
      actionPath();
    } else {
      navigate(actionPath);
    }
  };

  const isSidebarExpanded = sidebarLocked || sidebarHovered;
  const isCollapsed = !isSidebarExpanded;
  const activeSidebarWidth = isSidebarExpanded ? drawerWidth : drawerWidthCollapsed;

  const handleToggleLock = () => {
    const next = !sidebarLocked;
    setSidebarLocked(next);
    try { localStorage.setItem('sidebar_locked', String(next)); } catch { }
  };

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

      {/* Brand Header */}
      <Box sx={{
        px: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 64,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        transition: 'justify-content 0.28s ease',
        overflow: 'hidden',
      }}>
        <Avatar sx={{ background: 'linear-gradient(135deg, var(--indigo), var(--violet))', width: 36, height: 36, flexShrink: 0, boxShadow: '0 2px 8px rgba(var(--indigo-rgb), 0.35)' }}>
          <CloudQueueIcon sx={{ color: '#ffffff', fontSize: '1.15rem' }} />
        </Avatar>
        <Box sx={{
          maxWidth: isCollapsed ? 0 : 160,
          overflow: 'hidden',
          opacity: isCollapsed ? 0 : 1,
          transition: 'max-width 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease',
          whiteSpace: 'nowrap',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Typography sx={{
            fontWeight: 800,
            fontSize: '0.95rem',
            letterSpacing: '0.5px',
            background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.2,
          }}>
            {sidebarTitle}
          </Typography>
          <Typography variant="caption" sx={{
            fontWeight: 600,
            letterSpacing: '0.5px',
            fontSize: '0.75rem',
            color: 'text.secondary',
            lineHeight: 1.2,
          }}>
            {sidebarSubtitle}
          </Typography>
        </Box>

        {/* Lock / Pin Button — visible only when expanded */}
        <Box sx={{
          ml: 'auto',
          maxWidth: isCollapsed ? 0 : 36,
          opacity: isCollapsed ? 0 : 1,
          overflow: 'hidden',
          transition: 'max-width 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
          flexShrink: 0,
        }}>
          <Tooltip title={sidebarLocked ? 'Unpin sidebar' : 'Pin sidebar open'} placement="right" arrow>
            <IconButton
              size="small"
              onClick={handleToggleLock}
              sx={{
                width: 28, height: 28,
                borderRadius: '8px',
                color: sidebarLocked ? 'primary.main' : 'text.disabled',
                bgcolor: sidebarLocked ? 'rgba(79,70,229,0.1)' : 'transparent',
                border: '1px solid',
                borderColor: sidebarLocked ? 'primary.light' : 'divider',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: sidebarLocked ? 'rgba(79,70,229,0.18)' : 'action.hover',
                  color: 'primary.main',
                  borderColor: 'primary.light',
                },
                '& svg': {
                  fontSize: '0.95rem',
                  transform: sidebarLocked ? 'rotate(-45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.22s cubic-bezier(0.22,1,0.36,1)',
                },
              }}
            >
              {sidebarLocked ? <PushPinIcon /> : <PushPinOutlinedIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Divider />

      {/* User Quick Info */}
      <Box sx={{
        px: 1.5,
        py: 1.2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.2,
        overflow: 'hidden',
        minHeight: 56,
      }}>
        <Avatar sx={{
          width: 34, height: 34,
          border: '2px solid',
          borderColor: 'primary.light',
          background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
          fontSize: '0.85rem',
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {user?.name?.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{
          maxWidth: isCollapsed ? 0 : 180,
          overflow: 'hidden',
          opacity: isCollapsed ? 0 : 1,
          transition: 'max-width 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.22s ease',
          whiteSpace: 'nowrap',
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: 'text.primary', lineHeight: 1.2 }} noWrap>
            {user?.name}
          </Typography>
          <Typography sx={{ fontSize: '0.70rem', color: 'text.secondary', lineHeight: 1.4 }} noWrap>
            {user?.role?.name || 'User'}
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Navigation List */}
      <List sx={{ px: 0.5, py: 0.5, flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {menuItems.map((item) => {
          if (item.permission && !hasPermission(item.permission)) return null;
          if (item.path === '/settings' && user?.role?.name !== 'Super Admin') return null;
          if (['/users', '/departments'].includes(item.path) && user?.role?.name?.toLowerCase() === 'user') return null;
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
              <Tooltip title={isCollapsed ? item.text : ''} placement="right" arrow>
                <ListItemButton
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  selected={isSelected}
                  sx={{
                    borderRadius: '10px',
                    py: 0.9,
                    px: 1,
                    minHeight: 40,
                    justifyContent: 'flex-start',
                    overflow: 'hidden',
                    transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
                    ...(isSelected ? {
                      background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)',
                      boxShadow: '0 4px 12px rgba(var(--indigo-rgb), 0.3)',
                      '&:hover': { opacity: 0.92 },
                    } : {
                      '&:hover': { bgcolor: 'action.hover' },
                    }),
                  }}
                >
                  <Box sx={{
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '8px',
                    bgcolor: isSelected ? 'rgba(255,255,255,0.18)' : (item.iconColor.startsWith('var(') ? 'rgba(var(--indigo-rgb), 0.08)' : `${item.iconColor}18`),
                    color: isSelected ? '#ffffff' : item.iconColor,
                    flexShrink: 0,
                    transition: 'background-color 0.2s ease',
                    '& svg': { fontSize: '1.05rem' },
                  }}>
                    {item.icon}
                  </Box>
                  <Box sx={{
                    maxWidth: isCollapsed ? 0 : 180,
                    overflow: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    transition: 'max-width 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
                    whiteSpace: 'nowrap',
                    ml: 1.2,
                  }}>
                    <Typography sx={{
                      fontSize: '0.858rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#ffffff' : 'text.primary',
                      lineHeight: 1,
                    }}>
                      {item.text}
                    </Typography>
                  </Box>
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}

        {/* Dynamic Custom Modules created via Website Builder */}
        {customPages.map((cp) => {
          const targetRoute = cp.route?.startsWith('/custom-page/')
            ? cp.route
            : (cp.route?.startsWith('/') ? cp.route : `/custom-page/${cp.slug}`);
          const isSelected = location.pathname === targetRoute || location.pathname === `/custom-page/${cp.slug}`;
          return (
            <ListItem key={cp.id} disablePadding sx={{ mb: 0.25 }}>
              <Tooltip title={isCollapsed ? cp.title : ''} placement="right" arrow>
                <ListItemButton
                  onClick={() => {
                    if (cp.open_new_tab) {
                      window.open(targetRoute, '_blank');
                    } else {
                      navigate(targetRoute);
                      setMobileOpen(false);
                    }
                  }}
                  selected={isSelected}
                  sx={{
                    borderRadius: '10px',
                    py: 0.9,
                    px: 1,
                    minHeight: 40,
                    justifyContent: 'flex-start',
                    overflow: 'hidden',
                    transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
                    ...(isSelected ? {
                      background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)',
                      boxShadow: '0 4px 12px rgba(var(--indigo-rgb), 0.3)',
                      '&:hover': { opacity: 0.92 },
                    } : {
                      '&:hover': { bgcolor: 'action.hover' },
                    }),
                  }}
                >
                  <Box sx={{
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '8px',
                    bgcolor: isSelected ? 'rgba(255,255,255,0.18)' : 'rgba(59, 130, 246, 0.12)',
                    color: isSelected ? '#ffffff' : '#3B82F6',
                    flexShrink: 0,
                    '& svg': { fontSize: '1.05rem' },
                  }}>
                    <FolderIcon />
                  </Box>
                  <Box sx={{
                    maxWidth: isCollapsed ? 0 : 180,
                    overflow: 'hidden',
                    opacity: isCollapsed ? 0 : 1,
                    transition: 'max-width 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
                    whiteSpace: 'nowrap',
                    ml: 1.2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    minWidth: 0
                  }}>
                    <Typography sx={{
                      fontSize: '0.858rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#ffffff' : 'text.primary',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      {cp.title}
                    </Typography>
                    {cp.badge && (
                      <Chip label={cp.badge} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, bgcolor: cp.badge_color || '#3B82F6', color: '#fff', ml: 0.5, flexShrink: 0 }} />
                    )}
                  </Box>
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Bottom: Profile & Logout */}
      <Box sx={{ px: 0.5, py: 1 }}>
        {/* Profile */}
        <Tooltip title={isCollapsed ? 'My Profile' : ''} placement="right" arrow>
          <ListItemButton
            onClick={() => navigate('/profile')}
            selected={location.pathname === '/profile'}
            sx={{
              borderRadius: '10px',
              py: 0.9, px: 1,
              mb: 0.25,
              minHeight: 40,
              overflow: 'hidden',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                '& .MuiListItemIcon-root': { color: '#fff' },
                '&:hover': { bgcolor: 'primary.dark' },
              },
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box sx={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px',
              bgcolor: location.pathname === '/profile' ? 'rgba(255,255,255,0.18)' : 'rgba(99,102,241,0.1)',
              color: location.pathname === '/profile' ? '#fff' : 'primary.main',
              flexShrink: 0,
              '& svg': { fontSize: '1.15rem' },
            }}>
              <AccountCircleIcon />
            </Box>
            <Box sx={{
              maxWidth: isCollapsed ? 0 : 180, overflow: 'hidden',
              opacity: isCollapsed ? 0 : 1,
              transition: 'max-width 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
              whiteSpace: 'nowrap', ml: 1.2,
            }}>
              <Typography sx={{ fontSize: '0.858rem', fontWeight: 500, color: location.pathname === '/profile' ? '#fff' : 'text.primary' }}>
                My Profile
              </Typography>
            </Box>
          </ListItemButton>
        </Tooltip>

        {/* Sign Out */}
        <Tooltip title={isCollapsed ? 'Sign Out' : ''} placement="right" arrow>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: '10px',
              py: 0.9, px: 1,
              minHeight: 40,
              overflow: 'hidden',
              '&:hover': { bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.12)' : '#fef2f2' },
            }}
          >
            <Box sx={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px',
              bgcolor: 'rgba(239,68,68,0.08)',
              color: 'error.main',
              flexShrink: 0,
              '& svg': { fontSize: '1.15rem' },
            }}>
              <LogoutIcon />
            </Box>
            <Box sx={{
              maxWidth: isCollapsed ? 0 : 180, overflow: 'hidden',
              opacity: isCollapsed ? 0 : 1,
              transition: 'max-width 0.28s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease',
              whiteSpace: 'nowrap', ml: 1.2,
            }}>
              <Typography sx={{ fontSize: '0.858rem', fontWeight: 500, color: 'error.main' }}>Sign Out</Typography>
            </Box>
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      
      {/* AppBar (Top Navigation) */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${activeSidebarWidth}px)` },
          ml: { md: `${activeSidebarWidth}px` },
          transition: 'width 0.28s cubic-bezier(0.22,1,0.36,1), margin-left 0.28s cubic-bezier(0.22,1,0.36,1)',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(12px)',
          backgroundColor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(17,24,39,0.92)'
            : 'rgba(255,255,255,0.92)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2, minHeight: 64 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>

            {/* Topbar Search Input - triggers command palette */}
            <TextField
              size="small"
              placeholder="Search or type a command... (Ctrl + K)"
              value={searchQuery}
              onClick={() => setCmdOpen(true)}
              readOnly
              sx={{ 
                width: { xs: 150, sm: 320 },
                cursor: 'pointer',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px',
                  cursor: 'pointer',
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
                },
                '& input': { cursor: 'pointer' }
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end" sx={{ display: { xs: 'none', sm: 'flex' } }}>
                      <Typography variant="caption" sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', px: 1, py: 0.25, borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, color: 'text.secondary', fontFamily: 'monospace' }}>
                        Ctrl + K
                      </Typography>
                    </InputAdornment>
                  )
                }
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* ── Date & Time Display ────────────────── */}
            <Box
              onClick={handleClockOpen}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0, cursor: 'pointer',
                border: '1px solid',
                borderColor: isCustom ? '#f59e0b' : 'divider',
                borderRadius: '12px',
                overflow: 'hidden',
                mr: 1,
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:hover': { boxShadow: '0 2px 10px rgba(0,0,0,0.08)', borderColor: isCustom ? '#f59e0b' : 'primary.light' },
              }}
            >
              {/* Date block */}
              <Tooltip title={isCustom ? 'Simulated date (click to edit)' : 'Live date (click to override)'} arrow>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  px: 1.5, py: 0.65,
                  bgcolor: isCustom ? 'rgba(245,158,11,0.08)' : (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc',
                  borderRight: '1px solid',
                  borderColor: isCustom ? 'rgba(245,158,11,0.3)' : 'divider',
                }}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: '6px',
                    bgcolor: isCustom ? 'rgba(245,158,11,0.15)' : 'rgba(79,70,229,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <CalendarTodayIcon sx={{ fontSize: '0.75rem', color: isCustom ? '#f59e0b' : 'primary.main' }} />
                  </Box>
                  <Typography sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: isCustom ? '#d97706' : 'text.primary',
                    letterSpacing: '0.2px',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                  }}>
                    {siteTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                </Box>
              </Tooltip>

              {/* Time block */}
              <Tooltip title={isCustom ? 'Simulated time (click to edit)' : 'Live time (click to override)'} arrow>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  px: 1.5, py: 0.65,
                  bgcolor: isCustom ? 'rgba(245,158,11,0.05)' : (theme) => theme.palette.mode === 'dark' ? '#1a2234' : '#ffffff',
                }}>
                  <Box sx={{
                    width: 22, height: 22, borderRadius: '6px',
                    bgcolor: isCustom ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <HistoryIcon sx={{ fontSize: '0.75rem', color: isCustom ? '#f59e0b' : '#10B981' }} />
                  </Box>
                  <Typography sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: isCustom ? '#d97706' : 'text.primary',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                    fontFamily: 'monospace',
                  }}>
                    {siteTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </Typography>
                  {isCustom && (
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
                  )}
                </Box>
              </Tooltip>
            </Box>

            {/* Quick System Map / Help Button */}
            <Tooltip title="How This System Works (Lifecycle Guide)">
              <IconButton 
                onClick={() => navigate('/system-map')} 
                sx={{ 
                  color: 'primary.main', 
                  border: '1px solid', 
                  borderColor: 'rgba(79, 70, 229, 0.25)', 
                  bgcolor: 'rgba(79, 70, 229, 0.06)',
                  p: 1,
                  '&:hover': { bgcolor: 'rgba(79, 70, 229, 0.12)', transform: 'translateY(-1px)' }
                }}
              >
                <HelpCenterIcon sx={{ fontSize: '1.2rem' }} />
              </IconButton>
            </Tooltip>

            {/* Theme Toggle Button */}
            <Tooltip title={mode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <IconButton onClick={toggleTheme} color="default" sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider', p: 1, '&:hover': { transform: 'rotate(15deg)' } }}>
                {mode === 'dark' ? <LightModeIcon sx={{ fontSize: '1.2rem', color: '#F59E0B' }} /> : <DarkModeIcon sx={{ fontSize: '1.2rem' }} />}
              </IconButton>
            </Tooltip>

            {/* Notifications Trigger */}
            <Tooltip title="Notifications">
              <IconButton 
                onClick={handleNotiOpen} 
                color="default" 
                className={unreadCount > 0 ? "animate-bell" : ""}
                sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider', p: 1 }}
              >
                <Badge badgeContent={unreadCount} color="error" className={unreadCount > 0 ? "animate-pulse-soft" : ""}>
                  <NotificationsIcon sx={{ fontSize: '1.2rem', color: unreadCount > 0 ? '#F43F5E' : 'inherit' }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Profile dropdown avatar */}
            <Tooltip title={user?.name || "Account Profile"}>
              <IconButton onClick={handleProfileOpen} sx={{ p: 0.2, ml: 0.5, border: '2px solid', borderColor: 'primary.main', transition: 'transform 0.2s ease', '&:hover': { transform: 'scale(1.08)' } }}>
                <Avatar sx={{ background: 'linear-gradient(135deg, var(--indigo), var(--violet))', width: 32, height: 32, fontSize: '0.85rem', fontWeight: 700 }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Clock Override Popover */}
      <Popover
        open={Boolean(clockAnchor)}
        anchorEl={clockAnchor}
        onClose={handleClockClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{ paper: { sx: { p: 2.5, width: 280, borderRadius: '16px', mt: 1.5 } } }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
          Site Date & Time Override
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isCustom}
                onChange={(e) => {
                  if (e.target.checked) {
                    setCustomTime(siteTime.toISOString());
                  } else {
                    resetToLive();
                  }
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Override System Clock
              </Typography>
            }
          />

          {isCustom && (
            <TextField
              label="Simulated Date & Time"
              type="datetime-local"
              size="small"
              value={getFormattedSiteDateTime()}
              onChange={(e) => setCustomTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          )}

          {isCustom && (
            <Button 
              variant="outlined" 
              color="primary" 
              size="small" 
              onClick={() => { resetToLive(); handleClockClose(); }}
              sx={{ borderRadius: '8px', fontWeight: 700 }}
            >
              Reset to Live Clock
            </Button>
          )}
        </Box>
      </Popover>

      {/* Notifications Popover list */}
      <Popover
        open={Boolean(notiAnchor)}
        anchorEl={notiAnchor}
        onClose={handleNotiClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, maxHeight: 420, borderRadius: '16px', mt: 1.5, border: '1px solid', borderColor: 'divider', boxShadow: '0 12px 32px rgba(0,0,0,0.1)' } } }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: '0.72rem', textTransform: 'none', px: 0.5 }}>
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button size="small" onClick={handleClearAllNotifications} color="error" sx={{ fontSize: '0.72rem', textTransform: 'none', px: 0.5 }}>
                Clear all
              </Button>
            )}
          </Box>
        </Box>
        <Divider />
        <List sx={{ p: 0, overflowY: 'auto', maxHeight: 300 }}>
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <ListItem 
                key={n.id} 
                disablePadding
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => handleClearNotification(n.id)} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}>
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                }
              >
                <ListItemButton 
                  onClick={async () => {
                    if (!n.is_read) {
                      await handleMarkAsRead(n.id);
                    }
                    handleNotiClose();
                    if (n.metadata?.folder_id) {
                      navigate(`/explorer?folder=${n.metadata.folder_id}`);
                    } else if (n.metadata?.action === 'user_created' || n.metadata?.action === 'user_disabled') {
                      navigate('/users');
                    }
                  }}
                  sx={{ 
                    py: 1.5, 
                    px: 2, 
                    alignItems: 'flex-start',
                    bgcolor: n.is_read ? 'transparent' : 'action.hover'
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, mt: 0.5, color: n.is_read ? 'text.disabled' : 'primary.main' }}>
                    <NotificationsActiveIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    disableTypography
                    primary={
                      <Typography variant="body2" component="div" sx={{ fontSize: '0.85rem', fontWeight: n.is_read ? 500 : 700, color: n.is_read ? 'text.secondary' : 'text.primary' }}>
                        {n.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" component="div" color="text.secondary" sx={{ display: 'block', fontSize: '0.8rem', mt: 0.25 }}>
                          {n.description}
                        </Typography>
                        <Typography variant="caption" component="div" color="text.disabled" sx={{ fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                          {new Date(n.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No notifications yet.
              </Typography>
            </Box>
          )}
        </List>
      </Popover>

      {/* Profile menu dropdown */}
      <Menu
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={handleProfileClose}
        onClick={handleProfileClose}
        slotProps={{ paper: { sx: { width: 220, borderRadius: '16px', mt: 1.5, border: '1px solid', borderColor: 'divider', boxShadow: '0 12px 32px rgba(0,0,0,0.1)' } } }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{user?.name}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={() => navigate('/profile')}>
          <AccountCircleIcon sx={{ fontSize: 20, mr: 1.5, color: 'text.secondary' }} />
          Profile Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <LogoutIcon sx={{ fontSize: 20, mr: 1.5, color: 'error.main' }} />
          Sign Out
        </MenuItem>
      </Menu>

      {/* Drawer Sidebar (Navigation panel) */}
      <Box
        component="nav"
        sx={{
          width: { md: activeSidebarWidth },
          flexShrink: { md: 0 },
          transition: 'width 0.28s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth, 
              backgroundImage: 'none',
              background: (theme) => theme.palette.mode === 'dark' ? '#111827' : '#ffffff',
              color: 'text.primary',
              borderRight: (theme) => `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {sidebarContent}
        </Drawer>
        
        {/* Desktop drawer — icon-only by default, expands on hover or when locked */}
        <Drawer
          variant="permanent"
          onMouseEnter={() => !sidebarLocked && setSidebarHovered(true)}
          onMouseLeave={() => !sidebarLocked && setSidebarHovered(false)}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: isSidebarExpanded ? drawerWidth : drawerWidthCollapsed,
              borderRight: (theme) => `1px solid ${theme.palette.divider}`,
              backgroundImage: 'none',
              background: (theme) => theme.palette.mode === 'dark' ? '#12141E' : '#ffffff',
              color: 'text.primary',
              overflowX: 'hidden',
              transition: 'width 0.28s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: (sidebarHovered && !sidebarLocked) ? '4px 0 24px rgba(0,0,0,0.12)' : 'none',
              zIndex: 1300,
            },
          }}
          open
        >
          {sidebarContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          px: { xs: 1.5, sm: 2.5, md: 3 },
          py: { xs: 2, md: 2.5 },
          mt: 8,
          mb: { xs: 8, md: 0 },
          bgcolor: 'background.default',
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
        }}
      >
        {children}
      </Box>

      {/* Mobile Floating Bottom Navigation Bar */}
      <Paper 
        elevation={3} 
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: 100, 
          display: { xs: 'block', md: 'none' },
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <BottomNavigation
          showLabels
          value={location.pathname === '/' ? 0 : location.pathname.startsWith('/explorer') ? 1 : location.pathname.startsWith('/profile') ? 3 : 2}
          onChange={(event, newValue) => {
            if (newValue === 0) navigate('/');
            else if (newValue === 1) navigate('/explorer');
            else if (newValue === 2) setCmdOpen(true);
            else if (newValue === 3) navigate('/profile');
          }}
          sx={{
            height: 64,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              padding: '6px 0',
              color: 'text.secondary',
              '&.Mui-selected': {
                color: 'primary.main',
                '& .MuiSvgIcon-root': {
                  transform: 'scale(1.1)',
                  transition: 'transform 0.2s ease-in-out'
                }
              }
            }
          }}
        >
          <BottomNavigationAction label="Home" icon={<DashboardIcon sx={{ fontSize: '1.3rem' }} />} />
          <BottomNavigationAction label="Folders" icon={<FolderCopyIcon sx={{ fontSize: '1.3rem' }} />} />
          <BottomNavigationAction label="Search" icon={<SearchIcon sx={{ fontSize: '1.3rem' }} />} />
          <BottomNavigationAction label="Profile" icon={<AccountCircleIcon sx={{ fontSize: '1.3rem' }} />} />
        </BottomNavigation>
      </Paper>

      {/* Notion-style Command Palette Modal Dialog */}
      <Dialog 
        open={cmdOpen} 
        onClose={() => { setCmdOpen(false); setCmdQuery(''); }}
        maxWidth="sm" 
        fullWidth
        scroll="paper"
        BackdropProps={{
          sx: {
            backdropFilter: 'blur(6px)',
            bgcolor: 'rgba(15, 23, 42, 0.4)'
          }
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid',
              borderColor: 'divider',
              background: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff',
              backgroundImage: 'none',
              overflow: 'hidden',
              mt: '8vh',
              alignSelf: 'flex-start'
            }
          }
        }}
      >
        {/* Search header inside modal */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', gap: 1.5 }}>
          <SearchIcon sx={{ color: 'text.secondary' }} />
          <TextField
            autoFocus
            fullWidth
            variant="standard"
            placeholder="Search files, folders, users or actions..."
            value={cmdQuery}
            onChange={(e) => setCmdQuery(e.target.value)}
            slotProps={{
              input: {
                disableUnderline: true,
                endAdornment: (
                  <IconButton size="small" onClick={() => { setCmdOpen(false); setCmdQuery(''); }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )
              }
            }}
            sx={{
              '& input': {
                fontSize: '1rem',
                fontWeight: 500,
                color: 'text.primary'
              }
            }}
          />
        </Box>

        <DialogContent sx={{ p: 0, maxHeight: 380, overflowY: 'auto' }}>
          
          {/* 1. Showing static Navigation options when query is empty */}
          {!cmdQuery && (
            <Box>
              <Typography variant="caption" sx={{ display: 'block', px: 2.5, py: 1.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary' }}>
                Quick Navigation & Commands
              </Typography>
              <List sx={{ p: 0 }}>
                <ListItemButton onClick={() => handleCommandAction('/')} sx={{ py: 1.2, px: 2.5, gap: 2 }}>
                  <DashboardIcon sx={{ color: '#2563eb', fontSize: '1.2rem' }} />
                  <ListItemText primary="Go to Dashboard" slotProps={{ primary: { fontSize: '0.9rem', fontWeight: 600 } }} />
                  <ArrowForwardIosIcon sx={{ fontSize: '0.65rem', color: 'text.secondary' }} />
                </ListItemButton>

                <ListItemButton onClick={() => handleCommandAction('/explorer')} sx={{ py: 1.2, px: 2.5, gap: 2 }}>
                  <FolderCopyIcon sx={{ color: '#10b981', fontSize: '1.2rem' }} />
                  <ListItemText primary="Go to MOU Repositories" slotProps={{ primary: { fontSize: '0.9rem', fontWeight: 600 } }} />
                  <ArrowForwardIosIcon sx={{ fontSize: '0.65rem', color: 'text.secondary' }} />
                </ListItemButton>

                {hasPermission('manage_users') && user?.role?.name?.toLowerCase() !== 'user' && (
                  <ListItemButton onClick={() => handleCommandAction('/users')} sx={{ py: 1.2, px: 2.5, gap: 2 }}>
                    <ManageAccountsIcon sx={{ color: '#8b5cf6', fontSize: '1.2rem' }} />
                    <ListItemText primary="Go to User Management" slotProps={{ primary: { fontSize: '0.9rem', fontWeight: 600 } }} />
                    <ArrowForwardIosIcon sx={{ fontSize: '0.65rem', color: 'text.secondary' }} />
                  </ListItemButton>
                )}

                {hasPermission('manage_users') && (
                  <ListItemButton onClick={() => handleCommandAction('/logs')} sx={{ py: 1.2, px: 2.5, gap: 2 }}>
                    <AdminPanelSettingsIcon sx={{ color: '#64748b', fontSize: '1.2rem' }} />
                    <ListItemText primary="Go to Activity Logs Audit" slotProps={{ primary: { fontSize: '0.9rem', fontWeight: 600 } }} />
                    <ArrowForwardIosIcon sx={{ fontSize: '0.65rem', color: 'text.secondary' }} />
                  </ListItemButton>
                )}

                <ListItemButton onClick={() => handleCommandAction(toggleTheme)} sx={{ py: 1.2, px: 2.5, gap: 2 }}>
                  <KeyboardIcon sx={{ color: '#f59e0b', fontSize: '1.2rem' }} />
                  <ListItemText primary={`Switch to ${mode === 'dark' ? 'Light Mode' : 'Dark Mode'}`} slotProps={{ primary: { fontSize: '0.9rem', fontWeight: 600 } }} />
                  <Chip label="Theme Toggle" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                </ListItemButton>
              </List>
            </Box>
          )}

          {/* 2. Showing loader when searching API */}
          {searching && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6, gap: 1.5 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">Searching database records...</Typography>
            </Box>
          )}

          {/* 3. Render Search Results from API */}
          {cmdQuery && !searching && (
            <Box>
              
              {/* FOLDERS SECTION */}
              {cmdResults.folders.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', px: 2.5, py: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', bgcolor: 'action.hover' }}>
                    Folders ({cmdResults.folders.length})
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {cmdResults.folders.map((f) => (
                      <ListItemButton key={f.id} onClick={() => handleCommandAction(`/explorer?folder=${f.id}`)} sx={{ py: 1, px: 2.5, gap: 2 }}>
                        <FolderIcon sx={{ color: '#facc15', fontSize: '1.25rem' }} />
                        <ListItemText 
                          primary={f.name} 
                          secondary={`${f.file_count || 0} files • ${f.subfolder_count || 0} subfolders`}
                          slotProps={{
                            primary: { fontSize: '0.88rem', fontWeight: 600 },
                            secondary: { fontSize: '0.72rem' }
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              )}

              {/* FILES SECTION */}
              {cmdResults.files.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', px: 2.5, py: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', bgcolor: 'action.hover' }}>
                    Files ({cmdResults.files.length})
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {cmdResults.files.map((file) => (
                      <ListItemButton key={file.id} onClick={() => handleCommandAction(`/explorer?folder=${file.folder}`)} sx={{ py: 1, px: 2.5, gap: 2 }}>
                        <InsertDriveFileIcon sx={{ color: '#2563eb', fontSize: '1.25rem' }} />
                        <ListItemText 
                          primary={file.name} 
                          secondary={`v${file.version_number} • ${file.size_formatted} • Modified ${new Date(file.updated_at).toLocaleDateString()}`}
                          slotProps={{
                            primary: { fontSize: '0.88rem', fontWeight: 600 },
                            secondary: { fontSize: '0.72rem' }
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              )}

              {/* USERS SECTION (ADMIN ONLY) */}
              {cmdResults.users && cmdResults.users.length > 0 && user?.role?.name?.toLowerCase() !== 'user' && (
                <Box>
                  <Typography variant="caption" sx={{ display: 'block', px: 2.5, py: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', bgcolor: 'action.hover' }}>
                    Users ({cmdResults.users.length})
                  </Typography>
                  <List sx={{ p: 0 }}>
                    {cmdResults.users.map((u) => (
                      <ListItemButton key={u.id} onClick={() => handleCommandAction('/users')} sx={{ py: 1, px: 2.5, gap: 2 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', bgcolor: 'primary.main' }}>
                          {u.name?.charAt(0).toUpperCase()}
                        </Avatar>
                        <ListItemText 
                          primary={u.name} 
                          secondary={`${u.email} • ${u.designation || 'Staff'} - ${u.department || 'MOU Office'}`}
                          slotProps={{
                            primary: { fontSize: '0.88rem', fontWeight: 600 },
                            secondary: { fontSize: '0.72rem' }
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              )}

              {/* EMPTY STATE INSIDE DIALOG */}
              {cmdResults.folders.length === 0 && cmdResults.files.length === 0 && (!cmdResults.users || cmdResults.users.length === 0 || user?.role?.name?.toLowerCase() === 'user') && (
                <Box sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>
                  <SearchIcon sx={{ fontSize: 32, mb: 1, opacity: 0.4 }} />
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    No results matching "{cmdQuery}"
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        {/* Footer shortcuts helper */}
        <Box sx={{ px: 2.5, py: 1.5, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <kbd style={{ border: '1px solid', borderColor: 'divider', px: 0.75, py: 0.1, borderRadius: '4px', background: '#ffffff', color: '#0f172a', fontSize: '0.62rem', fontWeight: 700 }}>↑↓</kbd> Navigate
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <kbd style={{ border: '1px solid', borderColor: 'divider', px: 0.75, py: 0.1, borderRadius: '4px', background: '#ffffff', color: '#0f172a', fontSize: '0.62rem', fontWeight: 700 }}>Enter</kbd> Select
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Press <kbd style={{ border: '1px solid', borderColor: 'divider', px: 0.75, py: 0.1, borderRadius: '4px', background: '#ffffff', color: '#0f172a', fontSize: '0.62rem', fontWeight: 700 }}>Esc</kbd> to close
          </Typography>
        </Box>
      </Dialog>

      {/* Login Notifications PopUp */}
      <Dialog
        open={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '24px',
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              background: 'background.paper',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }
          }
        }}
      >
        <DialogContent sx={{ p: 2.5 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box 
              sx={{ 
                width: 80, 
                height: 80, 
                mx: 'auto', 
                mb: 2, 
                borderRadius: '20px', 
                overflow: 'hidden', 
                boxShadow: '0 8px 24px rgba(var(--indigo-rgb), 0.25)',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <video 
                src="/bell notification.mp4" 
                autoPlay 
                muted 
                loop 
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.5px' }}>
              Welcome Back!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You have <strong>{unreadCount}</strong> unread {unreadCount === 1 ? 'notification' : 'notifications'} since your last visit.
            </Typography>
          </Box>

          <List sx={{ p: 0, mb: 3.5, maxHeight: 240, overflowY: 'auto' }}>
            {notifications.filter(n => !n.is_read).slice(0, 3).map((n, i) => (
              <React.Fragment key={n.id}>
                {i > 0 && <Divider sx={{ my: 1.5 }} />}
                <ListItem sx={{ p: 0, alignItems: 'flex-start' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'var(--indigo)', mt: 0.8, mr: 1.5, flexShrink: 0 }} />
                  <ListItemText
                    primary={n.title}
                    secondary={n.description}
                    slotProps={{
                      primary: { fontSize: '0.88rem', fontWeight: 700, color: 'text.primary', mb: 0.2 },
                      secondary: { fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.4 }
                    }}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                setShowLoginPopup(false);
                navigate('/notifications');
              }}
              sx={{ 
                borderRadius: '12px', 
                fontWeight: 700, 
                py: 1.2, 
                textTransform: 'none',
                background: 'linear-gradient(135deg, var(--indigo), var(--violet))'
              }}
            >
              Go to Notifications
            </Button>
            
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={async () => {
                  await handleMarkAllRead();
                  setShowLoginPopup(false);
                }}
                sx={{ borderRadius: '12px', fontWeight: 700, py: 1, textTransform: 'none', borderColor: 'divider', color: 'text.primary' }}
              >
                Mark All Read
              </Button>
              <Button
                variant="text"
                fullWidth
                onClick={() => setShowLoginPopup(false)}
                sx={{ borderRadius: '12px', fontWeight: 700, py: 1, textTransform: 'none', color: 'text.secondary' }}
              >
                Dismiss
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      
    </Box>
  );
};

export default Layout;
