import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Switch,
  FormControlLabel, Button, TextField, MenuItem, Select,
  FormControl, InputLabel, Divider, Alert, Avatar, Chip,
  Tabs, Tab, Slider, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, CircularProgress,
  Tooltip, Badge, InputAdornment, LinearProgress, Autocomplete, Checkbox
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import StorageIcon from '@mui/icons-material/Storage';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SchoolIcon from '@mui/icons-material/School';
import CategoryIcon from '@mui/icons-material/Category';
import BusinessIcon from '@mui/icons-material/Business';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import DescriptionIcon from '@mui/icons-material/Description';
import HandshakeIcon from '@mui/icons-material/Handshake';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import SecurityIcon from '@mui/icons-material/Security';

import { useThemeMode } from '../context/ThemeContext';
import MailIcon from '@mui/icons-material/Mail';
import SendIcon from '@mui/icons-material/Send';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import GoogleDriveSettingsTab from '../components/GoogleDriveSettingsTab';
import ImportExportTab from '../components/ImportExportTab';
import CustomizerHub from '../components/CustomizerHub/CustomizerHub';
import { showCustomToast } from '../utils/customToast';
import { triggerGlobalAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';
import {
  getMasterDeptCategories, createMasterDeptCategory, updateMasterDeptCategory, deleteMasterDeptCategory,
  getMasterDepartments, createMasterDepartment, updateMasterDepartment, deleteMasterDepartment,
  getMasterCollabTypes, createMasterCollabType, updateMasterCollabType, deleteMasterCollabType,
  getMasterOrgTypes, createMasterOrgType, updateMasterOrgType, deleteMasterOrgType,
  getMasterDocTypes, createMasterDocType, updateMasterDocType, deleteMasterDocType,
  getMasterTags, createMasterTag, updateMasterTag, deleteMasterTag,
  getMasterCategories, createMasterCategory, updateMasterCategory, deleteMasterCategory
} from '../services/templateApi';

// ── Tab Panel Wrapper ──────────────────────────────────────────────────────────
function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ── Master Data Config sub-tab config ────────────────────────────────────────
const MASTER_TABS = [
  { label: 'Template Categories', fetch: getMasterCategories,     create: createMasterCategory,     update: updateMasterCategory,     del: deleteMasterCategory     },
  { label: 'Organization Types',  fetch: getMasterOrgTypes,       create: createMasterOrgType,       update: updateMasterOrgType,       del: deleteMasterOrgType       },
  { label: 'Collaboration Types', fetch: getMasterCollabTypes,    create: createMasterCollabType,    update: updateMasterCollabType,    del: deleteMasterCollabType    },
  { label: 'Document Types',      fetch: getMasterDocTypes,       create: createMasterDocType,       update: updateMasterDocType,       del: deleteMasterDocType       },
  { label: 'Tags',                fetch: getMasterTags,           create: createMasterTag,           update: updateMasterTag,           del: deleteMasterTag           },
  { label: 'Dept. Categories',    fetch: getMasterDeptCategories, create: createMasterDeptCategory,  update: updateMasterDeptCategory,  del: deleteMasterDeptCategory  },
  { label: 'Departments',         fetch: getMasterDepartments,    create: createMasterDepartment,    update: updateMasterDepartment,    del: deleteMasterDepartment    },
];

const MasterDataTab = () => {
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [mdLoading, setMdLoading] = useState(false);
  const [mdError, setMdError] = useState(null);
  const [mdSuccess, setMdSuccess] = useState(null);
  const [mdData, setMdData] = useState([]);

  useEffect(() => {
    if (mdError) {
      const timer = setTimeout(() => setMdError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [mdError]);

  useEffect(() => {
    if (mdSuccess) {
      const timer = setTimeout(() => setMdSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [mdSuccess]);
  const [deptCategories, setDeptCategories] = useState([]);
  const [mdOpen, setMdOpen] = useState(false);
  const [mdEditId, setMdEditId] = useState(null);
  const [mdName, setMdName] = useState('');
  const [mdSelectedCat, setMdSelectedCat] = useState('');
  const [mdSaving, setMdSaving] = useState(false);

  // Helper to extract error message from API response
  const extractError = (err) =>
    err?.response?.data?.detail ||
    err?.response?.data?.name?.[0] ||
    err?.message ||
    'An unexpected error occurred.';

  const currentMdTab = MASTER_TABS[activeSubTab];
  const isDeptTab = activeSubTab === 6;

  const loadMdData = async () => {
    setMdLoading(true); setMdError(null);
    try {
      const result = await currentMdTab.fetch();
      setMdData(result);
      if (isDeptTab) {
        const cats = await getMasterDeptCategories();
        setDeptCategories(cats);
      }
    } catch (err) {
      console.error(err);
      setMdError('Failed to load lookup data.');
    } finally {
      setMdLoading(false);
    }
  };

  useEffect(() => { loadMdData(); }, [activeSubTab]);

  const openMdDialog = (item = null) => {
    setMdEditId(item ? item.id : null);
    setMdName(item ? item.name : '');
    setMdSelectedCat(item ? (item.category || '') : '');
    setMdOpen(true);
  };

  const closeMdDialog = () => { setMdOpen(false); setMdName(''); setMdSelectedCat(''); };

  const handleMdSave = async () => {
    if (!mdName.trim()) return;
    const payload = { name: mdName.trim() };
    if (isDeptTab) payload.category = mdSelectedCat;
    setMdSaving(true);
    try {
      if (mdEditId) await currentMdTab.update(mdEditId, { ...payload, is_active: true });
      else await currentMdTab.create(payload);
      closeMdDialog();
      loadMdData();
    } catch (err) {
      console.error(err);
      setMdError(extractError(err));
    } finally {
      setMdSaving(false);
    }
  };

  const handleMdToggle = async (item) => {
    try {
      const payload = { name: item.name, is_active: !item.is_active };
      if (isDeptTab) payload.category = item.category;
      await currentMdTab.update(item.id, payload);
      loadMdData();
    } catch (err) { setMdError(extractError(err)); }
  };

  const handleMdDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? Items linked to active records cannot be removed — deactivate them instead.`)) return;
    try {
      await currentMdTab.del(id);
      setMdSuccess(`"${name}" deleted successfully.`);
      loadMdData();
    }
    catch (err) { setMdError(extractError(err)); }
  };

  return (
    <Box>
      <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Master Data Configuration</Typography>
          <Typography variant="caption" color="text.secondary">
            Add, update, or deactivate dropdown options used across MOU forms and user management.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openMdDialog()}
          sx={{ borderRadius: '20px', px: 2.5, fontWeight: 700, flexShrink: 0 }}>
          Add Option
        </Button>
      </Box>

      {mdError && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: '12px' }}
          onClose={() => setMdError(null)}
        >
          {mdError}
        </Alert>
      )}

      {mdSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 2, borderRadius: '12px' }}
          onClose={() => setMdSuccess(null)}
        >
          {mdSuccess}
        </Alert>
      )}

      <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Tabs value={activeSubTab} onChange={(_, v) => setActiveSubTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { fontWeight: 700, py: 1.8, fontSize: '0.8rem' } }}>
          {MASTER_TABS.map((t, i) => <Tab key={i} label={t.label} />)}
        </Tabs>

        {mdLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 'none', borderRadius: '0 0 16px 16px' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Lookup Value</TableCell>
                  {isDeptTab && <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>}
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mdData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isDeptTab ? 5 : 4} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No lookup values added yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : mdData.map(item => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.id}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                    {isDeptTab && <TableCell><Chip label={item.category_name || 'Unassigned'} size="small" color="primary" variant="outlined" /></TableCell>}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Switch size="small" checked={item.is_active} onChange={() => handleMdToggle(item)} />
                        <Chip label={item.is_active ? 'Active' : 'Disabled'} size="small"
                          color={item.is_active ? 'success' : 'default'} sx={{ fontWeight: 800, height: 20 }} />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openMdDialog(item)} sx={{ mr: 1, color: 'primary.main' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleMdDelete(item.id, item.name)} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Dialog open={mdOpen} onClose={closeMdDialog} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {mdEditId ? `Edit ${currentMdTab.label}` : `Add New ${currentMdTab.label}`}
        </DialogTitle>
        <DialogContent dividers>
          <TextField autoFocus margin="dense" label="Name / Value" fullWidth required variant="outlined"
            value={mdName} onChange={e => setMdName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleMdSave()} sx={{ mb: 2 }} />
          {isDeptTab && (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel>Category</InputLabel>
              <Select value={mdSelectedCat} label="Category" onChange={e => setMdSelectedCat(e.target.value)}>
                {deptCategories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeMdDialog} sx={{ fontWeight: 700 }} disabled={mdSaving}>Cancel</Button>
          <Button onClick={handleMdSave} variant="contained" sx={{ borderRadius: '12px', fontWeight: 700 }}
            disabled={mdSaving} startIcon={mdSaving ? <CircularProgress size={14} color="inherit" /> : null}>
            {mdSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── Color Swatch Picker ───────────────────────────────────────────────────────
const PRESET_COLORS = [
  { label: 'Indigo (Default)', primary: '#4F46E5', secondary: '#7C3AED' },
  { label: 'Blue Ocean',       primary: '#0EA5E9', secondary: '#0284C7' },
  { label: 'Emerald Green',    primary: '#10B981', secondary: '#059669' },
  { label: 'Rose Red',         primary: '#F43F5E', secondary: '#E11D48' },
  { label: 'Amber Gold',       primary: '#F59E0B', secondary: '#D97706' },
  { label: 'Teal Cyan',        primary: '#14B8A6', secondary: '#0D9488' },
  { label: 'Purple Violet',    primary: '#8B5CF6', secondary: '#7C3AED' },
  { label: 'Slate Gray',       primary: '#64748B', secondary: '#475569' },
];

const FONT_OPTIONS = [
  { label: 'Plus Jakarta Sans (Default)', value: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" },
  { label: 'Inter',         value: "'Inter', system-ui, sans-serif" },
  { label: 'Roboto',        value: "'Roboto', system-ui, sans-serif" },
  { label: 'Poppins',       value: "'Poppins', system-ui, sans-serif" },
  { label: 'DM Sans',       value: "'DM Sans', system-ui, sans-serif" },
  { label: 'Outfit',        value: "'Outfit', system-ui, sans-serif" },
  { label: 'Nunito',        value: "'Nunito', system-ui, sans-serif" },
];

// ── Inline MasterData List Component ─────────────────────────────────────────
const MasterList = ({ icon, title, color, fetchFn, createFn, updateFn, deleteFn, extraField }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [nameVal, setNameVal] = useState('');
  const [extraVal, setExtraVal] = useState('');
  const [extraOptions, setExtraOptions] = useState([]);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFn();
      setItems(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [fetchFn]);

  useEffect(() => {
    load();
    if (extraField?.fetchOptions) {
      extraField.fetchOptions().then(setExtraOptions).catch(() => {});
    }
  }, [load]);

  const openCreate = () => { setEditItem(null); setNameVal(''); setExtraVal(''); setErr(''); setDialogOpen(true); };
  const openEdit = (item) => { setEditItem(item); setNameVal(item.name); setExtraVal(item[extraField?.key] || ''); setErr(''); setDialogOpen(true); };

  const handleSave = async () => {
    if (!nameVal.trim()) { setErr('Name is required.'); return; }
    const payload = { name: nameVal.trim() };
    if (extraField) payload[extraField.key] = extraVal;
    try {
      if (editItem) { await updateFn(editItem.id, { ...payload, is_active: true }); }
      else { await createFn(payload); }
      setDialogOpen(false);
      load();
    } catch (e) {
      setErr(e?.response?.data?.name?.[0] || 'Save failed. Value may be a duplicate.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item? Items linked to active records cannot be removed.')) return;
    try { await deleteFn(id); load(); }
    catch { setErr('Cannot delete — item is currently in use.'); }
  };

  return (
    <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: `${color}18` }}>
              {React.cloneElement(icon, { sx: { fontSize: '1rem', color } })}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1 }}>{title}</Typography>
              <Typography variant="caption" color="text.secondary">{items.length} items</Typography>
            </Box>
          </Box>
          <Tooltip title={`Add ${title}`}>
            <IconButton
              size="small"
              onClick={openCreate}
              sx={{ bgcolor: `${color}15`, color, '&:hover': { bgcolor: `${color}25` }, borderRadius: '10px' }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="caption" color="text.secondary">No items yet. Click + to add.</Typography>
              </Box>
            ) : (
              items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    px: 2.5, py: 1.2,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid', borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background 0.15s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        bgcolor: item.is_active !== false ? color : '#94A3B8',
                        flexShrink: 0
                      }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </Typography>
                      {extraField && item[`${extraField.key}_name`] && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {item[`${extraField.key}_name`]}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                    <IconButton size="small" onClick={() => openEdit(item)} sx={{ color: 'primary.main', p: 0.5 }}>
                      <EditIcon sx={{ fontSize: '0.85rem' }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(item.id)} sx={{ color: 'error.main', p: 0.5 }}>
                      <DeleteIcon sx={{ fontSize: '0.85rem' }} />
                    </IconButton>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {editItem ? `Edit ${title}` : `Add ${title}`}
        </DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{err}</Alert>}
          <TextField
            autoFocus
            label="Name / Value"
            fullWidth
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            sx={{ mt: 1 }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          {extraField && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>{extraField.label}</InputLabel>
              <Select value={extraVal} label={extraField.label} onChange={e => setExtraVal(e.target.value)}>
                {extraOptions.map(opt => (
                  <MenuItem key={opt.id} value={opt.id}>{opt.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ borderRadius: '12px', fontWeight: 700 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};


// ── Email Settings Component for Super Admin ─────────────────────────────────
const SMTP_PROVIDERS = [
  { label: 'Google Gmail (smtp.gmail.com)', host: 'smtp.gmail.com', port: 587, useTls: true, useSsl: false },
  { label: 'Outlook / Hotmail / Live (smtp.office365.com)', host: 'smtp.office365.com', port: 587, useTls: true, useSsl: false },
  { label: 'Microsoft 365 (smtp.office365.com)', host: 'smtp.office365.com', port: 587, useTls: true, useSsl: false },
  { label: 'Yahoo Mail (TLS - Port 587)', host: 'smtp.mail.yahoo.com', port: 587, useTls: true, useSsl: false },
  { label: 'Yahoo Mail (SSL - Port 465)', host: 'smtp.mail.yahoo.com', port: 465, useTls: false, useSsl: true },
  { label: 'Zoho Mail (smtp.zoho.com)', host: 'smtp.zoho.com', port: 587, useTls: true, useSsl: false },
  { label: 'SendGrid (smtp.sendgrid.net)', host: 'smtp.sendgrid.net', port: 587, useTls: true, useSsl: false },
  { label: 'Custom SMTP Server', host: '', port: 587, useTls: true, useSsl: false },
];

const EmailSettingsTab = () => {
  const [smtpList, setSmtpList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  // Form states
  const [editingId, setEditingId] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(SMTP_PROVIDERS[0].label);
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useTls, setUseTls] = useState(true);
  const [useSsl, setUseSsl] = useState(false);
  const [senderEmail, setSenderEmail] = useState('');

  // Test connection state
  const [testEmail, setTestEmail] = useState('');
  const [testingId, setTestingId] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authRequired, setAuthRequired] = useState(true);

  const handleProviderChange = (e) => {
    const pName = e.target.value;
    setSelectedProvider(pName);
    const preset = SMTP_PROVIDERS.find(p => p.label === pName);
    if (preset && preset.label !== 'Custom SMTP Server') {
      setHost(preset.host);
      setPort(preset.port);
      setUseTls(preset.useTls);
      setUseSsl(preset.useSsl);
    }
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/users/smtp-settings/');
      setSmtpList(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load SMTP configurations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setSelectedProvider(SMTP_PROVIDERS[0].label);
    setHost('smtp.gmail.com');
    setPort(587);
    setUsername('');
    setPassword('');
    setUseTls(true);
    setUseSsl(false);
    setSenderEmail('');
    setAuthRequired(true);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (smtp) => {
    setEditingId(smtp.id);
    const matchingPreset = SMTP_PROVIDERS.find(p => p.host === smtp.host && p.port === Number(smtp.port));
    setSelectedProvider(matchingPreset ? matchingPreset.label : 'Custom SMTP Server');
    setHost(smtp.host);
    setPort(smtp.port);
    setUsername(smtp.username || '');
    setPassword(smtp.password || '');
    setUseTls(smtp.use_tls);
    setUseSsl(smtp.use_ssl);
    setSenderEmail(smtp.sender_email);
    setAuthRequired(smtp.auth_required ?? true);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!host || !port || !senderEmail || (authRequired && (!username || (!editingId && !password)))) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    setSuccess(null);
    const payload = {
      host,
      port: parseInt(port),
      username: authRequired ? username : '',
      auth_required: authRequired,
      use_tls: useTls,
      use_ssl: useSsl,
      sender_email: senderEmail,
    };
    if (authRequired && password) {
      payload.password = password;
    } else if (!authRequired) {
      payload.password = '';
    }

    try {
      if (editingId) {
        await api.put(`/api/users/smtp-settings/${editingId}/`, payload);
        setSuccess('SMTP configuration updated successfully.');
      } else {
        // If it's the first config, default to active
        await api.post('/api/users/smtp-settings/', { ...payload, is_active: smtpList.length === 0 });
        setSuccess('SMTP configuration created successfully.');
      }
      setDialogOpen(false);
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save SMTP configuration.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) return;
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/api/users/smtp-settings/${id}/`);
      setSuccess('SMTP configuration deleted successfully.');
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete SMTP configuration.');
    }
  };

  const handleToggleActive = async (smtp) => {
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/api/users/smtp-settings/${smtp.id}/`, { is_active: !smtp.is_active });
      setSuccess(smtp.is_active ? 'SMTP configuration deactivated.' : 'SMTP configuration activated successfully.');
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to toggle activation.');
    }
  };

  const handleOpenTest = (id) => {
    setTestingId(id);
    setTestEmail('');
    setTestDialogOpen(true);
  };

  const handleTestConnection = async () => {
    if (!testEmail) return;
    setTestingConnection(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.post(`/api/users/smtp-settings/${testingId}/test-connection/`, { test_email: testEmail });
      if (response.data?.success === false) {
        setError(response.data.detail || 'Test connection failed.');
      } else {
        setSuccess(response.data.detail || 'Test email sent successfully.');
        setTestDialogOpen(false);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Test connection failed.');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Custom SMTP Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure custom outgoing SMTP mail servers. Active configurations will override standard env settings.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ borderRadius: '12px', fontWeight: 700 }}
        >
          Add SMTP
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : smtpList.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px', bgcolor: 'action.hover', border: '1px dashed', borderColor: 'divider' }}>
          <MailIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>No Custom SMTP Servers</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Currently using default environment-configured mail credentials.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ borderRadius: '10px' }}>
            Configure New SMTP
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Host</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Port</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sender Email</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {smtpList.map((smtp) => (
                <TableRow key={smtp.id} hover>
                  <TableCell>
                    <Chip
                      label={smtp.is_active ? 'Active' : 'Inactive'}
                      color={smtp.is_active ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 700, borderRadius: '8px' }}
                    />
                  </TableCell>
                  <TableCell>{smtp.host}</TableCell>
                  <TableCell>{smtp.port}</TableCell>
                  <TableCell>{smtp.username}</TableCell>
                  <TableCell>{smtp.sender_email}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant={smtp.is_active ? 'outlined' : 'contained'}
                        color={smtp.is_active ? 'warning' : 'primary'}
                        onClick={() => handleToggleActive(smtp)}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                      >
                        {smtp.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <IconButton size="small" color="primary" onClick={() => handleOpenEdit(smtp)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="info" onClick={() => handleOpenTest(smtp.id)}>
                        <SendIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(smtp.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingId ? 'Edit SMTP Configuration' : 'Add SMTP Configuration'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
          {/* SMTP Provider Select Dropdown */}
          <FormControl fullWidth>
            <InputLabel id="smtp-provider-select-label" sx={{ fontWeight: 700 }}>SMTP Mail Provider Preset</InputLabel>
            <Select
              labelId="smtp-provider-select-label"
              value={selectedProvider}
              label="SMTP Mail Provider Preset"
              onChange={handleProviderChange}
              sx={{ borderRadius: '10px' }}
            >
              {SMTP_PROVIDERS.map((provider) => (
                <MenuItem key={provider.label} value={provider.label} sx={{ fontWeight: 600 }}>
                  {provider.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Host & Port Row */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              sx={{ flex: 2 }}
              label="SMTP Host"
              required
              value={host}
              onChange={e => {
                setHost(e.target.value);
                setSelectedProvider('Custom SMTP Server');
              }}
            />
            <TextField
              sx={{ flex: 1 }}
              type="number"
              label="Port"
              required
              value={port}
              onChange={e => setPort(e.target.value)}
            />
          </Box>

          {/* Sender Email */}
          <TextField
            fullWidth
            label="Sender Email (From Email)"
            required
            type="email"
            value={senderEmail}
            onChange={e => setSenderEmail(e.target.value)}
            helperText="Email address that will appear in the 'From' header."
          />

          {/* Requires Authentication Switch */}
          <FormControlLabel
            control={<Switch checked={authRequired} onChange={e => setAuthRequired(e.target.checked)} />}
            label="SMTP Server Requires Authentication"
            sx={{ mb: 0.5 }}
          />

          {authRequired && (
            <>
              {/* SMTP Username */}
              <TextField
                fullWidth
                label="SMTP Username"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
              />

              {/* SMTP Password */}
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="SMTP Password"
                required={!editingId}
                value={password}
                onChange={e => setPassword(e.target.value)}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
            </>
          )}

          {/* SSL/TLS Toggles */}
          <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
            <FormControlLabel
              control={<Switch checked={useTls} onChange={e => {
                setUseTls(e.target.checked);
                if (e.target.checked) setUseSsl(false);
              }} />}
              label="Use TLS"
            />
            <FormControlLabel
              control={<Switch checked={useSsl} onChange={e => {
                setUseSsl(e.target.checked);
                if (e.target.checked) setUseTls(false);
              }} />}
              label="Use SSL"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ borderRadius: '10px', fontWeight: 700 }}>
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Test SMTP Connection</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Send a test MCC invitation email to verify this outgoing SMTP mail server configuration.
          </Typography>
          <TextField
            fullWidth
            required
            label="Recipient Email Address"
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            disabled={testingConnection}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setTestDialogOpen(false)} disabled={testingConnection}>Cancel</Button>
          <Button
            onClick={handleTestConnection}
            variant="contained"
            disabled={testingConnection || !testEmail}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {testingConnection ? 'Sending...' : 'Send Test Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SMTP Setup Guidelines Card */}
      <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'action.hover', p: 4, mt: 4 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
          <SettingsSuggestIcon color="primary" /> Steps to Follow for SMTP Mail Setup
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
          Follow these clear steps to configure custom outgoing SMTP mail servers for automated notifications & password resets:
        </Typography>
        <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 1.8, fontSize: '0.86rem', lineHeight: 1.6, color: 'text.primary' } }}>
          <li>
            <strong>Step 1: Obtain SMTP Host & Port Credentials</strong><br />
            For <em>Gmail / Google Workspace</em>: Host <code>smtp.gmail.com</code>, Port <code>587</code> (TLS) or <code>465</code> (SSL).<br />
            For <em>Microsoft Outlook / Office 365</em>: Host <code>smtp.office365.com</code>, Port <code>587</code> (TLS).
          </li>
          <li>
            <strong>Step 2: Generate Gmail App Password (Required for 2FA Account)</strong><br />
            If using Gmail with 2-Step Verification enabled, go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">Google Account &gt; Security &gt; App Passwords</a>. Generate a 16-character App Password and use it as your <strong>SMTP Password</strong> instead of your personal login password.
          </li>
          <li>
            <strong>Step 3: Add New SMTP Configuration</strong><br />
            Click the <strong style={{ color: 'var(--indigo)' }}>"Add SMTP"</strong> or <strong style={{ color: 'var(--indigo)' }}>"Configure New SMTP"</strong> button above. Select a preset mail provider or enter your Host, Port, Username, Password, and Sender Email address.
          </li>
          <li>
            <strong>Step 4: Activate & Test Outgoing Mail Connection</strong><br />
            Click <strong>Save Settings</strong>, then click <strong>Activate</strong> on your new configuration. Click the <strong>Send Test Email</strong> icon to deliver a sample email and verify active delivery.
          </li>
        </Box>
      </Card>
    </Box>
  );
};


// ── Module Permissions Access Rights Matrix Component ───────────────────────
const ModulePermissionsMatrix = () => {
  const [modules, setModules] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modRes, userRes] = await Promise.all([
        api.get('/api/users/custom-pages/'),
        api.get('/api/users/')
      ]);
      setModules(modRes.data);
      setSystemUsers(userRes.data.results || userRes.data || []);
    } catch (err) {
      console.error('Failed to load module access matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleToggle = (modId, roleName) => {
    setModules(prev => prev.map(m => {
      if (m.id !== modId) return m;
      const currentRoles = m.allowed_roles?.length > 0 ? m.allowed_roles : ['Super Admin', 'Admin', 'User'];
      let updated;
      if (currentRoles.includes(roleName)) {
        updated = currentRoles.filter(r => r !== roleName);
      } else {
        updated = [...currentRoles, roleName];
      }
      return { ...m, allowed_roles: updated };
    }));
  };

  const handleUserAccessChange = (modId, selectedUserIds) => {
    setModules(prev => prev.map(m => {
      if (m.id !== modId) return m;
      return { ...m, allowed_permissions: selectedUserIds };
    }));
  };

  const handleSaveModuleAccess = async (mod) => {
    setSavingId(mod.id);
    try {
      await api.patch(`/api/users/custom-pages/${mod.id}/`, {
        allowed_roles: mod.allowed_roles,
        allowed_permissions: mod.allowed_permissions
      });
      triggerGlobalAutoRefresh(REFRESH_CATEGORIES.SETTINGS);
      showCustomToast.success(`Access rights updated for "${mod.title}"!`);
    } catch (err) {
      showCustomToast.error(`Failed to update access for "${mod.title}".`);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading module access matrix...</Typography>
      </Box>
    );
  }

  return (
    <Card sx={{ borderRadius: '18px', border: '1px solid', borderColor: 'divider', p: 3, boxShadow: 'none' }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon color="primary" />
          Module Access Control Matrix
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Grant or revoke module access permissions for Admin, User, and specific individual users.
        </Typography>
      </Box>

      {modules.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>No dynamic modules created yet in Website Builder.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '14px' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Module Title &amp; Route</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Super Admin</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Admin Access</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>User Access</TableCell>
                <TableCell sx={{ fontWeight: 800, minWidth: 260 }}>Grant Access to Specific Users</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {modules.map((mod) => {
                const roles = mod.allowed_roles?.length > 0 ? mod.allowed_roles : ['Super Admin', 'Admin', 'User'];
                const allowedUserIds = mod.allowed_permissions || [];
                const isSaving = savingId === mod.id;
                return (
                  <TableRow key={mod.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{mod.title}</Typography>
                      <Chip label={`/custom-page/${mod.slug}`} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 18 }} />
                    </TableCell>
                    <TableCell>
                      <Checkbox checked disabled size="small" />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={roles.includes('Admin')}
                        onChange={() => handleRoleToggle(mod.id, 'Admin')}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={roles.includes('User')}
                        onChange={() => handleRoleToggle(mod.id, 'User')}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Autocomplete
                        multiple
                        size="small"
                        options={systemUsers}
                        getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name || option.username} (${option.email})`}
                        value={systemUsers.filter(u => allowedUserIds.includes(String(u.id)) || allowedUserIds.includes(u.email))}
                        onChange={(event, newValue) => {
                          handleUserAccessChange(mod.id, newValue.map(u => String(u.id)));
                        }}
                        renderInput={(params) => (
                          <TextField {...params} size="small" placeholder="Select specific users..." />
                        )}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleSaveModuleAccess(mod)}
                        disabled={isSaving}
                        sx={{ borderRadius: '8px', fontWeight: 700 }}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
};


// ── Google Drive Settings Component ───────────────────────────────────────────;


// ── Main Settings Component ───────────────────────────────────────────────────
const Settings = () => {
  const { mode, toggleTheme, primaryColor, secondaryColor, fontFamily, borderRadius: themeBorderRadius, applyAppearance } = useThemeMode();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [savedSuccess, setSavedSuccess] = useState('');

  // Auto-switch to Google Drive tab (Tab index 5) when returning from Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('drive') || params.has('code') || params.get('tab') === 'drive') {
      setActiveTab(5);
    }
  }, []);

  // ── Appearance State ──
  const [selectedPreset, setSelectedPreset] = useState(() => {
    const saved = localStorage.getItem('app_primary_color');
    const preset = PRESET_COLORS.find(p => p.primary === saved);
    return preset ? preset.label : 'Indigo (Default)';
  });
  const [customPrimary, setCustomPrimary] = useState(() => localStorage.getItem('app_primary_color') || '#4F46E5');
  const [customSecondary, setCustomSecondary] = useState(() => localStorage.getItem('app_secondary_color') || '#7C3AED');
  const [selectedFont, setSelectedFont] = useState(() => localStorage.getItem('app_font_family') || FONT_OPTIONS[0].value);
  const [radiusValue, setRadiusValue] = useState(() => parseInt(localStorage.getItem('app_border_radius') || '14'));

  // ── Notification State ──
  const [emailAlerts, setEmailAlerts] = useState(() => JSON.parse(localStorage.getItem('notify_email') ?? 'true'));
  const [inAppAlerts, setInAppAlerts] = useState(() => JSON.parse(localStorage.getItem('notify_inapp') ?? 'true'));
  const [reminder30Days, setReminder30Days] = useState(() => JSON.parse(localStorage.getItem('remind_30') ?? 'true'));
  const [reminder15Days, setReminder15Days] = useState(() => JSON.parse(localStorage.getItem('remind_15') ?? 'true'));
  const [reminder7Days, setReminder7Days] = useState(() => JSON.parse(localStorage.getItem('remind_7') ?? 'true'));
  const [reminder1Day, setReminder1Day] = useState(() => JSON.parse(localStorage.getItem('remind_1') ?? 'true'));

  // ── Storage State ──
  const [storageThreshold, setStorageThreshold] = useState(() => parseInt(localStorage.getItem('storage_threshold') || '85'));

  // ── Apply preset ──
  const applyPreset = (preset) => {
    setSelectedPreset(preset.label);
    setCustomPrimary(preset.primary);
    setCustomSecondary(preset.secondary);
  };

  // ── Save Appearance ──
  const handleSaveAppearance = () => {
    localStorage.setItem('app_primary_color', customPrimary);
    localStorage.setItem('app_secondary_color', customSecondary);
    localStorage.setItem('app_font_family', selectedFont);
    localStorage.setItem('app_border_radius', String(radiusValue));
    applyAppearance({ primary: customPrimary, secondary: customSecondary, font: selectedFont, radius: radiusValue });
    setSavedSuccess('Appearance settings applied! Reload if colors don\'t update immediately.');
    setTimeout(() => setSavedSuccess(''), 4000);
  };

  const handleResetAppearance = () => {
    const def = PRESET_COLORS[0];
    applyPreset(def);
    setSelectedFont(FONT_OPTIONS[0].value);
    setRadiusValue(14);
  };

  // ── Save Notifications ──
  const handleSaveNotifications = () => {
    localStorage.setItem('notify_email', JSON.stringify(emailAlerts));
    localStorage.setItem('notify_inapp', JSON.stringify(inAppAlerts));
    localStorage.setItem('remind_30', JSON.stringify(reminder30Days));
    localStorage.setItem('remind_15', JSON.stringify(reminder15Days));
    localStorage.setItem('remind_7', JSON.stringify(reminder7Days));
    localStorage.setItem('remind_1', JSON.stringify(reminder1Day));
    setSavedSuccess('Notification preferences saved successfully!');
    setTimeout(() => setSavedSuccess(''), 4000);
  };

  // ── Save Storage ──
  const handleSaveStorage = () => {
    localStorage.setItem('storage_threshold', String(storageThreshold));
    setSavedSuccess('Storage threshold updated successfully!');
    setTimeout(() => setSavedSuccess(''), 4000);
  };

  const tabSx = {
    fontWeight: 700,
    fontSize: '0.82rem',
    textTransform: 'none',
    minHeight: 48,
    '&.Mui-selected': { color: 'primary.main' }
  };

  return (
    <Box sx={{ flexGrow: 1, maxWidth: 1100, mx: 'auto' }} className="animate-fade-slide-up">
      {/* Header */}
      <Box sx={{ mb: 3.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ background: 'linear-gradient(135deg, var(--indigo), var(--violet))', width: 48, height: 48, borderRadius: '14px' }}>
          <SettingsIcon />
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Site Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage appearance, dropdown content, notifications and system preferences.
          </Typography>
        </Box>
      </Box>

      {savedSuccess && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '14px', fontWeight: 700 }}>
          {savedSuccess}
        </Alert>
      )}

      {/* Tabs */}
      <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            slotProps={{ indicator: { sx: { height: 3, borderRadius: '3px 3px 0 0' } } }}
          >
            <Tab icon={<PaletteIcon fontSize="small" />} iconPosition="start" label="Appearance & Customization" sx={tabSx} />
            <Tab icon={<SettingsSuggestIcon fontSize="small" />} iconPosition="start" label="Master Data Config" sx={tabSx} />
            <Tab icon={<NotificationsActiveIcon fontSize="small" />} iconPosition="start" label="Notifications" sx={tabSx} />
            <Tab icon={<StorageIcon fontSize="small" />} iconPosition="start" label="Storage" sx={tabSx} />
            {['Super Admin', 'Admin'].includes(user?.role?.name) && (
              <Tab icon={<MailIcon fontSize="small" />} iconPosition="start" label="Email Settings" sx={tabSx} />
            )}
            {['Super Admin', 'Admin'].includes(user?.role?.name) && (
              <Tab icon={<StorageIcon fontSize="small" />} iconPosition="start" label="Google Drive" sx={tabSx} />
            )}
            {['Super Admin', 'Admin'].includes(user?.role?.name) && (
              <Tab icon={<SecurityIcon fontSize="small" />} iconPosition="start" label="Module Permissions" sx={tabSx} />
            )}
            {['Super Admin', 'Admin'].includes(user?.role?.name) && (
              <Tab icon={<SystemUpdateAltIcon fontSize="small" />} iconPosition="start" label="Import & Export" sx={tabSx} />
            )}
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>

          {/* ════════════════════════ TAB 0: APPEARANCE & WEBSITE CUSTOMIZATION ════════════════════════ */}
          <TabPanel value={activeTab} index={0}>
            <CustomizerHub />
          </TabPanel>

          {/* ════════════════════════ TAB 2: MASTER DATA CONFIG ════════════════════════ */}
          <TabPanel value={activeTab} index={1}>
            <MasterDataTab />
          </TabPanel>

          {/* ════════════════════════ TAB 3: NOTIFICATIONS ════════════════════════ */}
          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={3}>
              <Grid xs={12} md={6}>
                <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <NotificationsActiveIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Alert Channels</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
                      The system checks active MOUs daily at midnight and triggers alerts for assigned users.
                    </Typography>
                    <FormControlLabel
                      control={<Switch checked={emailAlerts} onChange={e => setEmailAlerts(e.target.checked)} color="primary" />}
                      label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Send Email Reminders to Owners</Typography>}
                      sx={{ mb: 1, display: 'block' }}
                    />
                    <FormControlLabel
                      control={<Switch checked={inAppAlerts} onChange={e => setInAppAlerts(e.target.checked)} color="primary" />}
                      label={<Typography variant="body2" sx={{ fontWeight: 700 }}>In-App Notifications Bar Alerts</Typography>}
                      sx={{ mb: 1, display: 'block' }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              <Grid xs={12} md={6}>
                <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', display: 'block', mb: 2 }}>
                      Reminder Intervals Before MOU Expiry
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {[
                        { label: '30 Days Before (Warning)', state: reminder30Days, set: setReminder30Days, color: '#F59E0B' },
                        { label: '15 Days Before (Urgent)', state: reminder15Days, set: setReminder15Days, color: '#F97316' },
                        { label: '7 Days Before (Critical)', state: reminder7Days, set: setReminder7Days, color: '#EF4444' },
                        { label: '1 Day Before (Final Alert)', state: reminder1Day, set: setReminder1Day, color: '#F43F5E' },
                      ].map(({ label, state, set, color }) => (
                        <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: state ? color : '#94A3B8' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
                          </Box>
                          <Switch size="small" checked={state} onChange={e => set(e.target.checked)} sx={{ '& .MuiSwitch-thumb': { bgcolor: state ? color : undefined } }} />
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleSaveNotifications}
                    sx={{ borderRadius: '12px', fontWeight: 700, background: 'linear-gradient(135deg, var(--indigo), var(--violet))' }}
                  >
                    Save Notification Preferences
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ════════════════════════ TAB 4: STORAGE ════════════════════════ */}
          <TabPanel value={activeTab} index={3}>
            <Grid container spacing={3} justifyContent="center">
              <Grid xs={12} md={7}>
                <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <StorageIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Server Storage Alert Threshold</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Alert the super admin when disk usage exceeds this percentage. The system checks storage at regular intervals.
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Warning Threshold</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: storageThreshold > 90 ? 'error.main' : storageThreshold > 75 ? 'warning.main' : 'success.main' }}>
                          {storageThreshold}%
                        </Typography>
                      </Box>
                      <Slider
                        value={storageThreshold}
                        onChange={(_, v) => setStorageThreshold(v)}
                        min={50} max={99} step={5}
                        marks={[
                          { value: 60, label: '60%' },
                          { value: 75, label: '75%' },
                          { value: 85, label: '85%' },
                          { value: 95, label: '95%' },
                        ]}
                        sx={{
                          color: storageThreshold > 90 ? '#F43F5E' : storageThreshold > 75 ? '#F59E0B' : '#10B981'
                        }}
                      />
                    </Box>

                    <TextField
                      fullWidth
                      type="number"
                      label="Disk Storage Warning Threshold (%)"
                      value={storageThreshold}
                      onChange={e => setStorageThreshold(Math.min(99, Math.max(1, parseInt(e.target.value) || 0)))}
                      inputProps={{ min: 1, max: 99 }}
                      helperText="Recommended: 85%. Alert fires when storage exceeds this value."
                      sx={{ mb: 2 }}
                    />

                    {/* Threshold Meaning */}
                    <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'action.hover' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>Alert Levels</Typography>
                      {[
                        { range: '< 75%', label: 'Safe — No alert triggered', color: '#10B981' },
                        { range: '75–89%', label: 'Warning — Yellow alert banner', color: '#F59E0B' },
                        { range: '≥ 90%', label: 'Critical — Red alert, action required', color: '#F43F5E' },
                      ].map(({ range, label, color }) => (
                        <Box key={range} sx={{ display: 'flex', gap: 1.5, mb: 0.5, alignItems: 'center' }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                          <Typography variant="caption">
                            <strong style={{ color }}>{range}</strong> — {label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        startIcon={<CheckCircleIcon />}
                        onClick={handleSaveStorage}
                        sx={{ borderRadius: '12px', fontWeight: 700, background: 'linear-gradient(135deg, var(--indigo), var(--violet))' }}
                      >
                        Save Storage Settings
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
           </TabPanel>
          {['Super Admin', 'Admin'].includes(user?.role?.name) && (
            <TabPanel value={activeTab} index={4}>
              <EmailSettingsTab />
            </TabPanel>
          )}
          {['Super Admin', 'Admin'].includes(user?.role?.name) && (
            <TabPanel value={activeTab} index={5}>
              <GoogleDriveSettingsTab />
            </TabPanel>
          )}
          {['Super Admin', 'Admin'].includes(user?.role?.name) && (
            <TabPanel value={activeTab} index={6}>
              <ModulePermissionsMatrix />
            </TabPanel>
          )}
          {['Super Admin', 'Admin'].includes(user?.role?.name) && (
            <TabPanel value={activeTab} index={7}>
              <ImportExportTab />
            </TabPanel>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default Settings;
