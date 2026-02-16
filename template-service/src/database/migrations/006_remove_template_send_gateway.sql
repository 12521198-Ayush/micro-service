SET @has_whatsapp_template_messages := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'whatsapp_template_messages'
);

SET @drop_whatsapp_template_messages_sql := IF(
  @has_whatsapp_template_messages > 0,
  'DROP TABLE whatsapp_template_messages',
  'SELECT 1'
);

PREPARE stmt_drop_whatsapp_template_messages FROM @drop_whatsapp_template_messages_sql;
EXECUTE stmt_drop_whatsapp_template_messages;
DEALLOCATE PREPARE stmt_drop_whatsapp_template_messages;
