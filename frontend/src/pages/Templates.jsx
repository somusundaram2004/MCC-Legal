import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, Typography, Grid, Button, TextField, MenuItem, Select,
  FormControl, InputLabel, Alert, CircularProgress, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, ToggleButtonGroup,
  ToggleButton, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  OutlinedInput, InputAdornment, Accordion, AccordionSummary, AccordionDetails,
  Divider, IconButton
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridViewIcon from '@mui/icons-material/GridView';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ExtensionIcon from '@mui/icons-material/Extension';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import StorageIcon from '@mui/icons-material/Storage';
import TimelineIcon from '@mui/icons-material/Timeline';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';

import {
  getTemplateCollections, createTemplateCollection, getTemplateStats,
  getMasterCategories, getMasterOrgTypes, getMasterCollabTypes, getMasterDocTypes,
  getMasterTags, getMasterDeptCategories, getMasterDepartments, getMasterStreams
} from '../services/templateApi';

const Templates = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState({
    total_templates: 0, total_pdfs: 0, total_categories: 0, storage_usage_mb: 0,
    category_distribution: [], department_distribution: []
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('folder'); // 'folder', 'grid', 'list'
  
  // Dynamic Masters
  const [categories, setCategories] = useState([]);
  const [orgTypes, setOrgTypes] = useState([]);
  const [collabTypes, setCollabTypes] = useState([]);
  const [tags, setTags] = useState([]);
  const [deptCategories, setDeptCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredDepts, setFilteredDepts] = useState([]);

  // Form State
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Creation fields
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [selCategory, setSelCategory] = useState('');
  const [selOrgType, setSelOrgType] = useState('');
  const [selCollabType, setSelCollabType] = useState('');
  const [selDeptCat, setSelDeptCat] = useState('');
  const [selDept, setSelDept] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterDeptCat, setFilterDeptCat] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterOrg, setFilterOrg] = useState('');
  const [filterCollab, setFilterCollab] = useState('');
  const [sorting, setSorting] = useState('name-asc');

  // Load stats and list
  const loadStatsAndCollections = async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await getTemplateStats();
      const collectionsRes = await getTemplateCollections();
      setStats(statsRes);
      setCollections(collectionsRes);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve template library dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  const [streams, setStreams] = useState([]);

  // Load masters on mount
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const cats = await getMasterCategories();
        const orgs = await getMasterOrgTypes();
        const collabs = await getMasterCollabTypes();
        const tgs = await getMasterTags();
        const deptCats = await getMasterDeptCategories();
        const depts = await getMasterDepartments();
        const strms = await getMasterStreams().catch(() => []);
        
        setCategories(cats.filter(c => c.is_active));
        setOrgTypes(orgs.filter(o => o.is_active));
        setCollabTypes(collabs.filter(c => c.is_active));
        setTags(tgs.filter(t => t.is_active));
        setDeptCategories(deptCats.filter(d => d.is_active));
        setDepartments(depts.filter(d => d.is_active));
        setStreams(strms.filter(s => s.is_active));
      } catch (err) {
        console.error("Master tables fetch failed", err);
      }
    };
    loadMasters();
    loadStatsAndCollections();
  }, []);

  // Filter departments based on selected department category
  useEffect(() => {
    if (selDeptCat) {
      setFilteredDepts(departments.filter(d => String(d.stream) === String(selDeptCat) || String(d.stream_id) === String(selDeptCat) || String(d.category) === String(selDeptCat)));
    } else {
      setFilteredDepts(departments);
    }
  }, [selDeptCat, departments]);

  const handleOpenCreate = () => {
    setTemplateName('');
    setDescription('');
    setSelCategory('');
    setSelOrgType('');
    setSelCollabType('');
    setSelDeptCat('');
    setSelDept('');
    setSelectedTags([]);
    setError(null);
    setCreateOpen(true);
  };

  const handleCreateCollectionSubmit = async () => {
    if (!templateName || !selCategory || !selOrgType || !selCollabType || !selDeptCat || !selDept) {
      setError('Please fill in all mandatory fields.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const newColl = await createTemplateCollection({
        template_name: templateName,
        category: selCategory,
        organization_type: selOrgType,
        collaboration_type: selCollabType,
        department_category: selDeptCat,
        department: selDept,
        description: description,
        tags: selectedTags
      });
      setCreateOpen(false);
      loadStatsAndCollections();
      navigate(`/template-detail/${newColl.id}`);
    } catch (err) {
      console.error(err);
      setError('Template collection creation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Perform filtering client-side for dynamic responsive experience
  const filteredCollections = collections.filter(c => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.template_name?.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q);
      const matchTags = c.tags_details?.some(t => t.name?.toLowerCase().includes(q));
      const matchOrg = c.organization_type_name?.toLowerCase().includes(q);
      const matchCollab = c.collaboration_type_name?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchTags && !matchOrg && !matchCollab) return false;
    }
    if (filterCat && c.category !== filterCat) return false;
    if (filterDeptCat && c.department_category !== filterDeptCat) return false;
    if (filterDept && c.department !== filterDept) return false;
    if (filterOrg && c.organization_type !== filterOrg) return false;
    if (filterCollab && c.collaboration_type !== filterCollab) return false;
    return true;
  });

  // Perform sorting
  const sortedCollections = [...filteredCollections].sort((a, b) => {
    if (sorting === 'name-asc') return a.template_name.localeCompare(b.template_name);
    if (sorting === 'name-desc') return b.template_name.localeCompare(a.template_name);
    if (sorting === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sorting === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    return 0;
  });

  // Group by Categories for Folder View
  const groupedByCategory = sortedCollections.reduce((acc, current) => {
    const catName = current.category_name || 'Uncategorized';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(current);
    return acc;
  }, {});

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-slide-up">

      {/* ── Page Header ─────────────────────────────────── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(245,158,11,0.12)', color: '#F59E0B', width: 52, height: 52, borderRadius: '16px', boxShadow: '0 4px 14px rgba(245,158,11,0.2)' }}>
            <ExtensionIcon sx={{ fontSize: '1.6rem' }} />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>PDF Template Library</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
              Upload, organize, and version MOU templates by department and category
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: '24px', px: 3.5, py: 1.1, fontWeight: 700, fontSize: '0.9rem', background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 14px rgba(245,158,11,0.3)', '&:hover': { boxShadow: '0 6px 20px rgba(245,158,11,0.4)' } }}
        >
          Create Collection
        </Button>
      </Box>

      {/* ── Stats Row ────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {[
          { label: 'Collections', value: stats.total_templates, icon: <FolderIcon />, color: 'var(--indigo)', bg: 'rgba(var(--indigo-rgb), 0.08)' },
          { label: 'PDF Files', value: stats.total_pdfs, icon: <DescriptionIcon />, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Categories', value: stats.total_categories, icon: <FolderCopyIcon />, color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
          { label: 'Storage (MB)', value: stats.storage_usage_mb, icon: <StorageIcon />, color: '#0EA5E9', bg: 'rgba(14,165,233,0.08)' },
        ].map(({ label, value, icon, color, bg }) => (
          <Grid xs={6} sm={3} key={label}>
            <Card sx={{ p: 2.5, borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: `0 6px 20px ${color}22` } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: bg, color, width: 46, height: 46, borderRadius: '12px' }}>{icon}</Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.68rem' }}>{label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1, color }}>{value ?? 0}</Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Toolbar: Search + Filters + View Toggle ───────── */}
      <Card sx={{ p: 2, mb: 3, borderRadius: '18px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <TextField
            size="small"
            placeholder="Search collections…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: '1 1 200px', minWidth: 160 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: '10px' }
              }
            }}
          />

          {/* Category */}
          <FormControl size="small" sx={{ flex: '1 1 140px', minWidth: 130 }}>
            <InputLabel>Category</InputLabel>
            <Select value={filterCat} label="Category" onChange={(e) => setFilterCat(e.target.value)} sx={{ borderRadius: '10px' }}>
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Stream */}
          <FormControl size="small" sx={{ flex: '1 1 150px', minWidth: 130 }}>
            <InputLabel>Stream</InputLabel>
            <Select value={filterDeptCat} label="Stream" onChange={(e) => { setFilterDeptCat(e.target.value); setFilterDept(''); }} sx={{ borderRadius: '10px' }}>
              <MenuItem value="">All Streams</MenuItem>
              {streams.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Department */}
          <FormControl size="small" sx={{ flex: '1 1 150px', minWidth: 130 }}>
            <InputLabel>Department</InputLabel>
            <Select value={filterDept} label="Department" onChange={(e) => setFilterDept(e.target.value)} sx={{ borderRadius: '10px' }}>
              <MenuItem value="">All Departments</MenuItem>
              {departments.filter(d => !filterDeptCat || String(d.stream) === String(filterDeptCat) || String(d.category) === String(filterDeptCat)).map(d => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Org Type */}
          <FormControl size="small" sx={{ flex: '1 1 150px', minWidth: 130 }}>
            <InputLabel>Org Type</InputLabel>
            <Select value={filterOrg} label="Org Type" onChange={(e) => setFilterOrg(e.target.value)} sx={{ borderRadius: '10px' }}>
              <MenuItem value="">All Org Types</MenuItem>
              {orgTypes.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Sort */}
          <FormControl size="small" sx={{ flex: '1 1 130px', minWidth: 110 }}>
            <InputLabel>Sort</InputLabel>
            <Select value={sorting} label="Sort" onChange={(e) => setSorting(e.target.value)} sx={{ borderRadius: '10px' }}>
              <MenuItem value="name-asc">Name A→Z</MenuItem>
              <MenuItem value="name-desc">Name Z→A</MenuItem>
              <MenuItem value="newest">Newest First</MenuItem>
              <MenuItem value="oldest">Oldest First</MenuItem>
            </Select>
          </FormControl>

          {/* View Toggle */}
          <ToggleButtonGroup
            value={viewMode} exclusive
            onChange={(e, next) => next && setViewMode(next)}
            size="small"
            sx={{ ml: 'auto', bgcolor: 'background.paper', borderRadius: '10px', border: '1px solid', borderColor: 'divider', p: 0.25, flexShrink: 0 }}
          >
            <ToggleButton value="folder" sx={{ border: 'none', borderRadius: '8px !important', px: 1.2 }}><FolderIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="grid" sx={{ border: 'none', borderRadius: '8px !important', px: 1.2 }}><GridViewIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="list" sx={{ border: 'none', borderRadius: '8px !important', px: 1.2 }}><ViewListIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Active filter chips */}
        {(filterCat || filterDeptCat || filterDept || filterOrg || search) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, alignSelf: 'center', mr: 0.5 }}>Filters:</Typography>
            {search && <Chip size="small" label={`"${search}"`} onDelete={() => setSearch('')} />}
            {filterCat && <Chip size="small" label={categories.find(c => c.id === filterCat)?.name} onDelete={() => setFilterCat('')} color="primary" variant="outlined" />}
            {filterDeptCat && <Chip size="small" label={deptCategories.find(d => d.id === filterDeptCat)?.name} onDelete={() => { setFilterDeptCat(''); setFilterDept(''); }} color="secondary" variant="outlined" />}
            {filterDept && <Chip size="small" label={departments.find(d => d.id === filterDept)?.name} onDelete={() => setFilterDept('')} variant="outlined" />}
            {filterOrg && <Chip size="small" label={orgTypes.find(o => o.id === filterOrg)?.name} onDelete={() => setFilterOrg('')} color="info" variant="outlined" />}
          </Box>
        )}
      </Card>

      {/* ── Content ──────────────────────────────────────── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>
      ) : sortedCollections.length === 0 ? (
        <Card sx={{ p: 8, textAlign: 'center', borderRadius: '20px', border: '2px dashed', borderColor: 'divider', boxShadow: 'none' }}>
          <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 700 }}>No Template Collections Found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add lookup details and upload PDF documents to get started.
          </Typography>
          <Button variant="contained" onClick={handleOpenCreate} sx={{ borderRadius: '24px', px: 4, fontWeight: 700 }}>
            Create First Collection
          </Button>
        </Card>
      ) : (
        <>
          {/* ── FOLDER VIEW ─────────── */}
          {viewMode === 'folder' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {Object.entries(groupedByCategory).map(([catName, items]) => (
                <Box key={catName}>
                  {/* Category header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <FolderIcon sx={{ color: '#F59E0B', fontSize: '1.4rem' }} />
                    <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{catName}</Typography>
                    <Chip label={`${items.length} collection${items.length > 1 ? 's' : ''}`} size="small" sx={{ fontWeight: 700, bgcolor: 'rgba(245,158,11,0.1)', color: '#D97706' }} />
                  </Box>
                  <Grid container spacing={2.5}>
                    {items.map((item) => (
                      <Grid xs={12} sm={6} md={4} lg={3} key={item.id}>
                        <Card
                          onClick={() => navigate(`/template-detail/${item.id}`)}
                          sx={{
                            p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider',
                            cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5,
                            transition: 'all 0.22s ease', boxShadow: 'none',
                            '&:hover': { borderColor: 'primary.main', boxShadow: '0 6px 24px rgba(var(--indigo-rgb), 0.1)', transform: 'translateY(-2px)' }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#F59E0B', width: 38, height: 38, borderRadius: '10px', flexShrink: 0 }}>
                              <ExtensionIcon sx={{ fontSize: '1.1rem' }} />
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.3 }} noWrap>
                                {item.template_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.document_count || 0} file{item.document_count !== 1 ? 's' : ''} · {item.department_name?.replace(/\s*\(.*\)/, '')}
                              </Typography>
                            </Box>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                            {item.description || 'No description provided.'}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                            <Chip label={item.collaboration_type_name} size="small" sx={{ fontSize: '0.65rem', height: 20, fontWeight: 600 }} />
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  <Divider sx={{ mt: 3 }} />
                </Box>
              ))}
            </Box>
          )}

          {/* ── GRID VIEW ─────────── */}
          {viewMode === 'grid' && (
            <Grid container spacing={2.5}>
              {sortedCollections.map((item) => (
                <Grid xs={12} sm={6} md={4} lg={3} key={item.id}>
                  <Card
                    onClick={() => navigate(`/template-detail/${item.id}`)}
                    sx={{
                      p: 3, borderRadius: '18px', border: '1px solid', borderColor: 'divider',
                      cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5,
                      transition: 'all 0.22s ease', boxShadow: 'none',
                      '&:hover': { borderColor: 'primary.main', boxShadow: '0 8px 28px rgba(var(--indigo-rgb), 0.1)', transform: 'translateY(-3px)' }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Chip label={item.category_name} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                      <Chip label={`${item.document_count || 0} files`} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: 'rgba(16,185,129,0.08)', color: '#10B981' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '0.98rem', lineHeight: 1.3, mb: 0.5 }}>{item.template_name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.description || 'No description provided.'}
                      </Typography>
                    </Box>
                    <Divider sx={{ mt: 'auto' }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        📂 {item.department_category_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        🏛 {item.department_name?.replace(/\s*\(.*\)/, '')}
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* ── LIST VIEW ─────────── */}
          {viewMode === 'list' && (
            <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', overflow: 'hidden' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Template Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Stream</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Collab Type</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="center">Files</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedCollections.map((item) => (
                    <TableRow key={item.id} hover onClick={() => navigate(`/template-detail/${item.id}`)} sx={{ cursor: 'pointer' }}>
                      <TableCell sx={{ fontWeight: 700 }}>{item.template_name}</TableCell>
                      <TableCell><Chip label={item.category_name} size="small" color="primary" variant="outlined" /></TableCell>
                      <TableCell>{item.department_category_name}</TableCell>
                      <TableCell>{item.department_name?.replace(/\s*\(.*\)/, '')}</TableCell>
                      <TableCell>{item.collaboration_type_name}</TableCell>
                      <TableCell align="center">
                        <Chip label={item.document_count || 0} size="small" sx={{ fontWeight: 800, bgcolor: 'rgba(16,185,129,0.1)', color: '#10B981' }} />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" sx={{ borderRadius: '10px', fontSize: '0.78rem' }}>Open</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* ── Create Collection Dialog ──────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: '800px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '20px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              m: 2,
            }
          }
        }}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreateCollectionSubmit(); }} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          
          {/* ── Fixed Header ── */}
          <Box sx={{
            px: 4, py: 2.5,
            borderBottom: '1px solid #F3F4F6',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0, bgcolor: 'background.paper',
          }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Inter, system-ui, sans-serif', color: 'text.primary' }}>
                📁  Create PDF Template Collection
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontFamily: 'Inter, system-ui, sans-serif', mt: 0.3 }}>
                Set up a new template collection for automated document generation.
              </Typography>
            </Box>
            <IconButton onClick={() => setCreateOpen(false)} sx={{ color: 'text.secondary', borderRadius: '10px' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* ── Scrollable Form Body (CSS Grid) ── */}
          <Box sx={{ px: 4, py: 3.5, overflowY: 'auto', flex: 1 }}>
            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: '20px 24px',
              width: '100%',
            }}>
              {/* Template Name (Full width) */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <TextField
                  fullWidth required
                  label="Template Name"
                  placeholder="e.g. Infosys Internship MOU"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontSize: '14px',
                    }
                  }}
                />
              </Box>

              {/* Description (Full width) */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <TextField
                  fullWidth multiline rows={2}
                  label="Description"
                  placeholder="Template used for internship collaborations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontSize: '14px',
                    }
                  }}
                />
              </Box>

              {/* Template Category */}
              <Box>
                <FormControl fullWidth required>
                  <InputLabel sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}>Template Category</InputLabel>
                  <Select
                    value={selCategory}
                    label="Template Category"
                    onChange={(e) => setSelCategory(e.target.value)}
                    sx={{ borderRadius: '12px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}
                  >
                    {categories.map(c => <MenuItem key={c.id} value={c.id} sx={{ fontSize: '14px' }}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              {/* Organization Type */}
              <Box>
                <FormControl fullWidth required>
                  <InputLabel sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}>Organization Type</InputLabel>
                  <Select
                    value={selOrgType}
                    label="Organization Type"
                    onChange={(e) => setSelOrgType(e.target.value)}
                    sx={{ borderRadius: '12px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}
                  >
                    {orgTypes.map(o => <MenuItem key={o.id} value={o.id} sx={{ fontSize: '14px' }}>{o.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              {/* Collaboration Type */}
              <Box>
                <FormControl fullWidth required>
                  <InputLabel sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}>Collaboration Type</InputLabel>
                  <Select
                    value={selCollabType}
                    label="Collaboration Type"
                    onChange={(e) => setSelCollabType(e.target.value)}
                    sx={{ borderRadius: '12px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}
                  >
                    {collabTypes.map(c => <MenuItem key={c.id} value={c.id} sx={{ fontSize: '14px' }}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              {/* Stream */}
              <Box>
                <FormControl fullWidth required>
                  <InputLabel sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}>Stream</InputLabel>
                  <Select
                    value={selDeptCat}
                    label="Stream"
                    onChange={(e) => setSelDeptCat(e.target.value)}
                    sx={{ borderRadius: '12px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}
                  >
                    {streams.map(d => <MenuItem key={d.id} value={d.id} sx={{ fontSize: '14px' }}>{d.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              {/* Department */}
              <Box>
                <FormControl fullWidth required disabled={!selDeptCat}>
                  <InputLabel sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}>Department</InputLabel>
                  <Select
                    value={selDept}
                    label="Department"
                    onChange={(e) => setSelDept(e.target.value)}
                    sx={{ borderRadius: '12px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}
                  >
                    {filteredDepts.map(d => <MenuItem key={d.id} value={d.id} sx={{ fontSize: '14px' }}>{d.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              {/* Tags */}
              <Box>
                <FormControl fullWidth>
                  <InputLabel sx={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}>Tags</InputLabel>
                  <Select
                    multiple
                    value={selectedTags}
                    onChange={(e) => setSelectedTags(e.target.value)}
                    input={<OutlinedInput label="Tags" sx={{ borderRadius: '12px' }} />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((val) => {
                          const tgObj = tags.find(t => t.id === val);
                          return <Chip key={val} label={tgObj ? tgObj.name : val} size="small" sx={{ borderRadius: '6px', fontSize: '0.72rem' }} />;
                        })}
                      </Box>
                    )}
                    sx={{ borderRadius: '12px' }}
                  >
                    {tags.map((t) => (
                      <MenuItem key={t.id} value={t.id} sx={{ fontSize: '14px' }}>{t.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>

          {/* ── Fixed Footer ── */}
          <Box sx={{
            px: 4, py: 2.5,
            borderTop: '1px solid #F3F4F6',
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5,
            flexShrink: 0, bgcolor: 'background.paper',
          }}>
            <Button
              onClick={() => setCreateOpen(false)}
              variant="outlined"
              sx={{
                borderRadius: '10px', fontWeight: 600, px: 3,
                fontFamily: 'Inter, system-ui, sans-serif',
                borderColor: 'divider', color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover', borderColor: 'text.secondary' },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                borderRadius: '10px', fontWeight: 700, px: 4,
                fontFamily: 'Inter, system-ui, sans-serif',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #D97706, #B45309)',
                  boxShadow: '0 6px 20px rgba(245,158,11,0.5)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.18s ease',
              }}
            >
              {submitting ? 'Creating...' : 'Create Collection'}
            </Button>
          </Box>
        </form>
      </Dialog>
    </Box>
  );
};

export default Templates;
