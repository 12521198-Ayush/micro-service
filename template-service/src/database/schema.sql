-- Canonical schema is managed with versioned SQL files under src/database/migrations.
-- This file is kept as a reference entrypoint.

SOURCE ./migrations/001_create_whatsapp_templates.sql;
SOURCE ./migrations/002_create_flow_engine.sql;
SOURCE ./migrations/003_whatsapp_template_index_compat.sql;
SOURCE ./migrations/004_template_tenant_hardening.sql;
SOURCE ./migrations/005_template_send_and_webhook_engine.sql;
SOURCE ./migrations/006_remove_template_send_gateway.sql;
