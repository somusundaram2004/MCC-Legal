import React from 'react';
import { Box, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';

/**
 * StatusPill — WCAG AA compliant status badge.
 * Always pairs color + icon + text for color-blind accessibility.
 *
 * @param {string} status - Status key or display string
 * @param {string} size   - "small" (default) | "medium"
 */
const STATUS_MAP = {
  active:        { label: 'Active',         icon: <CheckCircleIcon />,  cls: 'status-active',   color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
  ongoing:       { label: 'Ongoing',        icon: <CheckCircleIcon />,  cls: 'status-active',   color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  others:        { label: 'Others',         icon: <WarningAmberIcon />, cls: 'status-expiring', color: '#CA8A04', bg: 'rgba(234,179,8,0.14)'  },
  expiringsoon:  { label: 'Expiring Soon',  icon: <WarningAmberIcon />, cls: 'status-expiring', color: '#CA8A04', bg: 'rgba(202,138,4,0.12)' },
  urgent:        { label: 'Urgent',         icon: <WarningAmberIcon />, cls: 'status-expiring', color: '#EA580C', bg: 'rgba(234,88,12,0.12)' },
  expiringtoday: { label: 'Expiring Today', icon: <WarningAmberIcon />, cls: 'status-expiring', color: '#EA580C', bg: 'rgba(234,88,12,0.15)' },
  expiring:      { label: 'Expiring Soon',  icon: <WarningAmberIcon />, cls: 'status-expiring', color: '#EA580C', bg: 'rgba(249,115,22,0.10)' },
  expired:       { label: 'Expired',        icon: <CancelIcon />,       cls: 'status-expired',  color: '#BE123C', bg: 'rgba(244,63,94,0.10)'  },
  notyetactive:  { label: 'Not Yet Active', icon: <HourglassTopIcon />, cls: 'status-pending',  color: '#2563EB', bg: 'rgba(37,99,235,0.10)' },
  noexpirydate:  { label: 'No Expiry Date', icon: <EditNoteIcon />,     cls: 'status-draft',    color: '#64748B', bg: 'rgba(100,116,139,0.12)' },
  pending:       { label: 'Pending',        icon: <HourglassTopIcon />, cls: 'status-pending',  color: '#D97706', bg: 'rgba(245,158,11,0.10)' },
  draft:         { label: 'Draft',          icon: <EditNoteIcon />,     cls: 'status-draft',    color: '#64748B', bg: 'rgba(148,163,184,0.12)' },
  renewed:       { label: 'Renewed',        icon: <AutorenewIcon />,    cls: 'status-renewed',  color: 'var(--indigo)', bg: 'rgba(var(--indigo-rgb), 0.10)' },
  suspended:     { label: 'Suspended',      icon: <PauseCircleIcon />,  cls: 'status-draft',    color: '#64748B', bg: 'rgba(148,163,184,0.12)' },
};

const StatusPill = ({ status, size = 'small', sx = {} }) => {
  const key = (status || 'draft').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cfg = STATUS_MAP[key] || {
    label: status || 'Unknown',
    icon: <EditNoteIcon />,
    cls: 'status-draft',
    color: '#64748B',
    bg: 'rgba(100,116,139,0.12)'
  };

  return (
    <Chip
      size={size}
      icon={React.cloneElement(cfg.icon, {
        sx: { fontSize: size === 'small' ? '0.85rem !important' : '1rem !important', color: `${cfg.color} !important` }
      })}
      label={cfg.label}
      sx={{
        fontWeight: 700,
        fontSize: size === 'small' ? '0.71rem' : '0.8rem',
        height: size === 'small' ? 24 : 28,
        borderRadius: '8px',
        bgcolor: cfg.bg,
        color: cfg.color,
        border: 'none',
        letterSpacing: '0.01em',
        '& .MuiChip-icon': { ml: '6px' },
        ...sx,
      }}
    />
  );
};

export default StatusPill;
export { STATUS_MAP };
