import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Avatar,
  Chip, Button, CircularProgress, Alert
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';
import { getRoleConfig, getNormalizedRole, ROLES } from '../config/roles';

// Legal Subcomponents
import HeroSlider from '../components/HeroSlider';
import AlertBanner from '../components/AlertBanner';
import StatTile from '../components/StatTile';
import ServicesGrid from '../components/ServicesGrid';
import ReferencesSection from '../components/ReferenceCard';

/**
 * System Audit Trail & Recent Activity Component (Role-Scoped)
 */
function AuditTrailTable({ activities = [], role }) {
  const navigate = useNavigate();

  const getSubtitle = () => {
    switch (role) {
      case ROLES.SUPER_ADMIN:
        return 'System-wide audit trail across all institutional users, modules, and operations';
      case ROLES.ADMIN:
        return 'Department-scoped audit trail of recent member actions and submissions';
      case ROLES.USER:
      default:
        return 'Your personal activity history and recent document interactions';
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '20px',
        border: '1px solid var(--legal-border-tint, #dccb9a)',
        backgroundColor: 'var(--legal-cream-card, #ffffff)',
        boxShadow: 'var(--legal-shadow-sm)',
        p: { xs: 2.5, sm: 3.5 },
        mb: 5,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
              color: 'var(--legal-navy, #0b1a3a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid var(--legal-gold-border, #b8892b)',
            }}
          >
            <HistoryIcon fontSize="small" />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
                fontWeight: 800,
                color: 'var(--legal-navy, #0b1a3a)',
                fontSize: { xs: '1.15rem', sm: '1.3rem' },
                lineHeight: 1.2,
              }}
            >
              System Audit Trail &amp; Recent Activity
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--legal-text-muted, #64748b)', fontSize: '0.8rem' }}>
              {getSubtitle()}
            </Typography>
          </Box>
        </Box>

        {role !== ROLES.USER && (
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/logs')}
            sx={{
              fontWeight: 700,
              fontSize: '0.82rem',
              color: 'var(--legal-gold-border, #b8892b)',
              textTransform: 'none',
              '&:hover': { color: 'var(--legal-navy, #0b1a3a)' },
            }}
          >
            View Full Logs
          </Button>
        )}
      </Box>

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: '1px solid var(--legal-border-tint, #dccb9a)',
          borderRadius: '14px',
          overflowX: 'auto',
          backgroundColor: 'transparent',
        }}
      >
        <Table sx={{ minWidth: 600 }}>
          <TableHead sx={{ backgroundColor: 'var(--legal-cream-tint, #f6f0e0)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--legal-navy, #0b1a3a)', py: 1.5 }}>
                USER / INITIATOR
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--legal-navy, #0b1a3a)', py: 1.5 }}>
                ACTION PERFORMED
              </TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--legal-navy, #0b1a3a)', py: 1.5 }}>
                MODULE
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--legal-navy, #0b1a3a)', py: 1.5, pr: 3 }}>
                TIMESTAMP
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ textAlign: 'center', py: 4, color: 'text.secondary', fontStyle: 'italic' }}>
                  No recent activities recorded for this scope.
                </TableCell>
              </TableRow>
            ) : (
              activities.slice(0, 7).map((act, idx) => {
                const userName = act.user?.name || act.user_name || act.user?.email || 'System Operation';
                const actionText = act.action || act.description || 'System Event';
                const moduleName = act.module || 'System';
                const dateStr = act.created_at ? new Date(act.created_at).toLocaleString() : 'Recent';

                return (
                  <TableRow
                    key={act.id || idx}
                    hover
                    sx={{
                      '&:last-child td': { border: 0 },
                      '&:hover': { backgroundColor: 'var(--legal-cream-tint, #f6f0e0)' },
                    }}
                  >
                    <TableCell sx={{ py: 1.4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            backgroundColor: 'var(--legal-navy, #0b1a3a)',
                            color: 'var(--legal-gold, #d4a82f)',
                            border: '1px solid var(--legal-gold, #d4a82f)',
                          }}
                        >
                          {userName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--legal-text-primary, #0f172a)' }}>
                            {userName}
                          </Typography>
                          {act.user?.department && (
                            <Typography variant="caption" sx={{ color: 'var(--legal-text-muted, #64748b)', fontSize: '0.72rem' }}>
                              {act.user.department}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={{ py: 1.4 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--legal-text-secondary, #475569)' }}>
                        {actionText}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ py: 1.4 }}>
                      <Chip
                        label={moduleName}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
                          color: 'var(--legal-navy, #0b1a3a)',
                          border: '1px solid var(--legal-border-tint, #dccb9a)',
                        }}
                      />
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.4, pr: 3, color: 'var(--legal-text-muted, #64748b)', fontSize: '0.78rem' }}>
                      {dateStr}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

/**
 * Main Legal Dashboard Component
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const role = getNormalizedRole(user);
  const roleConfig = getRoleConfig(user);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/api/dashboard/stats/');
      setStats(res.data);
      setErrorMsg('');
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      setErrorMsg('Unable to synchronize real-time dashboard data. Showing cached parameters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Global Auto-Refresh
  useAutoRefresh(REFRESH_CATEGORIES.ALL, fetchStats);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress sx={{ color: 'var(--legal-gold, #d4a82f)' }} />
        <Typography variant="body2" sx={{ color: 'var(--legal-text-muted, #64748b)', fontWeight: 600 }}>
          Loading legal dashboard &amp; statistics...
        </Typography>
      </Box>
    );
  }

  const expiringCount = stats?.expiring_30_days ?? (role === ROLES.USER ? (stats?.my_expiring_mous ?? 0) : 0);
  const expiringList = stats?.expiring_mous_list || [];
  const activities = stats?.recent_activities || [];
  const statTiles = roleConfig.statistics || [];

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto', px: { xs: 1.5, sm: 2.5, md: 3 } }} className="legal-fade-up">
      {errorMsg && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: '12px' }}>
          {errorMsg}
        </Alert>
      )}

      {/* 1. Hero Banner */}
      <HeroSlider
        storageConnected={Boolean(stats?.storage?.drive_connected)}
        storageUsageStr={stats?.storage?.storage_type === 'google_drive' ? 'Google Drive Cloud Storage' : 'Institutional Local Storage'}
      />

      {/* 2. MOU Expiry Alert Banner */}
      <AlertBanner expiringCount={expiringCount} expiringList={expiringList} />

      {/* 3. Statistics Section (8 tiles for Super Admin / Admin, 5 tiles for User) */}
      <Box id="statistics" component="section" aria-label="Key Performance Indicators" sx={{ mb: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
                fontWeight: 800,
                color: 'var(--legal-navy, #0b1a3a)',
                fontSize: { xs: '1.25rem', sm: '1.45rem' },
                lineHeight: 1.15,
              }}
            >
              Institutional Statistics &amp; Metrics
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--legal-text-muted, #64748b)', fontSize: '0.8rem' }}>
              Real-time records from certified database tables
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: { xs: 1.5, sm: 2.5 },
          }}
        >
          {statTiles.map((tile) => (
            <StatTile key={tile.key} tileConfig={tile} stats={stats} />
          ))}
        </Box>
      </Box>

      {/* 4. Services Grid Section (Replaces Left Sidebar) */}
      <ServicesGrid services={roleConfig.services} />

      {/* 5. System Audit Trail & Recent Activity (Role-Scoped Table) */}
      <AuditTrailTable activities={activities} role={role} />

      {/* 6. References Section (4 Downloadable PDF Cards) */}
      <ReferencesSection />
    </Box>
  );
}
