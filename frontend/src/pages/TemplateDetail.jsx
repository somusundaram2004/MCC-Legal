import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, Typography, Grid, Button, TextField, MenuItem, Select,
  FormControl, InputLabel, Alert, CircularProgress, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Avatar, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Link, IconButton, Breadcrumbs
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArchiveIcon from '@mui/icons-material/Archive';
import DateRangeIcon from '@mui/icons-material/DateRange';
import InfoIcon from '@mui/icons-material/Info';
import TimelineIcon from '@mui/icons-material/Timeline';
import FolderIcon from '@mui/icons-material/Folder';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ExtensionIcon from '@mui/icons-material/Extension';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import EmailIcon from '@mui/icons-material/Email';
import DescriptionIcon from '@mui/icons-material/Description';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import {
  getTemplateCollection, uploadTemplateDocument, archiveTemplateDocument, getMasterDocTypes, sendTemplateDocumentEmail
} from '../services/templateApi';
import api from '../services/api';
import PDFPreviewModal from '../components/PDFPreviewModal';

const TemplateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [docTypes, setDocTypes] = useState([]);
  const [activities, setActivities] = useState([]);

  // Upload fields
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [docName, setDocName] = useState('');
  const [selDocType, setSelDocType] = useState('');
  const [version, setVersion] = useState('1.0');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Drag & Drop Highlight
  const [isDragActive, setIsDragActive] = useState(false);

  // Preview Modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState('');
  const [previewDocId, setPreviewDocId] = useState(null);

  // Email Dialog state
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [selectedDocForEmail, setSelectedDocForEmail] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const fetchCollectionDetails = async () => {
    setLoading(true);
    try {
      const data = await getTemplateCollection(id);
      setCollection(data);
      
      // Load activity logs filtered by template
      const logs = await api.get('/api/activity-logs/');
      const relatedLogs = logs.data.filter(l => 
        l.module === 'Templates' && 
        (l.action.includes(data.template_name) || l.action.includes(String(id)))
      );
      setActivities(relatedLogs);
    } catch (err) {
      console.error(err);
      setError('Template collection not found or permission denied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionDetails();
    getMasterDocTypes().then(types => setDocTypes(types.filter(t => t.is_active)));
  }, [id]);

  const handleOpenUpload = (prefillVersion = '1.0') => {
    setFile(null);
    setDocName('');
    setSelDocType('');
    setVersion(prefillVersion);
    setEffectiveDate('');
    setRemarks('');
    setFormError(null);
    setUploadOpen(true);
  };

  // Drag & Drop Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type !== "application/pdf") {
        alert("Only PDF files are supported!");
        return;
      }
      setFile(droppedFile);
      setDocName(droppedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== "application/pdf") {
        alert("Only PDF files are supported!");
        return;
      }
      setFile(selectedFile);
      setDocName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUploadSubmit = async () => {
    if (!file || !docName || !selDocType) {
      setFormError('Please upload a PDF file, name the document, and choose the document type.');
      return;
    }
    setUploading(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_name', docName);
      formData.append('document_type_id', selDocType);
      formData.append('version', version);
      if (effectiveDate) formData.append('effective_date', effectiveDate);
      formData.append('remarks', remarks);

      await uploadTemplateDocument(id, formData);
      setUploadOpen(false);
      fetchCollectionDetails();
    } catch (err) {
      console.error(err);
      setFormError('Failed to upload PDF template document.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEmail = (doc) => {
    setSelectedDocForEmail(doc);
    setEmailRecipient('');
    setEmailSubject(`Attached Template: ${doc.document_name}`);
    setEmailBody(`Dear user,\n\nPlease find the attached template document: ${doc.document_name} v${doc.version}.\n\nBest regards,\nLegal Document Management System`);
    setEmailOpen(true);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!selectedDocForEmail || !emailRecipient.trim()) return;

    setEmailSending(true);
    try {
      await sendTemplateDocumentEmail(selectedDocForEmail.id, {
        recipient_email: emailRecipient.trim(),
        subject: emailSubject.trim(),
        body: emailBody.trim()
      });
      setEmailOpen(false);
      setSelectedDocForEmail(null);
      alert("Email sent successfully!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to send email.");
    } finally {
      setEmailSending(false);
    }
  };

  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const confirmArchive = (docId, docName) => {
    setArchiveTarget({ id: docId, name: docName });
  };

  const executeArchive = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await archiveTemplateDocument(archiveTarget.id);
      setArchiveTarget(null);
      fetchCollectionDetails();
    } catch (err) {
      console.error(err);
      setError('Failed to archive document.');
      setArchiveTarget(null);
    } finally {
      setArchiving(false);
    }
  };

  const handlePreview = (doc) => {
    // PDF document file URL
    setPreviewFileUrl(doc.file_path);
    setPreviewDocId(doc.id);
    setPreviewTitle(`${doc.document_name} (v${doc.version})`);
    setPreviewOpen(true);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
  );

  if (error || !collection) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Alert severity="error" sx={{ mb: 2 }}>{error || 'Template Library not found.'}</Alert>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/templates')}>
        Back to Templates
      </Button>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-slide-up">
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<KeyboardArrowRightIcon sx={{ fontSize: 16 }} />} sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" href="#" onClick={() => navigate('/templates')} sx={{ fontWeight: 600 }}>
          Template Library
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 800 }}>{collection.template_name}</Typography>
      </Breadcrumbs>

      {/* Header Info */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/templates')} sx={{ color: 'text.secondary', fontWeight: 700 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>{collection.template_name}</Typography>
            <Typography variant="caption" color="text.secondary">
              Collection Workspace • Category: {collection.category_name}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3.5}>
        {/* Left Column: Documents list & upload trigger */}
        <Grid xs={12} md={8}>
          <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', mb: 3 }}>
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>PDF Document Repository</Typography>
              <Chip label={`${collection.documents?.length || 0} files`} size="small" />
            </Box>
            
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Document Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Version</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Uploaded By / Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(!collection.documents || collection.documents.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <Typography color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          No PDF templates uploaded in this collection.
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                          <Button startIcon={<CloudUploadIcon />} variant="outlined" onClick={() => handleOpenUpload()} sx={{ borderRadius: '18px' }}>
                            Upload PDF Document
                          </Button>
                          <Button 
                            startIcon={<EmailIcon />} 
                            variant="contained" 
                            disabled={true} 
                            sx={{ borderRadius: '18px' }}
                          >
                            Send Email
                          </Button>
                          <Typography variant="caption" color="text.secondary">
                            (Upload a PDF first to send it via email)
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    collection.documents.map((doc) => (
                      <TableRow key={doc.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: 'rgba(239,68,68,0.08)', color: 'error.main', width: 32, height: 32 }}>
                              <DescriptionIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {doc.document_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Size: {(doc.file_path && doc.file_path.includes('bytes')) ? 'Unknown' : 'PDF'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={doc.document_type_name} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>v{doc.version}</TableCell>
                        <TableCell>
                          <Chip
                            label={doc.status}
                            size="small"
                            color={doc.status === 'Active' ? 'success' : doc.status === 'Draft' ? 'warning' : 'default'}
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                            {doc.uploaded_by_name || 'Admin'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handlePreview(doc)} sx={{ color: 'primary.main', mr: 0.5 }}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleOpenEmail(doc)} sx={{ color: 'info.main', mr: 0.5 }}>
                            <EmailIcon fontSize="small" />
                          </IconButton>
                          {doc.status !== 'Archived' && (
                            <IconButton size="small" onClick={() => confirmArchive(doc.id, doc.document_name)} sx={{ color: 'error.main' }}>
                              <ArchiveIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Right Column: Information & Audit Activity logs */}
        <Grid xs={12} md={4}>
          {/* Metadata Card */}
          <Card sx={{ p: 3, mb: 3.5, borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Template Parameters</Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Description</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{collection.description || 'No description provided.'}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Stream Category</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{collection.department_category_name}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Assigned Department</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{collection.department_name}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Organization Type</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{collection.organization_type_name}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Collaboration Type</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{collection.collaboration_type_name}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>Created By</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{collection.created_by_name} ({new Date(collection.created_at).toLocaleDateString()})</Typography>
            </Box>

            {collection.tags_details && collection.tags_details.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>Tags</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {collection.tags_details.map(t => <Chip key={t.id} label={t.name} size="small" />)}
                </Box>
              </Box>
            )}
          </Card>

          {/* Activity Timeline Card */}
          <Card sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon /> Template Activity Logs
            </Typography>
            <Box sx={{ position: 'relative', pl: 1 }}>
              {activities.length === 0 ? (
                <Typography variant="caption" color="text.secondary">No template activity recorded yet.</Typography>
              ) : (
                activities.slice(0, 8).map((log, idx) => (
                  <Box key={log.id} sx={{ position: 'relative', mb: 2, pl: 3, borderLeft: idx < activities.length - 1 ? '2px solid' : 'none', borderLeftColor: 'divider' }}>
                    <Box sx={{
                      position: 'absolute', left: -5, top: 2, width: 8, height: 8,
                      borderRadius: '50%', bgcolor: 'primary.main'
                    }} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      {log.action}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      By: {log.user ? `${log.user.name} (${log.user.email})` : 'System'}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Guided Wizard dialog: Upload PDF Template file */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '24px' } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Upload PDF Template File</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          
          {/* Drag & Drop File Upload Field */}
          <Box
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'divider',
              bgcolor: isDragActive ? 'rgba(var(--indigo-rgb), 0.04)' : 'action.hover',
              borderRadius: '16px',
              p: 4.5,
              textAlign: 'center',
              cursor: 'pointer',
              mb: 3,
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(var(--indigo-rgb), 0.02)'
              }
            }}
            onClick={() => document.getElementById('template-file-input').click()}
          >
            <input
              id="template-file-input"
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <CloudUploadIcon sx={{ fontSize: 44, color: 'primary.main', mb: 1 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {file ? file.name : "Drag & Drop PDF or Click to Browse"}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Supports PDF files up to 25MB.
            </Typography>
          </Box>

          <Grid container spacing={2.5}>
            {/* Document metadata fields */}
            <Grid xs={12}>
              <TextField
                fullWidth
                required
                label="Document Display Name"
                placeholder="e.g. Draft Version / Legal Approved"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
            </Grid>
            <Grid xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="upload-doc-type-label">Document Type</InputLabel>
                <Select
                  labelId="upload-doc-type-label"
                  id="upload-doc-type"
                  value={selDocType}
                  label="Document Type"
                  onChange={(e) => setSelDocType(e.target.value)}
                >
                  {docTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12}>
              <TextField
                fullWidth
                label="Version Number"
                placeholder="e.g. 1.0 or 2.1"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Effective Date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Remarks"
                placeholder="Optional version comments..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUploadSubmit}
            disabled={uploading}
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            {uploading ? 'Uploading PDF...' : 'Upload Document'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PDF Inline Viewer modal */}
      <PDFPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileUrl={previewFileUrl}
        docId={previewDocId}
        title={previewTitle}
      />

      {/* Send Email Dialog */}
      <Dialog open={emailOpen} onClose={() => { setEmailOpen(false); setSelectedDocForEmail(null); }} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
        <form onSubmit={handleSendEmail}>
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Send Document via Email</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                The document <strong>{selectedDocForEmail?.document_name} (v{selectedDocForEmail?.version})</strong> will be attached as a PDF file.
              </Typography>
              
              <TextField
                required
                label="Recipient Email"
                placeholder="e.g. user@example.com"
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                fullWidth
              />

              <TextField
                required
                label="Email Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                fullWidth
              />

              <TextField
                required
                label="Message Body"
                multiline
                rows={4}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => { setEmailOpen(false); setSelectedDocForEmail(null); }} variant="outlined" sx={{ borderRadius: '10px' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={emailSending}
              sx={{ borderRadius: '10px', fontWeight: 700 }}
            >
              {emailSending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Archive Document Confirmation Modal */}
      <Dialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800, color: 'error.main' }}>
          <WarningAmberIcon sx={{ fontSize: 32, color: 'error.main' }} />
          Archive Template Version
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            Archive document template <strong>"{archiveTarget?.name}"</strong>?
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: '12px', fontSize: '0.82rem' }}>
            Previous versions are retained in audit logs, but archiving makes them inactive for new forms.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setArchiveTarget(null)}
            variant="outlined"
            disabled={archiving}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            onClick={executeArchive}
            color="error"
            variant="contained"
            disabled={archiving}
            startIcon={archiving ? <CircularProgress size={18} color="inherit" /> : <ArchiveIcon />}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {archiving ? 'Archiving...' : 'Archive Version'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateDetail;
