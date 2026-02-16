SET @legacy_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'whatsapp_templates'
      AND index_name = 'uk_meta_template_id'
);

SET @drop_legacy_index_sql := IF(
    @legacy_index_exists > 0,
    'ALTER TABLE whatsapp_templates DROP INDEX uk_meta_template_id',
    'SELECT 1'
);
PREPARE stmt_drop_legacy_index FROM @drop_legacy_index_sql;
EXECUTE stmt_drop_legacy_index;
DEALLOCATE PREPARE stmt_drop_legacy_index;

SET @new_index_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'whatsapp_templates'
      AND index_name = 'uk_user_meta_template_id'
);

SET @add_new_index_sql := IF(
    @new_index_exists = 0,
    'ALTER TABLE whatsapp_templates ADD UNIQUE KEY uk_user_meta_template_id (user_id, meta_template_id)',
    'SELECT 1'
);
PREPARE stmt_add_new_index FROM @add_new_index_sql;
EXECUTE stmt_add_new_index;
DEALLOCATE PREPARE stmt_add_new_index;
