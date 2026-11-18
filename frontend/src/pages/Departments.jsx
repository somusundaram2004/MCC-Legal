import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Grid, Card, CardContent, Typography, Button, 
  Avatar, Chip, CircularProgress, Divider, TextField, 
  InputAdornment, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Alert, IconButton, Tooltip,
  ToggleButtonGroup, ToggleButton,
  Tabs, Tab, Checkbox, Autocomplete,
  Paper, List, ListItem, ListItemText, ListItemIcon, ListItemButton
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import SchoolIcon from '@mui/icons-material/School';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PaletteIcon from '@mui/icons-material/Palette';
import ScienceIcon from '@mui/icons-material/Science';
import GavelIcon from '@mui/icons-material/Gavel';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';

import api from '../services/api';
import { getMOUs } from '../services/mouApi';
import { 
  getMOUCategories, 
  createMOUCategory, 
  updateMOUCategory, 
  deleteMOUCategory, 
  getMasterStreams,
  getDepartmentAssignedItems,
  assignDepartmentItems,
  createDepartmentSubfolder
} from '../services/templateApi';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';
import { getDynamicFolderColor } from '../utils/folderStatus';

const Departments = () => {
  const navigate = useNavigate();
  const [mous, setMous] = useState([]);
  const [categories, setCategories] = useState([]);
  const [streams, setStreams] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStreamTab, setSelectedStreamTab] = useState('ALL');

  // Create Category Dialog state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [streamId, setStreamId] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [iconType, setIconType] = useState('school');
  const [coordName, setCoordName] = useState('');
  const [coordEmail, setCoordEmail] = useState('');
  const [categoryType, setCategoryType] = useState('Department');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

  // Edit Category & Assign Items Dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editStreamId, setEditStreamId] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [editIconType, setEditIconType] = useState('school');
  const [editCoordName, setEditCoordName] = useState('');
  const [editCoordEmail, setEditCoordEmail] = useState('');
  const [editCategoryType, setEditCategoryType] = useState('Department');
  const [editActiveTab, setEditActiveTab] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingAssigned, setLoadingAssigned] = useState(false);

  // Folder & MOU assignment state inside Edit Dialog
  const [availableFolders, setAvailableFolders] = useState([]);
  const [assignedFolderIds, setAssignedFolderIds] = useState([]);
  const [availableMOUs, setAvailableMOUs] = useState([]);
  const [assignedMOUIds, setAssignedMOUIds] = useState([]);
  const [folderSearch, setFolderSearch] = useState('');
  const [mouSearch, setMouSearch] = useState('');
  const [folderFilterType, setFolderFilterType] = useState('all'); // 'all', 'subfolders', 'assigned'
  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [newSubfolderParentId, setNewSubfolderParentId] = useState('');
  const [creatingSubfolderLoading, setCreatingSubfolderLoading] = useState(false);

  // Delete Category Dialog & Animation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [animatingId, setAnimatingId] = useState(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadData = React.useCallback(() => {
    setLoading(true);
    Promise.all([getMOUs(), getMOUCategories(), getMasterStreams()])
      .then(([mouData, catData, streamData]) => {
        setMous(mouData || []);
        setCategories(catData || []);
        setStreams(streamData || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load departments data:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData();
    // Fetch system users for coordinator picker
    api.get('/api/users/')
      .then(res => {
        const users = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setSystemUsers(users);
      })
      .catch(err => {
        console.warn("Could not load users for coordinator picker:", err);
      });
  }, [loadData]);

  // Global Auto Refresh Subscription
  useAutoRefresh(REFRESH_CATEGORIES.DEPARTMENTS, loadData);

  const getIcon = (type) => {
    switch (type) {
      case 'school':
        return <SchoolIcon />;
      case 'hospital':
        return <LocalHospitalIcon />;
      case 'business':
        return <BusinessCenterIcon />;
      case 'palette':
        return <PaletteIcon />;
      case 'science':
        return <ScienceIcon />;
      case 'gavel':
        return <GavelIcon />;
      case 'company':
        return <BusinessIcon />;
      default:
        return <SchoolIcon />;
    }
  };

  const getBgColor = (hexColor) => {
    if (!hexColor || !hexColor.startsWith('#')) return 'rgba(59, 130, 246, 0.12)';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.12)`;
  };

  const getDeptStats = (dept) => {
    const deptNameLower = String(dept?.name || '').toLowerCase();
    const streamNameLower = String(dept?.stream_name || dept?.stream?.name || '').toLowerCase();

    const deptMous = mous.filter(m => {
      const mouDeptRaw = m?.department_name || (typeof m?.department === 'object' ? m?.department?.name : m?.department) || '';
      const mouDept = String(mouDeptRaw || '').toLowerCase();

      const mouStreamRaw = m?.stream_name || (typeof m?.stream === 'object' ? m?.stream?.name : m?.stream) || '';
      const mouStream = String(mouStreamRaw || '').toLowerCase();
      
      const nameMatches = Boolean(deptNameLower && mouDept && (mouDept.includes(deptNameLower) || deptNameLower.includes(mouDept)));
      const streamMatches = !streamNameLower || !mouStream || mouStream.includes(streamNameLower) || streamNameLower.includes(mouStream);
      return nameMatches && streamMatches;
    });

    const active = deptMous.filter(m => m.status === 'Active').length;
    const expiring = deptMous.filter(m => m.days_left !== null && m.days_left !== undefined && m.days_left <= 30 && m.days_left >= 0).length;
    return { total: deptMous.length, active, expiring };
  };

  const handleCreate = async () => {
    if (!name || !code) {
      setError("Please fill in the Category Name and Abbreviation Code.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        code,
        stream: streamId || null,
        color,
        icon_type: iconType,
        coordinator_name: coordName,
        coordinator_email: coordEmail,
        category_type: categoryType,
        is_active: true
      };
      await createMOUCategory(payload);
      setOpen(false);
      setName('');
      setCode('');
      setStreamId('');
      setColor('#3B82F6');
      setIconType('school');
      setCoordName('');
      setCoordEmail('');
      setCategoryType('Department');
      setSuccess('Category created successfully.');
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || err.response?.data?.name?.[0] || "Failed to create category.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = async (dept) => {
    setEditingDept(dept);
    setEditName(dept.name || '');
    setEditCode(dept.code || '');
    setEditStreamId(dept.stream || '');
    setEditColor(dept.color || '#3B82F6');
    setEditIconType(dept.icon_type || 'school');
    setEditCoordName(dept.coordinator_name || '');
    setEditCoordEmail(dept.coordinator_email || '');
    setEditCategoryType(dept.category_type || 'Department');
    setEditActiveTab(0);
    setFolderSearch('');
    setMouSearch('');
    setFolderFilterType('all');
    setIsCreatingSubfolder(false);
    setNewSubfolderName('');
    setNewSubfolderParentId('');
    setEditOpen(true);
    setLoadingAssigned(true);

    try {
      const data = await getDepartmentAssignedItems(dept.id);
      setAvailableFolders(data.available_folders || []);
      setAssignedFolderIds(data.assigned_folder_ids || []);
      setAvailableMOUs(data.available_mous || []);
      setAssignedMOUIds(data.assigned_mou_ids || []);
    } catch (err) {
      console.error("Failed to load assigned items for department:", err);
    } finally {
      setLoadingAssigned(false);
    }
  };

  const handleCreateSubfolder = async () => {
    if (!newSubfolderName.trim() || !editingDept) return;
    setCreatingSubfolderLoading(true);
    try {
      const res = await createDepartmentSubfolder(editingDept.id, {
        name: newSubfolderName.trim(),
        parent_folder_id: newSubfolderParentId || null
      });

      // Reload assigned items to get the refreshed tree
      const data = await getDepartmentAssignedItems(editingDept.id);
      setAvailableFolders(data.available_folders || []);
      setAssignedFolderIds(data.assigned_folder_ids || []);
      setAvailableMOUs(data.available_mous || []);
      setAssignedMOUIds(data.assigned_mou_ids || []);

      // Ensure newly created folder is marked as assigned
      if (res.id && !assignedFolderIds.includes(res.id)) {
        setAssignedFolderIds(prev => [...prev, res.id]);
      }

      setNewSubfolderName('');
      setIsCreatingSubfolder(false);
      setSuccess(`Subfolder "${res.name}" created and assigned to ${editingDept.name}.`);
    } catch (err) {
      console.error("Failed to create subfolder:", err);
      setError(err.response?.data?.detail || "Failed to create subfolder.");
    } finally {
      setCreatingSubfolderLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editCode.trim()) {
      setError("Please fill in the Category Name and Abbreviation Code.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const payload = {
        name: editName.trim(),
        code: editCode.trim(),
        stream: editStreamId || null,
        color: editColor,
        icon_type: editIconType,
        coordinator_name: editCoordName.trim(),
        coordinator_email: editCoordEmail.trim(),
        category_type: editCategoryType,
      };

      // 1. Update department details
      await updateMOUCategory(editingDept.id, payload);

      // 2. Update assignments
      await assignDepartmentItems(editingDept.id, {
        folder_ids: assignedFolderIds,
        mou_ids: assignedMOUIds,
      });

      setEditOpen(false);
      setSuccess(`Department "${editName}" and assigned items updated successfully.`);
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to update department.");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleFolder = (folderId) => {
    setAssignedFolderIds(prev => 
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const toggleMOU = (mouId) => {
    setAssignedMOUIds(prev => 
      prev.includes(mouId) ? prev.filter(id => id !== mouId) : [...prev, mouId]
    );
  };

  const filteredAvailableFolders = useMemo(() => {
    let list = availableFolders;
    if (folderFilterType === 'subfolders') {
      list = list.filter(f => (f.depth || 0) > 0);
    } else if (folderFilterType === 'assigned') {
      list = list.filter(f => assignedFolderIds.includes(f.id));
    }

    if (!folderSearch.trim()) return list;
    const q = folderSearch.toLowerCase();
    return list.filter(f => 
      (f.name || '').toLowerCase().includes(q) ||
      (f.path || '').toLowerCase().includes(q)
    );
  }, [availableFolders, folderFilterType, folderSearch, assignedFolderIds]);

  const filteredAvailableMOUs = useMemo(() => {
    if (!mouSearch.trim()) return availableMOUs;
    const q = mouSearch.toLowerCase();
    return availableMOUs.filter(m => 
      (m.title || '').toLowerCase().includes(q) ||
      (m.mou_number || '').toLowerCase().includes(q) ||
      (m.partner_organization || '').toLowerCase().includes(q) ||
      (m.department_name || '').toLowerCase().includes(q)
    );
  }, [availableMOUs, mouSearch]);

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteMOUCategory(categoryToDelete.id);
      setAnimatingId(categoryToDelete.id);
      setDeleteConfirmOpen(false);
      setSuccess(`Category "${categoryToDelete.name}" deleted successfully.`);

      setTimeout(() => {
        setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
        setCategoryToDelete(null);
        setAnimatingId(null);
      }, 350);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Failed to delete category.";
      setError(errMsg);
      setDeleteConfirmOpen(false);
      setCategoryToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const filteredDepts = useMemo(() => {
    return categories.filter(d => {
      const matchesSearch = (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.coordinator_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.coordinator_email || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.code || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.stream_name || '').toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedStreamTab === 'ALL') return true;

      const deptStreamId = String(d.stream || '');
      const deptStreamName = (d.stream_name || '').toLowerCase();
      const tabTarget = String(selectedStreamTab).toLowerCase();

      return deptStreamId === tabTarget || deptStreamName.includes(tabTarget) || tabTarget.includes(deptStreamName);
    });
  }, [categories, search, selectedStreamTab]);

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-slide-up">
      {/* Header */}
      <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ width: { xs: '100%', md: 'auto' } }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.1rem' } }}>
            Department Directory &amp; MOU Repositories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Browse institutional agreements, assigned department coordinators, and stream compliance metrics (**Aided &amp; Self-Financed SFS**).
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
          {/* Stream Filter Toggle Group */}
          <ToggleButtonGroup
            value={selectedStreamTab}
            exclusive
            onChange={(e, val) => val && setSelectedStreamTab(val)}
            size="small"
            sx={{
              bgcolor: 'background.paper',
              borderRadius: '12px',
              p: 0.5,
              border: '1px solid',
              borderColor: 'divider',
              flexWrap: 'wrap',
              width: { xs: '100%', sm: 'auto' },
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '8px',
                px: { xs: 1.2, sm: 2 },
                py: 0.6,
                fontWeight: 700,
                fontSize: { xs: '0.72rem', sm: '0.78rem' },
                textTransform: 'none',
                flex: { xs: '1 1 auto', sm: 'initial' },
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
                }
              }
            }}
          >
            <ToggleButton value="ALL">All Streams</ToggleButton>
            <ToggleButton value="Aided">
              <AccountBalanceIcon sx={{ fontSize: '0.95rem', mr: 0.6 }} /> Aided
            </ToggleButton>
            <ToggleButton value="Self-Financed (SFS)">
              <WorkspacePremiumIcon sx={{ fontSize: '0.95rem', mr: 0.6 }} /> SFS (Self-Financed)
            </ToggleButton>
            <ToggleButton value="Centres & General">
              <BusinessCenterIcon sx={{ fontSize: '0.95rem', mr: 0.6 }} /> Centres &amp; General
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="Filter categories & code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: '100%', sm: 200 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }
            }}
          />

          {/* Create New MOU Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/mou/create')}
            sx={{ 
              borderRadius: '12px', 
              fontWeight: 700, 
              py: 1,
              px: 2.2,
              width: { xs: '100%', sm: 'auto' },
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)',
                boxShadow: '0 6px 20px rgba(79, 70, 229, 0.45)',
              }
            }}
          >
            Create New MOU
          </Button>

          {/* Create Category Button */}
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ borderRadius: '12px', fontWeight: 700, py: 1, width: { xs: '100%', sm: 'auto' } }}
          >
            Create Category
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : filteredDepts.length === 0 ? (
        <Card variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: '20px' }}>
          <FolderIcon sx={{ fontSize: '3.5rem', color: 'text.secondary', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            No Department Folders Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {search || selectedStreamTab !== 'ALL'
              ? 'No department folders match the active stream filter or search query.'
              : 'Click "Create Category" above to add your first department folder.'}
          </Typography>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 2.5,
            alignItems: 'stretch',
          }}
        >
          <AnimatePresence>
            {filteredDepts.map((dept) => {
              const stats = getDeptStats(dept);
              const folderColor = dept.color || '#3B82F6';
              const streamStr = String(dept.stream_name || dept.stream?.name || '').toLowerCase();
              const isAided = streamStr.includes('aided');
              const isSFS = streamStr.includes('sfs') || streamStr.includes('self-financed');
              const isAnimatingOut = animatingId === dept.id;

              return (
                <Box
                  key={dept.id}
                  component={motion.div}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: isAnimatingOut ? 0 : 1, scale: isAnimatingOut ? 0.9 : 1 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                  layout
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <Box sx={{ position: 'relative', pt: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {/* Iconic Folder Tab on Top-Left */}
                    <Box
                      onClick={() => navigate(`/explorer?search=${encodeURIComponent(dept.name)}`)}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '46%',
                        minWidth: 95,
                        maxWidth: 155,
                        height: '20px',
                        bgcolor: folderColor,
                        borderRadius: '10px 10px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        px: 1.5,
                        boxShadow: `0 -2px 6px ${folderColor}20`,
                        zIndex: 1,
                        cursor: 'pointer',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dept.code || 'FOLDER'}
                      </Typography>
                    </Box>

                    {/* Main Folder Body Card */}
                    <Card
                      className="card-lift"
                      onClick={() => navigate(`/explorer?search=${encodeURIComponent(dept.name)}`)}
                      sx={{
                        cursor: 'pointer',
                        p: 2.2,
                        borderRadius: '0 18px 18px 18px',
                        border: '1.5px solid',
                        borderColor: 'divider',
                        borderLeft: `5px solid ${folderColor}`,
                        bgcolor: 'background.paper',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.22s ease',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                        position: 'relative',
                        '&:hover': {
                          borderColor: folderColor,
                          bgcolor: `${folderColor}06`,
                          transform: 'translateY(-4px)',
                          boxShadow: `0 12px 24px ${folderColor}18`,
                          '& .folder-icon': {
                            transform: 'scale(1.08)',
                          },
                          '& .open-arrow': {
                            transform: 'translateX(4px)',
                          }
                        }
                      }}
                    >
                      <Box>
                        {/* Top row: Folder Icon + Stream chip + Edit/Delete actions */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <FolderIcon 
                              className="folder-icon"
                              sx={{ 
                                fontSize: 46, 
                                color: folderColor,
                                filter: `drop-shadow(0 4px 10px ${folderColor}35)`,
                                transition: 'transform 0.2s ease',
                              }} 
                            />
                          </Box>

                          <Box sx={{ display: 'flex', gap: 0.6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {dept.stream_name && (
                              <Chip
                                label={dept.stream_name}
                                size="small"
                                sx={{
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  height: 22,
                                  borderRadius: '6px',
                                  bgcolor: isAided
                                    ? 'rgba(14, 165, 233, 0.12)'
                                    : isSFS
                                    ? 'rgba(139, 92, 246, 0.12)'
                                    : 'rgba(100, 116, 139, 0.12)',
                                  color: isAided ? '#0284C7' : isSFS ? '#7C3AED' : '#475569',
                                  border: 'none'
                                }}
                              />
                            )}

                            <Chip 
                              label={dept.category_type === 'Company' ? 'Company' : 'Dept'} 
                              size="small" 
                              sx={{ 
                                fontSize: '0.62rem', 
                                fontWeight: 700, 
                                height: 22, 
                                borderRadius: '6px',
                                bgcolor: dept.category_type === 'Company' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                                color: dept.category_type === 'Company' ? '#EC4899' : '#3B82F6',
                                border: 'none'
                              }} 
                            />

                            {/* Edit Button */}
                            <Tooltip title="Edit Department & Move Related Items">
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditClick(dept);
                                }}
                                sx={{ 
                                  p: 0.6,
                                  bgcolor: 'rgba(79, 70, 229, 0.08)',
                                  '&:hover': { bgcolor: 'rgba(79, 70, 229, 0.18)' }
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {/* Delete Button */}
                            <Tooltip title="Delete Category">
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(dept);
                                }}
                                sx={{ p: 0.6 }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>

                        {/* Folder Name - fixed 2-line height for perfect horizontal alignment */}
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 800, 
                            mb: 0.5, 
                            fontSize: '0.96rem',
                            color: 'text.primary',
                            lineHeight: 1.35,
                            minHeight: '2.7em',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {dept.name}
                        </Typography>

                        {/* Coordinator / Info line */}
                        {dept.coordinator_name ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1.5, fontWeight: 500, height: 18 }}>
                            <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <span>Coordinator: <strong>{dept.coordinator_name}</strong></span>
                          </Typography>
                        ) : (
                          <Box sx={{ height: 18, mb: 1.5 }} />
                        )}
                      </Box>

                      {/* Folder Directory Contents Footer */}
                      <Box 
                        sx={{ 
                          pt: 1.5, 
                          borderTop: '1px solid', 
                          borderColor: 'divider', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mt: 'auto'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8rem' }}>
                            {stats.total === 0 ? 'Empty Folder' : `${stats.total} MOU${stats.total > 1 ? 's' : ''}`}
                          </Typography>
                          {stats.active > 0 && (
                            <Chip 
                              label={`${stats.active} Active`} 
                              size="small" 
                              sx={{ 
                                height: 18, 
                                fontSize: '0.62rem', 
                                fontWeight: 800, 
                                bgcolor: 'rgba(16, 185, 129, 0.12)', 
                                color: '#10B981',
                                border: 'none'
                              }} 
                            />
                          )}
                          {stats.expiring > 0 && (
                            <Chip 
                              label={`${stats.expiring} Expiring`} 
                              size="small" 
                              sx={{ 
                                height: 18, 
                                fontSize: '0.62rem', 
                                fontWeight: 800, 
                                bgcolor: 'rgba(249, 115, 22, 0.12)', 
                                color: '#F97316',
                                border: 'none'
                              }} 
                            />
                          )}
                        </Box>

                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5, 
                            color: folderColor, 
                            fontWeight: 800, 
                            fontSize: '0.8rem' 
                          }}
                        >
                          <span>Open</span>
                          <ArrowForwardIcon 
                            className="open-arrow"
                            sx={{ fontSize: 15, transition: 'transform 0.2s ease' }} 
                          />
                        </Box>
                      </Box>
                    </Card>
                  </Box>
                </Box>
              );
            })}
          </AnimatePresence>
        </Box>
      )}

      {/* Edit Department & Assign Items Dialog */}
      <Dialog 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        maxWidth="md" 
        fullWidth 
        slotProps={{ paper: { sx: { borderRadius: '22px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: getBgColor(editColor), color: editColor, width: 40, height: 40, borderRadius: '10px' }}>
              {getIcon(editIconType)}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Edit Department / Category
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Configure details, assign coordinators, and move repository folders &amp; MOUs
              </Typography>
            </Box>
          </Box>
          <Chip label={editCode || 'CODE'} size="small" sx={{ fontWeight: 800, bgcolor: getBgColor(editColor), color: editColor }} />
        </DialogTitle>

        <Box sx={{ px: 3, pt: 1 }}>
          <Tabs 
            value={editActiveTab} 
            onChange={(e, val) => setEditActiveTab(val)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.9rem' }
            }}
          >
            <Tab label="Department & Coordinator" />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Move Folders & MOUs Here</span>
                  {(assignedFolderIds.length > 0 || assignedMOUIds.length > 0) && (
                    <Chip 
                      label={assignedFolderIds.length + assignedMOUIds.length} 
                      size="small" 
                      color="primary" 
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800 }} 
                    />
                  )}
                </Box>
              } 
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ pt: 2.5 }}>
          {editActiveTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <TextField
                required
                label={editCategoryType === 'Company' ? "Company / Partner Name" : "Department Name"}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                fullWidth
              />

              <Grid container spacing={2}>
                <Grid xs={6}>
                  <TextField
                    required
                    label="Abbreviation Code"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid xs={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Category Type</InputLabel>
                    <Select
                      value={editCategoryType}
                      label="Category Type"
                      onChange={(e) => setEditCategoryType(e.target.value)}
                    >
                      <MenuItem value="Department">College Department</MenuItem>
                      <MenuItem value="Company">Company Name / Partner</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Academic Stream Selection (Aided vs SFS) */}
              <FormControl fullWidth>
                <InputLabel>Academic Stream (Aided / SFS)</InputLabel>
                <Select
                  value={editStreamId}
                  label="Academic Stream (Aided / SFS)"
                  onChange={(e) => setEditStreamId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>General / Unassigned Stream</em>
                  </MenuItem>
                  {streams.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Grid container spacing={2}>
                <Grid xs={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Icon Style</InputLabel>
                    <Select
                      value={editIconType}
                      label="Icon Style"
                      onChange={(e) => setEditIconType(e.target.value)}
                    >
                      <MenuItem value="school">School / Academic</MenuItem>
                      <MenuItem value="hospital">Hospital / Medical</MenuItem>
                      <MenuItem value="business">Business Center</MenuItem>
                      <MenuItem value="palette">Arts / Design</MenuItem>
                      <MenuItem value="science">Science / Lab</MenuItem>
                      <MenuItem value="gavel">Law / Policy</MenuItem>
                      <MenuItem value="company">Company / Organization</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid xs={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Color Theme</InputLabel>
                    <Select
                      value={editColor}
                      label="Color Theme"
                      onChange={(e) => setEditColor(e.target.value)}
                    >
                      <MenuItem value="#3B82F6">Blue</MenuItem>
                      <MenuItem value="#14B8A6">Teal</MenuItem>
                      <MenuItem value="#F59E0B">Amber / Yellow</MenuItem>
                      <MenuItem value="#EC4899">Pink</MenuItem>
                      <MenuItem value="#8B5CF6">Purple</MenuItem>
                      <MenuItem value="#F97316">Orange</MenuItem>
                      <MenuItem value="#64748B">Grey</MenuItem>
                      <MenuItem value="#10B981">Green</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Coordinator Assignment Section */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon fontSize="small" color="primary" /> Assign Department Coordinator
                </Typography>
                
                {systemUsers.length > 0 && (
                  <Autocomplete
                    options={systemUsers}
                    getOptionLabel={(option) => {
                      const full = `${option.first_name || ''} ${option.last_name || ''}`.trim();
                      return full ? `${full} (${option.email || option.username})` : (option.email || option.username || '');
                    }}
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        size="small" 
                        label="Quick Select from Registered Staff / Users" 
                        placeholder="Search user..."
                        sx={{ mb: 2 }}
                      />
                    )}
                    onChange={(event, selectedUser) => {
                      if (selectedUser) {
                        const fullName = `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.username;
                        setEditCoordName(fullName);
                        if (selectedUser.email) {
                          setEditCoordEmail(selectedUser.email);
                        }
                      }
                    }}
                  />
                )}

                <Grid container spacing={2}>
                  <Grid xs={6}>
                    <TextField
                      label="Coordinator Name"
                      placeholder="e.g. Dr. Jane Doe"
                      value={editCoordName}
                      onChange={(e) => setEditCoordName(e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid xs={6}>
                    <TextField
                      label="Coordinator Email"
                      placeholder="e.g. coordinator@mcc.edu.in"
                      type="email"
                      value={editCoordEmail}
                      onChange={(e) => setEditCoordEmail(e.target.value)}
                      fullWidth
                      size="small"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                          ),
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}

          {editActiveTab === 1 && (
            <Box sx={{ mt: 1 }}>
              {loadingAssigned ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={36} />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Alert severity="info" sx={{ borderRadius: '12px', fontSize: '0.82rem' }}>
                    Select folders or MOUs to assign to <strong>{editName || 'this department'}</strong>. 
                    Folders and their files will be relocated into this department folder in both the database and Google Drive.
                  </Alert>

                  {/* Section 1: Repository Folders & Subfolders */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FolderIcon fontSize="small" color="primary" /> Repository Folders & Subfolders ({assignedFolderIds.length} assigned)
                        </Typography>
                        <Chip 
                          label={`${availableFolders.length} total`} 
                          size="small" 
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} 
                        />
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <ToggleButtonGroup
                          size="small"
                          value={folderFilterType}
                          exclusive
                          onChange={(e, val) => val && setFolderFilterType(val)}
                          sx={{ 
                            height: 32,
                            '& .MuiToggleButton-root': { px: 1.2, py: 0.2, fontSize: '0.74rem', textTransform: 'none', fontWeight: 700 }
                          }}
                        >
                          <ToggleButton value="all">All</ToggleButton>
                          <ToggleButton value="subfolders">Subfolders</ToggleButton>
                          <ToggleButton value="assigned">Assigned ({assignedFolderIds.length})</ToggleButton>
                        </ToggleButtonGroup>

                        <TextField
                          size="small"
                          placeholder="Search folders & paths..."
                          value={folderSearch}
                          onChange={(e) => setFolderSearch(e.target.value)}
                          sx={{ width: 190 }}
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon fontSize="small" />
                                </InputAdornment>
                              ),
                            }
                          }}
                        />

                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CreateNewFolderIcon />}
                          onClick={() => {
                            setIsCreatingSubfolder(prev => !prev);
                            setNewSubfolderParentId('');
                            setNewSubfolderName('');
                          }}
                          sx={{ 
                            borderRadius: '8px', 
                            fontWeight: 700, 
                            fontSize: '0.78rem',
                            textTransform: 'none',
                            bgcolor: isCreatingSubfolder ? 'grey.700' : 'primary.main',
                            whiteSpace: 'nowrap',
                            height: 34
                          }}
                        >
                          {isCreatingSubfolder ? 'Cancel' : '+ New Subfolder'}
                        </Button>
                      </Box>
                    </Box>

                    {/* Quick Subfolder Creation Form */}
                    {isCreatingSubfolder && (
                      <Paper 
                        variant="outlined"
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderRadius: '12px', 
                          bgcolor: 'action.hover', 
                          border: '1.5px dashed', 
                          borderColor: 'primary.main',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.5
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                          <CreateNewFolderIcon fontSize="small" /> Create New Subfolder in {editName || 'Department'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                          <TextField
                            size="small"
                            label="Subfolder Name"
                            placeholder="e.g. 2026 Projects, Research, Lab Notes..."
                            value={newSubfolderName}
                            onChange={(e) => setNewSubfolderName(e.target.value)}
                            sx={{ flex: 1, minWidth: 220, bgcolor: 'background.paper' }}
                            autoFocus
                          />
                          <FormControl size="small" sx={{ minWidth: 240, bgcolor: 'background.paper' }}>
                            <InputLabel>Parent Placement</InputLabel>
                            <Select
                              value={newSubfolderParentId}
                              label="Parent Placement"
                              onChange={(e) => setNewSubfolderParentId(e.target.value)}
                            >
                              <MenuItem value="">
                                <em>📁 {editName || 'Department'} (Root Level)</em>
                              </MenuItem>
                              {availableFolders.filter(f => assignedFolderIds.includes(f.id)).map(f => (
                                <MenuItem key={f.id} value={f.id}>
                                  ↳ {f.path || f.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Button
                            variant="contained"
                            disabled={!newSubfolderName.trim() || creatingSubfolderLoading}
                            onClick={handleCreateSubfolder}
                            sx={{ fontWeight: 700, px: 2.5, height: 40, textTransform: 'none', borderRadius: '8px' }}
                          >
                            {creatingSubfolderLoading ? <CircularProgress size={20} color="inherit" /> : 'Create & Assign'}
                          </Button>
                        </Box>
                      </Paper>
                    )}

                    <Paper variant="outlined" sx={{ maxHeight: 260, overflowY: 'auto', borderRadius: '12px' }}>
                      {filteredAvailableFolders.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            No folders or subfolders found.
                          </Typography>
                        </Box>
                      ) : (
                        <List dense disablePadding>
                          {filteredAvailableFolders.map(folder => {
                            const isAssigned = assignedFolderIds.includes(folder.id);
                            const depth = folder.depth || 0;
                            const hasChildren = (folder.subfolder_count || 0) > 0;

                            return (
                              <ListItem 
                                key={folder.id} 
                                disablePadding
                                sx={{ 
                                  bgcolor: isAssigned ? 'action.selected' : 'inherit',
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                  pl: depth > 0 ? `${Math.min(depth * 20, 80)}px` : 0,
                                  transition: 'background-color 0.15s ease'
                                }}
                              >
                                <ListItemButton 
                                  onClick={() => toggleFolder(folder.id)}
                                  sx={{ py: 0.8, px: 1.5 }}
                                >
                                  <ListItemIcon sx={{ minWidth: 32 }}>
                                    <Checkbox
                                      edge="start"
                                      checked={isAssigned}
                                      tabIndex={-1}
                                      disableRipple
                                      size="small"
                                    />
                                  </ListItemIcon>

                                  {depth > 0 && (
                                    <SubdirectoryArrowRightIcon 
                                      sx={{ 
                                        color: isAssigned ? 'primary.main' : 'text.disabled', 
                                        mr: 1, 
                                        fontSize: 18 
                                      }} 
                                    />
                                  )}

                                  <FolderIcon 
                                    sx={{ 
                                      color: folder.status && ['Ongoing', 'Expired', 'Others'].includes(folder.status)
                                        ? getDynamicFolderColor(folder)
                                        : (isAssigned ? 'primary.main' : (depth > 0 ? 'info.main' : 'text.secondary')), 
                                      mr: 1.5, 
                                      fontSize: 20 
                                    }} 
                                  />

                                  <ListItemText 
                                    primary={
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                        <Typography component="span" sx={{ fontWeight: isAssigned ? 700 : 500, fontSize: '0.85rem' }}>
                                          {folder.name}
                                        </Typography>
                                        {depth > 0 && (
                                          <Chip 
                                            label={depth === 1 ? 'Subfolder' : `Nested L${depth}`} 
                                            size="small" 
                                            variant="outlined"
                                            color={depth === 1 ? "info" : "default"}
                                            sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600 }} 
                                          />
                                        )}
                                        {hasChildren && (
                                          <Chip 
                                            label={`${folder.subfolder_count} subfolders`} 
                                            size="small" 
                                            sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'action.hover' }} 
                                          />
                                        )}
                                      </Box>
                                    }
                                    secondary={
                                      depth > 0 ? (
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.72rem' }}>
                                          {folder.path}
                                        </Typography>
                                      ) : null
                                    }
                                  />

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Tooltip title="Add a nested subfolder inside this folder">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsCreatingSubfolder(true);
                                          setNewSubfolderParentId(folder.id);
                                          setNewSubfolderName('');
                                        }}
                                        sx={{ p: 0.5, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                      >
                                        <CreateNewFolderIcon sx={{ fontSize: 18 }} />
                                      </IconButton>
                                    </Tooltip>

                                    {isAssigned && (
                                      <Chip 
                                        label="Assigned" 
                                        color="primary" 
                                        size="small" 
                                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} 
                                      />
                                    )}
                                  </Box>
                                </ListItemButton>
                              </ListItem>
                            );
                          })}
                        </List>
                      )}
                    </Paper>
                  </Box>

                  {/* Section 2: MOUs */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DescriptionIcon fontSize="small" color="primary" /> Institutional MOUs ({assignedMOUIds.length} assigned)
                      </Typography>
                      <TextField
                        size="small"
                        placeholder="Search MOUs..."
                        value={mouSearch}
                        onChange={(e) => setMouSearch(e.target.value)}
                        sx={{ width: 220 }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }
                        }}
                      />
                    </Box>

                    <Paper variant="outlined" sx={{ maxHeight: 220, overflowY: 'auto', borderRadius: '12px' }}>
                      {filteredAvailableMOUs.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            No MOUs available.
                          </Typography>
                        </Box>
                      ) : (
                        <List dense disablePadding>
                          {filteredAvailableMOUs.map(mou => {
                            const isAssigned = assignedMOUIds.includes(mou.id);
                            return (
                              <ListItem 
                                key={mou.id} 
                                disablePadding
                                sx={{ 
                                  bgcolor: isAssigned ? 'action.selected' : 'inherit',
                                  borderBottom: '1px solid',
                                  borderColor: 'divider'
                                }}
                              >
                                <ListItemButton onClick={() => toggleMOU(mou.id)}>
                                  <ListItemIcon sx={{ minWidth: 36 }}>
                                    <Checkbox
                                      edge="start"
                                      checked={isAssigned}
                                      tabIndex={-1}
                                      disableRipple
                                      size="small"
                                    />
                                  </ListItemIcon>
                                  <DescriptionIcon sx={{ color: isAssigned ? 'primary.main' : 'text.secondary', mr: 1.5, fontSize: 20 }} />
                                  <ListItemText 
                                    primary={mou.title}
                                    secondary={`${mou.mou_number || 'No #'} • ${mou.partner_organization || 'No Partner'} • Dept: ${mou.department_name || 'None'}`}
                                    primaryTypographyProps={{ fontWeight: isAssigned ? 700 : 500, fontSize: '0.85rem' }}
                                    secondaryTypographyProps={{ fontSize: '0.72rem' }}
                                  />
                                  {isAssigned && (
                                    <Chip label="Assigned" color="primary" size="small" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                                  )}
                                </ListItemButton>
                              </ListItem>
                            );
                          })}
                        </List>
                      )}
                    </Paper>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1.5 }}>
          <Button onClick={() => setEditOpen(false)} variant="outlined" sx={{ borderRadius: '10px' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={savingEdit}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {savingEdit ? 'Saving Changes...' : 'Save & Move Items'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Create New Category {categoryType === 'Company' ? '(Company / Partner)' : '(College Department)'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <TextField
              required
              label={categoryType === 'Company' ? "Company / Partner Name" : "Department Name"}
              placeholder={categoryType === 'Company' ? "e.g. Google Cloud Labs" : "e.g. Computer Science"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />

            <Grid container spacing={2}>
              <Grid xs={6}>
                <TextField
                  required
                  label="Abbreviation Code"
                  placeholder="e.g. CSE, GCP"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category Type</InputLabel>
                  <Select
                    value={categoryType}
                    label="Category Type"
                    onChange={(e) => setCategoryType(e.target.value)}
                  >
                    <MenuItem value="Department">College Department</MenuItem>
                    <MenuItem value="Company">Company Name / Partner</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Academic Stream Selection (Aided vs SFS) */}
            <FormControl fullWidth>
              <InputLabel>Academic Stream (Aided / SFS)</InputLabel>
              <Select
                value={streamId}
                label="Academic Stream (Aided / SFS)"
                onChange={(e) => setStreamId(e.target.value)}
              >
                <MenuItem value="">
                  <em>General / Unassigned Stream</em>
                </MenuItem>
                {streams.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Icon Style</InputLabel>
                  <Select
                    value={iconType}
                    label="Icon Style"
                    onChange={(e) => setIconType(e.target.value)}
                  >
                    <MenuItem value="school">School / Academic</MenuItem>
                    <MenuItem value="hospital">Hospital / Medical</MenuItem>
                    <MenuItem value="business">Business Center</MenuItem>
                    <MenuItem value="palette">Arts / Design</MenuItem>
                    <MenuItem value="science">Science / Lab</MenuItem>
                    <MenuItem value="gavel">Law / Policy</MenuItem>
                    <MenuItem value="company">Company / Organization</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Color Theme</InputLabel>
                  <Select
                    value={color}
                    label="Color Theme"
                    onChange={(e) => setColor(e.target.value)}
                  >
                    <MenuItem value="#3B82F6">Blue</MenuItem>
                    <MenuItem value="#14B8A6">Teal</MenuItem>
                    <MenuItem value="#F59E0B">Amber / Yellow</MenuItem>
                    <MenuItem value="#EC4899">Pink</MenuItem>
                    <MenuItem value="#8B5CF6">Purple</MenuItem>
                    <MenuItem value="#F97316">Orange</MenuItem>
                    <MenuItem value="#64748B">Grey</MenuItem>
                    <MenuItem value="#10B981">Green</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid xs={6}>
                <TextField
                  label="Coordinator Name"
                  placeholder="e.g. Dr. Jane Doe"
                  value={coordName}
                  onChange={(e) => setCoordName(e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid xs={6}>
                <TextField
                  label="Coordinator Email"
                  placeholder="e.g. coordinator@mcc.edu.in"
                  type="email"
                  value={coordEmail}
                  onChange={(e) => setCoordEmail(e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)} variant="outlined" sx={{ borderRadius: '10px' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={saving}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {saving ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800, color: 'error.main' }}>
          <WarningAmberIcon sx={{ fontSize: 32, color: 'error.main' }} />
          Delete Category
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            Are you sure you want to delete the category <strong>"{categoryToDelete?.name}"</strong>{categoryToDelete?.stream_name ? ` [${categoryToDelete.stream_name}]` : ''}?
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: '12px', fontSize: '0.82rem' }}>
            This action will remove the category from the directory and update linked department records.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} variant="outlined" disabled={deleting} sx={{ borderRadius: '10px', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {deleting ? 'Deleting...' : 'Delete Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Departments;
