export const DEFAULT_SHORTCUTS = [
  { id: 'dashboard', name: 'Dashboard', path: '/', key: 'D', modifier: 'Ctrl', description: 'Navigates to main System Dashboard', enabled: true },
  { id: 'folders', name: 'Folders Explorer', path: '/folders', key: 'F', modifier: 'Ctrl', description: 'Opens Document & Repository Explorer', enabled: true },
  { id: 'mou', name: 'MOU Repository', path: '/mou', key: 'M', modifier: 'Ctrl', description: 'Navigates to MOUs & Contracts Repository', enabled: true },
  { id: 'templates', name: 'Templates', path: '/templates', key: 'T', modifier: 'Ctrl', description: 'Opens Document Templates Library', enabled: true },
  { id: 'departments', name: 'Departments', path: '/departments', key: 'E', modifier: 'Ctrl', description: 'Navigates to Department Directory', enabled: true },
  { id: 'shared', name: 'Shared With Me', path: '/shared', key: 'W', modifier: 'Ctrl', description: 'Opens Shared Documents & Folders', enabled: true },
  { id: 'users', name: 'User Management', path: '/users', key: 'U', modifier: 'Ctrl', description: 'Opens User Management & Access Control', enabled: true },
  { id: 'notifications', name: 'Notifications', path: '/notifications', key: 'N', modifier: 'Ctrl', description: 'Navigates to System Notifications', enabled: true },
  { id: 'recycle_bin', name: 'Recycle Bin', path: '/recycle-bin', key: 'R', modifier: 'Ctrl', description: 'Opens Soft-Deleted Items & Recycle Bin', enabled: true },
  { id: 'settings', name: 'Site Settings', path: '/settings', key: 'S', modifier: 'Ctrl', description: 'Opens System Settings & Customization', enabled: true },
  { id: 'activity_logs', name: 'Activity Logs', path: '/activity-logs', key: 'A', modifier: 'Ctrl', description: 'Opens System Audit & Activity Logs', enabled: true },
  { id: 'system_map', name: 'System Map', path: '/system-map', key: 'P', modifier: 'Ctrl', description: 'Navigates to Architecture System Map', enabled: true },
  { id: 'help', name: 'Help Center', path: '/help', key: 'H', modifier: 'Ctrl', description: 'Opens User Guide & System Help Center', enabled: true },
];

export const getStoredShortcuts = () => {
  try {
    const raw = localStorage.getItem('mcc_keyboard_shortcuts');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse stored keyboard shortcuts:', e);
  }
  return DEFAULT_SHORTCUTS;
};

export const saveStoredShortcuts = (shortcuts) => {
  try {
    localStorage.setItem('mcc_keyboard_shortcuts', JSON.stringify(shortcuts));
    window.dispatchEvent(new CustomEvent('mcc_shortcuts_updated', { detail: shortcuts }));
  } catch (e) {
    console.error('Failed to save keyboard shortcuts:', e);
  }
};
