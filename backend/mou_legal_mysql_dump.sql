-- ======================================================================
-- MCC LEGAL DOCUMENT HUB - MYSQL DUMP FILE (LARAGON COMPATIBLE)
-- Generated for production deployment with Super Admin credentials only.
-- ======================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';

-- --------------------------------------------------------
-- Table structure for `django_migrations`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `django_migrations`;
CREATE TABLE IF NOT EXISTS `django_migrations` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `app` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `applied` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `django_migrations`
INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES
(1, 'permissions', '0001_initial', '2026-07-23 10:08:21.200949'),
(2, 'roles', '0001_initial', '2026-07-23 10:08:21.237123'),
(3, 'contenttypes', '0001_initial', '2026-07-23 10:08:21.265768'),
(4, 'contenttypes', '0002_remove_content_type_name', '2026-07-23 10:08:21.303705'),
(5, 'auth', '0001_initial', '2026-07-23 10:08:21.349939'),
(6, 'auth', '0002_alter_permission_name_max_length', '2026-07-23 10:08:21.383454'),
(7, 'auth', '0003_alter_user_email_max_length', '2026-07-23 10:08:21.404116'),
(8, 'auth', '0004_alter_user_username_opts', '2026-07-23 10:08:21.429314'),
(9, 'auth', '0005_alter_user_last_login_null', '2026-07-23 10:08:21.452290'),
(10, 'auth', '0006_require_contenttypes_0002', '2026-07-23 10:08:21.473600'),
(11, 'auth', '0007_alter_validators_add_error_messages', '2026-07-23 10:08:21.498396'),
(12, 'auth', '0008_alter_user_username_max_length', '2026-07-23 10:08:21.525067'),
(13, 'auth', '0009_alter_user_last_name_max_length', '2026-07-23 10:08:21.548847'),
(14, 'auth', '0010_alter_group_name_max_length', '2026-07-23 10:08:21.580883'),
(15, 'auth', '0011_update_proxy_permissions', '2026-07-23 10:08:21.604393'),
(16, 'auth', '0012_alter_user_first_name_max_length', '2026-07-23 10:08:21.629428'),
(17, 'users', '0001_initial', '2026-07-23 10:08:21.696309'),
(18, 'activity_logs', '0001_initial', '2026-07-23 10:08:21.720579'),
(19, 'activity_logs', '0002_initial', '2026-07-23 10:08:21.771329'),
(20, 'admin', '0001_initial', '2026-07-23 10:08:21.825359'),
(21, 'admin', '0002_logentry_remove_auto_add', '2026-07-23 10:08:21.868410'),
(22, 'admin', '0003_logentry_add_action_flag_choices', '2026-07-23 10:08:21.901154'),
(23, 'folders', '0001_initial', '2026-07-23 10:08:21.932776'),
(24, 'files', '0001_initial', '2026-07-23 10:08:21.962364'),
(25, 'files', '0002_initial', '2026-07-23 10:08:21.993675'),
(26, 'files', '0003_initial', '2026-07-23 10:08:22.098773'),
(27, 'folders', '0002_initial', '2026-07-23 10:08:22.215766'),
(28, 'notifications', '0001_initial', '2026-07-23 10:08:22.235974'),
(29, 'notifications', '0002_initial', '2026-07-23 10:08:22.286942'),
(30, 'sessions', '0001_initial', '2026-07-23 10:08:22.322564'),
(31, 'notifications', '0003_notification_metadata', '2026-07-23 10:59:59.318203'),
(32, 'mous', '0001_initial', '2026-07-24 08:44:52.196265'),
(33, 'files', '0004_file_file_size_file_google_file_id_file_mime_type_and_more', '2026-07-27 07:53:17.110336'),
(34, 'folders', '0003_folder_google_folder_id', '2026-07-27 07:53:17.148224'),
(35, 'mous', '0002_departmentsubmission_moushare', '2026-07-27 08:01:28.776137'),
(36, 'admin', '0004_alter_logentry_action_time', '2026-07-27 09:11:37.066800'),
(37, 'auth', '0013_alter_user_date_joined', '2026-07-27 09:11:37.092267'),
(38, 'mous', '0003_collaborationtype_departmentcategory_documenttype_and_more', '2026-07-27 09:11:37.185665'),
(39, 'admin', '0005_alter_logentry_action_time', '2026-07-28 02:40:17.300947'),
(40, 'auth', '0014_alter_user_date_joined', '2026-07-28 02:40:17.325959'),
(41, 'mous', '0004_templatedocument_google_file_id_and_more', '2026-07-28 02:40:17.399538'),
(42, 'files', '0005_fileownership_filepermission', '2026-07-28 11:33:27.406964'),
(43, 'files', '0006_fileownership_created_at_fileownership_shared_by_and_more', '2026-07-28 11:33:27.696003'),
(44, 'files', '0007_delete_fileownership_filepermission', '2026-07-28 11:33:27.717530'),
(45, 'folders', '0004_folderpermission_can_delete_own_files_and_more', '2026-07-28 11:33:27.887127'),
(46, 'folders', '0005_rename_can_delete_own_files_folderpermission_can_delete_own_uploads', '2026-07-28 11:33:28.034308'),
(47, 'users', '0002_customuser_stream_userinvitation', '2026-07-28 11:33:28.149726'),
(48, 'users', '0003_customuser_created_by_userrole', '2026-07-28 11:33:28.258156'),
(49, 'users', '0004_remove_customuser_created_by_alter_userrole_table', '2026-07-28 11:33:28.341935'),
(50, 'users', '0005_delete_userrole', '2026-07-28 11:33:28.356073'),
(51, 'folders', '0006_folder_status', '2026-07-29 09:47:41.433827'),
(52, 'users', '0006_customuser_company_name', '2026-07-29 09:47:41.485317'),
(53, 'files', '0008_file_is_signed', '2026-07-31 03:05:24.719969'),
(54, 'folders', '0007_folder_beneficiaries_folder_department_name_and_more', '2026-07-31 03:05:25.214219'),
(55, 'folders', '0008_remove_folder_beneficiaries_and_more', '2026-07-31 03:05:25.755128'),
(56, 'mous', '0005_mou_mou_file', '2026-07-31 03:05:25.908854'),
(57, 'users', '0007_smtpsetting', '2026-07-31 03:05:25.930126'),
(58, 'users', '0008_smtpsetting_auth_required_alter_smtpsetting_password_and_more', '2026-07-31 03:05:25.972485'),
(59, 'users', '0009_googledrivesetting', '2026-07-31 03:05:25.990663'),
(60, 'users', '0010_customstatus_systemsetting', '2026-07-31 03:05:26.012029'),
(61, 'users', '0011_delete_customstatus_delete_systemsetting', '2026-07-31 03:05:26.030176'),
(62, 'users', '0012_remove_googledrivesetting_auth_provider_x509_cert_url_and_more', '2026-07-31 03:05:26.205741'),
(63, 'users', '0013_googledrivesetting_access_token_and_more', '2026-07-31 05:22:15.908157'),
(64, 'users', '0014_alter_googledrivesetting_token_uri', '2026-07-31 05:44:42.910170'),
(65, 'users', '0015_googledrivesetting_storage_limit_and_more', '2026-07-31 06:26:19.226310'),
(66, 'mous', '0006_moucategory', '2026-07-31 08:54:18.213017'),
(67, 'users', '0012_googledrivesetting_access_token_and_more', '2026-07-31 08:54:30.425607'),
(68, 'users', '0013_googledrivesetting_connection_status_and_more', '2026-07-31 08:54:30.438931'),
(69, 'users', '0016_merge_20260803_0714', '2026-08-03 01:44:15.716497'),
(70, 'activity_logs', '0003_activitylog_user_agent_activitylog_user_company_and_more', '2026-08-03 07:32:24.757847'),
(71, 'files', '0009_file_encrypted_file_encryption_key_id_and_more', '2026-08-03 07:32:25.021617'),
(72, 'users', '0014_alter_googledrivesetting_access_token_and_more', '2026-08-03 07:33:33.565557'),
(73, 'users', '0015_userloginattempt_customuser_password_changed_at_and_more', '2026-08-03 07:33:33.707668'),
(74, 'activity_logs', '0004_remove_activitylog_user_agent_and_more', '2026-08-04 05:25:16.844671'),
(75, 'admin', '0006_alter_logentry_action_time', '2026-08-04 05:25:16.910316'),
(76, 'auth', '0015_alter_user_date_joined', '2026-08-04 05:25:16.935113'),
(77, 'users', '0016_passwordresetotp_remove_passwordhistory_user_and_more', '2026-08-04 05:25:17.372914');

-- --------------------------------------------------------
-- Table structure for `permissions_permission`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `permissions_permission`;
CREATE TABLE IF NOT EXISTS `permissions_permission` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `codename` VARCHAR(100) NOT NULL,
  `description` LONGTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `permissions_permission`
