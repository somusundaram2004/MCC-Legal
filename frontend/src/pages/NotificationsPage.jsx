import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Card, Typography, Button, IconButton, List, 
  ListItem, ListItemText, ListItemIcon, Chip, Divider, 
  CircularProgress, Alert, Avatar, Tabs, Tab
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import DeleteIcon from '@mui/icons-material/Delete';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';

import api from '../services/api';
import EmptyState from '../components/EmptyState';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all', 'unread', 'approvals'

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/notifications/');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Global Auto Refresh Subscription
  useAutoRefresh(REFRESH_CATEGORIES.NOTIFICATIONS, fetchNotifications);

  const handleMarkAsRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/mark-read/`);
      fetchNotifications();
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read/');
      fetchNotifications();
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/api/notifications/${id}/`);
      fetchNotifications();
    } catch (err) {
      console.error('Delete notification failed:', err);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear all notifications?")) {
      try {
        await api.post('/api/notifications/clear-all/');
        fetchNotifications();
      } catch (err) {
        console.error('Clear all notifications failed:', err);
      }
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (tab === 'unread') return !n.is_read;
    if (tab === 'approvals') return n.title.toLowerCase().includes('approval') || n.title.toLowerCase().includes('verify');
    return true;
  });

  return (
    <Box sx={{ flexGrow: 1, maxWidth: 900, mx: 'auto' }} className="animate-fade-slide-up">
      {/* Header */}
      <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'rgba(244,63,94,0.12)', color: '#F43F5E', width: 44, height: 44, borderRadius: '14px' }}>
            <NotificationsIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Notification Center
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time system alerts, approval requests, and automated expiry warnings.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<MarkEmailReadIcon />}
            onClick={handleMarkAllRead}
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            Mark All as Read
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleClearAll}
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(e, val) => setTab(val)}>
          <Tab label={`All Notifications (${notifications.length})`} value="all" sx={{ fontWeight: 700 }} />
          <Tab label={`Unread (${notifications.filter(n => !n.is_read).length})`} value="unread" sx={{ fontWeight: 700 }} />
          <Tab label="Approvals & Verification" value="approvals" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          illustration="notification"
          title="No Notifications"
          description="You are all caught up! New system alerts and approval requests will appear here."
        />
      ) : (
        <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <List sx={{ p: 0 }}>
            {filteredNotifications.map((n, idx) => {
              const isUrgent = n.title.toLowerCase().includes('expiring') || n.title.toLowerCase().includes('urgent');
              return (
                <React.Fragment key={n.id}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    sx={{
                      p: 2.5,
                      bgcolor: n.is_read ? 'transparent' : 'rgba(var(--indigo-rgb), 0.04)',
                      transition: 'background-color 0.2s ease',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {!n.is_read && (
                          <Button size="small" onClick={() => handleMarkAsRead(n.id)} sx={{ fontWeight: 700 }}>
                            Mark Read
                          </Button>
                        )}
                        <IconButton size="small" onClick={() => handleDeleteNotification(n.id)} sx={{ color: 'error.main' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 44 }}>
                      <Avatar sx={{
                        bgcolor: isUrgent ? 'rgba(249,115,22,0.12)' : 'rgba(var(--indigo-rgb), 0.12)',
                        color: isUrgent ? '#F97316' : 'var(--indigo)',
                        width: 36, height: 36, borderRadius: '10px'
                      }}>
                        {isUrgent ? <WarningIcon fontSize="small" /> : <InfoIcon fontSize="small" />}
                      </Avatar>
                    </ListItemIcon>

                    <ListItemText
                      disableTypography
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle2" component="div" sx={{ fontWeight: 800, fontSize: '0.92rem' }}>
                            {n.title}
                          </Typography>
                          {!n.is_read && (
                            <Chip label="NEW" size="small" sx={{ bgcolor: '#F43F5E', color: '#fff', fontWeight: 800, height: 18, fontSize: '0.65rem' }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" component="div" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.84rem', lineHeight: 1.5 }}>
                            {n.description}
                          </Typography>
                          <Typography variant="caption" component="div" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                            {new Date(n.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        </Card>
      )}
    </Box>
  );
};

export default NotificationsPage;
