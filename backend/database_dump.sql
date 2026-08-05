-- ==============================================================================
-- MySQL / Laragon Database Dump for MCC Legal Document Hub
-- Compatible with: MySQL 5.7+ / 8.0+ / MariaDB (Laragon MySQL)
-- Super Admin Credentials: superadmin@college.edu / Admin@123456
-- ==============================================================================

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `mou_dashboard` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `mou_dashboard`;

-- --------------------------------------------------------
-- Table structure for `roles_role`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `roles_role`;
CREATE TABLE `roles_role` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL UNIQUE,
  `description` longtext DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles_role` (`id`, `name`, `description`) VALUES
(1, 'Super Admin', 'Super Administrator with full system control'),
(2, 'Admin', 'Administrator who can manage files, folders, and users'),
(3, 'User', 'Standard user who can read, preview, upload, and download files in assigned folders');

-- --------------------------------------------------------
-- Table structure for `users_customuser`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `users_customuser`;
CREATE TABLE `users_customuser` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL DEFAULT 0,
  `email` varchar(254) NOT NULL UNIQUE,
  `name` varchar(150) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_staff` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `role_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `users_customuser_role_id_fk` (`role_id`),
  CONSTRAINT `users_customuser_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles_role` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Super Admin User Only: superadmin@college.edu / Admin@123456
INSERT INTO `users_customuser` (`id`, `password`, `last_login`, `is_superuser`, `email`, `name`, `status`, `is_active`, `is_staff`, `created_at`, `role_id`) VALUES
(1, 'pbkdf2_sha256$1000000$A3rmrv7ZfifvxNj4hhNkj7$ZZ9iCbk4Yyo+awf/hS0S8FPd5ZO4yhKAJNldP8TE70I=', NOW(6), 1, 'superadmin@college.edu', 'Super Admin', 'Active', 1, 1, NOW(6), 1);

-- --------------------------------------------------------
-- Table structure for `users_passwordresetotp`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `users_passwordresetotp`;
CREATE TABLE `users_passwordresetotp` (
  `id` char(36) NOT NULL,
  `otp_hash` varchar(128) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `expires_at` datetime(6) NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT 0,
  `used_at` datetime(6) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` longtext DEFAULT NULL,
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `users_passwordresetotp_user_id_fk` (`user_id`),
  CONSTRAINT `users_passwordresetotp_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `users_googledrivesetting`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `users_googledrivesetting`;
CREATE TABLE `users_googledrivesetting` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `client_id` varchar(255) DEFAULT NULL,
  `client_secret` varchar(255) DEFAULT NULL,
  `project_id` varchar(255) DEFAULT NULL,
  `root_folder_id` varchar(255) DEFAULT NULL,
  `access_token` longtext DEFAULT NULL,
  `refresh_token` longtext DEFAULT NULL,
  `token_expiry` datetime(6) DEFAULT NULL,
  `oauth_connected` tinyint(1) NOT NULL DEFAULT 0,
  `connected_email` varchar(254) DEFAULT NULL,
  `connection_status` varchar(50) NOT NULL DEFAULT 'Disconnected',
  `storage_usage` bigint(20) DEFAULT 0,
  `storage_limit` bigint(20) DEFAULT 0,
  `default_upload_folder` varchar(255) NOT NULL DEFAULT 'Document Core Uploads',
  `last_connection_time` datetime(6) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `users_smtpsetting`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `users_smtpsetting`;
CREATE TABLE `users_smtpsetting` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `host` varchar(255) NOT NULL,
  `port` int(11) NOT NULL DEFAULT 587,
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `use_tls` tinyint(1) NOT NULL DEFAULT 1,
  `use_ssl` tinyint(1) NOT NULL DEFAULT 0,
  `default_from_email` varchar(254) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `mous_department`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `mous_department`;
CREATE TABLE `mous_department` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL UNIQUE,
  `code` varchar(20) NOT NULL UNIQUE,
  `description` longtext DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `mous_department` (`id`, `name`, `code`, `description`) VALUES
(1, 'Computer Science & Engineering', 'CSE', 'Department of CSE'),
(2, 'Mechanical Engineering', 'MECH', 'Department of Mechanical Engineering'),
(3, 'Electrical & Electronics', 'EEE', 'Department of Electrical Engineering'),
(4, 'Civil Engineering', 'CIVIL', 'Department of Civil Engineering');

-- --------------------------------------------------------
-- Table structure for `mous_moucategory`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `mous_moucategory`;
CREATE TABLE `mous_moucategory` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL UNIQUE,
  `description` longtext DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `mous_moucategory` (`id`, `name`, `description`) VALUES
(1, 'Academic Collaboration', 'Student and faculty exchange programs'),
(2, 'Industrial Research', 'Joint research and development initiatives'),
(3, 'Internship & Training', 'Student placement and skill development');

-- --------------------------------------------------------
-- Table structure for `mous_moustatus`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `mous_moustatus`;
CREATE TABLE `mous_moustatus` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL UNIQUE,
  `description` longtext DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `mous_moustatus` (`id`, `name`, `description`) VALUES
(1, 'Draft', 'Document is under preparation'),
(2, 'Under Review', 'Document is being reviewed'),
(3, 'Approved', 'Document has been approved'),
(4, 'Active', 'Document is active and valid'),
(5, 'Expired', 'Document has expired'),
(6, 'Terminated', 'Document was terminated before expiry');

-- --------------------------------------------------------
-- Table structure for `mous_mou`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `mous_mou`;
CREATE TABLE `mous_mou` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `mou_number` varchar(100) NOT NULL UNIQUE,
  `partner_organization` varchar(255) NOT NULL,
  `partner_contact_person` varchar(150) DEFAULT NULL,
  `partner_email` varchar(254) DEFAULT NULL,
  `partner_phone` varchar(50) DEFAULT NULL,
  `signing_date` date DEFAULT NULL,
  `effective_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `objectives` longtext DEFAULT NULL,
  `key_deliverables` longtext DEFAULT NULL,
  `financial_commitment` decimal(15,2) DEFAULT 0.00,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `category_id` bigint(20) DEFAULT NULL,
  `created_by_id` bigint(20) DEFAULT NULL,
  `department_id` bigint(20) DEFAULT NULL,
  `status_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mous_mou_category_id_fk` (`category_id`),
  KEY `mous_mou_created_by_id_fk` (`created_by_id`),
  KEY `mous_mou_department_id_fk` (`department_id`),
  KEY `mous_mou_status_id_fk` (`status_id`),
  CONSTRAINT `mous_mou_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `mous_moucategory` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mous_mou_created_by_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users_customuser` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mous_mou_department_id_fk` FOREIGN KEY (`department_id`) REFERENCES `mous_department` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mous_mou_status_id_fk` FOREIGN KEY (`status_id`) REFERENCES `mous_moustatus` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `mous_moufile`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `mous_moufile`;
