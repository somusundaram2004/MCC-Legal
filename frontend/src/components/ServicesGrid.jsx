import React from 'react';
import { Box, Typography } from '@mui/material';
import AppsIcon from '@mui/icons-material/Apps';
import ServiceCard from './ServiceCard';

export default function ServicesGrid({ services = [] }) {
  return (
    <Box id="services" component="section" aria-label="Services and Modules Navigation" sx={{ mb: 5 }}>
      {/* Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
            <AppsIcon fontSize="small" />
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
              Institutional Services &amp; Portals
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--legal-text-muted, #64748b)', fontSize: '0.8rem' }}>
              Authorized operational modules for your institutional role
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Responsive Services Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        {services.map((service, index) => (
          <ServiceCard
            key={service.title}
            service={service}
            isHighlighted={Boolean(service.highlight || index < 4)}
          />
        ))}
      </Box>
    </Box>
  );
}
