import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Button, Box, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { logDocumentPreview, logDocumentDownload } from '../services/templateApi';
import api from '../services/api';

const PDFPreviewModal = ({ open, onClose, fileUrl, docId, title }) => {
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && docId) {
      logDocumentPreview(docId).catch(err => console.error("Failed to log preview:", err));
      setError(null);

      if (fileUrl) {
        setPreviewBlobUrl(fileUrl);
      } else {
        // Fetch document PDF preview securely from backend via API request
        api.get(`/api/mous/documents/${docId}/preview/`, { responseType: 'blob' })
          .then(res => {
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            setPreviewBlobUrl(url);
          })
          .catch(err => {
            console.error("Template preview fetch failed:", err);
            setError("Failed to load PDF template document preview.");
          });
      }
    }
    return () => {
      if (previewBlobUrl && !previewBlobUrl.startsWith('http')) {
        window.URL.revokeObjectURL(previewBlobUrl);
      }
      setPreviewBlobUrl('');
    };
  }, [open, docId, fileUrl]);

  const handleDownload = async () => {
    if (docId) {
      logDocumentDownload(docId).catch(err => console.error("Failed to log download:", err));
    }
    try {
      const response = await api.get(`/api/mous/documents/${docId}/download/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title || 'document'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Template download failed:", err);
      // Fallback to direct window open if API download fails
      window.open(fileUrl || `/api/mous/documents/${docId}/download/`, '_blank');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '20px',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{title || 'Document Preview'}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CloudDownloadIcon />}
            onClick={handleDownload}
            sx={{ borderRadius: '18px', textTransform: 'none', fontWeight: 700 }}
          >
            Download PDF
          </Button>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, flexGrow: 1, overflow: 'hidden' }}>
        {previewBlobUrl ? (
          <iframe
            src={`${previewBlobUrl}#toolbar=1`}
            title={title}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'error.main' }}>{error}</Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>Loading template document...</Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PDFPreviewModal;
