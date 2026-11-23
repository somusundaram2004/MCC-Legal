import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Divider, Grid, Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import HistoryIcon from '@mui/icons-material/History';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import DevicesIcon from '@mui/icons-material/Devices';

import { getShareTracking } from '../services/mouApi';

const DownloadTrackingModal = ({ open, onClose, shareId }) => {
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && shareId) {
      setLoading(true);
      setError(null);
      getShareTracking(shareId)
        .then((data) => {
          setTrackingData(data);
        })
        .catch((err) => {
          console.error('Failed to load tracking data:', err);
          setError(err.response?.data?.detail || 'Failed to retrieve download tracking analytics.');
        })
        .finally(() => setLoading(false));
    }
  }, [open, shareId]);

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '24px',
            p: 1,
            overflow: 'hidden'
          }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #0b1a3a 0%, #14305f 100%)',
              border: '1px solid #d4a82f',
              color: '#d4a82f'
            }}
          >
            <CloudDownloadIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Recipient Download Tracking &amp; Audit Logs
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Real-time delivery verification, version verification, and download metrics
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={36} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert>
        ) : trackingData ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Top Metrics Cards */}
            <Grid container spacing={2}>
              <Grid xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Download Status
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={trackingData.download_status}
                      size="small"
                      color={trackingData.download_status === 'Downloaded' ? 'success' : 'default'}
                      sx={{ fontWeight: 800 }}
                    />
                  </Box>
                </Paper>
              </Grid>

              <Grid xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Downloads
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#d4a82f' }}>
                    {trackingData.download_count}
                  </Typography>
                </Paper>
              </Grid>

              <Grid xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    First Download
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.8 }}>
                    {formatDate(trackingData.first_download_date)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                    Last Download
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.8 }}>
                    {formatDate(trackingData.last_download_date)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Sharing Metadata Specifications */}
            <Paper sx={{ p: 2.2, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'text.primary' }}>
                Document Sharing Specifications
              </Typography>
              <Grid container spacing={1.5} sx={{ fontSize: '0.85rem' }}>
                <Grid xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography color="text.secondary" sx={{ minWidth: 120 }}>Document:</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{trackingData.document_name}</Typography>
                  </Box>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography color="text.secondary" sx={{ minWidth: 120 }}>MOU Reference:</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{trackingData.mou_number}</Typography>
                  </Box>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography color="text.secondary" sx={{ minWidth: 120 }}>Recipient Email:</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#0b1a3a' }}>
                      {trackingData.recipient_email || '—'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography color="text.secondary" sx={{ minWidth: 120 }}>Recipient Account:</Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {trackingData.recipient_name ? `${trackingData.recipient_name} (Registered)` : 'Pending Account Registration'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography color="text.secondary" sx={{ minWidth: 120 }}>Shared By:</Typography>
                    <Typography sx={{ fontWeight: 700 }}>
                      {trackingData.shared_by} ({trackingData.shared_by_email})
                    </Typography>
                  </Box>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography color="text.secondary" sx={{ minWidth: 120 }}>Shared Date:</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{formatDate(trackingData.shared_date)}</Typography>
                  </Box>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography color="text.secondary" sx={{ minWidth: 120 }}>Document Version:</Typography>
                    <Chip label={`v${trackingData.document_version}`} size="small" sx={{ fontWeight: 700, height: 22 }} />
                  </Box>
                </Grid>
                <Grid xs={12} sm={6}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography color="text.secondary" sx={{ minWidth: 120 }}>Access Status:</Typography>
                    <Chip
                      label={trackingData.access_status}
                      size="small"
                      color={trackingData.access_status === 'Active' ? 'success' : trackingData.access_status === 'Revoked' ? 'error' : 'warning'}
                      sx={{ fontWeight: 700, height: 22 }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Detailed Download Event Logs Table */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DevicesIcon fontSize="small" sx={{ color: '#d4a82f' }} /> Download Activity Audit Logs ({trackingData.download_logs?.length || 0})
              </Typography>
              {(!trackingData.download_logs || trackingData.download_logs.length === 0) ? (
                <Alert severity="info" sx={{ borderRadius: '12px' }}>
                  The recipient has not downloaded this document yet. You will see download dates, IP addresses, and device details here as soon as they click DOWNLOAD MOU.
                </Alert>
              ) : (
                <TableContainer component={Paper} sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Timestamp</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Recipient Email</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Version</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>IP Address</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Browser / Agent</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {trackingData.download_logs.map((log) => (
                        <TableRow key={log.id} hover>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {formatDate(log.downloaded_at)}
                          </TableCell>
                          <TableCell sx={{ color: '#0b1a3a', fontWeight: 600 }}>
                            {log.recipient_email || 'Verified Link'}
                          </TableCell>
                          <TableCell>
                            <Chip label={`v${log.document_version}`} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {log.ip_address || '127.0.0.1'}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'text.secondary' }}>
                            {log.user_agent || 'Browser Client'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {/* Sharing History & Event Timeline */}
            {trackingData.sharing_history && trackingData.sharing_history.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon fontSize="small" sx={{ color: '#F59E0B' }} /> Sharing Audit History
                </Typography>
                <TableContainer component={Paper} sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Performed By</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Date &amp; Time</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Permission</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Template</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {trackingData.sharing_history.map((hist, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontWeight: 700 }}>{hist.action}</TableCell>
                          <TableCell>{hist.shared_by || hist.resent_by || hist.revoked_by || 'Admin'}</TableCell>
                          <TableCell>{formatDate(hist.shared_at || hist.resent_at || hist.revoked_at)}</TableCell>
                          <TableCell>
                            {hist.permission && (
                              <Chip label={hist.permission} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                            {hist.template || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} sx={{ fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DownloadTrackingModal;

