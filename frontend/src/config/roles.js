/**
 * Central Role-Based Access Configuration for MCC Legal & MOU Enterprise Hub
 * Defines per role: allowed services, statistics, hero buttons, permissions, and route guards.
 */

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
};

/**
 * Normalizes user role string to 'super_admin' | 'admin' | 'user'
 * Handles backend strings like 'Super Admin', 'Admin', 'User', 'Lawyer / MOU Administrator'
 */
export const getNormalizedRole = (user) => {
  if (!user) return ROLES.USER;
  if (user.is_superuser) return ROLES.SUPER_ADMIN;

  const rawRole = (typeof user.role === 'object' && user.role?.name)
    ? user.role.name
    : (typeof user.role === 'string' ? user.role : '');

  const lower = rawRole.trim().toLowerCase();

  if (lower === 'super admin' || lower === 'super_admin' || lower === 'superadmin') {
    return ROLES.SUPER_ADMIN;
  }
  if (lower === 'admin' || lower === 'lawyer / mou administrator' || lower === 'administrator') {
    return ROLES.ADMIN;
  }
  return ROLES.USER;
};

/**
 * Returns human-readable role badge string
 */
export const getRoleBadge = (user) => {
  const role = getNormalizedRole(user);
  switch (role) {
    case ROLES.SUPER_ADMIN:
      return 'Super Administrator';
    case ROLES.ADMIN:
      return 'Administrator';
    case ROLES.USER:
    default:
      return 'User';
  }
};

/**
 * Route access permissions per role
 */
export const ROLE_ROUTE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    allowedPrefixes: [
      '/',
      '/explorer',
      '/folders',
      '/users',
      '/logs',
      '/mou',
      '/templates',
      '/template-detail',
      '/shared',
      '/departments',
      '/notifications',
      '/settings',
      '/import-export',
      '/recycle-bin',
      '/profile',
      '/system-map',
      '/custom-page',
    ],
    forbiddenPrefixes: [],
  },
  [ROLES.ADMIN]: {
    allowedPrefixes: [
      '/',
      '/explorer',
      '/folders',
      '/departments',
      '/mou',
      '/templates',
      '/template-detail',
      '/shared',
      '/notifications',
      '/logs',
      '/recycle-bin',
      '/profile',
      '/custom-page',
    ],
    forbiddenPrefixes: [
      '/users',
      '/settings',
      '/import-export',
      '/system-map',
    ],
  },
  [ROLES.USER]: {
    allowedPrefixes: [
      '/',
      '/explorer',
      '/folders',
      '/mou',
      '/templates',
      '/template-detail',
      '/shared',
      '/notifications',
      '/profile',
      '/custom-page',
    ],
    forbiddenPrefixes: [
      '/users',
      '/settings',
      '/import-export',
      '/system-map',
      '/departments',
      '/logs',
      '/recycle-bin',
    ],
  },
};

/**
 * Check if a user role is permitted to visit a route
 */
export const canAccessRoute = (user, path) => {
  if (!user) return false;
  const role = getNormalizedRole(user);
  if (role === ROLES.SUPER_ADMIN) return true;

  const permissions = ROLE_ROUTE_PERMISSIONS[role] || ROLE_ROUTE_PERMISSIONS[ROLES.USER];
  
  // Check forbidden list first
  for (const forbidden of permissions.forbiddenPrefixes) {
    if (path === forbidden || path.startsWith(forbidden + '/') || path.startsWith(forbidden + '?')) {
      return false;
    }
  }

  // Check allowed list
  for (const allowed of permissions.allowedPrefixes) {
    if (allowed === '/' && (path === '/' || path === '')) return true;
    if (allowed !== '/' && (path === allowed || path.startsWith(allowed + '/') || path.startsWith(allowed + '?'))) {
      return true;
    }
  }

  return false;
};

/**
 * Hero slides definition per role
 */
