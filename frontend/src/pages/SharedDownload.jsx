import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Alert, Divider, Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DescriptionIcon from '@mui/icons-material/Description';
import GavelIcon from '@mui/icons-material/Gavel';
import ErrorIcon from '@mui/icons-material/Error';

import { downloadSharedFileBlob, getSharePreview } from '../services/mouApi';

const SharedDownload = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [downloading, setDownloading] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [previewInfo, setPreviewInfo] = useState(null);
  const [error, setError] = useState(null);
  const downloadAttempted = useRef(false);

  const executeDownload = async () => {
    if (!token) return;
    setDownloading(true);
    setError(null);

    try {
      // 1. Fetch preview info for UI display
      try {
        const info = await getSharePreview(token);
        setPreviewInfo(info);
      } catch (infoErr) {
        // If preview failed, might be invalid or revoked
        if (infoErr.response?.status === 403) {
          setError(infoErr.response?.data?.detail || 'This document share link has expired or access was revoked.');
          setDownloading(false);
          return;
        }
      }

      // 2. Fetch the file blob and trigger browser download
      const response = await downloadSharedFileBlob(token);

      let filename = 'MOU_Document.pdf';
      const disposition = response.headers?.['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      } else if (previewInfo?.document_name) {
        filename = previewInfo.document_name;
      }

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

      setDownloadSuccess(true);
    } catch (err) {
      console.error('Download failed:', err);
      const detailMsg = err.response?.data?.detail || 'Failed to download document. The link may be expired or revoked.';
      setError(detailMsg);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!downloadAttempted.current && token) {
      downloadAttempted.current = true;
      executeDownload();
    }
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}
    >
      <Card
        sx={{
          maxWidth: 580,
          width: '100%',
          borderRadius: '24px',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          textAlign: 'center'
        }}
      >
        {/* Banner */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)',
            py: 4,
            px: 3,
            color: '#FFFFFF'
          }}
        >
          <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.12)', mb: 1.5 }}>
            <GavelIcon sx={{ fontSize: 36, color: '#93C5FD' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
            MCC LEGAL
          </Typography>
          <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '2px', color: '#93C5FD', fontWeight: 700 }}>
            Official MOU Document Download Service
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {downloading ? (
            <Box sx={{ py: 4 }}>
              <CircularProgress size={52} sx={{ mb: 2.5, color: '#2563EB' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                Downloading Your MOU Document...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Validating recipient access credentials and preparing secure document stream.
              </Typography>
            </Box>
          ) : error ? (
            <Box sx={{ py: 3 }}>
              <ErrorIcon sx={{ fontSize: 60, color: '#EF4444', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                Download Unavailable
              </Typography>
              <Alert severity="error" sx={{ borderRadius: '14px', mb: 3, textAlign: 'left' }}>
                {error}
              </Alert>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
              >
                Sign In to Official Portal
              </Button>
            </Box>
          ) : (
            <Box sx={{ py: 2 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: '#16A34A', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.8 }}>
                Download Complete!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                The document has been saved to your device's normal <strong>Downloads</strong> folder.
              </Typography>

              {/* Document Info Card */}
              {previewInfo && (
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    textAlign: 'left',
                    mb: 3
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>
                    {previewInfo.document_name || previewInfo.mou_title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    MOU Ref: <strong>{previewInfo.mou_number}</strong> &bull; Partner: <strong>{previewInfo.partner_organization || 'Academic Partner'}</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Version: v${previewInfo.version || 1}`} size="small" sx={{ fontWeight: 700 }} />
                    <Chip label={previewInfo.permission || 'View Only'} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                    <Chip label="Saved in Shared Files" size="small" color="success" sx={{ fontWeight: 700 }} />
                  </Box>
                </Box>
              )}

              {/* Info Notice */}
              <Alert severity="info" sx={{ borderRadius: '14px', mb: 3, textAlign: 'left', fontSize: '0.82rem' }}>
                Downloading does not move or delete this document. It remains permanently available under your <strong>Shared Files</strong> repository in the portal.
              </Alert>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => {
                    if (previewInfo?.mou_id) {
                      navigate(`/mou/${previewInfo.mou_id}`);
                    } else {
                      navigate(`/shared?token=${token}`);
                    }
                  }}
                  startIcon={<OpenInNewIcon />}
                  sx={{
                    borderRadius: '12px',
                    fontWeight: 800,
                    py: 1.4,
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                    textTransform: 'none'
                  }}
                >
                  MOVE TO MOU &rarr;
                </Button>

                <Button
                  variant="outlined"
                  onClick={executeDownload}
                  startIcon={<CloudDownloadIcon />}
                  sx={{
                    borderRadius: '12px',
                    fontWeight: 700,
                    textTransform: 'none',
                    py: 1.2
                  }}
                >
                  Download File Again
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>

        <Divider />
        <Box sx={{ py: 2, bgcolor: '#F8FAFC' }}>
          <Typography variant="caption" color="text.secondary">
            Madras Christian College &bull; MCC Legal Document Management System
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default SharedDownload;
