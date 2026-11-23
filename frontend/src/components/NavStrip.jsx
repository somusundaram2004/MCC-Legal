import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import AppsIcon from '@mui/icons-material/Apps';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home', anchor: '#home', icon: <HomeIcon sx={{ fontSize: 16 }} /> },
  { label: 'Statistics', anchor: '#statistics', icon: <BarChartIcon sx={{ fontSize: 16 }} /> },
  { label: 'Services', anchor: '#services', icon: <AppsIcon sx={{ fontSize: 16 }} /> },
  { label: 'References', anchor: '#references', icon: <MenuBookIcon sx={{ fontSize: 16 }} /> },
  { label: 'Contact Us', anchor: '#contact-us', icon: <ContactSupportIcon sx={{ fontSize: 16 }} /> },
];

export default function NavStrip() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (anchor) => {
    if (location.pathname === '/') {
      const el = document.querySelector(anchor);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      navigate('/' + anchor);
    }
  };

  return (
    <Box
      component="nav"
      aria-label="Section Navigation"
      sx={{
        backgroundColor: 'var(--legal-navy, #0b1a3a)',
        borderBottom: '2px solid var(--legal-gold-border, #b8892b)',
        py: 0.8,
        px: { xs: 2, md: 4 },
        position: 'relative',
        zIndex: 1050,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 3, md: 4 },
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          maxWidth: 1400,
          mx: 'auto',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {NAV_ITEMS.map((item) => (
          <Box
            key={item.label}
            component="button"
            onClick={() => handleNavClick(item.anchor)}
            aria-label={`Jump to ${item.label}`}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: { xs: '0.82rem', sm: '0.88rem' },
              fontWeight: 600,
              py: 0.8,
              px: 1,
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              textDecoration: 'none',
              '&:hover': {
                color: 'var(--legal-gold, #d4a82f)',
                backgroundColor: 'rgba(212, 168, 47, 0.12)',
              },
              '&:focus-visible': {
                outline: '2px solid var(--legal-gold, #d4a82f)',
              },
            }}
          >
            <Box sx={{ color: 'var(--legal-gold-line, #e6c76a)', display: 'flex', alignItems: 'center' }}>
              {item.icon}
            </Box>
            <span>{item.label}</span>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