export const ROLE_HERO_CONFIG = {
  [ROLES.SUPER_ADMIN]: {
    badge: 'Super Administrator',
    slides: [
      {
        title: 'Institutional MOU & Legal Governance Portal',
        description: 'Complete centralized authority — manage system security, user permissions, cloud quotas, and legal compliance across all departments.',
      },
      {
        title: 'Enterprise Document Lifecycle & Archival',
        description: 'Automated 30-day expiry calculation, real-time Drive synchronization, and cryptographically verified audit trails.',
      },
      {
        title: 'Cross-Faculty Collaboration & Policy Hub',
        description: 'Oversee multi-stream institutional partnerships, department quotas, and legal documentation standards.',
      },
    ],
    buttons: [
      { label: 'Manage Users', icon: 'ManageAccounts', path: '/users', primary: true },
      { label: 'System Settings', icon: 'Settings', path: '/settings', primary: false },
    ],
  },
  [ROLES.ADMIN]: {
    badge: 'Administrator',
    slides: [
      {
        title: 'Departmental MOU Governance & Approval Desk',
        description: 'Oversee and verify bilateral agreements, departmental partnerships, and renewal workflows with institutional compliance.',
      },
      {
        title: 'Department Document Vault & Verification Queue',
        description: 'Review signed agreements, track pending approvals, and manage verified templates for your faculty.',
      },
      {
        title: 'Compliance Reminders & Activity Oversight',
        description: 'Stay ahead of upcoming contract expiries, track department audit trails, and ensure operational readiness.',
      },
    ],
    buttons: [
      { label: 'Verify MOUs', icon: 'FactCheck', path: '/explorer?filter=pending', primary: true },
      { label: 'My Department', icon: 'Business', path: '/departments', primary: false },
    ],
  },
  [ROLES.USER]: {
    badge: 'User',
    slides: [
      {
        title: 'Personal MOU & Legal Document Workspace',
        description: 'Access assigned departmental repositories, review uploaded documents, and track active institutional agreements.',
      },
      {
        title: 'Standard Legal Templates & Contract Drafts',
        description: 'Download verified bilateral collaboration templates and submit newly signed agreements for departmental verification.',
      },
      {
        title: 'Real-Time Notifications & Agreement Status',
        description: 'Receive instant notifications regarding agreement approvals, signatures, and cross-department document shares.',
      },
    ],
    buttons: [
      { label: 'My Documents', icon: 'FolderSpecial', path: '/explorer?filter=my_documents', primary: true },
      { label: 'Request MOU', icon: 'NoteAdd', path: '/mou/create', primary: false },
    ],
  },
};

/**
 * Statistics tiles configuration per role
 */
export const ROLE_STATISTICS_CONFIG = {
  [ROLES.SUPER_ADMIN]: [
    { key: 'storage', label: 'Storage Utilization', subLabel: 'Storage Quota & Breakdown', isStorage: true, icon: 'Storage' },
    { key: 'total_users', label: 'System Users', subLabel: 'Active Accounts in Portal', icon: 'People' },
    { key: 'total_folders', label: 'Total Repositories', subLabel: 'Department Directories', icon: 'Folder' },
    { key: 'active_mous', label: 'Active Agreements', subLabel: 'Fully Verified & Active', icon: 'CheckCircle' },
    { key: 'pending_approval', label: 'Pending Verifications', subLabel: 'Awaiting Approvals / Review', icon: 'HourglassTop' },
    { key: 'expiring_30_days', label: 'Expiring Soon', subLabel: 'Due in Next 30 Days', icon: 'Warning' },
    { key: 'shared_files', label: 'Shared Files', subLabel: 'Cross-Department Collaborations', icon: 'Share' },
    { key: 'recycle_bin_count', label: 'Recycle Bin', subLabel: 'Retained Archival Items', icon: 'Delete' },
  ],
  [ROLES.ADMIN]: [
    { key: 'department_folders', label: 'Department Repositories', subLabel: 'Assigned Department Directories', icon: 'Folder' },
    { key: 'active_mous', label: 'Active Agreements', subLabel: 'Department Active Agreements', icon: 'CheckCircle' },
    { key: 'pending_approval', label: 'Pending Verifications', subLabel: 'Department Verification Queue', icon: 'HourglassTop' },
    { key: 'expiring_30_days', label: 'Expiring Soon', subLabel: 'Expiring in Next 30 Days', icon: 'Warning' },
    { key: 'shared_files', label: 'Shared Files', subLabel: 'Department Shared Documents', icon: 'Share' },
    { key: 'recycle_bin_count', label: 'Recycle Bin Items', subLabel: 'Department Soft-Deleted Items', icon: 'Delete' },
    { key: 'unread_notifications', label: 'Unread Notifications', subLabel: 'Pending Department Alerts', icon: 'Notifications' },
    { key: 'department_users', label: 'Department Users', subLabel: 'Faculty & Department Staff', icon: 'People' },
  ],
  [ROLES.USER]: [
    { key: 'my_documents', label: 'My Documents', subLabel: 'Uploaded by You', icon: 'InsertDriveFile' },
    { key: 'shared_with_me', label: 'Shared With Me', subLabel: 'Directly Shared Files', icon: 'Share' },
    { key: 'my_pending_approvals', label: 'My Pending Approvals', subLabel: 'Awaiting Verification', icon: 'HourglassTop' },
    { key: 'my_expiring_mous', label: 'My Expiring MOUs', subLabel: 'Due in Next 30 Days', icon: 'Warning' },
    { key: 'unread_notifications', label: 'Unread Notifications', subLabel: 'Direct Alerts & Updates', icon: 'Notifications' },
  ],
};

