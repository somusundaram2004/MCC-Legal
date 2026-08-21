import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Grid, Card, CardContent, Typography, Button, IconButton, 
  Chip, Divider, Avatar, CircularProgress, Alert, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Checkbox, 
  FormControlLabel, FormGroup, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, MenuItem, Select, FormControl,
  InputLabel,
  Autocomplete
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BusinessIcon from '@mui/icons-material/Business';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FolderIcon from '@mui/icons-material/Folder';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckIcon from '@mui/icons-material/Check';
import DescriptionIcon from '@mui/icons-material/Description';
import ShareIcon from '@mui/icons-material/Share';
import DeleteIcon from '@mui/icons-material/Delete';
import TimelineIcon from '@mui/icons-material/Timeline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { 
  getMOU, approveRejectMOU, renewMOU, 
  getMOUShares, shareMOU, revokeMOUShare,
  reviewDepartmentSubmission
} from '../services/mouApi';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatusPill from '../components/StatusPill';
import { showCustomToast } from '../utils/customToast';
import LottieAnimation from '../components/LottieAnimation';

const TIMELINE_STEPS = [
  { key: 'Folder Created', label: 'Folder Created', desc: 'MOU Organization Folder created' },
  { key: 'Original Uploaded', label: 'Original Draft Uploaded', desc: 'Initial draft MOU document attached' },
  { key: 'Shared', label: 'Shared with Department', desc: 'MOU shared with department coordinators' },
  { key: 'Signed Uploaded', label: 'Signed MOU Uploaded', desc: 'Signed executed copy submitted by department' },
  { key: 'Approved', label: 'Approved & Active', desc: 'Verified by Legal Cell / Admin' },
];

// Departments loaded dynamically from master table API

const MOUDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mou, setMou] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sharing State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [activeShares, setActiveShares] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);
  const [sharePermission, setSharePermission] = useState('View Only');
  const [sharing, setSharing] = useState(false);

  // Dynamic Master Data states
  const [deptCategories, setDeptCategories] = useState([]);
  const [masterStreams, setMasterStreams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredShareDepts, setFilteredShareDepts] = useState([]);
  const [shareCategory, setShareCategory] = useState('');
  const [shareDept, setShareDept] = useState('');

  // Legal Submission Review Dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState('approve'); // 'approve' or 'reject'
  const [reviewComments, setReviewComments] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  const fetchMou = async () => {
    try {
      const data = await getMOU(id);
      setMou(data);
      
      // Fetch shares as well
      const shares = await getMOUShares(id);
      setActiveShares(shares);
    } catch (err) {
      console.error('Failed to load folder details:', err);
      setError('MOU Folder not found or permission denied.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (submissionId, action) => {
    setSelectedSubmissionId(submissionId);
    setReviewAction(action);
    setReviewComments('');
    setReviewDialogOpen(true);
  };

  const handleConfirmReview = async () => {
    setReviewing(true);
    try {
      if (selectedSubmissionId) {
        await reviewDepartmentSubmission(selectedSubmissionId, {
          action: reviewAction,
          remarks: reviewComments
        });
      } else {
        await approveRejectMOU(id, {
          action: reviewAction,
          remarks: reviewComments
        });
      }
      setReviewDialogOpen(false);
      if (reviewAction === 'approve') {
        showCustomToast.approved(mou.title);
      } else {
        showCustomToast.delete('Submission rejected');
      }
      fetchMou();
    } catch (err) {
      console.error('Review failed:', err);
      showCustomToast.error('Failed to submit compliance review.');
    } finally {
      setReviewing(false);
    }
  };

  useEffect(() => {
    fetchMou();
    api.get('/api/mous/master/streams/').then(res => setMasterStreams(res.data.filter(s => s.is_active))).catch(() => {});
    api.get('/api/mous/master/dept-categories/').then(res => setDeptCategories(res.data)).catch(() => {});
    api.get('/api/mous/master/departments/').then(res => setDepartments(res.data)).catch(() => {});
  }, [id]);

  const handleShareCategoryChange = (e) => {
    const strmId = e.target.value;
    setShareCategory(strmId);
    setShareDept('');
    setFilteredShareDepts(departments.filter(d => String(d.stream) === String(strmId) || String(d.stream_id) === String(strmId) || String(d.category) === String(strmId)));
  };

  const handleShareSubmit = async () => {
    if (!shareDept) return;
    setSharing(true);
    try {
      await shareMOU(id, {
        department_name: shareDept,
        permission: sharePermission
      });
      setShareDept('');
      setShareCategory('');
      setFilteredShareDepts([]);
      // Reload shares
      const shares = await getMOUShares(id);
      setActiveShares(shares);
    } catch (err) {
      console.error('Sharing failed:', err);
      setError('Failed to share folder with selected department.');
    } finally {
      setSharing(false);
    }
  };

  const [revokeShareTarget, setRevokeShareTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const [renewConfirmOpen, setRenewConfirmOpen] = useState(false);
  const [renewing, setRenewing] = useState(false);

  const confirmRevokeShare = (shareId) => {
    setRevokeShareTarget(shareId);
  };

  const executeRevokeShare = async () => {
    if (!revokeShareTarget) return;
    setRevoking(true);
    try {
      await revokeMOUShare(revokeShareTarget);
      const shares = await getMOUShares(id);
      setActiveShares(shares);
      setRevokeShareTarget(null);
    } catch (err) {
      console.error('Revocation failed:', err);
      setRevokeShareTarget(null);
    } finally {
      setRevoking(false);
    }
  };

  const confirmRenew = () => {
    setRenewConfirmOpen(true);
  };

  const executeRenew = async () => {
    setRenewing(true);
    try {
      const renewed = await renewMOU(id, 'Renewed from folder details page.');
      setRenewConfirmOpen(false);
      navigate(`/mou/${renewed.id}`);
    } catch (err) {
      console.error('Renewal failed:', err);
      setRenewConfirmOpen(false);
    } finally {
      setRenewing(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress />
    </Box>
  );

  if (error || !mou) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Alert severity="error" sx={{ mb: 2 }}>{error || 'Folder not found.'}</Alert>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/explorer')}>
        Back to Explorer
      </Button>
    </Box>
  );

  const daysLeft = mou.days_left;
  const isAdmin = user?.role?.name === 'Super Admin' || user?.role?.name === 'Admin' || user?.role?.name === 'Lawyer / MOU Administrator';

  // Find active step in timeline based on MOU status
  const getTimelineStepIndex = (status) => {
    switch (status) {
      case 'Draft': return 1;
      case 'Shared': return 2;
      case 'Pending Verification': return 3;
      case 'Active': return 4;
      default: return 0;
    }
  };
  const activeStepIdx = getTimelineStepIndex(mou.status);

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-slide-up">
      
      {/* ── Back Navigation ── */}
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/explorer')}
          sx={{ fontWeight: 700, color: 'text.secondary' }}
        >
          Back to MOU Repositories
        </Button>
      </Box>

      {/* ── Folder Details Header ── */}
      <Card sx={{ p: 3.5, mb: 3.5, borderRadius: '24px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
            <Avatar sx={{ bgcolor: 'rgba(var(--indigo-rgb), 0.12)', color: 'primary.main', width: 64, height: 64, borderRadius: '18px' }}>
              <FolderIcon sx={{ fontSize: 38 }} />
            </Avatar>

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                <Chip label={mou.mou_number} sx={{ fontWeight: 800, bgcolor: 'rgba(var(--indigo-rgb), 0.1)', color: 'primary.main', borderRadius: '8px' }} />
                <StatusPill status={mou.status} size="medium" />
                {daysLeft !== null && (
                  <Chip
                    label={daysLeft < 0 ? 'Expired' : `${daysLeft} Days Remaining`}
                    color={daysLeft <= 30 ? 'error' : 'success'}
                    size="small"
                    sx={{ fontWeight: 800 }}
                  />
                )}
              </Box>

              <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, letterSpacing: '-0.02em' }}>
                Folder: {mou.title}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, color: 'text.secondary', mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Partner: <strong>{mou.partner_organization}</strong>
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Category: <strong>{mou.mou_type_name || 'Standard MOU'}</strong>
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Owner: <strong>{mou.created_by_details?.name || 'System'}</strong>
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {isAdmin && (
              <>
                <Button
                  variant="contained"
                  startIcon={<ShareIcon />}
                  onClick={() => setShareDialogOpen(true)}
                  sx={{ borderRadius: '12px', fontWeight: 700, background: 'linear-gradient(135deg, var(--indigo) 0%, var(--violet) 100%)' }}
                >
                  Share Folder
                </Button>

                {(mou.status === 'Active' || mou.status === 'Expired') && (
                  <Button
                    variant="outlined"
                    onClick={confirmRenew}
                    startIcon={<AutorenewIcon />}
                    sx={{ borderRadius: '12px', fontWeight: 700 }}
                  >
                    One-Click Renewal
                  </Button>
                )}
              </>
            )}
          </Box>
        </Box>
      </Card>

      {/* ── Pending Submissions Verification Banner ── */}
      {isAdmin && mou.submissions && mou.submissions.length > 0 && (
        <Card sx={{ border: '2px solid rgba(245,158,11,0.3)', bgcolor: 'rgba(245,158,11,0.03)', borderRadius: '20px', p: 3, mb: 3.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ color: '#F59E0B' }}>●</span> Department Submission Pending Compliance Review
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A signed copy has been uploaded by the department. Verify compliance details and documents below.
          </Typography>

          {mou.submissions.map((sub) => (
            <Box key={sub.id} sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 2.5, borderRadius: '14px', mb: 2 }}>
              <Grid container spacing={2}>
                <Grid xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>SIGNED DATE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{sub.signed_date}</Typography>
                </Grid>
                <Grid xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>MOU TERM MONTH/YEAR</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{sub.mou_month} / {sub.mou_year}</Typography>
                </Grid>
                <Grid xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>SUBMITTED BY</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{sub.uploaded_by} ({sub.department_name})</Typography>
                </Grid>

                <Grid xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>EXECUTIVE SUMMARY</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{sub.summary}</Typography>
                </Grid>

                <Grid xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>PURPOSE</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{sub.purpose}</Typography>
                </Grid>

                <Grid xs={12}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 0.5, display: 'block' }}>BENEFITS</Typography>
                  {Array.isArray(sub.benefits) ? sub.benefits.map((b, idx) => (
                    <Chip key={idx} label={b} size="small" sx={{ mr: 1, fontWeight: 700 }} />
                  )) : <Typography variant="body2">{sub.benefits}</Typography>}
                </Grid>

                {sub.remarks && (
                  <Grid xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>REMARKS</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>{sub.remarks}</Typography>
                  </Grid>
                )}

                {sub.reviewer_comments && (
                  <Grid xs={12}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>COMPLIANCE FEEDBACK</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'error.main' }}>{sub.reviewer_comments}</Typography>
                  </Grid>
                )}
              </Grid>

              {sub.review_status === 'Pending Verification' && (
                <Box sx={{ display: 'flex', gap: 1.5, mt: 3, justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={() => handleOpenReview(sub.id, 'reject')}
                    sx={{ borderRadius: '8px', fontWeight: 700 }}
                  >
                    Reject Submission
                  </Button>
                  <Button 
                    variant="contained" 
                    color="success" 
                    onClick={() => handleOpenReview(sub.id, 'approve')}
                    sx={{ borderRadius: '8px', fontWeight: 700 }}
                  >
                    Verify & Approve Folder
                  </Button>
                </Box>
              )}
            </Box>
          ))}
        </Card>
      )}

      {/* Main Details Grid */}
      <Grid container spacing={3}>
        {/* Left Column: summary and documents */}
        <Grid xs={12} md={8}>
          <Card sx={{ p: 3, mb: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
              Agreement Summary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
              {mou.summary || 'No summary entered yet.'}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Primary Purpose
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {mou.purpose || 'No purpose detailed.'}
            </Typography>
          </Card>

          {/* Folder Documents & Files */}
          <Card sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
              Folder Documents & Files (Cloud Storage)
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ p: 2, borderRadius: '14px', bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DescriptionIcon sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Original Draft Agreement</Typography>
                    <Typography variant="caption" color="text.secondary">Draft Uploaded by Creator</Typography>
                  </Box>
                </Box>
                {mou.original_mou_details ? (
                  <Button 
                    size="small" 
                    startIcon={<CloudDownloadIcon />} 
                    href={mou.original_mou_details.file_url || mou.original_mou_details.web_view_link} 
                    target="_blank"
                  >
                    View / Download
                  </Button>
                ) : (
                  <Chip label="Not Uploaded" size="small" variant="outlined" />
                )}
              </Box>

              <Box sx={{ p: 2, borderRadius: '14px', bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DescriptionIcon sx={{ color: '#10B981' }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Executed Signed Agreement</Typography>
                    <Typography variant="caption" color="text.secondary">Verified Scanned Signed Version</Typography>
                  </Box>
                </Box>
                {mou.signed_mou_details ? (
                  <Button 
                    size="small" 
                    color="success" 
                    startIcon={<CloudDownloadIcon />} 
                    href={mou.signed_mou_details.file_url || mou.signed_mou_details.web_view_link} 
                    target="_blank"
                  >
                    View / Download
                  </Button>
                ) : (
                  <Chip label="Pending Submission" size="small" variant="outlined" />
                )}
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Right Column: dates and timeline */}
        <Grid xs={12} md={4}>
          {/* Expiry Card */}
          <Card sx={{ p: 3, mb: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
              Agreement Dates & Compliance
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Signed Date</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{mou.signed_date || 'Not Signed Yet'}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Duration</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{mou.duration_months} Months</Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(var(--indigo-rgb), 0.06)', border: '1px solid rgba(var(--indigo-rgb), 0.18)' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Expiry Date</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>{mou.expiry_date || 'N/A'}</Typography>
            </Box>
          </Card>

          {/* Activity Timeline */}
          <Card sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon /> Progress Lifecycle
            </Typography>

            <Box sx={{ position: 'relative', pl: 1 }}>
              {TIMELINE_STEPS.map((step, idx) => {
                const isActive = idx <= activeStepIdx;
                return (
                  <Box key={step.key} sx={{ position: 'relative', mb: 2.5, pl: 3.5, borderLeft: idx < TIMELINE_STEPS.length - 1 ? '2px solid' : 'none', borderLeftColor: isActive ? 'primary.main' : 'divider' }}>
                    <Box sx={{
                      position: 'absolute', left: -9, top: 0, width: 16, height: 16,
                      borderRadius: '50%', bgcolor: isActive ? 'primary.main' : 'divider',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isActive && <CheckIcon sx={{ fontSize: '0.65rem', color: '#fff' }} />}
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.84rem', color: isActive ? 'text.primary' : 'text.secondary' }}>
                      {step.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                      {step.desc}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ── Share Modal ── */}
      <Dialog 
        open={shareDialogOpen} 
        onClose={() => setShareDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Share Folder Permissions</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3.5}>
            {/* Left: select departments and permission */}
            <Grid xs={12} md={5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                Share with Department
              </Typography>

              <FormControl fullWidth sx={{ mb: 2.5 }} required>
                <InputLabel>Stream</InputLabel>
                <Select
                  value={shareCategory}
                  label="Stream"
                  onChange={handleShareCategoryChange}
                >
                  {masterStreams.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Autocomplete
                disabled={!shareCategory}
                options={filteredShareDepts}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  const catObj = deptCategories.find(c => c.id === shareCategory);
                  let name = option.name;
                  if (catObj && catObj.name === 'Aided' && name.endsWith(' (Aided)')) {
                    return name.slice(0, -8);
                  }
                  if (catObj && catObj.name === 'Self-Financed (SFS)' && name.endsWith(' (SFS)')) {
                    return name.slice(0, -6);
                  }
                  return name;
                }}
                value={filteredShareDepts.find(d => d.name === shareDept) || null}
                onChange={(event, newValue) => {
                  setShareDept(newValue ? newValue.name : '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Department"
                    placeholder="Select Department"
                  />
                )}
                sx={{ mb: 2.5 }}
                fullWidth
              />

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Permission Rights</InputLabel>
                <Select
                  value={sharePermission}
                  label="Permission Rights"
                  onChange={(e) => setSharePermission(e.target.value)}
                >
                  <MenuItem value="View Only">View Only (Read Documents)</MenuItem>
                  <MenuItem value="Upload Only">Upload Only (Submit Scanned MOU)</MenuItem>
                  <MenuItem value="Edit">Edit (Rename/Modify Files)</MenuItem>
                  <MenuItem value="Full Access">Full Access (All Operations)</MenuItem>
                </Select>
              </FormControl>

              <Button 
                variant="contained" 
                fullWidth
                onClick={handleShareSubmit}
                disabled={sharing || !shareDept}
                sx={{ borderRadius: '10px', fontWeight: 700 }}
              >
                {sharing ? 'Sharing...' : 'Add Share Rules'}
              </Button>
            </Grid>

            {/* Right: show active shares list */}
            <Grid xs={12} md={7}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>
                Active Share Rules ({activeShares.length})
              </Typography>

              {activeShares.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: '12px' }}>This folder is not currently shared.</Alert>
              ) : (
                <TableContainer component={Paper} sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Rights</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeShares.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell sx={{ fontWeight: 600 }}>{s.department_name}</TableCell>
                          <TableCell>
                            <Chip label={s.permission} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>
                            <Chip label={s.status} size="small" color={s.status === 'Completed' ? 'success' : 'default'} sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell align="right">
                            <IconButton color="error" size="small" onClick={() => confirmRevokeShare(s.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)} sx={{ fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Compliance Verification Review Remarks Dialog ── */}
      <Dialog 
        open={reviewDialogOpen} 
        onClose={() => setReviewDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {reviewAction === 'approve' ? 'Verify & Approve Submission' : 'Reject Submission'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Provide comments and remarks for the department coordinators.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Compliance Comments"
            value={reviewComments}
            onChange={(e) => setReviewComments(e.target.value)}
            placeholder="Add compliance audit note..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReviewDialogOpen(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button 
            variant="contained" 
            color={reviewAction === 'approve' ? 'success' : 'error'}
            onClick={handleConfirmReview}
            disabled={reviewing}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {reviewing ? 'Processing...' : 'Confirm Action'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Share Confirmation Modal */}
      <Dialog
        open={Boolean(revokeShareTarget)}
        onClose={() => setRevokeShareTarget(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800, color: 'error.main' }}>
          <WarningAmberIcon sx={{ fontSize: 32, color: 'error.main' }} />
          Revoke Share Permissions
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            Are you sure you want to revoke folder share permissions for this department?
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: '12px', fontSize: '0.82rem' }}>
            The department will lose access to view and upload documents into this folder repository.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setRevokeShareTarget(null)}
            variant="outlined"
            disabled={revoking}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            onClick={executeRevokeShare}
            color="error"
            variant="contained"
            disabled={revoking}
            startIcon={revoking ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {revoking ? 'Revoking...' : 'Revoke Share'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* One-Click Renewal Confirmation Modal */}
      <Dialog
        open={renewConfirmOpen}
        onClose={() => setRenewConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800, color: 'primary.main' }}>
          <AutorenewIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          One-Click Renewal
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            Execute One-Click Renewal for this MOU Folder?
          </Typography>
          <Alert severity="info" sx={{ borderRadius: '12px', fontSize: '0.82rem' }}>
            This will clone the active folder metadata into a new renewal document cycle.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setRenewConfirmOpen(false)}
            variant="outlined"
            disabled={renewing}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            onClick={executeRenew}
            color="primary"
            variant="contained"
            disabled={renewing}
            startIcon={renewing ? <CircularProgress size={18} color="inherit" /> : <AutorenewIcon />}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {renewing ? 'Renewing...' : 'Execute Renewal'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default MOUDetail;
