import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Button, Grid, MenuItem, Select,
  FormControl, InputLabel, Alert, Chip, CircularProgress,
  Divider, InputAdornment, IconButton, Tooltip
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import EmailIcon from '@mui/icons-material/Email';
import BusinessIcon from '@mui/icons-material/Business';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';

import api from '../services/api';
import { shareMOU, shareFileDirect, getShareTemplates, getMOUs } from '../services/mouApi';
import { showCustomToast } from '../utils/customToast';

const PREDEFINED_TEMPLATES = [
  {
    id: 'standard',
    name: 'Standard MOU Document Sharing',
    category: 'General Notice',
    subject: 'Shared MOU: {mou_title} ({mou_number})',
    description: 'Official notification sharing the MOU document for review, reference, and collaboration.',
    body: `Dear Colleague / Partner,

You have been granted access to the official Memorandum of Understanding: {mou_title} ({mou_number}) between Madras Christian College (MCC) and {partner_organization}.

This document is immediately available in your MCC Legal Shared Files portal. You may download the document to your device or open the portal to inspect complete institutional records.

Regards,
{sender_name}
MCC Legal Cell`
  },
  {
    id: 'review_and_sign',
    name: 'Action Required: Review & Sign MOU',
    category: 'Signature Required',
    subject: 'Action Required: Review and Sign MOU - {mou_title}',
    description: 'Formal legal request to review terms, sign the document, and return verified signed copy.',
    body: `Dear Colleague / Partner,

Please review the attached Memorandum of Understanding: {mou_title} ({mou_number}) between MCC and {partner_organization}.

Action Required:
1. Download and thoroughly review the agreement terms.
2. Execute the document with authorized institutional signatures.
3. Upload the executed copy via the MCC Legal Portal or return to the Legal Cell.

Please complete this at your earliest convenience.

Regards,
{sender_name}
MCC Legal Cell`
  },
  {
    id: 'collaboration',
    name: 'Inter-Departmental Collaboration',
    category: 'Departmental',
    subject: 'Department Collaboration: {mou_title} ({mou_number})',
    description: 'Notice for collaborating departments to coordinate execution and joint academic activities.',
    body: `Dear Department Team,

This Memorandum of Understanding: {mou_title} ({mou_number}) with {partner_organization} has been shared with your department for joint coordination and academic implementation.

Please access your Shared Files section to review the agreement objectives, duration, and operational guidelines.

Regards,
{sender_name}
MCC Legal Cell`
  },
  {
    id: 'urgent',
    name: 'Urgent: Expedited MOU Notice',
    category: 'Urgent',
    subject: 'URGENT NOTICE: Expedited MOU Review - {mou_title}',
    description: 'High-priority notification for time-sensitive legal agreements requiring prompt action.',
    body: `URGENT ATTENTION REQUIRED:

This is a high-priority notification regarding the Memorandum of Understanding: {mou_title} ({mou_number}) with {partner_organization}.

Your prompt review and acknowledgement of this document are requested. Please use the buttons below to download the file immediately and log in to the portal.

Regards,
{sender_name}
MCC Legal Cell`
  }
];