INSERT INTO `permissions_permission` (`id`, `name`, `codename`, `description`) VALUES
(1, 'View Folder', 'view_folder', 'Can view folders in explorer'),
(2, 'Create Folder', 'create_folder', 'Can create folders in explorer'),
(3, 'Rename Folder', 'rename_folder', 'Can rename folders'),
(4, 'Delete Folder', 'delete_folder', 'Can delete folders'),
(5, 'Create Nested Folder', 'create_nested_folder', 'Can create subfolders inside folders'),
(6, 'Upload Files', 'upload_files', 'Can upload files'),
(7, 'Download Files', 'download_files', 'Can download files'),
(8, 'Delete Files', 'delete_files', 'Can delete files'),
(9, 'Replace Files', 'replace_files', 'Can replace files (create new versions)'),
(10, 'Preview Files', 'preview_files', 'Can preview files inline'),
(11, 'View Notifications', 'view_notifications', 'Can view system notifications'),
(12, 'View Dashboard', 'view_dashboard', 'Can view system dashboard stats'),
(13, 'Manage Users', 'manage_users', 'Can view users lists and details'),
(14, 'Create Users', 'create_users', 'Can create new users'),
(15, 'Edit Users', 'edit_users', 'Can update user details, roles, permissions'),
(16, 'Delete Users', 'delete_users', 'Can delete users');

-- --------------------------------------------------------
-- Table structure for `roles_role`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `roles_role`;
CREATE TABLE IF NOT EXISTS `roles_role` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` LONGTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `roles_role`
INSERT INTO `roles_role` (`id`, `name`, `description`) VALUES
(1, 'Super Admin', 'Super Administrator with full system control'),
(2, 'Admin', 'Administrator who can manage files, folders, and users'),
(3, 'User', 'Standard user who can read, preview, upload, and download files in assigned folders');

-- --------------------------------------------------------
-- Table structure for `roles_rolepermission`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `roles_rolepermission`;
CREATE TABLE IF NOT EXISTS `roles_rolepermission` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `permission_id` INT NOT NULL,
  `role_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `roles_rolepermission`
INSERT INTO `roles_rolepermission` (`id`, `permission_id`, `role_id`) VALUES
(1, 1, 1),
(2, 2, 1),
(3, 3, 1),
(4, 4, 1),
(5, 5, 1),
(6, 6, 1),
(7, 7, 1),
(8, 8, 1),
(9, 9, 1),
(10, 10, 1),
(11, 11, 1),
(12, 12, 1),
(13, 13, 1),
(14, 14, 1),
(15, 15, 1),
(16, 16, 1),
(17, 1, 2),
(18, 2, 2),
(19, 3, 2),
(20, 4, 2),
(21, 5, 2),
(22, 6, 2),
(23, 7, 2),
(24, 8, 2),
(25, 9, 2),
(26, 10, 2),
(27, 11, 2),
(28, 12, 2),
(29, 13, 2),
(30, 14, 2),
(31, 15, 2),
(32, 16, 2),
(33, 1, 3),
(34, 6, 3),
(35, 7, 3),
(36, 10, 3),
(37, 11, 3),
(38, 12, 3);

-- --------------------------------------------------------
-- Table structure for `django_content_type`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `django_content_type`;
CREATE TABLE IF NOT EXISTS `django_content_type` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `app_label` VARCHAR(100) NOT NULL,
  `model` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `django_content_type`
INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES
(1, 'admin', 'logentry'),
(2, 'auth', 'permission'),
(3, 'auth', 'group'),
(4, 'contenttypes', 'contenttype'),
(5, 'sessions', 'session'),
(6, 'roles', 'role'),
(7, 'roles', 'rolepermission'),
(8, 'permissions', 'permission'),
(9, 'users', 'customuser'),
(10, 'users', 'userpermission'),
(11, 'folders', 'folder'),
(12, 'folders', 'folderpermission'),
(13, 'files', 'file'),
(14, 'files', 'fileversion'),
(15, 'notifications', 'notification'),
(16, 'activity_logs', 'activitylog'),
(17, 'mous', 'mourenewal'),
(18, 'mous', 'moudocument'),
(19, 'mous', 'mou'),
(20, 'mous', 'moutemplate'),
(21, 'mous', 'moushare'),
(22, 'mous', 'departmentsubmission'),
(23, 'mous', 'collaborationtype'),
(24, 'mous', 'departmentcategory'),
(25, 'mous', 'documenttype'),
(26, 'mous', 'organizationtype'),
(27, 'mous', 'tag'),
(28, 'mous', 'templatecategory'),
(29, 'mous', 'department'),
(30, 'mous', 'templatecollection'),
(31, 'mous', 'templatedocument'),
(32, 'users', 'userinvitation'),
(33, 'users', 'smtpsetting'),
(34, 'users', 'googledrivesetting'),
(35, 'folders', 'folderview'),
(36, 'mous', 'moucategory'),
(37, 'users', 'userloginattempt'),
(38, 'users', 'passwordhistory'),
(39, 'users', 'usersession'),
(40, 'users', 'usertotp'),
(41, 'users', 'passwordresetotp');

-- --------------------------------------------------------
-- Table structure for `auth_group_permissions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `auth_group_permissions`;
CREATE TABLE IF NOT EXISTS `auth_group_permissions` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `group_id` INT NOT NULL,
  `permission_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `auth_permission`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `auth_permission`;
CREATE TABLE IF NOT EXISTS `auth_permission` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `content_type_id` INT NOT NULL,
  `codename` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `auth_permission`
