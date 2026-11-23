import React from 'react';
import { Box, Typography, Divider, Grid } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useNavigate } from 'react-router-dom';

const COL_1_LINKS = [
  { label: 'Site map', path: '/system-map' },
  { label: 'Forms & Templates', path: '/templates' },
  { label: 'Help videos', path: '/system-map' },
  { label: 'Manuals', path: '#references' },
];

const COL_2_LINKS = [
  { label: 'Disclaimer', path: '#' },
  { label: 'Knowledge base', path: '/system-map' },
  { label: 'Brochures', path: '#' },
  { label: 'Newsletter', path: '#' },
];

const COL_3_LINKS = [
  { label: 'Privacy Policy', path: '#' },
  { label: 'Terms and Conditions', path: '#' },
  { label: 'Accessibility Statement', path: '#' },
  { label: 'Screen Reader Access', path: '#' },
];

export default function SiteFooter() {
  const navigate = useNavigate();

  const handleLinkClick = (path, e) => {
    e.preventDefault();
    if (path.startsWith('#')) {
      const el = document.querySelector(path);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (path !== '#') {
      navigate(path);
    }
  };

  return (
    <Box
      id="contact-us"
      component="footer"
      aria-label="Institutional Footer"
      sx={{
        backgroundColor: 'var(--legal-navy-dark, #071126)',
        color: '#ffffff',
        borderTop: '3px solid var(--legal-gold-border, #b8892b)',
        pt: { xs: 5, md: 7 },
        pb: 4,
        px: { xs: 2.5, md: 6 },
        mt: 'auto',
      }}
    >
      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        <Grid container spacing={4} sx={{ mb: 5 }}>
          {/* Brand & Contact Info */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '10px',
                  backgroundColor: 'var(--legal-navy, #0b1a3a)',
                  color: 'var(--legal-gold, #d4a82f)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid var(--legal-gold-border, #b8892b)',
                }}
              >
                <GavelIcon sx={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
                    fontWeight: 800,
                    color: '#ffffff',
                    fontSize: '1.15rem',
                    lineHeight: 1.1,
                  }}
                >
                  MCC LEGAL
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'var(--legal-gold-line, #e6c76a)',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Documents &amp; MOU Hub
                </Typography>
              </Box>
            </Box>

            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.86rem', lineHeight: 1.6, mb: 3 }}>
              Madras Christian College Legal &amp; MOU Enterprise Management System. 
              Centralized repository for institutional bilateral collaborations, corporate research partnerships, and statutory contracts.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.84rem' }}>
                <LocationOnIcon sx={{ fontSize: 18, color: 'var(--legal-gold, #d4a82f)' }} />
                <span>Tambaram, Chennai, Tamil Nadu 600059, India</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.84rem' }}>
                <EmailIcon sx={{ fontSize: 18, color: 'var(--legal-gold, #d4a82f)' }} />
                <span>legal.mou@mcc.edu.in</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.84rem' }}>
                <PhoneIcon sx={{ fontSize: 18, color: 'var(--legal-gold, #d4a82f)' }} />
                <span>+91 44 2239 0675 / 6773</span>
              </Box>
            </Box>
          </Grid>

          {/* Useful Links - 3 Columns */}
          <Grid item xs={12} md={8}>
            <Typography
              variant="subtitle1"
              sx={{
                fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
                fontWeight: 800,
                color: 'var(--legal-gold-line, #e6c76a)',
                fontSize: '1.05rem',
                mb: 2.5,
                borderBottom: '1px solid rgba(212, 168, 47, 0.3)',
                pb: 1,
              }}
            >
              Useful Links &amp; Institutional Governance
            </Typography>

            <Grid container spacing={3}>
              {/* Column 1 */}
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                  {COL_1_LINKS.map((link) => (
                    <Box
                      key={link.label}
                      component="a"
                      href={link.path}
                      onClick={(e) => handleLinkClick(link.path, e)}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.75)',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease',
                        '&:hover': { color: 'var(--legal-gold, #d4a82f)', textDecoration: 'underline' },
                      }}
                    >
                      {link.label}
                    </Box>
                  ))}
                </Box>
              </Grid>

              {/* Column 2 */}
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                  {COL_2_LINKS.map((link) => (
                    <Box
                      key={link.label}
                      component="a"
                      href={link.path}
                      onClick={(e) => handleLinkClick(link.path, e)}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.75)',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease',
                        '&:hover': { color: 'var(--legal-gold, #d4a82f)', textDecoration: 'underline' },
                      }}
                    >
                      {link.label}
                    </Box>
                  ))}
                </Box>
              </Grid>

              {/* Column 3 */}
              <Grid item xs={12} sm={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                  {COL_3_LINKS.map((link) => (
                    <Box
                      key={link.label}
                      component="a"
                      href={link.path}
                      onClick={(e) => handleLinkClick(link.path, e)}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.75)',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease',
                        '&:hover': { color: 'var(--legal-gold, #d4a82f)', textDecoration: 'underline' },
                      }}
                    >
                      {link.label}
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(212, 168, 47, 0.25)', mb: 3 }} />

        {/* Bottom Sub-bar */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
            fontSize: '0.78rem',
            color: 'rgba(255, 255, 255, 0.65)',
            textAlign: { xs: 'center', sm: 'left' },
          }}
        >
          <Box>
            © {new Date().getFullYear()} MCC Legal &amp; MOU Enterprise Hub. All rights reserved.
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <span>Version 3.4.0 Legal Enterprise</span>
            <span>•</span>
            <span>Last Updated: {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
