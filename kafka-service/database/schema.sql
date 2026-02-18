-- Kafka Service Database Schema (MySQL)
-- This schema is used by the Kafka service to track message processing

CREATE DATABASE IF NOT EXISTS kafka_service;
USE kafka_service;

-- Messages table for tracking outbound messages
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(100) PRIMARY KEY,
    campaign_id VARCHAR(100),
    organization_id VARCHAR(100) NOT NULL,
    phone_number_id VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(30) NOT NULL,
    content JSON,
    status VARCHAR(20) DEFAULT 'pending',
    delivery_status VARCHAR(20),
    whatsapp_message_id VARCHAR(100),
    conversation_id VARCHAR(100),
    conversation_origin VARCHAR(30),
    pricing_category VARCHAR(30),
    error_code VARCHAR(20),
    error_message TEXT,
    error_details JSON,
    attempt_count INT DEFAULT 0,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_messages_campaign (campaign_id),
    INDEX idx_messages_organization (organization_id),
    INDEX idx_messages_status (status),
    INDEX idx_messages_delivery_status (delivery_status),
    INDEX idx_messages_whatsapp_id (whatsapp_message_id),
    INDEX idx_messages_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Incoming messages table for tracking inbound messages
CREATE TABLE IF NOT EXISTS incoming_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    whatsapp_message_id VARCHAR(100) UNIQUE NOT NULL,
    waba_id VARCHAR(50) NOT NULL,
    phone_number_id VARCHAR(50) NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    contact_name VARCHAR(255),
    message_type VARCHAR(30) NOT NULL,
    content JSON,
    context_message_id VARCHAR(100),
    context_from VARCHAR(20),
    is_read TINYINT(1) DEFAULT 0,
    read_at TIMESTAMP NULL,
    received_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_incoming_waba (waba_id),
    INDEX idx_incoming_phone (phone_number_id),
    INDEX idx_incoming_from (from_number),
    INDEX idx_incoming_received (received_at),
    INDEX idx_incoming_type (message_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campaign analytics table
CREATE TABLE IF NOT EXISTS campaign_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id VARCHAR(100) UNIQUE NOT NULL,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    read_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    clicked_count INT DEFAULT 0,
    replied_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily analytics snapshot
CREATE TABLE IF NOT EXISTS daily_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(100),
    date DATE NOT NULL,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    read_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    clicked_count INT DEFAULT 0,
    replied_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_daily_analytics (organization_id, campaign_id, date),
    INDEX idx_daily_analytics_org (organization_id),
    INDEX idx_daily_analytics_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dead letter queue for failed messages
CREATE TABLE IF NOT EXISTS dead_letter_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_message_id VARCHAR(100),
    message_payload JSON NOT NULL,
    error_type VARCHAR(50),
    error_message TEXT,
    error_stack TEXT,
    retry_count INT DEFAULT 0,
    last_attempt_at TIMESTAMP NULL,
    resolved TINYINT(1) DEFAULT 0,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dlq_resolved (resolved),
    INDEX idx_dlq_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- WABA accounts table (for webhook processing)
CREATE TABLE IF NOT EXISTS waba_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    waba_id VARCHAR(50) UNIQUE NOT NULL,
    organization_id VARCHAR(100) NOT NULL,
    business_name VARCHAR(255),
    access_token TEXT,
    account_status VARCHAR(30) DEFAULT 'ACTIVE',
    ban_info JSON,
    restriction_info JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Phone numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number_id VARCHAR(50) UNIQUE NOT NULL,
    waba_id VARCHAR(50) NOT NULL,
    display_phone_number VARCHAR(20) NOT NULL,
    verified_name VARCHAR(255),
    quality_rating VARCHAR(20) DEFAULT 'GREEN',
    messaging_limit VARCHAR(20) DEFAULT 'TIER_1K',
    status VARCHAR(20) DEFAULT 'CONNECTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (waba_id) REFERENCES waba_accounts(waba_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Templates table (for webhook status updates)
CREATE TABLE IF NOT EXISTS templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meta_template_id VARCHAR(50),
    waba_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    category VARCHAR(30),
    status VARCHAR(30) DEFAULT 'PENDING',
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (waba_id) REFERENCES waba_accounts(waba_id) ON DELETE CASCADE,
    UNIQUE KEY uq_template (waba_id, name, language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate limiting tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number_id VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(20),
    message_count INT DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rate_limit (phone_number_id, recipient_phone, window_start),
    INDEX idx_rate_limit_phone (phone_number_id),
    INDEX idx_rate_limit_window (window_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Webhook events log for debugging
CREATE TABLE IF NOT EXISTS webhook_events_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50),
    waba_id VARCHAR(50),
    payload JSON NOT NULL,
    processed TINYINT(1) DEFAULT 0,
    processed_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_webhook_log_type (event_type),
    INDEX idx_webhook_log_waba (waba_id),
    INDEX idx_webhook_log_processed (processed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campaigns table (local copy for scheduler)
CREATE TABLE IF NOT EXISTS campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    organization_id VARCHAR(100),
    template_id INT,
    group_id INT,
    status VARCHAR(30) DEFAULT 'draft',
    scheduled_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    total_recipients INT DEFAULT 0,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    read_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_campaigns_status (status),
    INDEX idx_campaigns_user (user_id),
    INDEX idx_campaigns_scheduled (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contacts table (local copy for campaign processing)
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    custom_fields JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact groups mapping
CREATE TABLE IF NOT EXISTS contact_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id INT NOT NULL,
    group_id INT NOT NULL,
    INDEX idx_cg_contact (contact_id),
    INDEX idx_cg_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
