import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Button, Drawer,
  IconButton, Divider, List, ListItem, ListItemIcon, ListItemText, Tooltip,
  Grid, Paper, Accordion, AccordionSummary, AccordionDetails, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ShareIcon from '@mui/icons-material/Share';
import DrawIcon from '@mui/icons-material/Draw';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import StorageIcon from '@mui/icons-material/Storage';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import CheckIcon from '@mui/icons-material/Check';

import { useThemeMode } from '../context/ThemeContext';

/* ─── MOU Lifecycle Stage Data ──────────────────────────── */
const STAGES = [
  {
    id: 'draft',
    step: '01',
    label: 'Draft',
    actionLabel: 'Creation & Drafting',
    roleTag: 'Creator & Admin',
    icon: <EditNoteIcon />,
    color: '#64748B',
    lightBg: 'rgba(100, 116, 139, 0.08)',
    darkBg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(100, 116, 139, 0.3)',
    description: 'An MOU agreement is created and saved as an initial draft. Key clauses, terms, and initial attachments are prepared.',
    whoCanAct: ['Super Admin', 'Admin', 'MOU Creator'],
    whatHappensNext: 'The draft is shared with assigned departments or external signatories for legal review.',
    notificationsFire: ['Creator receives "Draft saved successfully" confirmation'],
    tip: 'Draft MOUs are private to creators and admins. Use this stage to refine clauses before sharing.',
  },
  {
    id: 'shared',
    step: '02',
    label: 'Shared',
    actionLabel: 'Stakeholder Review',
    roleTag: 'Department Coordinators',
    icon: <ShareIcon />,
    color: '#2563EB',
    lightBg: 'rgba(37, 99, 235, 0.08)',
    darkBg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(37, 99, 235, 0.3)',
    description: 'The MOU has been distributed to designated stakeholders and departments for review and collaboration.',
    whoCanAct: ['Super Admin', 'Admin', 'Assigned Department Coordinators'],
    whatHappensNext: 'Reviewers negotiate clauses and approve the final agreement text for digital signing.',
    notificationsFire: ['Assigned stakeholders receive "New MOU shared with you for review"', 'Admin notified of distribution'],
    tip: 'Check the "Shared With Me" sidebar section to quickly access agreements awaiting your review.',
  },
  {
    id: 'signed',
    step: '03',
    label: 'Signed',
    actionLabel: 'Digital Execution',
    roleTag: 'Authorized Signatories',
    icon: <DrawIcon />,
    color: '#7C3AED',
    lightBg: 'rgba(124, 58, 237, 0.08)',
    darkBg: 'rgba(139, 92, 246, 0.15)',
    border: 'rgba(124, 58, 237, 0.3)',
    description: 'All required parties have agreed to terms and digitally executed the MOU agreement.',
    whoCanAct: ['Super Admin', 'Admin', 'Authorized Signatories'],
    whatHappensNext: 'The executed MOU is automatically submitted for legal compliance verification.',
    notificationsFire: ['All parties notified "MOU signed by all signatories"', 'Verifiers receive "Pending verification" alert'],
    tip: 'Signed MOUs are locked to preserve integrity. Any subsequent amendments require creating a new version.',
  },
  {
    id: 'pending',
    step: '04',
    label: 'Pending Verification',
    actionLabel: 'Legal Audit & Check',
    roleTag: 'Legal Officers',
    icon: <VerifiedIcon />,
    color: '#D97706',
    lightBg: 'rgba(217, 119, 6, 0.08)',
    darkBg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(217, 119, 6, 0.3)',
    description: 'The agreement undergoes legal audit and institutional compliance review prior to official activation.',
    whoCanAct: ['Super Admin', 'Admin', 'Legal Officers'],
    whatHappensNext: 'Verifiers approve → MOU becomes Active. If changes requested → returns to Draft stage.',
    notificationsFire: ['Verifiers receive "Action required: verify MOU compliance"', 'Creator notified of audit result'],
    tip: 'All compliance audit steps are recorded in real-time inside the Activity Audit Logs module.',
  },
  {
    id: 'active',
    step: '05',
    label: 'Active',
    actionLabel: 'In Force & Monitored',
    roleTag: 'All Authorized Users',
    icon: <CheckCircleIcon />,
    color: '#059669',
    lightBg: 'rgba(5, 150, 105, 0.08)',
    darkBg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(5, 150, 105, 0.3)',
    description: 'The MOU is fully approved, in active legal force, backed up to Google Drive, and tracked for expiration.',
    whoCanAct: ['View Only — all authorized users can view; edits restricted'],
    whatHappensNext: 'System monitors end date. At 30 days prior to expiration → triggers Expiring Soon status.',
    notificationsFire: ['Annual MOU anniversary reminders', '"Expiring Soon" alert 30 days prior to end date'],
    tip: 'Active MOUs automatically feed system compliance metrics and dashboard health scores.',
  },
  {
    id: 'expiring',
    step: '06',
    label: 'Expiring Soon',
    actionLabel: 'Renewal Reminder',
    roleTag: 'MOU Owner & Admin',
    icon: <WarningAmberIcon />,
    color: '#EA580C',
    lightBg: 'rgba(234, 88, 12, 0.08)',
    darkBg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(234, 88, 12, 0.3)',
    description: 'The agreement will expire within the next 30 days. Renewal or extension action is strongly recommended.',
    whoCanAct: ['Super Admin', 'Admin', 'MOU Owner'],
    whatHappensNext: 'Owner initiates renewal → new Draft created. If unhandled → status transitions to Expired.',
    notificationsFire: ['"Expiring in 30 days" email alert', '"Expiring in 7 days" urgent alert', '"Expiring TODAY" critical alert'],
    tip: 'Initiate renewal at least 30 days prior to expiration to maintain continuous legal coverage.',
  },
  {
    id: 'expired',
    step: '07',
    label: 'Expired / Renewed',
    actionLabel: 'Archived / Superseded',
    roleTag: 'Super Admin & Admin',
    icon: <AutorenewIcon />,
    color: '#E11D48',
    lightBg: 'rgba(225, 29, 72, 0.08)',
    darkBg: 'rgba(244, 63, 94, 0.15)',
    border: 'rgba(225, 29, 72, 0.3)',
    description: 'The agreement has reached its end date (Expired) or has been superseded by a renewed agreement version.',
    whoCanAct: ['Super Admin', 'Admin — can initiate new MOU from template'],
    whatHappensNext: 'Expired MOUs remain permanently archived in Google Drive and database for compliance audits.',
    notificationsFire: ['"MOU expired" notification to owner', '"Renewal MOU created" notification if renewed'],
    tip: 'Expired MOUs remain accessible in read-only mode for audit trail purposes.',
  },
];

