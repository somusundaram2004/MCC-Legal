import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, TextField, Button,
  Tabs, Tab, Switch, FormControlLabel, Alert, Divider, CircularProgress,
  Paper, IconButton, Chip, Tooltip, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PaletteIcon from '@mui/icons-material/Palette';
import InfoIcon from '@mui/icons-material/Info';
import ImageIcon from '@mui/icons-material/Image';
import NavigationIcon from '@mui/icons-material/Navigation';
import LockIcon from '@mui/icons-material/Lock';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CodeIcon from '@mui/icons-material/Code';
import TranslateIcon from '@mui/icons-material/Translate';
import DevicesIcon from '@mui/icons-material/Devices';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import TabletIcon from '@mui/icons-material/Tablet';
import LaptopIcon from '@mui/icons-material/Laptop';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import api from '../../services/api';
import { useSiteCustomization } from '../../context/SiteCustomizationContext';
import { showCustomToast } from '../../utils/customToast';
import WebsiteBuilderTab from '../WebsiteBuilderTab';

const CustomizerHub = () => {
  const { customization, refreshCustomization } = useSiteCustomization();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop');

  // Form state sections initialized from context
  const [info, setInfo] = useState(customization?.info || {});
  const [theme, setTheme] = useState(customization?.theme || {});
  const [login, setLogin] = useState(customization?.login || {});
  const [dashboard, setDashboard] = useState(customization?.dashboard || {});
  const [footer, setFooter] = useState(customization?.footer || {});
  const [customCode, setCustomCode] = useState(customization?.custom_code || {});
  const [dynamicText, setDynamicText] = useState(customization?.dynamic_text || { en: {}, ta: {} });

  const handleSaveSection = async (section, data) => {
    setSaving(true);
    try {
      await api.patch('/api/customization/update-section/', {
        section,
        data
      });
      showCustomToast('success', `Section '${section}' saved successfully!`);
      refreshCustomization();
    } catch (err) {
      console.error("Save section error:", err);
      showCustomToast('error', err.response?.data?.detail || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event, assetKey) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('asset_key', assetKey);

    setSaving(true);
    try {
      await api.post('/api/customization/upload-asset/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showCustomToast('success', `Branding asset '${assetKey}' uploaded!`);
      refreshCustomization();
    } catch (err) {
      showCustomToast('error', err.response?.data?.detail || 'Asset upload failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      const response = await api.get('/api/customization/export-json/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mcc_website_customization.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showCustomToast('success', 'Customization backup exported!');
    } catch (err) {
      showCustomToast('error', 'Failed to export backup.');
    }
  };

  const handleImportJSON = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setSaving(true);
    try {
      await api.post('/api/customization/import-json/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showCustomToast('success', 'Customization backup restored successfully!');
      refreshCustomization();
    } catch (err) {
      showCustomToast('error', err.response?.data?.detail || 'Import failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Are you sure you want to reset all customization settings to factory defaults?")) return;
    setSaving(true);
    try {
      await api.post('/api/customization/reset-defaults/');
      showCustomToast('success', 'Reset to factory default settings.');
      refreshCustomization();
    } catch (err) {
      showCustomToast('error', 'Failed to reset settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Top Header Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Website Customization Engine
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Super Admin Suite to dynamically control branding, themes, menus, pages, and translations.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={handleExportJSON}
            startIcon={<DownloadIcon />}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Export JSON
          </Button>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileIcon />}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Import JSON
            <input type="file" hidden accept=".json" onChange={handleImportJSON} />
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleResetDefaults}
            startIcon={<RestartAltIcon />}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
          >
            Reset Defaults
          </Button>
        </Box>
      </Box>

      {/* Module Navigation Tabs */}
      <Paper variant="outlined" sx={{ borderRadius: '16px', mb: 3, bgcolor: 'background.paper' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            '& .MuiTab-root': {
              fontWeight: 700,
              textTransform: 'none',
              minHeight: 56,
              fontSize: '0.9rem'
            }
          }}
        >
          <Tab icon={<InfoIcon />} iconPosition="start" label="Website Info" />
          <Tab icon={<ImageIcon />} iconPosition="start" label="Branding Assets" />
          <Tab icon={<PaletteIcon />} iconPosition="start" label="Theme & Colors" />
          <Tab icon={<LockIcon />} iconPosition="start" label="Login Page" />
          <Tab icon={<DashboardIcon />} iconPosition="start" label="Dashboard & Widgets" />
          <Tab icon={<TranslateIcon />} iconPosition="start" label="Dynamic Text (i18n)" />
          <Tab icon={<CodeIcon />} iconPosition="start" label="Custom Code (CSS/JS)" />
          <Tab icon={<DevicesIcon />} iconPosition="start" label="Live Preview" />
          <Tab icon={<AutoAwesomeIcon />} iconPosition="start" label="Website Builder" />
        </Tabs>
      </Paper>

      {/* Tab 0: Website Info */}
      {activeTab === 0 && (
        <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            General Website & Organization Information
          </Typography>
          <Grid container spacing={2.5}>
            {Object.keys(info).map((key) => (
              <Grid xs={12} sm={6} key={key}>
                <TextField
                  fullWidth
                  label={key.replace(/_/g, ' ').toUpperCase()}
                  value={info[key] || ''}
                  onChange={(e) => setInfo({ ...info, [key]: e.target.value })}
                />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={() => handleSaveSection('info', info)}
              disabled={saving}
              startIcon={<SaveIcon />}
              sx={{ backgroundColor: '#4F46E5', color: '#ffffff !important', px: 4, py: 1.2, borderRadius: '10px' }}
            >
              Save Website Info
            </Button>
          </Box>
        </Card>
      )}

      {/* Tab 1: Branding Assets */}
      {activeTab === 1 && (
        <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Branding Images & Logos
          </Typography>
          <Grid container spacing={3}>
            {[
              { label: 'Main Website Logo', key: 'website_logo' },
              { label: 'Small / Compact Logo', key: 'small_logo' },
              { label: 'White / Dark Mode Logo', key: 'white_logo' },
              { label: 'Login Screen Logo', key: 'login_logo' },
              { label: 'Login Background Image', key: 'login_bg' },
              { label: 'Favicon', key: 'favicon' },
              { label: 'Default User Avatar', key: 'default_avatar' },
              { label: '404 Page Illustration', key: 'illustration_404' }
            ].map((item) => (
              <Grid xs={12} sm={6} md={4} key={item.key}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '14px', textAlign: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                    {item.label}
                  </Typography>
                  {customization?.branding?.[item.key] ? (
                    <Box
                      component="img"
                      src={customization.branding[item.key]}
                      alt={item.label}
                      sx={{ maxHeight: 70, maxWidth: '100%', objectFit: 'contain', mb: 2, borderRadius: '6px' }}
                    />
                  ) : (
                    <Box sx={{ height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', mb: 2, borderRadius: '6px' }}>
                      <Typography variant="caption" color="text.secondary">No asset uploaded</Typography>
                    </Box>
                  )}
                  <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    startIcon={<CloudUploadIcon />}
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Upload Image
                    <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, item.key)} />
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {/* Tab 2: Theme & Colors */}
      {activeTab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Theme Presets Section */}
          <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesomeIcon sx={{ color: 'primary.main' }} />
                  Curated Theme Presets (12)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  One-click instant theme application across all administrative &amp; user roles without refreshing.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(theme, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", "theme-preset.json");
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    showCustomToast.success("Theme preset exported as theme-preset.json");
                  }}
                >
                  Export Theme
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                >
                  Import Theme
                  <input
                    type="file"
                    hidden
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const imported = JSON.parse(event.target.result);
                            setTheme(imported);
                            showCustomToast.success("Theme preset imported successfully!");
                          } catch (err) {
                            showCustomToast.error("Invalid theme JSON file.");
                          }
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<RestartAltIcon />}
                  onClick={() => {
                    const defaultThemeObj = {
                      primary_color: '#4F46E5',
                      secondary_color: '#0EA5E9',
                      accent_color: '#4338CA',
                      bg_color: '#F8FAFC',
                      card_color: '#FFFFFF',
                      sidebar_color: '#1E1B4B',
                      border_radius: 12,
                      mode: 'light'
                    };
                    setTheme(defaultThemeObj);
                    handleSaveSection('theme', defaultThemeObj);
                    showCustomToast.success("Theme reset to factory defaults!");
                  }}
                >
                  Reset Default
                </Button>
              </Box>
            </Box>

            <Grid container spacing={2}>
              {[
                { name: 'Modern Blue', primary_color: '#3B82F6', secondary_color: '#60A5FA', accent_color: '#2563EB', bg_color: '#F8FAFC', card_color: '#FFFFFF', sidebar_color: '#1E293B', mode: 'light' },
                { name: 'Enterprise Gray', primary_color: '#475569', secondary_color: '#64748B', accent_color: '#334155', bg_color: '#F1F5F9', card_color: '#FFFFFF', sidebar_color: '#0F172A', mode: 'light' },
                { name: 'Ocean', primary_color: '#0EA5E9', secondary_color: '#38BDF8', accent_color: '#0284C7', bg_color: '#F0F9FF', card_color: '#FFFFFF', sidebar_color: '#0C4A6E', mode: 'light' },
                { name: 'Forest', primary_color: '#10B981', secondary_color: '#34D399', accent_color: '#059669', bg_color: '#ECFDF5', card_color: '#FFFFFF', sidebar_color: '#064E3B', mode: 'light' },
                { name: 'Royal Purple', primary_color: '#8B5CF6', secondary_color: '#A78BFA', accent_color: '#7C3AED', bg_color: '#F5F3FF', card_color: '#FFFFFF', sidebar_color: '#2E1065', mode: 'light' },
                { name: 'Minimal White', primary_color: '#18181B', secondary_color: '#71717A', accent_color: '#27272A', bg_color: '#FFFFFF', card_color: '#FAFAFA', sidebar_color: '#18181B', mode: 'light' },
                { name: 'Dark Professional', primary_color: '#6366F1', secondary_color: '#818CF8', accent_color: '#4F46E5', bg_color: '#0F172A', card_color: '#1E293B', sidebar_color: '#0F172A', mode: 'dark' },
                { name: 'Emerald', primary_color: '#059669', secondary_color: '#10B981', accent_color: '#047857', bg_color: '#F0FDF4', card_color: '#FFFFFF', sidebar_color: '#064E3B', mode: 'light' },
                { name: 'Corporate', primary_color: '#1E3A8A', secondary_color: '#3B82F6', accent_color: '#1D4ED8', bg_color: '#F8FAFC', card_color: '#FFFFFF', sidebar_color: '#172554', mode: 'light' },
                { name: 'Midnight', primary_color: '#A855F7', secondary_color: '#C084FC', accent_color: '#9333EA', bg_color: '#0B0F19', card_color: '#111827', sidebar_color: '#0B0F19', mode: 'dark' },
                { name: 'Sunset', primary_color: '#F97316', secondary_color: '#FB923C', accent_color: '#EA580C', bg_color: '#FFF7ED', card_color: '#FFFFFF', sidebar_color: '#431407', mode: 'light' },
                { name: 'Material Default', primary_color: '#1976D2', secondary_color: '#9C27B0', accent_color: '#1565C0', bg_color: '#F5F5F5', card_color: '#FFFFFF', sidebar_color: '#121212', mode: 'light' },
              ].map((preset) => {
                const isSelected = theme.primary_color === preset.primary_color && theme.mode === preset.mode;
                return (
                  <Grid xs={12} sm={6} md={3} key={preset.name}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2, borderRadius: '14px', border: '2px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        bgcolor: preset.card_color,
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }
                      }}
                      onClick={() => {
                        const updatedTheme = { ...theme, ...preset };
                        setTheme(updatedTheme);
                        handleSaveSection('theme', updatedTheme);
                        showCustomToast.success(`Theme "${preset.name}" applied!`);
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: preset.mode === 'dark' ? '#fff' : 'text.primary' }}>
                          {preset.name}
                        </Typography>
                        {isSelected && <Chip label="Active" size="small" color="primary" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800 }} />}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.8, mb: 1 }}>
                        <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: preset.primary_color, border: '1px solid #fff' }} />
                        <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: preset.secondary_color, border: '1px solid #fff' }} />
                        <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: preset.accent_color, border: '1px solid #fff' }} />
                        <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: preset.sidebar_color, border: '1px solid #fff' }} />
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Card>

          {/* Color & Layout Fine-Tuning */}
          <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Theme Colors &amp; Fine-Tuning
            </Typography>
            <Grid container spacing={3}>
              {['primary_color', 'secondary_color', 'accent_color', 'success_color', 'warning_color', 'danger_color', 'bg_color', 'card_color', 'sidebar_color'].map((colorKey) => (
                <Grid xs={12} sm={4} key={colorKey}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input
                      type="color"
                      value={theme[colorKey] || '#4F46E5'}
                      onChange={(e) => setTheme({ ...theme, [colorKey]: e.target.value })}
                      style={{ width: 44, height: 44, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                    />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        {colorKey.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {theme[colorKey] || '#4F46E5'}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
              <Grid xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Border Radius (px)"
                  type="number"
                  value={theme.border_radius ?? 12}
                  onChange={(e) => setTheme({ ...theme, border_radius: parseInt(e.target.value) || 0 })}
                />
              </Grid>
              <Grid xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Theme Mode</InputLabel>
                  <Select
                    value={theme.mode || 'light'}
                    label="Theme Mode"
                    onChange={(e) => setTheme({ ...theme, mode: e.target.value })}
                  >
                    <MenuItem value="light">Light Mode</MenuItem>
                    <MenuItem value="dark">Dark Mode</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  const dup = { ...theme };
                  setTheme(dup);
                  showCustomToast.success("Theme duplicated to custom buffer.");
                }}
              >
                Duplicate Theme
              </Button>
              <Button
                variant="contained"
                onClick={() => handleSaveSection('theme', theme)}
                disabled={saving}
                startIcon={<SaveIcon />}
                sx={{ backgroundColor: '#4F46E5', color: '#ffffff !important', px: 4, py: 1.2, borderRadius: '10px' }}
              >
                {saving ? 'Applying...' : 'Save Theme Configuration'}
              </Button>
            </Box>
          </Card>
        </Box>
      )}

      {/* Tab 3: Login Page Customizer */}
      {activeTab === 3 && (
        <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Login Page Branding & Content
          </Typography>
          <Grid container spacing={2.5}>
            {Object.keys(login).map((key) => (
              <Grid xs={12} sm={6} key={key}>
                <TextField
                  fullWidth
                  label={key.replace(/_/g, ' ').toUpperCase()}
                  value={login[key] || ''}
                  onChange={(e) => setLogin({ ...login, [key]: e.target.value })}
                />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={() => handleSaveSection('login', login)}
              disabled={saving}
              startIcon={<SaveIcon />}
              sx={{ backgroundColor: '#4F46E5', color: '#ffffff !important', px: 4, py: 1.2, borderRadius: '10px' }}
            >
              Save Login Settings
            </Button>
          </Box>
        </Card>
      )}

      {/* Tab 4: Dashboard Customizer */}
      {activeTab === 4 && (
        <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Dashboard Content & Widget Visibility
          </Typography>
          <Grid container spacing={2.5}>
            <Grid xs={12}>
              <TextField
                fullWidth
                label="Dashboard Welcome Text"
                value={dashboard.welcome_text || ''}
                onChange={(e) => setDashboard({ ...dashboard, welcome_text: e.target.value })}
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                fullWidth
                label="Recent Activity Table Title"
                value={dashboard.recent_activity_title || ''}
                onChange={(e) => setDashboard({ ...dashboard, recent_activity_title: e.target.value })}
              />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={() => handleSaveSection('dashboard', dashboard)}
              disabled={saving}
              startIcon={<SaveIcon />}
              sx={{ backgroundColor: '#4F46E5', color: '#ffffff !important', px: 4, py: 1.2, borderRadius: '10px' }}
            >
              Save Dashboard Settings
            </Button>
          </Box>
        </Card>
      )}

      {/* Tab 5: Dynamic Text (i18n) */}
      {activeTab === 5 && (
        <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Dynamic UI Text & Multi-Language Dictionary
          </Typography>
          <Grid container spacing={3}>
            <Grid xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main' }}>
                English UI Strings
              </Typography>
              {Object.keys(dynamicText.en || {}).map((key) => (
                <TextField
                  key={key}
                  fullWidth
                  size="small"
                  label={key}
                  value={dynamicText.en[key] || ''}
                  onChange={(e) => setDynamicText({
                    ...dynamicText,
                    en: { ...dynamicText.en, [key]: e.target.value }
                  })}
                  sx={{ mb: 1.5 }}
                />
              ))}
            </Grid>
            <Grid xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'secondary.main' }}>
                Tamil UI Strings (தமிழ்)
              </Typography>
              {Object.keys(dynamicText.ta || {}).map((key) => (
                <TextField
                  key={key}
                  fullWidth
                  size="small"
                  label={`${key} (Tamil)`}
                  value={dynamicText.ta[key] || ''}
                  onChange={(e) => setDynamicText({
                    ...dynamicText,
                    ta: { ...dynamicText.ta, [key]: e.target.value }
                  })}
                  sx={{ mb: 1.5 }}
                />
              ))}
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={() => handleSaveSection('dynamic_text', dynamicText)}
              disabled={saving}
              startIcon={<SaveIcon />}
              sx={{ backgroundColor: '#4F46E5', color: '#ffffff !important', px: 4, py: 1.2, borderRadius: '10px' }}
            >
              Save Dynamic Translations
            </Button>
          </Box>
        </Card>
      )}

      {/* Tab 6: Custom Code (CSS/JS) */}
      {activeTab === 6 && (
        <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Advanced Custom CSS & JavaScript Injector
          </Typography>
          <Grid container spacing={3}>
            <Grid xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Custom Global CSS (Injected into <head>)"
                value={customCode.custom_css || ''}
                onChange={(e) => setCustomCode({ ...customCode, custom_css: e.target.value })}
                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
              />
            </Grid>
            <Grid xs={12}>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Custom Global JavaScript (Executed in <body>)"
                value={customCode.custom_js || ''}
                onChange={(e) => setCustomCode({ ...customCode, custom_js: e.target.value })}
                inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
              />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              onClick={() => handleSaveSection('custom_code', customCode)}
              disabled={saving}
              startIcon={<SaveIcon />}
              sx={{ backgroundColor: '#4F46E5', color: '#ffffff !important', px: 4, py: 1.2, borderRadius: '10px' }}
            >
              Inject Code Changes
            </Button>
          </Box>
        </Card>
      )}

      {/* Tab 7: Live Preview */}
      {activeTab === 7 && (
        <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Real-Time Live Device Preview
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton color={previewDevice === 'mobile' ? 'primary' : 'default'} onClick={() => setPreviewDevice('mobile')}>
                <PhoneIphoneIcon />
              </IconButton>
              <IconButton color={previewDevice === 'tablet' ? 'primary' : 'default'} onClick={() => setPreviewDevice('tablet')}>
                <TabletIcon />
              </IconButton>
              <IconButton color={previewDevice === 'desktop' ? 'primary' : 'default'} onClick={() => setPreviewDevice('desktop')}>
                <LaptopIcon />
              </IconButton>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              p: 3,
              borderRadius: '16px',
              minHeight: 500
            }}
          >
            <Box
              component="iframe"
              src={window.location.origin}
              sx={{
                width: previewDevice === 'mobile' ? '375px' : previewDevice === 'tablet' ? '768px' : '100%',
                height: '600px',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px',
                bgcolor: 'background.paper',
                transition: 'all 0.3s ease'
              }}
            />
          </Box>
        </Card>
      )}

      {/* Tab 8: Website Builder */}
      {activeTab === 8 && (
        <WebsiteBuilderTab />
      )}
    </Box>
  );
};

export default CustomizerHub;
