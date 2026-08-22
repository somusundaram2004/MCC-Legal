import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Chip, Avatar, 
  CircularProgress, Alert, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import FolderIcon from '@mui/icons-material/Folder';

import api from '../services/api';
import EmptyState from '../components/EmptyState';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';

const SharedWithMe = () => {
  const navigate = useNavigate();
  const [sharedFoldersList, setSharedFoldersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const foldersResponse = await api.get('/api/folders/shared/');
      setSharedFoldersList(foldersResponse.data);
    } catch (err) {
      console.error('Failed to load shared folders:', err);
      setError('Could not retrieve sharing workspace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useAutoRefresh([REFRESH_CATEGORIES.FOLDERS, REFRESH_CATEGORIES.ALL], fetchData);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }} className="animate-fade-slide-up">
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: 'rgba(var(--indigo-rgb), 0.12)', color: 'primary.main', width: 48, height: 48, borderRadius: '16px' }}>
          <ShareIcon />
        </Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Shared With Me
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Access folders and repository directories shared with you.
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

      {sharedFoldersList.length === 0 ? (
        <EmptyState
          illustration="folder"
          title="No Shared Folders"
          description="No custom repository folders have been shared with you yet."
        />
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Folder Name</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Owner / Creator</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Last Modified</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sharedFoldersList.map((folder) => (
                <TableRow key={folder.id} hover>
                  <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                    <FolderIcon sx={{ color: 'var(--indigo)', fontSize: 24 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{folder.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{folder.created_by?.name || 'System Admin'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{new Date(folder.updated_at).toLocaleDateString()}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={folder.status || 'Active'} color="primary" size="small" sx={{ fontWeight: 700, borderRadius: '8px' }} />
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      size="small" 
                      variant="contained" 
                      onClick={() => {
                        if (folder.custom_page_slug) {
                          navigate(`/custom-page/${folder.custom_page_slug}?folder=${folder.id}`);
                        } else if (folder.custom_page_id) {
                          navigate(`/custom-page/${folder.custom_page_id}?folder=${folder.id}`);
                        } else {
                          navigate(`/explorer?folder=${folder.id}`);
                        }
                      }}
                      sx={{ borderRadius: '8px', fontWeight: 700, background: 'linear-gradient(135deg, var(--indigo), var(--violet))' }}
                    >
                      Open Folder
                    </Button>

                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default SharedWithMe;