/* ─── Feature Manual Data ───────────────────────────────── */
const SYSTEM_FEATURES = [
  {
    id: 'drive-sync',
    title: 'Google Drive Automatic Cloud Storage Engine',
    icon: <CloudDoneIcon sx={{ color: '#2563EB', fontSize: '1.8rem' }} />,
    badge: 'Core Storage Engine',
    color: '#2563EB',
    summary: 'Single configured Google Drive master root folder hosting all isolated module subfolders in real-time.',
    details: [
      'Single Configured Master Root: Uses one master Google Drive folder ID configured under System Settings → Google Drive.',
      'Isolated Module Folders: Every module (MOU Repository, Case Documents, Vendor Agreements, Department, etc.) provisions its dedicated subfolder directly under the Master Root.',
      'Real-Time Parent Alignment: Files and subfolders created inside a module inherit that module’s Google Drive Folder ID as their cloud parent.',
      'Automatic Fallback Protection: Protects against broken connection or missing credentials by providing clean local fallbacks without throwing unhandled exceptions.'
    ]
  },
  {
    id: 'website-builder',
    title: 'No-Code Dynamic Website & Sidebar Builder',
    icon: <AutoAwesomeIcon sx={{ color: '#7C3AED', fontSize: '1.8rem' }} />,
    badge: 'System Settings',
    color: '#7C3AED',
    summary: 'Visual builder for Super Admin and Admin to create custom repositories and sidebar pages instantly.',
    details: [
      'Visual Page Construction: Create new dynamic modules (Folder Repository, Document Repository, Table View, Card View) without coding.',
      'Role & User Permissions: Configure custom access rules and CRUD permissions per dynamic module.',
      'Google Drive Auto-Provisioning: Automatically provisions a dedicated Google Drive folder under Application Root when a new module is published.',
      'Recycle Bin Integration: Unpublishing or deleting a module automatically moves its Google Drive folder into the Recycle Bin.'
    ]
  },
  {
    id: 'recycle-bin',
    title: 'OS-Style Recycle Bin & Retention Policy Engine',
    icon: <DeleteIcon sx={{ color: '#DC2626', fontSize: '1.8rem' }} />,
    badge: 'Data Safety & Purge',
    color: '#DC2626',
    summary: 'Comprehensive soft-deletion, restoration, and auto-purge retention policy engine.',
    details: [
      'Module, Folder & File Support: Supports soft-deleting entire dynamic modules, nested folder trees, and individual files.',
      'Single Top-Level Module Display: Deleted modules display as single recoverable items in the Recycle Bin UI, keeping the container tree intact.',
      'Super Admin Role Enforcement: Module restore and permanent deletion are strictly restricted to the Super Admin role.',
      'Idempotent Restoration: Restoring a module or folder moves its Google Drive folder back under Application Root without creating duplicate folders or database records.',
      'Auto-Delete Retention Thresholds: Configurable auto-purge threshold (7 Days, 30 Days, 1 Year, or Never) to automatically clean up expired items.'
    ]
  },
  {
    id: 'role-control',
    title: 'Role-Based Access Control (RBAC) & Governance',
    icon: <AdminPanelSettingsIcon sx={{ color: '#059669', fontSize: '1.8rem' }} />,
    badge: 'Security & Access',
    color: '#059669',
    summary: 'Granular permissions across Super Admin, Admin, and User roles.',
    details: [
      'Super Admin: Full system control — User Management, Role Definitions, Website Builder, Global Google Drive Settings, Module Deletion & Restoration, Auto-Purge Retention.',
      'Admin: Department folder management, document upload/download, user administration, folder/file Recycle Bin restoration, SMTP configuration.',
      'Standard User: View, upload, download, and collaborate within explicitly granted department repositories.',
      'Activity Audit Logs: Every deletion, restoration, user update, and login attempt is logged with IP, timestamp, and user details.'
    ]
  }
];

