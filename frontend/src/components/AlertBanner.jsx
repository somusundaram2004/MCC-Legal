import React from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNormalizedRole, ROLES } from '../config/roles';

export default function AlertBanner({ expiringCount = 0, expiringList = [] }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = getNormalizedRole(user);

  const hasExpiring = expiringCount > 0;
  const targetConfigRoute = role === ROLES.SUPER_ADMIN ? '/settings' : '/notifications';

  return (
    <Box
      component="aside"
      aria-label="MOU Expiry Alerts"
      sx={{
        mb: 4,
        p: { xs: 2.2, sm: 3 },
        borderRadius: '16px',
        backgroundColor: hasExpiring ? 'var(--legal-cream-tint, #f6f0e0)' : 'var(--legal-cream-card, #ffffff)',
        border: '1.5px solid',
        borderColor: hasExpiring ? 'var(--legal-gold, #d4a82f)' : 'var(--legal-border-tint, #dccb9a)',
        borderLeft: `6px solid ${hasExpiring ? 'var(--legal-gold, #d4a82f)' : '#10B981'}`,
        boxShadow: 'var(--legal-shadow-sm)',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 2,
      }}
    >
      {/* Left: Icon & Alert Info */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            backgroundColor: hasExpiring ? 'rgba(212, 168, 47, 0.18)' : 'rgba(16, 185, 129, 0.12)',
            color: hasExpiring ? 'var(--legal-gold-border, #b8892b)' : '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.3,
          }}
        >
          {hasExpiring ? <WarningAmberIcon sx={{ fontSize: 26 }} /> : <CheckCircleIcon sx={{ fontSize: 26 }} />}
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
                fontWeight: 800,
                color: 'var(--legal-navy, #0b1a3a)',
                fontSize: '1.05rem',
              }}
            >
              MOU Expiry Alerts
            </Typography>
            <Chip
              label={hasExpiring ? `${expiringCount} Pending Renewal` : 'Compliance Normal'}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: '0.72rem',
                backgroundColor: hasExpiring ? 'rgba(212, 168, 47, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                color: hasExpiring ? 'var(--legal-navy, #0b1a3a)' : '#059669',
                border: `1px solid ${hasExpiring ? 'var(--legal-gold-border, #b8892b)' : '#10B981'}`,
              }}
            />
          </Box>

          <Typography variant="body2" sx={{ color: 'var(--legal-text-secondary, #475569)', fontSize: '0.86rem', maxWidth: 720 }}>
            {hasExpiring
              ? `There are ${expiringCount} active institutional agreements due to expire within the next 30 days. Please review departmental submissions and initiate renewal negotiations.`
              : 'All registered institutional agreements are fully active and compliant. No agreements are due for expiry within the next 30 days.'}
          </Typography>

          {/* If there are specific expiring MOUs, show a quick pill list */}
          {expiringList && expiringList.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
              {expiringList.slice(0, 3).map((item) => (
                <Chip
                  key={item.id}
                  label={`${item.title} (${item.department || 'MOU'}) — ${item.days_left}d left`}
                  size="small"
                  onClick={() => navigate(`/mou/${item.id}`)}
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: 'var(--legal-cream-card, #ffffff)',
                    border: '1px solid var(--legal-border-tint, #dccb9a)',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'var(--legal-gold, #d4a82f)' },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Right: Actions */}
      <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}>
        {hasExpiring && (
          <Button
            variant="contained"
            onClick={() => navigate('/explorer?filter=expiring')}
            sx={{
              backgroundColor: 'var(--legal-gold, #d4a82f)',
              color: 'var(--legal-navy, #0b1a3a)',
              fontWeight: 800,
              fontSize: '0.85rem',
              borderRadius: '10px',
              textTransform: 'none',
              px: 2.2,
              '&:hover': { backgroundColor: '#e6c76a' },
            }}
          >
            Review Expiring
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={() => navigate(targetConfigRoute)}
          startIcon={<SettingsSuggestIcon />}
          sx={{
            borderColor: 'var(--legal-gold-border, #b8892b)',
            color: 'var(--legal-navy, #0b1a3a)',
            fontWeight: 700,
            fontSize: '0.85rem',
            borderRadius: '10px',
            textTransform: 'none',
            px: 2.2,
            minHeight: 44,
            '&:hover': {
              backgroundColor: 'rgba(212, 168, 47, 0.1)',
              borderColor: 'var(--legal-navy, #0b1a3a)',
            },
          }}
        >
          Configure Alerts
        </Button>
      </Box>
    </Box>
  );
}
