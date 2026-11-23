import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Chip, IconButton, Tooltip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SettingsIcon from '@mui/icons-material/Settings';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BusinessIcon from '@mui/icons-material/Business';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import StorageIcon from '@mui/icons-material/Storage';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleConfig, getRoleBadge } from '../config/roles';

// Icon resolver for hero buttons
const resolveHeroIcon = (iconName) => {
  switch (iconName) {
    case 'ManageAccounts': return <ManageAccountsIcon />;
    case 'Settings': return <SettingsIcon />;
    case 'FactCheck': return <FactCheckIcon />;
    case 'Business': return <BusinessIcon />;
    case 'FolderSpecial': return <FolderSpecialIcon />;
    case 'NoteAdd': return <NoteAddIcon />;
    default: return null;
  }
};

/**
 * Gold Line-Art Law Illustration SVG
 * Features: Classical courthouse with pediment & columns, centered scales of justice, and gavel on block.
 */
function LawIllustrationSVG() {
  return (
    <svg
      viewBox="0 0 540 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', maxHeight: 360, filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.35))' }}
      aria-label="Court of Law, Scales of Justice, and Gavel illustration"
      role="img"
    >
      <defs>
        <linearGradient id="goldGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e6c76a" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#d4a82f" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#b8892b" stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id="aura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e6c76a" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0b1a3a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background legal aura */}
      <circle cx="270" cy="210" r="180" fill="url(#aura)" />

      {/* Subtle radiating law rays */}
      <g stroke="#e6c76a" strokeWidth="0.8" strokeDasharray="3 6" opacity="0.45">
        <line x1="270" y1="30" x2="270" y2="80" />
        <line x1="140" y1="90" x2="180" y2="120" />
        <line x1="400" y1="90" x2="360" y2="120" />
        <line x1="80" y1="210" x2="130" y2="210" />
        <line x1="460" y1="210" x2="410" y2="210" />
      </g>

      {/* ── COURTHOUSE ARCHITECTURE (Left/Center background) ── */}
      <g stroke="url(#goldGlow)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {/* Pediment Roof (Triangle) */}
        <polygon points="270,70 120,135 420,135" fill="rgba(11,26,58,0.5)" />
        <line x1="100" y1="140" x2="440" y2="140" strokeWidth="3" />
        
        {/* Pediment Inner Medallion */}
        <circle cx="270" cy="110" r="12" fill="none" strokeWidth="1.8" />
        <circle cx="270" cy="110" r="4" fill="#e6c76a" />

        {/* Courthouse Columns (4 Classical pillars) */}
        {/* Column 1 */}
        <rect x="145" y="145" width="22" height="150" rx="3" fill="rgba(15,32,68,0.4)" />
        <line x1="141" y1="145" x2="171" y2="145" strokeWidth="3" />
        <line x1="141" y1="295" x2="171" y2="295" strokeWidth="3" />
        {/* Column 2 */}
        <rect x="205" y="145" width="22" height="150" rx="3" fill="rgba(15,32,68,0.4)" />
        <line x1="201" y1="145" x2="231" y2="145" strokeWidth="3" />
        <line x1="201" y1="295" x2="231" y2="295" strokeWidth="3" />
        {/* Column 3 */}
        <rect x="315" y="145" width="22" height="150" rx="3" fill="rgba(15,32,68,0.4)" />
        <line x1="311" y1="145" x2="341" y2="145" strokeWidth="3" />
        <line x1="311" y1="295" x2="341" y2="295" strokeWidth="3" />
        {/* Column 4 */}
        <rect x="375" y="145" width="22" height="150" rx="3" fill="rgba(15,32,68,0.4)" />
        <line x1="371" y1="145" x2="401" y2="145" strokeWidth="3" />
        <line x1="371" y1="295" x2="401" y2="295" strokeWidth="3" />

        {/* Steps / Foundation Base */}
        <line x1="90" y1="300" x2="450" y2="300" strokeWidth="4" />
        <line x1="70" y1="312" x2="470" y2="312" strokeWidth="3.5" />
        <line x1="50" y1="324" x2="490" y2="324" strokeWidth="3" />
      </g>

      {/* ── SCALES OF JUSTICE (Centered Foreground) ── */}
      <g stroke="#e6c76a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {/* Central pillar / mast */}
        <line x1="270" y1="160" x2="270" y2="275" strokeWidth="3.5" />
        <circle cx="270" cy="155" r="7" fill="#e6c76a" />
        {/* Mast pedestal */}
        <path d="M250,285 L290,285 L280,275 L260,275 Z" fill="#e6c76a" opacity="0.9" />

        {/* Balance crossbeam (slight authentic incline) */}
        <line x1="180" y1="182" x2="360" y2="178" strokeWidth="3.2" />
        <circle cx="180" cy="182" r="4.5" fill="#e6c76a" />
        <circle cx="360" cy="178" r="4.5" fill="#e6c76a" />

        {/* Left Pan (Chains & Bowl) */}
        <line x1="180" y1="182" x2="160" y2="225" strokeWidth="1.5" />
        <line x1="180" y1="182" x2="200" y2="225" strokeWidth="1.5" />
        <path d="M152,225 Q180,246 208,225 Z" fill="rgba(230,199,106,0.3)" stroke="#e6c76a" strokeWidth="2.2" />

        {/* Right Pan (Chains & Bowl) */}
        <line x1="360" y1="178" x2="340" y2="221" strokeWidth="1.5" />
        <line x1="360" y1="178" x2="380" y2="221" strokeWidth="1.5" />
        <path d="M332,221 Q360,242 388,221 Z" fill="rgba(230,199,106,0.3)" stroke="#e6c76a" strokeWidth="2.2" />
      </g>

      {/* ── GAVEL & SOUND BLOCK (Foreground Bottom Right) ── */}
      <g stroke="#e6c76a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {/* Sound Block (Octagonal base) */}
        <polygon points="340,360 410,360 425,375 325,375" fill="rgba(212,168,47,0.3)" stroke="#e6c76a" strokeWidth="2.5" />
        <line x1="320" y1="375" x2="430" y2="375" strokeWidth="3" />

        {/* Gavel Head (Resting angled) */}
        <g transform="rotate(-18 375 325)">
          <rect x="345" y="312" width="60" height="26" rx="4" fill="rgba(11,26,58,0.7)" stroke="#e6c76a" strokeWidth="2.5" />
          <line x1="353" y1="312" x2="353" y2="338" strokeWidth="1.8" />
          <line x1="397" y1="312" x2="397" y2="338" strokeWidth="1.8" />
          {/* Gavel Handle */}
          <line x1="375" y1="338" x2="375" y2="400" strokeWidth="4.5" stroke="#e6c76a" />
          <circle cx="375" cy="402" r="4.5" fill="#e6c76a" />
        </g>
      </g>

      {/* Law Stars */}
      <polygon points="270,42 272,48 278,48 273,52 275,58 270,54 265,58 267,52 262,48 268,48" fill="#e6c76a" />
      <polygon points="120,110 121,114 125,114 122,117 123,121 120,118 117,121 118,117 115,114 119,114" fill="#e6c76a" opacity="0.75" />
      <polygon points="420,110 421,114 425,114 422,117 423,121 420,118 417,121 418,117 415,114 419,114" fill="#e6c76a" opacity="0.75" />
    </svg>
  );
}

