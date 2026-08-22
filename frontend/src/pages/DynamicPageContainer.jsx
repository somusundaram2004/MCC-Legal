import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Grid, Card, Typography, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, TextField, Chip, Divider, Avatar, Breadcrumbs, Link,
  FormControl, InputLabel, Select, MenuItem, Tooltip, ToggleButtonGroup, ToggleButton,
  TablePagination, Skeleton, Alert
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import ShareIcon from '@mui/icons-material/Share';
import GavelIcon from '@mui/icons-material/Gavel';
import SchoolIcon from '@mui/icons-material/School';
import ScienceIcon from '@mui/icons-material/Science';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloudIcon from '@mui/icons-material/Cloud';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import api from '../services/api';
import FilePreviewModal from '../components/FilePreviewModal';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';
import FolderExplorer from './FolderExplorer';

const getModuleIcon = (iconName) => {
  switch (iconName) {
    case 'Gavel': return <GavelIcon />;
    case 'School': return <SchoolIcon />;
    case 'Science': return <ScienceIcon />;
    case 'BusinessCenter': return <BusinessCenterIcon />;
    case 'People': return <PeopleIcon />;
    case 'Security': return <SecurityIcon />;
    case 'Assignment': return <AssignmentIcon />;
    default: return <FolderIcon />;
  }
};

