export const FOLDER_STATUS_COLORS = {
  Ongoing: '#10B981',
  Expired: '#EF4444',
  Others: '#EAB308',
  Active: '#8B5CF6',
  Signed: '#10B981',
  'Pending Review': '#F59E0B',
  Archived: '#475569',
};

export const FOLDER_STATUS_LEGEND = [
  { label: 'Ongoing', color: '#10B981' },
  { label: 'Expired', color: '#EF4444' },
  { label: 'Others', color: '#EAB308' },
  { label: 'Active', color: '#8B5CF6' },
  { label: 'Signed', color: '#10B981' },
  { label: 'Pending Review', color: '#F59E0B' },
  { label: 'Archived', color: '#475569' },
];

export const FOLDER_STATUS_OPTIONS = [
  { value: 'Ongoing', label: 'Ongoing (Green)', dot: '🟢', color: '#10B981' },
  { value: 'Expired', label: 'Expired (Red)', dot: '🔴', color: '#EF4444' },
  { value: 'Others', label: 'Others (Yellow)', dot: '🟡', color: '#EAB308' },
  { value: 'Active', label: 'Active (Purple)', dot: '🟣', color: '#8B5CF6' },
  { value: 'Signed', label: 'Signed (Green)', dot: '🟢', color: '#10B981' },
  { value: 'Pending Review', label: 'Pending Review (Amber)', dot: '🟠', color: '#F59E0B' },
  { value: 'Archived', label: 'Archived (Slate)', dot: '⚫', color: '#475569' },
];

export const getFolderStatusColor = (status) => {
  return FOLDER_STATUS_COLORS[status] || '#8B5CF6';
};

export const getDynamicFolderColor = (folder) => {
  if (!folder) return '#8B5CF6';
  if (folder.status === 'Archived') {
    return '#475569';
  }
  // Classification statuses take precedence over expiry/unread indicators
  if (folder.status === 'Ongoing') return '#10B981';
  if (folder.status === 'Expired') return '#EF4444';
  if (folder.status === 'Others') return '#EAB308';

  if (folder.expiry_date) {
    const expiry = new Date(folder.expiry_date);
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      return '#EF4444';
    }
    if (folder.status === 'Expired') {
      return '#8B5CF6';
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

export const getDynamicFolderLabel = (folder) => {
  if (!folder) return 'Active';
  if (folder.status === 'Archived') {
    return 'Archived';
  }
  if (folder.status === 'Ongoing' || folder.status === 'Expired' || folder.status === 'Others') {
    return folder.status;
  }
  if (folder.expiry_date) {
    const expiry = new Date(folder.expiry_date);
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Expired';
    if (diffDays <= 30) return 'Expiring Soon';
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

