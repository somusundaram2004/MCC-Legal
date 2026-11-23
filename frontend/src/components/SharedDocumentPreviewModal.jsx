import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Chip, CircularProgress,
  IconButton, Divider, Grid, Paper, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { downloadSharedFileBlob } from '../services/mouApi';
import { showCustomToast } from '../utils/customToast';

const SharedDocumentPreviewModal = ({ open, onClose, share, onDownloadSuccess = () => {} }) => {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  if (!share) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await downloadSharedFileBlob(share.secure_token);
      
      // Determine file name
      let filename = share.document_name || `${share.mou_title || 'MOU_Document'}.pdf`;
      const disposition = response.headers?.['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Trigger browser download directly to normal Downloads folder
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

      showCustomToast.success(`Downloaded ${filename} to your Downloads folder`);
      onDownloadSuccess();
    } catch (err) {
      console.error('Download error:', err);
      showCustomToast.error('Failed to download shared document.');
    } finally {
      setDownloading(false);
    }
  };

  const previewUrl = share.file_url || share.web_view_link;

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
            <DescriptionIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {share.document_name || share.mou_title || 'Shared MOU Document'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Ref: <strong>{share.mou_number}</strong> &bull; Partner: <strong>{share.partner_organization || 'Partner Institution'}</strong>
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2.5 }}>
        {/* Document Specifications Bar */}
        <Paper sx={{ p: 2, mb: 2.5, borderRadius: '16px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={1.5} sx={{ fontSize: '0.85rem' }}>
            <Grid xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                Document Version
              </Typography>
              <Chip label={`Version ${share.document_version || 1}`} size="small" sx={{ fontWeight: 700, mt: 0.5 }} />
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                Access Permission
              </Typography>
              <Chip label={share.permission || 'View Only'} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, mt: 0.5 }} />
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                Download Status
              </Typography>
              <Chip
                label={share.download_status || (share.download_count > 0 ? 'Downloaded' : 'Not Downloaded')}
                size="small"
                color={share.download_count > 0 ? 'success' : 'default'}
                sx={{ fontWeight: 700, mt: 0.5 }}
              />
            </Grid>
            <Grid xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                Shared By
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                {share.shared_by_name || 'Legal Cell'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Embedded Viewer or Preview Screen */}
        <Box
          sx={{
            width: '100%',
            height: 480,
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title={share.document_name}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <Box sx={{ textAlign: 'center', p: 4, maxWidth: 460 }}>
              <DescriptionIcon sx={{ fontSize: 64, color: '#2563EB', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                {share.document_name || `${share.mou_title}.pdf`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This official institutional MOU agreement is ready for direct download to your device's Downloads folder.
              </Typography>
              <Button
                variant="contained"
                onClick={handleDownload}
                disabled={downloading}
                startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <CloudDownloadIcon />}
                sx={{
                  borderRadius: '12px',
                  fontWeight: 800,
                  px: 4,
                  py: 1.2,
                  backgroundColor: 'var(--legal-gold, #d4a82f)',
                  color: 'var(--legal-navy, #0b1a3a)',
                  border: '1px solid var(--legal-gold-border, #b8892b)',
                  boxShadow: '0 4px 14px rgba(212, 168, 47, 0.35)',
                  '&:hover': {
                    backgroundColor: '#e6c76a',
                  }
                }}
              >
                {downloading ? 'Downloading...' : 'Download MOU Document'}
              </Button>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {share.mou_id && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewIcon />}
              onClick={() => {
                onClose();
                navigate(`/mou/${share.mou_id}`);
              }}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              Move to MOU
            </Button>
          )}
          {share.web_view_link && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewIcon />}
              href={share.web_view_link}
              target="_blank"
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              Open in Google Drive
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button onClick={onClose} sx={{ fontWeight: 700 }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleDownload}
            disabled={downloading}
            startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <CloudDownloadIcon />}
            sx={{
              borderRadius: '10px',
              fontWeight: 800,
              px: 3,
              backgroundColor: 'var(--legal-gold, #d4a82f)',
              color: 'var(--legal-navy, #0b1a3a)',
              border: '1px solid var(--legal-gold-border, #b8892b)',
              '&:hover': {
                backgroundColor: '#e6c76a',
              }
            }}
          >
            {downloading ? 'Downloading...' : 'Download Document'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SharedDocumentPreviewModal;

