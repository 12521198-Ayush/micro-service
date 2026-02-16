CREATE TABLE IF NOT EXISTS flow_component_definitions (
    type_key VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(128) NOT NULL,
    config_schema_json JSON NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO flow_component_definitions (type_key, display_name) VALUES
    ('text', 'Text'),
    ('input', 'Input'),
    ('textarea', 'Textarea'),
    ('number', 'Number'),
    ('phone', 'Phone'),
    ('email', 'Email'),
    ('select', 'Select'),
    ('radio', 'Radio'),
    ('checkbox', 'Checkbox'),
    ('date', 'Date'),
    ('time', 'Time'),
    ('datetime', 'Datetime'),
    ('file', 'File'),
    ('summary', 'Summary');

CREATE TABLE IF NOT EXISTS flow_action_definitions (
    type_key VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(128) NOT NULL,
    config_schema_json JSON NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO flow_action_definitions (type_key, display_name) VALUES
    ('next_screen', 'Next Screen'),
    ('previous_screen', 'Previous Screen'),
    ('submit', 'Submit'),
    ('external_api', 'External API');

CREATE TABLE IF NOT EXISTS flow_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    organization_id VARCHAR(64) NOT NULL,
    meta_business_account_id VARCHAR(64) NOT NULL,
    meta_app_id VARCHAR(64) NOT NULL,
    template_key VARCHAR(128) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    category ENUM(
        'LEAD_GENERATION',
        'LEAD_QUALIFICATION',
        'APPOINTMENT_BOOKING',
        'SLOT_BOOKING',
        'ORDER_PLACEMENT',
        'RE_ORDERING',
        'CUSTOMER_SUPPORT',
        'TICKET_CREATION',
        'PAYMENTS',
        'COLLECTIONS',
        'REGISTRATIONS',
        'APPLICATIONS',
        'DELIVERY_UPDATES',
        'ADDRESS_CAPTURE',
        'FEEDBACK',
        'SURVEYS'
    ) NOT NULL,
    status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    current_draft_version_id BIGINT UNSIGNED NULL,
    current_published_version_id BIGINT UNSIGNED NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    UNIQUE KEY uk_flow_template_tenant_key (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        template_key
    ),
    UNIQUE KEY uk_flow_template_tenant_name (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        name
    ),
    INDEX idx_flow_template_tenant_status (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        status
    ),
    INDEX idx_flow_template_tenant_created (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        created_at
    )
);

CREATE TABLE IF NOT EXISTS flow_versions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    flow_template_id BIGINT UNSIGNED NOT NULL,
    version_number INT UNSIGNED NOT NULL,
    status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    webhook_mapping_json JSON NULL,
    response_schema_json JSON NULL,
    approval_notes TEXT NULL,
    published_at DATETIME NULL,
    created_by BIGINT UNSIGNED NULL,
    approved_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_flow_version_number (flow_template_id, version_number),
    INDEX idx_flow_version_status (flow_template_id, status),
    INDEX idx_flow_version_created (flow_template_id, created_at),
    CONSTRAINT fk_flow_versions_template
        FOREIGN KEY (flow_template_id)
        REFERENCES flow_templates(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flow_screens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    flow_version_id BIGINT UNSIGNED NOT NULL,
    screen_key VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    order_index SMALLINT UNSIGNED NOT NULL,
    is_entry_point TINYINT(1) NOT NULL DEFAULT 0,
    settings_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_flow_screen_key (flow_version_id, screen_key),
    UNIQUE KEY uk_flow_screen_order (flow_version_id, order_index),
    INDEX idx_flow_screen_version (flow_version_id),
    CONSTRAINT fk_flow_screens_version
        FOREIGN KEY (flow_version_id)
        REFERENCES flow_versions(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS flow_components (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    flow_version_id BIGINT UNSIGNED NOT NULL,
    flow_screen_id BIGINT UNSIGNED NOT NULL,
    component_key VARCHAR(128) NOT NULL,
    component_type VARCHAR(64) NOT NULL,
    label VARCHAR(255) NOT NULL,
    variable_key VARCHAR(128) NULL,
    required TINYINT(1) NOT NULL DEFAULT 0,
    placeholder VARCHAR(255) NULL,
    options_json JSON NULL,
    validation_rules_json JSON NULL,
    default_value_json JSON NULL,
    config_json JSON NULL,
    order_index SMALLINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_flow_component_key (flow_screen_id, component_key),
    UNIQUE KEY uk_flow_component_variable (flow_version_id, variable_key),
    INDEX idx_flow_component_screen_order (flow_screen_id, order_index),
    INDEX idx_flow_component_type (component_type),
    CONSTRAINT fk_flow_components_version
        FOREIGN KEY (flow_version_id)
        REFERENCES flow_versions(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_flow_components_screen
        FOREIGN KEY (flow_screen_id)
        REFERENCES flow_screens(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_flow_components_definition
        FOREIGN KEY (component_type)
        REFERENCES flow_component_definitions(type_key)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS flow_actions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    flow_version_id BIGINT UNSIGNED NOT NULL,
    flow_screen_id BIGINT UNSIGNED NOT NULL,
    action_key VARCHAR(128) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    label VARCHAR(255) NULL,
    trigger_component_key VARCHAR(128) NULL,
    target_screen_key VARCHAR(128) NULL,
    api_config_json JSON NULL,
    payload_mapping_json JSON NULL,
    condition_json JSON NULL,
    order_index SMALLINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_flow_action_key (flow_screen_id, action_key),
    INDEX idx_flow_action_screen_order (flow_screen_id, order_index),
    INDEX idx_flow_action_target (flow_version_id, target_screen_key),
    CONSTRAINT fk_flow_actions_version
        FOREIGN KEY (flow_version_id)
        REFERENCES flow_versions(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_flow_actions_screen
        FOREIGN KEY (flow_screen_id)
        REFERENCES flow_screens(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_flow_actions_definition
        FOREIGN KEY (action_type)
        REFERENCES flow_action_definitions(type_key)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS flow_submissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    flow_template_id BIGINT UNSIGNED NOT NULL,
    flow_version_id BIGINT UNSIGNED NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    meta_business_account_id VARCHAR(64) NOT NULL,
    meta_app_id VARCHAR(64) NOT NULL,
    user_phone VARCHAR(32) NOT NULL,
    answers_json JSON NOT NULL,
    mapped_response_json JSON NULL,
    status ENUM('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    source ENUM('WHATSAPP', 'WEBHOOK', 'API') NOT NULL DEFAULT 'WEBHOOK',
    external_reference VARCHAR(128) NULL,
    error_message VARCHAR(512) NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_flow_submission_tenant (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        submitted_at
    ),
    INDEX idx_flow_submission_flow (
        flow_template_id,
        flow_version_id,
        submitted_at
    ),
    INDEX idx_flow_submission_phone (user_phone, submitted_at),
    CONSTRAINT fk_flow_submissions_template
        FOREIGN KEY (flow_template_id)
        REFERENCES flow_templates(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_flow_submissions_version
        FOREIGN KEY (flow_version_id)
        REFERENCES flow_versions(id)
        ON DELETE CASCADE
);

ALTER TABLE flow_templates
    ADD CONSTRAINT fk_flow_templates_current_draft
    FOREIGN KEY (current_draft_version_id)
    REFERENCES flow_versions(id)
    ON DELETE SET NULL;

ALTER TABLE flow_templates
    ADD CONSTRAINT fk_flow_templates_current_published
    FOREIGN KEY (current_published_version_id)
    REFERENCES flow_versions(id)
    ON DELETE SET NULL;
