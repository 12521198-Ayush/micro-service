SET @has_organization_id := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_templates'
    AND column_name = 'organization_id'
);

SET @add_organization_id_sql := IF(
  @has_organization_id = 0,
  'ALTER TABLE whatsapp_templates ADD COLUMN organization_id VARCHAR(64) NOT NULL DEFAULT ''legacy_org'' AFTER uuid',
  'SELECT 1'
);

PREPARE stmt_add_organization_id FROM @add_organization_id_sql;
EXECUTE stmt_add_organization_id;
DEALLOCATE PREPARE stmt_add_organization_id;

SET @has_meta_app_id := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_templates'
    AND column_name = 'meta_app_id'
);

SET @add_meta_app_id_sql := IF(
  @has_meta_app_id = 0,
  'ALTER TABLE whatsapp_templates ADD COLUMN meta_app_id VARCHAR(64) NOT NULL DEFAULT ''legacy_meta_app'' AFTER meta_business_account_id',
  'SELECT 1'
);

PREPARE stmt_add_meta_app_id FROM @add_meta_app_id_sql;
EXECUTE stmt_add_meta_app_id;
DEALLOCATE PREPARE stmt_add_meta_app_id;

SET @has_created_by := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_templates'
    AND column_name = 'created_by'
);

SET @add_created_by_sql := IF(
  @has_created_by = 0,
  'ALTER TABLE whatsapp_templates ADD COLUMN created_by BIGINT UNSIGNED NULL',
  'SELECT 1'
);

PREPARE stmt_add_created_by FROM @add_created_by_sql;
EXECUTE stmt_add_created_by;
DEALLOCATE PREPARE stmt_add_created_by;

SET @has_updated_by := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_templates'
    AND column_name = 'updated_by'
);

SET @add_updated_by_sql := IF(
  @has_updated_by = 0,
  'ALTER TABLE whatsapp_templates ADD COLUMN updated_by BIGINT UNSIGNED NULL',
  'SELECT 1'
);

PREPARE stmt_add_updated_by FROM @add_updated_by_sql;
EXECUTE stmt_add_updated_by;
DEALLOCATE PREPARE stmt_add_updated_by;

UPDATE whatsapp_templates
SET organization_id = CONCAT('legacy_user_', user_id)
WHERE organization_id = 'legacy_org' OR organization_id IS NULL;

UPDATE whatsapp_templates
SET meta_app_id = CONCAT('legacy_waba_', meta_business_account_id)
WHERE meta_app_id = 'legacy_meta_app' OR meta_app_id IS NULL;

SET @has_uk_waba_name_language := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_templates'
    AND index_name = 'uk_waba_name_language'
);

SET @drop_uk_waba_name_language_sql := IF(
  @has_uk_waba_name_language > 0,
  'ALTER TABLE whatsapp_templates DROP INDEX uk_waba_name_language',
  'SELECT 1'
);

PREPARE stmt_drop_uk_waba_name_language FROM @drop_uk_waba_name_language_sql;
EXECUTE stmt_drop_uk_waba_name_language;
DEALLOCATE PREPARE stmt_drop_uk_waba_name_language;

SET @has_uk_user_meta_template_id := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_templates'
    AND index_name = 'uk_user_meta_template_id'
);

SET @drop_uk_user_meta_template_id_sql := IF(
  @has_uk_user_meta_template_id > 0,
  'ALTER TABLE whatsapp_templates DROP INDEX uk_user_meta_template_id',
  'SELECT 1'
);

PREPARE stmt_drop_uk_user_meta_template_id FROM @drop_uk_user_meta_template_id_sql;
EXECUTE stmt_drop_uk_user_meta_template_id;
DEALLOCATE PREPARE stmt_drop_uk_user_meta_template_id;

SET @has_uk_template_tenant_name_language := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_templates'
    AND index_name = 'uk_template_tenant_name_language'
);

SET @add_uk_template_tenant_name_language_sql := IF(
  @has_uk_template_tenant_name_language = 0,
  'ALTER TABLE whatsapp_templates ADD UNIQUE KEY uk_template_tenant_name_language (organization_id, meta_business_account_id, meta_app_id, name, language)',
  'SELECT 1'
);

PREPARE stmt_add_uk_template_tenant_name_language FROM @add_uk_template_tenant_name_language_sql;
EXECUTE stmt_add_uk_template_tenant_name_language;
DEALLOCATE PREPARE stmt_add_uk_template_tenant_name_language;

SET @has_uk_template_tenant_meta_template_id := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_templates'
    AND index_name = 'uk_template_tenant_meta_template_id'
);

SET @add_uk_template_tenant_meta_template_id_sql := IF(
  @has_uk_template_tenant_meta_template_id = 0,
  'ALTER TABLE whatsapp_templates ADD UNIQUE KEY uk_template_tenant_meta_template_id (organization_id, meta_business_account_id, meta_app_id, meta_template_id)',
  'SELECT 1'
);

PREPARE stmt_add_uk_template_tenant_meta_template_id FROM @add_uk_template_tenant_meta_template_id_sql;
EXECUTE stmt_add_uk_template_tenant_meta_template_id;
DEALLOCATE PREPARE stmt_add_uk_template_tenant_meta_template_id;

SET @has_idx_template_tenant_status := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_templates'
    AND index_name = 'idx_template_tenant_status'
);

SET @add_idx_template_tenant_status_sql := IF(
  @has_idx_template_tenant_status = 0,
  'ALTER TABLE whatsapp_templates ADD INDEX idx_template_tenant_status (organization_id, meta_business_account_id, meta_app_id, status)',
  'SELECT 1'
);

PREPARE stmt_add_idx_template_tenant_status FROM @add_idx_template_tenant_status_sql;
EXECUTE stmt_add_idx_template_tenant_status;
DEALLOCATE PREPARE stmt_add_idx_template_tenant_status;

SET @has_idx_template_tenant_type := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_templates'
    AND index_name = 'idx_template_tenant_type'
);

SET @add_idx_template_tenant_type_sql := IF(
  @has_idx_template_tenant_type = 0,
  'ALTER TABLE whatsapp_templates ADD INDEX idx_template_tenant_type (organization_id, meta_business_account_id, meta_app_id, template_type)',
  'SELECT 1'
);

PREPARE stmt_add_idx_template_tenant_type FROM @add_idx_template_tenant_type_sql;
EXECUTE stmt_add_idx_template_tenant_type;
DEALLOCATE PREPARE stmt_add_idx_template_tenant_type;