const DynamicPageContainer = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [pageConfig, setPageConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Controls state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [previewFile, setPreviewFile] = useState(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);

  const [pageFoundInApi, setPageFoundInApi] = useState(false);

  const fetchPageConfig = useCallback(async () => {
    setLoadingConfig(true);
    setError(null);
    try {
      const res = await api.get('/api/users/custom-pages/');
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const found = rawList.find(p => 
        p.slug === slug || 
        p.slug?.toLowerCase() === slug?.toLowerCase() ||
        p.route?.includes(slug)
      );
      if (found) {
        setPageConfig(found);
        setPageFoundInApi(true);
      } else {
        setPageConfig({
          title: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          slug: slug,
          icon: 'Folder',
          page_type: 'Folder Repository',
          description: `Dynamic repository for ${slug.replace(/-/g, ' ')}.`,
          crud_permissions: { create: true, read: true, upload: true, download: true, preview: true, share: true }
        });
        setPageFoundInApi(false);
      }
    } catch (err) {
      console.error('Failed to load page config:', err);
      setError('Failed to load module configuration.');
    } finally {
      setLoadingConfig(false);
    }
  }, [slug]);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    setError(null);
    try {
      let res;
      if (pageConfig?.root_folder_id) {
        res = await api.get(`/api/folders/${pageConfig.root_folder_id}/`);
      } else {
        res = await api.get('/api/folders/root/');
      }
      const subfolders = Array.isArray(res.data?.subfolders) ? res.data.subfolders : [];
      const files = Array.isArray(res.data?.files) ? res.data.files : (Array.isArray(res.data) ? res.data : []);
      setItems([...subfolders, ...files]);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setError('Unable to fetch repository contents.');
    } finally {
      setLoadingItems(false);
    }
  }, [pageConfig]);

  useEffect(() => {
    fetchPageConfig();
  }, [fetchPageConfig]);

  useEffect(() => {
    if (pageConfig) {
      fetchItems();
    }
  }, [pageConfig, fetchItems]);

  useAutoRefresh([REFRESH_CATEGORIES.FOLDERS, REFRESH_CATEGORIES.FILES], fetchItems);

  // Permission Enforcement Check
  const { user } = useAuth();
  const userRole = user?.role?.name || 'User';
  const userId = String(user?.id);

  const isAllowed = React.useMemo(() => {
    if (!pageConfig) return true;
    if (userRole === 'Super Admin' || userRole === 'Admin') return true;
    return pageFoundInApi;
  }, [pageConfig, userRole, pageFoundInApi]);

  if (loadingConfig) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: '20px', mb: 3 }} />
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map(i => (
            <Grid xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={100} sx={{ borderRadius: '16px' }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!isAllowed) {
    return (
      <Paper sx={{ p: 5, textAlign: 'center', borderRadius: '20px', border: '1px solid', borderColor: 'divider', mt: 4 }}>
        <SecurityIcon sx={{ fontSize: 54, color: 'error.main', mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Access Restricted</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          You do not have permission to view the <strong>{pageConfig?.title}</strong> module.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>Return to Dashboard</Button>
      </Paper>
    );
  }

  // Filter items logic
  const filteredItems = items.filter(i => {
    const matchesSearch = (i.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
    const matchesDept = departmentFilter === 'All' || i.department_name === departmentFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const paginatedItems = filteredItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const uniqueDepartments = Array.from(new Set(items.map(i => i.department_name).filter(Boolean)));

  if (pageConfig?.page_type === 'Folder Repository' || pageConfig?.page_type === 'Document Repository') {
    return <FolderExplorer rootFolderId={pageConfig.root_folder_id} customPageId={pageConfig.id} />;
  }

  return (
    <Box sx={{ width: '100%' }} className="animate-fade-slide-up">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link color="inherit" underline="hover" onClick={() => navigate('/')} sx={{ cursor: 'pointer', fontSize: '0.85rem' }}>
          Dashboard
        </Link>
        <Link color="inherit" underline="hover" onClick={() => navigate('/explorer')} sx={{ cursor: 'pointer', fontSize: '0.85rem' }}>
          Repositories
        </Link>
        <Typography color="text.primary" sx={{ fontSize: '0.85rem', fontWeight: 700 }}>
          {pageConfig?.title}
        </Typography>
      </Breadcrumbs>

      {/* Header Banner - MOU Repository Theme Style */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 }, mb: 3, borderRadius: '20px',
          bgcolor: 'background.paper',
          border: '1px solid', borderColor: 'divider',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', color: '#fff', width: 56, height: 56, borderRadius: '16px', boxShadow: '0 8px 20px rgba(59,130,246,0.25)' }}>
            {getModuleIcon(pageConfig?.icon)}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
              <Chip label={pageConfig?.page_type || 'Repository'} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '0.7rem' }} />
              {pageConfig?.badge && <Chip label={pageConfig.badge} size="small" sx={{ bgcolor: pageConfig.badge_color || '#3B82F6', color: '#fff', fontWeight: 800, fontSize: '0.68rem' }} />}
              {pageConfig?.google_drive_folder_id && (
                <Chip
                  icon={<CloudIcon style={{ fontSize: '0.9rem' }} />}
                  label={`Drive: ${pageConfig.google_drive_folder_id.substring(0, 8)}...`}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                />
              )}
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.02em', color: 'text.primary' }}>
              {pageConfig?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem', mt: 0.25 }}>
              {pageConfig?.description || 'Enterprise document repository and dynamic data hub.'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={fetchItems}
            startIcon={<RefreshIcon />}
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            Refresh
          </Button>
          {pageConfig?.crud_permissions?.upload !== false && (
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={() => navigate('/explorer')}
              sx={{ borderRadius: '12px', fontWeight: 800, px: 2.5 }}
            >
              Upload Document
            </Button>
          )}
        </Box>
      </Paper>

      {/* Module Statistics Bar - 4 Card Row */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { title: 'TOTAL REPOSITORIES', count: items.length, icon: <FolderSpecialIcon />, color: '#3B82F6', label: 'Assigned folders' },
          { title: 'FILTERED ITEMS', count: filteredItems.length, icon: <CheckCircleIcon />, color: '#10B981', label: 'Matching current criteria' },
          { title: 'DEPARTMENTS SCOPE', count: uniqueDepartments.length || 1, icon: <PeopleIcon />, color: '#8B5CF6', label: 'Access permissions' },
          { title: 'STORAGE MODE', count: pageConfig?.google_drive_folder_id ? 'Google Drive' : 'Local Storage', isString: true, icon: <CloudIcon />, color: '#F59E0B', label: 'Primary cloud destination' },
        ].map(stat => (
          <Grid xs={12} sm={6} md={3} key={stat.title}>
            <Card sx={{ p: 2.5, borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                    {stat.title}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: stat.color, mt: 0.5 }}>
                    {stat.count}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${stat.color}15`, color: stat.color, width: 42, height: 42, borderRadius: '12px' }}>
                  {stat.icon}
                </Avatar>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.2, fontWeight: 600 }}>
                {stat.label}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

      {/* Filter & Controls Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: '16px', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        <TextField
          placeholder={`Search in ${pageConfig?.title}...`}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          size="small"
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} /> } }}
          sx={{ minWidth: 260, flexGrow: 1 }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Signed">Signed</MenuItem>
            <MenuItem value="Pending Review">Pending Review</MenuItem>
            <MenuItem value="Expired">Expired</MenuItem>
          </Select>
        </FormControl>

        {uniqueDepartments.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Department</InputLabel>
            <Select value={departmentFilter} label="Department" onChange={(e) => { setDepartmentFilter(e.target.value); setPage(0); }}>
              <MenuItem value="All">All Departments</MenuItem>
              {uniqueDepartments.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, val) => val && setViewMode(val)}
          size="small"
          sx={{ bgcolor: 'action.hover', borderRadius: '10px' }}
        >
          <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Content Rendering: Grid vs List View */}
      {loadingItems ? (
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={130} sx={{ borderRadius: '16px' }} />
            </Grid>
          ))}
        </Grid>
      ) : filteredItems.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: '16px', bgcolor: 'action.hover' }}>
          <FolderIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>No Repositories Found</Typography>
          <Typography variant="body2" color="text.secondary">
            No matching repository folders found in {pageConfig?.title}.
          </Typography>
        </Paper>
      ) : viewMode === 'grid' ? (
        <Grid container spacing={2.5}>
          {paginatedItems.map((item) => (
            <Grid xs={12} sm={6} md={4} key={item.id}>
              <Card
                sx={{
                  p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider',
                  cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: 'none',
                  '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }} onClick={() => navigate(`/explorer?folder=${item.id}`)}>
                    <Avatar sx={{ bgcolor: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', width: 44, height: 44, borderRadius: '12px' }}>
                      <FolderIcon />
                    </Avatar>
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.status || 'Active Repository'}
                      </Typography>
                    </Box>
                  </Box>

                  {pageConfig?.crud_permissions?.share !== false && (
                    <Tooltip title="Share Repository">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/explorer?folder=${item.id}&action=share`); }}>
                        <ShareIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Access: {item.department_name || 'All Staff'}
                  </Typography>
                  <Chip
                    label="Explore"
                    size="small"
                    onClick={() => navigate(`/explorer?folder=${item.id}`)}
                    sx={{ fontWeight: 800, fontSize: '0.68rem', height: 20, bgcolor: 'primary.main', color: '#fff' }}
                  />
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Repository Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Department Scope</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedItems.map((item) => (
                <TableRow key={item.id} hover onClick={() => navigate(`/explorer?folder=${item.id}`)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <FolderIcon color="primary" fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{item.department_name || 'All Staff'}</TableCell>
                  <TableCell><Chip label={item.status || 'Active'} size="small" sx={{ fontSize: '0.65rem', fontWeight: 800 }} /></TableCell>
                  <TableCell align="right">
                    <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); navigate(`/explorer?folder=${item.id}`); }}>
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination Bar */}
      {filteredItems.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <TablePagination
            component="div"
            count={filteredItems.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[6, 12, 24, 48]}
          />
        </Box>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        open={Boolean(previewFile)}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </Box>
  );
};

export default DynamicPageContainer;
