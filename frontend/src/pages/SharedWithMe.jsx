import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Avatar, CircularProgress,
  Alert, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, Tab, TextField, InputAdornment,
  IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel,
  Checkbox
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SendIcon from '@mui/icons-material/Send';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import api from '../services/api';
import {
  getSharedFiles,
  revokeShareAccess,
  resendShareEmail,
  downloadSharedFileBlob
} from '../services/mouApi';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';
import { getDynamicFolderColor, getDynamicFolderLabel } from '../utils/folderStatus';
import { showCustomToast } from '../utils/customToast';

import MOUShareModal from '../components/MOUShareModal';
import DownloadTrackingModal from '../components/DownloadTrackingModal';
import SharedDocumentPreviewModal from '../components/SharedDocumentPreviewModal';

const SharedWithMe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isSuperAdmin = user?.role?.name === 'Super Admin' || user?.is_superuser;
  const isAdmin = isSuperAdmin || user?.role?.name === 'Admin' || user?.role?.name === 'Lawyer / MOU Administrator';

  // Active Tab: 0 = 'with_me', 1 = 'by_me', 2 = 'folders'
  const [activeTab, setActiveTab] = useState(0);

  // Data states
  const [sharedFiles, setSharedFiles] = useState([]);
  const [sharedFoldersList, setSharedFoldersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [trackingModalShareId, setTrackingModalShareId] = useState(null);
  const [previewShare, setPreviewShare] = useState(null);

  // Confirmation dialogs
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Highlighting
  const [highlightedShareId, setHighlightedShareId] = useState(null);

  // Parse URL search parameters on mount
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const tokenParam = searchParams.get('token');
  const mouIdParam = searchParams.get('mou_id');
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam === 'by_me') {
      setActiveTab(1);
    } else if (tabParam === 'folders') {
      setActiveTab(2);
    } else if (tabParam === 'with_me') {
      setActiveTab(0);
    }
  }, [tabParam]);

  // Fetch shared documents
  const fetchSharedFiles = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    const tabKey = activeTab === 1 ? 'by_me' : 'with_me';

    try {
      const params = { tab: tabKey };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await getSharedFiles(params);
      setSharedFiles(Array.isArray(data) ? data : []);

      // If tokenParam or mouIdParam present, auto-highlight & auto-preview matching document
      if ((tokenParam || mouIdParam) && Array.isArray(data)) {
        const match = data.find((s) =>
          (tokenParam && s.secure_token === tokenParam) ||
          (mouIdParam && String(s.mou_id) === String(mouIdParam))
        );
        if (match) {
          setHighlightedShareId(match.id);
          setPreviewShare(match);
        }
      }
    } catch (err) {
      console.error('Failed to load shared files:', err);
      setError('Could not retrieve shared document files. Please refresh the page.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, searchQuery, tokenParam, mouIdParam]);

  // Client-side date filter
  const displayedFiles = useMemo(() => {
    if (!dateFilter) return sharedFiles;
    return sharedFiles.filter((s) => {
      if (!s.shared_at) return false;
      const d = new Date(s.shared_at).toISOString().slice(0, 10);
      return d === dateFilter;
    });
  }, [sharedFiles, dateFilter]);

  // Fetch shared folders (legacy folder sharing preservation)
  const fetchSharedFolders = useCallback(async () => {
    try {
      const res = await api.get('/api/folders/shared/');
      setSharedFoldersList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load shared folders:', err);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 2) {
      fetchSharedFolders();
      setLoading(false);
    } else {
      fetchSharedFiles();
    }
  }, [activeTab, fetchSharedFiles, fetchSharedFolders]);

  useAutoRefresh([REFRESH_CATEGORIES.FOLDERS, REFRESH_CATEGORIES.ALL], () => {
    if (activeTab === 2) fetchSharedFolders();
    else fetchSharedFiles(true);
  });

  // Action: Direct Download
  const handleDownloadFile = async (share) => {
    try {
      const response = await downloadSharedFileBlob(share.secure_token);

      let filename = share.document_name || `${share.mou_title || 'MOU_Document'}.pdf`;
      const disposition = response.headers?.['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Stream download to browser Downloads folder
      const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showCustomToast.success(`Downloaded "${filename}" to your Downloads folder`);

      // Refresh list to update download status & metrics in real time
      fetchSharedFiles(true);
    } catch (err) {
      console.error('Failed to download:', err);
      showCustomToast.error(err.response?.data?.detail || 'Failed to download shared file.');
    }
  };

  // Action: Resend Email
  const handleResendEmail = async (share) => {
    try {
      await resendShareEmail(share.id);
      showCustomToast.success(`Sharing email resent to ${share.recipient_email || 'recipient'}`);
      fetchSharedFiles(true);
    } catch (err) {
      console.error('Resend failed:', err);
      showCustomToast.error('Failed to resend sharing email.');
    }
  };

  // Action: Revoke Access
  const executeRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokeShareAccess(revokeTarget.id);
      showCustomToast.success(`Revoked document access for ${revokeTarget.recipient_email || 'recipient'}`);
      setRevokeTarget(null);
      fetchSharedFiles(true);
    } catch (err) {
      console.error('Revocation failed:', err);
      showCustomToast.error('Failed to revoke document access.');
    } finally {
      setRevoking(false);
    }
  };

  // Action: Delete Share Record
  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/mous/shares/${deleteTarget.id}/`);
      showCustomToast.success('Document share record removed.');
      setDeleteTarget(null);
      fetchSharedFiles(true);
    } catch (err) {
      console.error('Delete failed:', err);
      showCustomToast.error('Failed to delete share entry.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-slide-up">
      {/* Page Header */}
      <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
          <Avatar
            sx={{
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              width: 52,
              height: 52,
              borderRadius: '16px',
              boxShadow: '0 8px 16px rgba(37,99,235,0.25)'
            }}
          >
            <ShareIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'text.primary' }}>
              Shared Files
            </Typography>
            <Typography variant="body2" color="text.secondary">
              MOU recipient distribution, download tracking, and institutional document collaboration.
            </Typography>
          </Box>
        </Box>

        {/* Top Header Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            onClick={() => {
              if (activeTab === 2) fetchSharedFolders();
              else fetchSharedFiles(true);
            }}
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, flex: { xs: '1 1 auto', sm: 'initial' } }}
          >
            Refresh
          </Button>

          {isAdmin && (
            <Button
              variant="contained"
              onClick={() => setShareModalOpen(true)}
              startIcon={<AddIcon />}
              sx={{
                borderRadius: '12px',
                fontWeight: 800,
                textTransform: 'none',
                px: 2.5,
                flex: { xs: '1 1 auto', sm: 'initial' },
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
              }}
            >
              Share MOU Document
            </Button>
          )}
        </Box>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              fontWeight: 800,
              textTransform: 'none',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              minHeight: 48,
              px: { xs: 1.5, sm: 3 }
            }
          }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Shared With Me</span>
                {activeTab === 0 && sharedFiles.length > 0 && (
                  <Chip label={sharedFiles.length} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }} />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Shared By Me</span>
                {activeTab === 1 && sharedFiles.length > 0 && (
                  <Chip label={sharedFiles.length} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }} />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Shared Folders</span>
                {sharedFoldersList.length > 0 && (
                  <Chip label={sharedFoldersList.length} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }} />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Filters & Search Toolbar (Only for Files tabs) */}
      {activeTab !== 2 && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            boxShadow: 'none'
          }}
        >
          <TextField
            size="small"
            placeholder="Filter by file name or receiver's email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchSharedFiles()}
            sx={{ flexGrow: 1, minWidth: { xs: '100%', sm: 260 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                )
              }
            }}
          />

          <TextField
            size="small"
            type="date"
            label="Filter by Date"
            slotProps={{ inputLabel: { shrink: true } }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 170 } }}
          />

          <Button
            variant="contained"
            size="small"
            onClick={() => fetchSharedFiles()}
            sx={{ borderRadius: '8px', fontWeight: 700, px: 2.5, flex: { xs: '1 1 auto', sm: 'initial' } }}
          >
            Filter
          </Button>

          {(searchQuery || dateFilter) && (
            <Button
              variant="text"
              size="small"
              onClick={() => {
                setSearchQuery('');
                setDateFilter('');
              }}
              sx={{ fontWeight: 700, flex: { xs: '1 1 auto', sm: 'initial' } }}
            >
              Clear
            </Button>
          )}
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Tab 0 & Tab 1: Shared Files (With Me & By Me) ── */}
      {activeTab !== 2 && (
        <>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : displayedFiles.length === 0 ? (
            <EmptyState
              illustration="folder"
              title={activeTab === 0 ? 'No Documents Shared With You' : 'No Documents Shared By You'}
              description={
                activeTab === 0
                  ? 'MOU agreements shared with your verified email address or department will automatically appear here.'
                  : 'You have not shared any files yet. Use the "Share MOU Document" button to share files with recipients.'
              }
              action={
                isAdmin && activeTab === 1 ? (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setShareModalOpen(true)}
                    sx={{ borderRadius: '10px', fontWeight: 700, mt: 1 }}
                  >
                    Share New MOU Document
                  </Button>
                ) : null
              }
            />
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: '20px',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
                overflow: 'hidden'
              }}
            >
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Shared File</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Receiver's Email</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedFiles.map((share) => {
                    const isHighlighted = highlightedShareId && String(highlightedShareId) === String(share.id);
                    const receiverEmail = share.target_email || share.recipient_email || share.user_email || share.department_name || '—';

                    return (
                      <TableRow
                        key={share.id}
                        hover
                        sx={{
                          transition: 'all 0.25s ease',
                          ...(isHighlighted
                            ? {
                                bgcolor: 'rgba(37, 99, 235, 0.08) !important',
                                borderLeft: '4px solid #2563EB'
                              }
                            : {})
                        }}
                      >
                        {/* 1. Shared File */}
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <PictureAsPdfIcon sx={{ color: '#EF4444', fontSize: 26 }} />
                            <Box>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: 800,
                                  color: '#2563EB',
                                  cursor: 'pointer',
                                  '&:hover': { textDecoration: 'underline' }
                                }}
                                onClick={() => setPreviewShare(share)}
                              >
                                {share.document_name || `${share.mou_title}.pdf`}
                              </Typography>
                              {share.partner_organization && (
                                <Typography variant="caption" color="text.secondary">
                                  {share.partner_organization}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>

                        {/* 2. Receiver's Email */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {receiverEmail}
                          </Typography>
                        </TableCell>

                        {/* 3. Date */}
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(share.shared_at)}
                          </Typography>
                        </TableCell>

                        {/* 4. Actions */}
                        <TableCell align="right">
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<CloudDownloadIcon fontSize="small" />}
                              onClick={() => handleDownloadFile(share)}
                              sx={{
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 700,
                                color: '#10B981',
                                borderColor: 'rgba(16, 185, 129, 0.4)',
                                '&:hover': {
                                  borderColor: '#10B981',
                                  bgcolor: 'rgba(16, 185, 129, 0.08)'
                                }
                              }}
                            >
                              Download File
                            </Button>

                            {(activeTab === 1 || isAdmin) && (
                              <Tooltip title="Delete Share">
                                <IconButton
                                  size="small"
                                  onClick={() => setDeleteTarget(share)}
                                  sx={{ color: '#EF4444' }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* ── Tab 2: Shared Folders (Preserving existing repository directory functionality) ── */}
      {activeTab === 2 && (
        <>
          {sharedFoldersList.length === 0 ? (
            <EmptyState
              illustration="folder"
              title="No Shared Folders"
              description="No custom repository folders have been shared with you yet."
            />
          ) : (
            <TableContainer
              component={Paper}
              sx={{
                borderRadius: '20px',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 'none',
                overflow: 'hidden'
              }}
            >
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Folder Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Owner / Creator</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Last Modified</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sharedFoldersList.map((folder) => {
                    const fColor = getDynamicFolderColor(folder);
                    const fLabel = getDynamicFolderLabel(folder);
                    return (
                      <TableRow key={folder.id} hover>
                        <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                          <FolderIcon sx={{ color: fColor, fontSize: 24 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {folder.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{folder.created_by?.name || 'System Admin'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{new Date(folder.updated_at).toLocaleDateString()}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={fLabel}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              borderRadius: '8px',
                              color: fColor,
                              bgcolor: `${fColor}18`,
                              border: '1px solid',
                              borderColor: `${fColor}35`
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              if (folder.custom_page_slug) {
                                navigate(`/custom-page/${folder.custom_page_slug}?folder=${folder.id}`);
                              } else if (folder.custom_page_id) {
                                navigate(`/custom-page/${folder.custom_page_id}?folder=${folder.id}`);
                              } else {
                                navigate(`/explorer?folder=${folder.id}`);
                              }
                            }}
                            sx={{
                              borderRadius: '8px',
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, var(--indigo), var(--violet))'
                            }}
                          >
                            Open Folder
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* ── Dialog 1: Share MOU Modal ── */}
      <MOUShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onShareSuccess={() => fetchSharedFiles(true)}
      />

      {/* ── Dialog 2: Download Tracking Modal ── */}
      <DownloadTrackingModal
        open={Boolean(trackingModalShareId)}
        onClose={() => setTrackingModalShareId(null)}
        shareId={trackingModalShareId}
      />

      {/* ── Dialog 3: Document Preview Modal ── */}
      <SharedDocumentPreviewModal
        open={Boolean(previewShare)}
        onClose={() => setPreviewShare(null)}
        share={previewShare}
        onDownloadSuccess={() => fetchSharedFiles(true)}
      />

      {/* ── Dialog 4: Confirm Revoke Access ── */}
      <Dialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'warning.main' }}>
          Revoke Document Access
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to revoke access for{' '}
            <strong>{revokeTarget?.recipient_email || 'this recipient'}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: '12px', fontSize: '0.8rem' }}>
            The recipient will no longer be able to download the file using their secure link.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRevokeTarget(null)} disabled={revoking} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={executeRevoke}
            disabled={revoking}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {revoking ? 'Revoking...' : 'Revoke Access'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog 5: Confirm Delete Share ── */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'error.main' }}>
          Delete Share Entry
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Are you sure you want to delete this document sharing record?
          </Typography>
          <Alert severity="error" sx={{ borderRadius: '12px', fontSize: '0.8rem' }}>
            This removes the sharing entry and disables future downloads.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={executeDelete}
            disabled={deleting}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SharedWithMe;
