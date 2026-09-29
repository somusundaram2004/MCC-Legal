import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, Button, Switch,
  FormControl, Select, MenuItem, Alert, Grid, Tooltip
} from '@mui/material';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_SHORTCUTS, getStoredShortcuts, saveStoredShortcuts } from '../utils/keyboardShortcuts';
import customToast from '../utils/customToast';

const AVAILABLE_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

const KeyboardShortcutsTab = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.name === 'Super Admin';
  const [shortcuts, setShortcuts] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setShortcuts(getStoredShortcuts());
  }, []);

  const handleKeyChange = (id, newKey) => {
    if (!isSuperAdmin) return;
    setShortcuts(prev =>
      prev.map(item => (item.id === id ? { ...item, key: newKey } : item))
    );
    setHasChanges(true);
  };

  const handleToggleEnable = (id, newStatus) => {
    if (!isSuperAdmin) return;
    setShortcuts(prev =>
      prev.map(item => (item.id === id ? { ...item, enabled: newStatus } : item))
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!isSuperAdmin) return;
    saveStoredShortcuts(shortcuts);
    setHasChanges(false);
    customToast.success('Keyboard shortcuts updated successfully!');
  };

  const handleReset = () => {
    if (!isSuperAdmin) return;
    setShortcuts(DEFAULT_SHORTCUTS);
    saveStoredShortcuts(DEFAULT_SHORTCUTS);
    setHasChanges(false);
    customToast.success('Shortcuts reset to default settings.');
  };

  return (
    <Box>
      <Card sx={{ borderRadius: '20px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <KeyboardIcon color="primary" sx={{ fontSize: '2rem' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Sidebar Keyboard Shortcuts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure global keyboard hotkeys for instant sidebar navigation across the system.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {isSuperAdmin ? (
                <>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<RestartAltIcon />}
                    onClick={handleReset}
                    sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                  >
                    Reset Defaults
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={!hasChanges}
                    onClick={handleSave}
                    sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 800 }}
                  >
                    Save Shortcuts
                  </Button>
                </>
              ) : (
                <Chip
                  icon={<AdminPanelSettingsIcon />}
                  label="Super Admin Configurable"
                  variant="outlined"
                  color="primary"
                  size="small"
                />
              )}
            </Box>
          </Box>

          <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ borderRadius: '12px', mb: 3 }}>
            Press <strong>Ctrl + [Key]</strong> (or <strong>Cmd + [Key]</strong> on macOS) from anywhere in the application to instantly jump to the target page. Shortcuts are disabled automatically while typing inside text fields.
          </Alert>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '14px', overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Page / Module Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Shortcut Combination</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Description & Usage</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Status</TableCell>
                  {isSuperAdmin && <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Assign Key</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {shortcuts.map((sc) => (
                  <TableRow key={sc.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {sc.name}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${sc.modifier || 'Ctrl'} + ${sc.key}`}
                        color={sc.enabled ? 'primary' : 'default'}
                        variant={sc.enabled ? 'contained' : 'outlined'}
                        size="small"
                        sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.85rem', px: 0.5 }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      {sc.description}
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={sc.enabled}
                        disabled={!isSuperAdmin}
                        onChange={(e) => handleToggleEnable(sc.id, e.target.checked)}
                        size="small"
                      />
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell align="right">
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={sc.key}
                            onChange={(e) => handleKeyChange(sc.id, e.target.value)}
                            disabled={!sc.enabled}
                            sx={{ borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}
                          >
                            {AVAILABLE_KEYS.map((k) => (
                              <MenuItem key={k} value={k} sx={{ fontWeight: 700 }}>
                                Ctrl + {k}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default KeyboardShortcutsTab;
