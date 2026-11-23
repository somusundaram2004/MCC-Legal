import React from 'react';
import { Box, Card, Typography, Avatar } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SettingsIcon from '@mui/icons-material/Settings';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import MapIcon from '@mui/icons-material/Map';
import BusinessIcon from '@mui/icons-material/Business';
import FolderIcon from '@mui/icons-material/Folder';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import DescriptionIcon from '@mui/icons-material/Description';
import ShareIcon from '@mui/icons-material/Share';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';

const resolveServiceIcon = (iconName) => {
  switch (iconName) {
    case 'ManageAccounts': return <ManageAccountsIcon />;
    case 'Settings': return <SettingsIcon />;
    case 'ImportExport': return <ImportExportIcon />;
    case 'History': return <HistoryIcon />;
    case 'Delete': return <DeleteIcon />;
    case 'Map': return <MapIcon />;
    case 'Business': return <BusinessIcon />;
    case 'Folder': return <FolderIcon />;
    case 'AssignmentTurnedIn': return <AssignmentTurnedInIcon />;
    case 'Description': return <DescriptionIcon />;
    case 'Share': return <ShareIcon />;
    case 'Notifications': return <NotificationsIcon />;
    case 'Person': return <PersonIcon />;
    default: return <FolderIcon />;
  }
};

export default function ServiceCard({ service, isHighlighted = false }) {
  const navigate = useNavigate();
  const { title, desc, path, icon } = service;

  return (
    <Card
      component="button"
      onClick={() => navigate(path)}
      aria-label={`Open service: ${title}`}
      className="legal-card-hover"
      sx={{
        p: 2.6,
        borderRadius: '18px',
        backgroundColor: isHighlighted ? 'var(--legal-cream-tint, #f6f0e0)' : 'var(--legal-cream-card, #ffffff)',
        border: '1.5px solid',
        borderColor: isHighlighted ? 'var(--legal-gold-border, #b8892b)' : 'var(--legal-border-tint, #dccb9a)',
        boxShadow: isHighlighted ? '0 6px 18px rgba(212, 168, 47, 0.12)' : 'var(--legal-shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        textAlign: 'left',
        cursor: 'pointer',
        width: '100%',
        minHeight: 160,
        textDecoration: 'none',
        position: 'relative',
        outline: 'none',
        '&:focus-visible': {
          outline: '2.5px solid var(--legal-gold, #d4a82f)',
        },
      }}
    >
      <Box>
        {/* Top row: Icon & Arrow */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              backgroundColor: isHighlighted ? 'var(--legal-navy, #0b1a3a)' : 'var(--legal-cream-tint, #f6f0e0)',
              color: isHighlighted ? 'var(--legal-gold, #d4a82f)' : 'var(--legal-navy, #0b1a3a)',
              border: '1.5px solid var(--legal-gold-border, #b8892b)',
            }}
          >
            {resolveServiceIcon(icon)}
          </Avatar>

          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(212, 168, 47, 0.12)',
              color: 'var(--legal-gold-border, #b8892b)',
            }}
          >
            <ArrowForwardIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: 'var(--legal-font-sans, "Inter", sans-serif)',
            fontWeight: 800,
            fontSize: '0.96rem',
            lineHeight: 1.25,
            color: 'var(--legal-navy, #0b1a3a)',
            mb: 0.6,
          }}
        >
          {title}
        </Typography>

        {/* One-line Description */}
        <Typography
          variant="body2"
          sx={{
            color: 'var(--legal-text-secondary, #475569)',
            fontSize: '0.82rem',
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {desc}
        </Typography>
      </Box>

      {/* Subtle indicator bar */}
      <Box
        sx={{
          height: 3,
          width: 36,
          borderRadius: 2,
          backgroundColor: isHighlighted ? 'var(--legal-gold, #d4a82f)' : 'var(--legal-border-tint, #dccb9a)',
          mt: 2,
        }}
      />
    </Card>
  );
}
