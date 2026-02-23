ALTER TABLE flow_templates
  ADD COLUMN meta_flow_id VARCHAR(64) NULL AFTER meta_app_id;

CREATE INDEX idx_flow_template_meta_flow_id
  ON flow_templates (meta_flow_id);
