import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useSiteCustomization } from './SiteCustomizationContext';

const ThemeModeContext = createContext({ toggleTheme: () => {}, mode: 'light', applyAppearance: () => {} });
export const useThemeMode = () => useContext(ThemeModeContext);

// Helper: read localStorage or fallback
const getLS = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => getLS('theme_mode', 'light'));
  const [primaryColor, setPrimaryColor] = useState(() => getLS('app_primary_color', '#4F46E5'));
  const [secondaryColor, setSecondaryColor] = useState(() => getLS('app_secondary_color', '#7C3AED'));
  const [fontFamily, setFontFamily] = useState(() => getLS('app_font_family', "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"));
  const [borderRadius, setBorderRadius] = useState(() => parseInt(getLS('app_border_radius', '14')));

  const siteCustomization = useSiteCustomization();
  const dbTheme = siteCustomization?.theme || {};

  // Sync DB customization settings with local states if there are no user overrides
  useEffect(() => {
    const localThemeMode = localStorage.getItem('theme_mode');
    if (!localThemeMode && dbTheme.mode) {
      setMode(dbTheme.mode);
    }
    const localPrimary = localStorage.getItem('app_primary_color');
    if (!localPrimary && dbTheme.primary_color) {
      setPrimaryColor(dbTheme.primary_color);
    }
    const localSecondary = localStorage.getItem('app_secondary_color');
    if (!localSecondary && dbTheme.secondary_color) {
      setSecondaryColor(dbTheme.secondary_color);
    }
    const localRadius = localStorage.getItem('app_border_radius');
    if (!localRadius && dbTheme.border_radius !== undefined) {
      setBorderRadius(parseInt(dbTheme.border_radius));
    }
    const localFont = localStorage.getItem('app_font_family');
    if (!localFont && dbTheme.font_family) {
      setFontFamily(dbTheme.font_family);
    }
  }, [dbTheme]);

  useEffect(() => { 
    localStorage.setItem('theme_mode', mode); 
    // Synchronize HTML document classes and attributes
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.setProperty('color-scheme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.setProperty('color-scheme', 'light');
    }
  }, [mode]);
  const toggleTheme = () => setMode(p => p === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const hexToRgb = (hex) => {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      return `${(num >> 16) & 0xff}, ${(num >> 8) & 0xff}, ${num & 0xff}`;
    };
    document.documentElement.style.setProperty('--indigo', primaryColor);
    document.documentElement.style.setProperty('--violet', secondaryColor);
    document.documentElement.style.setProperty('--indigo-rgb', hexToRgb(primaryColor));
    document.documentElement.style.setProperty('--violet-rgb', hexToRgb(secondaryColor));
  }, [primaryColor, secondaryColor]);

  // Called from Settings page to apply new appearance
  const applyAppearance = useCallback(({ primary, secondary, font, radius }) => {
    if (primary) { setPrimaryColor(primary); localStorage.setItem('app_primary_color', primary); }
    if (secondary) { setSecondaryColor(secondary); localStorage.setItem('app_secondary_color', secondary); }
    if (font) { setFontFamily(font); localStorage.setItem('app_font_family', font); }
    if (radius !== undefined) { setBorderRadius(radius); localStorage.setItem('app_border_radius', String(radius)); }
  }, []);

  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    const primary = primaryColor;
    const secondary = secondaryColor;
    const font = fontFamily;
    const radius = borderRadius;

    // Darken a hex color slightly for hover states
    const darken = (hex, amount = 20) => {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      const r = Math.max(0, (num >> 16) - amount);
      const g = Math.max(0, ((num >> 8) & 0xff) - amount);
      const b = Math.max(0, (num & 0xff) - amount);
      return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    };

    return createTheme({
      palette: {
        mode,
        primary: {
          main: primary,
          dark: darken(primary, 30),
          light: secondary,
          contrastText: '#ffffff',
        },
        secondary: {
          main: secondary,
          contrastText: '#ffffff',
        },
        success:  { main: '#10B981', light: '#D1FAE5', dark: '#059669' },
        warning:  { main: '#F59E0B', light: '#FEF3C7', dark: '#D97706' },
        error:    { main: '#F43F5E', light: '#FFE4E6', dark: '#BE123C' },
        info:     { main: '#F97316', light: '#FFEDD5', dark: '#C2410C' },
        background: {
          default: isDark ? '#0F1117' : '#FAFAFA',
          paper:   isDark ? '#1A1D27' : '#FFFFFF',
        },
        text: {
          primary:   isDark ? '#F1F5F9' : '#0F172A',
          secondary: isDark ? '#94A3B8' : '#64748B',
          disabled:  isDark ? '#475569' : '#CBD5E1',
        },
        divider: isDark ? '#2D3148' : '#E8ECF0',
        mou: {
          draft:    '#94A3B8',
          active:   '#10B981',
          pending:  '#F59E0B',
          expiring: '#F97316',
          expired:  '#F43F5E',
          renewed:  primary,
        },
      },

      typography: {
        fontFamily: font,
        h1: { fontWeight: 800, letterSpacing: '-0.03em' },
        h2: { fontWeight: 800, letterSpacing: '-0.025em' },
        h3: { fontWeight: 700, letterSpacing: '-0.02em' },
        h4: { fontWeight: 700, letterSpacing: '-0.015em' },
        h5: { fontWeight: 700, letterSpacing: '-0.01em' },
        h6: { fontWeight: 700, letterSpacing: '-0.005em' },
        subtitle1: { fontWeight: 600 },
        subtitle2: { fontWeight: 600 },
        body1:  { fontFamily: font, lineHeight: 1.7 },
        body2:  { fontFamily: font, lineHeight: 1.6 },
        caption:{ fontFamily: font },
        button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
      },

      shape: { borderRadius: radius },

      shadows: [
        'none',
        isDark ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 3px rgba(15,23,42,0.06)',
        isDark ? '0 2px 6px rgba(0,0,0,0.35)' : '0 2px 6px rgba(15,23,42,0.06)',
        isDark ? '0 4px 12px rgba(0,0,0,0.35)' : '0 4px 12px rgba(15,23,42,0.07)',
        isDark ? '0 6px 20px rgba(0,0,0,0.3)'  : '0 6px 20px rgba(15,23,42,0.08)',
        isDark ? '0 8px 28px rgba(0,0,0,0.3)'  : '0 8px 28px rgba(15,23,42,0.09)',
        isDark ? '0 12px 40px rgba(0,0,0,0.28)': '0 12px 40px rgba(15,23,42,0.10)',
        ...Array(18).fill('none'),
        isDark ? '0 20px 60px rgba(0,0,0,0.35)': '0 20px 60px rgba(15,23,42,0.14)',
        ...Array(3).fill('none'),
        isDark ? '0 28px 80px rgba(0,0,0,0.4)' : '0 28px 80px rgba(15,23,42,0.18)',
      ],

      components: {
        MuiCssBaseline: {
          styleOverrides: {
            '*': { boxSizing: 'border-box' },
            '::selection': { background: `${primary}20` },
            ':focus-visible': {
              outline: `2px solid ${primary}`,
              outlineOffset: '3px',
            },
          },
        },

        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: `${Math.max(radius - 2, 6)}px`,
              padding: '8px 20px',
              transition: 'all 0.18s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: 'none',
              '&:active': { transform: 'scale(0.97)' },
              '&:hover': { boxShadow: 'none', transform: 'translateY(-1px)' },
            },
            contained: {
              background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${darken(primary, 20)} 0%, ${darken(secondary, 20)} 100%)`,
              },
            },
            containedError: { background: '#F43F5E', '&:hover': { background: '#BE123C' } },
            containedSuccess: { background: '#10B981', '&:hover': { background: '#059669' } },
          },
        },

        MuiCard: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              borderRadius: `${radius}px`,
              border: `1px solid ${isDark ? '#2D3148' : '#E8ECF0'}`,
              boxShadow: isDark
                ? '0 4px 20px rgba(0,0,0,0.2)'
                : '0 2px 12px rgba(15,23,42,0.05)',
              transition: 'transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s cubic-bezier(0.22,1,0.36,1), border-color 0.22s ease',
            },
          },
        },

        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: isDark ? 'rgba(15,17,23,0.85)' : 'rgba(250,250,250,0.88)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: 'none',
              borderBottom: `1px solid ${isDark ? '#2D3148' : '#E8ECF0'}`,
            },
          },
        },

        MuiDrawer: {
          styleOverrides: {
            paper: {
              background: isDark ? '#12141E' : '#FFFFFF',
              borderRight: `1px solid ${isDark ? '#2D3148' : '#E8ECF0'}`,
            },
          },
        },

        MuiChip: {
          styleOverrides: {
            root: { fontWeight: 700, borderRadius: `${Math.max(radius - 6, 4)}px`, fontSize: '0.72rem' },
          },
        },

        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: `${Math.max(radius - 2, 6)}px`,
                transition: 'box-shadow 0.18s ease',
                '&.Mui-focused': {
                  boxShadow: `0 0 0 3px ${primary}25`,
                },
              },
            },
          },
        },

        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: `${Math.min(radius + 6, 28)}px`,
              border: `1px solid ${isDark ? '#2D3148' : '#E8ECF0'}`,
              backgroundImage: 'none',
            },
          },
        },

        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              borderRadius: `${Math.max(radius - 6, 4)}px`,
              fontSize: '0.75rem',
              fontFamily: font,
              background: isDark ? '#1E2235' : '#0F172A',
              padding: '6px 10px',
            },
          },
        },

        MuiTableHead: {
          styleOverrides: {
            root: {
              '& .MuiTableCell-root': {
                background: isDark ? '#14172200' : '#F8FAFC00',
                fontFamily: font,
                fontWeight: 700,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: isDark ? '#64748B' : '#94A3B8',
                borderBottom: `1px solid ${isDark ? '#2D3148' : '#E8ECF0'}`,
              },
            },
          },
        },

        MuiTableRow: {
          styleOverrides: {
            root: {
              transition: 'background-color 0.15s ease',
              '&:last-child td': { borderBottom: 0 },
            },
          },
        },

        MuiLinearProgress: {
          styleOverrides: {
            root: { borderRadius: 999, height: 6 },
            bar: { borderRadius: 999 },
          },
        },

        MuiListItemButton: {
          styleOverrides: {
            root: {
              borderRadius: `${Math.max(radius - 2, 6)}px`,
              transition: 'all 0.18s cubic-bezier(0.22,1,0.36,1)',
            },
          },
        },

        MuiTab: {
          styleOverrides: {
            root: {
              fontFamily: font,
            },
          },
        },
      },
    });
  }, [mode, primaryColor, secondaryColor, fontFamily, borderRadius]);

  const value = useMemo(() => ({
    toggleTheme,
    mode,
    primaryColor,
    secondaryColor,
    fontFamily,
    borderRadius,
    applyAppearance
  }), [mode, primaryColor, secondaryColor, fontFamily, borderRadius, applyAppearance]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};
