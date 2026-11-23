import React, { useEffect, useState } from 'react';
import { Box, Card, Typography, Avatar } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import WarningIcon from '@mui/icons-material/Warning';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

// Helper: Format Bytes
export const fmtBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Animated CountUp Component
function CountUpNumber({ end, duration = 800 }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let start = 0;
    const finalVal = typeof end === 'number' ? end : parseInt(end, 10) || 0;
    if (finalVal === 0) {
      setVal(0);
      return;
    }
    const step = Math.max(1, Math.ceil(finalVal / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= finalVal) {
        setVal(finalVal);
        clearInterval(timer);
      } else {
        setVal(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return <span>{val}</span>;
}

// Icon resolver for stat tiles
const resolveStatIcon = (iconName) => {
  switch (iconName) {
    case 'Storage': return <StorageIcon sx={{ fontSize: 22 }} />;
    case 'People': return <PeopleIcon sx={{ fontSize: 22 }} />;
    case 'Folder': return <FolderIcon sx={{ fontSize: 22 }} />;
    case 'CheckCircle': return <CheckCircleIcon sx={{ fontSize: 22 }} />;
    case 'HourglassTop': return <HourglassTopIcon sx={{ fontSize: 22 }} />;
    case 'Warning': return <WarningIcon sx={{ fontSize: 22 }} />;
    case 'Share': return <ShareIcon sx={{ fontSize: 22 }} />;
    case 'Delete': return <DeleteIcon sx={{ fontSize: 22 }} />;
    case 'Notifications': return <NotificationsIcon sx={{ fontSize: 22 }} />;
    case 'InsertDriveFile': return <InsertDriveFileIcon sx={{ fontSize: 22 }} />;
    default: return <FolderIcon sx={{ fontSize: 22 }} />;
  }
};

export default function StatTile({ tileConfig, stats = {} }) {
  const { key, label, subLabel, isStorage, icon } = tileConfig;

  // Extract real value
  let displayValue;
  if (isStorage) {
    const storageUsed = stats?.storage?.disk_used_bytes || 0;
    displayValue = fmtBytes(storageUsed);
  } else {
    displayValue = stats?.[key] ?? 0;
  }

  return (
    <Card
      elevation={0}
      className="legal-card-hover"
      sx={{
        p: { xs: 1.8, sm: 2.4 },
        borderRadius: '16px',
        backgroundColor: 'var(--legal-cream-card, #ffffff)',
        border: '1px solid var(--legal-border-tint, #dccb9a)',
        borderTop: '3.5px solid var(--legal-gold, #d4a82f)',
        boxShadow: 'var(--legal-shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        minHeight: { xs: 110, sm: 124 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.2 }}>
        {/* Left: Icon Block */}
        <Avatar
          sx={{
            width: { xs: 36, sm: 44 },
            height: { xs: 36, sm: 44 },
            borderRadius: '12px',
            backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
            color: 'var(--legal-navy, #0b1a3a)',
            border: '1px solid var(--legal-gold-border, #b8892b)',
          }}
        >
          {resolveStatIcon(icon)}
        </Avatar>

        {/* Right: Number */}
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
              fontWeight: 800,
              fontSize: { xs: '1.35rem', sm: '1.85rem' },
              lineHeight: 1,
              color: 'var(--legal-navy, #0b1a3a)',
            }}
          >
            {isStorage ? displayValue : <CountUpNumber end={displayValue} />}
          </Typography>
        </Box>
      </Box>

      {/* Label and Sub-label */}
      <Box>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '0.8rem', sm: '0.86rem' },
            color: 'var(--legal-text-primary, #0f172a)',
            lineHeight: 1.2,
            mb: 0.3,
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'var(--legal-text-muted, #64748b)',
            fontSize: { xs: '0.68rem', sm: '0.74rem' },
            fontWeight: 500,
            lineHeight: 1.2,
            display: 'block',
          }}
        >
          {subLabel}
        </Typography>
      </Box>
    </Card>
  );
}
