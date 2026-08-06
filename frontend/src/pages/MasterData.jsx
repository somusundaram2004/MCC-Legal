import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Grid, Tabs, Tab, Button, TextField, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Switch, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Chip, Alert, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import ListIcon from '@mui/icons-material/List';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';

import {
  getMasterCategories, createMasterCategory, updateMasterCategory, deleteMasterCategory,
  getMasterOrgTypes, createMasterOrgType, updateMasterOrgType, deleteMasterOrgType,
  getMasterCollabTypes, createMasterCollabType, updateMasterCollabType, deleteMasterCollabType,
  getMasterDocTypes, createMasterDocType, updateMasterDocType, deleteMasterDocType,
  getMasterTags, createMasterTag, updateMasterTag, deleteMasterTag,
  getMasterDeptCategories, createMasterDeptCategory, updateMasterDeptCategory, deleteMasterDeptCategory,
  getMasterDepartments, createMasterDepartment, updateMasterDepartment, deleteMasterDepartment
} from '../services/templateApi';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);
  const [data, setData] = useState([]);
  const [deptCategories, setDeptCategories] = useState([]); // Loaded for departments categorization

  // Dialog State
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // For Department category mapping

  const TABS_CONFIG = [
    { label: 'Template Categories', fetch: getMasterCategories, create: createMasterCategory, update: updateMasterCategory, delete: deleteMasterCategory },
    { label: 'Organization Types', fetch: getMasterOrgTypes, create: createMasterOrgType, update: updateMasterOrgType, delete: deleteMasterOrgType },
    { label: 'Collaboration Types', fetch: getMasterCollabTypes, create: createMasterCollabType, update: updateMasterCollabType, delete: deleteMasterCollabType },
    { label: 'Document Types', fetch: getMasterDocTypes, create: createMasterDocType, update: updateMasterDocType, delete: deleteMasterDocType },
    { label: 'Tags', fetch: getMasterTags, create: createMasterTag, update: updateMasterTag, delete: deleteMasterTag },
    { label: 'Department Categories', fetch: getMasterDeptCategories, create: createMasterDeptCategory, update: updateMasterDeptCategory, delete: deleteMasterDeptCategory },
    { label: 'Departments', fetch: getMasterDepartments, create: createMasterDepartment, update: updateMasterDepartment, delete: deleteMasterDepartment }
  ];

  const currentTab = TABS_CONFIG[activeTab];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await currentTab.fetch();
      setData(result);

      if (activeTab === 6) { // Departments loaded, load categories too
        const cats = await getMasterDeptCategories();
        setDeptCategories(cats);
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

  const handleOpen = (item = null) => {
    if (item) {
      setEditId(item.id);
      setName(item.name);
      setSelectedCategory(item.category || '');
    } else {
      setEditId(null);
      setName('');
      setSelectedCategory('');
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setName('');
    setSelectedCategory('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      const payload = { name: name.trim() };
      if (activeTab === 6) { // For department
        payload.category = selectedCategory;
      }

      if (editId) {
        await currentTab.update(editId, { ...payload, is_active: true });
      } else {
        await currentTab.create(payload);
      }
      handleClose();
      loadData();
    } catch (err) {
      console.error(err);
      setError('Save failed. Value might be a duplicate.');
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const payload = { name: item.name, is_active: !item.is_active };
      if (activeTab === 6) {
        payload.category = item.category;
      }
      await currentTab.update(item.id, payload);
      loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to change status.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this option? Lookups already bound to active documents cannot be removed.')) {
      try {
        await currentTab.delete(id);
        setSuccess('Option deleted successfully.');
        loadData();
      } catch (err) {
        console.error(err);
        setError('Cannot delete options currently linked with collections.');
      }
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
              Add, update, or deactivate dropdown items throughout college user creation forms and MOU documents dynamically.
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

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setSuccess(null)}>{success}</Alert>}

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
                  {activeTab === 6 && <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>}
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === 6 ? 5 : 4} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No lookup values added yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.id}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                      {activeTab === 6 && (
                        <TableCell>
                          <Chip label={item.category_name || 'Unassigned'} size="small" color="primary" variant="outlined" />
                        </TableCell>
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
                        <IconButton size="small" onClick={() => handleDelete(item.id)} sx={{ color: 'error.main' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Editor Modal */}
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

          {activeTab === 6 && (
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {deptCategories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: '12px', fontWeight: 700 }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MasterData;