export default function HeroSlider({ storageConnected = false, storageUsageStr = '' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roleConfig = getRoleConfig(user);
  const heroData = roleConfig.hero;
  const slides = heroData.slides || [];
  const buttons = heroData.buttons || [];
  const roleBadge = getRoleBadge(user);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  // Auto-rotate every ~6 seconds
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, slides.length]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const current = slides[currentSlide] || slides[0] || {};

  return (
    <Box
      id="home"
      component="section"
      aria-label="Institutional Overview Hero"
      sx={{
        width: '100%',
        borderRadius: { xs: '16px', md: '24px' },
        background: 'linear-gradient(135deg, #0b1a3a 0%, #0f2044 45%, #14305f 100%)',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        border: '1.5px solid var(--legal-gold-border, #b8892b)',
        boxShadow: '0 16px 40px rgba(11, 26, 58, 0.25)',
        p: { xs: 3, sm: 4, md: 5 },
        mb: 4,
      }}
    >
      {/* Decorative Gold Corner Borders */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 32,
          height: 32,
          borderTop: '3px solid var(--legal-gold, #d4a82f)',
          borderLeft: '3px solid var(--legal-gold, #d4a82f)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 32,
          height: 32,
          borderBottom: '3px solid var(--legal-gold, #d4a82f)',
          borderRight: '3px solid var(--legal-gold, #d4a82f)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' },
          alignItems: 'center',
          gap: { xs: 3, md: 4 },
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Left Content */}
        <Box>
          {/* Badges: Role badge + Storage badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={roleBadge}
              size="small"
              sx={{
                backgroundColor: 'rgba(212, 168, 47, 0.18)',
                color: 'var(--legal-gold-line, #e6c76a)',
                border: '1px solid var(--legal-gold, #d4a82f)',
                fontWeight: 800,
                fontSize: '0.76rem',
                letterSpacing: '0.5px',
                px: 0.5,
              }}
            />
            <Chip
              icon={storageConnected ? <CloudDoneIcon sx={{ fontSize: '15px !important', color: '#10B981 !important' }} /> : <StorageIcon sx={{ fontSize: '15px !important', color: 'var(--legal-gold, #d4a82f) !important' }} />}
              label={storageConnected ? "Google Drive Cloud Storage" : (storageUsageStr || "Secure Local Storage")}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontWeight: 600,
                fontSize: '0.74rem',
                px: 0.5,
              }}
            />
          </Box>

          {/* Slide Title with Serif Font */}
          <Typography
            variant="h3"
            sx={{
              fontFamily: 'var(--legal-font-serif, "Fraunces", serif)',
              fontWeight: 800,
              fontSize: { xs: '1.75rem', sm: '2.2rem', md: '2.6rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: '#ffffff',
              mb: 1.8,
              minHeight: { sm: '2.4em' },
            }}
          >
            {current.title}
          </Typography>

          {/* Slide Description */}
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '0.92rem', sm: '1.02rem' },
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.88)',
              maxWidth: 580,
              mb: 3.5,
              minHeight: { sm: '3.2em' },
            }}
          >
            {current.description}
          </Typography>

          {/* Two Role-Specific Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              flexWrap: 'wrap',
              alignItems: { xs: 'stretch', sm: 'center' },
              mb: 3.5,
            }}
          >
            {buttons.map((btn, idx) => (
              <Button
                key={btn.label}
                variant={btn.primary ? 'contained' : 'outlined'}
                onClick={() => navigate(btn.path)}
                startIcon={resolveHeroIcon(btn.icon)}
                sx={{
                  py: 1.2,
                  px: 3,
                  borderRadius: '12px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  textTransform: 'none',
                  minHeight: 46,
                  width: { xs: '100%', sm: 'auto' },
                  transition: 'all 0.22s ease',
                  ...(btn.primary
                    ? {
                        backgroundColor: 'var(--legal-gold, #d4a82f)',
                        color: 'var(--legal-navy, #0b1a3a)',
                        boxShadow: '0 6px 18px rgba(212, 168, 47, 0.35)',
                        '&:hover': {
                          backgroundColor: '#e6c76a',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 22px rgba(212, 168, 47, 0.45)',
                        },
                      }
                    : {
                        borderColor: 'var(--legal-gold-border, #b8892b)',
                        color: '#ffffff',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        '&:hover': {
                          borderColor: 'var(--legal-gold, #d4a82f)',
                          backgroundColor: 'rgba(212, 168, 47, 0.15)',
                          transform: 'translateY(-2px)',
                        },
                      }),
                }}
              >
                {btn.label}
              </Button>
            ))}
          </Box>

          {/* Slideshow Controls: Prev/Next, Dots, and Pause Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                onClick={handlePrev}
                aria-label="Previous slide"
                size="small"
                sx={{
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': { backgroundColor: 'rgba(212, 168, 47, 0.25)' },
                }}
              >
                <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
              </IconButton>

              <IconButton
                onClick={handleNext}
                aria-label="Next slide"
                size="small"
                sx={{
                  color: '#ffffff',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  '&:hover': { backgroundColor: 'rgba(212, 168, 47, 0.25)' },
                }}
              >
                <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>

            {/* Dots */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {slides.map((_, idx) => (
                <Box
                  key={idx}
                  component="button"
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  sx={{
                    width: currentSlide === idx ? 24 : 8,
                    height: 8,
                    borderRadius: '4px',
                    backgroundColor: currentSlide === idx ? 'var(--legal-gold, #d4a82f)' : 'rgba(255, 255, 255, 0.3)',
                    border: 'none',
                    cursor: 'pointer',
                    p: 0,
                    transition: 'all 0.25s ease',
                  }}
                />
              ))}
            </Box>

            {/* Pause / Resume Button */}
            <Button
              size="small"
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? "Resume automatic slideshow" : "Pause automatic slideshow"}
              startIcon={isPaused ? <PlayArrowIcon sx={{ fontSize: '16px !important' }} /> : <PauseIcon sx={{ fontSize: '16px !important' }} />}
              sx={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.74rem',
                textTransform: 'none',
                py: 0.4,
                px: 1.2,
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.18)', color: '#ffffff' },
              }}
            >
              {isPaused ? "Resume automatic slideshow" : "Pause automatic slideshow"}
            </Button>
          </Box>
        </Box>

        {/* Right Law Illustration */}
        <Box
          className="legal-floating-illustration"
          sx={{
            display: { xs: 'none', sm: 'flex' },
            justifyContent: 'center',
            alignItems: 'center',
            p: 2,
          }}
        >
          <LawIllustrationSVG />
        </Box>
      </Box>
    </Box>
  );
}
