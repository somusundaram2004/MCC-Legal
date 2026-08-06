import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, Button, Drawer,
  IconButton, Divider, List, ListItem, ListItemIcon, ListItemText, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ShareIcon from '@mui/icons-material/Share';
import DrawIcon from '@mui/icons-material/Draw';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';

/* ─── Lifecycle Stage Data ──────────────────────────────── */
const STAGES = [
  {
    id: 'draft',
    label: 'Draft',
    icon: <EditNoteIcon />,
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.1)',
    border: 'rgba(148,163,184,0.3)',
    description: 'An MOU is created and saved as a draft. Content can be freely edited at this stage.',
    whoCanAct: ['Super Admin', 'Admin', 'Lawyer / MOU Administrator'],
    whatHappensNext: 'The MOU is shared with relevant departments or parties for review.',
    notificationsFire: ['Creator receives "Draft saved" confirmation'],
    tip: 'Draft MOUs are private until shared. Use this stage to prepare all clauses.',
  },
  {
    id: 'shared',
    label: 'Shared',
    icon: <ShareIcon />,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.25)',
    description: 'The MOU has been distributed to one or more parties for review. It is now visible to assigned users.',
    whoCanAct: ['Super Admin', 'Admin', 'Assigned Department Coordinators'],
    whatHappensNext: 'Parties review, discuss, and then sign the MOU.',
    notificationsFire: ['All assigned parties receive "New MOU shared with you"', 'Admin receives "MOU distributed" confirmation'],
    tip: 'Check the Shared tab in MOU Repositories to see all MOUs awaiting your review.',
  },
  {
    id: 'signed',
    label: 'Signed',
    icon: <DrawIcon />,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.25)',
    description: 'All required parties have agreed to and digitally signed the MOU.',
    whoCanAct: ['Super Admin', 'Admin', 'Authorized Signatories'],
    whatHappensNext: 'The signed MOU is submitted for compliance verification.',
    notificationsFire: ['Admin notified "MOU has been signed by all parties"', 'Assigned verifiers receive "Pending verification" alert'],
    tip: 'Signed MOUs cannot be edited. A new version must be created for amendments.',
  },
  {
    id: 'pending',
    label: 'Pending Verification',
    icon: <VerifiedIcon />,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.3)',
    description: 'The MOU is under compliance and legal review before being activated.',
    whoCanAct: ['Super Admin', 'Admin', 'Compliance Officers / Lawyers'],
    whatHappensNext: 'Verifier either approves → Active, or rejects → back to Draft.',
    notificationsFire: ['Assigned verifiers receive "Action required: verify MOU"', 'Creator notified of verification result'],
    tip: 'Turnaround time depends on legal team workload. Check the Activity Log for status updates.',
  },
  {
    id: 'active',
    label: 'Active',
    icon: <CheckCircleIcon />,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.3)',
    description: 'The MOU is fully approved, in force, and being tracked for expiry.',
    whoCanAct: ['View Only — all assigned parties can view; no edits allowed'],
    whatHappensNext: 'System monitors expiry date. At 30 days before expiry → Expiring Soon.',
    notificationsFire: ['Annual "MOU anniversary" reminder to owner', '"Expiring Soon" alert 30 days before expiry date'],
    tip: 'Active MOUs generate the compliance score on the Dashboard.',
  },
  {
    id: 'expiring',
    label: 'Expiring Soon',
    icon: <WarningAmberIcon />,
    color: '#F97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.3)',
    description: 'The MOU expires within the next 30 days. Renewal action is strongly recommended.',
    whoCanAct: ['Super Admin', 'Admin', 'MOU Owner'],
    whatHappensNext: 'Owner initiates renewal → new Draft created. If ignored → Expired.',
    notificationsFire: ['"Expiring in 30 days" email to MOU owner and Admin', '"Expiring in 7 days" urgent alert', '"Expiring TODAY" critical alert'],
    tip: 'Start the renewal process at least 30 days before expiry to avoid gaps in coverage.',
  },
  {
    id: 'expired',
    label: 'Expired / Renewed',
    icon: <AutorenewIcon />,
    color: '#F43F5E',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.3)',
    description: 'The MOU has either passed its end date (Expired) or been superseded by a new version (Renewed).',
    whoCanAct: ['Super Admin', 'Admin — can archive or initiate new MOU from this template'],
    whatHappensNext: 'Expired MOUs are archived. A renewal creates a new Draft linked to this record.',
    notificationsFire: ['"MOU expired" notification to owner and all parties', '"Renewal MOU created" notification if renewed'],
    tip: 'Expired MOUs remain in the archive for audit purposes. They cannot be deleted.',
  },
];

