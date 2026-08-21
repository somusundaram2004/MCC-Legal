import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography,
  Button, IconButton, Paper, CircularProgress, TextField, InputAdornment,
  Chip, List, ListItem, ToggleButtonGroup, ToggleButton, Tooltip, Breadcrumbs, Link,
  Checkbox
} from '@mui/material';

import CloudIcon from '@mui/icons-material/Cloud';
import FolderIcon from '@mui/icons-material/Folder';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import StorageIcon from '@mui/icons-material/Storage';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SelectAllIcon from '@mui/icons-material/SelectAll';

import api from '../services/api';
import { useThemeMode } from '../context/ThemeContext';
import { showCustomToast } from '../utils/customToast';

/* ─── Format Bytes ─────────────────────────────────────────── */
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const GoogleDrivePickerModal = ({
  open,
  onClose,
  onSelectFolder,
  title = "Select Folder from Google Drive to Import",
  actionLabel = "Import Selected Folder"
}) => {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]); // multi-selection array
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [activeTab, setActiveTab] = useState('root'); // 'root' (My Drive) or 'app_root'
  const [folderHistory, setFolderHistory] = useState([]);

  // Load folder contents
  const fetchDriveContents = async (folderId = null) => {
    setLoading(true);
    setSelectedItems([]);
    try {
      let targetId = folderId;
      if (!targetId || targetId === 'root' || targetId === 'app_root') {
        targetId = activeTab;
      }
      const url = `/api/import-export/drive-browser/?folder_id=${encodeURIComponent(targetId)}`;
      const res = await api.get(url);
      
      setCurrentFolder(res.data.current_folder);
      setItems(res.data.items || []);

      // Manage breadcrumb history
      if (res.data.current_folder) {
        const cf = res.data.current_folder;
        setFolderHistory((prev) => {
          const idx = prev.findIndex((item) => item.id === cf.id);
          if (idx !== -1) {
            return prev.slice(0, idx + 1);
          }
          return [...prev, cf];
        });
      }
    } catch (err) {
      showCustomToast(err?.response?.data?.detail || "Failed to list Google Drive contents.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setFolderHistory([]);
      fetchDriveContents(activeTab);
    }
  }, [open, activeTab]);

  const handleTabChange = (event, newTab) => {
    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
      setFolderHistory([]);
      fetchDriveContents(newTab);
    }
  };

  const handleFolderClick = (item) => {
    if (item.is_folder) {
      fetchDriveContents(item.id);
    }
  };

  const handleToggleSelectItem = (item) => {
    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const allSelected = useMemo(() => {
    if (filteredItems.length === 0) return false;
    return filteredItems.every((item) => selectedItems.some((s) => s.id === item.id));
  }, [filteredItems, selectedItems]);

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...filteredItems]);
    }
  };

  const handleConfirmImport = async () => {
    const targets = selectedItems.length > 0 ? selectedItems : (currentFolder ? [currentFolder] : []);
    if (targets.length === 0) return;
    setExecuting(true);
    try {
      // Pass both primary target and full array for backwards compatibility
      await onSelectFolder(targets.length === 1 ? targets[0] : targets, targets);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setExecuting(false);
    }
  };

  const selectedCount = selectedItems.length;
  const selectedLabel = selectedCount === 0
    ? (currentFolder ? `Current Location: "${currentFolder.name}"` : 'No Item Selected')
    : selectedCount === 1
    ? `Selected: "${selectedItems[0].name}"`
    : `Selected: ${selectedCount} items (${selectedItems.slice(0, 2).map(i => `"${i.name}"`).join(', ')}${selectedCount > 2 ? ` +${selectedCount - 2} more` : ''})`;

  return (
    <Dialog
      open={open}
      onClose={() => !executing && onClose()}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '24px',
            bgcolor: isDark ? '#0F172A' : '#FFFFFF',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0,0,0,0.7)'
              : '0 25px 50px -12px rgba(14, 165, 233, 0.15)',
            overflow: 'hidden'
          }
        }
      }}
    >
      {/* ── Header ── */}
      <DialogTitle sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
            <Paper
              elevation={0}
              sx={{
                width: 48,
                height: 48,
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(14, 165, 233, 0.3)'
              }}
            >
              <CloudIcon sx={{ color: '#FFF', fontSize: '1.8rem' }} />
            </Paper>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', lineHeight: 1.2 }}>
                {title}
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                Browse &amp; select multiple Google Drive folders or documents to import
              </Typography>
            </Box>
          </Box>

          {/* Location Badge Indicator */}
          <Chip
            icon={<FolderIcon sx={{ color: '#0EA5E9 !important', fontSize: '1.1rem' }} />}
            label="My Drive"
            sx={{
              fontWeight: 800,
              fontSize: '0.85rem',
              py: 2,
              px: 1,
              borderRadius: '12px',
              bgcolor: isDark ? 'rgba(14, 165, 233, 0.15)' : '#E0F2FE',
              color: isDark ? '#38BDF8' : '#0284C7',
              border: '1px solid',
              borderColor: isDark ? 'rgba(14, 165, 233, 0.3)' : '#BAE6FD'
            }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1 }}>
        {/* ── Toolbar: Search & Select All & View Toggle ── */}
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search folders & documents in drive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  bgcolor: isDark ? '#1E293B' : '#F8FAFC',
                  fontSize: '0.85rem'
                }
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: '1.2rem' }} />
                    </InputAdornment>
                  )
                }
              }}
            />

            {filteredItems.length > 0 && (
              <Button
                size="small"
                variant={allSelected ? "contained" : "outlined"}
                color="info"
                onClick={handleSelectAll}
                startIcon={<SelectAllIcon fontSize="small" />}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800, px: 1.5, height: 38 }}
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            )}

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, next) => next && setViewMode(next)}
              size="small"
              sx={{
                bgcolor: isDark ? '#1E293B' : '#F1F5F9',
                borderRadius: '10px',
                p: 0.3,
                border: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: '8px',
                  px: 1.2,
                  py: 0.4,
                  '&.Mui-selected': {
                    bgcolor: isDark ? '#0284C7' : '#FFFFFF',
                    color: isDark ? '#FFF' : '#0EA5E9'
                  }
                }
              }}
            >
              <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>

            <Tooltip title="Refresh Folder Contents">
              <span>
                <IconButton
                  size="small"
                  onClick={() => fetchDriveContents(currentFolder?.id)}
                  disabled={loading}
                  sx={{
                    bgcolor: isDark ? '#1E293B' : '#F1F5F9',
                    borderRadius: '10px',
                    p: 1
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          {/* Breadcrumb Navigation Bar */}
          <Paper
            elevation={0}
            sx={{
              p: 1.2,
              px: 2,
              borderRadius: '12px',
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1
            }}
          >
            <Breadcrumbs
              separator={<ChevronRightIcon sx={{ fontSize: '0.9rem', color: isDark ? '#64748B' : '#94A3B8' }} />}
              sx={{ flex: 1, minWidth: 0, '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap', overflowX: 'auto' } }}
            >
              <Link
                component="button"
                underline="hover"
                onClick={() => fetchDriveContents(activeTab)}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  color: isDark ? '#38BDF8' : '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                {activeTab === 'root' ? '📁 My Drive' : '🏢 App Root'}
              </Link>
              {folderHistory.map((folder, index) => (
                <Typography
                  key={folder.id || index}
                  variant="caption"
                  sx={{
                    fontWeight: index === folderHistory.length - 1 ? 800 : 600,
                    color: index === folderHistory.length - 1 ? (isDark ? '#F8FAFC' : '#0F172A') : (isDark ? '#94A3B8' : '#64748B'),
                    cursor: index < folderHistory.length - 1 ? 'pointer' : 'default'
                  }}
                  onClick={() => index < folderHistory.length - 1 && fetchDriveContents(folder.id)}
                >
                  {folder.name}
                </Typography>
              ))}
            </Breadcrumbs>

            {currentFolder && currentFolder.parents && currentFolder.parents.length > 0 && (
              <Button
                size="small"
                startIcon={<ArrowBackIcon fontSize="small" />}
                onClick={() => fetchDriveContents(currentFolder.parents[0])}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  py: 0.3,
                  px: 1,
                  flexShrink: 0
                }}
              >
                Up Level
              </Button>
            )}
          </Paper>
        </Box>

        {/* ── Content View (List / Grid) ── */}
        {loading || executing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
            <CircularProgress size={38} sx={{ color: '#0EA5E9' }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B' }}>
              {executing ? 'Processing selected Google Drive items...' : 'Listing Google Drive contents...'}
            </Typography>
          </Box>
        ) : filteredItems.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA', borderRadius: '16px', border: '1px dashed', borderColor: 'divider' }}>
            <FolderOpenIcon sx={{ fontSize: '3rem', color: isDark ? '#475569' : '#CBD5E1', mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              {searchQuery ? `No items match "${searchQuery}"` : 'This Google Drive folder is empty'}
            </Typography>
          </Box>
        ) : viewMode === 'list' ? (
          /* LIST VIEW */
          <Paper
            variant="outlined"
            sx={{
              maxHeight: 360,
              overflowY: 'auto',
              borderRadius: '16px',
              p: 1,
              bgcolor: isDark ? '#1E293B' : '#FAFAFA',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
            }}
          >
            <List disablePadding>
              {filteredItems.map((item) => {
                const isSelected = selectedItems.some((s) => s.id === item.id);
                return (
                  <ListItem
                    key={item.id}
                    onClick={() => handleToggleSelectItem(item)}
                    onDoubleClick={() => handleFolderClick(item)}
                    sx={{
                      borderRadius: '12px',
                      mb: 0.8,
                      bgcolor: isSelected
                        ? (isDark ? 'rgba(14, 165, 233, 0.25)' : 'rgba(14, 165, 233, 0.1)')
                        : (isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF'),
                      border: '1.5px solid',
                      borderColor: isSelected
                        ? '#0EA5E9'
                        : (isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.5,
                      py: 1,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F9FF',
                        borderColor: '#0EA5E9'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelectItem(item);
                        }}
                        size="small"
                        sx={{ color: '#0EA5E9', p: 0.5 }}
                      />

                      {item.is_folder ? (
                        <Paper
                          elevation={0}
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <FolderSpecialIcon sx={{ color: '#F59E0B', fontSize: '1.3rem' }} />
                        </Paper>
                      ) : (
                        <Paper
                          elevation={0}
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <InsertDriveFileIcon sx={{ color: '#10B981', fontSize: '1.2rem' }} />
                        </Paper>
                      )}

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }} noWrap>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
                          {item.is_folder ? 'Folder • Double-click to open' : formatBytes(item.size)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                      {item.is_folder && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFolderClick(item);
                          }}
                          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', px: 1.5 }}
                        >
                          Open
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant={isSelected ? "contained" : "outlined"}
                        color="info"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectItem(item);
                        }}
                        startIcon={isSelected ? <CheckCircleIcon /> : null}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 800, fontSize: '0.75rem', px: 1.5 }}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                    </Box>
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        ) : (
          /* GRID VIEW */
          <Box
            sx={{
              maxHeight: 360,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 1.5,
              p: 0.5
            }}
          >
            {filteredItems.map((item) => {
              const isSelected = selectedItems.some((s) => s.id === item.id);
              return (
                <Paper
                  key={item.id}
                  elevation={0}
                  onClick={() => handleToggleSelectItem(item)}
                  onDoubleClick={() => handleFolderClick(item)}
                  sx={{
                    p: 2,
                    borderRadius: '16px',
                    bgcolor: isSelected
                      ? (isDark ? 'rgba(14, 165, 233, 0.25)' : 'rgba(14, 165, 233, 0.1)')
                      : (isDark ? '#1E293B' : '#FFFFFF'),
                    border: '2px solid',
                    borderColor: isSelected ? '#0EA5E9' : (isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'),
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 1,
                    position: 'relative',
                    '&:hover': {
                      borderColor: '#0EA5E9',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleSelectItem(item);
                    }}
                    size="small"
                    sx={{ position: 'absolute', top: 8, left: 8, p: 0 }}
                  />

                  {item.is_folder ? (
                    <FolderSpecialIcon sx={{ color: '#F59E0B', fontSize: '2.5rem', mt: 1 }} />
                  ) : (
                    <InsertDriveFileIcon sx={{ color: '#10B981', fontSize: '2.2rem', mt: 1 }} />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', width: '100%' }} noWrap>
                    {item.name}
                  </Typography>
                  <Chip
                    label={item.is_folder ? 'Folder' : formatBytes(item.size)}
                    size="small"
                    color={item.is_folder ? 'warning' : 'default'}
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                  />
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>

      {/* ── Footer Action Bar ── */}
      <DialogActions
        sx={{
          p: 3,
          pt: 2,
          borderTop: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<CheckCircleIcon sx={{ color: '#0EA5E9 !important' }} />}
            label={selectedLabel}
            variant="outlined"
            sx={{
              fontWeight: 800,
              fontSize: '0.8rem',
              borderRadius: '10px',
              borderColor: '#0EA5E9',
              bgcolor: isDark ? 'rgba(14, 165, 233, 0.1)' : '#F0F9FF',
              color: isDark ? '#38BDF8' : '#0284C7'
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            onClick={onClose}
            disabled={executing}
            sx={{ fontWeight: 700, borderRadius: '12px', px: 2.5 }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={executing || loading}
            onClick={handleConfirmImport}
            startIcon={executing ? <CircularProgress size={18} color="inherit" /> : <CloudIcon />}
            sx={{
              borderRadius: '12px',
              fontWeight: 800,
              px: 3.5,
              py: 1.2,
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)',
              color: '#FFF',
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)'
              }
            }}
          >
            {executing
              ? 'Importing...'
              : selectedCount > 1
              ? `Import Selected (${selectedCount} items)`
              : selectedCount === 1
              ? `Import "${selectedItems[0].name}"`
              : currentFolder
              ? `Import Current Folder ("${currentFolder.name}")`
              : actionLabel}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default GoogleDrivePickerModal;