INSERT INTO `auth_permission` (`id`, `content_type_id`, `codename`, `name`) VALUES
(1, 1, 'add_logentry', 'Can add log entry'),
(2, 1, 'change_logentry', 'Can change log entry'),
(3, 1, 'delete_logentry', 'Can delete log entry'),
(4, 1, 'view_logentry', 'Can view log entry'),
(5, 2, 'add_permission', 'Can add permission'),
(6, 2, 'change_permission', 'Can change permission'),
(7, 2, 'delete_permission', 'Can delete permission'),
(8, 2, 'view_permission', 'Can view permission'),
(9, 3, 'add_group', 'Can add group'),
(10, 3, 'change_group', 'Can change group'),
(11, 3, 'delete_group', 'Can delete group'),
(12, 3, 'view_group', 'Can view group'),
(13, 4, 'add_contenttype', 'Can add content type'),
(14, 4, 'change_contenttype', 'Can change content type'),
(15, 4, 'delete_contenttype', 'Can delete content type'),
(16, 4, 'view_contenttype', 'Can view content type'),
(17, 5, 'add_session', 'Can add session'),
(18, 5, 'change_session', 'Can change session'),
(19, 5, 'delete_session', 'Can delete session'),
(20, 5, 'view_session', 'Can view session'),
(21, 6, 'add_role', 'Can add role'),
(22, 6, 'change_role', 'Can change role'),
(23, 6, 'delete_role', 'Can delete role'),
(24, 6, 'view_role', 'Can view role'),
(25, 7, 'add_rolepermission', 'Can add role permission'),
(26, 7, 'change_rolepermission', 'Can change role permission'),
(27, 7, 'delete_rolepermission', 'Can delete role permission'),
(28, 7, 'view_rolepermission', 'Can view role permission'),
(29, 8, 'add_permission', 'Can add permission'),
(30, 8, 'change_permission', 'Can change permission'),
(31, 8, 'delete_permission', 'Can delete permission'),
(32, 8, 'view_permission', 'Can view permission'),
(33, 9, 'add_customuser', 'Can add custom user'),
(34, 9, 'change_customuser', 'Can change custom user'),
(35, 9, 'delete_customuser', 'Can delete custom user'),
(36, 9, 'view_customuser', 'Can view custom user'),
(37, 10, 'add_userpermission', 'Can add user permission'),
(38, 10, 'change_userpermission', 'Can change user permission'),
(39, 10, 'delete_userpermission', 'Can delete user permission'),
(40, 10, 'view_userpermission', 'Can view user permission'),
(41, 11, 'add_folder', 'Can add folder'),
(42, 11, 'change_folder', 'Can change folder'),
(43, 11, 'delete_folder', 'Can delete folder'),
(44, 11, 'view_folder', 'Can view folder'),
(45, 12, 'add_folderpermission', 'Can add folder permission'),
(46, 12, 'change_folderpermission', 'Can change folder permission'),
(47, 12, 'delete_folderpermission', 'Can delete folder permission'),
(48, 12, 'view_folderpermission', 'Can view folder permission'),
(49, 13, 'add_file', 'Can add file'),
(50, 13, 'change_file', 'Can change file'),
(51, 13, 'delete_file', 'Can delete file'),
(52, 13, 'view_file', 'Can view file'),
(53, 14, 'add_fileversion', 'Can add file version'),
(54, 14, 'change_fileversion', 'Can change file version'),
(55, 14, 'delete_fileversion', 'Can delete file version'),
(56, 14, 'view_fileversion', 'Can view file version'),
(57, 15, 'add_notification', 'Can add notification'),
(58, 15, 'change_notification', 'Can change notification'),
(59, 15, 'delete_notification', 'Can delete notification'),
(60, 15, 'view_notification', 'Can view notification'),
(61, 16, 'add_activitylog', 'Can add activity log'),
(62, 16, 'change_activitylog', 'Can change activity log'),
(63, 16, 'delete_activitylog', 'Can delete activity log'),
(64, 16, 'view_activitylog', 'Can view activity log'),
(65, 17, 'add_mourenewal', 'Can add mou renewal'),
(66, 17, 'change_mourenewal', 'Can change mou renewal'),
(67, 17, 'delete_mourenewal', 'Can delete mou renewal'),
(68, 17, 'view_mourenewal', 'Can view mou renewal'),
(69, 18, 'add_moudocument', 'Can add mou document'),
(70, 18, 'change_moudocument', 'Can change mou document'),
(71, 18, 'delete_moudocument', 'Can delete mou document'),
(72, 18, 'view_moudocument', 'Can view mou document'),
(73, 19, 'add_mou', 'Can add mou'),
(74, 19, 'change_mou', 'Can change mou'),
(75, 19, 'delete_mou', 'Can delete mou'),
(76, 19, 'view_mou', 'Can view mou'),
(77, 20, 'add_moutemplate', 'Can add mou template'),
(78, 20, 'change_moutemplate', 'Can change mou template'),
(79, 20, 'delete_moutemplate', 'Can delete mou template'),
(80, 20, 'view_moutemplate', 'Can view mou template'),
(81, 21, 'add_moushare', 'Can add mou share'),
(82, 21, 'change_moushare', 'Can change mou share'),
(83, 21, 'delete_moushare', 'Can delete mou share'),
(84, 21, 'view_moushare', 'Can view mou share'),
(85, 22, 'add_departmentsubmission', 'Can add department submission'),
(86, 22, 'change_departmentsubmission', 'Can change department submission'),
(87, 22, 'delete_departmentsubmission', 'Can delete department submission'),
(88, 22, 'view_departmentsubmission', 'Can view department submission'),
(89, 23, 'add_collaborationtype', 'Can add collaboration type'),
(90, 23, 'change_collaborationtype', 'Can change collaboration type'),
(91, 23, 'delete_collaborationtype', 'Can delete collaboration type'),
(92, 23, 'view_collaborationtype', 'Can view collaboration type'),
(93, 24, 'add_departmentcategory', 'Can add department category'),
(94, 24, 'change_departmentcategory', 'Can change department category'),
(95, 24, 'delete_departmentcategory', 'Can delete department category'),
(96, 24, 'view_departmentcategory', 'Can view department category'),
(97, 25, 'add_documenttype', 'Can add document type'),
(98, 25, 'change_documenttype', 'Can change document type'),
(99, 25, 'delete_documenttype', 'Can delete document type'),
(100, 25, 'view_documenttype', 'Can view document type'),
(101, 26, 'add_organizationtype', 'Can add organization type'),
(102, 26, 'change_organizationtype', 'Can change organization type'),
(103, 26, 'delete_organizationtype', 'Can delete organization type'),
(104, 26, 'view_organizationtype', 'Can view organization type'),
(105, 27, 'add_tag', 'Can add tag'),
(106, 27, 'change_tag', 'Can change tag'),
(107, 27, 'delete_tag', 'Can delete tag'),
(108, 27, 'view_tag', 'Can view tag'),
(109, 28, 'add_templatecategory', 'Can add template category'),
(110, 28, 'change_templatecategory', 'Can change template category'),
(111, 28, 'delete_templatecategory', 'Can delete template category'),
(112, 28, 'view_templatecategory', 'Can view template category'),
(113, 29, 'add_department', 'Can add department'),
(114, 29, 'change_department', 'Can change department'),
(115, 29, 'delete_department', 'Can delete department'),
(116, 29, 'view_department', 'Can view department'),
(117, 30, 'add_templatecollection', 'Can add template collection'),
(118, 30, 'change_templatecollection', 'Can change template collection'),
(119, 30, 'delete_templatecollection', 'Can delete template collection'),
(120, 30, 'view_templatecollection', 'Can view template collection'),
(121, 31, 'add_templatedocument', 'Can add template document'),
(122, 31, 'change_templatedocument', 'Can change template document'),
(123, 31, 'delete_templatedocument', 'Can delete template document'),
(124, 31, 'view_templatedocument', 'Can view template document'),
(125, 32, 'add_userinvitation', 'Can add user invitation'),
(126, 32, 'change_userinvitation', 'Can change user invitation'),
(127, 32, 'delete_userinvitation', 'Can delete user invitation'),
(128, 32, 'view_userinvitation', 'Can view user invitation'),
(129, 33, 'add_smtpsetting', 'Can add smtp setting'),
(130, 33, 'change_smtpsetting', 'Can change smtp setting'),
(131, 33, 'delete_smtpsetting', 'Can delete smtp setting'),
(132, 33, 'view_smtpsetting', 'Can view smtp setting'),
(133, 34, 'add_googledrivesetting', 'Can add google drive setting'),
(134, 34, 'change_googledrivesetting', 'Can change google drive setting'),
(135, 34, 'delete_googledrivesetting', 'Can delete google drive setting'),
(136, 34, 'view_googledrivesetting', 'Can view google drive setting'),
(137, 35, 'add_folderview', 'Can add folder view'),
(138, 35, 'change_folderview', 'Can change folder view'),
(139, 35, 'delete_folderview', 'Can delete folder view'),
(140, 35, 'view_folderview', 'Can view folder view'),
(141, 36, 'add_moucategory', 'Can add mou category'),
(142, 36, 'change_moucategory', 'Can change mou category'),
(143, 36, 'delete_moucategory', 'Can delete mou category'),
(144, 36, 'view_moucategory', 'Can view mou category'),
(145, 37, 'add_userloginattempt', 'Can add user login attempt'),
(146, 37, 'change_userloginattempt', 'Can change user login attempt'),
(147, 37, 'delete_userloginattempt', 'Can delete user login attempt'),
(148, 37, 'view_userloginattempt', 'Can view user login attempt'),
(149, 38, 'add_passwordhistory', 'Can add password history'),
(150, 38, 'change_passwordhistory', 'Can change password history'),
(151, 38, 'delete_passwordhistory', 'Can delete password history'),
(152, 38, 'view_passwordhistory', 'Can view password history'),
(153, 39, 'add_usersession', 'Can add user session'),
(154, 39, 'change_usersession', 'Can change user session'),
(155, 39, 'delete_usersession', 'Can delete user session'),
(156, 39, 'view_usersession', 'Can view user session'),
(157, 40, 'add_usertotp', 'Can add user totp'),
(158, 40, 'change_usertotp', 'Can change user totp'),
(159, 40, 'delete_usertotp', 'Can delete user totp'),
(160, 40, 'view_usertotp', 'Can view user totp'),
(161, 41, 'add_passwordresetotp', 'Can add password reset otp'),
(162, 41, 'change_passwordresetotp', 'Can change password reset otp'),
(163, 41, 'delete_passwordresetotp', 'Can delete password reset otp'),
(164, 41, 'view_passwordresetotp', 'Can view password reset otp');

-- --------------------------------------------------------
-- Table structure for `auth_group`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `auth_group`;
CREATE TABLE IF NOT EXISTS `auth_group` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `users_customuser_groups`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users_customuser_groups`;
CREATE TABLE IF NOT EXISTS `users_customuser_groups` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `customuser_id` INT NOT NULL,
  `group_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `users_customuser_user_permissions`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users_customuser_user_permissions`;
CREATE TABLE IF NOT EXISTS `users_customuser_user_permissions` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `customuser_id` INT NOT NULL,
  `permission_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `users_userpermission`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users_userpermission`;
CREATE TABLE IF NOT EXISTS `users_userpermission` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `is_granted` TINYINT(1) NOT NULL,
  `permission_id` INT NOT NULL,
  `user_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `users_userpermission`
INSERT INTO `users_userpermission` (`id`, `is_granted`, `permission_id`, `user_id`) VALUES
(2, 1, 1, 4);

-- --------------------------------------------------------
-- Table structure for `activity_logs_activitylog`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `activity_logs_activitylog`;
CREATE TABLE IF NOT EXISTS `activity_logs_activitylog` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `action` LONGTEXT NOT NULL,
  `module` VARCHAR(100) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `ip_address` LONGTEXT NULL,
  `user_id` INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `django_admin_log`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `django_admin_log`;
CREATE TABLE IF NOT EXISTS `django_admin_log` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `object_id` LONGTEXT NULL,
  `object_repr` VARCHAR(200) NOT NULL,
  `action_flag` INT NOT NULL,
  `change_message` LONGTEXT NOT NULL,
  `content_type_id` INT NULL,
  `user_id` INT NOT NULL,
  `action_time` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `django_session`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `django_session`;
