import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Box, Grid, Card, CardContent, Typography, Button, IconButton, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, Menu, MenuItem, ListItemIcon, ListItemText,
  Alert, Divider, Chip, ToggleButtonGroup, ToggleButton, Switch, 
  FormControlLabel, Autocomplete, FormControl, InputLabel, Select,
  LinearProgress, Checkbox, List, ListItem
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import StatusPill from '../components/StatusPill';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import GetAppIcon from '@mui/icons-material/GetApp';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import TimelineIcon from '@mui/icons-material/Timeline';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import CloudIcon from '@mui/icons-material/Cloud';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';


import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSiteTime } from '../context/SiteTimeContext';
import LottieAnimation from '../components/LottieAnimation';
import { useAutoRefresh, triggerGlobalAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';
import BreadcrumbNav from '../components/BreadcrumbNav';
import FilePreviewModal from '../components/FilePreviewModal';
import GoogleDrivePickerModal from '../components/GoogleDrivePickerModal';

const FolderExplorer = ({ rootFolderId = null, customPageId = null }) => {
  const { user, hasPermission } = useAuth();
  const isAdmin = ['Super Admin', 'Admin'].includes(user?.role?.name);
  const { getFormattedSiteDateTime } = useSiteTime();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();


  const searchParamQuery = searchParams.get('search') || '';

  const getFolderStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return '#8B5CF6';
      case 'Signed':
        return '#10B981';
      case 'Pending Review':
        return '#F59E0B';
      case 'Expired':
        return '#EF4444';
      case 'Archived':
        return '#475569';
      default:
        return '#8B5CF6';
    }
  };

  const getDynamicFolderColor = (folder) => {
    if (folder.status === 'Archived') {
      return '#475569';
    }
    if (folder.expiry_date) {
      const expiry = new Date(folder.expiry_date);
      const today = new Date();
      expiry.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        return '#EF4444';
      }
      // If more than 30 days away, override stale Expired status
      if (folder.status === 'Expired') {
        return '#8B5CF6'; // Active (Purple)
      }
    }
    if (folder.status === 'Signed') {
      return '#10B981';
    }
    if (folder.is_viewed === false) {
      return '#F59E0B';
    }
    return getFolderStatusColor(folder.status);
  };

  const getDynamicFolderLabel = (folder) => {
    if (folder.status === 'Archived') {
      return 'Archived';
    }
    if (folder.expiry_date) {
      const expiry = new Date(folder.expiry_date);
      const today = new Date();
      expiry.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Expired';
      if (diffDays <= 30) return 'Expiring Soon';
      // If more than 30 days away, override stale Expired status
      if (folder.status === 'Expired') {
        return 'Active';
      }
    }
    if (folder.status === 'Signed') {
      return 'Signed';
    }
    if (folder.is_viewed === false) {
      return 'Unread';
    }
    return folder.status || 'Active';
  };

  const getOrderedSubfolders = (subfolders) => {
    if (!subfolders) return [];
    return [...subfolders].sort((a, b) => {
      const aArchived = a.status === 'Archived';
      const bArchived = b.status === 'Archived';
      if (aArchived && !bArchived) return -1;
      if (!aArchived && bArchived) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  const folderParam = searchParams.get('folder');
  const currentFolderId = folderParam ? parseInt(folderParam) : (rootFolderId ? parseInt(rootFolderId) : null);
  const setCurrentFolderId = (folderId) => {
    if (folderId === null || (rootFolderId && parseInt(folderId) === parseInt(rootFolderId))) {
      setSearchParams({});
    } else {
      setSearchParams({ folder: folderId });
    }
  };
  const [folderData, setFolderData] = useState({ subfolders: [], files: [] });
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setSelectedFolderIds([]);
  }, [currentFolderId]);

  const activeFolderIdRef = useRef(currentFolderId);
  const activeSearchQueryRef = useRef(searchParamQuery);

  useEffect(() => {
    activeFolderIdRef.current = currentFolderId;
  }, [currentFolderId]);

  useEffect(() => {
    activeSearchQueryRef.current = searchParamQuery;
  }, [searchParamQuery]);

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

  // MOU Global Filter states
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStream, setFilterStream] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  
  const [masterStreams, setMasterStreams] = useState([]);
  const [deptCategories, setDeptCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredExplorerDepts, setFilteredExplorerDepts] = useState([]);
  
  const [mouTypes, setMouTypes] = useState([]);
  const [filteredMOUs, setFilteredMOUs] = useState([]);
  const [isFilteredView, setIsFilteredView] = useState(false);

  // Options Menu state
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [activeItem, setActiveItem] = useState(null); // { type: 'folder'|'file', data: obj }


  // Action Dialogs
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [actionLoadingMessage, setActionLoadingMessage] = useState('');
  
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [folderStatus, setFolderStatus] = useState('Active');
  const [renameStatus, setRenameStatus] = useState('Active');
  const [folderSummary, setFolderSummary] = useState('');
  const [folderExpiryDate, setFolderExpiryDate] = useState('');

  const [auditDialogOpen, setAuditDialogOpen] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [folderActivities, setFolderActivities] = useState([]);

  // Expiry Edit state in Registry Dialog
  const [isEditingExpiry, setIsEditingExpiry] = useState(false);
  const [editExpiryDate, setEditExpiryDate] = useState('');

  const [isSignedUpload, setIsSignedUpload] = useState(false);
  const [uploadSummary, setUploadSummary] = useState('');

  // Move Folder to Module Dialog state
  const [moveModuleDialogOpen, setMoveModuleDialogOpen] = useState(false);
  const [moveFolderTargetItem, setMoveFolderTargetItem] = useState(null);
  const [targetModuleId, setTargetModuleId] = useState('mou_repository');
  const [moduleOptions, setModuleOptions] = useState([]);
  const [movingLoading, setMovingLoading] = useState(false);

  // Full Folder Import state & ref
  const folderInputRef = useRef(null);
  const [folderImportModalOpen, setFolderImportModalOpen] = useState(false);
  const [folderImportFiles, setFolderImportFiles] = useState([]);
  const [folderImportLoading, setFolderImportLoading] = useState(false);

  // Google Drive Direct Import state
  const [driveBrowserOpen, setDriveBrowserOpen] = useState(false);
  const [driveBrowserLoading, setDriveBrowserLoading] = useState(false);
  const [driveCurrentFolder, setDriveCurrentFolder] = useState(null);
  const [driveItems, setDriveItems] = useState([]);
  const [driveImportExecuting, setDriveImportExecuting] = useState(false);

  const handleOpenDriveBrowser = () => {
    setDriveBrowserOpen(true);
  };

  const handleExecuteDriveImport = async (targetDriveFolder, allTargets) => {
    const itemsArr = Array.isArray(targetDriveFolder) ? targetDriveFolder : (allTargets && Array.isArray(allTargets) ? allTargets : [targetDriveFolder]);
    if (!itemsArr || itemsArr.length === 0) return;
    setDriveImportExecuting(true);
    setActionLoadingMessage(`Importing ${itemsArr.length} item(s) from Google Drive into repository...`);
    try {
      const destModule = customPageId ? `custom_${customPageId}` : 'mou_repository';
      const res = await api.post('/api/import-export/import/execute/', {
        source_type: 'google_drive',
        source_drive_items: itemsArr,
        source_drive_folder_id: itemsArr.length === 1 ? itemsArr[0].id : undefined,
        module_id: destModule,
        parent_folder_id: currentFolderId || undefined,
        duplicate_file_strategy: 'create_copy',
        duplicate_folder_strategy: 'merge'
      });

      setSuccess(`Successfully imported ${itemsArr.length} item(s) from Google Drive (${res.data.successful_count} files saved)!`);
      setDriveBrowserOpen(false);
      fetchContents();
      if (typeof triggerGlobalAutoRefresh === 'function') {
        triggerGlobalAutoRefresh(REFRESH_CATEGORIES.FOLDERS);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Google Drive import failed.");
    } finally {
      setDriveImportExecuting(false);
      setActionLoadingMessage('');
    }
  };


  const handleOpenMoveModal = async (folderObj) => {
    setMoveFolderTargetItem(folderObj);
    setTargetModuleId(folderObj.custom_page_id ? String(folderObj.custom_page_id) : 'mou_repository');
    try {
      const res = await api.get('/api/users/custom-pages/');
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setModuleOptions(rawList);
    } catch (err) {
      console.error('Failed to load target module list:', err);
    }
    setMoveModuleDialogOpen(true);
  };

  const handleConfirmMoveModule = async () => {
    if (!moveFolderTargetItem) return;
    setMovingLoading(true);
    try {
      await api.post(`/api/folders/${moveFolderTargetItem.id}/move-module/`, {
        target_custom_page_id: targetModuleId
      });
      setSuccess(`Folder "${moveFolderTargetItem.name}" moved to target repository successfully!`);
      setMoveModuleDialogOpen(false);
      setMoveFolderTargetItem(null);
      fetchContents();
      if (typeof triggerGlobalAutoRefresh === 'function') {
        triggerGlobalAutoRefresh(REFRESH_CATEGORIES.FOLDERS);
      }
    } catch (err) {
      console.error('Failed to move folder to module:', err);
      setError(err.response?.data?.detail || 'Failed to move folder to target module.');
    } finally {
      setMovingLoading(false);
    }
  };

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.webkitdirectory = true;
      folderInputRef.current.directory = true;
      folderInputRef.current.mozdirectory = true;
      folderInputRef.current.removeAttribute('multiple');
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
      folderInputRef.current.setAttribute('mozdirectory', '');
    }
  }, []);

  const handleTriggerFolderImportInput = async () => {
    if (window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        setFolderImportLoading(true);

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
          setFolderImportFiles(filesArr);
          setFolderImportModalOpen(true);
        }
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.warn("window.showDirectoryPicker failed, falling back to input:", err);
      } finally {
        setFolderImportLoading(false);
      }
    }

    // Fallback for browsers without showDirectoryPicker
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
    const items = e.dataTransfer?.items;
    if (!items || items.length === 0) return;

    setFolderImportLoading(true);
    try {
      const entries = Array.from(items)
        .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
        .filter(Boolean);

      const filesArr = await Promise.all(entries.map((entry) => scanEntry(entry)));
      const flattenedFiles = filesArr.flat();

      if (flattenedFiles.length > 0) {
        setFolderImportFiles(flattenedFiles);
        setFolderImportModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to read dropped folder:", err);
    } finally {
      setFolderImportLoading(false);
    }
  };

  const handleFolderImportChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFolderImportFiles(Array.from(files));
      setFolderImportModalOpen(true);
    }
  };

  const handleFolderImportSubmit = async () => {
    if (!folderImportFiles || folderImportFiles.length === 0) return;
    setFolderImportLoading(true);

    const formData = new FormData();
    if (currentFolderId) {
      formData.append('parent_id', currentFolderId);
    }
    if (customPageId) {
      formData.append('custom_page_id', customPageId);
    }

    folderImportFiles.forEach((file) => {
      formData.append('files', file);
      const relPath = file.webkitRelativePath || file.name;
      formData.append('relative_paths', relPath);
    });

    try {
      const res = await api.post('/api/folders/import-folder/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(res.data.detail || "Directory tree imported successfully!");
      setFolderImportModalOpen(false);
      setFolderImportFiles([]);
      fetchContents();
      if (typeof triggerGlobalAutoRefresh === 'function') {
        triggerGlobalAutoRefresh(REFRESH_CATEGORIES.FOLDERS);
      }
    } catch (err) {
      console.error("Folder import error:", err);
      setError(err.response?.data?.detail || "Failed to import folder tree.");
    } finally {
      setFolderImportLoading(false);
    }
  };



  useEffect(() => {
    if (fileDialogOpen) {
      setIsSignedUpload(user?.role?.name !== 'Super Admin' && user?.role?.name !== 'Admin');
      setUploadSummary('');
    }
  }, [fileDialogOpen, user]);


  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [accessList, setAccessList] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState(null);
  const [accessPermissionLevel, setAccessPermissionLevel] = useState('view');
  const [linkCopied, setLinkCopied] = useState(false);

  // File preview Modal
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    api.get('/api/mous/master/streams/').then(res => setMasterStreams(res.data.filter(s => s.is_active))).catch(() => {});
    api.get('/api/mous/master/dept-categories/').then(res => setDeptCategories(res.data)).catch(() => {});
    api.get('/api/mous/master/departments/').then(res => setDepartments(res.data)).catch(() => {});
    api.get('/api/mous/templates/').then(res => setMouTypes(res.data)).catch(() => {});
  }, [user]);


  const handleFilterStreamChange = (e) => {
    const streamId = e.target.value;
    setFilterStream(streamId);
    setFilterDept('');
    if (streamId) {
      setFilteredExplorerDepts(departments.filter(d => 
        String(d.stream) === String(streamId) || 
        String(d.stream_id) === String(streamId) ||
        d.stream_name === masterStreams.find(s => s.id === streamId)?.name
      ));
    } else {
      setFilteredExplorerDepts(departments);
    }
  };

  const handleFilterCategoryChange = (e) => {
    const catId = e.target.value;
    setFilterCategory(catId);
    setFilterDept('');
    setFilteredExplorerDepts(departments.filter(d => d.category === catId));
  };

  const fetchFilteredMOUs = useCallback(async () => {
    const hasFilters = !!filterStream || !!filterCategory || !!filterDept || !!filterStatus || !!filterType;
    setIsFilteredView(hasFilters);
    
    if (!hasFilters) {
      setFilteredMOUs([]);
      return;
    }
    
    setLoading(true);
    try {
      const streamObj = masterStreams.find(s => s.id === filterStream);
      const streamName = streamObj ? streamObj.name : (filterStream || '');
      
      const catObj = deptCategories.find(c => c.id === filterCategory);
      const catName = catObj ? catObj.name : '';
      
      const params = {};
      if (streamName) params.stream = streamName;
      if (catName) params.department_category = catName;
      if (filterDept) params.department_name = filterDept;
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      
      const res = await api.get('/api/mous/', { params });
      setFilteredMOUs(res.data);
    } catch (err) {
      console.error("Failed to load filtered MOUs", err);
      setError("Failed to query filtered MOUs.");
    } finally {
      setLoading(false);
    }
  }, [filterStream, filterCategory, filterDept, filterStatus, filterType, masterStreams, deptCategories]);

  useEffect(() => {
    fetchFilteredMOUs();
  }, [fetchFilteredMOUs]);

  // Fetch folders and files contents
  const fetchContents = useCallback(async () => {
    // Skip normal folder contents load if MOU filter is active
    if (isFilteredView) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    setLoading(true);

    setError(null);
    try {
      if (searchParamQuery) {
        // Search Results mode
        const res = await api.get(`/api/search/?q=${encodeURIComponent(searchParamQuery)}`);
        if (currentFolderId !== activeFolderIdRef.current || searchParamQuery !== activeSearchQueryRef.current) return;
        setFolderData({ subfolders: res.data.folders, files: res.data.files });
        setCurrentFolder(null);
      } else if (currentFolderId === null) {
        // Root Directory for specific module or MOU Repositories
        const params = {};
        if (customPageId) params.custom_page_id = customPageId;
        const res = await api.get('/api/folders/root/', { params });
        if (currentFolderId !== activeFolderIdRef.current || searchParamQuery !== activeSearchQueryRef.current) return;
        setFolderData({ subfolders: res.data.subfolders || [], files: res.data.files || [] });
        setCurrentFolder(null);
      } else {

        // Inner Directory
        const res = await api.get(`/api/folders/${currentFolderId}/contents/`);
        if (currentFolderId !== activeFolderIdRef.current || searchParamQuery !== activeSearchQueryRef.current) return;
        setFolderData(res.data);
        const folderRes = await api.get(`/api/folders/${currentFolderId}/`);
        if (currentFolderId !== activeFolderIdRef.current || searchParamQuery !== activeSearchQueryRef.current) return;
        setCurrentFolder(folderRes.data);
      }
    } catch (err) {
      if (currentFolderId !== activeFolderIdRef.current || searchParamQuery !== activeSearchQueryRef.current) return;
      console.error("Failed to load contents:", err);
      setError("Failed to retrieve directory contents. Check permissions.");
    } finally {
      if (currentFolderId === activeFolderIdRef.current && searchParamQuery === activeSearchQueryRef.current) {
        setLoading(false);
      }
    }
  }, [currentFolderId, searchParamQuery, isFilteredView, customPageId]);

  useEffect(() => {
    activeFolderIdRef.current = currentFolderId;
    activeSearchQueryRef.current = searchParamQuery;
    fetchContents();
  }, [fetchContents]);

  // Global Auto Refresh Subscription
  useAutoRefresh([REFRESH_CATEGORIES.FOLDERS, REFRESH_CATEGORIES.FILES, REFRESH_CATEGORIES.MOUS], fetchContents);



  // Navigate folder helper
  const handleFolderClick = (folderId) => {
    if (searchParamQuery) {
      // Clear search query on folder click
      setSearchParams({});
    }
    setCurrentFolderId(folderId);
  };

  // Menu Handlers
  const handleMenuOpen = (e, item, type) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setActiveItem({ type, data: item });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  // Add Folder
  const handleCreateFolderSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim() || !folderSummary.trim() || !folderExpiryDate) return;

    setActionLoadingMessage('Creating folder...');
    try {
      await api.post('/api/folders/create-custom/', {
        name: folderName.trim(),
        parent_id: currentFolderId || (rootFolderId ? parseInt(rootFolderId) : null),
        custom_page_id: customPageId,
        status: folderStatus,
        summary: folderSummary.trim(),
        expiry_date: folderExpiryDate,
        created_at: getFormattedSiteDateTime()
      });
      setFolderDialogOpen(false);
      setFolderName('');
      setFolderStatus('Active');
      setFolderSummary('');
      setFolderExpiryDate('');
      fetchContents();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create folder.");
    } finally {
      setActionLoadingMessage('');
    }
  };

  const handleOpenAudit = async (folderId) => {
    const targetId = folderId || activeItem?.data?.id || currentFolderId;
    if (!targetId) return;
    setAuditLoading(true);
    setAuditDialogOpen(true);
    setIsEditingExpiry(false);
    handleMenuClose();
    try {
      const res = await api.get(`/api/folders/${targetId}/audit/`);
      setAuditData(res.data);

      const logsRes = await api.get('/api/activity-logs/');
      const folderName = res.data.folder?.name;
      const relatedLogs = logsRes.data.filter(l => 
        (l.module === 'folders' || l.module === 'files') && 
        (
          l.action.includes(`'${folderName}'`) || 
          l.action.includes(folderName) || 
          l.action.includes(`folder ID: ${targetId}`) || 
          l.action.includes(`folder_id': ${targetId}`) || 
          l.action.includes(`folder_id: ${targetId}`)
        )
      );
      setFolderActivities(relatedLogs);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError("Failed to load directory activity insights.");
    } finally {
      setAuditLoading(false);
    }
  };

  const handleStartEditExpiry = () => {
    setEditExpiryDate(auditData?.folder?.expiry_date ? auditData.folder.expiry_date.substring(0, 10) : '');
    setIsEditingExpiry(true);
  };

  const handleSaveExpiry = async () => {
    if (!auditData?.folder?.id) return;
    try {
      const res = await api.patch(`/api/folders/${auditData.folder.id}/`, {
        expiry_date: editExpiryDate || null
      });
      setAuditData(prev => ({
        ...prev,
        folder: {
          ...prev.folder,
          expiry_date: res.data.expiry_date
        }
      }));
      setIsEditingExpiry(false);
      fetchContents();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update expiry date.");
    }
  };

  const handleFileUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('folder_id', currentFolderId);
    formData.append('created_at', getFormattedSiteDateTime());
    formData.append('is_signed', isSignedUpload ? 'true' : 'false');
    formData.append('summary', uploadSummary.trim());

    try {
      await api.post('/api/files/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFileDialogOpen(false);
      setSelectedFile(null);
      setUploadSummary('');
      setSuccess(isSignedUpload ? "Signed copy uploaded successfully! Folder status updated to Signed." : "File uploaded successfully.");
      fetchContents();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to upload file.");
    }
  };

  // Rename action
  const handleRenameClick = () => {
    setRenameName(activeItem.data.name);
    if (activeItem.type === 'folder') {
      setRenameStatus(activeItem.data.status || 'Active');
    }
    setRenameDialogOpen(true);
    handleMenuClose();
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!renameName.trim()) return;

    try {
      if (activeItem.type === 'folder') {
        await api.put(`/api/folders/${activeItem.data.id}/`, { 
          name: renameName.trim(),
          status: renameStatus
        });
      } else {
        await api.put(`/api/files/${activeItem.data.id}/`, { name: renameName.trim() });
      }
      setRenameDialogOpen(false);
      fetchContents();
    } catch (err) {
      setError(err.response?.data?.detail || "Rename failed.");
    }
  };

  // Delete Action
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteSubmit = async () => {
    const itemName = activeItem?.data?.name || "Item";
    const itemType = activeItem?.type === 'folder' ? 'Folder' : 'File';
    setDeleteDialogOpen(false);
    setActionLoadingMessage(`Moving ${itemType.toLowerCase()} to Recycle Bin...`);
    try {
      // Small delay to ensure the delete animation is visible to the user
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (activeItem.type === 'folder') {
        await api.delete(`/api/folders/${activeItem.data.id}/`);
      } else {
        await api.delete(`/api/files/${activeItem.data.id}/`);
      }
      setSuccess(`${itemType} "${itemName}" moved to Recycle Bin.`);
      fetchContents();
    } catch (err) {
      setError(err.response?.data?.detail || "Move to Recycle Bin failed.");
    } finally {
      setActionLoadingMessage('');
      setActiveItem(null);
    }
  };

  const handleToggleSelectAllFolders = () => {
    if (selectedFolderIds.length === folderData.subfolders.length) {
      setSelectedFolderIds([]);
    } else {
      setSelectedFolderIds(folderData.subfolders.map(f => f.id));
    }
  };

  const handleToggleSelectFolder = (folderId) => {
    setSelectedFolderIds(prev => 
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const handleBulkDeleteSubmit = async () => {
    setBulkDeleteDialogOpen(false);
    setActionLoadingMessage("Moving selected folders to Recycle Bin...");
    try {
      // Simulate delay for delete animation consistency if desired, or run immediately
      await new Promise(resolve => setTimeout(resolve, 1500));
      await api.post('/api/folders/bulk-delete/', { folder_ids: selectedFolderIds });
      setSuccess("Selected folders moved to Recycle Bin.");
      setSelectedFolderIds([]);
      fetchContents();
    } catch (err) {
      setError(err.response?.data?.detail || "Bulk move to Recycle Bin failed.");
    } finally {
      setActionLoadingMessage('');
    }
  };

  // Download File Action
  const handleDownloadClick = async () => {
    handleMenuClose();
    try {
      const response = await api.get(`/api/files/${activeItem.data.id}/download/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', activeItem.data.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // Access Settings Actions
  const handleAccessClick = async () => {
    handleMenuClose();
    setAccessDialogOpen(true);
    try {
      // Get current folder's overrides
      const res = await api.get(`/api/folders/${activeItem.data.id}/permissions/`);
      setAccessList(res.data);
      // Load all users to select from
      const usersRes = await api.get('/api/users/');
      setAllUsers(usersRes.data);
    } catch (err) {
      console.error("Load access configuration failed:", err);
    }
  };

  const handleGrantAccessSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForAccess || !activeItem?.data?.id) return;

    try {
      await api.post(`/api/folders/${activeItem.data.id}/assign-access/`, {
        user_id: selectedUserForAccess.id,
        is_granted: true,
        can_read: true,
        can_download: true,
        can_upload: accessPermissionLevel === 'edit',
        can_delete_own_uploads: accessPermissionLevel === 'edit'
      });
      
      // Reload access list
      const res = await api.get(`/api/folders/${activeItem.data.id}/permissions/`);
      setAccessList(res.data);
      setSelectedUserForAccess(null);
      setAccessPermissionLevel('view');
    } catch (err) {
      console.error("Failed to grant folder access:", err);
    }
  };

  const handlePermissionChange = async (targetUserId, newLevel) => {
    if (!activeItem?.data?.id) return;
    try {
      await api.post(`/api/folders/${activeItem.data.id}/assign-access/`, {
        user_id: targetUserId,
        is_granted: true,
        can_read: true,
        can_download: true,
        can_upload: newLevel === 'edit',
        can_delete_own_uploads: newLevel === 'edit'
      });
      // Reload access list
      const res = await api.get(`/api/folders/${activeItem.data.id}/permissions/`);
      setAccessList(res.data);
    } catch (err) {
      console.error("Failed to update folder access:", err);
    }
  };

  const handleRevokeAccess = async (targetUserId) => {
    if (!activeItem?.data?.id) return;
    try {
      await api.post(`/api/folders/${activeItem.data.id}/revoke-access/`, {
        user_id: targetUserId
      });
      // Reload access list
      const res = await api.get(`/api/folders/${activeItem.data.id}/permissions/`);
      setAccessList(res.data);
    } catch (err) {
      console.error("Failed to revoke folder access:", err);
    }
  };

  const handleArchiveFolder = async (folder) => {
    try {
      await api.put(`/api/folders/${folder.id}/`, {
        status: 'Archived'
      });
      setSuccess(`Folder "${folder.name}" archived successfully.`);
      fetchContents();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to archive folder.");
    }
  };

  const handleUnarchiveFolder = async (folder) => {
    try {
      await api.put(`/api/folders/${folder.id}/`, {
        status: 'Active'
      });
      setSuccess(`Folder "${folder.name}" unarchived successfully.`);
      fetchContents();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to unarchive folder.");
    }
  };

  const triggerRename = (item, type) => {
    setActiveItem({ type, data: item });
    setRenameName(item.name);
    setRenameDialogOpen(true);
  };

  const triggerDelete = (item, type) => {
    setActiveItem({ type, data: item });
    setDeleteDialogOpen(true);
  };

  const triggerAccess = async (folderItem) => {
    setActiveItem({ type: 'folder', data: folderItem });
    setAccessDialogOpen(true);
    try {
      const res = await api.get(`/api/folders/${folderItem.id}/permissions/`);
      setAccessList(res.data);
      const usersRes = await api.get('/api/users/');
      setAllUsers(usersRes.data);
    } catch (err) {
      console.error("Load access configuration failed:", err);
    }
  };

  const triggerDownload = async (fileItem) => {
    try {
      const response = await api.get(`/api/files/${fileItem.id}/download/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileItem.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const getFileIconColor = (type) => {
    if (type.startsWith('image/')) return '#3b82f6';
    if (type === 'application/pdf') return '#ef4444';
    if (type.includes('word') || type.includes('officedocument.wordprocessing')) return '#2563eb';
    if (type.includes('excel') || type.includes('officedocument.spreadsheet')) return '#10b981';
    if (type.includes('powerpoint') || type.includes('officedocument.presentation')) return '#f97316';
    if (type.includes('zip') || type.includes('compressed')) return '#8b5cf6';
    return '#6b7280';
  };

  const getBreadcrumbPath = () => {
    if (!currentFolder || !currentFolder.path) return [];
    if (!rootFolderId) return currentFolder.path;
    const rootIndex = currentFolder.path.findIndex(p => parseInt(p.id) === parseInt(rootFolderId));
    if (rootIndex === -1) return currentFolder.path;
    return currentFolder.path.slice(rootIndex + 1);
  };
  
  const getRootLabel = () => {
    if (!rootFolderId || !currentFolder) return "Root";
    if (currentFolder.id === parseInt(rootFolderId)) return currentFolder.name;
    const found = currentFolder.path?.find(p => parseInt(p.id) === parseInt(rootFolderId));
    return found ? found.name : currentFolder.name;
  };

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-in">
      {/* Breadcrumbs Row wrapped in a modern card */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        {!searchParamQuery ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#ffffff', 
            py: 1, 
            px: 2, 
            borderRadius: '24px',
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }}>
            <FolderIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
            <BreadcrumbNav 
              path={getBreadcrumbPath()} 
              onFolderClick={handleFolderClick} 
              rootLabel={getRootLabel()}
            />
          </Box>
        ) : (
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Search Results for "{searchParamQuery}"
          </Typography>
        )}
      </Box>

      {/* ── Unified Filter + Controls Toolbar ─── */}
      <Card sx={{ p: 2, mb: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        {/* Row 1: filters */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Stream */}
          <FormControl size="small" sx={{ flex: '1 1 145px', minWidth: 130 }}>
            <InputLabel>Stream</InputLabel>
            <Select
              value={filterStream}
              label="Stream"
              onChange={handleFilterStreamChange}
              sx={{ borderRadius: '10px' }}
            >
              <MenuItem value="">All Streams</MenuItem>
              {masterStreams.map(s => <MenuItem key={`explorer-stream-${s.id}`} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Department */}
          <FormControl size="small" disabled={!filterStream && !filterCategory} sx={{ flex: '1 1 145px', minWidth: 130 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={filterDept}
              label="Department"
              onChange={(e) => setFilterDept(e.target.value)}
              sx={{ borderRadius: '10px' }}
            >
              <MenuItem value="">All Departments</MenuItem>
              {filteredExplorerDepts.map((d, dIdx) => <MenuItem key={`explorer-dept-${d.id}-${dIdx}`} value={d.name}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Status */}
          <FormControl size="small" sx={{ flex: '1 1 145px', minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{ borderRadius: '10px' }}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Pending Verification">Pending Verification</MenuItem>
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Expired">Expired</MenuItem>
            </Select>
          </FormControl>

          {/* MOU Type */}
          <FormControl size="small" sx={{ flex: '1 1 145px', minWidth: 130 }}>
            <InputLabel>MOU Type</InputLabel>
            <Select
              value={filterType}
              label="MOU Type"
              onChange={(e) => setFilterType(e.target.value)}
              sx={{ borderRadius: '10px' }}
            >
              <MenuItem value="">All Types</MenuItem>
              {mouTypes.map(t => <MenuItem key={`explorer-type-${t.id}`} value={t.id}>{t.name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Clear Filters */}
          {(filterCategory || filterDept || filterStatus || filterType) && (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => {
                setFilterCategory('');
                setFilterDept('');
                setFilterStatus('');
                setFilterType('');
                setFilteredExplorerDepts([]);
              }}
              sx={{ borderRadius: '10px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              Clear
            </Button>
          )}

          {/* Spacer */}
          <Box sx={{ flex: 1 }} />

          {/* View Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, next) => next && setViewMode(next)}
            size="small"
            sx={{
              bgcolor: 'background.paper',
              borderRadius: '10px',
              p: 0.2,
              border: (theme) => `1px solid ${theme.palette.divider}`,
              flexShrink: 0,
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: '8px',
                px: 1.5,
                py: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: '#ffffff',
                  '&:hover': { bgcolor: 'primary.dark' }
                }
              }
            }}
          >
            <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>

          {/* Sort */}
          <Button
            size="small"
            variant="outlined"
            sx={{
              borderColor: 'divider',
              borderRadius: '10px',
              color: 'text.secondary',
              px: 2,
              py: 0.7,
              fontWeight: 600,
              bgcolor: 'background.paper',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Sort: Name A-Z
          </Button>
        </Box>

        {/* Active filter chips */}
        {(filterStream || filterCategory || filterDept || filterStatus || filterType) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mr: 0.5 }}>Active:</Typography>
            {filterStream && <Chip size="small" label={masterStreams.find(s => s.id === filterStream)?.name || 'Stream'} onDelete={() => { setFilterStream(''); setFilterDept(''); setFilteredExplorerDepts(departments); }} color="primary" variant="outlined" />}
            {filterCategory && <Chip size="small" label={deptCategories.find(c => c.id === filterCategory)?.name} onDelete={() => { setFilterCategory(''); setFilterDept(''); setFilteredExplorerDepts(departments); }} color="secondary" variant="outlined" />}
            {filterDept && <Chip size="small" label={filterDept} onDelete={() => setFilterDept('')} variant="outlined" />}
            {filterStatus && <Chip size="small" label={filterStatus} onDelete={() => setFilterStatus('')} color="success" variant="outlined" />}
            {filterType && <Chip size="small" label={mouTypes.find(t => t.id === filterType)?.name} onDelete={() => setFilterType('')} color="info" variant="outlined" />}
          </Box>
        )}
      </Card>

      {/* Action Buttons Row */}
      {!isFilteredView && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 3, alignItems: 'center' }}>
          {selectedFolderIds.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setBulkDeleteDialogOpen(true)}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, mr: 'auto' }}
            >
              Delete Selected ({selectedFolderIds.length})
            </Button>
          )}
          {!searchParamQuery && currentFolder && (hasPermission('manage_users') || currentFolder.created_by?.id === user?.id) && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<ShareIcon />}
              onClick={() => triggerAccess(currentFolder)}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              Share Folder
            </Button>
          )}
          {isAdmin && !searchParamQuery && (
            <Button
              variant="outlined"
              startIcon={<CreateNewFolderIcon />}
              onClick={() => setFolderDialogOpen(true)}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              New Folder
            </Button>
          )}
          {isAdmin && !searchParamQuery && (
            <>
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
                onChange={handleFolderImportChange}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<FolderIcon />}
                onClick={handleTriggerFolderImportInput}
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
              >
                Import Folder
              </Button>
              <Button
                variant="contained"
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
                Import from Drive
              </Button>
            </>
          )}
          {!searchParamQuery && (
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => setFileDialogOpen(true)}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              Upload File
            </Button>
          )}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <>
          {isFilteredView ? (
            <TableContainer component={Paper} sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>MOU Number</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Partner Organization</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Days Left</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredMOUs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No matching MOUs found.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMOUs.map((m) => (
                      <TableRow key={m.id} hover onClick={() => navigate(`/mou/${m.id}`)} sx={{ cursor: 'pointer' }}>
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Chip label={m.mou_number} size="small" />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{m.title}</TableCell>
                        <TableCell>{m.partner_organization}</TableCell>
                        <TableCell>{m.department_name}</TableCell>
                        <TableCell>{m.days_left !== null ? `${m.days_left} days` : '—'}</TableCell>
                        <TableCell>
                          <StatusPill status={m.status} />
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="outlined" sx={{ borderRadius: '12px' }} onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/mou/${m.id}`);
                          }}>Details</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : folderData.subfolders.length === 0 && folderData.files.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 12, border: '2px dashed', borderColor: 'divider', borderRadius: '16px' }}>
              <SearchOffIcon sx={{ fontSize: 60, mb: 1, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Empty Folder
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No folders or files found here.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Folder list section */}
              {folderData.subfolders.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.5px' }}>
                      FOLDERS ({folderData.subfolders.length})
                    </Typography>
                    
                    {/* Status Legend Key */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Folder Status Key:
                      </Typography>
                      {[
                        { label: 'Active', color: '#8B5CF6' },
                        { label: 'Signed', color: '#10B981' },
                        { label: 'Pending Review', color: '#F59E0B' },
                        { label: 'Expired', color: '#EF4444' },
                        { label: 'Archived', color: '#475569' }
                      ].map((item) => (
                        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                            {item.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  {viewMode === 'grid' ? (
                    <Grid container spacing={2.5}>
                      {getOrderedSubfolders(folderData.subfolders).map((folder) => {
                        const deptStyle = folder.name.toLowerCase().includes('medical') ? { color: '#14B8A6', bg: 'rgba(20, 184, 166, 0.12)' }
                          : folder.name.toLowerCase().includes('commerce') ? { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' }
                          : folder.name.toLowerCase().includes('arts') ? { color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' }
                          : folder.name.toLowerCase().includes('engineering') || folder.name.toLowerCase().includes('cse') ? { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' }
                          : { color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' };

                        return (
                          <Grid xs={12} sm={6} md={4} lg={2.4} key={`folder-grid-${folder.id}`}>
                            <Card 
                              className="card-lift"
                              sx={{ 
                                cursor: 'pointer',
                                height: '100%',
                                borderRadius: '18px',
                                position: 'relative',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderLeft: `4px solid ${getDynamicFolderColor(folder)}`,
                                bgcolor: 'background.paper',
                                transition: 'all 0.22s ease',
                                '&:hover': { 
                                  borderColor: getDynamicFolderColor(folder), 
                                  bgcolor: `${getDynamicFolderColor(folder)}08`,
                                }
                              }}
                             >
                              {!isFilteredView && (
                                <Checkbox
                                  size="small"
                                  checked={selectedFolderIds.includes(folder.id)}
                                  onChange={() => handleToggleSelectFolder(folder.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  sx={{ 
                                    position: 'absolute', 
                                    top: 6, 
                                    left: 6, 
                                    zIndex: 2,
                                    bgcolor: selectedFolderIds.includes(folder.id) ? 'transparent' : 'rgba(255,255,255,0.85)',
                                    color: selectedFolderIds.includes(folder.id) ? 'primary.main' : 'rgba(0, 0, 0, 0.25)',
                                    borderRadius: '6px',
                                    padding: '4px',
                                    '&.Mui-checked': {
                                      color: getDynamicFolderColor(folder),
                                    }
                                  }}
                                />
                              )}
                              {/* Absolute top actions menu */}
                              <IconButton 
                                size="small" 
                                onClick={(e) => handleMenuOpen(e, folder, 'folder')} 
                                sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
 
                              <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%', '&:last-child': { pb: 2.5 } }}>
                                <FolderIcon sx={{ color: getDynamicFolderColor(folder), fontSize: 56, mb: 1, filter: `drop-shadow(0 4px 10px ${getDynamicFolderColor(folder)}30)` }} />
                                
                                <Chip 
                                  label={getDynamicFolderLabel(folder)} 
                                  size="small" 
                                  sx={{ 
                                    fontSize: '0.65rem', 
                                    height: 18, 
                                    mb: 1.2, 
                                    fontWeight: 700, 
                                    color: getDynamicFolderColor(folder), 
                                    bgcolor: `${getDynamicFolderColor(folder)}12`, 
                                    border: '1px solid',
                                    borderColor: `${getDynamicFolderColor(folder)}24`,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }} 
                                />
                                
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.9rem', mb: 0.5, px: 0.5 }} noWrap>
                                  {folder.name}
                                </Typography>
                                {folder.summary && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mb: 0.5 }} noWrap>
                                    {folder.summary}
                                  </Typography>
                                )}
                                
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  {folder.file_count} files • {folder.subfolder_count} folders
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    // List view folders
                    <TableContainer component={Paper} sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'none', border: (theme) => `1px solid ${theme.palette.divider}` }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
                          <TableRow>
                            {!isFilteredView && (
                              <TableCell padding="checkbox" sx={{ py: 1.5, pl: 2 }}>
                                <Checkbox
                                  indeterminate={selectedFolderIds.length > 0 && selectedFolderIds.length < folderData.subfolders.length}
                                  checked={folderData.subfolders.length > 0 && selectedFolderIds.length === folderData.subfolders.length}
                                  onChange={handleToggleSelectAllFolders}
                                  size="small"
                                />
                              </TableCell>
                            )}
                            <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Folder Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Creator / Owner</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Last Modified</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Contents / Details</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                           {getOrderedSubfolders(folderData.subfolders).map((folder) => (
                            <TableRow 
                              key={`folder-row-${folder.id}`} 
                              hover 
                              onDoubleClick={() => handleFolderClick(folder.id)}
                              style={{ cursor: 'pointer' }}
                            >
                              {!isFilteredView && (
                                <TableCell padding="checkbox" sx={{ pl: 2 }} onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedFolderIds.includes(folder.id)}
                                    onChange={() => handleToggleSelectFolder(folder.id)}
                                    size="small"
                                  />
                                </TableCell>
                              )}
                              <TableCell sx={{ py: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <FolderIcon sx={{ color: getDynamicFolderColor(folder), fontSize: 24 }} />
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{folder.name}</Typography>
                                    {folder.summary && (
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', fontSize: '0.72rem' }}>
                                        {folder.summary}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>{folder.created_by?.name || 'System'}</TableCell>
                              <TableCell>{new Date(folder.updated_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={getDynamicFolderLabel(folder)} 
                                  size="small" 
                                  sx={{ 
                                    fontSize: '0.7rem', 
                                    height: 20, 
                                    fontWeight: 700, 
                                    color: getDynamicFolderColor(folder), 
                                    bgcolor: `${getDynamicFolderColor(folder)}12`, 
                                    border: '1px solid',
                                    borderColor: `${getDynamicFolderColor(folder)}24`,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }} 
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                  {folder.file_count} files • {folder.subfolder_count} folders
                                </Typography>
                              </TableCell>
                              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                <IconButton size="small" onClick={(e) => handleMenuOpen(e, folder, 'folder')}>
                                  <MoreVertIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* File list section */}
              {folderData.files.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, mb: 2, letterSpacing: '0.5px' }}>
                    FILES ({folderData.files.length})
                  </Typography>

                  {viewMode === 'grid' ? (
                    <Grid container spacing={2.5}>
                      {folderData.files.map((file) => {
                        const isPdf = file.file_type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                        const isImage = file.file_type.startsWith('image/') || file.name.toLowerCase().match(/\.(png|jpe?g|gif|webp)$/);
                        const isAdmin = user?.role?.name === 'Super Admin' || user?.role?.name === 'Admin';
                        const hasExplicitPreviewGrant = user?.permissions_override?.some(p => p.permission?.codename === 'preview_files' && p.is_granted === true);
                        const hasExplicitDownloadGrant = user?.permissions_override?.some(p => p.permission?.codename === 'download_files' && p.is_granted === true);
                        const canPreviewPdf = isAdmin || hasExplicitPreviewGrant;
                        const canDownloadPdf = isAdmin || hasExplicitDownloadGrant;
                        return (
                          <Grid xs={12} sm={6} md={4} lg={3} key={`file-grid-${file.id}`}>
                            <Card 
                              sx={{ 
                                cursor: 'pointer',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                borderRadius: '16px',
                                border: (theme) => `1px solid ${theme.palette.divider}`,
                                boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.02)',
                                '&:hover': { 
                                  borderColor: 'primary.main', 
                                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30,136,229,0.06)' : 'rgba(30,136,229,0.03)',
                                  transform: 'translateY(-2px)'
                                }
                              }}
                              onClick={() => {
                                if (isPdf && !canPreviewPdf) {
                                  setError("PDF previews are restricted to administrators.");
                                  return;
                                }
                                setPreviewFile(file);
                              }}
                            >
                              {/* Preview area container */}
                              <Box sx={{ 
                                height: 120, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f1f5f9',
                                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                                position: 'relative',
                                overflow: 'hidden'
                              }}>
                                {isImage ? (
                                  <Box 
                                    component="img" 
                                    src={file.file_url} 
                                    alt={file.name} 
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                    <InsertDriveFileIcon sx={{ color: getFileIconColor(file.file_type), fontSize: 44 }} />
                                    {isPdf && (
                                      <Chip 
                                        label="PDF" 
                                        size="small" 
                                        sx={{ 
                                          bgcolor: '#ef4444', 
                                          color: '#ffffff', 
                                          fontWeight: 800, 
                                          fontSize: '0.65rem', 
                                          height: 18,
                                          position: 'absolute',
                                          top: 10,
                                          left: 10
                                        }} 
                                      />
                                    )}
                                  </Box>
                                )}
                              </Box>

                              <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', flexGrow: 1, '&:last-child': { pb: 2 } }}>
                                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 0.5 }}>
                                  {file.name}
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto', pt: 1, alignItems: 'center' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {file.size_formatted} • v{file.version_number}
                                  </Typography>
                                  <IconButton 
                                    size="small" 
                                    onClick={(e) => handleMenuOpen(e, file, 'file')}
                                  >
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    // List view files
                    <TableContainer component={Paper} sx={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'none', border: (theme) => `1px solid ${theme.palette.divider}` }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#1e293b' : '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, py: 1.5 }}>File Name</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Uploaded By</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Last Modified</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>File Size</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Version</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {folderData.files.map((file) => {
                            const isPdf = file.file_type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                            const isAdmin = user?.role?.name === 'Super Admin' || user?.role?.name === 'Admin';
                            const hasExplicitPreviewGrant = user?.permissions_override?.some(p => p.permission?.codename === 'preview_files' && p.is_granted === true);
                            const hasExplicitDownloadGrant = user?.permissions_override?.some(p => p.permission?.codename === 'download_files' && p.is_granted === true);
                            const canPreviewPdf = isAdmin || hasExplicitPreviewGrant;
                            const canDownloadPdf = isAdmin || hasExplicitDownloadGrant;
                            return (
                              <TableRow 
                                key={`file-row-${file.id}`} 
                                hover 
                                onClick={() => {
                                  if (isPdf && !canPreviewPdf) {
                                    setError("PDF previews are restricted to administrators.");
                                    return;
                                  }
                                  setPreviewFile(file);
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5 }}>
                                  <InsertDriveFileIcon sx={{ color: getFileIconColor(file.file_type), fontSize: 24 }} />
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{file.name}</Typography>
                                </TableCell>
                                <TableCell>{file.uploaded_by?.name || 'System'}</TableCell>
                                <TableCell>{new Date(file.updated_at).toLocaleDateString()}</TableCell>
                                <TableCell>{file.size_formatted}</TableCell>
                                <TableCell>
                                  <Chip label={`v${file.version_number}`} size="small" sx={{ height: 20, fontWeight: 600 }} />
                                </TableCell>
                                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, file, 'file')}>
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </>
          )}
        </>
      )}

      {/* Row Context Menu */}


      {/* Dialogs */}
      {/* Create Folder Dialog */}
      <Dialog open={folderDialogOpen} onClose={() => setFolderDialogOpen(false)}>
        <form onSubmit={handleCreateFolderSubmit}>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogContent sx={{ minWidth: 350 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Folder Name"
              type="text"
              fullWidth
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              required
            />
            <TextField
              margin="dense"
              label="Folder Summary"
              type="text"
              fullWidth
              multiline
              rows={3}
              value={folderSummary}
              onChange={(e) => setFolderSummary(e.target.value)}
              required
              sx={{ mt: 2 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 0.5, fontWeight: 600 }}>
              Expiry Date *
            </Typography>
            <TextField
              margin="dense"
              type="date"
              fullWidth
              value={folderExpiryDate}
              onChange={(e) => setFolderExpiryDate(e.target.value)}
              required
            />
            <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
              <InputLabel id="folder-status-select-label">Folder Status</InputLabel>
              <Select
                labelId="folder-status-select-label"
                id="folder-status-select"
                value={folderStatus}
                label="Folder Status"
                onChange={(e) => setFolderStatus(e.target.value)}
              >
                <MenuItem value="Active">🟣 Active</MenuItem>
                <MenuItem value="Signed">🟢 Signed</MenuItem>
                <MenuItem value="Pending Review">🟡 Pending Review</MenuItem>
                <MenuItem value="Expired">🔴 Expired</MenuItem>
                <MenuItem value="Archived">⚫ Archived</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Upload File Dialog */}
      <Dialog open={fileDialogOpen} onClose={() => setFileDialogOpen(false)}>
        <form onSubmit={handleFileUploadSubmit}>
          <DialogTitle>Upload File</DialogTitle>
          <DialogContent sx={{ minWidth: 320, py: 2 }}>
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ py: 4, borderStyle: 'dashed' }}
            >
              {selectedFile ? selectedFile.name : "Select File to Upload"}
              <input
                type="file"
                hidden
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </Button>
            <FormControlLabel
              control={
                <Switch 
                  checked={isSignedUpload}
                  onChange={(e) => setIsSignedUpload(e.target.checked)}
                />
              }
              label="Mark as Signed Copy"
              sx={{ mt: 2, display: 'block' }}
            />
            {isSignedUpload && (
              <TextField
                margin="dense"
                label="Upload Summary / Comments"
                placeholder="Describe what you are uploading (e.g. Executed Agreement)..."
                type="text"
                fullWidth
                multiline
                rows={2}
                value={uploadSummary}
                onChange={(e) => setUploadSummary(e.target.value)}
                required
                sx={{ mt: 1.5 }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setFileDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={!selectedFile}>Upload</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => { setRenameDialogOpen(false); setActiveItem(null); }}>
        <form onSubmit={handleRenameSubmit}>
          <DialogTitle>Rename {activeItem?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
          <DialogContent sx={{ minWidth: 320 }}>
            <TextField
              autoFocus
              margin="dense"
              label="New Name"
              type="text"
              fullWidth
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              required
            />
            {activeItem?.type === 'folder' && (
              <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                <InputLabel id="rename-folder-status-select-label">Folder Status</InputLabel>
                <Select
                  labelId="rename-folder-status-select-label"
                  id="rename-folder-status-select"
                  value={renameStatus}
                  label="Folder Status"
                  onChange={(e) => setRenameStatus(e.target.value)}
                >
                  <MenuItem value="Active">🟣 Active</MenuItem>
                  <MenuItem value="Signed">🟢 Signed</MenuItem>
                  <MenuItem value="Pending Review">🟡 Pending Review</MenuItem>
                  <MenuItem value="Expired">🔴 Expired</MenuItem>
                  <MenuItem value="Archived">⚫ Archived</MenuItem>
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setRenameDialogOpen(false); setActiveItem(null); }}>Cancel</Button>
            <Button type="submit" variant="contained">Rename</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setActiveItem(null); }}>
        <DialogTitle>Move to Recycle Bin?</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to move this {activeItem?.type} to the Recycle Bin?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setActiveItem(null); }}>Cancel</Button>
          <Button onClick={handleDeleteSubmit} color="error" variant="contained">Move to Recycle Bin</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
        <DialogTitle>Move Selected Folders to Recycle Bin?</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to move the <strong>{selectedFolderIds.length}</strong> selected folders to the Recycle Bin?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkDeleteSubmit} color="error" variant="contained">Move All to Recycle Bin</Button>
        </DialogActions>
      </Dialog>

      {/* Folder Audit & Activity Dialog */}
      <Dialog 
        open={auditDialogOpen} 
        onClose={() => setAuditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '24px', p: 1 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon color="primary" /> Directory Activity & Ownership Registry
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '70vh' }}>
          {auditLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : !auditData ? (
            <Typography color="text.secondary">No insights available.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
              {/* Parent Folder Info */}
              <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px', bgcolor: 'action.hover' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Parent Folder Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Folder Name</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{auditData.folder.name}</Typography>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Creator / Owner</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {auditData.folder.created_by}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Created Date</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date(auditData.folder.created_at).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Created Time</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date(auditData.folder.created_at).toLocaleTimeString()}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Last Updated Date</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date(auditData.folder.updated_at).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">Last Updated Time</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date(auditData.folder.updated_at).toLocaleTimeString()}
                    </Typography>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip label={auditData.folder.status} size="small" color="primary" sx={{ fontWeight: 700, mt: 0.5 }} />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">Expiry Date</Typography>
                    {isEditingExpiry ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <TextField
                          type="date"
                          size="small"
                          value={editExpiryDate}
                          onChange={(e) => setEditExpiryDate(e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 150 }}
                        />
                        <IconButton 
                          size="small" 
                          color="success" 
                          onClick={handleSaveExpiry}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => setIsEditingExpiry(false)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'error.main' }}>
                          {auditData.folder.expiry_date ? new Date(auditData.folder.expiry_date).toLocaleDateString() : 'None Set'}
                        </Typography>
                        {(user?.name === auditData.folder.created_by || user?.role?.name === 'Super Admin' || user?.role?.name === 'Admin') && (
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={handleStartEditExpiry}
                            sx={{ p: 0.5 }}
                          >
                            <EditIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                          </IconButton>
                        )}
                      </Box>
                    )}
                  </Grid>
                  <Grid xs={12}>
                    <Typography variant="body2" color="text.secondary">Summary</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                      {auditData.folder.summary || 'No summary description provided.'}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>

              {/* Folder Activity Logs Timeline */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <TimelineIcon sx={{ fontSize: 18 }} /> Folder Activity Logs ({folderActivities.length})
                </Typography>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: '16px', bgcolor: 'background.paper' }}>
                  <Box sx={{ position: 'relative', pl: 1 }}>
                    {folderActivities.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No folder activity recorded yet.</Typography>
                    ) : (
                      folderActivities.map((log, idx) => (
                        <Box 
                          key={log.id} 
                          sx={{ 
                            position: 'relative', 
                            mb: idx < folderActivities.length - 1 ? 2.5 : 0, 
                            pl: 3, 
                            borderLeft: idx < folderActivities.length - 1 ? '2px solid' : 'none', 
                            borderLeftColor: 'divider' 
                          }}
                        >
                          <Box sx={{
                            position: 'absolute', 
                            left: -5, 
                            top: 2, 
                            width: 8, 
                            height: 8,
                            borderRadius: '50%', 
                            bgcolor: 'primary.main'
                          }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                            {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 600, mt: 0.5 }}>
                            {log.action}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            By: {log.user ? `${log.user.name} (${log.user.email})` : 'System'}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                </Card>
              </Box>

              {/* Subfolder Ownership Registry */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 800, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Subfolders & Nested Directories ({auditData.subfolders.length})
                </Typography>
                {auditData.subfolders.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>No subfolders found inside this directory tree.</Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Folder Path / Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Created Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Created Time</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {auditData.subfolders.map((sub) => (
                          <TableRow key={sub.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <FolderIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                <Box>
                                  {sub.path.length > 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                      {sub.path.map(p => p.name).join(' / ')}
                                    </Typography>
                                  )}
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{sub.name}</Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{sub.created_by}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{new Date(sub.created_at).toLocaleDateString()}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{new Date(sub.created_at).toLocaleTimeString()}</Typography></TableCell>
                            <TableCell><Chip label={sub.status} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              {/* File Tracking Registry */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 800, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Files Activity & Upload Log ({auditData.files.length})
                </Typography>
                {auditData.files.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>No files uploaded inside this directory tree.</Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>File Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Folder Location</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Uploaded By</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Upload Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Upload Time</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Last Updated Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Last Updated Time</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="center">Version</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {auditData.files.map((f) => (
                          <TableRow key={f.id} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{f.name}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <FolderIcon sx={{ fontSize: 16, color: 'action.active' }} />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{f.folder_name}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{f.uploaded_by}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{new Date(f.created_at).toLocaleDateString()}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{new Date(f.created_at).toLocaleTimeString()}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{new Date(f.updated_at).toLocaleDateString()}</Typography></TableCell>
                            <TableCell><Typography variant="body2">{new Date(f.updated_at).toLocaleTimeString()}</Typography></TableCell>
                            <TableCell align="center"><Chip label={`v${f.version_number}`} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuditDialogOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Folder Action Loading Popup Dialog */}
      <Dialog
        open={Boolean(actionLoadingMessage)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '24px', p: 3, textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' } }
        }}
      >
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
          <Box sx={{ 
            width: '100%', 
            mb: 2.5, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            borderRadius: '20px', 
            overflow: 'hidden',
            bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : (actionLoadingMessage.toLowerCase().includes('delet') ? 'rgba(239, 68, 68, 0.06)' : 'rgba(79, 70, 229, 0.05)'),
            border: '1px solid rgba(0,0,0,0.04)',
            height: '130px'
          }}>
            <LottieAnimation 
              type={actionLoadingMessage.toLowerCase().includes('delet') ? 'delete' : 'loading'} 
              size={84} 
            />
          </Box>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 800, 
              mb: 1.5, 
              color: actionLoadingMessage.toLowerCase().includes('delet') ? 'error.main' : 'primary.main' 
            }}
          >
            {actionLoadingMessage}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: 2, lineHeight: 1.6 }}>
            {actionLoadingMessage.toLowerCase().includes('delet') 
              ? 'Please wait while the directory and its contents are safely removed.' 
              : 'Please wait while the system updates your folders...'}
          </Typography>
          <Box sx={{ width: '100%', mt: 1 }}>
            <LinearProgress 
              color={actionLoadingMessage.toLowerCase().includes('delet') ? 'error' : 'primary'} 
              sx={{ borderRadius: '4px', height: '6px' }}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Folder Share Settings (Access settings) */}
      <Dialog open={accessDialogOpen} onClose={() => { setAccessDialogOpen(false); setActiveItem(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Share Settings: {activeItem?.data?.name}</DialogTitle>
        <DialogContent dividers>
          {/* Grant Form */}
          <form onSubmit={handleGrantAccessSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <Typography variant="subtitle2" color="text.secondary">GRANT NEW ACCESS RULE</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Autocomplete
                options={allUsers}
                getOptionLabel={(u) => `${u.name} (${u.email})`}
                value={selectedUserForAccess}
                onChange={(e, val) => setSelectedUserForAccess(val)}
                renderInput={(params) => <TextField {...params} label="Select User" size="small" />}
                sx={{ flexGrow: 1 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Permission</InputLabel>
                <Select
                  value={accessPermissionLevel}
                  label="Permission"
                  onChange={(e) => setAccessPermissionLevel(e.target.value)}
                >
                  <MenuItem value="view">Can view</MenuItem>
                  <MenuItem value="edit">Can edit</MenuItem>
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" disabled={!selectedUserForAccess}>Apply</Button>
            </Box>
          </form>

          <Divider sx={{ my: 3 }} />

          {/* Invite via Link Section */}
          <Box sx={{ mb: 4, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              INVITE VIA LINK
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Share this link with others to invite them to this {activeItem?.type || 'item'}.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={
                  activeItem?.type === 'file' && activeItem?.data?.web_view_link
                    ? activeItem.data.web_view_link
                    : `${window.location.origin}/explorer?folder=${activeItem?.data?.id}`
                }
                slotProps={{
                  input: {
                    readOnly: true,
                    sx: { fontFamily: 'monospace', fontSize: '0.8rem' }
                  }
                }}
              />
              <Button 
                variant="outlined" 
                onClick={() => {
                  const url = activeItem?.type === 'file' && activeItem?.data?.web_view_link
                    ? activeItem.data.web_view_link
                    : `${window.location.origin}/explorer?folder=${activeItem?.data?.id}`;
                  navigator.clipboard.writeText(url);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                sx={{ minWidth: 100 }}
              >
                {linkCopied ? "Copied!" : "Copy"}
              </Button>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Rule list */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>ACTIVE FOLDER PERMISSIONS</Typography>
          {accessList.length > 0 ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Access</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accessList.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.user.name}</TableCell>
                    <TableCell>{rule.user.email}</TableCell>
                    <TableCell align="right">
                      <Select
                        value={rule.can_upload ? 'edit' : 'view'}
                        size="small"
                        onChange={(e) => handlePermissionChange(rule.user.id, e.target.value)}
                        sx={{ minWidth: 120, height: 32, fontSize: '0.85rem' }}
                      >
                        <MenuItem value="view">Can view</MenuItem>
                        <MenuItem value="edit">Can edit</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleRevokeAccess(rule.user.id)}
                        title="Revoke access rule"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No explicit folder permissions defined. Access falls back to defaults.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAccessDialogOpen(false); setActiveItem(null); }}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Move Folder to Module Dialog */}
      <Dialog open={moveModuleDialogOpen} onClose={() => setMoveModuleDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DriveFileMoveIcon sx={{ color: 'primary.main' }} />
          Move Folder to Module
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Select the destination repository module where you want to transfer <strong>"{moveFolderTargetItem?.name}"</strong>:
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="destination-module-label">Destination Repository</InputLabel>
            <Select
              labelId="destination-module-label"
              value={targetModuleId}
              label="Destination Repository"
              onChange={(e) => setTargetModuleId(e.target.value)}
            >
              <MenuItem value="mou_repository">
                📁 MOU Repositories
              </MenuItem>
              {moduleOptions.map((mod) => (
                <MenuItem key={mod.id} value={String(mod.id)}>
                  📁 {mod.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMoveModuleDialogOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmMoveModule}
            disabled={movingLoading}
            startIcon={<DriveFileMoveIcon />}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800 }}
          >
            {movingLoading ? 'Moving...' : 'Move Folder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Folder Import Directory Tree Dialog */}
      <Dialog
        open={folderImportModalOpen}
        onClose={() => !folderImportLoading && setFolderImportModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderIcon sx={{ color: 'secondary.main' }} />
          Import Directory Tree
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You are about to import a folder structure into <strong>{currentFolder ? currentFolder.name : 'Root Directory'}</strong>.
          </Typography>

          {/* Drag and Drop Zone */}
          <Box
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleFolderDrop}
            onClick={handleTriggerFolderImportInput}
            sx={{
              p: 3,
              mb: 2.5,
              border: '2px dashed',
              borderColor: 'secondary.main',
              borderRadius: '14px',
              bgcolor: 'action.hover',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: 'action.selected', transform: 'scale(1.005)' }
            }}
          >
            <FolderIcon sx={{ fontSize: 42, color: 'secondary.main', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Click to select a Folder or Drag &amp; Drop a Folder here
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Selects the complete folder directory and all subfolders automatically
            </Typography>
          </Box>

          {folderImportFiles.length > 0 && (
            <>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '12px', mb: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5 }}>
                  Directory Summary:
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  • <strong>Root Folder:</strong> {folderImportFiles[0]?.webkitRelativePath?.split('/')[0] || 'Selected Folder'}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  • <strong>Total Files:</strong> {folderImportFiles.length}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  • <strong>Total Size:</strong> {(folderImportFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB
                </Typography>
              </Box>

              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                File Structure Preview (First 8 files):
              </Typography>
              <Box sx={{ maxHeight: 180, overflowY: 'auto', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper' }}>
                {folderImportFiles.slice(0, 8).map((f, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.78rem', py: 0.3 }} noWrap>
                    📄 {f.webkitRelativePath || f.name}
                  </Typography>
                ))}
                {folderImportFiles.length > 8 && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', pt: 1, display: 'block' }}>
                    ... and {folderImportFiles.length - 8} more files.
                  </Typography>
                )}
              </Box>
            </>
          )}

          {folderImportLoading && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="caption" color="primary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                Uploading folder tree structure &amp; creating files...
              </Typography>
              <LinearProgress color="secondary" />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFolderImportModalOpen(false)} disabled={folderImportLoading} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleFolderImportSubmit}
            disabled={folderImportLoading}
            startIcon={<UploadFileIcon />}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800 }}
          >
            {folderImportLoading ? 'Importing Folder...' : `Import ${folderImportFiles.length} Files`}
          </Button>
        </DialogActions>
      </Dialog>



      {/* Actions Options Menu for understandable controls */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        slotProps={{ paper: { sx: { minWidth: 180, borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } } }}
      >
        {activeItem?.type === 'folder' ? (
          <>
            {hasPermission('rename_folder') && (
              <MenuItem onClick={() => { triggerRename(activeItem.data, 'folder'); handleMenuClose(); }}>
                <ListItemIcon><DriveFileRenameOutlineIcon fontSize="small" /></ListItemIcon>
                Rename Folder
              </MenuItem>
            )}
            {hasPermission('rename_folder') && (
              activeItem?.data?.status === 'Archived' ? (
                <MenuItem onClick={() => { handleUnarchiveFolder(activeItem.data); handleMenuClose(); }}>
                  <ListItemIcon><UnarchiveIcon fontSize="small" /></ListItemIcon>
                  Remove Archive
                </MenuItem>
              ) : (
                <MenuItem onClick={() => { handleArchiveFolder(activeItem.data); handleMenuClose(); }}>
                  <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
                  Archive Folder
                </MenuItem>
              )
            )}
            {(hasPermission('manage_users') || activeItem?.data?.created_by?.id === user?.id) && (
              <MenuItem onClick={() => { triggerAccess(activeItem.data); handleMenuClose(); }}>
                <ListItemIcon><GroupAddIcon fontSize="small" /></ListItemIcon>
                Share Settings
              </MenuItem>
            )}
            {hasPermission('rename_folder') && (
              <MenuItem onClick={() => { handleOpenMoveModal(activeItem.data); handleMenuClose(); }}>
                <ListItemIcon><DriveFileMoveIcon fontSize="small" sx={{ color: 'primary.main' }} /></ListItemIcon>
                Move to Module / Repository
              </MenuItem>
            )}
            <MenuItem onClick={() => { handleOpenAudit(activeItem.data.id); }}>
              <ListItemIcon><InfoIcon fontSize="small" /></ListItemIcon>
              Folder View Option
            </MenuItem>

            {hasPermission('delete_folder') && (
              <MenuItem onClick={() => { triggerDelete(activeItem.data, 'folder'); handleMenuClose(); }} sx={{ color: 'error.main' }}>
                <ListItemIcon><DeleteOutlinedIcon fontSize="small" color="error" /></ListItemIcon>
                Move to Recycle Bin
              </MenuItem>
            )}
          </>
        ) : (
          <>
            {hasPermission('download_files') && (
              <MenuItem onClick={() => { triggerDownload(activeItem.data); handleMenuClose(); }}>
                <ListItemIcon><CloudDownloadIcon fontSize="small" /></ListItemIcon>
                Download File
              </MenuItem>
            )}
            {hasPermission('replace_files') && (
              <MenuItem onClick={() => { triggerRename(activeItem.data, 'file'); handleMenuClose(); }}>
                <ListItemIcon><DriveFileRenameOutlineIcon fontSize="small" /></ListItemIcon>
                Rename File
              </MenuItem>
            )}
            {hasPermission('delete_files') && (
              <MenuItem onClick={() => { triggerDelete(activeItem.data, 'file'); handleMenuClose(); }} sx={{ color: 'error.main' }}>
                <ListItemIcon><DeleteOutlinedIcon fontSize="small" color="error" /></ListItemIcon>
                Move to Recycle Bin
              </MenuItem>
            )}
          </>
        )}
      </Menu>

      {/* File Preview Overlay Modal */}
      <FilePreviewModal
        open={Boolean(previewFile)}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        onRefresh={fetchContents}
      />

      {/* Reusable Modern Google Drive Folder Picker Modal */}
      <GoogleDrivePickerModal
        open={driveBrowserOpen}
        onClose={() => setDriveBrowserOpen(false)}
        onSelectFolder={handleExecuteDriveImport}
        title="Select Folder from Google Drive to Import"
        actionLabel="Import Folder into Repository"
      />
    </Box>

  );
};

export default FolderExplorer;