CREATE TABLE `mous_moufile` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` bigint(20) DEFAULT 0,
  `file_type` varchar(100) DEFAULT NULL,
  `google_drive_file_id` varchar(255) DEFAULT NULL,
  `version` int(11) NOT NULL DEFAULT 1,
  `uploaded_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `mou_id` bigint(20) NOT NULL,
  `uploaded_by_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mous_moufile_mou_id_fk` (`mou_id`),
  KEY `mous_moufile_uploaded_by_id_fk` (`uploaded_by_id`),
  CONSTRAINT `mous_moufile_mou_id_fk` FOREIGN KEY (`mou_id`) REFERENCES `mous_mou` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mous_moufile_uploaded_by_id_fk` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users_customuser` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `mous_mouhistory`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `mous_mouhistory`;
CREATE TABLE `mous_mouhistory` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `action` varchar(100) NOT NULL,
  `description` longtext DEFAULT NULL,
  `timestamp` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `mou_id` bigint(20) NOT NULL,
  `performed_by_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mous_mouhistory_mou_id_fk` (`mou_id`),
  KEY `mous_mouhistory_performed_by_id_fk` (`performed_by_id`),
  CONSTRAINT `mous_mouhistory_mou_id_fk` FOREIGN KEY (`mou_id`) REFERENCES `mous_mou` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mous_mouhistory_performed_by_id_fk` FOREIGN KEY (`performed_by_id`) REFERENCES `users_customuser` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `mous_moupermission`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `mous_moupermission`;
CREATE TABLE `mous_moupermission` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `can_view` tinyint(1) NOT NULL DEFAULT 1,
  `can_edit` tinyint(1) NOT NULL DEFAULT 0,
  `can_delete` tinyint(1) NOT NULL DEFAULT 0,
  `granted_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `granted_by_id` bigint(20) DEFAULT NULL,
  `mou_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `mous_moupermission_granted_by_id_fk` (`granted_by_id`),
  KEY `mous_moupermission_mou_id_fk` (`mou_id`),
  KEY `mous_moupermission_user_id_fk` (`user_id`),
  CONSTRAINT `mous_moupermission_granted_by_id_fk` FOREIGN KEY (`granted_by_id`) REFERENCES `users_customuser` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mous_moupermission_mou_id_fk` FOREIGN KEY (`mou_id`) REFERENCES `mous_mou` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mous_moupermission_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `folders_folder`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `folders_folder`;
CREATE TABLE `folders_folder` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `google_drive_folder_id` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `created_by_id` bigint(20) DEFAULT NULL,
  `parent_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `folders_folder_created_by_id_fk` (`created_by_id`),
  KEY `folders_folder_parent_id_fk` (`parent_id`),
  CONSTRAINT `folders_folder_created_by_id_fk` FOREIGN KEY (`created_by_id`) REFERENCES `users_customuser` (`id`) ON DELETE SET NULL,
  CONSTRAINT `folders_folder_parent_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `folders_folder` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `files_file`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `files_file`;
CREATE TABLE `files_file` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `file_size` bigint(20) NOT NULL DEFAULT 0,
  `file_type` varchar(100) DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `google_drive_file_id` varchar(255) DEFAULT NULL,
  `uploaded_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `folder_id` bigint(20) DEFAULT NULL,
  `uploaded_by_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `files_file_folder_id_fk` (`folder_id`),
  KEY `files_file_uploaded_by_id_fk` (`uploaded_by_id`),
  CONSTRAINT `files_file_folder_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `folders_folder` (`id`) ON DELETE CASCADE,
  CONSTRAINT `files_file_uploaded_by_id_fk` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users_customuser` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `notifications_notification`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `notifications_notification`;
CREATE TABLE `notifications_notification` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `message` longtext NOT NULL,
  `notification_type` varchar(50) NOT NULL DEFAULT 'info',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `user_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_notification_user_id_fk` (`user_id`),
  CONSTRAINT `notifications_notification_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for `activity_logs_activitylog`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `activity_logs_activitylog`;
CREATE TABLE `activity_logs_activitylog` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `action` longtext NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'general',
  `timestamp` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `activity_logs_activitylog_user_id_fk` (`user_id`),
  CONSTRAINT `activity_logs_activitylog_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Django Core System Tables
-- --------------------------------------------------------

DROP TABLE IF EXISTS `django_migrations`;
CREATE TABLE `django_migrations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `django_content_type`;
CREATE TABLE `django_content_type` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_uniq` (`app_label`,`model`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
COMMIT;