/* ─── Role Capabilities Matrix ─────────────────────────── */
const ROLE_MATRIX = [
  { feature: 'View MOU Repositories & Documents', superAdmin: 'Full Access', admin: 'Assigned Folders', user: 'Assigned Folders' },
  { feature: 'Upload / Download / Preview Files', superAdmin: 'Full Access', admin: 'Full Access', user: 'Granted Folders' },
  { feature: 'Soft-Delete Folders & Files', superAdmin: 'Full Access', admin: 'Full Access', user: 'Restricted' },
  { feature: 'Restore / Delete Folders & Files in Recycle Bin', superAdmin: 'Full Access', admin: 'Full Access', user: 'No Access' },
  { feature: 'Soft-Delete Entire Dynamic Module', superAdmin: 'Full Access', admin: 'No Access', user: 'No Access' },
  { feature: 'View, Restore & Purge Modules in Recycle Bin', superAdmin: 'Full Access (Exclusive)', admin: 'Hidden from View', user: 'Hidden from View' },
  { feature: 'Build New Modules via Website Builder', superAdmin: 'Full Access', admin: 'Full Access', user: 'No Access' },
  { feature: 'Configure Global Google Drive & SMTP Settings', superAdmin: 'Full Access', admin: 'SMTP Only', user: 'No Access' },
  { feature: 'User & Role Permission Management', superAdmin: 'Full Access', admin: 'Full Access', user: 'No Access' },
];

/* ─── Role Colour Map ───────────────────────────────────── */
const ROLE_COLORS = {
  'Super Admin': '#4338CA',
  'Admin': '#4F46E5',
  'MOU Creator': '#0284C7',
  'MOU Owner': '#059669',
  'Assigned Department Coordinators': '#D97706',
  'Authorized Signatories': '#7C3AED',
  'Legal Officers': '#0284C7',
  'View Only': '#64748B',
};
const roleColor = (r) => {
  for (const [k, v] of Object.entries(ROLE_COLORS)) if (r.startsWith(k)) return v;
  return '#475569';
};

