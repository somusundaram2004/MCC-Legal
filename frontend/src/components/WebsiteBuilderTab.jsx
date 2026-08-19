import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Grid, Button, TextField,
  Alert, Avatar, Chip, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, FormControl,
  InputLabel, Select, MenuItem, Switch, FormControlLabel,
  Paper, IconButton, Tooltip, Autocomplete, Checkbox, FormHelperText
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import GavelIcon from '@mui/icons-material/Gavel';
import SchoolIcon from '@mui/icons-material/School';
import ScienceIcon from '@mui/icons-material/Science';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PublishIcon from '@mui/icons-material/Publish';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import api from '../services/api';
import { triggerGlobalAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';

const PRESET_MODULES = [
  { title: 'Case Documents', slug: 'case-documents', icon: 'Gavel', page_type: 'Folder Repository', badge: 'LEGAL', badge_color: '#EF4444', description: 'Legal case files, court records, and litigation documentation repository.' },
  { title: 'Legal Archive', slug: 'legal-archive', icon: 'Folder', page_type: 'Document Repository', badge: 'ARCHIVE', badge_color: '#8B5CF6', description: 'Permanent digital repository for executed institutional contracts.' },
  { title: 'Student Records', slug: 'student-records', icon: 'School', page_type: 'Table View', badge: 'EDU', badge_color: '#10B981', description: 'Academic records, certificates, and student clearance documents.' },
  { title: 'Research Files', slug: 'research-files', icon: 'Science', page_type: 'Folder Repository', badge: 'R&D', badge_color: '#3B82F6', description: 'Patents, grant research proposals, and publication repositories.' },
  { title: 'Tender Documents', slug: 'tender-documents', icon: 'Assignment', page_type: 'Folder Repository', badge: 'TENDER', badge_color: '#F59E0B', description: 'Procurement tenders, bidding forms, and vendor submission files.' },
  { title: 'Placement Documents', slug: 'placement-documents', icon: 'BusinessCenter', page_type: 'Card View', badge: 'CAREER', badge_color: '#EC4899', description: 'Campus placement MOUs, recruiter offers, and student resumes.' },
  { title: 'HR Documents', slug: 'hr-documents', icon: 'People', page_type: 'Document Repository', badge: 'HR', badge_color: '#14B8A6', description: 'Staff appointments, service agreements, and faculty credentials.' },
  { title: 'Vendor Agreements', slug: 'vendor-agreements', icon: 'Folder', page_type: 'Folder Repository', badge: 'VENDOR', badge_color: '#6366F1', description: 'External vendor service level agreements and supply contracts.' },
  { title: 'Audit Files', slug: 'audit-files', icon: 'Security', badge: 'AUDIT', badge_color: '#F97316', page_type: 'Table View', description: 'Compliance audit trail documents and inspection reports.' },
];

const WebsiteBuilderTab = () => {
  const [pages, setPages] = useState([]);
  const [availableFolders, setAvailableFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dialog State for Builder Modal
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [route, setRoute] = useState('');
  const [parentSlug, setParentSlug] = useState('');
  const [rootFolderId, setRootFolderId] = useState('');
  const [rootFolderName, setRootFolderName] = useState('');
  const [googleDriveFolderId, setGoogleDriveFolderId] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(1);
  const [badge, setBadge] = useState('');
  const [badgeColor, setBadgeColor] = useState('#3B82F6');
  const [pageType, setPageType] = useState('Folder Repository');
  const [isPublished, setIsPublished] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [openNewTab, setOpenNewTab] = useState(false);

  // Roles & Permissions
  const [allowedRoles, setAllowedRoles] = useState(['Super Admin', 'Admin', 'User']);
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [crudPermissions, setCrudPermissions] = useState({
    create: true, read: true, update: true, delete: true,
    upload: true, download: true, share: true, approve: false, export: true
  });

  // Custom Fields Schema
  const [fields, setFields] = useState([
    { name: 'Document Reference No', type: 'text', required: true },
    { name: 'Category / Tag', type: 'dropdown', required: false },
    { name: 'Expiration Date', type: 'date', required: false }
  ]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users/');
      setSystemUsers(res.data.results || res.data || []);
    } catch (err) {
      console.debug('Failed to load system users list:', err);
    }
  };

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users/custom-pages/');
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setPages(rawList);
    } catch (err) {
      console.error('Failed to load custom pages:', err);
      setError('Failed to load website builder modules.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await api.get('/api/folders/root/');
      setAvailableFolders(res.data.subfolders || []);
    } catch (err) {
      console.error('Failed to load folders list:', err);
    }
  };

  useEffect(() => {
    fetchPages();
    fetchFolders();
    fetchUsers();
  }, []);

  const handleOpenDialog = (page = null) => {
    setError(null);
    setSuccess(null);
    if (page) {
      setEditId(page.id);
      setTitle(page.title);
      setSlug(page.slug);
      setIcon(page.icon || 'Folder');
      setRoute(page.route || `/custom-page/${page.slug}`);
      setParentSlug(page.parent_slug || '');
      setRootFolderId(page.root_folder_id || '');
      setRootFolderName(page.root_folder_name || '');
      setGoogleDriveFolderId(page.google_drive_folder_id || '');
      setDescription(page.description || '');
      setOrder(page.order || 1);
      setBadge(page.badge || '');
      setBadgeColor(page.badge_color || '#3B82F6');
      setPageType(page.page_type || 'Folder Repository');
      setIsPublished(page.is_published !== false);
      setIsEnabled(page.is_enabled !== false);
      setOpenNewTab(page.open_new_tab === true);
      setAllowedRoles(page.allowed_roles?.length > 0 ? page.allowed_roles : ['Super Admin', 'Admin', 'User']);
      setAllowedUsers(page.allowed_permissions || []);
      setCrudPermissions(page.crud_permissions || {
        create: true, read: true, update: true, delete: true,
        upload: true, download: true, share: true, approve: false, export: true
      });
      setFields(page.entity_schema || []);
    } else {
      setEditId(null);
      setTitle('');
      setSlug('');
      setIcon('Folder');
      setRoute('');
      setParentSlug('');
      setRootFolderId('');
      setRootFolderName('');
      setGoogleDriveFolderId('');
      setDescription('');
      setOrder(pages.length + 1);
      setBadge('NEW');
      setBadgeColor('#3B82F6');
      setPageType('Folder Repository');
      setIsPublished(true);
      setIsEnabled(true);
      setOpenNewTab(false);
      setAllowedRoles(['Super Admin', 'Admin', 'User']);
      setAllowedUsers([]);
      setCrudPermissions({
        create: true, read: true, update: true, delete: true,
        upload: true, download: true, share: true, approve: false, export: true
      });
      setFields([
        { name: 'Document Title', type: 'text', required: true },
        { name: 'Category', type: 'dropdown', required: false },
        { name: 'Date Created', type: 'date', required: false }
      ]);
    }
    setDialogOpen(true);
  };

  const handlePresetSelect = (preset) => {
    setTitle(preset.title);
    const s = preset.slug;
    setSlug(s);
    setIcon(preset.icon);
    setRoute(`/custom-page/${s}`);
    setDescription(preset.description);
    setBadge(preset.badge);
    setBadgeColor(preset.badge_color);
    setPageType(preset.page_type);
  };

  const handlePresetClick = (preset) => {
    const existingPage = pages.find(p => p.slug === preset.slug);
    if (existingPage) {
      handleOpenDialog(existingPage);
    } else {
      handleOpenDialog();
      handlePresetSelect(preset);
    }
  };

  const handleSavePage = async () => {
    if (!title.trim()) {
      setError('Module title is required.');
      return;
    }
    const finalSlug = slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const rawRoute = route.trim();
    const finalRoute = rawRoute
      ? (rawRoute.startsWith('/custom-page/') ? rawRoute : (rawRoute.startsWith('/') ? `/custom-page${rawRoute}` : `/custom-page/${rawRoute}`))
      : `/custom-page/${finalSlug}`;

    setSaving(true);
    setError(null);
    try {
      let finalRootFolderId = rootFolderId || null;
      let finalRootFolderName = rootFolderName || title.trim();

      // If Auto-create option is chosen on new module creation, create the dedicated folder
      if (!finalRootFolderId && !editId) {
        try {
          const createRes = await api.post('/api/folders/create/', {
            name: title.trim(),
          });
          if (createRes.data?.id) {
            finalRootFolderId = String(createRes.data.id);
            finalRootFolderName = createRes.data.name || title.trim();
          }
        } catch (createErr) {
          console.debug('Folder auto-create fallback note:', createErr);
        }
      }

      const payload = {
        title: title.trim(),
        slug: finalSlug,
        icon,
        route: finalRoute,
        parent_slug: parentSlug || null,
        root_folder_id: finalRootFolderId,
        root_folder_name: finalRootFolderName,
        google_drive_folder_id: googleDriveFolderId.trim() || null,
        description,
        order: Number(order),
        badge,
        badge_color: badgeColor,
        page_type: pageType,
        is_published: isPublished,
        is_enabled: isEnabled,
        open_new_tab: openNewTab,
        allowed_roles: allowedRoles,
        allowed_permissions: allowedUsers,
        crud_permissions: crudPermissions,
        entity_schema: fields
      };

      if (editId) {
        await api.put(`/api/users/custom-pages/${editId}/`, payload);
        setSuccess(`Module "${title}" updated successfully!`);
      } else {
        await api.post('/api/users/custom-pages/', payload);
        setSuccess(`Module "${title}" published to dynamic sidebar successfully!`);
      }
      setDialogOpen(false);
      fetchPages();
      triggerGlobalAutoRefresh(REFRESH_CATEGORIES.SETTINGS);
    } catch (err) {
      console.error('Failed to save module:', err);
      setError(err.response?.data?.detail || 'Failed to save module configuration.');
    } finally {
      setSaving(false);
    }
  };

  const [deleteModuleTarget, setDeleteModuleTarget] = useState(null);
  const [deletingModule, setDeletingModule] = useState(false);

  const confirmDeletePage = (id, pageTitle) => {
    setDeleteModuleTarget({ id, title: pageTitle });
  };

  const executeDeletePage = async () => {
    if (!deleteModuleTarget) return;
    setDeletingModule(true);
    try {
      await api.delete(`/api/users/custom-pages/${deleteModuleTarget.id}/`);
      setSuccess(`Module "${deleteModuleTarget.title}" moved to Recycle Bin.`);
      setDeleteModuleTarget(null);
      fetchPages();
      triggerGlobalAutoRefresh(REFRESH_CATEGORIES.SETTINGS);
    } catch (err) {
      console.error('Failed to move module to Recycle Bin:', err);
      setError('Failed to move module to Recycle Bin.');
      setDeleteModuleTarget(null);
    } finally {
      setDeletingModule(false);
    }
  };

  const handleRepublishPage = async (id, pageTitle) => {
    try {
      await api.post(`/api/users/custom-pages/${id}/republish/`);
      setSuccess(`Module "${pageTitle}" and all repository data retrieved & republished successfully!`);
      fetchPages();
      triggerGlobalAutoRefresh(REFRESH_CATEGORIES.SETTINGS);
    } catch (err) {
      console.error('Failed to republish module:', err);
      setError('Failed to republish module and retrieve data.');
    }
  };


  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3.5, borderRadius: '20px',
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
          color: '#fff', boxShadow: '0 12px 32px rgba(49, 46, 129, 0.35)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <AutoAwesomeIcon sx={{ color: '#F59E0B' }} />
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-0.02em' }}>
              Dynamic Website &amp; Sidebar Builder
            </Typography>
            <Chip label="No-Code Engine" size="small" sx={{ bgcolor: 'rgba(245, 158, 11, 0.25)', color: '#FDE68A', fontWeight: 800, fontSize: '0.7rem' }} />
          </Box>
          <Typography variant="body2" sx={{ opacity: 0.88, fontSize: '0.88rem', maxWidth: 650 }}>
            Create new custom repositories, document pages, and sidebar modules visually without writing any React, Django, or database code.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => handleOpenDialog()}
          startIcon={<AddIcon />}
          sx={{
            background: '#ffffff !important', color: '#312E81 !important', fontWeight: 800,
            borderRadius: '12px', px: 3, py: 1.2, boxShadow: '0 4px 14px rgba(0,0,0,0.2) !important',
            '&:hover': { background: '#f8fafc !important', transform: 'translateY(-1px)' }
          }}
        >
          Build New Module
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>{success}</Alert>}

      {/* Preset Quick Start Templates */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon fontSize="small" sx={{ color: 'primary.main' }} />
          Quick Start Presets
        </Typography>
        <Grid container spacing={2}>
          {PRESET_MODULES.map((preset) => (
            <Grid xs={12} sm={6} md={4} key={preset.slug}>
              <Card
                sx={{
                  p: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-3px)', borderColor: 'primary.main', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }
                }}
                onClick={() => handlePresetClick(preset)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label={preset.badge} size="small" sx={{ bgcolor: `${preset.badge_color}20`, color: preset.badge_color, fontWeight: 800, height: 20, fontSize: '0.65rem' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{preset.page_type}</Typography>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>{preset.title}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.78rem', lineHeight: 1.4 }}>
                  {preset.description}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Active Custom Pages List */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
          Active Custom Sidebar Modules ({pages.filter(p => p.is_published !== false && p.is_enabled !== false).length})
        </Typography>

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : pages.filter(p => p.is_published !== false && p.is_enabled !== false).length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: '16px', bgcolor: 'action.hover' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
              No active custom dynamic modules. Click "Build New Module" or pick a Quick Start Preset above!
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {pages.filter(p => p.is_published !== false && p.is_enabled !== false).map((p) => (
              <Grid xs={12} sm={6} md={4} key={p.id}>
                <Card sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Chip
                      label={p.is_published ? 'Published' : 'Draft'}
                      size="small"
                      color={p.is_published ? 'success' : 'default'}
                      sx={{ fontWeight: 800, height: 20, fontSize: '0.68rem' }}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit Module">
                        <IconButton size="small" onClick={() => handleOpenDialog(p)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Move Module to Recycle Bin">
                        <IconButton size="small" color="error" onClick={() => confirmDeletePage(p.id, p.title)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>{p.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontFamily: 'monospace' }}>
                    Route: {p.route}
                  </Typography>
                  {p.root_folder_name && (
                    <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
                      📁 Root Folder: {p.root_folder_name}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={p.page_type} size="small" variant="outlined" sx={{ fontSize: '0.68rem' }} />
                    {p.badge && <Chip label={p.badge} size="small" sx={{ bgcolor: p.badge_color, color: '#fff', fontSize: '0.65rem' }} />}
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* No-Code Module Builder Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.35rem', pb: 1, borderBottom: '1px solid', borderColor: 'divider', mb: 1 }}>
          {editId ? `Edit Module "${title}"` : 'Build New Dynamic Sidebar Module'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Section 1: Basic Module Metadata */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'primary.main', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}>
                1. Basic Module Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Module Title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!editId) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }}
                    placeholder="e.g. Student Records, Research Files"
                    required
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="URL Slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    helperText={`Route path: /custom-page/${slug || 'module-name'}`}
                  />
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Layout Template</InputLabel>
                    <Select value={pageType} label="Layout Template" onChange={(e) => setPageType(e.target.value)}>
                      <MenuItem value="Folder Repository">📁 Folder Repository</MenuItem>
                      <MenuItem value="Document Repository">📄 Document Repository</MenuItem>
                      <MenuItem value="Table View">📊 Table View</MenuItem>
                      <MenuItem value="Card View">🎴 Card View</MenuItem>
                      <MenuItem value="Kanban">📋 Kanban Board</MenuItem>
                      <MenuItem value="Dashboard">📈 Analytics Dashboard</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Module Sidebar Icon</InputLabel>
                    <Select
                      value={icon}
                      label="Module Sidebar Icon"
                      onChange={(e) => setIcon(e.target.value)}
                      sx={{ borderRadius: '10px' }}
                    >
                      <MenuItem value="Folder">📁 Folder Repository Icon</MenuItem>
                      <MenuItem value="Gavel">⚖️ Gavel (Legal &amp; MOU)</MenuItem>
                      <MenuItem value="School">🎓 School (Academic)</MenuItem>
                      <MenuItem value="Science">🔬 Science (R&amp;D Research)</MenuItem>
                      <MenuItem value="BusinessCenter">💼 Business (Placements)</MenuItem>
                      <MenuItem value="People">👥 People (HR &amp; Staff)</MenuItem>
                      <MenuItem value="Security">🛡️ Security (Audit Files)</MenuItem>
                      <MenuItem value="Assignment">📋 Assignment (Tenders)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* Section 2: Storage & Repository Binding */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'primary.main', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}>
                2. Storage &amp; Repository Binding
              </Typography>
              <Grid container spacing={2}>
                <Grid xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="assigned-folder-label">Assigned Repository Folder</InputLabel>
                    <Select
                      labelId="assigned-folder-label"
                      value={rootFolderId ? String(rootFolderId) : ''}
                      label="Assigned Repository Folder"
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        setRootFolderId(selectedId ? String(selectedId) : '');
                        const folderObj = availableFolders.find(f => String(f.id) === String(selectedId));
                        if (folderObj) {
                          setRootFolderName(folderObj.name);
                        } else {
                          setRootFolderName('');
                        }
                      }}
                    >
                      <MenuItem value="">
                        ✨ Auto-create / Default System Root Folder
                      </MenuItem>
                      {rootFolderId && !availableFolders.some(f => String(f.id) === String(rootFolderId)) && (
                        <MenuItem key={rootFolderId} value={String(rootFolderId)}>
                          📁 {rootFolderName || `Linked Repository Folder (ID: ${rootFolderId})`}
                        </MenuItem>
                      )}
                      {availableFolders.map((folder) => (
                        <MenuItem key={folder.id} value={String(folder.id)}>
                          📁 {folder.name} {folder.department_name ? `(${folder.department_name})` : ''}
                        </MenuItem>
                      ))}

                    </Select>
                    <FormHelperText sx={{ fontWeight: 600 }}>
                      {rootFolderId ? `Linked to existing folder: "${rootFolderName}"` : '✨ Auto-creates a dedicated root folder for this module on publish'}
                    </FormHelperText>
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Google Drive Shared Folder ID"
                    value={googleDriveFolderId}
                    onChange={(e) => setGoogleDriveFolderId(e.target.value)}
                    placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j"
                    helperText="Optional: Link to a specific Google Shared Drive folder ID"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Section 3: Sidebar Branding & Color Swatch Palette */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'primary.main', letterSpacing: '0.5px', mb: 1.5, display: 'block' }}>
                3. Sidebar Badge &amp; Color Customization
              </Typography>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', bgcolor: 'background.paper' }}>
                <Grid container spacing={2.5} sx={{ alignItems: 'center' }}>
                  <Grid xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Sidebar Badge Text"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="e.g. NEW, LEGAL, EDU"
                      size="small"
                    />
                  </Grid>

                  <Grid xs={12} sm={8}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                          Select Badge Color Swatch:
                        </Typography>
                        {badge && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">Preview:</Typography>
                            <Chip
                              label={badge}
                              size="small"
                              sx={{
                                height: 22,
                                bgcolor: badgeColor || '#3B82F6',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.68rem',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                              }}
                            />
                          </Box>
                        )}
                      </Box>

                      {/* Swatches Row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {[
                          { name: 'Red', hex: '#EF4444' },
                          { name: 'Amber', hex: '#F59E0B' },
                          { name: 'Emerald', hex: '#10B981' },
                          { name: 'Blue', hex: '#3B82F6' },
                          { name: 'Indigo', hex: '#6366F1' },
                          { name: 'Purple', hex: '#8B5CF6' },
                          { name: 'Pink', hex: '#EC4899' },
                          { name: 'Teal', hex: '#14B8A6' },
                          { name: 'Orange', hex: '#F97316' },
                          { name: 'Slate', hex: '#64748B' },
                        ].map((c) => (
                          <Tooltip key={c.hex} title={c.name} arrow>
                            <Box
                              onClick={() => setBadgeColor(c.hex)}
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                bgcolor: c.hex,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                border: '2px solid',
                                borderColor: badgeColor === c.hex ? '#ffffff' : 'transparent',
                                boxShadow: badgeColor === c.hex ? `0 0 0 2px ${c.hex}` : 'none',
                                transform: badgeColor === c.hex ? 'scale(1.18)' : 'scale(1)',
                                '&:hover': { transform: 'scale(1.15)' }
                              }}
                            />
                          </Tooltip>
                        ))}

                        {/* Fine-tune HEX input */}
                        <TextField
                          type="color"
                          value={badgeColor}
                          onChange={(e) => setBadgeColor(e.target.value)}
                          size="small"
                          sx={{
                            width: 36,
                            height: 32,
                            p: 0,
                            minWidth: 36,
                            '& input': { p: 0.2, height: 28, cursor: 'pointer' }
                          }}
                        />
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Box>

            {/* Section 4: Module Description */}
            <Box>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Module Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary describing the purpose of this module..."
              />
            </Box>

            {/* Section 5: CRUD Features Toggles */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Enabled Features &amp; Actions</Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: 'action.hover' }}>
                <Grid container spacing={1.5}>
                  {Object.keys(crudPermissions).map((actionKey) => (
                    <Grid xs={6} sm={4} key={actionKey}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={crudPermissions[actionKey]}
                            onChange={(e) => setCrudPermissions({ ...crudPermissions, [actionKey]: e.target.checked })}
                            size="small"
                          />
                        }
                        label={<Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{actionKey}</Typography>}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Box>

            {/* Section 6: Access Control Box */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                Module Access Control (Roles &amp; User Access)
              </Typography>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '14px', bgcolor: 'action.hover' }}>
                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
                      Allowed Roles
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {['Super Admin', 'Admin', 'User'].map((roleName) => {
                        const isChecked = allowedRoles.includes(roleName);
                        const isSuper = roleName === 'Super Admin';
                        return (
                          <FormControlLabel
                            key={roleName}
                            control={
                              <Checkbox
                                checked={isSuper || isChecked}
                                disabled={isSuper}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAllowedRoles([...allowedRoles, roleName]);
                                  } else {
                                    setAllowedRoles(allowedRoles.filter(r => r !== roleName));
                                  }
                                }}
                                size="small"
                              />
                            }
                            label={<Typography variant="body2" sx={{ fontWeight: 700 }}>{roleName}</Typography>}
                          />
                        );
                      })}
                    </Box>
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
                      Grant Access to Specific Users
                    </Typography>
                    <Autocomplete
                      multiple
                      options={systemUsers}
                      getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name || option.username} (${option.email})`}
                      value={systemUsers.filter(u => allowedUsers.includes(String(u.id)) || allowedUsers.includes(u.email))}
                      onChange={(event, newValue) => {
                        setAllowedUsers(newValue.map(u => String(u.id)));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          placeholder="Search &amp; select users..."
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Box>

            {/* Section 7: Publishing Toggles */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <FormControlLabel
                control={<Switch checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} color="success" />}
                label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Publish to Sidebar Immediately</Typography>}
              />
              <FormControlLabel
                control={<Switch checked={openNewTab} onChange={(e) => setOpenNewTab(e.target.checked)} />}
                label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Open Link in New Tab</Typography>}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, borderTop: '1px solid', borderColor: 'divider', mt: 1, justifyContent: 'space-between' }}>
          <Box>
            {editId && (
              isPublished ? (
                <Button
                  color="error"
                  onClick={() => {
                    confirmDeletePage(editId, title);
                    setDialogOpen(false);
                  }}
                  startIcon={<DeleteIcon />}
                  sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '12px' }}
                >
                  Move to Recycle Bin
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => {
                    handleRepublishPage(editId, title);
                    setDialogOpen(false);
                  }}
                  startIcon={<PublishIcon />}
                  sx={{
                    fontWeight: 800,
                    textTransform: 'none',
                    borderRadius: '12px',
                    bgcolor: '#10B981',
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#059669' }
                  }}
                >
                  🚀 Republish &amp; Retrieve Data
                </Button>
              )
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSavePage}
              disabled={saving}
              startIcon={<PublishIcon />}
              sx={{ borderRadius: '12px', px: 3, fontWeight: 800, textTransform: 'none' }}
            >
              {saving ? 'Publishing...' : (editId ? 'Update Module' : 'Publish Module to Sidebar')}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Module Delete Confirmation Modal */}
      <Dialog
        open={Boolean(deleteModuleTarget)}
        onClose={() => setDeleteModuleTarget(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800, color: 'error.main' }}>
          <WarningAmberIcon sx={{ fontSize: 32, color: 'error.main' }} />
          Move Module to Recycle Bin
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            Are you sure you want to move <strong>"{deleteModuleTarget?.title}"</strong> to the Recycle Bin?
          </Typography>
          <Alert severity="info" sx={{ borderRadius: '12px', fontSize: '0.82rem' }}>
            You can restore this module and its document records anytime from the Recycle Bin.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteModuleTarget(null)}
            variant="outlined"
            disabled={deletingModule}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            onClick={executeDeletePage}
            color="error"
            variant="contained"
            disabled={deletingModule}
            startIcon={deletingModule ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {deletingModule ? 'Moving...' : 'Move to Recycle Bin'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebsiteBuilderTab;
