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

const BUILD_DEFAULT_MESSAGE = (fileName) =>
`Dear Colleague,

The MCC Legal MOU Repository has been established to systematically monitor and maintain the operational lifecycle and compliance status of institutional Memoranda of Understanding.

Please find attached for your review and records:
"${fileName || 'file name'}"

Kindly review the attached agreement and provide an updated status on the following:
1. Has this Memorandum of Understanding (MOU) been officially signed?
2. If yes, kindly confirm the execution / signing date.
3. Detail the key beneficiaries and operational activities conducted under this MOU.
4. If signed, kindly upload the executed / signed copy into the MCC Legal Repository for institutional records.

Thank you for your prompt attention and cooperation.

Warm regards,
Dr. Selvi G
Legal Coordinator
Madras Christian College (MCC)`;

const PREDEFINED_TEMPLATES = [
  {
    id: 'standard',
    name: 'MOU Status & Signature Tracking',
    category: 'MOU Repository Status',
    subject: 'Action Required: MOU Status Update & Signature Tracking - {mou_title}',
    description: 'Track MOU signing status, execution date, beneficiary activity, and signed record.',
    body: `Dear Colleague,

The MCC Legal MOU Repository has been established to systematically monitor and maintain the operational lifecycle and compliance status of institutional Memoranda of Understanding.

Please find attached for your review and records:
"{mou_title}"

Kindly review the attached agreement and provide an updated status on the following:
1. Has this Memorandum of Understanding (MOU) been officially signed?
2. If yes, kindly confirm the execution / signing date.
3. Detail the key beneficiaries and operational activities conducted under this MOU.
4. If signed, kindly upload the executed / signed copy into the MCC Legal Repository for institutional records.

Thank you for your prompt attention and cooperation.

Warm regards,
Dr. Selvi G
Legal Coordinator
Madras Christian College (MCC)`
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

  // Email Sharing Fields (Supports Multiple Recipients & CC)
  const [recipientEmail, setRecipientEmail] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [showCc, setShowCc] = useState(false);
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

  // Helpers to parse email lists for visual chips
  const getParsedEmailChips = (str) => {
    if (!str) return [];
    return str
      .split(/[,;\s\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => Boolean(e) && e.includes('@') && e.includes('.'));
  };

  const recipientChips = getParsedEmailChips(recipientEmail);
  const ccChips = getParsedEmailChips(ccEmails);

  const handleRemoveRecipient = (emailToRemove) => {
    const list = (recipientEmail || '')
      .split(/[,;\s\n]+/)
      .map((e) => e.trim())
      .filter((e) => Boolean(e) && e.toLowerCase() !== emailToRemove.toLowerCase());
    setRecipientEmail(list.join(', '));
  };

  const handleRemoveCc = (emailToRemove) => {
    const list = (ccEmails || '')
      .split(/[,;\s\n]+/)
      .map((e) => e.trim())
      .filter((e) => Boolean(e) && e.toLowerCase() !== emailToRemove.toLowerCase());
    setCcEmails(list.join(', '));
  };

  // Fetch available MOUs if none passed and no file passed
  useEffect(() => {
    if (open) {
      if (initialFile) {
        const fileName = initialFile.name || 'MOU Document';
        setEmailSubject(`Shared File: ${fileName}`);
        setCustomMessage(BUILD_DEFAULT_MESSAGE(fileName));
      } else if (!initialMou) {
        setLoadingMous(true);
        getMOUs()
          .then((data) => {
            setMousList(data || []);
            if (data && data.length > 0 && !selectedMouId) {
              setSelectedMouId(data[0].id);
              setSelectedMou(data[0]);
              const docTitle = data[0].title || 'MOU Document';
              setEmailSubject(`Status Update: ${docTitle}`);
              setCustomMessage(BUILD_DEFAULT_MESSAGE(docTitle));
            }
          })
          .catch((err) => console.error('Failed to load MOUs:', err))
          .finally(() => setLoadingMous(false));
      } else {
        setSelectedMou(initialMou);
        setSelectedMouId(initialMou.id);
        const docTitle = initialMou.title || 'MOU Document';
        setEmailSubject(`Status Update: ${docTitle}`);
        setCustomMessage(BUILD_DEFAULT_MESSAGE(docTitle));
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
    if (tmpl) {
      const docName = initialFile?.name || selectedMou?.title || 'MOU Document';
      const num = selectedMou?.mou_number || 'MOU-REF';
      const partner = selectedMou?.partner_organization || 'Academic / Corporate Partner';
      
      let subj = tmpl.subject || (initialFile ? `Shared File: ${docName}` : `Status Update: ${docName}`);
      subj = subj.replace('{mou_title}', docName)
                 .replace('{mou_number}', num)
                 .replace('{partner_organization}', partner)
                 .replace('{file_name}', docName);
      setEmailSubject(subj);

      let msg = tmpl.body || '';
      msg = msg.replace('{mou_title}', docName)
               .replace('{mou_number}', num)
               .replace('{partner_organization}', partner)
               .replace('{file_name}', docName)
               .replace('"file name "', `"${docName}"`)
               .replace('"file name"', `"${docName}"`)
               .replace('{sender_name}', 'Dr. Selvi G');
      setCustomMessage(msg);
    }
  }, [selectedTemplateKey, selectedMou, initialFile, templates]);

  // Check recipient email existence debounced (takes primary email if multiple entered)
  useEffect(() => {
    if (!recipientEmail || !recipientEmail.includes('@') || !recipientEmail.includes('.')) {
      setUserLookupStatus(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const firstEmail = recipientEmail.split(/[,;\s\n]+/)[0]?.trim();
        if (!firstEmail || !firstEmail.includes('@') || !firstEmail.includes('.')) {
          setUserLookupStatus(null);
          return;
        }
        const res = await api.get(`/api/users/?search=${encodeURIComponent(firstEmail)}`);
        const found = (res.data?.results || res.data || []).some(
          (u) => u.email?.toLowerCase() === firstEmail.toLowerCase()
        );
        setUserLookupStatus(found ? 'found' : 'invite_needed');
      } catch {
        setUserLookupStatus(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [recipientEmail]);

  const handleTemplateChange = (e) => {
    const key = e.target.value;
    setSelectedTemplateKey(key);
    const tmpl = templates.find((t) => t.id === key) || templates[0];
    if (tmpl) {
      const docName = initialFile?.name || selectedMou?.title || 'MOU Document';
      const num = selectedMou?.mou_number || 'MOU-REF';
      const partner = selectedMou?.partner_organization || 'Academic / Corporate Partner';

      let subj = tmpl.subject || (initialFile ? `Shared File: ${docName}` : `Status Update: ${docName}`);
      subj = subj.replace('{mou_title}', docName)
                 .replace('{mou_number}', num)
                 .replace('{partner_organization}', partner)
                 .replace('{file_name}', docName);
      setEmailSubject(subj);

      let msg = tmpl.body || '';
      msg = msg.replace('{mou_title}', docName)
               .replace('{mou_number}', num)
               .replace('{partner_organization}', partner)
               .replace('{file_name}', docName)
               .replace('"file name "', `"${docName}"`)
               .replace('"file name"', `"${docName}"`)
               .replace('{sender_name}', 'Dr. Selvi G');
      setCustomMessage(msg);
    }
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

    const splitEmails = (str) => (str || '')
      .split(/[,;\s\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => Boolean(e));

    let parsedRecipients = [];
    let parsedCc = [];

    if (shareMode === 'email') {
      parsedRecipients = splitEmails(recipientEmail);
      if (parsedRecipients.length === 0) {
        setError('Please enter at least one recipient email address.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of parsedRecipients) {
        if (!emailRegex.test(email)) {
          setError(`Invalid recipient email address format: "${email}". Please enter valid email(s).`);
          return;
        }
      }

      parsedCc = splitEmails(ccEmails);
      for (const email of parsedCc) {
        if (!emailRegex.test(email)) {
          setError(`Invalid CC email address format: "${email}". Please enter valid email(s).`);
          return;
        }
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
      const displayTarget = shareMode === 'email'
        ? `${parsedRecipients.join(', ')}${parsedCc.length > 0 ? ` (CC: ${parsedCc.join(', ')})` : ''}`
        : selectedDept;

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
          payload.recipient_email = parsedRecipients.join(', ');
          if (parsedCc.length > 0) {
            payload.cc_emails = parsedCc.join(', ');
          }
        } else {
          payload.department_name = selectedDept;
        }

        const res = await shareFileDirect(payload);
        if (shareMode === 'email' && res?.email_sent === false) {
          showCustomToast.warning(`File "${initialFile.name}" added to Shared Files, but the email delivery failed. Please verify SMTP settings.`);
        } else {
          showCustomToast.success(`File "${initialFile.name}" shared with ${displayTarget}`);
        }
        setRecipientEmail('');
        setCcEmails('');
        setShowCc(false);
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
        payload.recipient_email = parsedRecipients.join(', ');
        if (parsedCc.length > 0) {
          payload.cc_emails = parsedCc.join(', ');
        }
      } else {
        payload.department_name = selectedDept;
      }

      const res = await shareMOU(selectedMou.id, payload);

      if (shareMode === 'email' && res?.email_sent === false) {
        showCustomToast.warning(`MOU added to Shared Files, but notification email delivery failed. Please verify SMTP settings.`);
      } else if (res?.created) {
        showCustomToast.success(`MOU shared with ${displayTarget}`);
      } else {
        showCustomToast.success(`Updated sharing permissions for ${displayTarget}`);
      }

      // Reset form
      setRecipientEmail('');
      setCcEmails('');
      setShowCc(false);
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
              background: 'linear-gradient(135deg, #0b1a3a 0%, #14305f 100%)',
              color: 'var(--legal-gold, #d4a82f)',
              border: '1.5px solid var(--legal-gold, #d4a82f)'
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

        <Grid container spacing={2.2}>
          {/* File Overview Card (if file passed directly) */}
          {initialFile && (
            <Grid size={12}>
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
            <Grid size={12}>
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
            <Grid size={12}>
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
          <Grid size={12}>
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
                  ...(shareMode === 'email' ? { bgcolor: '#d4a82f', color: '#0b1a3a', border: '1px solid #b8892b', '&:hover': { bgcolor: '#e6c76a' } } : {})
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

          {/* Mode 1: Recipient Email Input & Email Settings */}
          {shareMode === 'email' ? (
            <>
              {/* Recipient Email Address(es) - Full Width */}
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Primary Recipients (Action Required — To)"
                  placeholder="e.g. somusuraj72@gmail.com, partner@mcc.edu, hod@mcc.edu"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon fontSize="small" sx={{ color: '#2563EB' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            {!showCc && !ccEmails && (
                              <Button
                                size="small"
                                onClick={() => setShowCc(true)}
                                sx={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  minWidth: 0,
                                  px: 1,
                                  py: 0.2,
                                  borderRadius: '6px',
                                  textTransform: 'none',
                                  color: '#2563EB',
                                  bgcolor: 'rgba(37,99,235,0.08)',
                                  '&:hover': { bgcolor: 'rgba(37,99,235,0.18)' }
                                }}
                              >
                                + CC
                              </Button>
                            )}
                            {userLookupStatus && (
                              userLookupStatus === 'found' ? (
                                <Tooltip title="Registered portal account found. File will appear immediately in their Shared Files.">
                                  <Chip
                                    icon={<CheckCircleIcon sx={{ '&&': { color: '#16A34A' } }} />}
                                    label="Verified"
                                    size="small"
                                    sx={{ bgcolor: 'rgba(22,163,74,0.1)', color: '#16A34A', fontWeight: 700, height: 24 }}
                                  />
                                </Tooltip>
                              ) : (
                                <Tooltip title="New recipient. An account registration invitation will be linked so they can sign up and access their Shared Files.">
                                  <Chip
                                    icon={<PersonIcon sx={{ '&&': { color: '#2563EB' } }} />}
                                    label="New"
                                    size="small"
                                    sx={{ bgcolor: 'rgba(37,99,235,0.1)', color: '#2563EB', fontWeight: 700, height: 24 }}
                                  />
                                </Tooltip>
                              )
                            )}
                          </Box>
                        </InputAdornment>
                      )
                    }
                  }}
                  helperText="Primary recipients will receive individual emails with their own login credentials and the 4-point action checklist."
                />

                {/* Recipient Chips Preview */}
                {recipientChips.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1, alignItems: 'center' }}>
                    <Chip
                      size="small"
                      label={`${recipientChips.length} Primary (Action Required)`}
                      sx={{
                        bgcolor: 'rgba(37,99,235,0.12)',
                        color: '#1D4ED8',
                        fontWeight: 800,
                        height: 24,
                        fontSize: '0.72rem',
                        border: '1px solid #BFDBFE'
                      }}
                    />
                    {recipientChips.map((em) => (
                      <Chip
                        key={em}
                        icon={<PersonIcon sx={{ fontSize: '15px !important', color: '#2563EB !important' }} />}
                        label={`To: ${em}`}
                        size="small"
                        onDelete={() => handleRemoveRecipient(em)}
                        sx={{
                          bgcolor: 'rgba(37,99,235,0.06)',
                          color: '#1E40AF',
                          fontWeight: 600,
                          height: 24,
                          fontSize: '0.75rem',
                          border: '1px solid rgba(37,99,235,0.2)'
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Grid>

              {/* CC Recipients Field - Full Width */}
              {(showCc || ccEmails) && (
                <Grid size={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="CC Recipients (For Information & Reference Only — Carbon Copy)"
                    placeholder="e.g. legal-cell@mcc.edu, hod@mcc.edu, supervisor@domain.com"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon fontSize="small" sx={{ color: '#D97706' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Remove CC field">
                              <IconButton
                                size="small"
                                onClick={() => { setCcEmails(''); setShowCc(false); }}
                                sx={{ p: 0.5 }}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        )
                      }
                    }}
                    helperText="CC recipients receive separate view-only portal access and an informational copy (no action required)."
                  />

                  {/* CC Chips Preview */}
                  {ccChips.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mt: 1, alignItems: 'center' }}>
                      <Chip
                        size="small"
                        label={`${ccChips.length} CC (Info & Reference)`}
                        sx={{
                          bgcolor: '#FEF3C7',
                          color: '#92400E',
                          fontWeight: 800,
                          height: 24,
                          fontSize: '0.72rem',
                          border: '1px solid #FDE68A'
                        }}
                      />
                      {ccChips.map((em) => (
                        <Chip
                          key={em}
                          icon={<EmailIcon sx={{ fontSize: '15px !important', color: '#D97706 !important' }} />}
                          label={`CC: ${em}`}
                          size="small"
                          onDelete={() => handleRemoveCc(em)}
                          sx={{
                            bgcolor: 'rgba(212,168,47,0.1)',
                            color: '#855b00',
                            fontWeight: 600,
                            height: 24,
                            fontSize: '0.75rem',
                            border: '1px solid rgba(212,168,47,0.3)'
                          }}
                        />
                      ))}
                    </Box>
                  )}
                </Grid>
              )}

              {/* Distinction Summary Banner Between TO and CC */}
              <Grid size={12}>
                <Box
                  sx={{
                    p: 1.4,
                    borderRadius: '12px',
                    bgcolor: 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size="small"
                      label="TO: Primary Action"
                      sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 800, height: 22, fontSize: '0.72rem', border: '1px solid #BFDBFE' }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {recipientChips.length > 0 ? `${recipientChips.length} recipient(s) receive separate personal logins & action checklist` : 'Add primary action recipients'}
                    </Typography>
                  </Box>
                  {ccChips.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        size="small"
                        label="CC: Info & Reference"
                        sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 800, height: 22, fontSize: '0.72rem', border: '1px solid #FDE68A' }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {ccChips.length} CC recipient(s) receive view-only access & informational copy
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Grid>

              {/* Template Selector (50% desktop, side-by-side with Access Permission) */}
              <Grid size={{ xs: 12, md: 6 }}>
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

              {/* Permission Rights (50% desktop, side-by-side with Template Selector) */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Access Permission</InputLabel>
                  <Select
                    value={permission}
                    label="Access Permission"
                    onChange={(e) => setPermission(e.target.value)}
                  >
                    <MenuItem value="View Only">View Only (Preview &amp; Download)</MenuItem>
                    <MenuItem value="Upload Only">Upload Only (Submit Scanned MOU)</MenuItem>
                    <MenuItem value="Edit">Edit (Modify &amp; Collaborate)</MenuItem>
                    <MenuItem value="Full Access">Full Access (All Operations)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Email Subject Line (Editable) - Full Width */}
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Email Subject Line (Editable)"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </Grid>

              {/* Email Content Body (Editable) - Full Width */}
              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={7}
                  maxRows={12}
                  size="small"
                  label="Email Message Content (Editable)"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  helperText="Editable email message body delivered to all recipients."
                />
              </Grid>
            </>
          ) : (
            /* Mode 2: Department Selection */
            <>
              <Grid size={12}>
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

              {/* Department Mode Permission Rights */}
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Access Permission</InputLabel>
                  <Select
                    value={permission}
                    label="Access Permission"
                    onChange={(e) => setPermission(e.target.value)}
                  >
                    <MenuItem value="View Only">View Only (Preview &amp; Download)</MenuItem>
                    <MenuItem value="Upload Only">Upload Only (Submit Scanned MOU)</MenuItem>
                    <MenuItem value="Edit">Edit (Modify &amp; Collaborate)</MenuItem>
                    <MenuItem value="Full Access">Full Access (All Operations)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* Expiration Settings */}
          <Grid size={{ xs: 12, md: (shareMode === 'department' && expiryOption !== 'custom') ? 6 : (expiryOption === 'custom' ? 6 : 12) }}>
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
                <MenuItem value="custom">Custom Date &amp; Time</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {expiryOption === 'custom' && (
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label="Expiration Date &amp; Time"
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
            fontWeight: 800,
            px: 3,
            backgroundColor: 'var(--legal-gold, #d4a82f)',
            color: 'var(--legal-navy, #0b1a3a)',
            border: '1px solid var(--legal-gold-border, #b8892b)',
            boxShadow: '0 4px 12px rgba(212, 168, 47, 0.3)',
            '&:hover': {
              backgroundColor: '#e6c76a',
            }
          }}
        >
          {submitting
            ? 'Sharing & Sending...'
            : (recipientChips.length > 1 && ccChips.length > 0
                ? `Send Separate Emails (${recipientChips.length} To, ${ccChips.length} CC) & Share MOU`
                : (recipientChips.length > 1
                    ? `Send Separate Emails to ${recipientChips.length} Recipients & Share MOU`
                    : (ccChips.length > 0
                        ? `Send Email & Share MOU (+${ccChips.length} CC)`
                        : 'Send Email & Share MOU'
                      )
                  )
              )
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MOUShareModal;
