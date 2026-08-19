import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Button, MenuItem,
  Select, FormControl, InputLabel, Divider, Alert, Chip, Paper,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemIcon, ListItemText, LinearProgress, Radio,
  RadioGroup, FormControlLabel, Tooltip, IconButton, Collapse, TextField
} from '@mui/material';

import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LayersIcon from '@mui/icons-material/Layers';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudIcon from '@mui/icons-material/Cloud';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import api from '../services/api';
import { useThemeMode } from '../context/ThemeContext';
import { showCustomToast } from '../utils/customToast';
import GoogleDrivePickerModal from './GoogleDrivePickerModal';

/* ─── Helper: Format Bytes ───────────────────────────────── */
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/* ─── Tree Item Component for Export Browser ─────────────── */
const TreeBrowserNode = ({ node, selectedId, onSelect, isDark, level = 0 }) => {
  const [open, setOpen] = useState(level < 1);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = (e) => {
    e.stopPropagation();
    setOpen(!open);
  };

  const handleNodeClick = (e) => {
    e.stopPropagation();
    onSelect(node);
  };

  return (
    <Box sx={{ pl: level * 2 }}>
      <Paper
        elevation={0}
        onClick={handleNodeClick}
        sx={{
          py: 0.8,
          px: 1.5,
          mb: 0.5,
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: isSelected
            ? (isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(79, 70, 229, 0.1)')
            : (isDark ? 'transparent' : 'transparent'),
          border: '1px solid',
          borderColor: isSelected
            ? (isDark ? '#818CF8' : '#4F46E5')
            : 'transparent',
          '&:hover': {
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(79, 70, 229, 0.05)'
          }
        }}
      >
        {hasChildren ? (
          <IconButton size="small" onClick={handleToggle} sx={{ p: 0.2, color: isDark ? '#94A3B8' : '#64748B' }}>
            {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 22 }} />
        )}

        {node.item_type === 'root' && <StorageIcon sx={{ color: '#4F46E5', fontSize: '1.2rem' }} />}
        {node.item_type === 'module' && <LayersIcon sx={{ color: '#0284C7', fontSize: '1.2rem' }} />}
        {node.item_type === 'folder' && <FolderIcon sx={{ color: '#EAB308', fontSize: '1.2rem' }} />}
        {node.item_type === 'file' && <InsertDriveFileIcon sx={{ color: '#059669', fontSize: '1.1rem' }} />}

        <Typography variant="body2" sx={{ fontWeight: isSelected ? 800 : 600, flex: 1, color: isDark ? '#F8FAFC' : '#0F172A' }} noWrap>
          {node.name}
        </Typography>

        {node.item_type !== 'file' && (
          <Chip
            label={`${node.folder_count || 0} Folders • ${node.file_count || 0} Files`}
            size="small"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
          />
        )}
        {node.item_type === 'file' && (
          <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>
            {formatBytes(node.size)}
          </Typography>
        )}
      </Paper>

      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <Box>
            {node.children.map((child) => (
              <TreeBrowserNode
                key={child.id}
                node={child}
                selectedId={selectedId}
                onSelect={onSelect}
                isDark={isDark}
                level={level + 1}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

/* ─── Main Import & Export Settings Component ────────────── */
const ImportExportTab = () => {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  // ── Tree & Selection States ──
  const [treeData, setTreeData] = useState(null);
  const [modulesList, setModulesList] = useState([
    { id: 'mou_repository', name: 'MOU Repository' }
  ]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState(null);

  const [selectedExportNode, setSelectedExportNode] = useState(null);
  const [exportOption, setExportOption] = useState('root'); // 'root', 'module_or_folder', 'file'

  // ── Export Modal & Execution ──
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPreview, setExportPreview] = useState(null);
  const [exporting, setExporting] = useState(false);

  // ── Import States ──
  const [destinationModuleId, setDestinationModuleId] = useState('mou_repository');
  const [targetFolderId, setTargetFolderId] = useState('');
  const [importSourceMode, setImportSourceMode] = useState('local'); // 'local', 'google_drive'
  const [importFile, setImportFile] = useState(null);
  const [importFolderFiles, setImportFolderFiles] = useState([]);
  const [selectedDriveItems, setSelectedDriveItems] = useState([]);
  const folderInputRef = React.useRef(null);
  const [duplicateFileStrategy, setDuplicateFileStrategy] = useState('create_copy');
  const [duplicateFolderStrategy, setDuplicateFolderStrategy] = useState('merge');

  // ── Google Drive Browser Modal ──
  const [driveBrowserOpen, setDriveBrowserOpen] = useState(false);
  const [driveBrowserLoading, setDriveBrowserLoading] = useState(false);
  const [driveCurrentFolder, setDriveCurrentFolder] = useState(null);
  const [driveItems, setDriveItems] = useState([]);

  const [importPreviewModalOpen, setImportPreviewModalOpen] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // ── Result Dialog ──
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Extract all targetable subfolders for placement selector
  const availableSubfolders = React.useMemo(() => {
    if (!treeData || !treeData.root || !treeData.root.children) return [];
    
    // Find current active module node in tree
    const targetModuleNode = treeData.root.children.find(m => {
      if (destinationModuleId === 'mou_repository') return m.module_type === 'mou_repository';
      return String(m.real_id) === String(destinationModuleId).replace('custom_', '');
    });

    if (!targetModuleNode) return [];

    const extractFolders = (node, pathAcc = '') => {
      let result = [];
      if (!node) return result;
      const currentPath = pathAcc ? `${pathAcc} / ${node.name}` : node.name;
      if (node.item_type === 'folder') {
        result.push({ id: node.real_id, name: currentPath });
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          if (child.item_type === 'folder') {
            result = result.concat(extractFolders(child, currentPath));
          }
        });
      }
      return result;
    };

    return extractFolders(targetModuleNode, targetModuleNode.name);
  }, [treeData, destinationModuleId]);
  const fetchTree = useCallback(async () => {
    setTreeLoading(true);
    setTreeError(null);
    try {
      const res = await api.get('/api/import-export/tree/');
      setTreeData(res.data.root);
      setModulesList(res.data.modules || []);
      // Default selection to Root
      if (!selectedExportNode) {
        setSelectedExportNode(res.data.root);
      }
    } catch (err) {
      console.error("Failed to load hierarchy tree:", err);
      setTreeError("Failed to fetch system folder hierarchy.");
    } finally {
      setTreeLoading(false);
    }
  }, [selectedExportNode]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Handle Export Selection Change
  const handleSelectExportNode = (node) => {
    setSelectedExportNode(node);
    if (node.item_type === 'root') setExportOption('root');
    else if (node.item_type === 'file') setExportOption('file');
    else setExportOption('module_or_folder');
  };

  // ── Open Export Preview ──
  const handleOpenExportPreview = async () => {
    if (!selectedExportNode) {
      showCustomToast("Please select an item to export.", "warning");
      return;
    }
    try {
      setExporting(true);
      const payload = {
        target_type: selectedExportNode.item_type === 'module' || selectedExportNode.item_type === 'folder'
          ? (selectedExportNode.item_type)
          : selectedExportNode.item_type,
        target_id: selectedExportNode.id
      };
      const res = await api.post('/api/import-export/export/preview/', payload);
      setExportPreview(res.data);
      setExportModalOpen(true);
    } catch (err) {
      showCustomToast("Failed to prepare export preview.", "error");
    } finally {
      setExporting(false);
    }
  };

  // ── Trigger Download Export ──
  const handleExecuteExport = async () => {
    if (!selectedExportNode) return;
    try {
      setExporting(true);
      const payload = {
        target_type: selectedExportNode.item_type,
        target_id: selectedExportNode.id
      };
      
      const response = await api.post('/api/import-export/export/download/', payload, {
        responseType: 'blob'
      });

      // Extract filename from header if present
      let fileName = `${selectedExportNode.name.replace(/\s+/g, '_')}_Export`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        fileName = disposition.split('filename=')[1].replace(/"/g, '');
      } else if (selectedExportNode.item_type !== 'file') {
        fileName += '.zip';
      }

      // Trigger browser download
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showCustomToast("Export downloaded successfully!", "success");
      setExportModalOpen(false);
    } catch (err) {
      console.error("Export error:", err);
      showCustomToast("Export download failed. Please check server logs.", "error");
    } finally {
      setExporting(false);
    }
  };

  // ── Google Drive Browser Handlers ──
  const handleOpenDriveBrowser = async (folderId = null) => {
    setDriveBrowserOpen(true);
    setDriveBrowserLoading(true);
    try {
      const url = folderId ? `/api/import-export/drive-browser/?folder_id=${encodeURIComponent(folderId)}` : '/api/import-export/drive-browser/';
      const res = await api.get(url);
      setDriveCurrentFolder(res.data.current_folder);
      setDriveItems(res.data.items || []);
    } catch (err) {
      showCustomToast(err?.response?.data?.detail || "Failed to list Google Drive contents.", "error");
    } finally {
      setDriveBrowserLoading(false);
    }
  };

  const handleSelectDriveFolder = (item, allTargets) => {
    const itemsArr = Array.isArray(item) ? item : (allTargets && Array.isArray(allTargets) ? allTargets : [item]);
    setSelectedDriveItems(itemsArr);
    setImportSourceMode('google_drive');
    setImportFile(null);
    setImportFolderFiles([]);
    setDriveBrowserOpen(false);
    const names = itemsArr.slice(0, 3).map((i) => `"${i.name}"`).join(', ');
    showCustomToast(`Selected Google Drive: ${itemsArr.length} item(s) (${names}${itemsArr.length > 3 ? '...' : ''})`, "success");
  };

  // ── Handle Import File / Folder Select & Preview ──
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportSourceMode('local');
      setSelectedDriveItems([]);
      if (e.target.files.length > 1 || (e.target.files[0] && e.target.files[0].webkitRelativePath)) {
        setImportFolderFiles(Array.from(e.target.files));
        setImportFile(null);
      } else {
        setImportFile(e.target.files[0]);
        setImportFolderFiles([]);
      }
    }
  };

  const handlePickFolderDirectory = async () => {
    setImportSourceMode('local');
    setSelectedDriveItems([]);
    if (window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        setPreviewing(true);

        const filesArr = [];
        const scanDirectoryHandle = async (handle, path = '') => {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              try {
                Object.defineProperty(file, 'webkitRelativePath', {
                  value: path + entry.name,
                  writable: false,
                  configurable: true
                });
              } catch (_) {}
              filesArr.push(file);
            } else if (entry.kind === 'directory') {
              await scanDirectoryHandle(entry, path + entry.name + '/');
            }
          }
        };

        await scanDirectoryHandle(dirHandle, dirHandle.name + '/');
        if (filesArr.length > 0) {
          setImportFolderFiles(filesArr);
          setImportFile(null);
        }
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn("window.showDirectoryPicker failed, using fallback input:", err);
      } finally {
        setPreviewing(false);
      }
    }

    if (folderInputRef.current) {
      folderInputRef.current.webkitdirectory = true;
      folderInputRef.current.directory = true;
      folderInputRef.current.mozdirectory = true;
      folderInputRef.current.removeAttribute('multiple');
      folderInputRef.current.value = null;
      folderInputRef.current.click();
    }
  };

  const scanEntry = async (entry, path = '') => {
    if (!entry) return [];
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file) => {
          try {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: path + file.name,
              writable: false,
              configurable: true
            });
          } catch (_) {}
          resolve([file]);
        }, () => resolve([]));
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const readAllEntries = async () => {
        let allEntries = [];
        let batch;
        do {
          batch = await new Promise((resolve) => {
            dirReader.readEntries((entries) => resolve(entries || []), () => resolve([]));
          });
          allEntries = allEntries.concat(batch);
        } while (batch && batch.length > 0);
        return allEntries;
      };

      const entries = await readAllEntries();
      const filesArr = await Promise.all(
        entries.map((e) => scanEntry(e, path + entry.name + '/'))
      );
      return filesArr.flat();
    }
    return [];
  };

  const handleFolderDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImportSourceMode('local');
    setSelectedDriveFolder(null);
    const items = e.dataTransfer?.items;
    if (!items || items.length === 0) return;

    setPreviewing(true);
    try {
      const entries = Array.from(items)
        .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
        .filter(Boolean);

      const filesArr = await Promise.all(entries.map((entry) => scanEntry(entry)));
      const flattenedFiles = filesArr.flat();

      if (flattenedFiles.length > 0) {
        setImportFolderFiles(flattenedFiles);
        setImportFile(null);
      }
    } catch (err) {
      console.error("Failed to read dropped folder:", err);
    } finally {
      setPreviewing(false);
    }
  };

  const handleOpenImportPreview = async () => {
    if (importSourceMode === 'google_drive' && selectedDriveItems.length > 0) {
      try {
        setPreviewing(true);
        const res = await api.post('/api/import-export/import/preview/', {
          source_type: 'google_drive',
          source_drive_items: selectedDriveItems,
          source_drive_folder_id: selectedDriveItems.length === 1 ? selectedDriveItems[0].id : undefined
        });
        setImportPreviewData(res.data);
        setImportPreviewModalOpen(true);
      } catch (err) {
        showCustomToast(err?.response?.data?.detail || "Failed to parse Google Drive import preview.", "error");
      } finally {
        setPreviewing(false);
      }
      return;
    }

    if (!importFile && importFolderFiles.length === 0) {
      showCustomToast("Please choose a file, full folder, ZIP archive, or Google Drive folder/documents to import.", "warning");
      return;
    }
    try {
      setPreviewing(true);
      const formData = new FormData();
      if (importFolderFiles.length > 0) {
        importFolderFiles.forEach((f) => {
          formData.append('files', f);
          const relPath = f.webkitRelativePath || f.name;
          formData.append('relative_paths', relPath);
        });
      } else {
        formData.append('file', importFile);
      }

      if (targetFolderId) {
        formData.append('parent_folder_id', targetFolderId);
      }

      const res = await api.post('/api/import-export/import/preview/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setImportPreviewData(res.data);
      setImportPreviewModalOpen(true);
    } catch (err) {
      showCustomToast(err?.response?.data?.detail || "Failed to parse import preview.", "error");
    } finally {
      setPreviewing(false);
    }
  };

  // ── Execute Import ──
  const handleExecuteImport = async () => {
    if (!destinationModuleId) return;
    try {
      setImporting(true);
      setImportProgress(20);

      if (importSourceMode === 'google_drive' && selectedDriveItems.length > 0) {
        setImportProgress(50);
        const payload = {
          source_type: 'google_drive',
          source_drive_items: selectedDriveItems,
          source_drive_folder_id: selectedDriveItems.length === 1 ? selectedDriveItems[0].id : undefined,
          module_id: destinationModuleId,
          duplicate_file_strategy: duplicateFileStrategy,
          duplicate_folder_strategy: duplicateFolderStrategy,
          parent_folder_id: targetFolderId || undefined
        };

        const res = await api.post('/api/import-export/import/execute/', payload);

        setImportProgress(100);
        setImportResult(res.data);
        setImportPreviewModalOpen(false);
        setResultModalOpen(true);
        setSelectedDriveItems([]);
        setImportSourceMode('local');
        fetchTree();
        return;
      }

      if (!importFile && importFolderFiles.length === 0) return;

      const formData = new FormData();
      if (importFolderFiles.length > 0) {
        importFolderFiles.forEach((f) => {
          formData.append('files', f);
          const relPath = f.webkitRelativePath || f.name;
          formData.append('relative_paths', relPath);
        });
      } else {
        formData.append('file', importFile);
      }

      formData.append('module_id', destinationModuleId);
      formData.append('duplicate_file_strategy', duplicateFileStrategy);
      formData.append('duplicate_folder_strategy', duplicateFolderStrategy);

      if (targetFolderId) {
        formData.append('parent_folder_id', targetFolderId);
      }

      setImportProgress(50);
      const res = await api.post('/api/import-export/import/execute/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setImportProgress(100);
      setImportResult(res.data);
      setImportPreviewModalOpen(false);
      setResultModalOpen(true);
      setImportFile(null);
      setImportFolderFiles([]);

      fetchTree();
    } catch (err) {
      showCustomToast(err?.response?.data?.detail || "Import failed. Please try again.", "error");
    } finally {
      setImporting(false);
      setImportProgress(0);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      
      {/* Title Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '14px',
            bgcolor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <SystemUpdateAltIcon sx={{ color: isDark ? '#818CF8' : '#4F46E5', fontSize: '1.6rem' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }}>
              Import &amp; Export Data Management
            </Typography>
            <Typography variant="body2" sx={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              Full Google Drive cloud synchronization for root folders, custom modules, nested trees, and files.
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={fetchTree} disabled={treeLoading} sx={{ color: isDark ? '#818CF8' : '#4F46E5' }}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Main Grid: Export (Left) & Import (Right) */}
      <Grid container spacing={3.5}>

        {/* ══════════════════ 1. EXPORT SECTION ══════════════════ */}
        <Grid xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: '20px',
              height: '100%',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              bgcolor: isDark ? '#1E293B' : '#FFFFFF'
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
                <CloudDownloadIcon sx={{ color: '#0EA5E9', fontSize: '1.5rem' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Export Data Package
                </Typography>
                <Chip label="Google Drive Sync" size="small" color="info" variant="outlined" sx={{ fontWeight: 800, ml: 'auto' }} />
              </Box>

              <Typography variant="body2" sx={{ color: isDark ? '#94A3B8' : '#64748B', mb: 2.5 }}>
                Browse the system folder tree below and select what you want to export (Entire Root, Module, Folder, or File).
              </Typography>

              {/* Selection Options Radio Group */}
              <Box sx={{ mb: 2.5, p: 2, borderRadius: '14px', bgcolor: isDark ? '#0F172A' : '#F8FAFC', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#CBD5E1' : '#475569', display: 'block', mb: 1 }}>
                  Current Selection Mode
                </Typography>
                <RadioGroup row value={exportOption} onChange={(e) => setExportOption(e.target.value)}>
                  <FormControlLabel value="root" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Entire Root</Typography>} />
                  <FormControlLabel value="module_or_folder" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Module / Folder</Typography>} />
                  <FormControlLabel value="file" control={<Radio size="small" />} label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Single File</Typography>} />
                </RadioGroup>
              </Box>

              {/* Tree Browser Container */}
              <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#CBD5E1' : '#475569', mb: 1, display: 'block' }}>
                System Folder &amp; File Hierarchy Browser
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: 3,
                  maxHeight: 280,
                  overflowY: 'auto',
                  borderRadius: '14px',
                  bgcolor: isDark ? '#0F172A' : '#FAFAFA',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                }}
              >
                {treeLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={28} />
                  </Box>
                )}

                {treeError && (
                  <Alert severity="error" sx={{ borderRadius: '10px' }}>{treeError}</Alert>
                )}

                {treeData && !treeLoading && (
                  <TreeBrowserNode
                    node={treeData}
                    selectedId={selectedExportNode?.id}
                    onSelect={handleSelectExportNode}
                    isDark={isDark}
                  />
                )}
              </Paper>

              {/* Selected Target Summary & Action */}
              <Box sx={{ mt: 'auto' }}>
                <Box sx={{ p: 1.8, borderRadius: '12px', bgcolor: isDark ? 'rgba(14, 165, 233, 0.12)' : '#F0F9FF', border: `1px solid ${isDark ? 'rgba(14, 165, 233, 0.3)' : '#BAE6FD'}`, mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#38BDF8' : '#0284C7', display: 'block' }}>
                    Selected Target for Export:
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    {selectedExportNode ? `${selectedExportNode.name} (${selectedExportNode.item_type.toUpperCase()})` : 'Entire Application Root'}
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <CloudDownloadIcon />}
                  disabled={exporting || !selectedExportNode}
                  onClick={handleOpenExportPreview}
                  sx={{
                    borderRadius: '12px',
                    fontWeight: 800,
                    py: 1.4,
                    background: 'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)'
                  }}
                >
                  {exporting ? 'Preparing Package...' : 'Export Selected Package'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ══════════════════ 2. IMPORT SECTION ══════════════════ */}
        <Grid xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: '20px',
              height: '100%',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              bgcolor: isDark ? '#1E293B' : '#FFFFFF'
            }}
          >
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
                <CloudUploadIcon sx={{ color: '#10B981', fontSize: '1.5rem' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Import Data Package
                </Typography>
                <Chip label="Auto Drive Provision" size="small" color="success" variant="outlined" sx={{ fontWeight: 800, ml: 'auto' }} />
              </Box>

              <Typography variant="body2" sx={{ color: isDark ? '#94A3B8' : '#64748B', mb: 2.5 }}>
                Select a target destination module and upload a File, Folder, or ZIP archive to recreate hierarchy on Google Drive.
              </Typography>

              {/* Destination Module & Target Placement Selector */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 700 }}>Select Destination Module</InputLabel>
                  <Select
                    value={destinationModuleId}
                    label="Select Destination Module"
                    onChange={(e) => {
                      setDestinationModuleId(e.target.value);
                      setTargetFolderId('');
                    }}
                    sx={{ borderRadius: '12px', fontWeight: 700 }}
                  >
                    {modulesList.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LayersIcon sx={{ color: '#4F46E5', fontSize: '1.1rem' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel sx={{ fontWeight: 700 }}>Select Target Placement Folder (Optional)</InputLabel>
                  <Select
                    value={targetFolderId}
                    label="Select Target Placement Folder (Optional)"
                    onChange={(e) => setTargetFolderId(e.target.value)}
                    sx={{ borderRadius: '12px', fontWeight: 700 }}
                  >
                    <MenuItem value="">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#10B981' }}>
                        📍 [Module Root Level] - Save at top level of module
                      </Typography>
                    </MenuItem>
                    {availableSubfolders.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FolderIcon sx={{ color: '#F59E0B', fontSize: '1.1rem' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{f.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Duplicate Handling Strategies */}
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: '14px', bgcolor: isDark ? '#0F172A' : '#F8FAFC', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: isDark ? '#CBD5E1' : '#475569', display: 'block', mb: 1 }}>
                  Duplicate Resolution Strategy
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={6}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', display: 'block', mb: 0.5 }}>
                      File Conflict:
                    </Typography>
                    <Select
                      size="small"
                      fullWidth
                      value={duplicateFileStrategy}
                      onChange={(e) => setDuplicateFileStrategy(e.target.value)}
                      sx={{ borderRadius: '10px', fontSize: '0.8rem' }}
                    >
                      <MenuItem value="create_copy">Create Copy</MenuItem>
                      <MenuItem value="replace">Replace Existing</MenuItem>
                      <MenuItem value="skip">Skip Duplicate</MenuItem>
                    </Select>
                  </Grid>
                  <Grid xs={6}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: isDark ? '#94A3B8' : '#64748B', display: 'block', mb: 0.5 }}>
                      Folder Conflict:
                    </Typography>
                    <Select
                      size="small"
                      fullWidth
                      value={duplicateFolderStrategy}
                      onChange={(e) => setDuplicateFolderStrategy(e.target.value)}
                      sx={{ borderRadius: '10px', fontSize: '0.8rem' }}
                    >
                      <MenuItem value="merge">Merge Contents</MenuItem>
                      <MenuItem value="create_new">Create New Folder</MenuItem>
                      <MenuItem value="skip">Skip Folder</MenuItem>
                    </Select>
                  </Grid>
                </Grid>
              </Paper>

              {/* Hidden Directory Folder Input */}
              <input
                type="file"
                ref={(node) => {
                  folderInputRef.current = node;
                  if (node) {
                    node.webkitdirectory = true;
                    node.directory = true;
                    node.mozdirectory = true;
                    node.removeAttribute('multiple');
                    node.setAttribute('webkitdirectory', '');
                    node.setAttribute('directory', '');
                    node.setAttribute('mozdirectory', '');
                  }
                }}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {/* Upload Drop Zone */}
              <Box
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleFolderDrop}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: '16px',
                  border: '2px dashed',
                  borderColor: (selectedDriveItems.length > 0 || importFile || importFolderFiles.length > 0) ? '#10B981' : (isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1'),
                  bgcolor: (selectedDriveItems.length > 0 || importFile || importFolderFiles.length > 0)
                    ? (isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5')
                    : (isDark ? '#0F172A' : '#FAFAFA'),
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <CloudUploadIcon sx={{ fontSize: '2.5rem', color: (selectedDriveItems.length > 0 || importFile || importFolderFiles.length > 0) ? '#10B981' : '#94A3B8', mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: isDark ? '#F8FAFC' : '#0F172A', textAlign: 'center', mb: 1 }}>
                  {importSourceMode === 'google_drive' && selectedDriveItems.length > 0
                    ? `Google Drive Selected: ${selectedDriveItems.length} item(s) (${selectedDriveItems.slice(0, 3).map(i => `"${i.name}"`).join(', ')}${selectedDriveItems.length > 3 ? '...' : ''})`
                    : importFolderFiles.length > 0
                    ? `Files Selected: ${importFolderFiles.length} file(s) (${importFolderFiles[0]?.name}${importFolderFiles.length > 1 ? ', ...' : ''})`
                    : importFile ? importFile.name : 'Drag & Drop Folders, ZIP Archives, or Multiple Files here'}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    startIcon={<FolderIcon />}
                    onClick={handlePickFolderDirectory}
                    sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800 }}
                  >
                    Select Full Folder
                  </Button>
                  <Button
                    component="label"
                    variant="outlined"
                    size="small"
                    startIcon={<InsertDriveFileIcon />}
                    sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                  >
                    Browse Files / ZIP
                    <input type="file" multiple hidden onChange={handleFileChange} accept=".zip, .pdf, .docx, .xlsx, .csv, .png, .jpg, *" />
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CloudIcon />}
                    onClick={() => handleOpenDriveBrowser(null)}
                    sx={{
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                      color: '#FFF'
                    }}
                  >
                    Import from Google Drive
                  </Button>
                </Box>

                <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', mt: 1.5 }}>
                  {importSourceMode === 'google_drive' && selectedDriveItems.length > 0
                    ? `Selected ${selectedDriveItems.length} Cloud Item(s) • Ready for Direct Server-Side Drive Syncing`
                    : importFolderFiles.length > 0
                    ? `${formatBytes(importFolderFiles.reduce((acc, f) => acc + f.size, 0))} • ${importFolderFiles.length} file(s) ready for upload`
                    : importFile ? `${formatBytes(importFile.size)} • Ready for Preview` : 'Supports Local Folders, ZIP Archives, Multiple Files, or Cloud Google Drive Items'}
                </Typography>
              </Box>

              {/* Submit Import Action */}
              <Box sx={{ mt: 'auto' }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  color="success"
                  startIcon={previewing ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                  disabled={previewing || (!importFile && importFolderFiles.length === 0 && !(importSourceMode === 'google_drive' && selectedDriveItems.length > 0))}
                  onClick={handleOpenImportPreview}
                  sx={{
                    borderRadius: '12px',
                    fontWeight: 800,
                    py: 1.4,
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  }}
                >
                  {previewing ? 'Parsing Folder Package...' : 'Preview & Import Data'}
                </Button>
              </Box>

            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* ══════════════════ EXPORT PREVIEW MODAL ══════════════════ */}
      <Dialog
        open={exportModalOpen}
        onClose={() => !exporting && setExportModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1, bgcolor: isDark ? '#0F172A' : '#FFFFFF' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <CloudDownloadIcon sx={{ color: '#0EA5E9' }} /> Export Package Preview
        </DialogTitle>
        <DialogContent>
          {exportPreview && (
            <Box sx={{ pt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '14px', mb: 2.5, bgcolor: isDark ? '#1E293B' : '#F8FAFC' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#0EA5E9', display: 'block' }}>
                  Target Title:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  {exportPreview.title}
                </Typography>

                <Grid container spacing={2}>
                  <Grid xs={6}>
                    <Typography variant="caption" color="text.secondary">Export Format:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{exportPreview.export_format}</Typography>
                  </Grid>
                  <Grid xs={6}>
                    <Typography variant="caption" color="text.secondary">Estimated Size:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatBytes(exportPreview.total_size)}</Typography>
                  </Grid>
                  <Grid xs={6}>
                    <Typography variant="caption" color="text.secondary">Total Folders:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{exportPreview.total_folders}</Typography>
                  </Grid>
                  <Grid xs={6}>
                    <Typography variant="caption" color="text.secondary">Total Files:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{exportPreview.total_files}</Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Alert severity="info" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                Files will be retrieved directly from Google Drive cloud storage to maintain original file integrity.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setExportModalOpen(false)} disabled={exporting} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={exporting}
            startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <CloudDownloadIcon />}
            onClick={handleExecuteExport}
            sx={{ borderRadius: '12px', fontWeight: 800, px: 3 }}
          >
            {exporting ? 'Exporting...' : 'Download Export Package'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════ IMPORT PREVIEW MODAL ══════════════════ */}
      <Dialog
        open={importPreviewModalOpen}
        onClose={() => !importing && setImportPreviewModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1, bgcolor: isDark ? '#0F172A' : '#FFFFFF' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <CloudUploadIcon sx={{ color: '#10B981' }} /> Import Package Preview
        </DialogTitle>
        <DialogContent>
          {importPreviewData && (
            <Box sx={{ pt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '14px', mb: 2.5, bgcolor: isDark ? '#1E293B' : '#F8FAFC' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#10B981', display: 'block' }}>
                  Target Destination Module:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5, color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  {modulesList.find(m => m.id === destinationModuleId)?.name || 'MOU Repository'}
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid xs={6}>
                    <Typography variant="caption" color="text.secondary">Import File Name:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{importPreviewData.filename}</Typography>
                  </Grid>
                  <Grid xs={6}>
                    <Typography variant="caption" color="text.secondary">Package Type:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{importPreviewData.is_zip ? 'ZIP Archive Tree' : 'Single File'}</Typography>
                  </Grid>
                  <Grid xs={6}>
                    <Typography variant="caption" color="text.secondary">Folders to Create:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#10B981' }}>{importPreviewData.total_folders}</Typography>
                  </Grid>
                  <Grid xs={6}>
                    <Typography variant="caption" color="text.secondary">Files to Upload:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#10B981' }}>{importPreviewData.total_files}</Typography>
                  </Grid>
                </Grid>

                {importPreviewData.file_list && importPreviewData.file_list.length > 0 && (
                  <Box sx={{ maxH: 150, overflowY: 'auto', borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 1 }}>
                      Files Preview List ({importPreviewData.file_list.length}):
                    </Typography>
                    {importPreviewData.file_list.slice(0, 10).map((f, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>{f.path}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatBytes(f.size)}</Typography>
                      </Box>
                    ))}
                    {importPreviewData.file_list.length > 10 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                        + {importPreviewData.file_list.length - 10} more items...
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>

              {importing && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>Importing &amp; Syncing with Google Drive...</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>{importProgress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={importProgress} color="success" sx={{ height: 8, borderRadius: '4px' }} />
                </Box>
              )}

              <Alert severity="success" sx={{ borderRadius: '12px', fontWeight: 600 }}>
                Every folder and file will be synchronized with Google Drive and database records will be created automatically.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setImportPreviewModalOpen(false)} disabled={importing} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={importing}
            startIcon={importing ? <CircularProgress size={18} color="inherit" /> : <CloudUploadIcon />}
            onClick={handleExecuteImport}
            sx={{ borderRadius: '12px', fontWeight: 800, px: 3 }}
          >
            {importing ? 'Importing Data...' : 'Confirm & Start Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══════════════════ IMPORT RESULT MODAL ══════════════════ */}
      <Dialog
        open={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1, bgcolor: isDark ? '#0F172A' : '#FFFFFF' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <CheckCircleIcon sx={{ color: '#10B981' }} /> Import Completed
        </DialogTitle>
        <DialogContent>
          {importResult && (
            <Box sx={{ pt: 1 }}>
              <Alert severity={importResult.failed_count === 0 ? "success" : "warning"} sx={{ borderRadius: '14px', mb: 2.5, fontWeight: 700 }}>
                {importResult.failed_count === 0
                  ? `Successfully imported ${importResult.successful_count} items into module!`
                  : `Import finished with warnings. ${importResult.successful_count} succeeded, ${importResult.failed_count} failed.`}
              </Alert>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', bgcolor: isDark ? '#1E293B' : '#F8FAFC', mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Import Execution Summary:</Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>Total Processed: <strong>{importResult.processed_count}</strong></Typography>
                <Typography variant="caption" sx={{ display: 'block', color: '#10B981' }}>Successful Uploads: <strong>{importResult.successful_count}</strong></Typography>
                <Typography variant="caption" sx={{ display: 'block', color: importResult.failed_count > 0 ? '#EF4444' : 'text.secondary' }}>Failed Items: <strong>{importResult.failed_count}</strong></Typography>
              </Paper>

              {importResult.failed_files && importResult.failed_files.length > 0 && (
                <Box sx={{ maxH: 150, overflowY: 'auto' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#EF4444', display: 'block', mb: 1 }}>
                    Failed Items Detail:
                  </Typography>
                  {importResult.failed_files.map((item, idx) => (
                    <Paper key={idx} sx={{ p: 1, mb: 0.8, bgcolor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#EF4444' }}>{item.name}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{item.reason}</Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button variant="contained" onClick={() => setResultModalOpen(false)} sx={{ borderRadius: '12px', fontWeight: 800, px: 3 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reusable Modern Google Drive Folder Picker Modal */}
      <GoogleDrivePickerModal
        open={driveBrowserOpen}
        onClose={() => setDriveBrowserOpen(false)}
        onSelectFolder={async (targetItem, allTargets) => {
          handleSelectDriveFolder(targetItem, allTargets);
        }}
        title="Select Folders & Documents from Google Drive to Import"
        actionLabel="Select Items for Import"
      />

    </Box>
  );
};

export default ImportExportTab;