const MOUShareModal = ({
  open,
  onClose,
  mou: initialMou = null,
  file: initialFile = null,
  onShareSuccess = () => {}
}) => {
  const [mousList, setMousList] = useState([]);
  const [selectedMouId, setSelectedMouId] = useState(initialMou?.id || '');
  const [selectedMou, setSelectedMou] = useState(initialMou);
  const [loadingMous, setLoadingMous] = useState(false);

  // Sharing Mode: 'email' or 'department'
  const [shareMode, setShareMode] = useState('email');

  // Email Sharing Fields
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('standard');
  const [emailSubject, setEmailSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [permission, setPermission] = useState('View Only');
  const [expiryOption, setExpiryOption] = useState('never'); // '7', '14', '30', 'custom', 'never'
  const [customExpiryDate, setCustomExpiryDate] = useState('');

  // Department Sharing Fields
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');

  // UI States
  const [templates, setTemplates] = useState(PREDEFINED_TEMPLATES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [userLookupStatus, setUserLookupStatus] = useState(null); // 'found', 'invite_needed', null

  // Fetch available MOUs if none passed and no file passed
  useEffect(() => {
    if (open) {
      if (initialFile) {
        setEmailSubject(`Shared File: ${initialFile.name}`);
        setCustomMessage(`Dear Colleague / Partner,\n\nYou have been granted access to the file: "${initialFile.name}".\n\nYou can download this document directly or open the portal to access institutional records.\n\nRegards,\nMCC Legal Team`);
      } else if (!initialMou) {
        setLoadingMous(true);
        getMOUs()
          .then((data) => {
            setMousList(data || []);
            if (data && data.length > 0 && !selectedMouId) {
              setSelectedMouId(data[0].id);
              setSelectedMou(data[0]);
            }
          })
          .catch((err) => console.error('Failed to load MOUs:', err))
          .finally(() => setLoadingMous(false));
      } else {
        setSelectedMou(initialMou);
        setSelectedMouId(initialMou.id);
      }

      // Fetch predefined templates from API or fallback
      getShareTemplates()
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setTemplates(res);
          }
        })
        .catch(() => {});

      // Fetch departments for department sharing
      api.get('/api/mous/master/departments/')
        .then((res) => setDepartments(res.data || []))
        .catch(() => {});
    }
  }, [open, initialMou, initialFile]);

  // Update selectedMou when selectedMouId changes
  useEffect(() => {
    if (mousList.length > 0 && selectedMouId) {
      const found = mousList.find((m) => String(m.id) === String(selectedMouId));
      if (found) setSelectedMou(found);
    }
  }, [selectedMouId, mousList]);

  // Apply template defaults when template or selectedMou changes
  useEffect(() => {
    const tmpl = templates.find((t) => t.id === selectedTemplateKey) || templates[0];
    if (tmpl && selectedMou) {
      const title = selectedMou.title || 'MOU Document';
      const num = selectedMou.mou_number || 'MOU-REF';
      const partner = selectedMou.partner_organization || 'Academic / Corporate Partner';
      
      let subj = tmpl.subject || `Shared MOU: ${title}`;
      subj = subj.replace('{mou_title}', title)
                 .replace('{mou_number}', num)
                 .replace('{partner_organization}', partner);
      setEmailSubject(subj);

      let msg = tmpl.body || '';
      msg = msg.replace('{mou_title}', title)
               .replace('{mou_number}', num)
               .replace('{partner_organization}', partner)
               .replace('{sender_name}', 'Legal Cell Administrator');
      setCustomMessage(msg);
    }
  }, [selectedTemplateKey, selectedMou, templates]);

  // Check recipient email existence debounced
  useEffect(() => {
    if (!recipientEmail || !recipientEmail.includes('@') || !recipientEmail.includes('.')) {
      setUserLookupStatus(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/users/?search=${encodeURIComponent(recipientEmail.trim())}`);
        const found = (res.data?.results || res.data || []).some(
          (u) => u.email?.toLowerCase() === recipientEmail.trim().toLowerCase()
        );
        setUserLookupStatus(found ? 'found' : 'invite_needed');
      } catch {
        setUserLookupStatus(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [recipientEmail]);

  const handleTemplateChange = (e) => {
    setSelectedTemplateKey(e.target.value);
  };

  const calculateExpiryDate = () => {
    if (expiryOption === 'never') return null;
    if (expiryOption === 'custom') return customExpiryDate || null;
    const days = parseInt(expiryOption, 10);
    if (!days) return null;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  const handleShareSubmit = async () => {
    if (!initialFile && !selectedMou?.id) {
      setError('Please select an MOU document to share.');
      return;
    }

    if (shareMode === 'email') {
      if (!recipientEmail || !recipientEmail.trim()) {
        setError('Please enter a valid recipient email address.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail.trim())) {
        setError('Please enter a valid email address (e.g. partner@example.com).');
        return;
      }
    } else {
      if (!selectedDept) {
        setError('Please select a department to share with.');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const expiresAt = calculateExpiryDate();

      if (initialFile) {
        const payload = {
          file_id: initialFile.id,
          permission,
          email_template: selectedTemplateKey,
          email_subject: emailSubject || `Shared File: ${initialFile.name}`,
          custom_message: customMessage,
          expires_at: expiresAt
        };

        if (shareMode === 'email') {
          payload.recipient_email = recipientEmail.trim().toLowerCase();
        } else {
          payload.department_name = selectedDept;
        }

        const res = await shareFileDirect(payload);
        if (shareMode === 'email' && res?.email_sent === false) {
          showCustomToast.warning(`File "${initialFile.name}" added to Shared Files, but the email delivery failed. Please verify SMTP settings.`);
        } else {
          showCustomToast.success(`File "${initialFile.name}" shared with ${shareMode === 'email' ? recipientEmail : selectedDept}`);
        }
        setRecipientEmail('');
        setSelectedDept('');
        onShareSuccess(res);
        onClose();
        return;
      }

      if (!selectedMou?.id) {
        setError('Please select an MOU document to share.');
        return;
      }

      const payload = {
        permission,
        email_template: selectedTemplateKey,
        email_subject: emailSubject,
        custom_message: customMessage,
        expires_at: expiresAt
      };

      if (shareMode === 'email') {
        payload.recipient_email = recipientEmail.trim().toLowerCase();
      } else {
        payload.department_name = selectedDept;
      }

      const res = await shareMOU(selectedMou.id, payload);

      if (shareMode === 'email' && res?.email_sent === false) {
        showCustomToast.warning(`MOU added to Shared Files, but notification email delivery failed. Please verify SMTP settings.`);
      } else if (res?.created) {
        showCustomToast.success(`MOU shared with ${shareMode === 'email' ? recipientEmail : selectedDept}`);
      } else {
        showCustomToast.success(`Updated sharing permissions for ${shareMode === 'email' ? recipientEmail : selectedDept}`);
      }

      // Reset form
      setRecipientEmail('');
      setSelectedDept('');
      onShareSuccess(res);
      onClose();
    } catch (err) {
      console.error('Sharing failed:', err);
      const detailMsg = err.response?.data?.detail 
        || (typeof err.response?.data === 'string' ? err.response?.data : null)
        || 'Failed to share MOU. Please verify recipient details and permissions.';
      setError(detailMsg);
    } finally {
      setSubmitting(false);
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
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF'
            }}
          >
            <ShareIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {initialFile ? `Share File: ${initialFile.name}` : 'Share MOU Document'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Distribute agreement or file securely via email with download &amp; portal access
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2.5}>
          {/* File Overview Card (if file passed directly) */}
          {initialFile && (
            <Grid xs={12}>
              <Box
                sx={{
                  p: 1.8,
                  borderRadius: '14px',
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1.5
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DescriptionIcon sx={{ color: '#2563EB', fontSize: 32 }} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {initialFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Size: <strong>{initialFile.size_formatted || 'Standard'}</strong> &bull; Department: <strong>{initialFile.department || 'MOU Repository'}</strong>
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label="Ready to Share"
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 700 }}
                />
              </Box>
            </Grid>
          )}

          {/* Target MOU Selector (if not preselected and not a direct file) */}
          {!initialMou && !initialFile && (
            <Grid xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Target MOU Document</InputLabel>
                <Select
                  value={selectedMouId}
                  label="Target MOU Document"
                  onChange={(e) => setSelectedMouId(e.target.value)}
                  disabled={loadingMous}
                >
                  {mousList.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DescriptionIcon fontSize="small" sx={{ color: '#2563EB' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {m.title}
                        </Typography>
                        <Chip
                          label={m.mou_number}
                          size="small"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* MOU Overview Card */}
          {selectedMou && !initialFile && (
            <Grid xs={12}>
              <Box
                sx={{
                  p: 1.8,
                  borderRadius: '14px',
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1.5
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {selectedMou.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ref: <strong>{selectedMou.mou_number}</strong> &bull; Partner: <strong>{selectedMou.partner_organization || 'MCC Legal Partner'}</strong>
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    label={`Status: ${selectedMou.status || 'Active'}`}
                    size="small"
                    color={selectedMou.status === 'Active' ? 'success' : 'default'}
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    label={`Version: v${selectedMou.version_number || 1}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
              </Box>
            </Grid>
          )}

          {/* Sharing Channel Mode Buttons */}
          <Grid xs={12}>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant={shareMode === 'email' ? 'contained' : 'outlined'}
                onClick={() => setShareMode('email')}
                startIcon={<EmailIcon />}
                size="small"
                sx={{
                  borderRadius: '10px',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 2,
                  ...(shareMode === 'email' ? { bgcolor: '#2563EB' } : {})
                }}
              >
                Email Recipient Sharing
              </Button>
              <Button
                variant={shareMode === 'department' ? 'contained' : 'outlined'}
                onClick={() => setShareMode('department')}
                startIcon={<BusinessIcon />}
                size="small"
                sx={{
                  borderRadius: '10px',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 2
                }}
              >
                Department Workspace Share
              </Button>
            </Box>
          </Grid>

          {/* Mode 1: Recipient Email Input */}
          {shareMode === 'email' ? (
            <>
              <Grid xs={12} md={7}>
                <TextField
                  fullWidth
                  size="small"
                  label="Recipient Email Address"
                  placeholder="e.g. partner@example.com or faculty@mcc.edu"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: userLookupStatus && (
                        <InputAdornment position="end">
                          {userLookupStatus === 'found' ? (
                            <Tooltip title="Registered portal account found. File will appear immediately in their Shared Files.">
                              <Chip
                                icon={<CheckCircleIcon sx={{ '&&': { color: '#16A34A' } }} />}
                                label="Verified User"
                                size="small"
                                sx={{ bgcolor: 'rgba(22,163,74,0.1)', color: '#16A34A', fontWeight: 700 }}
                              />
                            </Tooltip>
                          ) : (
                            <Tooltip title="No account yet. A secure registration invitation will be linked so they can sign up and access their Shared Files.">
                              <Chip
                                icon={<PersonIcon sx={{ '&&': { color: '#2563EB' } }} />}
                                label="New Recipient"
                                size="small"
                                sx={{ bgcolor: 'rgba(37,99,235,0.1)', color: '#2563EB', fontWeight: 700 }}
                              />
                            </Tooltip>
                          )}
                        </InputAdornment>
                      )
                    }
                  }}
                  helperText="Recipient will receive DOWNLOAD MOU and MOVE TO MOU action buttons."
                />
              </Grid>

              {/* Template Selector */}
              <Grid xs={12} md={5}>
                <FormControl fullWidth size="small">
                  <InputLabel>Predefined Email Template</InputLabel>
                  <Select
                    value={selectedTemplateKey}
                    label="Predefined Email Template"
                    onChange={handleTemplateChange}
                  >
                    {templates.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {t.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t.category}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Email Subject Line (Editable) */}
              <Grid xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Email Subject Line (Editable)"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </Grid>

              {/* Email Content Body (Editable) */}
              <Grid xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                  label="Email Message Content (Editable)"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  helperText="You can customize greeting, notes, or specific compliance instructions."
                />
              </Grid>
            </>
          ) : (
            /* Mode 2: Department Selection */
            <Grid xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Target Department</InputLabel>
                <Select
                  value={selectedDept}
                  label="Target Department"
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  {departments.map((d) => (
                    <MenuItem key={d.id || d.name} value={d.name}>
                      {d.name} {d.category ? `(${d.category.name || d.category})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Permission Rights */}
          <Grid xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Access Permission</InputLabel>
              <Select
                value={permission}
                label="Access Permission"
                onChange={(e) => setPermission(e.target.value)}
              >
                <MenuItem value="View Only">View Only (Preview & Download)</MenuItem>
                <MenuItem value="Upload Only">Upload Only (Submit Scanned MOU)</MenuItem>
                <MenuItem value="Edit">Edit (Modify & Collaborate)</MenuItem>
                <MenuItem value="Full Access">Full Access (All Operations)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Expiration Settings */}
          <Grid xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Access Expiration</InputLabel>
              <Select
                value={expiryOption}
                label="Access Expiration"
                onChange={(e) => setExpiryOption(e.target.value)}
              >
                <MenuItem value="never">No Expiration (Permanent)</MenuItem>
                <MenuItem value="7">Expires in 7 Days</MenuItem>
                <MenuItem value="14">Expires in 14 Days</MenuItem>
                <MenuItem value="30">Expires in 30 Days</MenuItem>
                <MenuItem value="custom">Custom Date & Time</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {expiryOption === 'custom' && (
            <Grid xs={12}>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label="Expiration Date & Time"
                slotProps={{ inputLabel: { shrink: true } }}
                value={customExpiryDate}
                onChange={(e) => setCustomExpiryDate(e.target.value)}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleShareSubmit}
          disabled={submitting || (shareMode === 'email' && !recipientEmail) || (shareMode === 'department' && !selectedDept)}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <ShareIcon />}
          sx={{
            borderRadius: '10px',
            fontWeight: 700,
            px: 3,
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
          }}
        >
          {submitting ? 'Sharing & Sending...' : 'Send Email & Share MOU'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MOUShareModal;
