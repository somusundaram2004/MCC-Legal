import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from permissions.models import Permission
from roles.models import Role, RolePermission
from mous.models import (
    Stream, DepartmentCategory, Department, MOUCategory,
    TemplateCategory, OrganizationType, CollaborationType, DocumentType, Tag
)
from customization.models import WebsiteCustomization

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

def generate_dump():
    lines = []
    lines.append("-- ========================================================")
    lines.append("-- Fully Validated MySQL Dump for phpMyAdmin / MySQL Workbench")
    lines.append("-- Engine: InnoDB | Charset: utf8mb4")
    lines.append("-- Generated with full Master Data (Streams, Categories, Depts)")
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

    # Schema Table Definitions
    lines.append("CREATE TABLE IF NOT EXISTS `activity_logs_activitylog` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `action` text NOT NULL, `created_at` DATETIME NOT NULL, `ip_address` CHAR(39) NULL, `user_id` BIGINT NULL, `module` VARCHAR(100) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `auth_group` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(150) NOT NULL UNIQUE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `auth_group_permissions` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `group_id` INT NOT NULL, `permission_id` INT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `auth_permission` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `content_type_id` INT NOT NULL, `codename` VARCHAR(100) NOT NULL, `name` VARCHAR(255) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `customization_websitecustomization` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(100) NOT NULL UNIQUE, `is_active` TINYINT(1) NOT NULL DEFAULT 0, `info` text NOT NULL, `branding` text NOT NULL, `theme` text NOT NULL, `navigation` text NOT NULL, `pages` text NOT NULL, `login` text NOT NULL, `dashboard` text NOT NULL, `footer` text NOT NULL, `notification` text NOT NULL, `email_templates` text NOT NULL, `error_pages` text NOT NULL, `dynamic_text` text NOT NULL, `custom_code` text NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `updated_by_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `django_admin_log` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `object_id` text NULL, `object_repr` VARCHAR(200) NOT NULL, `action_flag` SMALLINT UNSIGNED NOT NULL CHECK (`action_flag` >= 0), `change_message` text NOT NULL, `content_type_id` INT NULL, `user_id` BIGINT NOT NULL, `action_time` DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `django_content_type` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `app_label` VARCHAR(100) NOT NULL, `model` VARCHAR(100) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `django_migrations` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `app` VARCHAR(255) NOT NULL, `name` VARCHAR(255) NOT NULL, `applied` DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `django_session` (`session_key` VARCHAR(40) NOT NULL PRIMARY KEY, `session_data` text NOT NULL, `expire_date` DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `files_file` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `size` BIGINT NOT NULL, `file_type` VARCHAR(100) NOT NULL, `file_field` VARCHAR(100) NULL, `version_number` INT NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `folder_id` BIGINT NOT NULL, `uploaded_by_id` BIGINT NULL, `file_size` BIGINT NULL, `google_file_id` VARCHAR(255) NULL, `mime_type` VARCHAR(255) NULL, `web_content_link` VARCHAR(1000) NULL, `web_view_link` VARCHAR(1000) NULL, `is_signed` TINYINT(1) NOT NULL DEFAULT 0, `encrypted` TINYINT(1) NOT NULL DEFAULT 0, `encryption_key_id` VARCHAR(100) NOT NULL, `sha256_hash` VARCHAR(64) NULL, `virus_scan_status` VARCHAR(50) NOT NULL, `deleted_at` DATETIME NULL, `deleted_by_id` BIGINT NULL, `is_deleted` TINYINT(1) NOT NULL DEFAULT 0) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `files_fileversion` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `version_number` INT NOT NULL, `name` VARCHAR(255) NOT NULL, `size` BIGINT NOT NULL, `file_type` VARCHAR(100) NOT NULL, `file_field` VARCHAR(100) NULL, `created_at` DATETIME NOT NULL, `file_id` BIGINT NOT NULL, `uploaded_by_id` BIGINT NULL, `google_file_id` VARCHAR(255) NULL, `encrypted` TINYINT(1) NOT NULL DEFAULT 0, `encryption_key_id` VARCHAR(100) NOT NULL, `sha256_hash` VARCHAR(64) NULL, `virus_scan_status` VARCHAR(50) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `folders_folder` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `created_by_id` BIGINT NULL, `google_folder_id` VARCHAR(255) NULL, `status` VARCHAR(50) NOT NULL, `expiry_date` DATE NULL, `summary` text NULL, `deleted_at` DATETIME NULL, `deleted_by_id` BIGINT NULL, `is_deleted` TINYINT(1) NOT NULL DEFAULT 0, `custom_page_id` CHAR(32) NULL, `module_type` VARCHAR(100) NOT NULL, `parent_id` BIGINT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
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
    lines.append("CREATE TABLE IF NOT EXISTS `users_customdynamicpage` (`id` CHAR(32) NOT NULL PRIMARY KEY, `title` VARCHAR(255) NOT NULL, `slug` VARCHAR(255) NOT NULL UNIQUE, `icon` VARCHAR(100) NOT NULL, `route` VARCHAR(255) NOT NULL, `parent_slug` VARCHAR(255) NULL, `description` text NULL, `order` INT NOT NULL, `badge` VARCHAR(50) NULL, `badge_color` VARCHAR(50) NOT NULL, `page_type` VARCHAR(100) NOT NULL, `is_published` TINYINT(1) NOT NULL DEFAULT 0, `is_enabled` TINYINT(1) NOT NULL DEFAULT 0, `open_new_tab` TINYINT(1) NOT NULL DEFAULT 0, `allowed_roles` text NOT NULL, `allowed_permissions` text NOT NULL, `theme_colors` text NOT NULL, `crud_permissions` text NOT NULL, `entity_schema` text NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `root_folder_id` VARCHAR(255) NULL, `root_folder_name` VARCHAR(255) NULL, `google_drive_folder_id` VARCHAR(255) NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_customuser` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `password` VARCHAR(128) NOT NULL, `last_login` DATETIME NULL, `is_superuser` TINYINT(1) NOT NULL DEFAULT 0, `email` VARCHAR(254) NOT NULL UNIQUE, `name` VARCHAR(150) NOT NULL, `phone` VARCHAR(20) NULL, `designation` VARCHAR(100) NULL, `department` VARCHAR(100) NULL, `status` VARCHAR(20) NOT NULL, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `is_staff` TINYINT(1) NOT NULL DEFAULT 0, `is_active` TINYINT(1) NOT NULL DEFAULT 0, `role_id` BIGINT NULL, `stream` VARCHAR(100) NULL, `company_name` VARCHAR(200) NULL, `password_changed_at` DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_customuser_groups` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `customuser_id` BIGINT NOT NULL, `group_id` INT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_customuser_user_permissions` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `customuser_id` BIGINT NOT NULL, `permission_id` INT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_googledrivesetting` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `project_id` VARCHAR(255) NULL, `private_key_id` VARCHAR(255) NULL, `private_key` text NULL, `client_email` VARCHAR(254) NULL, `client_id` VARCHAR(255) NULL, `root_folder_id` VARCHAR(255) NULL, `type` VARCHAR(100) NOT NULL, `auth_uri` VARCHAR(200) NOT NULL, `token_uri` VARCHAR(200) NOT NULL, `auth_provider_x509_cert_url` VARCHAR(200) NOT NULL, `client_x509_cert_url` VARCHAR(500) NULL, `universe_domain` VARCHAR(100) NOT NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `access_token` text NULL, `client_secret` VARCHAR(500) NULL, `connected_email` VARCHAR(254) NULL, `refresh_token` text NULL, `storage_limit` BIGINT NULL, `storage_usage` BIGINT NULL, `token_expiry` DATETIME NULL, `connection_status` VARCHAR(50) NOT NULL, `default_upload_folder` VARCHAR(255) NULL, `last_connection_time` DATETIME NULL, `oauth_connected` TINYINT(1) NOT NULL DEFAULT 0, `token_data` text NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_passwordresetotp` (`id` CHAR(32) NOT NULL PRIMARY KEY, `otp_hash` VARCHAR(128) NOT NULL, `created_at` DATETIME NOT NULL, `expires_at` DATETIME NOT NULL, `is_used` TINYINT(1) NOT NULL DEFAULT 0, `used_at` DATETIME NULL, `ip_address` CHAR(39) NULL, `user_agent` text NULL, `user_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_smtpsetting` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `host` VARCHAR(255) NOT NULL, `port` INT NOT NULL, `username` VARCHAR(255) NULL, `use_tls` TINYINT(1) NOT NULL DEFAULT 0, `use_ssl` TINYINT(1) NOT NULL DEFAULT 0, `sender_email` VARCHAR(254) NOT NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `updated_at` DATETIME NOT NULL, `auth_required` TINYINT(1) NOT NULL DEFAULT 0, `password` VARCHAR(500) NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_userinvitation` (`id` CHAR(32) NOT NULL PRIMARY KEY, `email` VARCHAR(254) NOT NULL, `stream` VARCHAR(100) NOT NULL, `department` VARCHAR(100) NOT NULL, `token` VARCHAR(255) NOT NULL UNIQUE, `expires_at` DATETIME NOT NULL, `is_used` TINYINT(1) NOT NULL DEFAULT 0, `is_cancelled` TINYINT(1) NOT NULL DEFAULT 0, `created_at` DATETIME NOT NULL, `accepted_at` DATETIME NULL, `ip_address` CHAR(39) NULL, `user_agent` text NULL, `created_by_id` BIGINT NULL, `system_role_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")
    lines.append("CREATE TABLE IF NOT EXISTS `users_userpermission` (`id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY, `is_granted` TINYINT(1) NOT NULL DEFAULT 0, `permission_id` BIGINT NOT NULL, `user_id` BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;")

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

    lines.append("")
    lines.append("-- Seed Super Admin User")
    for u in User.objects.filter(is_superuser=True).order_by('id'):
        last_login_str = f"'{u.last_login.strftime('%Y-%m-%d %H:%M:%S')}'" if u.last_login else "NULL"
        created_at_str = f"'{u.created_at.strftime('%Y-%m-%d %H:%M:%S')}'" if u.created_at else "'2026-08-11 10:00:00'"
        updated_at_str = f"'{u.updated_at.strftime('%Y-%m-%d %H:%M:%S')}'" if u.updated_at else "'2026-08-11 10:00:00'"
        pwd_changed_str = f"'{u.password_changed_at.strftime('%Y-%m-%d %H:%M:%S')}'" if getattr(u, 'password_changed_at', None) else created_at_str
        role_id_str = str(u.role_id) if u.role_id else "1"
        lines.append(f"INSERT INTO `users_customuser` VALUES({u.id}, {escape_sql(u.password)}, {last_login_str}, {1 if u.is_superuser else 0}, {escape_sql(u.email)}, {escape_sql(u.name)}, {escape_sql(u.phone)}, {escape_sql(u.designation)}, {escape_sql(u.department)}, {escape_sql(u.status)}, {created_at_str}, {updated_at_str}, {1 if u.is_staff else 0}, {1 if u.is_active else 0}, {role_id_str}, {escape_sql(u.stream)}, {escape_sql(u.company_name)}, {pwd_changed_str});")

    lines.append("")
    lines.append("-- Seed Website Customization")
    for cust in WebsiteCustomization.objects.all().order_by('id'):
        created_str = f"'{cust.created_at.strftime('%Y-%m-%d %H:%M:%S')}'" if cust.created_at else "'2026-08-11 10:00:00'"
        updated_str = f"'{cust.updated_at.strftime('%Y-%m-%d %H:%M:%S')}'" if cust.updated_at else "'2026-08-11 10:00:00'"
        upd_by_str = str(cust.updated_by_id) if cust.updated_by_id else "NULL"
        lines.append(f"INSERT INTO `customization_websitecustomization` VALUES({cust.id}, {escape_sql(cust.name)}, {1 if cust.is_active else 0}, {escape_sql(cust.info)}, {escape_sql(cust.branding)}, {escape_sql(cust.theme)}, {escape_sql(cust.navigation)}, {escape_sql(cust.pages)}, {escape_sql(cust.login)}, {escape_sql(cust.dashboard)}, {escape_sql(cust.footer)}, {escape_sql(cust.notification)}, {escape_sql(cust.email_templates)}, {escape_sql(cust.error_pages)}, {escape_sql(cust.dynamic_text)}, {escape_sql(cust.custom_code)}, {created_str}, {updated_str}, {upd_by_str});")

    lines.append("")
    lines.append("-- Seed Streams")
    for s in Stream.objects.all().order_by('id'):
        created_str = f"'{s.created_at.strftime('%Y-%m-%d %H:%M:%S')}'" if s.created_at else "'2026-08-16 00:00:00'"
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
    lines.append("-- Seed MOU Categories (Department Cards)")
    for mc in MOUCategory.objects.all().order_by('id'):
        created_str = f"'{mc.created_at.strftime('%Y-%m-%d %H:%M:%S')}'" if mc.created_at else "'2026-08-16 00:00:00'"
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

    lines.append("")
    lines.append("SET FOREIGN_KEY_CHECKS = 1;")
    lines.append("COMMIT;")
    lines.append("")

    dump_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.sql")
    with open(dump_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Successfully exported database dump to '{dump_path}'. Total lines: {len(lines)}")

if __name__ == "__main__":
    generate_dump()
