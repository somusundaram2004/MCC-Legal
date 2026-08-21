import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Grid, Card, CardContent, Typography, Button, 
  Avatar, Chip, CircularProgress, Divider, TextField, 
  InputAdornment, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Alert, IconButton, Tooltip,
  ToggleButtonGroup, ToggleButton
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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

import { getMOUs } from '../services/mouApi';
import { getMOUCategories, createMOUCategory, deleteMOUCategory, getMasterStreams } from '../services/templateApi';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';

const Departments = () => {
  const navigate = useNavigate();
  const [mous, setMous] = useState([]);
  const [categories, setCategories] = useState([]);
  const [streams, setStreams] = useState([]);
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
  const [categoryType, setCategoryType] = useState('Department');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [saving, setSaving] = useState(false);

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
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Department Directory &amp; MOU Repositories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Browse institutional agreements, assigned department coordinators, and stream compliance metrics (**Aided &amp; Self-Financed SFS**).
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '8px',
                px: 2,
                py: 0.6,
                fontWeight: 700,
                fontSize: '0.78rem',
                textTransform: 'none',
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
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="Filter categories & code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 220 }}
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

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            sx={{ borderRadius: '12px', fontWeight: 700, py: 1 }}
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
          <SchoolIcon sx={{ fontSize: '3.5rem', color: 'text.secondary', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            No Departments Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {search || selectedStreamTab !== 'ALL'
              ? 'No categories match the active stream filter or search query.'
              : 'Click "Create Category" above to add your first department.'}
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          <AnimatePresence>
            {filteredDepts.map((dept) => {
              const stats = getDeptStats(dept);
              const bg = getBgColor(dept.color);
              const streamStr = String(dept.stream_name || dept.stream?.name || '').toLowerCase();
              const isAided = streamStr.includes('aided');
              const isSFS = streamStr.includes('sfs') || streamStr.includes('self-financed');
              const isAnimatingOut = animatingId === dept.id;

              return (
                <Grid
                  xs={12}
                  sm={6}
                  md={4}
                  key={dept.id}
                  component={motion.div}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: isAnimatingOut ? 0 : 1, scale: isAnimatingOut ? 0.9 : 1 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                  layout
                >
                  <Card
                    className="card-lift"
                    sx={{
                      p: 3,
                      borderRadius: '22px',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderLeft: `4px solid ${dept.color || '#3B82F6'}`,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      bgcolor: 'background.paper',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Avatar sx={{ bgcolor: bg, color: dept.color, width: 48, height: 48, borderRadius: '14px' }}>
                          {getIcon(dept.icon_type)}
                        </Avatar>
                        <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', flexWrap: 'wrap' }}>
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
                                  ? 'rgba(14, 165, 233, 0.15)'
                                  : isSFS
                                  ? 'rgba(139, 92, 246, 0.15)'
                                  : 'rgba(100, 116, 139, 0.15)',
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
                          <Chip label={dept.code} size="small" sx={{ fontWeight: 900, bgcolor: bg, color: dept.color, height: 22 }} />
                          <Tooltip title="Delete Category">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(dept);
                              }}
                              sx={{ p: 0.5 }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, fontSize: '1.05rem' }}>
                        {dept.name}
                      </Typography>

                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                        {dept.coordinator_name ? (
                          <>Coordinator: <strong>{dept.coordinator_name}</strong></>
                        ) : (
                          <em>No coordinator assigned</em>
                        )}
                      </Typography>

                      <Divider sx={{ my: 1.5 }} />

                      {/* Metrics */}
                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1, borderRadius: '10px', bgcolor: 'action.hover' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', fontWeight: 700 }}>TOTAL</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main' }}>{stats.total}</Typography>
                          </Box>
                        </Grid>
                        <Grid xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1, borderRadius: '10px', bgcolor: 'rgba(16,185,129,0.08)' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#10B981' }}>ACTIVE</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#10B981' }}>{stats.active}</Typography>
                          </Box>
                        </Grid>
                        <Grid xs={4}>
                          <Box sx={{ textAlign: 'center', p: 1, borderRadius: '10px', bgcolor: 'rgba(249,115,22,0.08)' }}>
                            <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#F97316' }}>EXPIRING</Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#F97316' }}>{stats.expiring}</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>

                    <Button
                      fullWidth
                      variant="outlined"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate(`/explorer?search=${encodeURIComponent(dept.name)}`)}
                      sx={{ borderRadius: '12px', fontWeight: 700 }}
                    >
                      View Department MOUs
                    </Button>
                  </Card>
                </Grid>
              );
            })}
          </AnimatePresence>
        </Grid>
      )}

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

            <TextField
              label="Coordinator Name"
              placeholder="e.g. Dr. Jane Doe"
              value={coordName}
              onChange={(e) => setCoordName(e.target.value)}
              fullWidth
            />
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
