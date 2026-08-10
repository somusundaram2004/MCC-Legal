import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Checkbox,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  Stack
} from '@mui/material';
import {
  DeleteOutlined as DeleteIcon,
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  Search as SearchIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  CleaningServices as CleanIcon,
  Schedule as ScheduleIcon,
  FolderZip as ArchiveIcon,
  ExtensionOutlined as ModuleIcon
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_RETENTION_OPTIONS = [
  { value: '7_days', label: '7 Days' },
  { value: '14_days', label: '14 Days' },
  { value: '30_days', label: '30 Days (1 Month)' },
  { value: '6_weeks', label: '6 Weeks' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
  { value: '1_year', label: '1 Year' },
  { value: 'never', label: 'Never (Keep Indefinitely)' }
];

export default function RecycleBin() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.name === 'Super Admin';

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Retention Settings State
  const [retentionPeriod, setRetentionPeriod] = useState('30_days');
  const [retentionDisplay, setRetentionDisplay] = useState('30 Days (1 Month)');
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(true);
  const [availableOptions, setAvailableOptions] = useState(DEFAULT_RETENTION_OPTIONS);
  const [savingSettings, setSavingSettings] = useState(false);

  // Dialog States
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const [confirmDeleteSingle, setConfirmDeleteSingle] = useState(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchRecycleBinData();
    fetchSettings();
  }, []);

  const fetchRecycleBinData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/recycle-bin/');
      setItems(response.data.items || []);
      if (response.data.retention_period) {
        setRetentionPeriod(response.data.retention_period);
        setRetentionDisplay(response.data.retention_display);
      }
    } catch (err) {
      console.error('Failed to fetch recycle bin items:', err);
      showAlert('Failed to load Recycle Bin items.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/recycle-bin/settings/');
      setRetentionPeriod(response.data.retention_period);
      setRetentionDisplay(response.data.retention_display);
      setAutoDeleteEnabled(response.data.auto_delete_enabled);
      setAvailableOptions(response.data.available_options || []);
    } catch (err) {
      console.error('Failed to fetch retention settings:', err);
    }
  };

  const handleUpdateSettings = async (newPeriod, newAutoDelete) => {
    setSavingSettings(true);
    try {
      const payload = {
        retention_period: newPeriod !== undefined ? newPeriod : retentionPeriod,
        auto_delete_enabled: newAutoDelete !== undefined ? newAutoDelete : autoDeleteEnabled,
      };
      const response = await api.patch('/api/recycle-bin/settings/', payload);
      setRetentionPeriod(response.data.retention_period);
      setRetentionDisplay(response.data.retention_display);
      setAutoDeleteEnabled(response.data.auto_delete_enabled);
      showAlert(`Retention policy updated to '${response.data.retention_display}'`, 'success');
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Failed to update retention policy.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const showAlert = (message, severity = 'success') => {
    setAlertInfo({ show: true, message, severity });
    setTimeout(() => setAlertInfo({ show: false, message: '', severity: 'success' }), 5000);
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Restore handlers
  const handleRestoreItems = async (itemsToRestore) => {
    setActionProcessing(true);
    try {
      const payload = {
        items: itemsToRestore.map(item => ({
          id: item.real_id,
          type: item.item_type
        }))
      };
      const response = await api.post('/api/recycle-bin/restore/', payload);
      showAlert(response.data.detail, 'success');
      setSelectedIds([]);
      fetchRecycleBinData();
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Failed to restore item(s).', 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  // Permanent Delete handlers
  const handlePermanentDeleteItems = async (itemsToDelete) => {
    setActionProcessing(true);
    try {
      const payload = {
        items: itemsToDelete.map(item => ({
          id: item.real_id,
          type: item.item_type
        }))
      };
      const response = await api.post('/api/recycle-bin/permanent-delete/', payload);
      showAlert(response.data.detail, 'success');
      setSelectedIds([]);
      setConfirmDeleteSingle(null);
      fetchRecycleBinData();
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Failed to permanently delete item(s).', 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  // Empty Bin Handler
  const handleEmptyBin = async () => {
    setActionProcessing(true);
    try {
      const response = await api.post('/api/recycle-bin/empty/');
      showAlert(response.data.detail, 'success');
      setConfirmEmptyOpen(false);
      setSelectedIds([]);
      fetchRecycleBinData();
    } catch (err) {
      showAlert(err.response?.data?.detail || 'Failed to empty Recycle Bin.', 'error');
    } finally {
      setActionProcessing(false);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (!isSuperAdmin && item.item_type === 'module') return false;

    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.original_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.deleted_by_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'module' && item.item_type === 'module') ||
      (typeFilter === 'folder' && item.item_type === 'folder') ||
      (typeFilter === 'file' && item.item_type === 'file');

    return matchesSearch && matchesType;
  });

  const selectedObjects = items.filter(i => selectedIds.includes(i.id));

  const formatDate = (isoStr) => {
    if (!isoStr) return 'Unknown';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header Banner */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DeleteIcon sx={{ fontSize: 36, color: '#ef4444' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
              Recycle Bin
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {isSuperAdmin
                ? "Restore soft-deleted modules, folders & files or manage auto-delete retention policy"
                : "Restore soft-deleted folders & files"}
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchRecycleBinData}
            disabled={loading}
          >
            Refresh
          </Button>
          {items.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<RestoreIcon />}
              onClick={() => handleRestoreItems(items)}
              disabled={loading || actionProcessing}
            >
              Restore All
            </Button>
          )}
          {isSuperAdmin && (
            <Button
              variant="contained"
              color="error"
              startIcon={<CleanIcon />}
              onClick={() => setConfirmEmptyOpen(true)}
              disabled={items.length === 0 || loading}
            >
              Empty Recycle Bin
            </Button>
          )}
        </Stack>

      </Box>

      {alertInfo.show && (
        <Alert severity={alertInfo.severity} sx={{ mb: 3 }} onClose={() => setAlertInfo({ show: false, message: '', severity: 'success' })}>
          {alertInfo.message}
        </Alert>
      )}

      {/* KPI Cards & Super Admin Settings */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 2.5, mb: 3 }}>
        {/* Stat Summary */}
        <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
          <CardContent>
            <Typography variant="overline" sx={{ color: '#64748b', fontWeight: 600 }}>
              Recycle Bin Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {filteredItems.length}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#64748b' }}>
                deleted item(s) stored
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 1 }}>
              {isSuperAdmin
                ? `Modules: ${items.filter(i => i.item_type === 'module').length} | Folders: ${items.filter(i => i.item_type === 'folder').length} | Files: ${items.filter(i => i.item_type === 'file').length}`
                : `Folders: ${items.filter(i => i.item_type === 'folder').length} | Files: ${items.filter(i => i.item_type === 'file').length}`
              }
            </Typography>
          </CardContent>
        </Card>

        {/* Auto-Delete Retention Settings (Super Admin / View for Admin) */}
        <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon sx={{ color: '#6366f1' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Auto-Delete Retention Policy
                </Typography>
              </Box>
              {isSuperAdmin ? (
                <Chip label="Super Admin Settings" color="primary" size="small" variant="outlined" />
              ) : (
                <Chip label="Read-Only Policy" size="small" variant="outlined" />
              )}
            </Box>

            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Items in the Recycle Bin will be automatically purged permanently after the chosen retention threshold.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 240, bgcolor: '#ffffff' }}>
                <InputLabel id="retention-label">Auto-Purge Period</InputLabel>
                <Select
                  labelId="retention-label"
                  value={retentionPeriod}
                  label="Auto-Purge Period"
                  disabled={!isSuperAdmin || savingSettings}
                  onChange={(e) => handleUpdateSettings(e.target.value, autoDeleteEnabled)}
                >
                  {availableOptions.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {isSuperAdmin && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoDeleteEnabled}
                      disabled={savingSettings}
                      onChange={(e) => handleUpdateSettings(retentionPeriod, e.target.checked)}
                      color="primary"
                    />
                  }
                  label={autoDeleteEnabled ? "Auto-Purge Active" : "Auto-Purge Disabled"}
                />
              )}

              {savingSettings && <CircularProgress size={24} />}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Filter & Search Bar */}
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 2, flex: 1, minWidth: 300 }}>
            <TextField
              size="small"
              placeholder="Search by item name, path, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  )
                }
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                {isSuperAdmin && <MenuItem value="module">Modules Only</MenuItem>}
                <MenuItem value="folder">Folders Only</MenuItem>
                <MenuItem value="file">Files Only</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Bulk Selection Actions */}
          {selectedIds.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ bgcolor: '#eff6ff', px: 2, py: 0.75, borderRadius: 2, border: '1px solid #bfdbfe' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e40af', alignSelf: 'center', mr: 1 }}>
                {selectedIds.length} Selected
              </Typography>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<RestoreIcon />}
                onClick={() => handleRestoreItems(selectedObjects)}
                disabled={actionProcessing}
              >
                Restore Selected
              </Button>
              {isSuperAdmin && (
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<DeleteForeverIcon />}
                  onClick={() => handlePermanentDeleteItems(selectedObjects)}
                  disabled={actionProcessing}
                >
                  Delete Selected
                </Button>
              )}
            </Stack>
          )}
        </Box>
      </Card>

      {/* Main Recycle Bin Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < filteredItems.length}
                  checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Module</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Original Path</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Date & Time Deleted</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Deleted By</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Auto-Purge In</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Size</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                  <Typography variant="body2" sx={{ mt: 1, color: '#64748b' }}>
                    Loading Recycle Bin contents...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <DeleteIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                  <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Recycle Bin is empty
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Deleted modules, folders and files will appear here before being permanently purged.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((row) => {
                const isSelected = selectedIds.includes(row.id);
                return (
                  <TableRow
                    key={row.id}
                    hover
                    selected={isSelected}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectOne(row.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {row.item_type === 'module' ? (
                          <ModuleIcon sx={{ color: '#8b5cf6' }} />
                        ) : row.item_type === 'folder' ? (
                          <FolderIcon sx={{ color: '#3b82f6' }} />
                        ) : (
                          <FileIcon sx={{ color: '#64748b' }} />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                          {row.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.item_type === 'module' ? 'Module' : row.item_type === 'folder' ? 'Folder' : 'File'}
                        size="small"
                        color={row.item_type === 'module' ? 'secondary' : row.item_type === 'folder' ? 'primary' : 'default'}
                        variant="outlined"
                        sx={row.item_type === 'module' ? { borderColor: '#8b5cf6', color: '#7c3aed', fontWeight: 600 } : {}}
                      />
                    </TableCell>

                    <TableCell sx={{ fontWeight: 600, color: '#2563eb', fontSize: '0.85rem' }}>
                      {row.module_name || 'MOU Repository'}
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {row.original_path}
                    </TableCell>
                    <TableCell sx={{ color: '#334155', fontWeight: 500, fontSize: '0.85rem' }}>
                      {formatDate(row.deleted_at)}
                    </TableCell>
                    <TableCell sx={{ color: '#475569', fontSize: '0.85rem' }}>
                      {row.deleted_by_name}
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {row.days_remaining !== null && row.days_remaining !== undefined ? (
                        <Chip
                          label={`${row.days_remaining} Days`}
                          size="small"
                          color={row.days_remaining <= 3 ? 'error' : 'warning'}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>Never</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {formatFileSize(row.file_size)}
                    </TableCell>
                    <TableCell align="right">

                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<RestoreIcon />}
                          onClick={() => handleRestoreItems([row])}
                          disabled={actionProcessing}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                        >
                          Restore
                        </Button>

                        {isSuperAdmin && (
                          <Tooltip title="Permanently delete from Google Drive & DB">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setConfirmDeleteSingle(row)}
                              disabled={actionProcessing}
                            >
                              <DeleteForeverIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Single Item Permanent Delete Dialog */}
      <Dialog open={Boolean(confirmDeleteSingle)} onClose={() => setConfirmDeleteSingle(null)}>
        <DialogTitle sx={{ color: '#dc2626', fontWeight: 700 }}>
          Permanently Delete Item?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete <strong>{confirmDeleteSingle?.name}</strong>?
            This action cannot be undone and will delete the file/folder from both the system and Google Drive.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDeleteSingle(null)} disabled={actionProcessing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => handlePermanentDeleteItems([confirmDeleteSingle])}
            disabled={actionProcessing}
            startIcon={actionProcessing ? <CircularProgress size={16} /> : <DeleteForeverIcon />}
          >
            Permanently Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Empty Recycle Bin Dialog */}
      <Dialog open={confirmEmptyOpen} onClose={() => setConfirmEmptyOpen(false)}>
        <DialogTitle sx={{ color: '#dc2626', fontWeight: 700 }}>
          Empty Entire Recycle Bin?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete <strong>all {items.length} item(s)</strong> currently stored in the Recycle Bin.
            All files will be purged permanently from Google Drive and database records. This action cannot be reverted.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmEmptyOpen(false)} disabled={actionProcessing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEmptyBin}
            disabled={actionProcessing}
            startIcon={actionProcessing ? <CircularProgress size={16} /> : <CleanIcon />}
          >
            Yes, Empty Recycle Bin
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function GridContainer({ children, style }) {
  return <div style={style}>{children}</div>;
}