CREATE TABLE IF NOT EXISTS `django_session` (
  `session_key` VARCHAR(40) NOT NULL PRIMARY KEY,
  `session_data` LONGTEXT NOT NULL,
  `expire_date` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `django_session`
INSERT INTO `django_session` (`session_key`, `session_data`, `expire_date`) VALUES
('qrt7go2jv4013oy5igmiuo1nikplt2mr', '.eJxVjMsOgjAQAP9lz6bpSp8cvfMNzW63WNRAQuFk_HdDwkGvM5N5Q6J9q2lvZU2TQA8Il1_GlJ9lPoQ8aL4vKi_ztk6sjkSdtqlhkfK6ne3foFKr0EMs6BC1F9dxCYRjIGeRcigUJLP3hNIZ0TEKY0DNNFox3TWiNmw5wucL6MA38w:1wpGob:D_rKrxUmJZlW8mBmaOgJre7b49kocBVjWuvfKIcwb2c', '2026-08-13 02:48:09.668189');

-- --------------------------------------------------------
-- Table structure for `notifications_notification`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `notifications_notification`;
CREATE TABLE IF NOT EXISTS `notifications_notification` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `description` LONGTEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `user_id` INT NOT NULL,
  `metadata` LONGTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `mous_mou`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_mou`;
CREATE TABLE IF NOT EXISTS `mous_mou` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `mou_number` VARCHAR(100) NOT NULL,
  `partner_organization` VARCHAR(255) NOT NULL,
  `department_name` VARCHAR(255) NULL,
  `effective_date` DATE NULL,
  `signed_date` DATE NULL,
  `expiry_date` DATE NULL,
  `duration_months` INT NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `summary` LONGTEXT NULL,
  `purpose` LONGTEXT NULL,
  `objectives` LONGTEXT NULL,
  `beneficiaries` LONGTEXT NULL,
  `opportunities` LONGTEXT NULL,
  `custom_fields_data` LONGTEXT NULL,
  `coordinator_name` VARCHAR(255) NULL,
  `coordinator_designation` VARCHAR(255) NULL,
  `coordinator_email` VARCHAR(254) NULL,
  `coordinator_phone` VARCHAR(50) NULL,
  `partner_name` VARCHAR(255) NULL,
  `partner_designation` VARCHAR(255) NULL,
  `partner_email` VARCHAR(254) NULL,
  `partner_phone` VARCHAR(50) NULL,
  `additional_notes` LONGTEXT NULL,
  `remarks` LONGTEXT NULL,
  `version_number` INT NOT NULL,
  `is_renewed` TINYINT(1) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `created_by_id` INT NULL,
  `department_id` INT NULL,
  `original_mou_id` INT NULL,
  `renewed_from_id` INT NULL,
  `signed_mou_id` INT NULL,
  `mou_type_id` INT NULL,
  `mou_file` VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_mou`
INSERT INTO `mous_mou` (`id`, `title`, `mou_number`, `partner_organization`, `department_name`, `effective_date`, `signed_date`, `expiry_date`, `duration_months`, `status`, `summary`, `purpose`, `objectives`, `beneficiaries`, `opportunities`, `custom_fields_data`, `coordinator_name`, `coordinator_designation`, `coordinator_email`, `coordinator_phone`, `partner_name`, `partner_designation`, `partner_email`, `partner_phone`, `additional_notes`, `remarks`, `version_number`, `is_renewed`, `created_at`, `updated_at`, `created_by_id`, `department_id`, `original_mou_id`, `renewed_from_id`, `signed_mou_id`, `mou_type_id`, `mou_file`) VALUES
(1, 'ABC Technologies Internship Agreement', 'MOU-2026-0001', 'ABC Tech Corp', 'Engineering', NULL, '2026-01-15', '2027-01-15', 12, 'Active', 'Strategic partnership agreement with ABC Tech Corp for internship opportunities.', 'To enhance student exposure and practical training in Engineering.', NULL, '["Students", "Faculty", "Institution"]', '["Internship", "Placement", "Training"]', '{}', 'Dr. Robert Smith', NULL, 'r.smith@college.edu', NULL, 'Sarah Jenkins', NULL, 'contact@abctechcorp.com', NULL, NULL, NULL, 1, 0, '2026-07-24 08:46:11.405730', '2026-07-24 08:46:11.405747', 2, NULL, NULL, NULL, NULL, 1, NULL),
(2, 'IIT Bombay Joint Research Initiative', 'MOU-2026-0002', 'IIT Bombay', 'Medical', NULL, '2025-08-10', '2027-08-10', 24, 'Active', 'Strategic partnership agreement with IIT Bombay for research opportunities.', 'To enhance student exposure and practical training in Medical.', NULL, '["Students", "Faculty", "Institution"]', '["Internship", "Placement", "Training"]', '{}', 'Dr. Robert Smith', NULL, 'r.smith@college.edu', NULL, 'Sarah Jenkins', NULL, 'contact@iitbombay.com', NULL, NULL, NULL, 1, 0, '2026-07-24 08:46:11.423329', '2026-07-24 08:46:11.423347', 2, NULL, NULL, NULL, NULL, 3, NULL),
(3, 'Infosys Placement & Recruitment Drive', 'MOU-2026-0003', 'Infosys Ltd', 'Engineering', NULL, '2026-07-01', '2027-07-01', 12, 'Pending Verification', 'Strategic partnership agreement with Infosys Ltd for placement opportunities.', 'To enhance student exposure and practical training in Engineering.', NULL, '["Students", "Faculty", "Institution"]', '["Internship", "Placement", "Training"]', '{}', 'Dr. Robert Smith', NULL, 'r.smith@college.edu', NULL, 'Sarah Jenkins', NULL, 'contact@infosysltd.com', NULL, NULL, NULL, 1, 0, '2026-07-24 08:46:11.436965', '2026-07-24 08:46:11.436984', 2, NULL, NULL, NULL, NULL, 2, NULL),
(4, 'TATA Motors Industrial Training', 'MOU-2026-0004', 'TATA Motors', 'Commerce', NULL, '2026-02-01', '2026-08-07', 6, 'Active', 'Strategic partnership agreement with TATA Motors for industry collaboration opportunities.', 'To enhance student exposure and practical training in Commerce.', NULL, '["Students", "Faculty", "Institution"]', '["Internship", "Placement", "Training"]', '{}', 'Dr. Robert Smith', NULL, 'r.smith@college.edu', NULL, 'Sarah Jenkins', NULL, 'contact@tatamotors.com', NULL, NULL, NULL, 1, 0, '2026-07-24 08:46:11.452558', '2026-07-24 08:46:11.452577', 2, NULL, NULL, NULL, NULL, 4, NULL),
(5, 'IT Wing (TVK)', 'MOU-2026-0005', 'Paul Renine', 'Commerce', NULL, '2026-07-27', '2027-07-27', 12, 'Pending Verification', 'paul renine fund', '', NULL, '["Students", "Faculty"]', '["Internship", "Placement"]', '{"duration": "12", "students_count": "10", "stipend": "12000"}', 'feminna mam', NULL, 'femeinna@mcc.edu.in', NULL, 'paul renine', NULL, '', NULL, NULL, NULL, 1, 1, '2026-07-27 05:28:36.558045', '2026-07-27 05:31:59.234830', 3, NULL, NULL, NULL, NULL, 1, NULL),
(6, 'IT Wing (TVK) (Renewed)', 'MOU-2026-0006', 'Paul Renine', 'Commerce', NULL, NULL, NULL, 12, 'Draft', 'paul renine fund', '', NULL, '["Students", "Faculty"]', '["Internship", "Placement"]', '{}', 'feminna mam', NULL, 'femeinna@mcc.edu.in', NULL, 'paul renine', NULL, '', NULL, NULL, NULL, 2, 0, '2026-07-27 05:29:18.632687', '2026-07-27 05:29:18.632748', 3, NULL, NULL, 5, NULL, 1, NULL),
(7, 'Google Placement & Workshop Agreement', 'MOU-2026-0007', 'Google LLC', 'Engineering', NULL, NULL, NULL, 12, 'Shared', 'Strategic recruitment and workshop partnership.', '', NULL, '["Students", "Faculty"]', '["Internship", "Placement"]', '{"target_programs": "CSE and ECE", "package": "24 LPA", "mentorship_hours": "40 Hours"}', '', NULL, '', NULL, '', NULL, '', NULL, NULL, NULL, 1, 0, '2026-07-27 06:00:09.063100', '2026-07-27 06:00:09.063346', 2, NULL, NULL, NULL, NULL, 2, NULL),
(8, 'Test MOU Agreement', 'MOU-TEST-999', 'Acme Corp', NULL, NULL, NULL, NULL, 12, 'Draft', NULL, NULL, NULL, '[]', '[]', '{}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0, '2026-07-28 03:22:58.297338', '2026-07-28 03:22:58.297388', 6, NULL, NULL, NULL, NULL, 5, NULL);

-- --------------------------------------------------------
-- Table structure for `mous_moudocument`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_moudocument`;
CREATE TABLE IF NOT EXISTS `mous_moudocument` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `document_type` VARCHAR(50) NOT NULL,
  `uploaded_at` DATETIME NOT NULL,
  `file_id` INT NOT NULL,
  `mou_id` INT NOT NULL,
  `uploaded_by_id` INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `mous_mourenewal`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_mourenewal`;
CREATE TABLE IF NOT EXISTS `mous_mourenewal` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `renewed_at` DATETIME NOT NULL,
  `notes` LONGTEXT NULL,
  `original_mou_id` INT NOT NULL,
  `renewed_by_id` INT NULL,
  `renewed_mou_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_mourenewal`
INSERT INTO `mous_mourenewal` (`id`, `renewed_at`, `notes`, `original_mou_id`, `renewed_by_id`, `renewed_mou_id`) VALUES
(1, '2026-07-27 05:29:18.692259', '', 5, 3, 6);

-- --------------------------------------------------------
-- Table structure for `mous_moutemplate`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_moutemplate`;
CREATE TABLE IF NOT EXISTS `mous_moutemplate` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` LONGTEXT NULL,
  `template_notes` LONGTEXT NULL,
  `fields_schema` LONGTEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `created_by_id` INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_moutemplate`
INSERT INTO `mous_moutemplate` (`id`, `name`, `description`, `template_notes`, `fields_schema`, `is_active`, `created_at`, `updated_at`, `created_by_id`) VALUES
(1, 'Internship', 'MOU template for student industrial internship & practical training programs', 'Standard Internship template notes for coordinators.', '[{"name": "duration", "label": "Duration (Months)", "type": "number"}, {"name": "students_count", "label": "Eligible Students", "type": "number"}, {"name": "stipend", "label": "Monthly Stipend", "type": "text"}]', 1, '2026-07-24 08:46:11.339489', '2026-07-24 08:46:11.339521', NULL),
(2, 'Placement', 'Template for campus recruitment and placement partnerships', 'Standard Placement template notes for coordinators.', '[{"name": "eligible_depts", "label": "Eligible Departments", "type": "text"}, {"name": "package", "label": "Expected CTC Package", "type": "text"}, {"name": "selection_process", "label": "Selection Process", "type": "text"}]', 1, '2026-07-24 08:46:11.356011', '2026-07-24 08:46:11.356031', NULL),
(3, 'Research', 'Joint research collaboration, funding, & IP agreements', 'Standard Research template notes for coordinators.', '[{"name": "funding", "label": "Funding Amount ($)", "type": "text"}, {"name": "research_area", "label": "Research Domain", "type": "text"}, {"name": "principal_investigator", "label": "Principal Investigator", "type": "text"}]', 1, '2026-07-24 08:46:11.371061', '2026-07-24 08:46:11.371084', NULL),
(4, 'Industry Collaboration', 'General industry-academia partnership for workshops and labs', 'Standard Industry Collaboration template notes for coordinators.', '[{"name": "lab_setup", "label": "Co-Branded Lab Setup", "type": "text"}, {"name": "mentor", "label": "Industry Mentor", "type": "text"}]', 1, '2026-07-24 08:46:11.387934', '2026-07-24 08:46:11.387961', NULL),
(5, 'Test MOU Template', NULL, NULL, '[]', 1, '2026-07-28 03:22:58.276410', '2026-07-28 03:22:58.276462', NULL),
(6, 'Default Verification Template', NULL, NULL, '[]', 1, '2026-07-28 03:25:55.153641', '2026-07-28 03:25:55.153688', NULL);

-- --------------------------------------------------------
-- Table structure for `mous_departmentsubmission`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_departmentsubmission`;
CREATE TABLE IF NOT EXISTS `mous_departmentsubmission` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `signed_date` DATE NOT NULL,
  `mou_month` VARCHAR(20) NOT NULL,
  `mou_year` INT NOT NULL,
  `summary` LONGTEXT NOT NULL,
  `purpose` LONGTEXT NOT NULL,
  `benefits` LONGTEXT NOT NULL,
  `remarks` LONGTEXT NULL,
  `uploaded_at` DATETIME NOT NULL,
  `review_status` VARCHAR(50) NOT NULL,
  `reviewer_comments` LONGTEXT NULL,
  `department_id` INT NULL,
  `mou_id` INT NOT NULL,
  `signed_file_id` INT NULL,
  `uploaded_by_id` INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `mous_moushare`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_moushare`;
CREATE TABLE IF NOT EXISTS `mous_moushare` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `permission` VARCHAR(50) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `shared_at` DATETIME NOT NULL,
  `department_id` INT NULL,
  `mou_id` INT NOT NULL,
  `shared_by_id` INT NULL,
  `user_id` INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `mous_collaborationtype`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_collaborationtype`;
CREATE TABLE IF NOT EXISTS `mous_collaborationtype` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_collaborationtype`
INSERT INTO `mous_collaborationtype` (`id`, `name`, `is_active`) VALUES
(1, 'Internship', 1),
(2, 'Placement', 1),
(3, 'Research', 1),
(4, 'Training', 1),
(5, 'Faculty Exchange', 1),
(6, 'Student Exchange', 1),
(7, 'Sponsored Project', 1),
(8, 'Consultancy', 1),
(9, 'Skill Development', 1),
(10, 'Joint Research', 1),
(11, 'Industrial Visit', 1),
(12, 'Laboratory Sharing', 1),
(13, 'Other', 1);

-- --------------------------------------------------------
-- Table structure for `mous_departmentcategory`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_departmentcategory`;
CREATE TABLE IF NOT EXISTS `mous_departmentcategory` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_departmentcategory`
INSERT INTO `mous_departmentcategory` (`id`, `name`, `is_active`) VALUES
(1, 'Aided', 1),
(2, 'Self-Financed (SFS)', 1),
(3, 'Other / Administrative Units', 1);

-- --------------------------------------------------------
-- Table structure for `mous_documenttype`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_documenttype`;
CREATE TABLE IF NOT EXISTS `mous_documenttype` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_documenttype`
INSERT INTO `mous_documenttype` (`id`, `name`, `is_active`) VALUES
(1, 'Main MOU', 1),
(2, 'Annexure', 1),
(3, 'Addendum', 1),
(4, 'Renewal', 1),
(5, 'Legal Copy', 1),
(6, 'Draft', 1),
(7, 'Final Copy', 1);

-- --------------------------------------------------------
-- Table structure for `mous_organizationtype`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_organizationtype`;
CREATE TABLE IF NOT EXISTS `mous_organizationtype` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_organizationtype`
INSERT INTO `mous_organizationtype` (`id`, `name`, `is_active`) VALUES
(1, 'IT Company', 1),
(2, 'University', 1),
(3, 'Government', 1),
(4, 'Private Company', 1),
(5, 'NGO', 1),
(6, 'Research Institute', 1),
(7, 'Startup', 1),
(8, 'Industry', 1),
(9, 'Hospital', 1),
(10, 'School', 1),
(11, 'College', 1);

-- --------------------------------------------------------
-- Table structure for `mous_tag`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_tag`;
CREATE TABLE IF NOT EXISTS `mous_tag` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_tag`
INSERT INTO `mous_tag` (`id`, `name`, `is_active`) VALUES
(1, 'Urgent', 1),
(2, 'Draft', 1),
(3, 'Approved', 1),
(4, 'Standard', 1),
(5, 'International', 1);

-- --------------------------------------------------------
-- Table structure for `mous_templatecategory`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_templatecategory`;
CREATE TABLE IF NOT EXISTS `mous_templatecategory` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_templatecategory`
INSERT INTO `mous_templatecategory` (`id`, `name`, `is_active`) VALUES
(1, 'Industry', 1),
(2, 'Research', 1),
(3, 'Academic', 1),
(4, 'International', 1),
(5, 'Placement', 1),
(6, 'Internship', 1),
(7, 'Government', 1),
(8, 'NGO', 1),
(9, 'Consultancy', 1),
(10, 'Exchange Programme', 1),
(11, 'MoA', 1),
(12, 'MoU', 1),
(17, 'Test Category', 1);

-- --------------------------------------------------------
-- Table structure for `mous_department`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_department`;
CREATE TABLE IF NOT EXISTS `mous_department` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL,
  `category_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_department`
INSERT INTO `mous_department` (`id`, `name`, `is_active`, `category_id`) VALUES
(1, 'English (Aided)', 1, 1),
(2, 'Tamil (Aided)', 1, 1),
(3, 'Languages (Aided)', 1, 1),
(4, 'History (Aided)', 1, 1),
(5, 'Political Science (Aided)', 1, 1),
(6, 'Public Administration (Aided)', 1, 1),
(7, 'Economics (Aided)', 1, 1),
(8, 'Philosophy (Aided)', 1, 1),
(9, 'Commerce (Aided)', 1, 1),
(10, 'Social Work (Aided)', 1, 1),
(11, 'Mathematics (Aided)', 1, 1),
(12, 'Statistics (Aided)', 1, 1),
(13, 'Physics (Aided)', 1, 1),
(14, 'Chemistry (Aided)', 1, 1),
(15, 'Botany (Aided)', 1, 1),
(16, 'Zoology (Aided)', 1, 1),
(17, 'Physical Education (Aided)', 1, 1),
(18, 'English (SFS)', 1, 2),
(19, 'Tamil (SFS)', 1, 2),
(20, 'Languages (SFS)', 1, 2),
(21, 'Journalism (SFS)', 1, 2),
(22, 'Social Work (SFS)', 1, 2),
(23, 'Commerce (SFS)', 1, 2),
(24, 'Business Administration (BBA) (SFS)', 1, 2),
(25, 'Communication (SFS)', 1, 2),
(26, 'Geography (SFS)', 1, 2),
(27, 'Tourism Studies (SFS)', 1, 2),
(28, 'Mathematics (SFS)', 1, 2),
(29, 'Physics (SFS)', 1, 2),
(30, 'Chemistry (SFS)', 1, 2),
(31, 'Microbiology (SFS)', 1, 2),
(32, 'Computer Application (BCA) (SFS)', 1, 2),
(33, 'Computer Science (SFS)', 1, 2),
(34, 'Master of Computer Applications (MCA) (SFS)', 1, 2),
(35, 'Visual Communication (SFS)', 1, 2),
(36, 'Psychology (SFS)', 1, 2),
(37, 'Data Science (SFS)', 1, 2),
(38, 'Principal Office', 1, 3),
(39, 'Administration Office', 1, 3),
(40, 'Controller of Examinations', 1, 3),
(41, 'IQAC', 1, 3),
(42, 'Library', 1, 3),
(43, 'Placement Cell', 1, 3),
(44, 'Research Centre', 1, 3),
(45, 'Institute for Advanced Christian Studies', 1, 3),
(46, 'Institute for Administrative Service Coaching', 1, 3),
(47, 'Centre for Women''s Studies', 1, 3),
(48, 'Centre for Peace Studies', 1, 3),
(49, 'Entrepreneurship Development Cell', 1, 3),
(50, 'Institution Innovation Council (IIC)', 1, 3),
(51, 'Self-Financed Stream Office', 1, 3);

-- --------------------------------------------------------
-- Table structure for `mous_templatecollection`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_templatecollection`;
CREATE TABLE IF NOT EXISTS `mous_templatecollection` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `template_name` VARCHAR(255) NOT NULL,
  `description` LONGTEXT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `category_id` INT NOT NULL,
  `collaboration_type_id` INT NOT NULL,
  `created_by_id` INT NULL,
  `department_id` INT NOT NULL,
  `department_category_id` INT NOT NULL,
  `organization_type_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_templatecollection`
INSERT INTO `mous_templatecollection` (`id`, `template_name`, `description`, `created_at`, `updated_at`, `category_id`, `collaboration_type_id`, `created_by_id`, `department_id`, `department_category_id`, `organization_type_id`) VALUES
(1, 'Research Cooperation MOU', 'Partnerships for academic research funding', '2026-07-27 09:19:42.134029', '2026-07-27 09:19:42.136383', 2, 3, 2, 13, 1, 2),
(2, 'Commercial Leasing Agreement Template', 'Standard template for leasing commercial property', '2026-07-27 09:35:49.602800', '2026-07-27 09:35:49.604111', 12, 13, 2, 39, 3, 4);

-- --------------------------------------------------------
-- Table structure for `mous_templatecollection_tags`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_templatecollection_tags`;
CREATE TABLE IF NOT EXISTS `mous_templatecollection_tags` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `templatecollection_id` INT NOT NULL,
  `tag_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `mous_templatedocument`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_templatedocument`;
CREATE TABLE IF NOT EXISTS `mous_templatedocument` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `document_name` VARCHAR(255) NOT NULL,
  `version` VARCHAR(50) NOT NULL,
  `effective_date` DATE NULL,
  `expiry_date` DATE NULL,
  `revision_date` DATE NULL,
  `remarks` LONGTEXT NULL,
  `uploaded_at` DATETIME NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `document_type_id` INT NOT NULL,
  `template_collection_id` INT NOT NULL,
  `uploaded_by_id` INT NULL,
  `google_file_id` VARCHAR(255) NULL,
  `file_path` VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `folders_folderpermission`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `folders_folderpermission`;
CREATE TABLE IF NOT EXISTS `folders_folderpermission` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `is_granted` TINYINT(1) NOT NULL,
  `folder_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `can_delete_own_uploads` TINYINT(1) NOT NULL,
  `can_download` TINYINT(1) NOT NULL,
  `can_read` TINYINT(1) NOT NULL,
  `can_upload` TINYINT(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `folders_folderpermission`
INSERT INTO `folders_folderpermission` (`id`, `is_granted`, `folder_id`, `user_id`, `can_delete_own_uploads`, `can_download`, `can_read`, `can_upload`) VALUES
(1, 1, 1, 4, 0, 1, 1, 0),
(3, 1, 8, 4, 1, 1, 1, 1),
(4, 1, 16, 4, 1, 1, 1, 1);

-- --------------------------------------------------------
-- Table structure for `users_userinvitation`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users_userinvitation`;
CREATE TABLE IF NOT EXISTS `users_userinvitation` (
  `id` LONGTEXT NOT NULL PRIMARY KEY,
  `email` VARCHAR(254) NOT NULL,
  `stream` VARCHAR(100) NOT NULL,
  `department` VARCHAR(100) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) NOT NULL,
  `is_cancelled` TINYINT(1) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `accepted_at` DATETIME NULL,
  `ip_address` LONGTEXT NULL,
  `user_agent` LONGTEXT NULL,
  `created_by_id` INT NULL,
  `system_role_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `users_userinvitation`
INSERT INTO `users_userinvitation` (`id`, `email`, `stream`, `department`, `token`, `expires_at`, `is_used`, `is_cancelled`, `created_at`, `accepted_at`, `ip_address`, `user_agent`, `created_by_id`, `system_role_id`) VALUES
('c1ab46641bc44ae9bce83ed18dd7f82a', 'somusuraj72@gmail.com', '', '', 'eyJlbWFpbCI6InNvbXVzdXJhajcyQGdtYWlsLmNvbSIsInN0cmVhbSI6IiIsImRlcGFydG1lbnQiOiIiLCJyb2xlX2lkIjozLCJleHBpcmVzX2F0IjoiMjAyNi0wOC0wNVQwNTowNToxMS44MzU1NTQrMDA6MDAifQ:1wr7Kx:y8tHMarK7JwV61nZfFk1xmmwFR4fCHnudw_zrr2PSSQ', '2026-08-05 05:05:11.835554', 1, 0, '2026-08-04 05:05:11.845569', '2026-08-04 05:06:59.126502', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36 Edg/151.0.0.0', 1, 3);

-- --------------------------------------------------------
-- Table structure for `folders_folder`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `folders_folder`;
CREATE TABLE IF NOT EXISTS `folders_folder` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `created_by_id` INT NULL,
  `google_folder_id` VARCHAR(255) NULL,
  `expiry_date` DATE NULL,
  `summary` LONGTEXT NULL,
  `status` VARCHAR(50) NOT NULL,
  `parent_id` INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `folders_folder`
INSERT INTO `folders_folder` (`id`, `name`, `created_at`, `updated_at`, `created_by_id`, `google_folder_id`, `expiry_date`, `summary`, `status`, `parent_id`) VALUES
(1, 'jefferson personal', '2026-07-23 10:24:13.041634', '2026-07-23 10:24:13.041692', 1, NULL, NULL, NULL, 'Active', NULL),
(2, 'Policies', '2026-07-24 06:30:27.775494', '2026-07-24 06:30:27.775622', 2, NULL, NULL, NULL, 'Active', NULL),
(3, 'mou', '2026-07-24 07:29:00.555740', '2026-07-24 07:29:00.555805', 1, NULL, NULL, NULL, 'Active', 2),
(4, 'medway mou', '2026-07-28 08:03:00', '2026-07-28 02:33:28.055927', 2, NULL, NULL, NULL, 'Active', NULL),
(5, 'medway mou', '2026-07-28 08:03:00', '2026-07-28 02:33:35.153480', 2, NULL, NULL, NULL, 'Active', NULL),
(8, 'General', '2026-07-28 03:22:58.721184', '2026-07-28 03:22:58.721232', 6, NULL, NULL, NULL, 'Active', NULL),
(15, 'Test MOU Agreement 78a4', '2026-07-28 03:26:02.041329', '2026-07-28 03:26:02.041388', 6, NULL, NULL, NULL, 'Active', 8),
(16, 'Jefferson', '2026-07-28 07:08:27.604459', '2026-07-28 07:08:27.604536', 1, '1MlDfN0LzRcSChFfUGrdcTdlK72LFERu8', NULL, NULL, 'Active', NULL),
(17, 'sub_folder', '2026-07-28 07:11:31.293015', '2026-07-28 07:11:31.293091', 1, '18FfO5OcfAfOk9uKHL1ZyrWojzDiMHqi5', NULL, NULL, 'Active', 16),
(18, 'audi internship', '2026-07-31 14:20:00', '2026-07-31 08:50:32.597545', 1, 'drive_folder_1cd6407f22ad', '2026-12-20', 'internship for 50 students', 'Active', NULL),
(19, 'MCC Legal Documents', '2026-08-03 04:32:23.489914', '2026-08-03 04:32:23.489946', 1, '1kvzw2TAseQgfTEf0ExELBgSaRVfEoSr0', NULL, NULL, 'Active', NULL),
(21, 'Renine', '2026-08-04 06:13:15.150238', '2026-08-04 06:13:15.150290', 8, '1ZbNwsYqhE6riC47TdhXWubcfJQyPo1Vq', NULL, NULL, 'Active', NULL),
(22, 'MCA (Comuputer Application)', '2026-08-04 06:13:15.162970', '2026-08-04 06:13:15.163000', 8, '1bsme27EZ04QwaaHwWxPlaoHQWxA7iAUk', NULL, NULL, 'Active', NULL),
(23, 'Jeff2', '2026-08-04 06:13:15.177168', '2026-08-04 06:13:15.177210', 8, '1tgwbp0b9aYOnmXSUvIo8rRz69wmpYbf5', NULL, NULL, 'Active', NULL);

-- --------------------------------------------------------
-- Table structure for `folders_folderview`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `folders_folderview`;
CREATE TABLE IF NOT EXISTS `folders_folderview` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `viewed_at` DATETIME NOT NULL,
  `folder_id` INT NOT NULL,
  `user_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `mous_moucategory`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `mous_moucategory`;
CREATE TABLE IF NOT EXISTS `mous_moucategory` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50) NULL,
  `color` VARCHAR(50) NOT NULL,
  `icon_type` VARCHAR(50) NOT NULL,
  `coordinator_name` VARCHAR(255) NULL,
  `coordinator_email` VARCHAR(254) NULL,
  `category_type` VARCHAR(50) NOT NULL,
  `is_active` TINYINT(1) NOT NULL,
  `created_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `mous_moucategory`
INSERT INTO `mous_moucategory` (`id`, `name`, `code`, `color`, `icon_type`, `coordinator_name`, `coordinator_email`, `category_type`, `is_active`, `created_at`) VALUES
(1, 'Engineering & CSE', 'ENG', '#3B82F6', 'school', 'Dr. Robert Smith', 'eng.mou@college.edu', 'Department', 1, '2026-08-03 07:34:15.875082'),
(2, 'Medical & Health Sciences', 'MED', '#14B8A6', 'hospital', 'Dr. Elena Vance', 'med.mou@college.edu', 'Department', 1, '2026-08-03 07:34:15.892566'),
(3, 'Commerce & Business Studies', 'COM', '#F59E0B', 'business', 'Prof. Marcus Vance', 'com.mou@college.edu', 'Department', 1, '2026-08-03 07:34:15.905286'),
(4, 'Arts & Humanities', 'ART', '#EC4899', 'palette', 'Dr. Clara Oswald', 'arts.mou@college.edu', 'Department', 1, '2026-08-03 07:34:15.919384'),
(5, 'Science & Technology', 'SCI', '#8B5CF6', 'science', 'Dr. Alan Grant', 'sci.mou@college.edu', 'Department', 1, '2026-08-03 07:34:15.932282'),
(6, 'School of Law & Policy', 'LAW', '#F97316', 'gavel', 'Prof. Harvey Specter', 'law.mou@college.edu', 'Department', 1, '2026-08-03 07:34:15.945138');

-- --------------------------------------------------------
-- Table structure for `files_file`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `files_file`;
CREATE TABLE IF NOT EXISTS `files_file` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `size` INT NOT NULL,
  `file_type` VARCHAR(100) NOT NULL,
  `file_field` VARCHAR(100) NULL,
  `version_number` INT NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `folder_id` INT NOT NULL,
  `uploaded_by_id` INT NULL,
  `file_size` INT NULL,
  `google_file_id` VARCHAR(255) NULL,
  `mime_type` VARCHAR(255) NULL,
  `web_content_link` VARCHAR(1000) NULL,
  `web_view_link` VARCHAR(1000) NULL,
  `is_signed` TINYINT(1) NOT NULL,
  `encrypted` TINYINT(1) NOT NULL,
  `encryption_key_id` VARCHAR(100) NOT NULL,
  `sha256_hash` VARCHAR(64) NULL,
  `virus_scan_status` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `files_file`
INSERT INTO `files_file` (`id`, `name`, `size`, `file_type`, `file_field`, `version_number`, `created_at`, `updated_at`, `folder_id`, `uploaded_by_id`, `file_size`, `google_file_id`, `mime_type`, `web_content_link`, `web_view_link`, `is_signed`, `encrypted`, `encryption_key_id`, `sha256_hash`, `virus_scan_status`) VALUES
(1, '_SOMU SUNDARAM (resume).pdf', 99521, 'application/pdf', 'folders/1/_SOMU_SUNDARAM_resume.pdf', 1, '2026-07-23 10:24:27.624178', '2026-07-23 10:24:27.624237', 1, 1, NULL, NULL, NULL, NULL, NULL, 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(2, '_SOMU SUNDARAM (resume).pdf', 99521, 'application/pdf', 'folders/2/_SOMU_SUNDARAM_resume.pdf', 1, '2026-07-24 07:28:28.600679', '2026-07-24 07:28:28.600878', 2, 1, NULL, NULL, NULL, NULL, NULL, 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(7, 'test_upload_agreement.pdf', 31, 'application/pdf', '', 1, '2026-07-28 06:27:16.175381', '2026-07-28 06:27:16.175419', 1, 1, 31, 'drive_file_c3c66d865a10', 'application/pdf', 'https://drive.google.com/drive/folders/1SUGWdsJ3JWBT0UYQ7o0iJSfanyXOivXx', 'https://drive.google.com/drive/folders/1SUGWdsJ3JWBT0UYQ7o0iJSfanyXOivXx', 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(8, 'Grade List Weekdays - Google Docs.pdf', 41508, 'application/pdf', '', 1, '2026-07-28 12:52:00', '2026-07-28 07:22:44.026251', 17, 2, 41508, 'drive_file_45e43552bce5', 'application/pdf', 'https://drive.google.com/drive/folders/18FfO5OcfAfOk9uKHL1ZyrWojzDiMHqi5', 'https://drive.google.com/drive/folders/18FfO5OcfAfOk9uKHL1ZyrWojzDiMHqi5', 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(9, 'Grade List Weekdays - Google Docs.pdf', 41508, 'application/pdf', '', 1, '2026-07-28 12:52:00', '2026-07-28 07:22:46.019165', 17, 2, 41508, 'drive_file_68eca770e197', 'application/pdf', 'https://drive.google.com/drive/folders/18FfO5OcfAfOk9uKHL1ZyrWojzDiMHqi5', 'https://drive.google.com/drive/folders/18FfO5OcfAfOk9uKHL1ZyrWojzDiMHqi5', 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(10, 'sample_folder_agreement.pdf', 48, 'application/pdf', '', 1, '2026-07-28 08:32:13.038627', '2026-07-28 08:32:13.038655', 16, 1, 48, 'drive_file_0b5792272033', 'application/pdf', 'https://drive.google.com/drive/folders/1MlDfN0LzRcSChFfUGrdcTdlK72LFERu8', 'https://drive.google.com/drive/folders/1MlDfN0LzRcSChFfUGrdcTdlK72LFERu8', 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(11, 'sample_root_document.pdf', 52, 'application/pdf', '', 1, '2026-07-28 08:32:15.851650', '2026-07-28 08:32:15.851690', 8, 1, 52, 'drive_file_240cda2c8510', 'application/pdf', 'https://drive.google.com/drive/folders/1SUGWdsJ3JWBT0UYQ7o0iJSfanyXOivXx', 'https://drive.google.com/drive/folders/1SUGWdsJ3JWBT0UYQ7o0iJSfanyXOivXx', 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(12, 'TRINITY EXAM.pdf', 39143, 'application/pdf', '', 1, '2026-07-28 14:19:00', '2026-07-28 08:49:12.230575', 17, 2, 39143, 'drive_file_a5afbb056070', 'application/pdf', 'https://drive.google.com/drive/folders/18FfO5OcfAfOk9uKHL1ZyrWojzDiMHqi5', 'https://drive.google.com/drive/folders/18FfO5OcfAfOk9uKHL1ZyrWojzDiMHqi5', 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(13, 'Your paragraph text.pdf', 49503, 'application/pdf', 'folders/8/Your_paragraph_text.pdf', 1, '2026-07-29 22:05:00', '2026-07-29 16:35:10.740236', 8, 4, 49503, '1jQ5INsOUUGUHh9COOHLtZcS8nqNQXZIo', 'application/pdf', 'https://drive.google.com/uc?id=1jQ5INsOUUGUHh9COOHLtZcS8nqNQXZIo&export=download', 'https://drive.google.com/file/d/1jQ5INsOUUGUHh9COOHLtZcS8nqNQXZIo/view?usp=drivesdk', 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(14, '_SOMU SUNDARAM (resume) (2).pdf', 100879, 'application/pdf', 'folders/8/_SOMU_SUNDARAM_resume_2.pdf', 1, '2026-07-30 08:44:00', '2026-07-30 03:14:48.457218', 8, 4, 100879, '1n6Dt_Lwnp6oEN7XD-J0uqA_LcmSyjL_V', 'application/pdf', 'https://drive.google.com/uc?id=1n6Dt_Lwnp6oEN7XD-J0uqA_LcmSyjL_V&export=download', 'https://drive.google.com/file/d/1n6Dt_Lwnp6oEN7XD-J0uqA_LcmSyjL_V/view?usp=drivesdk', 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(15, '_SOMU SUNDARAM (resume) (2).pdf', 100879, 'application/pdf', 'folders/8/_SOMU_SUNDARAM_resume_2_9nClimp.pdf', 1, '2026-07-30 08:44:00', '2026-07-30 03:14:56.075968', 8, 4, 100879, '1KIDfNiNt8Ex9PCKP_54RYfkj2diVYm-R', 'application/pdf', 'https://drive.google.com/uc?id=1KIDfNiNt8Ex9PCKP_54RYfkj2diVYm-R&export=download', 'https://drive.google.com/file/d/1KIDfNiNt8Ex9PCKP_54RYfkj2diVYm-R/view?usp=drivesdk', 0, 1, 'Google-Drive-AES-256', NULL, 'Pending'),
(16, '_SOMU SUNDARAM (resume) (2).pdf', 100879, 'application/pdf', 'folders/8/_SOMU_SUNDARAM_resume_2_zRm8LBG.pdf', 1, '2026-07-30 09:07:00', '2026-07-30 03:37:34.103431', 8, 4, 100879, '1yr9lo85eVMo7RQZwYtkXJet1_3wq0ZGO', 'application/pdf', 'https://drive.google.com/uc?id=1yr9lo85eVMo7RQZwYtkXJet1_3wq0ZGO&export=download', 'https://drive.google.com/file/d/1yr9lo85eVMo7RQZwYtkXJet1_3wq0ZGO/view?usp=drivesdk', 0, 1, 'Google-Drive-AES-256', NULL, 'Pending');

-- --------------------------------------------------------
-- Table structure for `files_fileversion`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `files_fileversion`;
CREATE TABLE IF NOT EXISTS `files_fileversion` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `version_number` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `size` INT NOT NULL,
  `file_type` VARCHAR(100) NOT NULL,
  `file_field` VARCHAR(100) NULL,
  `created_at` DATETIME NOT NULL,
  `file_id` INT NOT NULL,
  `uploaded_by_id` INT NULL,
  `google_file_id` VARCHAR(255) NULL,
  `encrypted` TINYINT(1) NOT NULL,
  `encryption_key_id` VARCHAR(100) NOT NULL,
  `sha256_hash` VARCHAR(64) NULL,
  `virus_scan_status` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `users_googledrivesetting`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users_googledrivesetting`;
CREATE TABLE IF NOT EXISTS `users_googledrivesetting` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `project_id` VARCHAR(255) NULL,
  `private_key_id` VARCHAR(255) NULL,
  `private_key` LONGTEXT NULL,
  `client_email` VARCHAR(254) NULL,
  `client_id` VARCHAR(255) NULL,
  `root_folder_id` VARCHAR(255) NULL,
  `type` VARCHAR(100) NOT NULL,
  `auth_uri` VARCHAR(200) NOT NULL,
  `token_uri` VARCHAR(200) NOT NULL,
  `auth_provider_x509_cert_url` VARCHAR(200) NOT NULL,
  `client_x509_cert_url` VARCHAR(500) NULL,
  `universe_domain` VARCHAR(100) NOT NULL,
  `is_active` TINYINT(1) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `access_token` LONGTEXT NULL,
  `client_secret` VARCHAR(500) NULL,
  `connected_email` VARCHAR(254) NULL,
  `refresh_token` LONGTEXT NULL,
  `storage_limit` INT NULL,
  `storage_usage` INT NULL,
  `token_expiry` DATETIME NULL,
  `connection_status` VARCHAR(50) NOT NULL,
  `default_upload_folder` VARCHAR(255) NULL,
  `last_connection_time` DATETIME NULL,
  `oauth_connected` TINYINT(1) NOT NULL,
  `token_data` LONGTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `users_googledrivesetting`
INSERT INTO `users_googledrivesetting` (`id`, `project_id`, `private_key_id`, `private_key`, `client_email`, `client_id`, `root_folder_id`, `type`, `auth_uri`, `token_uri`, `auth_provider_x509_cert_url`, `client_x509_cert_url`, `universe_domain`, `is_active`, `created_at`, `updated_at`, `access_token`, `client_secret`, `connected_email`, `refresh_token`, `storage_limit`, `storage_usage`, `token_expiry`, `connection_status`, `default_upload_folder`, `last_connection_time`, `oauth_connected`, `token_data`) VALUES
(1, 'MCC Legal Google Drive', NULL, NULL, NULL, '890503352102-mq76ok8p3kjibkcb7jocqrpd9hpupasu.apps.googleusercontent.com', '1v5kj8M_Ll2RXZaQuBJGoSWhq1IYb7n9u', 'service_account', 'https://accounts.google.com/o/oauth2/auth', 'https://oauth2.googleapis.com/token', 'https://www.googleapis.com/oauth2/v1/certs', NULL, 'googleapis.com', 1, '2026-08-03 08:52:52.915807', '2026-08-04 06:37:14.842915', 'gAAAAABqcYiaajMaU7KyJe8uBfTapse5pHNLlEcC20siHHJt-EgpE7Qifdg1EGFpHGbwxc5-7EYAx3n98fbnPVVZt4YhhWuGj4QsqwjYWFwQl4km-HY8DWc4RUYMyhKVEPDebTPKtrgn6tnF-HcYjBbPVMcq1QqOFNwRvgZcFy7czJ4coYGHs_ScZlLXR-pYnqdpzziOCbPWTQLVvYusXtbpR6xshHfFhxOcbVqqYDFeo0nihbBkdHo9vmGxUhQP_9_kMvlLG5HME8Zup0fbmUzXBtLClg8Rz-FpAM8UF_CSRJF-Dbmt8O2-NWVZVx9PW87RNW4MHtnWRhFub7q2Zdzf1t3tQFSYSBAvjm2nMbvQXWO2E-iRzMdPybtYduDZxTzoFbomzNBjCJvzTsj9rt3hKuvzLp8_-w==', 'gAAAAABqcYiabh18t2VnWzyZi1dMnfhlA0J_vvIUz9khHpJPMIw5yguPP8zoeprBr0ksBsDTZy03-Uh7QQA-c0dks0cOLmRMz8DsUGeqHBlWACIs9nrLPwpHGMGTQn-Tm6_3zyvgM4ko', 'somusuraj72@gmail.com', 'gAAAAABqcYiakq0BrvRTmk-ZqjUJMjf5FDNQ7c0DflWJHN10aMhcXaWuqvXjRwN2qv5tJzYsWE8zcHER_d4z4N_Tps5aeBxBIOtC1dmHhy9TXDJqXT4gPGCTxsPxjosAG-oaXbRqPDX3uGq3y-HwikmPu3lzvxeNw_vl02_tBrt7QXxG6qADYYhZlAD1Dy_pL0dKi4_gxUMje7qaOTlgn5EkGD4iT1yjRQ==', 32212254720, 25076626956, '2026-08-04 07:36:58.798283', 'Connected', 'Root Repository', '2026-08-04 06:37:14.840790', 1, NULL);

-- --------------------------------------------------------
-- Table structure for `users_smtpsetting`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users_smtpsetting`;
CREATE TABLE IF NOT EXISTS `users_smtpsetting` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `host` VARCHAR(255) NOT NULL,
  `port` INT NOT NULL,
  `username` VARCHAR(255) NULL,
  `use_tls` TINYINT(1) NOT NULL,
  `use_ssl` TINYINT(1) NOT NULL,
  `sender_email` VARCHAR(254) NOT NULL,
  `is_active` TINYINT(1) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `auth_required` TINYINT(1) NOT NULL,
  `password` VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `users_smtpsetting`
INSERT INTO `users_smtpsetting` (`id`, `host`, `port`, `username`, `use_tls`, `use_ssl`, `sender_email`, `is_active`, `created_at`, `updated_at`, `auth_required`, `password`) VALUES
(1, 'smtp.gmail.com', 587, 'jeffersonsamuel003@gmail.com', 1, 0, 'jeffersonsamuel003@gmail.com', 1, '2026-08-03 09:20:50.016897', '2026-08-03 09:20:50.017623', 1, 'gAAAAABqcF1yMfcir532zojTcP7JVMowPJS2bvM07R4HHbD-MYt3Pxqb-oaI0Bfg_pEBzOv8nj_lQmKyHTSWR9gKyo2hIQcsT2rT2qoq_EriQYkrs-eqSGM=');

-- --------------------------------------------------------
-- Table structure for `users_customuser`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users_customuser`;
CREATE TABLE IF NOT EXISTS `users_customuser` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `password` VARCHAR(128) NOT NULL,
  `last_login` DATETIME NULL,
  `is_superuser` TINYINT(1) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `designation` VARCHAR(100) NULL,
  `department` VARCHAR(100) NULL,
  `status` VARCHAR(20) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  `is_staff` TINYINT(1) NOT NULL,
  `is_active` TINYINT(1) NOT NULL,
  `role_id` INT NULL,
  `stream` VARCHAR(100) NULL,
  `company_name` VARCHAR(200) NULL,
  `password_changed_at` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data for table `users_customuser`
INSERT INTO `users_customuser` (`id`, `password`, `last_login`, `is_superuser`, `email`, `name`, `phone`, `designation`, `department`, `status`, `created_at`, `updated_at`, `is_staff`, `is_active`, `role_id`, `stream`, `company_name`, `password_changed_at`) VALUES
(1, 'pbkdf2_sha256$1000000$A3rmrv7ZfifvxNj4hhNkj7$ZZ9iCbk4Yyo+awf/hS0S8FPd5ZO4yhKAJNldP8TE70I=', '2026-08-04 06:11:39.342549', 1, 'superadmin@college.edu', 'Super Admin', NULL, 'Super Admin', 'Principal Office', 'Active', '2026-07-23 10:08:27.543349', '2026-08-04 06:09:06.703787', 1, 1, 1, NULL, NULL, '2026-08-03 07:33:33.606655');

-- --------------------------------------------------------
-- Table structure for `users_passwordresetotp`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users_passwordresetotp`;
CREATE TABLE IF NOT EXISTS `users_passwordresetotp` (
  `id` LONGTEXT NOT NULL PRIMARY KEY,
  `otp_hash` VARCHAR(128) NOT NULL,
  `created_at` DATETIME NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `is_used` TINYINT(1) NOT NULL,
  `used_at` DATETIME NULL,
  `ip_address` LONGTEXT NULL,
  `user_agent` LONGTEXT NULL,
  `user_id` INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;