/**
 * Services Grid Cards configuration per role
 */
export const ROLE_SERVICES_CONFIG = {
  [ROLES.SUPER_ADMIN]: [
    { title: 'User Management', desc: 'Manage institutional accounts, roles & department assignments', path: '/users', icon: 'ManageAccounts', highlight: true },
    { title: 'System Settings', desc: 'Google Drive cloud storage, SMTP, and system parameters', path: '/settings', icon: 'Settings', highlight: true },
    { title: 'Import & Export', desc: 'Full institutional database backup, restore, and JSON export', path: '/import-export', icon: 'ImportExport', highlight: true },
    { title: 'Activity Logs', desc: 'Comprehensive system-wide audit trail and security activity logs', path: '/logs', icon: 'History', highlight: true },
    { title: 'Recycle Bin', desc: 'Institutional retention archive, soft-delete recovery and purge', path: '/recycle-bin', icon: 'Delete' },
    { title: 'System Map', desc: 'Interactive system workflow, permission matrix and architectural guide', path: '/system-map', icon: 'Map' },
    { title: 'Departments', desc: 'Configure streams, academic faculties and administrative units', path: '/departments', icon: 'Business' },
    { title: 'MOU Repositories', desc: 'Google Drive-style directory explorer of all institutional folders', path: '/explorer', icon: 'Folder' },
    { title: 'MOU Lifecycle', desc: 'Draft, verify, approve, and track bilateral institutional agreements', path: '/mou/create', icon: 'AssignmentTurnedIn' },
    { title: 'Templates', desc: 'Manage standardized legal contracts and bilateral agreement templates', path: '/templates', icon: 'Description' },
    { title: 'Shared Files', desc: 'Monitor cross-departmental and external document collaboration links', path: '/shared', icon: 'Share' },
    { title: 'Notifications', desc: 'System alerts, expiry reminders, and compliance notifications', path: '/notifications', icon: 'Notifications' },
  ],
  [ROLES.ADMIN]: [
    { title: 'Departments', desc: 'View and manage academic faculty & department coordinators', path: '/departments', icon: 'Business', highlight: true },
    { title: 'MOU Repositories', desc: 'Create, organize, and inspect departmental MOU folders and documents', path: '/explorer', icon: 'Folder', highlight: true },
    { title: 'MOU Lifecycle', desc: 'Department verification queue, renewal management, and approvals', path: '/explorer?filter=pending', icon: 'AssignmentTurnedIn', highlight: true },
    { title: 'Templates', desc: 'Access and utilize official institutional MOU contract templates', path: '/templates', icon: 'Description', highlight: true },
    { title: 'Shared Files', desc: 'Department shared documents and collaborator permissions', path: '/shared', icon: 'Share' },
    { title: 'Notifications', desc: 'Department compliance notifications and renewal alerts', path: '/notifications', icon: 'Notifications' },
    { title: 'Activity Logs', desc: 'Read-only departmental audit log of member actions and uploads', path: '/logs', icon: 'History' },
    { title: 'Recycle Bin', desc: 'Restore or clean up departmental deleted folders and documents', path: '/recycle-bin', icon: 'Delete' },
  ],
  [ROLES.USER]: [
    { title: 'My Documents / MOU Repositories', desc: 'Access assigned department folders and view uploaded documents', path: '/explorer', icon: 'Folder', highlight: true },
    { title: 'MOU Lifecycle', desc: 'Submit and track approval status of your initiated agreements', path: '/mou/create', icon: 'AssignmentTurnedIn', highlight: true },
    { title: 'Templates', desc: 'Browse and download standard institutional agreement templates', path: '/templates', icon: 'Description', highlight: true },
    { title: 'Shared Files', desc: 'Access legal documents and folders shared specifically with you', path: '/shared', icon: 'Share' },
    { title: 'Notifications', desc: 'Personal notifications, signature status, and verification updates', path: '/notifications', icon: 'Notifications' },
    { title: 'My Profile', desc: 'Manage your profile details, department affiliation, and security', path: '/profile', icon: 'Person' },
  ],
};

/**
 * Returns complete bundle of role-specific configurations
 */
export const getRoleConfig = (user) => {
  const role = getNormalizedRole(user);
  return {
    role,
    badge: getRoleBadge(user),
    hero: ROLE_HERO_CONFIG[role] || ROLE_HERO_CONFIG[ROLES.USER],
    statistics: ROLE_STATISTICS_CONFIG[role] || ROLE_STATISTICS_CONFIG[ROLES.USER],
    services: ROLE_SERVICES_CONFIG[role] || ROLE_SERVICES_CONFIG[ROLES.USER],
  };
};
