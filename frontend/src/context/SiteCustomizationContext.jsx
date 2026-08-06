import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import api from '../services/api';

const SiteCustomizationContext = createContext();

export const SiteCustomizationProvider = ({ children }) => {
  const [customization, setCustomization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeLang, setActiveLang] = useState('en');

  const fetchCustomization = useCallback(async () => {
    try {
      const response = await api.get('/api/customization/');
      setCustomization(response.data);
    } catch (err) {
      console.error("Failed to load website customization:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomization();
  }, [fetchCustomization]);

  // Inject Custom CSS & Custom JS into Document Head / Body dynamically
  useEffect(() => {
    if (!customization?.custom_code) return;

    const { custom_css, custom_js } = customization.custom_code;

    // Inject Custom CSS
    let styleTag = document.getElementById('custom-admin-css');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'custom-admin-css';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = custom_css || '';

    // Inject Custom JS
    if (custom_js) {
      let scriptTag = document.getElementById('custom-admin-js');
      if (scriptTag) scriptTag.remove();
      scriptTag = document.createElement('script');
      scriptTag.id = 'custom-admin-js';
      scriptTag.innerHTML = `try { ${custom_js} } catch(e) { console.error('Custom JS Error:', e); }`;
      document.body.appendChild(scriptTag);
    }
  }, [customization?.custom_code]);

  // Dynamic CSS Variables injection for instant theme application across all roles
  useEffect(() => {
    const themeConfig = customization?.theme || {};
    const primary = themeConfig.primary_color || '#4F46E5';
    const secondary = themeConfig.secondary_color || '#0EA5E9';
    const accent = themeConfig.accent_color || '#4338CA';
    const sidebar = themeConfig.sidebar_color || '#1E1B4B';
    const bg = themeConfig.bg_color || '#F8FAFC';
    const card = themeConfig.card_color || '#FFFFFF';

    document.documentElement.style.setProperty('--indigo', primary);
    document.documentElement.style.setProperty('--violet', secondary);
    document.documentElement.style.setProperty('--primary-main', primary);
    document.documentElement.style.setProperty('--secondary-main', secondary);
    document.documentElement.style.setProperty('--accent-color', accent);
    document.documentElement.style.setProperty('--sidebar-bg', sidebar);
    document.documentElement.style.setProperty('--bg-default', bg);
    document.documentElement.style.setProperty('--card-bg', card);
  }, [customization?.theme]);

  // Dynamic MUI Theme based on Customizer colors & settings
  const dynamicMuiTheme = useMemo(() => {
    const themeConfig = customization?.theme || {};
    const primaryColor = themeConfig.primary_color || '#4F46E5';
    const secondaryColor = themeConfig.secondary_color || '#0EA5E9';
    const borderRadius = themeConfig.border_radius ?? 12;
    const fontFamily = themeConfig.font_family || 'Inter, sans-serif';

    return createTheme({
      palette: {
        mode: themeConfig.mode === 'dark' ? 'dark' : 'light',
        primary: { main: primaryColor },
        secondary: { main: secondaryColor },
        background: {
          default: themeConfig.bg_color || '#F8FAFC',
          paper: themeConfig.card_color || '#FFFFFF',
        },
      },
      shape: {
        borderRadius: borderRadius,
      },
      typography: {
        fontFamily: fontFamily,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: borderRadius,
              textTransform: 'none',
              fontWeight: 700,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: borderRadius + 4,
            },
          },
        },
      },
    });
  }, [customization?.theme]);

  // Dynamic Text Translator (t helper)
  const t = useCallback((key, fallback) => {
    if (!customization?.dynamic_text) return fallback || key;
    const langDict = customization.dynamic_text[activeLang] || customization.dynamic_text['en'] || {};
    return langDict[key] || fallback || key;
  }, [customization?.dynamic_text, activeLang]);

  const value = {
    customization,
    loading,
    refreshCustomization: fetchCustomization,
    activeLang,
    setActiveLang,
    t,
    info: customization?.info || {},
    branding: customization?.branding || {},
    theme: customization?.theme || {},
    navigation: customization?.navigation || [],
    login: customization?.login || {},
    dashboard: customization?.dashboard || {},
    footer: customization?.footer || {},
    notification: customization?.notification || {},
    errorPages: customization?.error_pages || {}
  };

  return (
    <SiteCustomizationContext.Provider value={value}>
      {children}
    </SiteCustomizationContext.Provider>
  );
};

export const useSiteCustomization = () => {
  const context = useContext(SiteCustomizationContext);
  if (!context) {
    throw new Error('useSiteCustomization must be used within a SiteCustomizationProvider');
  }
  return context;
};