/* ─── Stage Node Card Component ─────────────────────────── */
const StageCardNode = ({ stage, onClick, isActive, isDark }) => (
  <Paper
    elevation={0}
    onClick={() => onClick(stage)}
    sx={{
      p: 2,
      borderRadius: '16px',
      cursor: 'pointer',
      minWidth: 190,
      maxWidth: 220,
      flex: 1,
      bgcolor: isDark
        ? (isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.8)')
        : (isActive ? 'rgba(79, 70, 229, 0.08)' : '#FFFFFF'),
      border: `2px solid ${isActive ? stage.color : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0')}`,
      boxShadow: isActive
        ? `0 0 0 4px ${stage.color}25, 0 8px 24px ${stage.color}20`
        : (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)'),
      transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
      '&:hover': {
        transform: 'translateY(-3px)',
        borderColor: stage.color,
        boxShadow: `0 0 0 4px ${stage.color}25, 0 8px 24px ${stage.color}20`,
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
      <Chip
        label={`STEP ${stage.step}`}
        size="small"
        sx={{
          height: 20,
          fontSize: '0.65rem',
          fontWeight: 900,
          bgcolor: `${stage.color}18`,
          color: stage.color,
          border: `1px solid ${stage.color}30`
        }}
      />
      <TouchAppIcon sx={{ fontSize: '0.9rem', color: isDark ? '#64748B' : '#94A3B8' }} />
    </Box>

    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
      <Box sx={{
        width: 42, height: 42, borderRadius: '12px',
        bgcolor: isDark ? stage.darkBg : stage.lightBg,
        border: `1px solid ${stage.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        {React.cloneElement(stage.icon, { sx: { color: stage.color, fontSize: '1.35rem' } })}
      </Box>
      <Box sx={{ overflow: 'hidden' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2, color: isDark ? '#F8FAFC' : '#0F172A' }} noWrap>
          {stage.label}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.68rem', color: isDark ? '#94A3B8' : '#64748B', display: 'block' }} noWrap>
          {stage.actionLabel}
        </Typography>
      </Box>
    </Box>

    <Chip
      label={stage.roleTag}
      size="small"
      variant="outlined"
      sx={{
        height: 20,
        fontSize: '0.62rem',
        fontWeight: 700,
        color: isDark ? '#CBD5E1' : '#475569',
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1',
        maxWidth: '100%',
      }}
    />
  </Paper>
);

const FlowStepConnector = ({ label, isDark, direction = 'right' }) => (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    px: 1,
    minWidth: 40,
    flexShrink: 0
  }}>
    {direction === 'right' && <ArrowForwardIcon sx={{ color: isDark ? '#818CF8' : '#4F46E5', fontSize: '1.2rem' }} />}
    {direction === 'left' && <ArrowBackIcon sx={{ color: isDark ? '#818CF8' : '#4F46E5', fontSize: '1.2rem' }} />}
    {direction === 'down' && <ArrowDownwardIcon sx={{ color: isDark ? '#818CF8' : '#4F46E5', fontSize: '1.2rem' }} />}
    {label && (
      <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 800, color: isDark ? '#94A3B8' : '#64748B', mt: 0.2, textAlign: 'center' }}>
        {label}
      </Typography>
    )}
  </Box>
);

/* ─── Detail Drawer ─────────────────────────────────────── */
const StageDrawer = ({ stage, onClose, isDark }) => {
  if (!stage) return null;
  return (
    <Drawer
      anchor="right"
      open={Boolean(stage)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 }, p: 0, bgcolor: isDark ? '#0F172A' : '#FFFFFF' } } }}
    >
      <Box sx={{ p: 3.5, height: '100%', overflow: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip label={`STEP ${stage.step}`} size="small" sx={{ fontWeight: 900, bgcolor: `${stage.color}20`, color: stage.color, fontSize: '0.7rem' }} />
              <Chip label={stage.label} size="small" sx={{ bgcolor: isDark ? stage.darkBg : stage.lightBg, color: stage.color, fontWeight: 800, fontSize: '0.78rem' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {stage.actionLabel}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.7, fontSize: '0.9rem', color: isDark ? '#CBD5E1' : '#334155' }}>
          {stage.description}
        </Typography>

        <Divider sx={{ mb: 2.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          <PersonIcon sx={{ fontSize: '1.1rem', color: '#4F46E5' }} /> Who Can Act Here
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 3 }}>
          {stage.whoCanAct.map((r) => (
            <Chip key={r} label={r} size="small" sx={{ bgcolor: `${roleColor(r)}18`, color: roleColor(r), fontWeight: 700, borderRadius: '8px', fontSize: '0.72rem' }} />
          ))}
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.2, display: 'flex', alignItems: 'center', gap: 1, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          <ArrowForwardIcon sx={{ fontSize: '1.1rem', color: '#4F46E5' }} /> Next System Transition
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: isDark ? '#1E293B' : '#F8FAFC', mb: 3, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>
          <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.6, color: isDark ? '#CBD5E1' : '#334155' }}>
            {stage.whatHappensNext}
          </Typography>
        </Paper>

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.2, display: 'flex', alignItems: 'center', gap: 1, color: isDark ? '#F8FAFC' : '#0F172A' }}>
          <NotificationsIcon sx={{ fontSize: '1.1rem', color: '#4F46E5' }} /> Automated System Alerts
        </Typography>
        <List dense disablePadding sx={{ mb: 3 }}>
          {stage.notificationsFire.map((n, i) => (
            <ListItem key={i} disablePadding sx={{ mb: 0.8 }}>
              <ListItemIcon sx={{ minWidth: 22 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: stage.color, mt: 0.2 }} />
              </ListItemIcon>
              <ListItemText
                primary={n}
                slotProps={{ primary: { fontSize: '0.82rem', color: isDark ? '#94A3B8' : '#475569', lineHeight: 1.5 } }}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ mb: 2.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }} />

        <Box sx={{ p: 2, borderRadius: '12px', bgcolor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF', border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'}` }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <InfoOutlinedIcon sx={{ color: '#2563EB', fontSize: '1.1rem', mt: 0.1, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: isDark ? '#93C5FD' : '#1E40AF', lineHeight: 1.6, fontSize: '0.8rem' }}>
              <strong>Best Practice Tip: </strong>{stage.tip}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

/* ─── Main System Map Page ───────────────────────────────── */
const SystemMap = () => {
  const { mode } = useThemeMode();
  const theme = useTheme();
  const isDark = mode === 'dark' || theme.palette.mode === 'dark';

  const [selectedStage, setSelectedStage] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, maxWidth: 1400, margin: '0 auto' }}>

      {/* Hero Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 3.5,
          borderRadius: '24px',
          background: isDark
            ? 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #312E81 100%)'
            : 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 50%, #E0E7FF 100%)',
          color: isDark ? '#ffffff' : '#0F172A',
          boxShadow: isDark ? '0 16px 36px rgba(0,0,0,0.5)' : '0 8px 24px rgba(79, 70, 229, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2.5,
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#C7D2FE'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 280 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: '18px',
            background: isDark
              ? 'rgba(255, 255, 255, 0.15)'
              : 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            backdropFilter: isDark ? 'blur(12px)' : 'none',
            boxShadow: isDark ? 'none' : '0 6px 16px rgba(79, 70, 229, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <HelpCenterIcon sx={{ color: isDark ? '#FDE68A' : '#ffffff', fontSize: '2.2rem' }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', color: isDark ? '#ffffff' : '#0F172A', fontSize: { xs: '1.5rem', md: '1.9rem' } }}>
                System Map &amp; User Manual
              </Typography>
              <Chip
                label="System Manual v2.0"
                size="small"
                sx={{
                  bgcolor: isDark ? 'rgba(253, 230, 138, 0.25)' : 'rgba(79, 70, 229, 0.12)',
                  color: isDark ? '#FDE68A' : '#4F46E5',
                  border: `1px solid ${isDark ? 'rgba(253, 230, 138, 0.4)' : 'rgba(79, 70, 229, 0.25)'}`,
                  fontWeight: 800,
                  fontSize: '0.72rem'
                }}
              />
            </Box>
            <Typography variant="body1" sx={{ opacity: 0.92, maxWidth: 780, lineHeight: 1.6, fontSize: '0.92rem', color: isDark ? '#E0E7FF' : '#334155' }}>
              Interactive guide explaining the MOU Agreement Lifecycle, Google Drive Cloud Storage Sync, No-Code Website Builder, OS-Style Recycle Bin, and Role Governance.
            </Typography>
          </Box>
        </Box>

        {/* Quick System Metric Badges */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Chip
            icon={<AutorenewIcon sx={{ color: isDark ? '#FDE68A !important' : '#4F46E5 !important' }} />}
            label="7 Lifecycle Stages"
            sx={{
              bgcolor: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF',
              color: isDark ? '#ffffff' : '#4F46E5',
              border: `1px solid ${isDark ? 'transparent' : '#C7D2FE'}`,
              fontWeight: 800
            }}
          />
          <Chip
            icon={<StorageIcon sx={{ color: isDark ? '#A5B4FC !important' : '#7C3AED !important' }} />}
            label="Cloud Storage Engine"
            sx={{
              bgcolor: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF',
              color: isDark ? '#ffffff' : '#7C3AED',
              border: `1px solid ${isDark ? 'transparent' : '#C7D2FE'}`,
              fontWeight: 800
            }}
          />
        </Box>
      </Paper>

      {/* Navigation Tabs Card */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: '18px',
          mb: 3.5,
          p: 0.6,
          bgcolor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.02)'
        }}
      >
        <Tabs
          value={currentTab}
          onChange={(e, v) => setCurrentTab(v)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.92rem',
              py: 1.4, px: 2.5,
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              color: isDark ? '#94A3B8' : '#64748B',
              '&.Mui-selected': {
                color: isDark ? '#818CF8' : '#4F46E5',
                bgcolor: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(79, 70, 229, 0.08)'
              }
            }
          }}
        >
          <Tab icon={<AutorenewIcon />} iconPosition="start" label="MOU Agreement Lifecycle" />
          <Tab icon={<StorageIcon />} iconPosition="start" label="Core System Architecture" />
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Role Capabilities Matrix" />
          <Tab icon={<SettingsIcon />} iconPosition="start" label="Quick Start User Guide" />
        </Tabs>
      </Paper>

      {/* Tab 0: MOU Lifecycle Stages */}
      {currentTab === 0 && (
        <Box className="animate-fade-slide-up">
          <Card
            variant="outlined"
            sx={{
              p: { xs: 2.5, md: 3.5 },
              mb: 4,
              borderRadius: '24px',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              bgcolor: isDark ? '#1E293B' : '#FFFFFF',
              boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.02)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Interactive Agreement Lifecycle Pipeline
                </Typography>
                <Typography variant="body2" sx={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  Click any stage card below to open its detailed role requirements, next step triggers, and notification alerts.
                </Typography>
              </Box>
              <Chip label="Interactive Click-to-Explore" color="primary" variant="outlined" sx={{ fontWeight: 800 }} />
            </Box>

            {/* Pipeline Step Flow Grid */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Top Pipeline: Steps 01 -> 02 -> 03 -> 04 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflowX: 'auto', pb: 1 }}>
                <StageCardNode stage={STAGES[0]} onClick={setSelectedStage} isActive={selectedStage?.id === STAGES[0].id} isDark={isDark} />
                <FlowStepConnector label="Share" isDark={isDark} direction="right" />
                <StageCardNode stage={STAGES[1]} onClick={setSelectedStage} isActive={selectedStage?.id === STAGES[1].id} isDark={isDark} />
                <FlowStepConnector label="Sign" isDark={isDark} direction="right" />
                <StageCardNode stage={STAGES[2]} onClick={setSelectedStage} isActive={selectedStage?.id === STAGES[2].id} isDark={isDark} />
                <FlowStepConnector label="Verify" isDark={isDark} direction="right" />
                <StageCardNode stage={STAGES[3]} onClick={setSelectedStage} isActive={selectedStage?.id === STAGES[3].id} isDark={isDark} />
              </Box>

              {/* Vertical Transition Indicator */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: { xs: 4, md: 10 }, my: -0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.08)', px: 2, py: 0.5, borderRadius: '20px' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#818CF8' : '#4F46E5', fontSize: '0.72rem' }}>
                    Passes Legal Verification → Activate
                  </Typography>
                  <ArrowDownwardIcon sx={{ color: isDark ? '#818CF8' : '#4F46E5', fontSize: '1.1rem' }} />
                </Box>
              </Box>

              {/* Bottom Pipeline: Steps 07 <- 06 <- 05 */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, overflowX: 'auto', pt: 1 }}>
                <StageCardNode stage={STAGES[6]} onClick={setSelectedStage} isActive={selectedStage?.id === STAGES[6].id} isDark={isDark} />
                <FlowStepConnector label="Renew" isDark={isDark} direction="left" />
                <StageCardNode stage={STAGES[5]} onClick={setSelectedStage} isActive={selectedStage?.id === STAGES[5].id} isDark={isDark} />
                <FlowStepConnector label="Expire Warn" isDark={isDark} direction="left" />
                <StageCardNode stage={STAGES[4]} onClick={setSelectedStage} isActive={selectedStage?.id === STAGES[4].id} isDark={isDark} />
              </Box>
            </Box>
          </Card>
        </Box>
      )}

      {/* Tab 1: Core System Architecture & Features */}
      {currentTab === 1 && (
        <Grid container spacing={3} className="animate-fade-slide-up">
          {SYSTEM_FEATURES.map((feat) => (
            <Grid xs={12} md={6} key={feat.id}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: '20px',
                  height: '100%',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                  bgcolor: isDark ? '#1E293B' : '#FFFFFF',
                  boxShadow: isDark ? 'none' : '0 4px 16px rgba(0,0,0,0.02)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {feat.icon}
                      <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', fontSize: '1.05rem' }}>
                        {feat.title}
                      </Typography>
                    </Box>
                    <Chip label={feat.badge} size="small" sx={{ bgcolor: `${feat.color}18`, color: feat.color, fontWeight: 800 }} />
                  </Box>

                  <Typography variant="body2" sx={{ color: isDark ? '#94A3B8' : '#64748B', mb: 2.5, lineHeight: 1.6 }}>
                    {feat.summary}
                  </Typography>

                  <Divider sx={{ mb: 2.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }} />

                  <List dense disablePadding>
                    {feat.details.map((item, idx) => {
                      const [title, desc] = item.split(': ');
                      return (
                        <ListItem key={idx} disablePadding sx={{ mb: 1.2, alignItems: 'flex-start' }}>
                          <ListItemIcon sx={{ minWidth: 24, mt: 0.3 }}>
                            <CheckIcon sx={{ color: feat.color, fontSize: '1.1rem' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontSize: '0.86rem', color: isDark ? '#CBD5E1' : '#334155', lineHeight: 1.5 }}>
                                <strong style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>{title}:</strong> {desc}
                              </Typography>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 2: Role Capabilities Matrix */}
      {currentTab === 2 && (
        <Card
          variant="outlined"
          sx={{
            borderRadius: '24px',
            overflow: 'hidden',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            bgcolor: isDark ? '#1E293B' : '#FFFFFF',
            boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.02)'
          }}
          className="animate-fade-slide-up"
        >
          <CardContent sx={{ p: 3.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', mb: 0.5 }}>
              Role-Based Access Control (RBAC) Governance Matrix
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? '#94A3B8' : '#64748B', mb: 3 }}>
              Comparison of feature permissions across Super Admin, Admin, and User roles.
            </Typography>

            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', bgcolor: isDark ? '#0F172A' : '#FFFFFF', overflowX: 'auto' }}>
              <Table sx={{ minWidth: 720 }}>
                <TableHead sx={{ bgcolor: isDark ? '#0F172A' : '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: '42%', color: isDark ? '#F8FAFC' : '#0F172A', py: 2, fontSize: '0.88rem', borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>
                      System Feature / Capability
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, width: '19%', color: '#6366F1', py: 2, fontSize: '0.88rem', borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>
                      👑 Super Admin
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, width: '19%', color: '#0EA5E9', py: 2, fontSize: '0.88rem', borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>
                      🛡️ Admin
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, width: '20%', color: isDark ? '#94A3B8' : '#64748B', py: 2, fontSize: '0.88rem', borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>
                      👤 User
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ROLE_MATRIX.map((row, i) => (
                    <TableRow
                      key={i}
                      sx={{
                        bgcolor: isDark ? (i % 2 === 0 ? '#1E293B' : '#0F172A') : (i % 2 === 0 ? '#FFFFFF' : '#F8FAFC'),
                        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(79, 70, 229, 0.04)' },
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: isDark ? '#F8FAFC' : '#0F172A', py: 1.8, fontSize: '0.86rem', borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                        {row.feature}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.8, borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                        <Chip
                          label={row.superAdmin}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            bgcolor: 'rgba(99, 102, 241, 0.15)',
                            color: isDark ? '#A5B4FC' : '#4338CA',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            px: 1
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.8, borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                        <Chip
                          label={row.admin}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            bgcolor: row.admin.includes('Full') ? 'rgba(14, 165, 233, 0.15)' : (row.admin.includes('No') || row.admin.includes('Hidden') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.15)'),
                            color: row.admin.includes('Full') ? '#0284C7' : (row.admin.includes('No') || row.admin.includes('Hidden') ? '#EF4444' : '#D97706'),
                            border: `1px solid ${row.admin.includes('Full') ? 'rgba(14, 165, 233, 0.3)' : (row.admin.includes('No') || row.admin.includes('Hidden') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)')}`,
                            px: 1
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1.8, borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }}>
                        <Chip
                          label={row.user}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.72rem',
                            bgcolor: row.user.includes('No') || row.user.includes('Hidden') ? (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9') : 'rgba(16, 185, 129, 0.15)',
                            color: row.user.includes('No') || row.user.includes('Hidden') ? (isDark ? '#94A3B8' : '#64748B') : '#059669',
                            border: `1px solid ${row.user.includes('No') || row.user.includes('Hidden') ? (isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1') : 'rgba(16, 185, 129, 0.3)'}`,
                            px: 1
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Quick Start User Manual */}
      {currentTab === 3 && (
        <Box className="animate-fade-slide-up">
          <Card
            variant="outlined"
            sx={{
              borderRadius: '24px',
              p: 3.5,
              mb: 3,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              bgcolor: isDark ? '#1E293B' : '#FFFFFF',
              boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.02)'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', mb: 2.5 }}>
              📖 User Manual &amp; Operational FAQs
            </Typography>

            <Accordion defaultExpanded sx={{ borderRadius: '12px !important', mb: 1.8, border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', bgcolor: isDark ? '#0F172A' : '#FFFFFF', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: isDark ? '#818CF8' : '#4F46E5' }} />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  1. How to create, manage, and sign an MOU Agreement?
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Typography variant="body2" sx={{ color: isDark ? '#CBD5E1' : '#475569', lineHeight: 1.7 }}>
                  Navigate to <strong>MOU Repositories</strong>, select your target module folder, and click <strong>+ New Document</strong>.
                  Upload your agreement PDF or Word file. You can assign signatories, view real-time version history, download files, or move items to the Recycle Bin when necessary.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ borderRadius: '12px !important', mb: 1.8, border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', bgcolor: isDark ? '#0F172A' : '#FFFFFF', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: isDark ? '#818CF8' : '#4F46E5' }} />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  2. How does the No-Code Dynamic Website Builder work?
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Typography variant="body2" sx={{ color: isDark ? '#CBD5E1' : '#475569', lineHeight: 1.7 }}>
                  Go to <strong>System Settings → Website Builder</strong>. Click <strong>Build New Module</strong> or select a Quick Start Preset.
                  You can specify custom field schemas, layout templates (Folder Repository, Document Repository, Table View, Card View), route paths, and custom access permissions.
                  Publishing a module automatically creates a dedicated subfolder on Google Drive under Application Root.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ borderRadius: '12px !important', mb: 1.8, border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', bgcolor: isDark ? '#0F172A' : '#FFFFFF', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: isDark ? '#818CF8' : '#4F46E5' }} />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  3. How does the Recycle Bin soft-delete &amp; restore workflow work?
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Typography variant="body2" sx={{ color: isDark ? '#CBD5E1' : '#475569', lineHeight: 1.7 }}>
                  When a module, folder, or file is soft-deleted, it immediately disappears from normal application pages and moves into the Google Drive Recycle Bin folder.
                  <br />• <strong>Super Admin</strong> can view, restore, or permanently delete modules, folders, and files.
                  <br />• <strong>Admin</strong> can view and manage folders and files in the Recycle Bin (deleted modules are hidden from non-Super Admin users).
                  <br />• Restoring an item returns it to its original Google Drive location without creating duplicate folders.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion sx={{ borderRadius: '12px !important', mb: 1.8, border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', bgcolor: isDark ? '#0F172A' : '#FFFFFF', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: isDark ? '#818CF8' : '#4F46E5' }} />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  4. How does Google Drive synchronization operate?
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Typography variant="body2" sx={{ color: isDark ? '#CBD5E1' : '#475569', lineHeight: 1.7 }}>
                  The application uses one master Google Drive folder ID configured under System Settings → Google Drive (`APPLICATION_ROOT`).
                  Every active module provisions its own subfolder directly under `APPLICATION_ROOT`. When files or folders are uploaded or modified, the backend automatically updates metadata and synchronizes folder hierarchies in real time.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Card>
        </Box>
      )}

      {/* Stage Drawer */}
      <StageDrawer stage={selectedStage} onClose={() => setSelectedStage(null)} isDark={isDark} />
    </Box>
  );
};

export default SystemMap;
