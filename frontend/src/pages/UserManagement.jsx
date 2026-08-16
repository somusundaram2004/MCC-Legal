import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Box, Button, Card, Typography, Table, Avatar,
  TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, Chip, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, MenuItem, Select, FormControl, 
  InputLabel, Alert, Grid, Divider, FormControlLabel,
  Autocomplete, Tabs, Tab, Tooltip, InputAdornment
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SecurityIcon from '@mui/icons-material/Security';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import BlockIcon from '@mui/icons-material/Block';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CircularProgress from '@mui/material/CircularProgress';

import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAutoRefresh, REFRESH_CATEGORIES } from '../context/AutoRefreshContext';

// ─── Shared field styles ──────────────────────────────────────────────────────
const FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: '#fff',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    '& fieldset': { borderColor: 'rgba(0,0,0,0.23)', borderWidth: '1.5px', transition: 'border-color 0.18s' },
    '&:hover fieldset': { borderColor: '#111827' },
    '&.Mui-focused fieldset': { borderColor: 'var(--violet)', borderWidth: '2px' },
    '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(var(--violet-rgb), 0.12)' },
  },
  '& .MuiInputLabel-root': {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '14px',
    '&.Mui-focused': { color: 'var(--violet)' },
  },
  '& .MuiFormHelperText-root': { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '12px' },
};

const SELECT_SX = {
  borderRadius: '12px',
  backgroundColor: '#fff',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '14px',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.23)', borderWidth: '1.5px' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#111827' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--violet)', borderWidth: '2px' },
  '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(var(--violet-rgb), 0.12)' },
};

const LABEL_SX = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '14px',
  '&.Mui-focused': { color: 'var(--violet)' },
};

