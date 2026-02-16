CREATE TABLE IF NOT EXISTS whatsapp_template_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    whatsapp_template_id BIGINT UNSIGNED NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    meta_business_account_id VARCHAR(64) NOT NULL,
    meta_app_id VARCHAR(64) NOT NULL,
    meta_phone_number_id VARCHAR(64) NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    to_phone VARCHAR(32) NOT NULL,
    template_name VARCHAR(512) NOT NULL,
    template_language VARCHAR(32) NOT NULL,
    template_type ENUM('STANDARD', 'CAROUSEL', 'FLOW', 'AUTHENTICATION', 'UNKNOWN') NOT NULL,
    request_payload_json JSON NOT NULL,
    response_payload_json JSON NULL,
    message_parameters_json JSON NULL,
    meta_message_id VARCHAR(128) NULL,
    status ENUM('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    retry_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    last_attempt_at DATETIME NULL,
    failure_code VARCHAR(128) NULL,
    failure_message VARCHAR(1024) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_template_message_meta_id (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        meta_message_id
    ),
    INDEX idx_template_message_tenant_status (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        status,
        created_at
    ),
    INDEX idx_template_message_to_phone (to_phone, created_at),
    CONSTRAINT fk_template_messages_template
        FOREIGN KEY (whatsapp_template_id)
        REFERENCES whatsapp_templates(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS whatsapp_template_callback_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    organization_id VARCHAR(64) NULL,
    meta_business_account_id VARCHAR(64) NULL,
    meta_app_id VARCHAR(64) NULL,
    meta_phone_number_id VARCHAR(64) NULL,
    meta_message_id VARCHAR(128) NULL,
    event_type ENUM('MESSAGE_STATUS', 'MESSAGE_INBOUND', 'FLOW_RESPONSE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    event_key VARCHAR(255) NOT NULL,
    raw_payload_json JSON NOT NULL,
    parsed_payload_json JSON NULL,
    processing_status ENUM('RECEIVED', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    error_message VARCHAR(1024) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_template_callback_event_key (event_key),
    INDEX idx_template_callback_tenant_created (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        created_at
    )
);

CREATE TABLE IF NOT EXISTS tenant_webhook_configs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    organization_id VARCHAR(64) NOT NULL,
    meta_business_account_id VARCHAR(64) NOT NULL,
    meta_app_id VARCHAR(64) NOT NULL,
    target_url VARCHAR(1024) NOT NULL,
    auth_type ENUM('NONE', 'BEARER', 'BASIC') NOT NULL DEFAULT 'NONE',
    auth_config_json JSON NULL,
    signing_secret VARCHAR(255) NULL,
    timeout_ms INT UNSIGNED NOT NULL DEFAULT 8000,
    max_retries SMALLINT UNSIGNED NOT NULL DEFAULT 6,
    retry_backoff_base_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 15,
    event_types_json JSON NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_delivery_status VARCHAR(64) NULL,
    last_delivery_at DATETIME NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    UNIQUE KEY uk_tenant_webhook_config (
        organization_id,
        meta_business_account_id,
        meta_app_id
    ),
    INDEX idx_tenant_webhook_active (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        is_active
    )
);

CREATE TABLE IF NOT EXISTS tenant_webhook_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_webhook_config_id BIGINT UNSIGNED NOT NULL,
    organization_id VARCHAR(64) NOT NULL,
    meta_business_account_id VARCHAR(64) NOT NULL,
    meta_app_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    event_key VARCHAR(255) NOT NULL,
    payload_json JSON NOT NULL,
    status ENUM('PENDING', 'PROCESSING', 'DELIVERED', 'RETRY_PENDING', 'DEAD', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at DATETIME NULL,
    last_http_status SMALLINT UNSIGNED NULL,
    last_error VARCHAR(1024) NULL,
    delivered_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_tenant_webhook_event_unique (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        event_type,
        event_key
    ),
    INDEX idx_tenant_webhook_event_dispatch (status, next_attempt_at),
    INDEX idx_tenant_webhook_event_tenant_created (
        organization_id,
        meta_business_account_id,
        meta_app_id,
        created_at
    ),
    CONSTRAINT fk_tenant_webhook_events_config
        FOREIGN KEY (tenant_webhook_config_id)
        REFERENCES tenant_webhook_configs(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_webhook_delivery_attempts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) NOT NULL UNIQUE,
    tenant_webhook_event_id BIGINT UNSIGNED NOT NULL,
    attempt_number SMALLINT UNSIGNED NOT NULL,
    request_headers_json JSON NOT NULL,
    request_payload_json JSON NOT NULL,
    response_status SMALLINT UNSIGNED NULL,
    response_body TEXT NULL,
    duration_ms INT UNSIGNED NULL,
    error_message VARCHAR(1024) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tenant_webhook_attempt_event_created (tenant_webhook_event_id, created_at),
    CONSTRAINT fk_tenant_webhook_attempts_event
        FOREIGN KEY (tenant_webhook_event_id)
        REFERENCES tenant_webhook_events(id)
        ON DELETE CASCADE
);