/* ─── Role colour map ───────────────────────────────────── */
const ROLE_COLORS = {
  'Super Admin': 'var(--indigo)',
  'Admin': 'var(--violet)',
  'Lawyer / MOU Administrator': '#0EA5E9',
  'Compliance Officers / Lawyers': '#0EA5E9',
  'MOU Owner': '#10B981',
  'Assigned Department Coordinators': '#F59E0B',
  'Authorized Signatories': '#8B5CF6',
  'Assigned verifiers': '#F97316',
  'View Only — all assigned parties can view; no edits allowed': '#94A3B8',
};
const roleColor = (r) => {
  for (const [k, v] of Object.entries(ROLE_COLORS)) if (r.startsWith(k)) return v;
  return '#64748B';
};

/* ─── Stage Node Component ──────────────────────────────── */
const StageNode = ({ stage, index, onClick, isActive }) => (
  <Box
    onClick={() => onClick(stage)}
    className="animate-slide-up"
    sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
      animationDelay: `${index * 80}ms`,
      minWidth: 90,
    }}
  >
    {/* Circle node */}
    <Box sx={{
      width: 64, height: 64, borderRadius: '50%',
      bgcolor: stage.bg,
      border: `2px solid ${isActive ? stage.color : stage.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
      boxShadow: isActive ? `0 0 0 4px ${stage.color}25, 0 8px 24px ${stage.color}20` : 'none',
      transform: isActive ? 'scale(1.12)' : 'scale(1)',
      '&:hover': {
        transform: 'scale(1.1)',
        boxShadow: `0 0 0 4px ${stage.color}25, 0 8px 24px ${stage.color}20`,
        borderColor: stage.color,
      },
    }}>
      {React.cloneElement(stage.icon, { sx: { color: stage.color, fontSize: '1.6rem' } })}
    </Box>

    {/* Label */}
    <Typography variant="caption" sx={{
      mt: 1, fontWeight: 700, textAlign: 'center', fontSize: '0.72rem',
      color: isActive ? stage.color : 'text.secondary',
      maxWidth: 80, lineHeight: 1.3,
      transition: 'color 0.2s ease',
    }}>
      {stage.label}
    </Typography>
  </Box>
);

/* ─── Connector Arrow ───────────────────────────────────── */
const Connector = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', mt: '-20px', flex: 1, minWidth: 20, maxWidth: 60 }}>
    <Box className="lifecycle-line" sx={{ flex: 1 }} />
    <ArrowForwardIcon sx={{ fontSize: '0.9rem', color: 'rgba(var(--indigo-rgb), 0.4)', flexShrink: 0 }} />
  </Box>
);

/* ─── Detail Drawer ─────────────────────────────────────── */
const StageDrawer = ({ stage, onClose }) => {
  if (!stage) return null;
  return (
    <Drawer
      anchor="right"
      open={Boolean(stage)}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 420 },
            bgcolor: 'background.paper',
            borderLeft: '1px solid', borderColor: 'divider',
          }
        }
      }}
    >
      <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Box sx={{
              width: 48, height: 48, borderRadius: '14px', bgcolor: stage.bg,
              border: `1.5px solid ${stage.border}`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', mb: 1.5
            }}>
              {React.cloneElement(stage.icon, { sx: { color: stage.color, fontSize: '1.5rem' } })}
            </Box>
            <Chip label={stage.label} size="small" sx={{ bgcolor: stage.bg, color: stage.color, fontWeight: 700, borderRadius: '8px' }} />
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
          {stage.description}
        </Typography>

        <Divider sx={{ mb: 2.5 }} />

        {/* Who can act */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <PersonIcon sx={{ fontSize: '1rem', color: 'primary.main' }} /> Who can act here
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 3 }}>
          {stage.whoCanAct.map((r) => (
            <Chip key={r} label={r} size="small" sx={{ bgcolor: `${roleColor(r)}12`, color: roleColor(r), fontWeight: 600, borderRadius: '8px', fontSize: '0.7rem' }} />
          ))}
        </Box>

        {/* What happens next */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.2, display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <ArrowForwardIcon sx={{ fontSize: '1rem', color: 'primary.main' }} /> What happens next
        </Typography>
        <Box sx={{ p: 1.8, borderRadius: '12px', bgcolor: 'action.hover', mb: 3 }}>
          <Typography variant="body2" sx={{ fontSize: '0.82rem', lineHeight: 1.6 }}>
            {stage.whatHappensNext}
          </Typography>
        </Box>

        {/* Notifications */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.2, display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <NotificationsIcon sx={{ fontSize: '1rem', color: 'primary.main' }} /> Notifications that fire
        </Typography>
        <List dense disablePadding sx={{ mb: 3 }}>
          {stage.notificationsFire.map((n, i) => (
            <ListItem key={i} disablePadding sx={{ mb: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 20 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: stage.color, mt: 0.2 }} />
              </ListItemIcon>
              <ListItemText
                primary={n}
                primaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary', lineHeight: 1.5 }}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ mb: 2 }} />

        {/* Tip */}
        <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(var(--indigo-rgb), 0.06)', border: '1px solid rgba(var(--indigo-rgb), 0.15)' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <InfoOutlinedIcon sx={{ color: 'primary.main', fontSize: '1rem', mt: 0.15, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6, fontSize: '0.78rem' }}>
              <strong style={{ color: 'var(--indigo)' }}>Tip: </strong>{stage.tip}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

/* ─── Main Page ─────────────────────────────────────────── */
const SystemMap = () => {
  const [selected, setSelected] = useState(null);

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-slide-up">

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <HelpCenterIcon sx={{ color: '#fff', fontSize: '1.3rem' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            How This System Works
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640, lineHeight: 1.7 }}>
          The interactive MOU lifecycle diagram below shows every stage an agreement passes through — from initial draft to expiry or renewal.
          <strong> Click any stage</strong> to see who can act on it, what triggers the next step, and which notifications fire.
        </Typography>
      </Box>

      {/* Lifecycle Diagram */}
      <Card sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: '20px', overflow: 'visible' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 3, fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          MOU Lifecycle Stages — Click to Explore
        </Typography>

        {/* Row 1: Draft → Shared → Signed → Pending */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, mb: 4, overflowX: 'auto', pb: 1 }}>
          {STAGES.slice(0, 4).map((stage, i) => (
            <React.Fragment key={stage.id}>
              <StageNode stage={stage} index={i} onClick={setSelected} isActive={selected?.id === stage.id} />
              {i < 3 && <Connector />}
            </React.Fragment>
          ))}
          {/* Arrow going down */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mx: 2, mt: '-20px' }}>
            <Box sx={{ width: 2, height: 32, background: 'linear-gradient(180deg, rgba(var(--indigo-rgb), 0.4), rgba(var(--violet-rgb), 0.4))' }} />
            <Box sx={{ transform: 'rotate(90deg)' }}>
              <ArrowForwardIcon sx={{ fontSize: '0.9rem', color: 'rgba(var(--indigo-rgb), 0.4)' }} />
            </Box>
          </Box>
        </Box>

        {/* Row 2 (reversed): Expired ← Expiring ← Active */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'flex-end', overflowX: 'auto', pb: 1, flexDirection: 'row-reverse' }}>
          {STAGES.slice(4).map((stage, i) => (
            <React.Fragment key={stage.id}>
              <StageNode stage={stage} index={4 + i} onClick={setSelected} isActive={selected?.id === stage.id} />
              {i < STAGES.slice(4).length - 1 && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: '-20px', flex: 1, minWidth: 20, maxWidth: 60, transform: 'scaleX(-1)' }}>
                  <Box className="lifecycle-line" sx={{ flex: 1 }} />
                  <ArrowForwardIcon sx={{ fontSize: '0.9rem', color: 'rgba(var(--indigo-rgb), 0.4)', flexShrink: 0 }} />
                </Box>
              )}
            </React.Fragment>
          ))}
        </Box>
      </Card>

      {/* Role Legend */}
      <Card sx={{ p: 3, borderRadius: '20px', mb: 4 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Role Colour Legend</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2 }}>
          {Object.entries(ROLE_COLORS).slice(0, 6).map(([role, color]) => {
            const isVar = color.startsWith('var(');
            const varRgb = color.includes('indigo') ? 'var(--indigo-rgb)' : 'var(--violet-rgb)';
            return (
              <Chip
                key={role}
                label={role}
                size="small"
                sx={{
                  bgcolor: isVar ? `rgba(${varRgb}, 0.08)` : `${color}12`,
                  color,
                  fontWeight: 600,
                  borderRadius: '8px',
                  fontSize: '0.72rem'
                }}
              />
            );
          })}
        </Box>
      </Card>

      {/* Quick-start Guide */}
      <Card sx={{ p: 3, borderRadius: '20px', background: 'linear-gradient(135deg, rgba(var(--indigo-rgb), 0.05) 0%, rgba(var(--violet-rgb), 0.05) 100%)', border: '1px solid rgba(var(--indigo-rgb), 0.15)' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          🚀 Quick-start for New Users
        </Typography>
        <Box component="ol" sx={{ m: 0, pl: 2.5, '& li': { mb: 1.2, fontSize: '0.85rem', color: 'text.secondary', lineHeight: 1.7 } }}>
          <li>Log in → check <strong>Dashboard</strong> for urgent alerts and compliance score.</li>
          <li>Go to <strong>MOU Repositories</strong> to browse all MOU folders you have access to.</li>
          <li>Click any file to preview it. Use the ⋮ menu to download, rename, or manage.</li>
          <li>To create a new MOU, navigate into a folder and click <strong>+ New Document</strong>.</li>
          <li>If an MOU is <strong>Expiring Soon</strong>, find it in the Dashboard alerts and start renewal.</li>
          <li>For access issues, contact your <strong>Admin</strong> — they can adjust your folder permissions.</li>
        </Box>
      </Card>

      {/* Detail Drawer */}
      <StageDrawer stage={selected} onClose={() => setSelected(null)} />
    </Box>
  );
};

export default SystemMap;
