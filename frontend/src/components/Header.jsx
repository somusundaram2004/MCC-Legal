import React, { useState } from 'react';
import {
  AppBar, Toolbar, Box, Typography, IconButton, Button,
  Badge, Avatar, Menu, MenuItem, Tooltip, Chip, Popover,
  Divider, ListItemIcon, ListItemText, Drawer, List, ListItemButton
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import AppsIcon from '@mui/icons-material/Apps';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useSiteTime } from '../context/SiteTimeContext';
import { getRoleBadge, getNormalizedRole, ROLE_SERVICES_CONFIG } from '../config/roles';

export default function Header({ onOpenSearch, notifications = [], unreadCount = 0, onRefreshNotifications }) {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const { siteTime, isCustom, getFormattedSiteDateTime } = useSiteTime();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileAnchor, setProfileAnchor] = useState(null);
  const [notiAnchor, setNotiAnchor] = useState(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const roleBadge = getRoleBadge(user);
  const userRole = getNormalizedRole(user);
  const servicesList = ROLE_SERVICES_CONFIG[userRole] || [];

  const handleNavAnchor = (anchor) => {
    setMobileDrawerOpen(false);
    if (location.pathname === '/') {
      const el = document.querySelector(anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      navigate('/' + anchor);
    }
  };

  const handleNavigateModule = (path) => {
    setMobileDrawerOpen(false);
    navigate(path);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'var(--legal-cream-card, #ffffff)',
        borderBottom: '1px solid var(--legal-border-tint, #dccb9a)',
        color: 'var(--legal-text-primary, #0f172a)',
        zIndex: 1100,
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 64, md: 72 },
          px: { xs: 2, md: 4 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Left: Brand & Logo */}
        <Box
          component="button"
          onClick={() => navigate('/')}
          aria-label="MCC Legal Home"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            p: 0,
            textDecoration: 'none',
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              backgroundColor: 'var(--legal-navy, #0b1a3a)',
              color: 'var(--legal-gold, #d4a82f)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(11, 26, 58, 0.15)',
              border: '1.5px solid var(--legal-gold-border, #b8892b)',
              flexShrink: 0,
            }}
          >
            <GavelIcon sx={{ fontSize: 24, transform: 'rotate(-25deg)' }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
                fontWeight: 800,
                fontSize: { xs: '1.05rem', sm: '1.22rem' },
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
                color: 'var(--legal-navy, #0b1a3a)',
              }}
            >
              MCC LEGAL
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'var(--legal-font-sans, "Inter", sans-serif)',
                fontWeight: 600,
                fontSize: { xs: '0.68rem', sm: '0.74rem' },
                color: 'var(--legal-gold-rule, #b8892b)',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                display: 'block',
              }}
            >
              Documents &amp; MOU Hub
            </Typography>
          </Box>
        </Box>

        {/* Center: Global Search Bar (Ctrl+K) */}
        <Box
          onClick={onOpenSearch}
          component="button"
          aria-label="Open search palette (Ctrl+K)"
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
            border: '1px solid var(--legal-border-tint, #dccb9a)',
            borderRadius: '12px',
            px: 2,
            py: 0.9,
            minWidth: { md: 240, lg: 320 },
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: 'var(--legal-text-muted, #64748b)',
            '&:hover': {
              borderColor: 'var(--legal-gold, #d4a82f)',
              backgroundColor: 'var(--legal-cream-tint2, #f3ead2)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchIcon sx={{ fontSize: 19, color: 'var(--legal-navy, #0b1a3a)' }} />
            <Typography variant="body2" sx={{ fontSize: '0.86rem', color: 'inherit' }}>
              Search documents, MOUs, users...
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: 'var(--legal-cream-card, #ffffff)',
              border: '1px solid var(--legal-border-tint, #dccb9a)',
              borderRadius: '6px',
              px: 0.8,
              py: 0.2,
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--legal-navy, #0b1a3a)',
            }}
          >
            Ctrl+K
          </Box>
        </Box>

        {/* Right: Actions, Date/Time, Dark mode, Notifications, Profile */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.2 } }}>
          {/* Mobile & Tablet Hamburger Navigation Drawer Button */}
          <Tooltip title="Navigation Menu">
            <IconButton
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              sx={{
                display: { xs: 'inline-flex', md: 'none' },
                color: 'var(--legal-navy, #0b1a3a)',
                borderRadius: '10px',
                p: 1,
                minWidth: 44,
                minHeight: 44,
                '&:hover': { backgroundColor: 'var(--legal-cream-tint, #f6f0e0)' },
              }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>

          {/* Mobile Search Button */}
          <Tooltip title="Search (Ctrl+K)">
            <IconButton
              onClick={onOpenSearch}
              aria-label="Open global search"
              sx={{
                display: { xs: 'flex', md: 'none' },
                color: 'var(--legal-navy, #0b1a3a)',
                p: 1,
                minWidth: 44,
                minHeight: 44,
              }}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>

          {/* Date & Time display */}
          <Box
            sx={{
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center',
              gap: 0.8,
              px: 1.5,
              py: 0.6,
              borderRadius: '10px',
              backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
              border: '1px solid var(--legal-border-tint, #dccb9a)',
              color: 'var(--legal-navy, #0b1a3a)',
            }}
          >
            <CalendarMonthIcon sx={{ fontSize: 16, color: 'var(--legal-gold-border, #b8892b)' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.78rem' }}>
              {getFormattedSiteDateTime ? getFormattedSiteDateTime() : (siteTime ? new Date(siteTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : new Date().toLocaleDateString())}
            </Typography>
          </Box>

          {/* Help Button */}
          <Tooltip title="System Map &amp; Help">
            <IconButton
              onClick={() => navigate('/system-map')}
              aria-label="System Help Guide"
              sx={{
                color: 'var(--legal-navy, #0b1a3a)',
                borderRadius: '10px',
                p: 1,
                '&:hover': { backgroundColor: 'var(--legal-cream-tint, #f6f0e0)' },
              }}
            >
              <HelpCenterIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* Dark / Light Mode Toggle */}
          <Tooltip title={mode === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}>
            <IconButton
              onClick={toggleTheme}
              aria-label="Toggle theme mode"
              sx={{
                color: 'var(--legal-navy, #0b1a3a)',
                borderRadius: '10px',
                p: 1,
                '&:hover': { backgroundColor: 'var(--legal-cream-tint, #f6f0e0)' },
              }}
            >
              {mode === 'dark' ? <LightModeIcon fontSize="small" sx={{ color: 'var(--legal-gold, #d4a82f)' }} /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Notifications Popover Trigger */}
          <Tooltip title="Notifications">
            <IconButton
              onClick={(e) => setNotiAnchor(e.currentTarget)}
              aria-label="View notifications"
              sx={{
                color: 'var(--legal-navy, #0b1a3a)',
                borderRadius: '10px',
                p: 1,
                '&:hover': { backgroundColor: 'var(--legal-cream-tint, #f6f0e0)' },
              }}
            >
              <Badge badgeContent={unreadCount} color="error" max={99}>
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notifications Popover */}
          <Popover
            open={Boolean(notiAnchor)}
            anchorEl={notiAnchor}
            onClose={() => setNotiAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                width: 340,
                maxHeight: 460,
                borderRadius: '16px',
                p: 0,
                border: '1px solid var(--legal-border-tint, #dccb9a)',
                backgroundColor: 'var(--legal-cream-card, #ffffff)',
                boxShadow: 'var(--legal-shadow-md)',
              },
            }}
          >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--legal-border-tint, #dccb9a)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--legal-navy, #0b1a3a)' }}>
                Notifications ({unreadCount})
              </Typography>
              <Button size="small" onClick={() => { setNotiAnchor(null); navigate('/notifications'); }} sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--legal-gold-border, #b8892b)' }}>
                View All
              </Button>
            </Box>
            <Box sx={{ maxHeight: 340, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ color: 'var(--legal-gold, #d4a82f)', fontSize: 32, mb: 1 }} />
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    No unread notifications
                  </Typography>
                </Box>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <Box
                    key={n.id}
                    onClick={() => { setNotiAnchor(null); navigate('/notifications'); }}
                    sx={{
                      p: 1.5,
                      borderBottom: '1px solid var(--legal-cream-tint2, #f3ead2)',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'var(--legal-cream-tint, #f6f0e0)' },
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontSize: '0.82rem', fontWeight: n.is_read ? 500 : 700 }}>
                      {n.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
                      {n.message}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </Popover>

          {/* User Profile Menu */}
          <Button
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            aria-label="User account menu"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              p: { xs: 0.5, sm: '6px 12px' },
              borderRadius: '12px',
              backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
              border: '1px solid var(--legal-border-tint, #dccb9a)',
              color: 'var(--legal-navy, #0b1a3a)',
              textTransform: 'none',
              minWidth: 'auto',
              '&:hover': {
                backgroundColor: 'var(--legal-cream-tint2, #f3ead2)',
                borderColor: 'var(--legal-gold, #d4a82f)',
              },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                backgroundColor: 'var(--legal-navy, #0b1a3a)',
                color: 'var(--legal-gold, #d4a82f)',
                fontSize: '0.85rem',
                fontWeight: 800,
                border: '1px solid var(--legal-gold, #d4a82f)',
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem', lineHeight: 1.1 }}>
                {user?.name || 'User'}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'var(--legal-gold-border, #b8892b)', fontWeight: 600 }}>
                {roleBadge}
              </Typography>
            </Box>
          </Button>

          {/* Profile Menu Dropdown */}
          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                width: 240,
                borderRadius: '16px',
                p: 1,
                border: '1px solid var(--legal-border-tint, #dccb9a)',
                boxShadow: 'var(--legal-shadow-md)',
                backgroundColor: 'var(--legal-cream-card, #ffffff)',
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--legal-navy, #0b1a3a)' }}>
                {user?.name || 'User'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
                {user?.email}
              </Typography>
              <Chip
                label={roleBadge}
                size="small"
                sx={{
                  mt: 0.8,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
                  color: 'var(--legal-navy, #0b1a3a)',
                  border: '1px solid var(--legal-gold-border, #b8892b)',
                }}
              />
            </Box>
            <Divider sx={{ my: 1, borderColor: 'var(--legal-border-tint, #dccb9a)' }} />
            <MenuItem onClick={() => { setProfileAnchor(null); navigate('/profile'); }}>
              <ListItemIcon><PersonIcon fontSize="small" sx={{ color: 'var(--legal-navy, #0b1a3a)' }} /></ListItemIcon>
              <ListItemText primary="My Profile" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 600 }} />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setProfileAnchor(null);
                logout();
                navigate('/login');
              }}
              sx={{ color: '#b91c1c' }}
            >
              <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#b91c1c' }} /></ListItemIcon>
              <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 700 }} />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      {/* Responsive Mobile & Tablet Drawer */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '85vw', sm: 360 },
            maxWidth: 380,
            backgroundColor: 'var(--legal-cream-bg, #faf7f0)',
            color: 'var(--legal-text-primary, #0f172a)',
            borderRight: '1.5px solid var(--legal-gold-border, #b8892b)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Drawer Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--legal-navy, #0b1a3a)',
            color: '#fff',
            borderBottom: '2px solid var(--legal-gold-border, #b8892b)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: 'var(--legal-navy-card, #14305f)',
                color: 'var(--legal-gold, #d4a82f)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--legal-gold, #d4a82f)',
              }}
            >
              <GavelIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: '#fff',
                }}
              >
                MCC LEGAL
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'var(--legal-font-sans, "Inter", sans-serif)',
                  fontSize: '0.65rem',
                  color: 'var(--legal-gold-illustration, #e6c76a)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  display: 'block',
                }}
              >
                Documents &amp; MOU Hub
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Close navigation drawer"
            sx={{ color: '#fff', p: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* User Card */}
        <Box
          sx={{
            p: 2,
            m: 2,
            borderRadius: '14px',
            backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
            border: '1px solid var(--legal-border-tint, #dccb9a)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Avatar
              sx={{
                width: 42,
                height: 42,
                backgroundColor: 'var(--legal-navy, #0b1a3a)',
                color: 'var(--legal-gold, #d4a82f)',
                fontWeight: 800,
                border: '1.5px solid var(--legal-gold, #d4a82f)',
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--legal-navy, #0b1a3a)' }} noWrap>
                {user?.name || 'User'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--legal-text-muted, #64748b)', display: 'block' }} noWrap>
                {user?.email}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mt: 1 }}>
            <Chip
              label={roleBadge}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: '0.7rem',
                backgroundColor: 'var(--legal-navy, #0b1a3a)',
                color: 'var(--legal-gold, #d4a82f)',
              }}
            />
            {user?.department && (
              <Chip
                label={typeof user.department === 'object' ? user.department.name : user.department}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  backgroundColor: 'var(--legal-cream-card, #ffffff)',
                  color: 'var(--legal-navy, #0b1a3a)',
                  border: '1px solid var(--legal-border-tint, #dccb9a)',
                }}
              />
            )}
          </Box>
        </Box>

        {/* Drawer Scrollable Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
          {/* Page Anchor Links */}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: 'var(--legal-gold-border, #b8892b)',
              display: 'block',
              px: 1,
              mb: 0.5,
            }}
          >
            Page Sections
          </Typography>
          <List dense sx={{ mb: 2 }}>
            {[
              { label: 'Home', anchor: '#home', icon: <HomeIcon fontSize="small" /> },
              { label: 'Statistics', anchor: '#statistics', icon: <BarChartIcon fontSize="small" /> },
              { label: 'Services', anchor: '#services', icon: <AppsIcon fontSize="small" /> },
              { label: 'References', anchor: '#references', icon: <MenuBookIcon fontSize="small" /> },
              { label: 'Contact Us', anchor: '#contact-us', icon: <ContactSupportIcon fontSize="small" /> },
            ].map((item) => (
              <ListItemButton
                key={item.label}
                onClick={() => handleNavAnchor(item.anchor)}
                sx={{
                  borderRadius: '10px',
                  mb: 0.5,
                  color: 'var(--legal-navy, #0b1a3a)',
                  '&:hover': { backgroundColor: 'var(--legal-cream-tint, #f6f0e0)' },
                }}
              >
                <ListItemIcon sx={{ color: 'var(--legal-gold-border, #b8892b)', minWidth: 36 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 600 }}
                />
              </ListItemButton>
            ))}
          </List>

          {/* Role Services Section */}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: 'var(--legal-gold-border, #b8892b)',
              display: 'block',
              px: 1,
              mb: 0.5,
            }}
          >
            My Services ({servicesList.length})
          </Typography>
          <List dense sx={{ mb: 2 }}>
            {servicesList.map((svc) => (
              <ListItemButton
                key={svc.id}
                onClick={() => handleNavigateModule(svc.path)}
                sx={{
                  borderRadius: '10px',
                  mb: 0.5,
                  color: 'var(--legal-navy, #0b1a3a)',
                  '&:hover': {
                    backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
                    color: 'var(--legal-navy, #0b1a3a)',
                  },
                }}
              >
                <ListItemText
                  primary={svc.title}
                  secondary={svc.description}
                  primaryTypographyProps={{ fontSize: '0.86rem', fontWeight: 700 }}
                  secondaryTypographyProps={{ fontSize: '0.72rem', noWrap: true }}
                />
                <ArrowForwardIosIcon sx={{ fontSize: 12, color: 'var(--legal-gold-border, #b8892b)' }} />
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Drawer Footer Actions */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid var(--legal-border-tint, #dccb9a)',
            backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              fullWidth
              size="small"
              startIcon={mode === 'dark' ? <LightModeIcon sx={{ color: 'var(--legal-gold, #d4a82f)' }} /> : <DarkModeIcon />}
              onClick={toggleTheme}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.78rem',
                backgroundColor: 'var(--legal-cream-card, #ffffff)',
                color: 'var(--legal-navy, #0b1a3a)',
                border: '1px solid var(--legal-border-tint, #dccb9a)',
                p: 1,
              }}
            >
              {mode === 'dark' ? 'Light Theme' : 'Dark Theme'}
            </Button>

            <Button
              fullWidth
              size="small"
              startIcon={<HelpCenterIcon />}
              onClick={() => handleNavigateModule('/system-map')}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.78rem',
                backgroundColor: 'var(--legal-cream-card, #ffffff)',
                color: 'var(--legal-navy, #0b1a3a)',
                border: '1px solid var(--legal-border-tint, #dccb9a)',
                p: 1,
              }}
            >
              Help Guide
            </Button>
          </Box>

          <Button
            fullWidth
            variant="contained"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={() => {
              setMobileDrawerOpen(false);
              logout();
              navigate('/login');
            }}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: '#b91c1c',
              '&:hover': { backgroundColor: '#991b1b' },
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Drawer>
    </AppBar>
  );
}
