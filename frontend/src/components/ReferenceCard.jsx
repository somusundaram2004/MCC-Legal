import React from 'react';
import { Box, Card, Typography, Button, Chip } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import MenuBookIcon from '@mui/icons-material/MenuBook';

export const REFERENCE_DOCUMENTS = [
  {
    id: 1,
    title: 'MOU Legal Framework & Compliance Policy',
    size: '2.4 MB PDF',
    code: 'DOC-LEG-01',
    description: 'Statutory compliance protocols, approval hierarchy and governance guidelines.',
  },
  {
    id: 2,
    title: 'Standard Bilateral Agreement Guidelines',
    size: '1.8 MB PDF',
    code: 'DOC-AGR-02',
    description: 'Contract terms, intellectual property clauses, and bilateral obligations.',
  },
  {
    id: 3,
    title: 'Institutional Approval & Delegation Matrix',
    size: '3.1 MB PDF',
    code: 'DOC-DEL-03',
    description: 'Authorized signatory levels, department coordinator duties, and review cycles.',
  },
  {
    id: 4,
    title: 'Statutory Archival & Document Retention Norms',
    size: '1.2 MB PDF',
    code: 'DOC-ARC-04',
    description: 'Archival schedules, Google Drive encryption requirements, and audit storage.',
  },
];

export function ReferenceCard({ document: doc }) {
  const handleDownload = () => {
    // Generate sample PDF document blob or trigger direct download
    const element = window.document.createElement('a');
    const file = new Blob([
      `%PDF-1.4\n% MCC LEGAL & MOU ENTERPRISE HUB\n% Title: ${doc.title}\n% Code: ${doc.code}\n% Size: ${doc.size}\n% This is an official institutional reference document.`
    ], { type: 'application/pdf' });
    element.href = URL.createObjectURL(file);
    element.download = `${doc.code}_${doc.title.replace(/\s+/g, '_')}.pdf`;
    window.document.body.appendChild(element);
    element.click();
    window.document.body.removeChild(element);
  };

  return (
    <Card
      elevation={0}
      className="legal-card-hover"
      sx={{
        p: 2.6,
        borderRadius: '18px',
        backgroundColor: 'var(--legal-cream-card, #ffffff)',
        border: '1px solid var(--legal-border-tint, #dccb9a)',
        boxShadow: 'var(--legal-shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        minHeight: 180,
      }}
    >
      <Box>
        {/* Top bar: PDF Red Badge & File Size */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                backgroundColor: 'rgba(185, 28, 28, 0.12)',
                color: 'var(--legal-badge-red, #b91c1c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PictureAsPdfIcon sx={{ fontSize: 20 }} />
            </Box>
            <Chip
              label="PDF"
              size="small"
              sx={{
                backgroundColor: 'var(--legal-badge-red, #b91c1c)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.68rem',
                height: 22,
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: 'var(--legal-text-muted, #64748b)', fontWeight: 600, fontSize: '0.76rem' }}>
            {doc.size}
          </Typography>
        </Box>

        {/* Title */}
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
            fontWeight: 800,
            fontSize: '0.98rem',
            lineHeight: 1.3,
            color: 'var(--legal-navy, #0b1a3a)',
            mb: 0.8,
          }}
        >
          {doc.title}
        </Typography>

        {/* Description */}
        <Typography
          variant="body2"
          sx={{
            color: 'var(--legal-text-secondary, #475569)',
            fontSize: '0.8rem',
            lineHeight: 1.45,
            mb: 2,
          }}
        >
          {doc.description}
        </Typography>
      </Box>

      {/* Download Button */}
      <Button
        variant="outlined"
        onClick={handleDownload}
        startIcon={<DownloadIcon />}
        aria-label={`Download PDF: ${doc.title}`}
        sx={{
          borderColor: 'var(--legal-gold-border, #b8892b)',
          color: 'var(--legal-navy, #0b1a3a)',
          fontWeight: 700,
          fontSize: '0.84rem',
          borderRadius: '10px',
          textTransform: 'none',
          py: 0.8,
          minHeight: 44,
          '&:hover': {
            backgroundColor: 'var(--legal-cream-tint, #f6f0e0)',
            borderColor: 'var(--legal-gold, #d4a82f)',
          },
        }}
      >
        Download Reference
      </Button>
    </Card>
  );
}

export default function ReferencesSection() {
  return (
    <Box id="references" component="section" aria-label="Statutory References and Downloads" sx={{ mb: 5 }}>
      {/* Section Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
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
          <MenuBookIcon fontSize="small" />
        </Box>
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
            Statutory Legal References &amp; Policies
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--legal-text-muted, #64748b)', fontSize: '0.8rem' }}>
            Official institutional guidelines, compliance manuals, and contract schedules
          </Typography>
        </Box>
      </Box>

      {/* Grid of 4 References */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        {REFERENCE_DOCUMENTS.map((doc) => (
          <ReferenceCard key={doc.id} document={doc} />
        ))}
      </Box>
    </Box>
  );
}
