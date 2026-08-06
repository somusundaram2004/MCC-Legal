import React, { useEffect, useState } from 'react';
import { 
  Box, Grid, Card, Typography, Avatar, 
  CircularProgress, Button, Divider, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Paper,
  Chip, IconButton, Tooltip, LinearProgress, Alert
} from '@mui/material';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell
} from 'recharts';

import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningIcon from '@mui/icons-material/Warning';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SchoolIcon from '@mui/icons-material/School';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PaletteIcon from '@mui/icons-material/Palette';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import HistoryIcon from '@mui/icons-material/History';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import MapIcon from '@mui/icons-material/Map';
import { useNavigate, useLocation } from 'react-router-dom';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';
import { useSiteCustomization } from '../context/SiteCustomizationContext';
import FilePreviewModal from '../components/FilePreviewModal';
import StatusPill from '../components/StatusPill';

/* ─── Helpers ────────────────────────────────────────────────── */
const fmtBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/* Department Colors Map */
const DEPT_CONFIG = {
  'Engineering': { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', icon: <SchoolIcon /> },
  'Medical': { color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.12)', icon: <LocalHospitalIcon /> },
  'Commerce': { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', icon: <BusinessCenterIcon /> },
  'Arts': { color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)', icon: <PaletteIcon /> },
  'Default': { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)', icon: <FolderIcon /> },
};

const getDeptStyle = (name = '') => {
  for (const k of Object.keys(DEPT_CONFIG)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return DEPT_CONFIG[k];
  }
  return DEPT_CONFIG.Default;
};

/* Animated Count Up */
const CountUp = ({ end, duration = 800 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    if (end === 0) { setCount(0); return; }
    const step = Math.max(1, Math.ceil(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return <span>{count}</span>;
};

/* File Type Icon Resolver */
const getFileIcon = (ft) => {
  if (!ft) return { icon: <InsertDriveFileIcon />, color: '#64748b' };
  if (ft.includes('pdf')) return { icon: <PictureAsPdfIcon />, color: '#EF4444' };
  if (ft.includes('image')) return { icon: <ImageIcon />, color: '#F59E0B' };
  if (ft.includes('word') || ft.includes('doc')) return { icon: <DescriptionIcon />, color: '#3B82F6' };
  if (ft.includes('sheet') || ft.includes('xls')) return { icon: <TableChartIcon />, color: '#10B981' };
  if (ft.includes('presentation') || ft.includes('ppt')) return { icon: <SlideshowIcon />, color: '#F97316' };
  if (ft.includes('video')) return { icon: <VideoFileIcon />, color: '#8B5CF6' };
  if (ft.includes('audio')) return { icon: <AudiotrackIcon />, color: '#EC4899' };
  return { icon: <InsertDriveFileIcon />, color: '#64748b' };
};

/* ══════════════════════════════════════════════════════════════════
   1. SUPER ADMIN DASHBOARD
   ══════════════════════════════════════════════════════════════════ */
const SuperAdminDashboard = ({ stats, user, navigate, setPreviewFile, info }) => {
  const storage = stats?.storage || {};
  const diskTotal = storage.disk_total_bytes || 0;
  const diskUsed = storage.disk_used_bytes || 0;
  const storageType = storage.storage_type || 'local';
  const breakdown = storage.breakdown || {};
  const recentActivities = stats?.recent_activities || [];
  const trendData = stats?.trend_data || [];
  const distributionData = stats?.distribution_data || [];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Super Admin Hero Banner */}
      <Box
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%)',
          color: '#fff',
          boxShadow: '0 10px 30px -5px rgba(79, 70, 229, 0.4)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -50, right: 120, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip label="Super Administrator" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 800, fontSize: '0.72rem' }} />
              <Chip label={storage.drive_connected ? "Google Drive Synced" : "Local Storage"} size="small" sx={{ bgcolor: storage.drive_connected ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: '0.72rem' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
              {info?.website_name || 'MCC Legal Documents'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.9rem', maxWidth: 640 }}>
              {info?.website_description || 'Full system control panel — monitor infrastructure health, user access permissions, global storage quotas, and audit logs.'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              onClick={() => navigate('/users')}
              sx={{
                background: '#ffffff !important',
                color: '#4F46E5 !important',
                fontWeight: 800,
                px: 2.5,
                py: 1,
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18) !important',
                '& .MuiSvgIcon-root': { color: '#4F46E5 !important' },
                '&:hover': { background: '#f8fafc !important', color: '#4F46E5 !important', transform: 'translateY(-1px)' }
              }}
              startIcon={<ManageAccountsIcon />}
            >
              Manage Users
            </Button>
            <Button
              onClick={() => navigate('/settings')}
              sx={{
                background: 'rgba(255,255,255,0.15) !important',
                border: '1px solid rgba(255,255,255,0.6) !important',
                color: '#ffffff !important',
                fontWeight: 700,
                px: 2.5,
                py: 1,
                borderRadius: '12px',
                '& .MuiSvgIcon-root': { color: '#ffffff !important' },
                '&:hover': { background: 'rgba(255,255,255,0.25) !important', borderColor: '#ffffff !important', transform: 'translateY(-1px)' }
              }}
              startIcon={<SettingsIcon />}
            >
              System Settings
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Top System Stat Cards: Storage -> System Users -> Total Repositories -> Active Agreements */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Storage Utilization', count: `${fmtBytes(diskUsed)}`, label: `Total Quota: ${fmtBytes(diskTotal)}`, color: '#8B5CF6', icon: <StorageIcon />, grad: 'linear-gradient(90deg,#8B5CF6,#7C3AED)', isString: true },
          { title: 'System Users', count: stats?.total_users || 0, label: `${stats?.active_users || 0} Active Accounts`, color: '#3B82F6', icon: <PeopleIcon />, grad: 'linear-gradient(90deg,#3B82F6,#2563EB)' },
          { title: 'Total Repositories', count: stats?.total_folders || 0, label: 'Department Directories', color: '#EC4899', icon: <AssignmentIcon />, grad: 'linear-gradient(90deg,#EC4899,#D946EF)' },
          { title: 'Active Agreements', count: stats?.active_mous || 0, label: 'Fully Verified & Active', color: '#10B981', icon: <CheckCircleIcon />, grad: 'linear-gradient(90deg,#10B981,#059669)' },
        ].map((item) => (
          <Grid xs={12} sm={6} md={3} key={item.title}>
            <Card sx={{ p: 0, borderRadius: '16px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Box sx={{ height: 4, background: item.grad }} />
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'text.secondary', mb: 0.5 }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1, color: item.color }}>
                      {item.isString ? item.count : <CountUp end={item.count} />}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, width: 44, height: 44, borderRadius: '12px' }}>
                    {item.icon}
                  </Avatar>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 1.2, display: 'block' }}>
                  {item.label}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Grid Layout */}
      <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
        {/* Side-by-Side Row: MOU Lifecycle Pipeline (LEFT) & Department MOU Distribution (RIGHT) */}
        <Grid xs={12} md={7} sm={12}>
          {/* MOU Lifecycle & Department Compliance Pipeline Chart */}
          <Card sx={{ p: 2.5, borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ bgcolor: 'rgba(79,70,229,0.1)', color: 'primary.main', width: 34, height: 34, borderRadius: '10px' }}>
                    <TrendingUpIcon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.98rem', lineHeight: 1.2 }}>
                      MOU Lifecycle &amp; Compliance
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Monthly tracking of active agreements, pending verifications, and compliance renewals.
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  <Chip label={`Active: ${stats?.active_mous || 0}`} size="small" sx={{ bgcolor: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: 700, fontSize: '0.68rem' }} />
                  <Chip label={`Pending: ${stats?.pending_approval || 0}`} size="small" sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#F59E0B', fontWeight: 700, fontSize: '0.68rem' }} />
                  <Chip label={`Expiring: ${stats?.expiring_30_days || 0}`} size="small" sx={{ bgcolor: 'rgba(249,115,22,0.1)', color: '#F97316', fontWeight: 700, fontSize: '0.68rem' }} />
                </Box>
              </Box>
              <Box sx={{ width: '100%', height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', fontSize: '0.8rem' }} />
                    <Area type="monotone" name="Active Agreements" dataKey="Active" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActive)" />
                    <Area type="monotone" name="Pending Verifications" dataKey="Pending" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorPending)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid xs={12} md={5} sm={12}>
          {/* Department Distribution Pie Chart */}
          <Card sx={{ p: 2.5, borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Department MOU Distribution
            </Typography>
            <Box sx={{ width: '100%', height: 190, display: 'flex', justifyContent: 'center', my: 'auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, justifyContent: 'center', mt: 1 }}>
              {distributionData.map((item) => (
                <Chip key={item.name} label={`${item.name} (${item.value})`} size="small" sx={{ bgcolor: `${item.color}15`, color: item.color, fontWeight: 700, fontSize: '0.7rem' }} />
              ))}
            </Box>
          </Card>
        </Grid>

        {/* System Activity & Audit Trail */}
        <Grid xs={12}>
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon sx={{ color: 'primary.main' }} /> System Audit Trail &amp; Recent Activity
              </Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/logs')} sx={{ fontWeight: 700 }}>
                View Full Audit Logs
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>User / Actor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Activity Description</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No recent system activities logged.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentActivities.map((act, idx) => {
                      const displayAction = act.formatted_action || act.action || 'System operation';
                      const userName = act.user?.name || act.user?.email || 'System Automator';
                      return (
                        <TableRow key={idx} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell sx={{ py: 1.2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 26, height: 26, fontSize: '0.72rem', bgcolor: 'primary.main', fontWeight: 800 }}>
                                {userName.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                                {userName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                              {displayAction}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={act.module || 'System'} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: 'rgba(79,70,229,0.08)', color: 'primary.main', borderRadius: '6px' }} />
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 2 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', fontWeight: 600 }}>
                              {act.time_ago || new Date(act.created_at).toLocaleTimeString()}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ══════════════════════════════════════════════════════════════════
   2. ADMIN DASHBOARD
   ══════════════════════════════════════════════════════════════════ */
const AdminDashboard = ({ stats, user, navigate, setPreviewFile }) => {
  const recentFolders = stats?.recent_folders || [];
  const recentUploads = stats?.recent_uploads || [];
  const trendData = stats?.trend_data || [];
  const distributionData = stats?.distribution_data || [];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Admin Hero Banner */}
      <Box
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #4F46E5 100%)',
          color: '#fff',
          boxShadow: '0 10px 30px -5px rgba(37, 99, 235, 0.35)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Chip label="Department Administrator" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 800, fontSize: '0.72rem', mb: 0.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
              Welcome back, {user?.name || 'Admin'}! 👋
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.9rem', maxWidth: 600 }}>
              MOU Operations &amp; Verification Hub — review pending agreements, monitor compliance renewals, and manage departmental repositories.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
            <Button
              onClick={() => navigate('/explorer')}
              sx={{
                background: '#ffffff !important',
                color: '#2563EB !important',
                fontWeight: 800,
                px: 2.5,
                py: 1,
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18) !important',
                width: { xs: '100%', sm: 'auto' },
                '& .MuiSvgIcon-root': { color: '#2563EB !important' },
                '&:hover': { background: '#f8fafc !important', color: '#2563EB !important', transform: 'translateY(-1px)' }
              }}
              startIcon={<CloudUploadIcon />}
            >
              Upload Document
            </Button>
            <Button
              onClick={() => navigate('/system-map')}
              sx={{
                background: 'rgba(255,255,255,0.15) !important',
                border: '1px solid rgba(255,255,255,0.6) !important',
                color: '#ffffff !important',
                fontWeight: 700,
                px: 2.5,
                py: 1,
                borderRadius: '12px',
                width: { xs: '100%', sm: 'auto' },
                '& .MuiSvgIcon-root': { color: '#ffffff !important' },
                '&:hover': { background: 'rgba(255,255,255,0.25) !important', borderColor: '#ffffff !important', transform: 'translateY(-1px)' }
              }}
              startIcon={<InfoOutlinedIcon />}
            >
              Lifecycle Guide
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Admin Operational Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'Active MOUs', count: stats?.active_mous || 0, label: 'Fully Verified & Operational', color: '#10B981', icon: <CheckCircleIcon />, grad: 'linear-gradient(90deg,#10B981,#059669)' },
          { title: 'Pending Verification', count: stats?.pending_approval || 0, label: 'Requires Admin Verification', color: '#F59E0B', icon: <HourglassTopIcon />, grad: 'linear-gradient(90deg,#F59E0B,#D97706)' },
          { title: 'Expiring in 30 Days', count: stats?.expiring_30_days || 0, label: 'Requires Renewal Action', color: '#F97316', icon: <WarningIcon />, grad: 'linear-gradient(90deg,#F97316,#EA580C)' },
          { title: 'Department Folders', count: stats?.total_folders || 0, label: 'Accessible Repositories', color: '#3B82F6', icon: <AssignmentIcon />, grad: 'linear-gradient(90deg,#3B82F6,#1D4ED8)' },
        ].map((item) => (
          <Grid xs={12} sm={6} md={3} key={item.title}>
            <Card sx={{ p: 0, borderRadius: '16px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Box sx={{ height: 4, background: item.grad }} />
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'text.secondary', mb: 0.5 }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1, color: item.color }}>
                      <CountUp end={item.count} />
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, width: 44, height: 44, borderRadius: '12px' }}>
                    {item.icon}
                  </Avatar>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 1.2, display: 'block' }}>
                  {item.label}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Admin Section */}
      <Grid container spacing={3}>
        {/* Side-by-Side Row: MOU Execution Overview (LEFT) & Department Distribution (RIGHT) */}
        <Grid xs={12} lg={7} md={7}>
          {/* Trend Chart */}
          <Card sx={{ p: 2.5, borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.98rem' }}>MOU Execution &amp; Growth Overview</Typography>
                <Chip label="2026 Analytics" size="small" sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#2563EB', fontWeight: 700, fontSize: '0.7rem' }} />
              </Box>
              <Box sx={{ width: '100%', height: 210 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActiveAdmin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPendingAdmin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', fontSize: '0.8rem' }} />
                    <Area type="monotone" name="Active Agreements" dataKey="Active" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActiveAdmin)" />
                    <Area type="monotone" name="Pending Verifications" dataKey="Pending" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorPendingAdmin)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid xs={12} lg={5} md={5}>
          {/* Department Distribution Pie Chart */}
          <Card sx={{ p: 2.5, borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Department MOU Distribution
            </Typography>
            <Box sx={{ width: '100%', height: 190, display: 'flex', justifyContent: 'center', my: 'auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value">
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, justifyContent: 'center', mt: 1 }}>
              {distributionData.map((item) => (
                <Chip key={item.name} label={`${item.name} (${item.value})`} size="small" sx={{ bgcolor: `${item.color}15`, color: item.color, fontWeight: 700, fontSize: '0.7rem' }} />
              ))}
            </Box>
          </Card>
        </Grid>

        {/* Department Repositories Grid (Full Width) */}
        <Grid xs={12}>
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem' }}>Department Repositories</Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/explorer')} sx={{ fontWeight: 700 }}>
                View All Directory
              </Button>
            </Box>
            <Grid container spacing={2}>
              {recentFolders.slice(0, 4).map((folder) => {
                const style = getDeptStyle(folder.name);
                return (
                  <Grid xs={12} sm={6} md={3} key={folder.id}>
                    <Card
                      onClick={() => navigate(`/explorer?folder=${folder.id}`)}
                      sx={{
                        p: 2.2,
                        borderRadius: '16px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderLeft: `4px solid ${style.color}`,
                        transition: 'all 0.22s ease',
                        '&:hover': { bgcolor: style.bg, transform: 'translateY(-2px)' }
                      }}
                    >
                      <Avatar sx={{ bgcolor: style.bg, color: style.color, mx: 'auto', mb: 1.2, width: 42, height: 42, borderRadius: '12px' }}>
                        {style.icon}
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', textAlign: 'center' }} noWrap>
                        {folder.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'block', textAlign: 'center', mt: 0.3 }}>
                        {folder.file_count ?? 0} Documents
                      </Typography>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ══════════════════════════════════════════════════════════════════
   3. USER DASHBOARD (Standard User / Faculty / Staff)
   ══════════════════════════════════════════════════════════════════ */
const UserDashboard = ({ stats, user, navigate, setPreviewFile }) => {
  const myRecentUploads = stats?.my_recent_uploads || stats?.recent_uploads || [];
  const recentFolders = stats?.recent_folders || [];

  return (
    <Box sx={{ width: '100%' }}>
      {/* User Hero Banner */}
      <Box
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3,
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 50%, #059669 100%)',
          color: '#fff',
          boxShadow: '0 10px 30px -5px rgba(20, 184, 166, 0.35)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', top: -30, right: -30, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Chip label="User Workspace" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 800, fontSize: '0.72rem', mb: 0.5 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
              Welcome back, {user?.name || 'User'}! 👋
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.9rem', maxWidth: 600 }}>
              Your Personal MOU &amp; Document Hub — access assigned departmental folders, review your uploaded files, and submit new agreements.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
            <Button
              onClick={() => navigate('/explorer')}
              sx={{
                background: '#ffffff !important',
                color: '#0D9488 !important',
                fontWeight: 800,
                px: 2.5,
                py: 1,
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18) !important',
                width: { xs: '100%', sm: 'auto' },
                '& .MuiSvgIcon-root': { color: '#0D9488 !important' },
                '&:hover': { background: '#f8fafc !important', color: '#0D9488 !important', transform: 'translateY(-1px)' }
              }}
              startIcon={<CloudUploadIcon />}
            >
              Upload Document
            </Button>
            <Button
              onClick={() => navigate('/system-map')}
              sx={{
                background: 'rgba(255,255,255,0.15) !important',
                border: '1px solid rgba(255,255,255,0.6) !important',
                color: '#ffffff !important',
                fontWeight: 700,
                px: 2.5,
                py: 1,
                borderRadius: '12px',
                width: { xs: '100%', sm: 'auto' },
                '& .MuiSvgIcon-root': { color: '#ffffff !important' },
                '&:hover': { background: 'rgba(255,255,255,0.25) !important', borderColor: '#ffffff !important', transform: 'translateY(-1px)' }
              }}
              startIcon={<MapIcon />}
            >
              System Guide
            </Button>
          </Box>
        </Box>
      </Box>

      {/* User Personal Stat Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'My Uploaded Files', count: stats?.my_files_count || 0, label: 'Uploaded by me', color: '#14B8A6', icon: <InsertDriveFileIcon />, grad: 'linear-gradient(90deg,#14B8A6,#0D9488)' },
          { title: 'Accessible Repositories', count: stats?.total_folders || 0, label: 'Department Folders', color: '#3B82F6', icon: <FolderIcon />, grad: 'linear-gradient(90deg,#3B82F6,#2563EB)' },
          { title: 'Notifications', count: stats?.latest_notifications?.length || 0, label: 'Unread alerts', color: '#F59E0B', icon: <HourglassTopIcon />, grad: 'linear-gradient(90deg,#F59E0B,#D97706)' },
        ].map((item) => (
          <Grid xs={12} sm={4} md={4} key={item.title}>
            <Card sx={{ p: 0, borderRadius: '16px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Box sx={{ height: 4, background: item.grad }} />
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'text.secondary', mb: 0.5 }}>
                      {item.title}
                    </Typography>
                    <Typography sx={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1, color: item.color }}>
                      <CountUp end={item.count} />
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: `${item.color}15`, color: item.color, width: 44, height: 44, borderRadius: '12px' }}>
                    {item.icon}
                  </Avatar>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mt: 1.2, display: 'block' }}>
                  {item.label}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main User Workspace Grid (Full 100% Width) */}
      <Grid container spacing={3}>
        {/* Table of My Recent Files (Full Width) */}
        <Grid xs={12}>
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem' }}>My Recent Document Uploads</Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/explorer')} sx={{ fontWeight: 700 }}>
                View All Files
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: 'none', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700, py: 1.5 }}>File Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Size</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Upload Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myRecentUploads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No documents uploaded yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    myRecentUploads.map((file) => {
                      const iconInfo = getFileIcon(file.file_type);
                      return (
                        <TableRow key={file.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell sx={{ py: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ bgcolor: `${iconInfo.color}15`, color: iconInfo.color, width: 34, height: 34, borderRadius: '10px' }}>
                                {iconInfo.icon}
                              </Avatar>
                              <Box sx={{ overflow: 'hidden' }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem' }} noWrap>
                                  {file.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  {file.file_type || 'Document'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {fmtBytes(file.size)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(file.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ pr: 2 }}>
                            <IconButton size="small" onClick={() => setPreviewFile(file)} sx={{ color: 'primary.main' }}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Grid>

        {/* Accessible Department Repositories Grid (Full Width 4 Columns) */}
        <Grid xs={12}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem', mb: 1.5 }}>Accessible Department Folders</Typography>
            <Grid container spacing={2}>
              {recentFolders.map((folder) => {
                const style = getDeptStyle(folder.name);
                return (
                  <Grid xs={12} sm={6} md={3} key={folder.id}>
                    <Card
                      onClick={() => navigate(`/explorer?folder=${folder.id}`)}
                      sx={{
                        p: 2.2,
                        borderRadius: '16px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderLeft: `4px solid ${style.color}`,
                        transition: 'all 0.22s ease',
                        '&:hover': { bgcolor: style.bg, transform: 'translateY(-2px)' }
                      }}
                    >
                      <Avatar sx={{ bgcolor: style.bg, color: style.color, mx: 'auto', mb: 1, width: 42, height: 42, borderRadius: '12px' }}>
                        {style.icon}
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.84rem', textAlign: 'center' }} noWrap>
                        {folder.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'block', textAlign: 'center', mt: 0.3 }}>
                        {folder.file_count ?? 0} Documents
                      </Typography>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Grid>

        {/* Bottom CTA Cards */}
        <Grid xs={12}>
          <Card sx={{ p: 3, borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'center' }}>
            <Box>
              <Avatar sx={{ width: 48, height: 48, bgcolor: 'rgba(59,130,246,0.15)', color: '#2563EB', mx: 'auto', mb: 1.5, borderRadius: '14px' }}>
                <MapIcon fontSize="medium" />
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                MOU Lifecycle &amp; System Map
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.82rem' }}>
                Learn how document approvals, compliance workflows, and permissions operate.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => navigate('/system-map')}
              sx={{
                py: 1.2,
                borderRadius: '12px',
                fontWeight: 800,
                borderColor: 'primary.main',
                maxWidth: 280,
                width: '100%',
                mx: 'auto',
                '&:hover': { transform: 'translateY(-2px)' }
              }}
              startIcon={<InfoOutlinedIcon />}
            >
              View System Guide
            </Button>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN DASHBOARD WRAPPER WITH ROLE VIEW DISPATCH & PREVIEW TAB TOGGLE
   ══════════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const { user } = useAuth();
  const { info } = useSiteCustomization();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [successMsg, setSuccessMsg] = useState(location.state?.successMessage || '');

  // Detect user role
  const userRole = user?.role?.name || 'User';

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        window.history.replaceState({}, document.title);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await api.get('/api/dashboard/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Dashboard stats failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Global Auto Refresh Subscription
  useAutoRefresh(REFRESH_CATEGORIES.ALL, fetchStats);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
      <CircularProgress sx={{ color: 'primary.main' }} />
    </Box>
  );

  return (
    <Box sx={{ width: '100%' }} className="animate-fade-slide-up">
      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}

      {/* Render Role-Specific Dashboard directly based on logged-in user role */}
      {userRole === 'Super Admin' ? (
        <SuperAdminDashboard stats={stats} user={user} navigate={navigate} setPreviewFile={setPreviewFile} info={info} />
      ) : (userRole === 'Admin' || userRole === 'Lawyer / MOU Administrator') ? (
        <AdminDashboard stats={stats} user={user} navigate={navigate} setPreviewFile={setPreviewFile} />
      ) : (
        <UserDashboard stats={stats} user={user} navigate={navigate} setPreviewFile={setPreviewFile} />
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        open={Boolean(previewFile)}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onRefresh={fetchStats}
      />
    </Box>
  );
};

export default Dashboard;
