import os
import sys
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from permissions.models import Permission
from roles.models import Role, RolePermission
from mous.models import (
    Stream, DepartmentCategory, Department, MOUCategory,
    TemplateCategory, OrganizationType, CollaborationType, DocumentType, Tag,
    MOU, DepartmentSubmission, MOUShare,
    MOUDocument, MOURenewal, MOUTemplate, TemplateCollection, TemplateDocument
)
from customization.models import WebsiteCustomization
from users.models import CustomDynamicPage, SMTPSetting, GoogleDriveSetting, UserInvitation
from folders.models import Folder, FolderPermission, FolderView, RecycleBinSetting
from files.models import File, FileVersion
from notifications.models import Notification
from activity_logs.models import ActivityLog

User = get_user_model()

def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "1" if val else "0"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, (dict, list)):
        val = json.dumps(val)
    s = str(val).replace("\\", "\\\\").replace("'", "''")
    return f"'{s}'"

def format_dt(dt):
    if not dt:
        return "NULL"
    return f"'{dt.strftime('%Y-%m-%d %H:%M:%S')}'"

def format_date(d):
    if not d:
        return "NULL"
    return f"'{d.strftime('%Y-%m-%d')}'"

def generate_dump():
    lines = []
    lines.append("-- ========================================================")
    lines.append("-- Fully Validated Comprehensive MySQL / phpMyAdmin Dump")
    lines.append("-- Engine: InnoDB | Charset: utf8mb4")
    lines.append("-- Includes Full Schema, Master Data & Seed Content")
    lines.append("-- ========================================================")
    lines.append("")
    lines.append("SET FOREIGN_KEY_CHECKS = 0;")
    lines.append("SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";")
    lines.append("SET time_zone = \"+00:00\";")
    lines.append("")
    lines.append("CREATE DATABASE IF NOT EXISTS `admin_legal` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    lines.append("USE `admin_legal`;")
    lines.append("")
    lines.append("START TRANSACTION;")
    lines.append("")

    # 1. Schema Definitions
    lines.append("CREATE TABLE IF NOT EXISTS `activity_logs_activitylog` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `action` text NOT NULL, `created_at` DATETIME NOT NULL, `ip_address` CHAR(39) NULL, `user_id` BIGINT NULL, `module` VARCHAR(100) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `auth_group` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(150) NOT NULL UNIQUE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `auth_group_permissions` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `group_id` INT NOT NULL, `permission_id` INT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `auth_permission` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `content_type_id` INT NOT NULL, `codename` VARCHAR(100) NOT NULL, `name` VARCHAR(255) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `customization_websitecustomization` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL UNIQUE, `is_active` TINYINT(1) NOT NULL DEFAULT 0, `info` text NOT NULL, `branding` text NOT NULL, `theme` text NOT NULL, `navigation` text NOT NULL, `pages` text NOT NULL, `login` text NOT NULL, `dashboard` text NOT NULL, `footer` text NOT NULL, `notification` text NOT NULL, `email_templates` text NOT NULL, `error_pages` text NOT NULL, `dynamic_text` text NOT NULL, `custom_code` text NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `updated_by_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `django_admin_log` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `object_id` text NULL, `object_repr` VARCHAR(200) NOT NULL, `action_flag` SMALLINT UNSIGNED NOT NULL CHECK (`action_flag` >= 0), `change_message` text NOT NULL, `content_type_id` INT NULL, `user_id` BIGINT NOT NULL, `action_time` DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `django_content_type` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `app_label` VARCHAR(100) NOT NULL, `model` VARCHAR(100) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `django_migrations` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `app` VARCHAR(255) NOT NULL, `name` VARCHAR(255) NOT NULL, `applied` DATETIME NOT NULL, UNIQUE KEY `django_migrations_app_name_uniq` (`app`, `name`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `django_session` (`session_key` VARCHAR(40) NOT NULL PRIMARY KEY, `session_data` text NOT NULL, `expire_date` DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `files_file` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `size` BIGINT NOT NULL, `file_type` VARCHAR(100) NOT NULL, `file_field` VARCHAR(100) NULL, `version_number` INT NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `folder_id` BIGINT NOT NULL, `uploaded_by_id` BIGINT NULL, `file_size` BIGINT NULL, `google_file_id` VARCHAR(255) NULL, `mime_type` VARCHAR(255) NULL, `web_content_link` VARCHAR(1000) NULL, `web_view_link` VARCHAR(1000) NULL, `import_source` VARCHAR(50) NULL, `source_google_file_id` VARCHAR(255) NULL, `is_signed` TINYINT(1) NOT NULL DEFAULT 0, `encrypted` TINYINT(1) NOT NULL DEFAULT 0, `encryption_key_id` VARCHAR(100) NOT NULL, `sha256_hash` VARCHAR(64) NULL, `virus_scan_status` VARCHAR(50) NOT NULL, `deleted_at` DATETIME NULL, `deleted_by_id` BIGINT NULL, `is_deleted` TINYINT(1) NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `files_fileversion` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `version_number` INT NOT NULL, `name` VARCHAR(255) NOT NULL, `size` BIGINT NOT NULL, `file_type` VARCHAR(100) NOT NULL, `file_field` VARCHAR(100) NULL, `created_at` DATETIME NOT NULL, `file_id` BIGINT NOT NULL, `uploaded_by_id` BIGINT NULL, `google_file_id` VARCHAR(255) NULL, `encrypted` TINYINT(1) NOT NULL DEFAULT 0, `encryption_key_id` VARCHAR(100) NOT NULL, `sha256_hash` VARCHAR(64) NULL, `virus_scan_status` VARCHAR(50) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `folders_folder` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `created_by_id` BIGINT NULL, `google_folder_id` VARCHAR(255) NULL, `status` VARCHAR(50) NOT NULL, `expiry_date` DATE NULL, `summary` text NULL, `deleted_at` DATETIME NULL, `deleted_by_id` BIGINT NULL, `is_deleted` TINYINT(1) NOT NULL DEFAULT 0, `custom_page_id` VARCHAR(255) NULL, `module_type` VARCHAR(100) NOT NULL, `import_source` VARCHAR(50) NULL, `source_google_folder_id` VARCHAR(255) NULL, `parent_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `folders_folderpermission` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `is_granted` TINYINT(1) NOT NULL DEFAULT 0, `folder_id` BIGINT NOT NULL, `user_id` BIGINT NOT NULL, `can_delete_own_uploads` TINYINT(1) NOT NULL DEFAULT 0, `can_download` TINYINT(1) NOT NULL DEFAULT 0, `can_read` TINYINT(1) NOT NULL DEFAULT 0, `can_upload` TINYINT(1) NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `folders_folderview` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `viewed_at` DATETIME NOT NULL, `folder_id` BIGINT NOT NULL, `user_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `folders_recyclebinsetting` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `retention_period` VARCHAR(50) NOT NULL, `auto_delete_enabled` TINYINT(1) NOT NULL DEFAULT 0, `updated_at` DATETIME NOT NULL, `updated_by_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_stream` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL UNIQUE, `description` text NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 1, `created_at` DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_departmentcategory` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL UNIQUE, `is_active` TINYINT(1) NOT NULL DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_department` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 1, `category_id` BIGINT NULL, `stream_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_collaborationtype` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL UNIQUE, `is_active` TINYINT(1) NOT NULL DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_departmentsubmission` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `signed_date` DATE NOT NULL, `mou_month` VARCHAR(20) NOT NULL, `mou_year` INT NOT NULL, `summary` text NOT NULL, `purpose` text NOT NULL, `benefits` text NOT NULL, `remarks` text NULL, `uploaded_at` DATETIME NOT NULL, `review_status` VARCHAR(50) NOT NULL, `reviewer_comments` text NULL, `department_id` BIGINT NULL, `mou_id` BIGINT NOT NULL, `signed_file_id` BIGINT NULL, `uploaded_by_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_documenttype` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL UNIQUE, `is_active` TINYINT(1) NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_mou` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `title` VARCHAR(255) NOT NULL, `mou_number` VARCHAR(100) NOT NULL UNIQUE, `partner_organization` VARCHAR(255) NOT NULL, `department_name` VARCHAR(255) NULL, `effective_date` DATE NULL, `signed_date` DATE NULL, `expiry_date` DATE NULL, `duration_months` INT NOT NULL, `status` VARCHAR(50) NOT NULL, `summary` text NULL, `purpose` text NULL, `objectives` text NULL, `beneficiaries` text NULL, `opportunities` text NULL, `custom_fields_data` text NULL, `coordinator_name` VARCHAR(255) NULL, `coordinator_designation` VARCHAR(255) NULL, `coordinator_email` VARCHAR(254) NULL, `coordinator_phone` VARCHAR(50) NULL, `partner_name` VARCHAR(255) NULL, `partner_designation` VARCHAR(255) NULL, `partner_email` VARCHAR(254) NULL, `partner_phone` VARCHAR(50) NULL, `additional_notes` text NULL, `remarks` text NULL, `version_number` INT NOT NULL, `is_renewed` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `created_by_id` BIGINT NULL, `department_id` BIGINT NULL, `original_mou_id` BIGINT NULL, `renewed_from_id` BIGINT NULL, `signed_mou_id` BIGINT NULL, `mou_type_id` BIGINT NULL, `mou_file` VARCHAR(100) NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_moucategory` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `code` VARCHAR(50) NULL, `color` VARCHAR(50) NOT NULL, `icon_type` VARCHAR(50) NOT NULL, `coordinator_name` VARCHAR(255) NULL, `coordinator_email` VARCHAR(254) NULL, `category_type` VARCHAR(50) NOT NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 1, `created_at` DATETIME NOT NULL, `stream_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_moudocument` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `document_type` VARCHAR(50) NOT NULL, `uploaded_at` DATETIME NOT NULL, `file_id` BIGINT NOT NULL, `mou_id` BIGINT NOT NULL, `uploaded_by_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_mourenewal` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `renewed_at` DATETIME NOT NULL, `notes` text NULL, `original_mou_id` BIGINT NOT NULL, `renewed_by_id` BIGINT NULL, `renewed_mou_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_moushare` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `permission` VARCHAR(50) NOT NULL, `status` VARCHAR(50) NOT NULL, `shared_at` DATETIME NOT NULL, `department_id` BIGINT NULL, `mou_id` BIGINT NOT NULL, `shared_by_id` BIGINT NULL, `user_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_moutemplate` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL UNIQUE, `description` text NULL, `template_notes` text NULL, `fields_schema` text NOT NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `created_by_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_organizationtype` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL UNIQUE, `is_active` TINYINT(1) NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_tag` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL UNIQUE, `is_active` TINYINT(1) NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_templatecategory` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL UNIQUE, `is_active` TINYINT(1) NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_templatecollection` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `template_name` VARCHAR(255) NOT NULL, `description` text NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `category_id` BIGINT NOT NULL, `collaboration_type_id` BIGINT NOT NULL, `created_by_id` BIGINT NULL, `department_id` BIGINT NOT NULL, `department_category_id` BIGINT NOT NULL, `organization_type_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_templatecollection_tags` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `templatecollection_id` BIGINT NOT NULL, `tag_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `mous_templatedocument` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `document_name` VARCHAR(255) NOT NULL, `version` VARCHAR(50) NOT NULL, `effective_date` DATE NULL, `expiry_date` DATE NULL, `revision_date` DATE NULL, `remarks` text NULL, `uploaded_at` DATETIME NOT NULL, `status` VARCHAR(50) NOT NULL, `document_type_id` BIGINT NOT NULL, `template_collection_id` BIGINT NOT NULL, `uploaded_by_id` BIGINT NULL, `google_file_id` VARCHAR(255) NULL, `file_path` VARCHAR(100) NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `notifications_notification` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `title` VARCHAR(200) NOT NULL, `description` text NOT NULL, `is_read` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `user_id` BIGINT NOT NULL, `metadata` text NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `permissions_permission` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(150) NOT NULL, `codename` VARCHAR(100) NOT NULL UNIQUE, `description` text NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `roles_role` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL UNIQUE, `description` text NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `roles_rolepermission` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `permission_id` BIGINT NOT NULL, `role_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_customdynamicpage` (`id` VARCHAR(255) NOT NULL PRIMARY KEY, `title` VARCHAR(255) NOT NULL, `slug` VARCHAR(255) NOT NULL UNIQUE, `icon` VARCHAR(100) NOT NULL, `route` VARCHAR(255) NOT NULL, `parent_slug` VARCHAR(255) NULL, `description` text NULL, `order` INT NOT NULL, `badge` VARCHAR(50) NULL, `badge_color` VARCHAR(50) NOT NULL, `page_type` VARCHAR(100) NOT NULL, `is_published` TINYINT(1) NOT NULL DEFAULT 0, `is_enabled` TINYINT(1) NOT NULL DEFAULT 0, `open_new_tab` TINYINT(1) NOT NULL DEFAULT 0, `allowed_roles` text NOT NULL, `allowed_permissions` text NOT NULL, `theme_colors` text NOT NULL, `crud_permissions` text NOT NULL, `entity_schema` text NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `root_folder_id` VARCHAR(255) NULL, `root_folder_name` VARCHAR(255) NULL, `google_drive_folder_id` VARCHAR(255) NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_customuser` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `password` VARCHAR(128) NOT NULL, `last_login` DATETIME NULL, `is_superuser` TINYINT(1) NOT NULL DEFAULT 0, `email` VARCHAR(254) NOT NULL UNIQUE, `name` VARCHAR(150) NOT NULL, `phone` VARCHAR(20) NULL, `designation` VARCHAR(100) NULL, `department` VARCHAR(100) NULL, `status` VARCHAR(20) NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `is_staff` TINYINT(1) NOT NULL DEFAULT 0, `is_active` TINYINT(1) NOT NULL DEFAULT 0, `role_id` BIGINT NULL, `stream` VARCHAR(100) NULL, `company_name` VARCHAR(200) NULL, `password_changed_at` DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_customuser_groups` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `customuser_id` BIGINT NOT NULL, `group_id` INT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_customuser_user_permissions` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `customuser_id` BIGINT NOT NULL, `permission_id` INT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_googledrivesetting` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `project_id` VARCHAR(255) NULL, `private_key_id` VARCHAR(255) NULL, `private_key` text NULL, `client_email` VARCHAR(254) NULL, `client_id` VARCHAR(255) NULL, `root_folder_id` VARCHAR(255) NULL, `type` VARCHAR(100) NOT NULL, `auth_uri` VARCHAR(200) NOT NULL, `token_uri` VARCHAR(200) NOT NULL, `auth_provider_x509_cert_url` VARCHAR(200) NOT NULL, `client_x509_cert_url` VARCHAR(500) NULL, `universe_domain` VARCHAR(100) NOT NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `access_token` text NULL, `client_secret` VARCHAR(500) NULL, `connected_email` VARCHAR(254) NULL, `refresh_token` text NULL, `storage_limit` BIGINT NULL, `storage_usage` BIGINT NULL, `token_expiry` DATETIME NULL, `connection_status` VARCHAR(50) NOT NULL, `default_upload_folder` VARCHAR(255) NULL, `last_connection_time` DATETIME NULL, `oauth_connected` TINYINT(1) NOT NULL DEFAULT 0, `token_data` text NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_passwordresetotp` (`id` VARCHAR(255) NOT NULL PRIMARY KEY, `otp_hash` VARCHAR(128) NOT NULL, `created_at` DATETIME NOT NULL, `expires_at` DATETIME NOT NULL, `is_used` TINYINT(1) NOT NULL DEFAULT 0, `used_at` DATETIME NULL, `ip_address` CHAR(39) NULL, `user_agent` text NULL, `user_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_smtpsetting` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `host` VARCHAR(255) NOT NULL, `port` INT NOT NULL, `username` VARCHAR(255) NULL, `use_tls` TINYINT(1) NOT NULL DEFAULT 0, `use_ssl` TINYINT(1) NOT NULL DEFAULT 0, `sender_email` VARCHAR(254) NOT NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `auth_required` TINYINT(1) NOT NULL DEFAULT 0, `password` VARCHAR(500) NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_userinvitation` (`id` VARCHAR(255) NOT NULL PRIMARY KEY, `email` VARCHAR(254) NOT NULL, `stream` VARCHAR(100) NOT NULL, `department` VARCHAR(100) NOT NULL, `token` VARCHAR(255) NOT NULL UNIQUE, `expires_at` DATETIME NOT NULL, `is_used` TINYINT(1) NOT NULL DEFAULT 0, `is_cancelled` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `accepted_at` DATETIME NULL, `ip_address` CHAR(39) NULL, `user_agent` text NULL, `created_by_id` BIGINT NULL, `system_role_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_userpermission` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `is_granted` TINYINT(1) NOT NULL DEFAULT 0, `permission_id` BIGINT NOT NULL, `user_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")

    # 1.5. Django Migration History (Collision-Safe WITH ON DUPLICATE KEY UPDATE)
    lines.append("")
    lines.append("-- Seed Django Migration History")
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("SELECT app, name, applied FROM django_migrations ORDER BY id")
        for row in cursor.fetchall():
            m_app, m_name, m_applied = row[0], row[1], row[2]
            applied_str = f"'{m_applied}'" if isinstance(m_applied, str) else (format_dt(m_applied) if m_applied else "'2026-08-18 00:00:00'")
            lines.append(f"INSERT INTO `django_migrations` (`app`, `name`, `applied`) VALUES({escape_sql(m_app)}, {escape_sql(m_name)}, {applied_str}) ON DUPLICATE KEY UPDATE `applied` = VALUES(`applied`);")

    # 2. System Roles & Permissions
    lines.append("")
    lines.append("-- Seed System Permissions")
    for perm in Permission.objects.all().order_by('id'):
        lines.append(f"INSERT INTO `permissions_permission` VALUES({perm.id}, {escape_sql(perm.name)}, {escape_sql(perm.codename)}, {escape_sql(perm.description)});")

    lines.append("")
    lines.append("-- Seed System Roles")
    for r in Role.objects.all().order_by('id'):
        lines.append(f"INSERT INTO `roles_role` VALUES({r.id}, {escape_sql(r.name)}, {escape_sql(r.description)});")

    lines.append("")
    lines.append("-- Seed Role Permissions")
    for rp in RolePermission.objects.all().order_by('id'):
        lines.append(f"INSERT INTO `roles_rolepermission` VALUES({rp.id}, {rp.permission_id}, {rp.role_id});")

    # 3. System Users
    lines.append("")
    lines.append("-- Seed Custom Users (Super Admin & Staff)")
    for u in User.objects.all().order_by('id'):
        last_login_str = format_dt(u.last_login)
        created_at_str = format_dt(u.created_at) if u.created_at else "'2026-08-11 10:00:00'"
        updated_at_str = format_dt(u.updated_at) if u.updated_at else "'2026-08-11 10:00:00'"
        pwd_changed_str = format_dt(getattr(u, 'password_changed_at', None)) if getattr(u, 'password_changed_at', None) else created_at_str
        role_id_str = str(u.role_id) if u.role_id else "1"
        lines.append(f"INSERT INTO `users_customuser` VALUES({u.id}, {escape_sql(u.password)}, {last_login_str}, {1 if u.is_superuser else 0}, {escape_sql(u.email)}, {escape_sql(u.name)}, {escape_sql(u.phone)}, {escape_sql(u.designation)}, {escape_sql(u.department)}, {escape_sql(u.status)}, {created_at_str}, {updated_at_str}, {1 if u.is_staff else 0}, {1 if u.is_active else 0}, {role_id_str}, {escape_sql(u.stream)}, {escape_sql(u.company_name)}, {pwd_changed_str});")

    # 4. Website Customization
    lines.append("")
    lines.append("-- Seed Website Customization")
    for cust in WebsiteCustomization.objects.all().order_by('id'):
        created_str = format_dt(cust.created_at) if cust.created_at else "'2026-08-11 10:00:00'"
        updated_str = format_dt(cust.updated_at) if cust.updated_at else "'2026-08-11 10:00:00'"
        upd_by_str = str(cust.updated_by_id) if cust.updated_by_id else "NULL"
        lines.append(f"INSERT INTO `customization_websitecustomization` VALUES({cust.id}, {escape_sql(cust.name)}, {1 if cust.is_active else 0}, {escape_sql(cust.info)}, {escape_sql(cust.branding)}, {escape_sql(cust.theme)}, {escape_sql(cust.navigation)}, {escape_sql(cust.pages)}, {escape_sql(cust.login)}, {escape_sql(cust.dashboard)}, {escape_sql(cust.footer)}, {escape_sql(cust.notification)}, {escape_sql(cust.email_templates)}, {escape_sql(cust.error_pages)}, {escape_sql(cust.dynamic_text)}, {escape_sql(cust.custom_code)}, {created_str}, {updated_str}, {upd_by_str});")

    # 5. Master Data Structure
    lines.append("")
    lines.append("-- Seed Streams")
    for s in Stream.objects.all().order_by('id'):
        created_str = format_dt(s.created_at) if s.created_at else "'2026-08-16 00:00:00'"
        lines.append(f"INSERT INTO `mous_stream` (`id`, `name`, `description`, `is_active`, `created_at`) VALUES ({s.id}, {escape_sql(s.name)}, {escape_sql(s.description)}, {1 if s.is_active else 0}, {created_str});")

    lines.append("")
    lines.append("-- Seed Department Categories")
    for dc in DepartmentCategory.objects.all().order_by('id'):
        lines.append(f"INSERT INTO `mous_departmentcategory` (`id`, `name`, `is_active`) VALUES ({dc.id}, {escape_sql(dc.name)}, {1 if dc.is_active else 0});")

    lines.append("")
    lines.append("-- Seed Departments")
    for d in Department.objects.all().order_by('id'):
        cat_id_str = str(d.category_id) if d.category_id else "NULL"
        strm_id_str = str(d.stream_id) if d.stream_id else "NULL"
        lines.append(f"INSERT INTO `mous_department` (`id`, `name`, `is_active`, `category_id`, `stream_id`) VALUES ({d.id}, {escape_sql(d.name)}, {1 if d.is_active else 0}, {cat_id_str}, {strm_id_str});")

    lines.append("")
    lines.append("-- Seed MOU Categories (Department Directory Cards)")
    for mc in MOUCategory.objects.all().order_by('id'):
        created_str = format_dt(mc.created_at) if mc.created_at else "'2026-08-16 00:00:00'"
        strm_id_str = str(mc.stream_id) if mc.stream_id else "NULL"
        lines.append(f"INSERT INTO `mous_moucategory` (`id`, `name`, `code`, `color`, `icon_type`, `coordinator_name`, `coordinator_email`, `category_type`, `is_active`, `created_at`, `stream_id`) VALUES ({mc.id}, {escape_sql(mc.name)}, {escape_sql(mc.code)}, {escape_sql(mc.color)}, {escape_sql(mc.icon_type)}, {escape_sql(mc.coordinator_name)}, {escape_sql(mc.coordinator_email)}, {escape_sql(mc.category_type)}, {1 if mc.is_active else 0}, {created_str}, {strm_id_str});")

    lines.append("")
    lines.append("-- Seed Template Lookups")
    for tc in TemplateCategory.objects.all().order_by('id'):
        lines.append(f"INSERT INTO `mous_templatecategory` (`id`, `name`, `is_active`) VALUES ({tc.id}, {escape_sql(tc.name)}, {1 if tc.is_active else 0});")
    for ot in OrganizationType.objects.all().order_by('id'):
        lines.append(f"INSERT INTO `mous_organizationtype` (`id`, `name`, `is_active`) VALUES ({ot.id}, {escape_sql(ot.name)}, {1 if ot.is_active else 0});")
    for ct in CollaborationType.objects.all().order_by('id'):
        lines.append(f"INSERT INTO `mous_collaborationtype` (`id`, `name`, `is_active`) VALUES ({ct.id}, {escape_sql(ct.name)}, {1 if ct.is_active else 0});")
    for dt in DocumentType.objects.all().order_by('id'):
        lines.append(f"INSERT INTO `mous_documenttype` (`id`, `name`, `is_active`) VALUES ({dt.id}, {escape_sql(dt.name)}, {1 if dt.is_active else 0});")
    for t in Tag.objects.all().order_by('id'):
        lines.append(f"INSERT INTO `mous_tag` (`id`, `name`, `is_active`) VALUES ({t.id}, {escape_sql(t.name)}, {1 if t.is_active else 0});")

    # 6. Custom Dynamic Pages & Sidebar Modules
    lines.append("")
    lines.append("-- Seed Custom Dynamic Pages & Modules")
    for p in CustomDynamicPage.objects.all().order_by('id'):
        created_str = format_dt(p.created_at)
        updated_str = format_dt(p.updated_at)
        lines.append(f"INSERT INTO `users_customdynamicpage` VALUES({escape_sql(p.id)}, {escape_sql(p.title)}, {escape_sql(p.slug)}, {escape_sql(p.icon)}, {escape_sql(p.route)}, {escape_sql(p.parent_slug)}, {escape_sql(p.description)}, {p.order}, {escape_sql(p.badge)}, {escape_sql(p.badge_color)}, {escape_sql(p.page_type)}, {1 if p.is_published else 0}, {1 if p.is_enabled else 0}, {1 if p.open_new_tab else 0}, {escape_sql(p.allowed_roles)}, {escape_sql(p.allowed_permissions)}, {escape_sql(p.theme_colors)}, {escape_sql(p.crud_permissions)}, {escape_sql(p.entity_schema)}, {created_str}, {updated_str}, {escape_sql(p.root_folder_id)}, {escape_sql(p.root_folder_name)}, {escape_sql(p.google_drive_folder_id)});")

    # 7. Folders & Files
    lines.append("")
    lines.append("-- Seed Folders")
    for f in Folder.objects.all().order_by('id'):
        created_str = format_dt(f.created_at)
        updated_str = format_dt(f.updated_at)
        expiry_str = format_date(f.expiry_date)
        deleted_at_str = format_dt(f.deleted_at)
        created_by_str = str(f.created_by_id) if f.created_by_id else "NULL"
        deleted_by_str = str(f.deleted_by_id) if f.deleted_by_id else "NULL"
        parent_id_str = str(f.parent_id) if f.parent_id else "NULL"
        custom_page_id_str = escape_sql(f.custom_page_id) if f.custom_page_id else "NULL"
        import_src = escape_sql(getattr(f, 'import_source', 'local') or 'local')
        src_gfolder_id = escape_sql(getattr(f, 'source_google_folder_id', None))
        lines.append(f"INSERT INTO `folders_folder` VALUES({f.id}, {escape_sql(f.name)}, {created_str}, {updated_str}, {created_by_str}, {escape_sql(f.google_folder_id)}, {escape_sql(f.status)}, {expiry_str}, {escape_sql(f.summary)}, {deleted_at_str}, {deleted_by_str}, {1 if f.is_deleted else 0}, {custom_page_id_str}, {escape_sql(f.module_type)}, {import_src}, {src_gfolder_id}, {parent_id_str});")

    lines.append("")
    lines.append("-- Seed Files")
    for fi in File.objects.all().order_by('id'):
        created_str = format_dt(fi.created_at)
        updated_str = format_dt(fi.updated_at)
        deleted_at_str = format_dt(fi.deleted_at)
        uploaded_by_str = str(fi.uploaded_by_id) if fi.uploaded_by_id else "NULL"
        deleted_by_str = str(fi.deleted_by_id) if fi.deleted_by_id else "NULL"
        import_src = escape_sql(getattr(fi, 'import_source', 'local') or 'local')
        src_gfile_id = escape_sql(getattr(fi, 'source_google_file_id', None))
        lines.append(f"INSERT INTO `files_file` VALUES({fi.id}, {escape_sql(fi.name)}, {fi.size}, {escape_sql(fi.file_type)}, {escape_sql(fi.file_field)}, {fi.version_number}, {created_str}, {updated_str}, {fi.folder_id}, {uploaded_by_str}, {fi.file_size or 'NULL'}, {escape_sql(fi.google_file_id)}, {escape_sql(fi.mime_type)}, {escape_sql(fi.web_content_link)}, {escape_sql(fi.web_view_link)}, {import_src}, {src_gfile_id}, {1 if fi.is_signed else 0}, {1 if fi.encrypted else 0}, {escape_sql(fi.encryption_key_id)}, {escape_sql(fi.sha256_hash)}, {escape_sql(fi.virus_scan_status)}, {deleted_at_str}, {deleted_by_str}, {1 if fi.is_deleted else 0});")

    # 8. Template Collections & Template Documents
    lines.append("")
    lines.append("-- Seed Template Collections")
    for tc in TemplateCollection.objects.all().order_by('id'):
        created_str = format_dt(tc.created_at)
        updated_str = format_dt(tc.updated_at)
        created_by_str = str(tc.created_by_id) if tc.created_by_id else "NULL"
        lines.append(f"INSERT INTO `mous_templatecollection` VALUES({tc.id}, {escape_sql(tc.template_name)}, {escape_sql(tc.description)}, {created_str}, {updated_str}, {tc.category_id}, {tc.collaboration_type_id}, {created_by_str}, {tc.department_id}, {tc.department_category_id}, {tc.organization_type_id});")

    lines.append("")
    lines.append("-- Seed Template Documents")
    for td in TemplateDocument.objects.all().order_by('id'):
        uploaded_str = format_dt(td.uploaded_at)
        eff_str = format_date(td.effective_date)
        exp_str = format_date(td.expiry_date)
        rev_str = format_date(td.revision_date)
        uploaded_by_str = str(td.uploaded_by_id) if td.uploaded_by_id else "NULL"
        lines.append(f"INSERT INTO `mous_templatedocument` VALUES({td.id}, {escape_sql(td.document_name)}, {escape_sql(td.version)}, {eff_str}, {exp_str}, {rev_str}, {escape_sql(td.remarks)}, {uploaded_str}, {escape_sql(td.status)}, {td.document_type_id}, {td.template_collection_id}, {uploaded_by_str}, {escape_sql(td.google_file_id)}, {escape_sql(td.file_path)});")

    # 9. MOUs
    lines.append("")
    lines.append("-- Seed MOUs")
    for mou in MOU.objects.all().order_by('id'):
        eff_str = format_date(mou.effective_date)
        sig_str = format_date(mou.signed_date)
        exp_str = format_date(mou.expiry_date)
        created_str = format_dt(mou.created_at)
        updated_str = format_dt(mou.updated_at)
        created_by_str = str(mou.created_by_id) if mou.created_by_id else "NULL"
        dept_id_str = str(mou.department_id) if mou.department_id else "NULL"
        orig_id_str = str(mou.original_mou_id) if mou.original_mou_id else "NULL"
        renew_id_str = str(mou.renewed_from_id) if mou.renewed_from_id else "NULL"
        signed_id_str = str(mou.signed_mou_id) if mou.signed_mou_id else "NULL"
        mou_type_id_str = str(mou.mou_type_id) if mou.mou_type_id else "NULL"
        lines.append(f"INSERT INTO `mous_mou` VALUES({mou.id}, {escape_sql(mou.title)}, {escape_sql(mou.mou_number)}, {escape_sql(mou.partner_organization)}, {escape_sql(mou.department_name)}, {eff_str}, {sig_str}, {exp_str}, {mou.duration_months}, {escape_sql(mou.status)}, {escape_sql(mou.summary)}, {escape_sql(mou.purpose)}, {escape_sql(mou.objectives)}, {escape_sql(mou.beneficiaries)}, {escape_sql(mou.opportunities)}, {escape_sql(mou.custom_fields_data)}, {escape_sql(mou.coordinator_name)}, {escape_sql(mou.coordinator_designation)}, {escape_sql(mou.coordinator_email)}, {escape_sql(mou.coordinator_phone)}, {escape_sql(mou.partner_name)}, {escape_sql(mou.partner_designation)}, {escape_sql(mou.partner_email)}, {escape_sql(mou.partner_phone)}, {escape_sql(mou.additional_notes)}, {escape_sql(mou.remarks)}, {mou.version_number}, {1 if mou.is_renewed else 0}, {created_str}, {updated_str}, {created_by_str}, {dept_id_str}, {orig_id_str}, {renew_id_str}, {signed_id_str}, {mou_type_id_str}, {escape_sql(mou.mou_file)});")

    # 10. SMTP Settings & Google Drive Settings
    lines.append("")
    lines.append("-- Seed SMTP Settings")
    for smtp in SMTPSetting.objects.all().order_by('id'):
        created_str = format_dt(smtp.created_at)
        updated_str = format_dt(smtp.updated_at)
        lines.append(f"INSERT INTO `users_smtpsetting` VALUES({smtp.id}, {escape_sql(smtp.host)}, {smtp.port}, {escape_sql(smtp.username)}, {1 if smtp.use_tls else 0}, {1 if smtp.use_ssl else 0}, {escape_sql(smtp.sender_email)}, {1 if smtp.is_active else 0}, {created_str}, {updated_str}, {1 if smtp.auth_required else 0}, NULL);")

    lines.append("")
    lines.append("-- Seed Google Drive Settings (Secrets Sanitized)")
    for gds in GoogleDriveSetting.objects.all().order_by('id'):
        created_str = format_dt(gds.created_at)
        updated_str = format_dt(gds.updated_at)
        lines.append(f"INSERT INTO `users_googledrivesetting` VALUES({gds.id}, 'Web OAuth Project', NULL, NULL, NULL, 'YOUR_GOOGLE_CLIENT_ID', 'YOUR_GOOGLE_ROOT_FOLDER_ID', 'service_account', 'https://accounts.google.com/o/oauth2/auth', 'https://oauth2.googleapis.com/token', 'https://www.googleapis.com/oauth2/v1/certs', NULL, 'googleapis.com', {1 if gds.is_active else 0}, {created_str}, {updated_str}, NULL, 'YOUR_GOOGLE_CLIENT_SECRET', {escape_sql(gds.connected_email)}, NULL, {gds.storage_limit or 'NULL'}, {gds.storage_usage or 'NULL'}, NULL, {escape_sql(gds.connection_status)}, 'Root Repository', NULL, 0, NULL);")

    lines.append("")
    lines.append("SET FOREIGN_KEY_CHECKS = 1;")
    lines.append("COMMIT;")
    lines.append("")

    dump_content = "\n".join(lines)

    # 1. Update backend/database.sql
    dump_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.sql")
    with open(dump_path, "w", encoding="utf-8") as f:
        f.write(dump_content)
    print(f"Successfully exported comprehensive database dump to '{dump_path}'. Total lines: {len(lines)}")

    # 2. Update UPDATED_PRODUCTION_DATABASE.sql in workspace root
    prod_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "UPDATED_PRODUCTION_DATABASE.sql")
    with open(prod_path, "w", encoding="utf-8") as f:
        f.write(dump_content)
    print(f"Successfully created production copy at '{prod_path}'.")

if __name__ == "__main__":
    generate_dump()
