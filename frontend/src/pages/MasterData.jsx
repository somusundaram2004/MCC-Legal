import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Grid, Tabs, Tab, Button, TextField, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Chip, Alert, CircularProgress
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';

import {
  getMasterCategories, createMasterCategory, updateMasterCategory, deleteMasterCategory,
  getMasterOrgTypes, createMasterOrgType, updateMasterOrgType, deleteMasterOrgType,
  getMasterCollabTypes, createMasterCollabType, updateMasterCollabType, deleteMasterCollabType,
  getMasterDocTypes, createMasterDocType, updateMasterDocType, deleteMasterDocType,
  getMasterTags, createMasterTag, updateMasterTag, deleteMasterTag,
  getMasterDeptCategories, createMasterDeptCategory, updateMasterDeptCategory, deleteMasterDeptCategory,
  getMasterDepartments, createMasterDepartment, updateMasterDepartment, deleteMasterDepartment,
  getMasterStreams, createMasterStream, updateMasterStream, deleteMasterStream
} from '../services/templateApi';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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

  const [data, setData] = useState([]);
  const [deptCategories, setDeptCategories] = useState([]);
  const [streams, setStreams] = useState([]);

  // Add / Edit Dialog State
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStream, setSelectedStream] = useState('');

  // Delete Dialog & Animation State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [animatingId, setAnimatingId] = useState(null);

  const TABS_CONFIG = [
    { label: 'Template Categories', fetch: getMasterCategories, create: createMasterCategory, update: updateMasterCategory, delete: deleteMasterCategory },
    { label: 'Organization Types', fetch: getMasterOrgTypes, create: createMasterOrgType, update: updateMasterOrgType, delete: deleteMasterOrgType },
    { label: 'Collaboration Types', fetch: getMasterCollabTypes, create: createMasterCollabType, update: updateMasterCollabType, delete: deleteMasterCollabType },
    { label: 'Document Types', fetch: getMasterDocTypes, create: createMasterDocType, update: updateMasterDocType, delete: deleteMasterDocType },
    { label: 'Tags', fetch: getMasterTags, create: createMasterTag, update: updateMasterTag, delete: deleteMasterTag },
    { label: 'Streams', fetch: getMasterStreams, create: createMasterStream, update: updateMasterStream, delete: deleteMasterStream },
    { label: 'Dept. Categories', fetch: getMasterDeptCategories, create: createMasterDeptCategory, update: updateMasterDeptCategory, delete: deleteMasterDeptCategory },
    { label: 'Departments', fetch: getMasterDepartments, create: createMasterDepartment, update: updateMasterDepartment, delete: deleteMasterDepartment }
  ];

  const currentTab = TABS_CONFIG[activeTab];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await currentTab.fetch();
      setData(result || []);

      if (currentTab.label === 'Departments') {
        const [cats, strms] = await Promise.all([
          getMasterDeptCategories().catch(() => []),
          getMasterStreams().catch(() => [])
        ]);
        setDeptCategories(cats);
        setStreams(strms);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load lookup data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleOpen = async (item = null) => {
    if (currentTab.label === 'Departments' && (deptCategories.length === 0 || streams.length === 0)) {
      try {
        const [cats, strms] = await Promise.all([
          getMasterDeptCategories().catch(() => []),
          getMasterStreams().catch(() => [])
        ]);
        setDeptCategories(cats);
        setStreams(strms);
      } catch (err) {
        console.error('Failed to load department dependencies:', err);
      }
    }

    if (item) {
      setEditId(item.id);
      setName(item.name);
      setSelectedCategory(item.category || '');
      setSelectedStream(item.stream || '');
    } else {
      setEditId(null);
      setName('');
      setSelectedCategory('');
      setSelectedStream('');
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setName('');
    setSelectedCategory('');
    setSelectedStream('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      const payload = { name: name.trim() };
      if (currentTab.label === 'Departments') {
        payload.category = selectedCategory || null;
        payload.stream = selectedStream || null;
      }

      if (editId) {
        await currentTab.update(editId, { ...payload, is_active: true });
        setSuccess(`${currentTab.label.slice(0, -1)} updated successfully.`);
      } else {
        await currentTab.create(payload);
        setSuccess(`New ${currentTab.label.slice(0, -1)} added successfully.`);
      }
      handleClose();
      loadData();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Save failed. Value might be a duplicate.');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const payload = { name: item.name, is_active: !item.is_active };
      if (currentTab.label === 'Departments') {
        payload.category = item.category || null;
        payload.stream = item.stream || null;
      }
      await currentTab.update(item.id, payload);
      loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to change status.');
    }
  };

  // Trigger Confirmation Modal
  const handleConfirmDeleteClick = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  // Perform Delete with Pop-up Confirmation & Exit Animation
  const handleExecuteDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await currentTab.delete(itemToDelete.id);
      
      // Trigger smooth exit animation on table row
      setAnimatingId(itemToDelete.id);
      setDeleteDialogOpen(false);
      setSuccess(`"${itemToDelete.name}" deleted successfully.`);

      setTimeout(() => {
        setData((prev) => prev.filter((d) => d.id !== itemToDelete.id));
        setItemToDelete(null);
        setAnimatingId(null);
      }, 350);
    } catch (err) {
      console.error('Delete error:', err);
      const errMsg = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Cannot delete option as it is linked to active records.';
      setError(errMsg);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-slide-up">
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsSuggestIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Master Data Management</Typography>
            <Typography variant="body2" color="text.secondary">
              Add, update, or deactivate dynamic lookup options (Streams, Categories, Departments, Templates) system-wide.
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{ borderRadius: '24px', px: 3, fontWeight: 700 }}
        >
          Add Custom Option
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Tabs Menu */}
      <Card sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 700, py: 2 }
          }}
        >
          {TABS_CONFIG.map((t, idx) => (
            <Tab key={idx} label={t.label} />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ boxShadow: 'none', borderRadius: '0 0 16px 16px' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Lookup Value</TableCell>
                  {currentTab.label === 'Departments' && <TableCell sx={{ fontWeight: 800 }}>Stream</TableCell>}
                  {currentTab.label === 'Departments' && <TableCell sx={{ fontWeight: 800 }}>Dept. Category</TableCell>}
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={currentTab.label === 'Departments' ? 6 : 4} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No lookup values added yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence>
                    {data.map((item) => {
                      const isAnimatingOut = animatingId === item.id;
                      return (
                        <TableRow
                          key={item.id}
                          hover
                          component={motion.tr}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: isAnimatingOut ? 0 : 1, y: 0, scale: isAnimatingOut ? 0.95 : 1 }}
                          exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
                          sx={{
                            transition: 'background-color 0.2s ease',
                            bgcolor: isAnimatingOut ? 'rgba(239, 68, 68, 0.08)' : 'inherit'
                          }}
                        >
                          <TableCell>{item.id}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                          {currentTab.label === 'Departments' && (
                            <>
                              <TableCell>
                                <Chip label={item.stream_name || 'Unassigned'} size="small" color="secondary" variant="outlined" sx={{ fontWeight: 700 }} />
                              </TableCell>
                              <TableCell>
                                <Chip label={item.category_name || 'Unassigned'} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Switch
                                size="small"
                                checked={item.is_active}
                                onChange={() => handleToggleActive(item)}
                              />
                              <Chip
                                label={item.is_active ? 'Active' : 'Disabled'}
                                size="small"
                                color={item.is_active ? 'success' : 'default'}
                                sx={{ fontWeight: 800, height: 20 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleOpen(item)} sx={{ mr: 1, color: 'primary.main' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => handleConfirmDeleteClick(item)} sx={{ color: 'error.main' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Editor Modal (Add / Edit) */}
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px' } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editId ? `Edit ${currentTab.label}` : `Add New ${currentTab.label}`}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
            label="Name / Value"
            fullWidth
            required
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />

          {currentTab.label === 'Departments' && (
            <>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Stream (e.g. Aided, SFS)</InputLabel>
                <Select
                  value={selectedStream}
                  label="Stream (e.g. Aided, SFS)"
                  onChange={(e) => setSelectedStream(e.target.value)}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {streams.filter(s => s.is_active || s.id === selectedStream).map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}{!s.is_active ? ' (Disabled)' : ''}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Dept. Category (e.g. UG, PG)</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Dept. Category (e.g. UG, PG)"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {deptCategories.filter(c => c.is_active || c.id === selectedCategory).map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}{!c.is_active ? ' (Disabled)' : ''}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: '12px', fontWeight: 700 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Pop-Up Modal */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800, color: 'error.main' }}>
          <WarningAmberIcon sx={{ fontSize: 32, color: 'error.main' }} />
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            Are you sure you want to delete <strong>"{itemToDelete?.name}"</strong> from <strong>{currentTab.label}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: '12px', fontSize: '0.82rem' }}>
            This option will be permanently removed. If bound to existing documents or collections, deletion will be blocked to maintain data integrity.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            disabled={deleting}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExecuteDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
            sx={{ borderRadius: '10px', fontWeight: 700 }}
          >
            {deleting ? 'Deleting...' : 'Delete Option'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MasterData;