const MENU_ITEM_SX = { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' };

// ─── Custom Portal Department Select ─────────────────────────────────────────
const DepartmentSelect = ({ value, onChange, options, disabled, label = 'Department / Company', required, saveAttempted }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [touched, setTouched] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  // Reset touch state when saveAttempted resets
  useEffect(() => { if (!saveAttempted) setTouched(false); }, [saveAttempted]);

  const showSearch = options.length > 6;
  const filtered = showSearch
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const selectedLabel = options.find(o => o.value === value)?.label || '';
  const hasValue = Boolean(selectedLabel);
  const showError = (touched || saveAttempted) && required && !value;

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  const openDrop = () => {
    if (disabled) return;
    calcPos();
    setOpen(true);
    setHighlightIdx(-1);
    setSearch('');
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 40);
  };

  const closeDrop = useCallback(() => {
    setOpen(false);
    setSearch('');
    setHighlightIdx(-1);
  }, []);

  const selectOpt = (opt) => {
    onChange(opt.value);
    closeDrop();
    setTouched(true);
    triggerRef.current?.focus();
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!triggerRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
        closeDrop();
        setTouched(true);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, closeDrop]);

  // Reposition on scroll / resize
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', calcPos, true);
    window.addEventListener('resize', calcPos);
    return () => {
      window.removeEventListener('scroll', calcPos, true);
      window.removeEventListener('resize', calcPos);
    };
  }, [open, calcPos]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!listRef.current || highlightIdx < 0) return;
    const items = listRef.current.querySelectorAll('[role="option"]');
    items[highlightIdx]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  const handleTriggerKey = (e) => {
    if (disabled) return;
    if (['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); openDrop(); }
  };

  const handleDropKey = (e) => {
    if (e.key === 'Escape') { closeDrop(); triggerRef.current?.focus(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && highlightIdx >= 0) { e.preventDefault(); selectOpt(filtered[highlightIdx]); }
    if (e.key === 'Tab') { closeDrop(); }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Trigger */}
      <Box
        ref={triggerRef}
        onClick={openDrop}
        onKeyDown={handleTriggerKey}
        onBlur={(e) => { if (!dropdownRef.current?.contains(e.relatedTarget)) { if (!open) setTouched(true); } }}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={open}
        aria-controls="dept-listbox"
        aria-label={label}
        aria-required={required}
        aria-disabled={disabled}
        aria-activedescendant={highlightIdx >= 0 ? `dept-opt-${highlightIdx}` : undefined}
        sx={{
          position: 'relative',
          height: '56px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: '14px',
          border: '1.5px solid',
          borderColor: showError ? '#d32f2f' : open ? 'var(--violet)' : disabled ? 'action.disabledBackground' : 'divider',
          borderRadius: '12px',
          backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
          boxShadow: open ? '0 0 0 3px rgba(var(--violet-rgb), 0.12)' : 'none',
          userSelect: 'none',
          '&:hover': { borderColor: showError ? '#d32f2f' : open ? 'var(--violet)' : disabled ? 'action.disabledBackground' : 'text.primary' },
          '&:focus-visible': { outline: 'none', borderColor: 'var(--violet)', boxShadow: '0 0 0 3px rgba(var(--violet-rgb), 0.12)' },
        }}
      >
        {/* Floating label */}
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: '11px',
            top: (open || hasValue) ? '-9px' : '50%',
            transform: (open || hasValue) ? 'none' : 'translateY(-50%)',
            fontSize: (open || hasValue) ? '11.5px' : '14px',
            fontWeight: (open || hasValue) ? 500 : 400,
            color: showError ? '#d32f2f' : (open || hasValue) ? 'var(--violet)' : disabled ? 'text.disabled' : 'text.secondary',
            bgcolor: disabled ? 'transparent' : 'background.paper',
            px: (open || hasValue) ? '4px' : 0,
            lineHeight: 1,
            transition: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
            pointerEvents: 'none',
            zIndex: 1,
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: (open || hasValue) ? '0.02em' : 'normal',
          }}
        >
          {label}{required ? ' *' : ''}
        </Box>

        {/* Selected value text */}
        <Typography
          sx={{
            fontSize: '14px',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: disabled ? 'text.disabled' : hasValue ? 'text.primary' : 'transparent',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mt: hasValue ? '2px' : 0,
            textAlign: 'left',
          }}
        >
          {selectedLabel || '\u00A0'}
        </Typography>

        {/* Chevron */}
        <Box
          component="span"
          sx={{
            ml: 0.5,
            display: 'flex',
            alignItems: 'center',
            color: open ? 'var(--violet)' : disabled ? 'text.disabled' : 'text.secondary',
            transition: 'transform 0.2s ease, color 0.2s ease',
            transform: open ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Box>
      </Box>

      {/* Helper / Error text */}
      <Box sx={{ minHeight: '20px', mt: '3px', mx: '14px' }}>
        {showError ? (
          <Typography sx={{ fontSize: '12px', color: '#d32f2f', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Department is required.
          </Typography>
        ) : !hasValue && disabled ? (
          <Typography sx={{ fontSize: '12px', color: 'rgba(0,0,0,0.45)', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Select a stream first.
          </Typography>
        ) : null}
      </Box>

      {/* Portal Dropdown */}
      {open && createPortal(
        <Box
          ref={dropdownRef}
          id="dept-listbox"
          role="listbox"
          aria-label={label}
          onKeyDown={handleDropKey}
          sx={{
            position: 'fixed',
            top: `${dropPos.top}px`,
            left: `${dropPos.left}px`,
            width: `${dropPos.width}px`,
            zIndex: 9999,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '12px',
            boxShadow: (theme) => theme.palette.mode === 'dark' 
              ? '0 12px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)' 
              : '0 12px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '260px',
            animation: 'deptFadeIn 0.14s cubic-bezier(0.4,0,0.2,1)',
            '@keyframes deptFadeIn': {
              from: { opacity: 0, transform: 'translateY(-6px) scaleY(0.96)' },
              to: { opacity: 1, transform: 'translateY(0) scaleY(1)' },
            },
          }}
        >
          {/* Search box */}
          {showSearch && (
            <Box sx={{ p: '8px', borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0, bgcolor: 'background.paper' }}>
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: '8px',
                px: '12px', py: '7px',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px',
                bgcolor: 'action.hover',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, opacity: 0.6 }}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <Box
                  ref={searchRef}
                  component="input"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setHighlightIdx(-1); }}
                  onKeyDown={handleDropKey}
                  placeholder="Search department..."
                  sx={{
                    border: 'none', outline: 'none', background: 'transparent',
                    flex: 1, fontSize: '13px', color: 'text.primary', p: 0,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    '&::placeholder': { color: 'text.secondary' },
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Options list */}
          <Box
            ref={listRef}
            sx={{
              overflowY: 'auto',
              flex: 1,
              py: '4px',
              '&::-webkit-scrollbar': { width: '6px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { background: 'rgba(var(--indigo-rgb), 0.25)', borderRadius: '99px', '&:hover': { background: 'rgba(var(--indigo-rgb), 0.5)' } },
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(var(--indigo-rgb), 0.25) transparent',
            }}
          >
            {filtered.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '13px', color: 'text.secondary', fontFamily: 'Inter, system-ui, sans-serif' }}>
                  No departments found
                </Typography>
              </Box>
            ) : (
              filtered.map((opt, idx) => {
                const isSel = opt.value === value;
                const isHigh = idx === highlightIdx;
                return (
                  <Box
                    key={opt.value}
                    id={`dept-opt-${idx}`}
                    role="option"
                    aria-selected={isSel}
                    onClick={() => selectOpt(opt)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    sx={{
                      px: 2,
                      height: '42px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontWeight: isSel ? 600 : 400,
                      color: isSel ? 'var(--violet)' : isHigh ? 'primary.main' : 'text.primary',
                      backgroundColor: isSel 
                        ? 'rgba(var(--indigo-rgb), 0.15)' 
                        : isHigh 
                          ? 'action.hover' 
                          : 'transparent',
                      transition: 'background-color 0.1s ease, color 0.1s ease',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </span>
                    {isSel && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B3DF5" strokeWidth="2.5" style={{ flexShrink: 0, marginLeft: 8 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </Box>
                );
              })
            )}
          </Box>
        </Box>,
        document.body
      )}
    </Box>
  );
};

// ─── Main UserManagement Component ───────────────────────────────────────────
const UserManagement = () => {
  const { user, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal Dialog states
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [saveAttempted, setSaveAttempted] = useState(false);

  // User Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState('Active');

  // Dynamic Master Data states
  const [deptCategories, setDeptCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredFormDepts, setFilteredFormDepts] = useState([]);
  const [deptCategory, setDeptCategory] = useState('');

  // Filter States
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterUserType, setFilterUserType] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Password reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Delete user confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Local Toast notification
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
    setTimeout(() => setToast(prev => ({ ...prev, open: false })), 3000);
  };

  // Invitation tab states
  const [currentTab, setCurrentTab] = useState(0); // 0 = Users, 1 = Invitations
  const [invitations, setInvitations] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  
  // Invitation Modal states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteDialogMode, setInviteDialogMode] = useState('email'); // 'email' or 'link'
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStream, setInviteStream] = useState('');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [filteredInviteDepts, setFilteredInviteDepts] = useState([]);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteSuccessDialogOpen, setInviteSuccessDialogOpen] = useState(false);

  // Invitation list search & filter states
  const [invitationSearch, setInvitationSearch] = useState('');
  const [invitationFilterStream, setInvitationFilterStream] = useState('');
  const [invitationFilterDept, setInvitationFilterDept] = useState('');
  const [invitationFilterRole, setInvitationFilterRole] = useState('');
  const [invitationFilterStatus, setInvitationFilterStatus] = useState('');

  const [masterStreams, setMasterStreams] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes, permsRes, deptCatsRes, deptsRes, streamsRes] = await Promise.all([
        api.get('/api/users/').catch(err => { console.error('Failed users fetch:', err); return { data: [] }; }),
        api.get('/api/roles/').catch(err => { console.error('Failed roles fetch:', err); return { data: [] }; }),
        api.get('/api/permissions/').catch(err => { console.error('Failed perms fetch:', err); return { data: [] }; }),
        api.get('/api/mous/master/dept-categories/').catch(err => { console.error('Failed deptCats fetch:', err); return { data: [] }; }),
        api.get('/api/mous/master/departments/').catch(err => { console.error('Failed depts fetch:', err); return { data: [] }; }),
        api.get('/api/mous/master/streams/').catch(err => { console.error('Failed streams fetch:', err); return { data: [] }; }),
      ]);
      setUsers(usersRes.data || []);
      let rolesData = rolesRes.data || [];
      if (user?.role?.name === 'Admin') {
        rolesData = rolesData.filter(r => r.name !== 'Super Admin');
      }
      setRoles(rolesData);
      setAllPermissions(permsRes.data || []);
      setDeptCategories(deptCatsRes.data || []);
      setDepartments(deptsRes.data || []);
      setMasterStreams(streamsRes.data || []);
    } catch (err) {
      console.error('Failed to load user management data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Global Auto Refresh Subscription
  useAutoRefresh(REFRESH_CATEGORIES.USERS, loadData);

  // Background polling for real-time synchronization across admins
  useEffect(() => {
    const fetchUsersBackground = async () => {
      try {
        const usersRes = await api.get('/api/users/');
        setUsers(usersRes.data);
      } catch (err) {
        console.error('Background user poll failed:', err);
      }
    };

    const fetchInvitationsBackground = async () => {
      try {
        const params = {};
        if (invitationSearch) params.search = invitationSearch;
        if (invitationFilterStream) params.stream = invitationFilterStream;
        if (invitationFilterDept) params.department = invitationFilterDept;
        if (invitationFilterRole) params.role = invitationFilterRole;
        if (invitationFilterStatus) params.status = invitationFilterStatus;
        
        const res = await api.get('/api/users/invitations/', { params });
        if (res.data.results) {
          setInvitations(res.data.results);
        } else {
          setInvitations(res.data);
        }
      } catch (err) {
        console.error('Background invitations poll failed:', err);
      }
    };

    const interval = setInterval(() => {
      fetchUsersBackground();
      if (currentTab === 1) {
        fetchInvitationsBackground();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [currentTab, invitationSearch, invitationFilterStream, invitationFilterDept, invitationFilterRole, invitationFilterStatus]);

  const loadInvitations = async () => {
    setInvitationsLoading(true);
    try {
      const params = {};
      if (invitationSearch) params.search = invitationSearch;
      if (invitationFilterStream) params.stream = invitationFilterStream;
      if (invitationFilterDept) params.department = invitationFilterDept;
      if (invitationFilterRole) params.role = invitationFilterRole;
      if (invitationFilterStatus) params.status = invitationFilterStatus;
      
      const res = await api.get('/api/users/invitations/', { params });
      if (res.data.results) {
        setInvitations(res.data.results);
      } else {
        setInvitations(res.data);
      }
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    if (currentTab === 1) {
      loadInvitations();
    }
  }, [currentTab, invitationSearch, invitationFilterStream, invitationFilterDept, invitationFilterRole, invitationFilterStatus]);

  const handleInviteOpen = (mode = 'email') => {
    setInviteDialogMode(mode);
    setInviteEmail('');
    setInviteStream('');
    setInviteDept('');
    setInviteRole('');
    setFilteredInviteDepts([]);
    setInviteError('');
    setInviteSuccess('');
    setGeneratedLink('');
    setInviteDialogOpen(true);
  };

  const handleInviteCategoryChange = (e) => {
    const catId = e.target.value;
    setInviteStream(catId);
    setInviteDept('');
    setFilteredInviteDepts(departments.filter(d => d.category === catId));
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      setInviteError('Please enter a valid email address.');
      return;
    }
    setInviteSubmitting(true);
    setInviteError('');
    setInviteSuccess('');
    setGeneratedLink('');

    try {
      const res = await api.post('/api/users/invite/', {
        email: inviteEmail
      });
      
      const inviteUrl = `${window.location.origin}/register?token=${res.data.token}`;
      
      setGeneratedLink(inviteUrl);
      navigator.clipboard.writeText(inviteUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      setInviteSuccess('Invitation generated, email sent, and link copied to clipboard successfully!');
      showToast('Invitation generated, email sent, and link copied to clipboard successfully!', 'success');
      
      if (currentTab === 1) {
        loadInvitations();
      }
    } catch (err) {
      setInviteError(err.response?.data?.detail || 'Failed to send invitation. Please try again.');
      showToast(err.response?.data?.detail || 'Failed to send invitation.', 'error');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleResendInvite = async (inviteItem) => {
    try {
      await api.post('/api/users/resend-invite/', { id: inviteItem.id });
      loadInvitations();
      showToast('Invitation email resent successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to resend invitation.', 'error');
    }
  };

  const handleCancelInvite = async (inviteItem) => {
    try {
      await api.post('/api/users/cancel-invite/', { id: inviteItem.id });
      loadInvitations();
      showToast('Invitation cancelled successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to cancel invitation.', 'error');
    }
  };

  const handleCopyExistingLink = (inviteItem) => {
    const inviteUrl = `${window.location.origin}/register?token=${inviteItem.token}`;
    navigator.clipboard.writeText(inviteUrl);
    showToast('Invitation link copied to clipboard.', 'success');
  };

  const [deleteInviteConfirmOpen, setDeleteInviteConfirmOpen] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState(null);

  const handleDeleteInviteOpen = (inviteItem) => {
    setInviteToDelete(inviteItem);
    setDeleteInviteConfirmOpen(true);
  };

  const handleDeleteInviteConfirm = async () => {
    if (!inviteToDelete) return;
    try {
      await api.delete(`/api/users/invitation/${inviteToDelete.id}/`);
      setDeleteInviteConfirmOpen(false);
      showToast('Invitation deleted successfully.', 'success');
      loadInvitations();
    } catch (err) {
      console.error('Failed to delete invitation:', err);
      showToast(err.response?.data?.detail || 'Failed to delete invitation.', 'error');
    }
  };

  const [selectedFormStream, setSelectedFormStream] = useState('');
  const [selectedFormCategory, setSelectedFormCategory] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Open creation dialog
  const handleCreateOpen = () => {
    setIsEditMode(false);
    setSelectedUser(null);
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setDesignation('');
    setCompanyName('');
    setSelectedFormStream('');
    setSelectedFormCategory('');
    setDepartment('');
    setFilteredFormDepts(departments);
    setRoleId('');
    setStatus('Active');
    setSaveAttempted(false);
    setUserDialogOpen(true);
  };

  // Open edit dialog
  const handleEditOpen = (userItem) => {
    setIsEditMode(true);
    setSelectedUser(userItem);
    setEmail(userItem.email);
    setName(userItem.name);
    setPhone(userItem.phone || '');
    setDesignation(userItem.designation || '');
    setCompanyName(userItem.company_name || '');
    setDepartment(userItem.department || '');
    const userDept = userItem.department || '';
    const foundDept = departments.find(d => d.name === userDept);
    if (foundDept) {
      setSelectedFormCategory(foundDept.category || '');
      setSelectedFormStream(foundDept.stream || '');
      let filtered = departments;
      if (foundDept.stream) filtered = filtered.filter(d => String(d.stream) === String(foundDept.stream));
      if (foundDept.category) filtered = filtered.filter(d => String(d.category) === String(foundDept.category));
      setFilteredFormDepts(filtered);
    } else {
      setSelectedFormCategory('');
      setSelectedFormStream('');
      setFilteredFormDepts(departments);
    }
    setRoleId(userItem.role?.id || '');
    setStatus(userItem.status);
    setSaveAttempted(false);
    setUserDialogOpen(true);
  };

  const filterFormDepartments = (streamId, catId) => {
    let filtered = departments;
    if (streamId) {
      filtered = filtered.filter(d => String(d.stream) === String(streamId) || String(d.stream_id) === String(streamId));
    }
    if (catId) {
      filtered = filtered.filter(d => String(d.category) === String(catId) || String(d.category_id) === String(catId));
    }
    setFilteredFormDepts(filtered);
  };

  const handleFormStreamChange = (e) => {
    const strmId = e.target.value;
    setSelectedFormStream(strmId);
    setDepartment('');
    filterFormDepartments(strmId, selectedFormCategory);
  };

  const handleFormCategoryChange = (e) => {
    const catId = e.target.value;
    setSelectedFormCategory(catId);
    setDepartment('');
    filterFormDepartments(selectedFormStream, catId);
  };

  // User creation/edit submission
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const foundStream = masterStreams.find(c => c.id === selectedFormStream);
    const streamName = foundStream ? foundStream.name : '';
    const payload = { email, name, phone, designation, company_name: companyName, department, stream: streamName, role_id: roleId, status };
    try {
      if (isEditMode) {
        await api.put(`/api/users/${selectedUser.id}/`, payload);
      } else {
        payload.password = password;
        await api.post('/api/users/', payload);
      }
      setUserDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to save user:', err);
      const data = err.response?.data;
      let errMsg = 'Failed to save user account details.';
      if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          const val = data[firstKey];
          const text = Array.isArray(val) ? val.join(', ') : String(val);
          const formattedKey = firstKey.replace('_id', '').replace('_', ' ');
          errMsg = `${formattedKey.charAt(0).toUpperCase() + formattedKey.slice(1)}: ${text}`;
        }
      } else if (data?.detail) {
        errMsg = data.detail;
      }
      setError(errMsg);
    }
  };

  // Password reset
  const handleResetOpen = (userItem) => { setSelectedUser(userItem); setNewPassword(''); setResetDialogOpen(true); };
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) return;
    try {
      await api.post(`/api/users/${selectedUser.id}/reset-password/`, { password: newPassword });
      setResetDialogOpen(false);
      alert(`Password reset successful for ${selectedUser.email}`);
    } catch (err) {
      console.error('Failed to reset password:', err);
      setError('Failed to reset password.');
    }
  };

  // User deletion handlers
  const handleDeleteOpen = (userItem) => {
    setUserToDelete(userItem);
    setDeleteConfirmOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/api/users/${userToDelete.id}/`);
      setDeleteConfirmOpen(false);
      showToast(`User ${userToDelete.name} has been deleted successfully.`, 'success');
      loadData();
    } catch (err) {
      console.error('Failed to delete user:', err);
      showToast(err.response?.data?.detail || 'Failed to delete user account.', 'error');
    }
  };



  const filteredUsers = users.filter((u) => {
    if (user?.role?.name === 'Admin' && u.role?.name === 'Super Admin') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!u.name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
    }
    if (filterCategory) {
      const deptObj = departments.find(d => d.name === u.department);
      if (!deptObj || deptObj.category !== filterCategory) return false;
    }
    if (filterDept && u.department !== filterDept) return false;
    if (filterUserType) {
      const roleName = u.role?.name;
      const hasDept = !!u.department && u.department !== 'Principal Office' && u.department !== 'Administration Office';
      if (filterUserType === 'Super Admin' && roleName !== 'Super Admin') return false;
      if (filterUserType === 'Admin / Lawyer' && roleName !== 'Admin') return false;
      if (filterUserType === 'Dept. Coordinator' && (roleName !== 'User' || !hasDept)) return false;
      if (filterUserType === 'View Only' && (roleName !== 'User' || hasDept)) return false;
    }
    if (filterRole && u.role?.id !== filterRole) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    return true;
  });

  // Compute dept options for DepartmentSelect
  const deptSelectOptions = [
    { value: '', label: 'Unassigned (Optional)' },
    ...filteredFormDepts.map(d => {
      const catObj = deptCategories.find(c => c.id === deptCategory);
      let lbl = d.name;
      if (catObj?.name === 'Aided' && lbl.endsWith(' (Aided)')) lbl = lbl.slice(0, -8);
      if (catObj?.name === 'Self-Financed (SFS)' && lbl.endsWith(' (SFS)')) lbl = lbl.slice(0, -6);
      return { value: d.name, label: lbl };
    }).sort((a, b) => a.label.localeCompare(b.label))
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Title */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>User Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage users, assign roles, toggle statuses, and set permission overrides.
          </Typography>
        </Box>
        {(['Super Admin', 'Admin'].includes(user?.role?.name) || hasPermission('create_users')) && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0, ml: 3 }}>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={handleCreateOpen}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', whiteSpace: 'nowrap' }}
            >
              Add New User
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleInviteOpen('link')}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', whiteSpace: 'nowrap' }}
            >
              Invite via Link
            </Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Navigation Tabs */}
      <Tabs
        value={currentTab}
        onChange={(e, val) => setCurrentTab(val)}
        sx={{
          mb: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            minHeight: 44,
            px: 2,
          },
          '& .MuiTabs-indicator': { height: 2, borderRadius: '2px 2px 0 0' },
        }}
      >
        <Tab label="Users Directory" icon={<span style={{ fontSize: '1rem' }}>👥</span>} iconPosition="start" />
        <Tab label="Invitations Directory" icon={<span style={{ fontSize: '1rem' }}>✉️</span>} iconPosition="start" />
      </Tabs>

      {currentTab === 0 ? (
        <>
          {/* Role & Permission Legend */}
          <Box sx={{ mb: 3, borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden', boxShadow: 'none', bgcolor: 'background.paper' }}>
            <Box
              sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', bgcolor: 'action.hover' }}
              onClick={() => {
                const el = document.getElementById('role-legend-body');
                if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Role &amp; Permission Guide</Typography>
                <Chip label="Click to expand" size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: 'rgba(var(--indigo-rgb), 0.1)', color: 'primary.main' }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>What each role can and cannot do</Typography>
            </Box>
            <Box id="role-legend-body" sx={{ display: 'none' }}>
              <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>Permission Name</th>
                      {user?.role?.name !== 'Admin' && <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--violet)' }}>Super Admin</th>}
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#2563EB' }}>Admin</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#059669' }}>User</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', color: '#D97706' }}>View Only</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['View Dashboard & Stats', true, true, true, true],
                      ['View / Search Folders & Files', true, true, true, true],
                      ['Download & Preview Files', true, true, true, true],
                      ['Upload Files to Folders', true, true, true, false],
                      ['Create Root Folders & Subfolders', true, true, false, false],
                      ['Create & Edit MOUs', true, true, false, false],
                      ['Sign / Approve MOUs', true, true, true, false],
                      ['Manage Users & Roles', true, true, false, false],
                      ['View Activity Logs', true, true, false, false],
                      ['Delete Folders / Files', true, true, false, false],
                      ['Share Files Externally', true, true, true, false],
                    ].map(([perm, ...vals], ri) => (
                      <tr key={perm} style={{ background: ri % 2 === 0 ? 'rgba(148,163,184,0.04)' : 'transparent' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 500 }}>{perm}</td>
                        {vals.filter((_, vi) => user?.role?.name !== 'Admin' || vi !== 0).map((v, vi) => (
                          <td key={vi} style={{ padding: '7px 12px', textAlign: 'center' }}>
                            {v ? <span style={{ color: '#10B981', fontWeight: 700, fontSize: '1rem' }}>✓</span>
                               : <span style={{ color: '#94A3B8', fontSize: '0.9rem' }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          </Box>

          {/* Search & Filter Bar */}
          <Box sx={{ p: 2.5, mb: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'background.paper' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, fontFamily: 'Inter, system-ui, sans-serif' }}>
              Search &amp; Filter Directory
            </Typography>

            {/* Search input — full width */}
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 1.5 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '8px', bgcolor: 'background.paper' }
                }
              }}
            />

            {/* Dropdown filters row */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Stream */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Stream</InputLabel>
                <Select
                  value={filterCategory}
                  label="Stream"
                  onChange={(e) => { setFilterCategory(e.target.value); setFilterDept(''); }}
                  sx={{ borderRadius: '8px', bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">All Streams</MenuItem>
                  {masterStreams.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Department / Company */}
              <FormControl size="small" sx={{ minWidth: 175 }}>
                <InputLabel>Department / Company</InputLabel>
                <Select
                  value={filterDept}
                  label="Department / Company"
                  onChange={(e) => setFilterDept(e.target.value)}
                  sx={{ borderRadius: '8px', bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">All Depts / Companies</MenuItem>
                  {(filterCategory ? departments.filter(d => d.category === filterCategory) : departments).map(d => (
                    <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* User Type */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>User Type</InputLabel>
                <Select
                  value={filterUserType}
                  label="User Type"
                  onChange={(e) => setFilterUserType(e.target.value)}
                  sx={{ borderRadius: '8px', bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">User Type</MenuItem>
                  {user?.role?.name !== 'Admin' && <MenuItem value="Super Admin">Super Admin</MenuItem>}
                  <MenuItem value="Admin / Lawyer">Admin</MenuItem>
                  <MenuItem value="Dept. Coordinator">Dept. Coordinator</MenuItem>
                  <MenuItem value="View Only">View Only</MenuItem>
                </Select>
              </FormControl>

              {/* Role */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={filterRole}
                  label="Role"
                  onChange={(e) => setFilterRole(e.target.value)}
                  sx={{ borderRadius: '8px', bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">Role</MenuItem>
                  {roles.map(r => (
                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Status */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                  sx={{ borderRadius: '8px', bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">Status</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Disabled">Disabled</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ flexGrow: 1 }} />

              <Button
                variant="text"
                size="small"
                onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterDept(''); setFilterUserType(''); setFilterRole(''); setFilterStatus(''); }}
                sx={{ textTransform: 'none', color: 'text.secondary', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              >
                Clear filters
              </Button>
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', overflowX: 'auto' }}>
              <Table sx={{ tableLayout: 'fixed', minWidth: 800 }}>
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    {['Name', 'Email', 'Role', 'Department / Company', 'Status', 'Last Login'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, px: 2, verticalAlign: 'middle' }}>{h}</TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', py: 1.5, px: 2, verticalAlign: 'middle' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No users found matching filters.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((userItem) => (
                      <TableRow key={userItem.id} hover sx={{ '& td': { verticalAlign: 'middle', py: 1.25, px: 2 } }}>
                        <TableCell sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userItem.name}</TableCell>
                        <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'text.secondary' }}>{userItem.email}</TableCell>
                        <TableCell>
                          <Chip label={userItem.role?.name || 'No Role'} color="primary" size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.72rem', height: 24, borderRadius: '6px' }} />
                        </TableCell>
                        <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userItem.department || userItem.company_name || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={userItem.status}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              height: 24,
                              borderRadius: '6px',
                              bgcolor: userItem.status === 'Active' ? '#10B981' : '#EF4444',
                              color: '#fff',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.83rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                          {userItem.last_login ? new Date(userItem.last_login).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                            {(['Super Admin', 'Admin'].includes(user?.role?.name) || hasPermission('edit_users')) && (
                              <>
                                <Tooltip title="Edit Profile">
                                  <IconButton size="small" onClick={() => handleEditOpen(userItem)} color="primary" sx={{ p: 0.75 }}>
                                    <EditIcon sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reset Password">
                                  <IconButton size="small" onClick={() => handleResetOpen(userItem)} color="default" sx={{ p: 0.75 }}>
                                    <LockOpenIcon sx={{ fontSize: '1rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {(['Super Admin', 'Admin'].includes(user?.role?.name) || hasPermission('delete_users')) && (
                              <Tooltip title="Delete User">
                                <IconButton size="small" onClick={() => handleDeleteOpen(userItem)} color="error" sx={{ p: 0.75 }}>
                                  <DeleteIcon sx={{ fontSize: '1rem' }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      ) : (
        <>
          {/* Invitations Search & Filter Bar */}
          <Box sx={{ p: 3, mb: 3.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'background.paper', width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, fontFamily: 'Inter, system-ui, sans-serif' }}>
                Search &amp; Filter Invitations
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => {
                  setInvitationSearch('');
                  setInvitationFilterStream('');
                  setInvitationFilterDept('');
                  setInvitationFilterRole('');
                  setInvitationFilterStatus('');
                }}
                sx={{ borderRadius: '10px', textTransform: 'none' }}
              >
                Clear Filters
              </Button>
            </Box>

            <TextField
              fullWidth
              size="small"
              placeholder="Search by email..."
              value={invitationSearch}
              onChange={(e) => setInvitationSearch(e.target.value)}
              sx={{ mb: 1.5 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: '1.1rem' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '8px', bgcolor: 'background.paper' }
                }
              }}
            />

            {/* Dropdown filters row */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Stream */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Stream</InputLabel>
                <Select
                  value={invitationFilterStream}
                  label="Stream"
                  onChange={(e) => setInvitationFilterStream(e.target.value)}
                  sx={{ borderRadius: '8px', bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">All Streams</MenuItem>
                  {masterStreams.map(c => (
                    <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Department / Company */}
              <FormControl size="small" sx={{ minWidth: 175 }}>
                <InputLabel>Department / Company</InputLabel>
                <Select
                  value={invitationFilterDept}
                  label="Department / Company"
                  onChange={(e) => setInvitationFilterDept(e.target.value)}
                  sx={{ borderRadius: '8px', bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">All Depts / Companies</MenuItem>
                  {departments.map(d => (
                    <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Role */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Role</InputLabel>
                <Select
                  value={invitationFilterRole}
                  label="Role"
                  onChange={(e) => setInvitationFilterRole(e.target.value)}
                  sx={{ borderRadius: '8px', bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  {roles.map(r => (
                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Status */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={invitationFilterStatus}
                  label="Status"
                  onChange={(e) => setInvitationFilterStatus(e.target.value)}
                  sx={{ borderRadius: '8px', bgcolor: 'background.paper' }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Accepted">Accepted</MenuItem>
                  <MenuItem value="Expired">Expired</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {invitationsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Invited Email</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Stream</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Department / Company</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>System Role</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sent Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Expiry</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invitations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No invitations found.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invitations.map((invite) => {
                      const isPending = invite.status === 'Pending';
                      
                      return (
                        <TableRow key={invite.id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{invite.email}</TableCell>
                          <TableCell>{invite.stream || '—'}</TableCell>
                          <TableCell>{invite.department || '—'}</TableCell>
                          <TableCell>
                            <Chip label={invite.system_role?.name || 'No Role'} color="primary" size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{invite.created_by_email || 'System'}</TableCell>
                          <TableCell>{new Date(invite.created_at).toLocaleString()}</TableCell>
                          <TableCell>{new Date(invite.expires_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Chip 
                              label={invite.status} 
                              color={
                                invite.status === 'Accepted' ? 'success' :
                                invite.status === 'Pending' ? 'warning' :
                                invite.status === 'Cancelled' ? 'error' : 'default'
                              } 
                              size="small" 
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                              {!invite.is_used && (
                                <Tooltip title="Resend Invitation Email">
                                  <IconButton size="small" onClick={() => handleResendInvite(invite)} color="primary">
                                    <RefreshIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {isPending && (
                                <Tooltip title="Cancel Invitation">
                                  <IconButton size="small" onClick={() => handleCancelInvite(invite)} color="error">
                                    <BlockIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Copy Register Link">
                                <IconButton size="small" onClick={() => handleCopyExistingLink(invite)} color="info">
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Invitation Record">
                                <IconButton size="small" onClick={() => handleDeleteInviteOpen(invite)} color="default">
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Invite User Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '16px', boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden' } }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'background.paper', px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
              🔗 Generate Invitation Link
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
              An invitation email will be sent and a link will be copied to clipboard.
            </Typography>
          </Box>
          <IconButton onClick={() => setInviteDialogOpen(false)} size="small" sx={{ mt: 0.25, ml: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 3 }}>
          {inviteError && <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>{inviteError}</Alert>}

          {inviteSuccess && (
            <Alert severity="success" sx={{ mb: 2.5, borderRadius: '10px' }}>
              {inviteSuccess}
            </Alert>
          )}

          {inviteSubmitting && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, p: 2.5, bgcolor: 'rgba(var(--indigo-rgb), 0.06)', border: '1px solid', borderColor: 'rgba(var(--indigo-rgb), 0.18)', borderRadius: '14px' }}>
              <dotlottie-player
                src="/loading.lottie"
                background="transparent"
                speed="1.0"
                style={{ width: '90px', height: '90px' }}
                loop
                autoplay
              ></dotlottie-player>
              <Typography variant="body2" color="primary.main" sx={{ fontWeight: 800, mt: 1, textAlign: 'center' }}>
                Sending invitation and generating link...
              </Typography>
            </Box>
          )}

          <form id="invite-form" onSubmit={handleInviteSubmit}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
              Recipient Email Address
            </Typography>
            <TextField
              placeholder="colleague@institution.edu"
              type="email"
              value={inviteEmail}
              disabled={inviteSubmitting}
              onChange={e => setInviteEmail(e.target.value)}
              fullWidth
              required
              autoFocus
              size="small"
              slotProps={{
                input: {
                  sx: { borderRadius: '10px', fontSize: '0.95rem' }
                }
              }}
            />

            {generatedLink && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(var(--indigo-rgb), 0.05)', borderRadius: '10px', border: '1px dashed', borderColor: 'primary.light' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 1, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Invitation Link Generated
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    value={generatedLink}
                    fullWidth
                    slotProps={{
                      input: {
                        readOnly: true,
                        sx: { fontSize: '0.8rem', bgcolor: 'background.paper', borderRadius: '8px' }
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    sx={{ textTransform: 'none', borderRadius: '8px', flexShrink: 0, minWidth: 70 }}
                  >
                    {linkCopied ? '✓ Copied' : 'Copy'}
                  </Button>
                </Box>
              </Box>
            )}
          </form>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid', borderColor: 'divider', gap: 1.5, justifyContent: 'flex-end' }}>
          <Button
            onClick={() => setInviteDialogOpen(false)}
            sx={{ textTransform: 'none', borderRadius: '10px', color: 'text.secondary', fontWeight: 500 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="invite-form"
            variant="contained"
            disabled={inviteSubmitting}
            sx={{ textTransform: 'none', borderRadius: '10px', px: 3, fontWeight: 600, minWidth: 180 }}
          >
            {inviteSubmitting
              ? <><CircularProgress size={16} color="inherit" sx={{ mr: 1 }} /> Sending…</>
              : 'Generate & Copy Link'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Sending Popup Dialog */}
      <Dialog
        open={inviteSubmitting}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '24px', p: 3, textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' } }
        }}
      >
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
          <Box sx={{ width: '100%', mb: 2.5, display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '16px', overflow: 'hidden' }}>
            <video
              src="/email_Sender.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{ width: '80%', borderRadius: '16px', maxHeight: '130px', objectFit: 'contain' }}
            />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main' }}>
            Sending Invitation...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, px: 2, lineHeight: 1.6 }}>
            Please wait while the invitation email is being sent to <strong>{inviteEmail}</strong>...
          </Typography>
          <Box sx={{ width: '100%', mt: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        slotProps={{
          paper: { sx: { borderRadius: '16px', p: 1, maxWidth: '440px' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Confirm User Deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Are you sure you want to permanently delete user <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
          </Typography>
          <Typography variant="caption" color="error.main" sx={{ display: 'block', fontWeight: 600 }}>
            ⚠️ This action is irreversible and will remove all their system associations.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: 'none', borderRadius: '8px', color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}>
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast notifications */}
      {toast.open && (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, minWidth: 300 }}>
          <Alert severity={toast.severity} variant="filled" sx={{ borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            {toast.message}
          </Alert>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CREATE / EDIT USER DIALOG — Enterprise Grade
      ════════════════════════════════════════════════════════════ */}
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        maxWidth={false}
        slotProps={{
          paper: {
            sx: {
              width: '900px',
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
        <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          
          {/* ── Fixed Header ── */}
          <Box sx={{
            px: 4, py: 2.5,
            borderBottom: '1px solid #F3F4F6',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0, bgcolor: 'background.paper',
          }}>
            <Box>
              <Typography sx={{
                fontWeight: 700, fontSize: '1.1rem',
                fontFamily: 'Inter, system-ui, sans-serif',
                color: 'text.primary',
              }}>
                {isEditMode ? '✏️  Edit User Account' : '👤  Create User Account'}
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontFamily: 'Inter, system-ui, sans-serif', mt: 0.3 }}>
                {isEditMode ? 'Update the user profile, role, and department assignment.' : 'Fill in all required fields to create a new user.'}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setUserDialogOpen(false)}
              sx={{ color: 'text.secondary', ml: 2, '&:hover': { bgcolor: 'action.hover' }, borderRadius: '10px' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* ── Scrollable Form Body (2-Column CSS Grid) ── */}
          <Box sx={{ px: 4, py: 3.5, overflowY: 'auto', flex: 1 }}>
            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: '20px 24px',
              width: '100%',
            }}>
              {/* Row 1: Username/Email + Password */}
              <Box>
                <TextField
                  label="Email (Username)"
                  type="email"
                  fullWidth
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isEditMode}
                  required
                  sx={FIELD_SX}
                />
              </Box>
              <Box>
                {!isEditMode ? (
                  <TextField
                    label="Temporary Password"
                    type="password"
                    fullWidth
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    sx={FIELD_SX}
                  />
                ) : (
                  <TextField
                    label="Email (Login ID)"
                    fullWidth
                    value={email}
                    disabled
                    helperText="Email cannot be changed after account creation."
                    sx={FIELD_SX}
                  />
                )}
              </Box>

              {/* Row 2: Full Name + Designation */}
              <Box>
                <TextField
                  label="Full Name"
                  fullWidth
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  sx={FIELD_SX}
                />
              </Box>
              <Box>
                <TextField
                  label="Designation / Title"
                  fullWidth
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                  sx={FIELD_SX}
                />
              </Box>

              {/* Row 3: Company / Organization Name + System Role */}
              <Box>
                <TextField
                  label="Company / Organization Name (Optional)"
                  fullWidth
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. TCS, Infosys, Apollo Hospitals"
                  sx={FIELD_SX}
                />
              </Box>
              <Box>
                <FormControl fullWidth required>
                  <InputLabel sx={LABEL_SX}>System Role</InputLabel>
                  <Select
                    value={roleId}
                    label="System Role"
                    onChange={e => setRoleId(e.target.value)}
                    sx={SELECT_SX}
                  >
                    {roles.map(r => (
                      <MenuItem key={r.id} value={r.id} sx={MENU_ITEM_SX}>{r.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Row 4: Stream (Optional) + Dept. Category (Optional) */}
              <Box>
                <FormControl fullWidth>
                  <InputLabel sx={LABEL_SX}>Stream (Optional)</InputLabel>
                  <Select
                    value={selectedFormStream}
                    label="Stream (Optional)"
                    onChange={handleFormStreamChange}
                    sx={SELECT_SX}
                  >
                    <MenuItem value="" sx={MENU_ITEM_SX}>All Streams (Optional)</MenuItem>
                    {masterStreams.map(s => (
                      <MenuItem key={s.id} value={s.id} sx={MENU_ITEM_SX}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <FormControl fullWidth>
                  <InputLabel sx={LABEL_SX}>Dept. Category (Optional)</InputLabel>
                  <Select
                    value={selectedFormCategory}
                    label="Dept. Category (Optional)"
                    onChange={handleFormCategoryChange}
                    sx={SELECT_SX}
                  >
                    <MenuItem value="" sx={MENU_ITEM_SX}>All Categories (Optional)</MenuItem>
                    {deptCategories.map(c => (
                      <MenuItem key={c.id} value={c.id} sx={MENU_ITEM_SX}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Row 5: Department (Optional) */}
              <Box>
                <DepartmentSelect
                  value={department}
                  onChange={setDepartment}
                  options={deptSelectOptions}
                  label="Department (Optional)"
                  saveAttempted={saveAttempted}
                />
              </Box>
              <Box>
                <FormControl fullWidth required>
                  <InputLabel sx={LABEL_SX}>Account Status</InputLabel>
                  <Select
                    value={status}
                    label="Account Status"
                    onChange={e => setStatus(e.target.value)}
                    sx={SELECT_SX}
                  >
                    <MenuItem value="Active" sx={MENU_ITEM_SX}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981', flexShrink: 0 }} />
                        Active
                      </Box>
                    </MenuItem>
                    <MenuItem value="Disabled" sx={MENU_ITEM_SX}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0 }} />
                        Disabled
                      </Box>
                    </MenuItem>
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
              onClick={() => setUserDialogOpen(false)}
              variant="outlined"
              sx={{
                borderRadius: '10px', fontWeight: 600, px: 3,
                fontFamily: 'Inter, system-ui, sans-serif',
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'action.hover', borderColor: 'text.secondary' },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                borderRadius: '10px', fontWeight: 700, px: 4,
                fontFamily: 'Inter, system-ui, sans-serif',
                background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
                boxShadow: '0 4px 14px rgba(var(--violet-rgb), 0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, var(--indigo), var(--violet))',
                  filter: 'brightness(90%)',
                  boxShadow: '0 6px 20px rgba(var(--violet-rgb), 0.5)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.18s ease',
              }}
            >
              {isEditMode ? 'Save Changes' : '✓  Create Account'}
            </Button>
          </Box>
        </form>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <form onSubmit={handleResetSubmit}>
          <DialogTitle>Reset Password: {selectedUser?.email}</DialogTitle>
          <DialogContent sx={{ minWidth: 320 }}>
            <TextField
              autoFocus
              margin="dense"
              label="New Password"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button type="submit" color="primary" variant="contained">Update Password</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Custom Site Popup: Delete Invitation Confirmation Dialog */}
      <Dialog
        open={deleteInviteConfirmOpen}
        onClose={() => setDeleteInviteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '20px', p: 1, boxShadow: '0 24px 80px rgba(0,0,0,0.2)' } }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <Avatar sx={{ bgcolor: 'error.lighter', color: 'error.main', width: 44, height: 44 }}>
            <DeleteIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
              Delete Invitation Record
            </Typography>
            <Typography variant="caption" color="text.secondary">
              This action cannot be undone
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ py: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to permanently delete the invitation record for{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{inviteToDelete?.email}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setDeleteInviteConfirmOpen(false)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteInviteConfirm}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, px: 2.5 }}
          >
            Delete Invitation
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
};

export default UserManagement;
