import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, CircularProgress, Alert, TextField, 
  InputAdornment, TablePagination, Chip, Avatar, Card, Grid,
  Tooltip, Tabs, Tab
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleIcon from '@mui/icons-material/People';
import ComputerIcon from '@mui/icons-material/Computer';

import api from '../services/api';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';

/* Module Color Styles */
const MODULE_CONFIG = {
  'Users': { label: 'User Admin', bg: 'rgba(147, 51, 234, 0.12)', color: '#9333EA', icon: <PeopleIcon fontSize="small" /> },
  'Folders': { label: 'Repositories', bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', icon: <FolderIcon fontSize="small" /> },
  'Files': { label: 'Documents', bg: 'rgba(16, 185, 129, 0.12)', color: '#10B981', icon: <DescriptionIcon fontSize="small" /> },
  'MOUs': { label: 'Agreements', bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', icon: <DescriptionIcon fontSize="small" /> },
  'Auth': { label: 'Security', bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', icon: <SecurityIcon fontSize="small" /> },
  'Default': { label: 'System', bg: 'rgba(100, 116, 139, 0.12)', color: '#64748B', icon: <ComputerIcon fontSize="small" /> },
};

const getModuleStyle = (module = '') => {
  for (const k of Object.keys(MODULE_CONFIG)) {
    if (module.toLowerCase().includes(k.toLowerCase())) return MODULE_CONFIG[k];
  }
  return MODULE_CONFIG.Default;
};

/* Action Type Badges */
const ACTION_TYPES = {
  'CREATE': { label: 'Created / Added', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: <AddCircleOutlinedIcon fontSize="small" /> },
  'UPDATE': { label: 'Updated / Modified', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: <EditIcon fontSize="small" /> },
  'DELETE': { label: 'Deleted / Removed', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: <DeleteOutlinedIcon fontSize="small" /> },
  'AUTH': { label: 'Authentication', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <LockOpenIcon fontSize="small" /> },
  'INFO': { label: 'System Event', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: <InfoOutlinedIcon fontSize="small" /> },
};

const getActionTypeStyle = (type = 'INFO') => {
  return ACTION_TYPES[type] || ACTION_TYPES.INFO;
};

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/activity-logs/');
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
      setError("Failed to load activity log audit trail.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Global Auto Refresh Subscription
  useAutoRefresh(REFRESH_CATEGORIES.ACTIVITY_LOGS, fetchLogs);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter logs by search & tab (Excluding Super Admin logs)
  const filteredLogs = logs.filter(log => {
    // Exclude Super Admin logs
    const isSuperuser = log.user?.is_superuser;
    const roleName = (log.user?.role?.name || log.user?.role_name || '').toLowerCase();
    if (isSuperuser || roleName.includes('super admin') || roleName.includes('superadmin')) {
      return false;
    }

    const actionStr = (log.formatted_action || log.action || '').toLowerCase();
    const rawActionStr = (log.action || '').toLowerCase();
    const modStr = (log.module || '').toLowerCase();
    const userStr = (log.user?.name || log.user?.email || 'system').toLowerCase();
    const ipStr = (log.ip_address || '').toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch = actionStr.includes(q) || rawActionStr.includes(q) || modStr.includes(q) || userStr.includes(q) || ipStr.includes(q);

    if (!matchesSearch) return false;

    if (activeTab === 'ALL') return true;
    if (activeTab === 'FILES') return modStr.includes('file') || modStr.includes('folder');
    if (activeTab === 'MOUS') return modStr.includes('mou');
    if (activeTab === 'USERS') return modStr.includes('user') || modStr.includes('role');
    if (activeTab === 'AUTH') return modStr.includes('auth') || rawActionStr.includes('login') || rawActionStr.includes('logout');

    return true;
  });

  // Calculate quick statistics
  const totalLogs = logs.length;
  const uniqueUsers = new Set(logs.map(l => l.user?.email).filter(Boolean)).size;
  const securityEvents = logs.filter(l => (l.action_type === 'AUTH' || l.action_type === 'DELETE')).length;

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-slide-up">
      {/* Header Banner */}
      <Box sx={{ mb: 3.5, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'rgba(249, 115, 22, 0.12)', color: '#F97316', width: 46, height: 46, borderRadius: '14px' }}>
            <SecurityIcon fontSize="medium" />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
              System Activity &amp; Audit Trail
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Permanent, human-readable audit log tracking all administrative, agreement, and user operations.
            </Typography>
          </Box>
        </Box>

        <TextField
          size="small"
          placeholder="Search logs by action, user, IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ 
            width: { xs: '100%', sm: 300 },
            '& .MuiOutlinedInput-root': { borderRadius: '20px' }
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }
          }}
        />
      </Box>

      {/* Audit Highlights Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'Total Recorded Operations', count: totalLogs, label: 'Immutable System Log', color: '#4F46E5', icon: <HistoryIcon /> },
          { title: 'Active System Users', count: uniqueUsers, label: 'Logged operations', color: '#3B82F6', icon: <PeopleIcon /> },
          { title: 'Security & Auth Events', count: securityEvents, label: 'Logins & Deletions', color: '#F59E0B', icon: <SecurityIcon /> },
        ].map((item) => (
          <Grid xs={12} sm={4} key={item.title}>
            <Card sx={{ p: 2.2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'text.secondary' }}>
                    {item.title}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: item.color, mt: 0.2 }}>
                    {item.count}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, borderRadius: '12px', width: 40, height: 40 }}>
                  {item.icon}
                </Avatar>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter Tabs */}
      <Box sx={{ mb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => { setActiveTab(val); setPage(0); }}
          sx={{
            '& .MuiTab-root': { fontWeight: 700, fontSize: '0.84rem', py: 1 }
          }}
        >
          <Tab value="ALL" label="All Activities" />
          <Tab value="FILES" label="Documents & Folders" />
          <Tab value="MOUS" label="Agreements & MOUs" />
          <Tab value="USERS" label="User Administration" />
          <Tab value="AUTH" label="Security & Logins" />
        </Tabs>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <Paper sx={{ borderRadius: '18px', boxShadow: 'none', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, py: 1.8 }}>User / Actor</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Activity Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        No activity records found matching your filter criteria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((log) => {
                      const modStyle = getModuleStyle(log.module);
                      const typeStyle = getActionTypeStyle(log.action_type);
                      const displayAction = log.formatted_action || log.action;
                      const userName = log.user?.name || log.user?.email || 'System Automator';
                      const userInitial = userName.charAt(0).toUpperCase();

                      return (
                        <TableRow 
                          key={log.id} 
                          hover 
                          sx={{ '&:last-child td': { border: 0 } }}
                        >
                          {/* User Column */}
                          <TableCell sx={{ py: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                              <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: 'primary.main', fontWeight: 800 }}>
                                {userInitial}
                              </Avatar>
                              <Box sx={{ overflow: 'hidden' }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.83rem' }} noWrap>
                                  {userName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  {log.user?.role?.name || (log.user ? 'User' : 'System Process')}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          {/* Action Description */}
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem', color: 'text.primary' }}>
                              {displayAction}
                            </Typography>
                          </TableCell>

                          {/* Action Type Badge */}
                          <TableCell>
                            <Chip 
                              icon={typeStyle.icon}
                              label={typeStyle.label}
                              size="small" 
                              sx={{ 
                                bgcolor: typeStyle.bg, 
                                color: typeStyle.color, 
                                fontWeight: 800, 
                                borderRadius: '8px', 
                                fontSize: '0.7rem',
                                '& .MuiChip-icon': { color: typeStyle.color }
                              }} 
                            />
                          </TableCell>

                          {/* Module Badge */}
                          <TableCell>
                            <Chip 
                              label={modStyle.label} 
                              size="small" 
                              sx={{ bgcolor: modStyle.bg, color: modStyle.color, fontWeight: 700, borderRadius: '8px', fontSize: '0.7rem' }} 
                            />
                          </TableCell>

                          {/* Time Ago with Full Timestamp Tooltip */}
                          <TableCell>
                            <Tooltip title={new Date(log.created_at).toLocaleString()} arrow placement="top">
                              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', cursor: 'pointer' }}>
                                {log.time_ago || new Date(log.created_at).toLocaleTimeString()}
                              </Typography>
                            </Tooltip>
                          </TableCell>

                          {/* IP Address */}
                          <TableCell align="right" sx={{ pr: 2 }}>
                            <Chip
                              label={log.ip_address || '127.0.0.1'}
                              size="small"
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 600 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 15, 25, 50]}
            component="div"
            count={filteredLogs.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}
    </Box>
  );
};

export default ActivityLog;
