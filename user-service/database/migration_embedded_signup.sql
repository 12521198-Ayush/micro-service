-- Migration: Add WABA Accounts and Phone Numbers tables for Embedded Signup
-- Run this migration to add WhatsApp Business Account management

-- WABA Accounts table
CREATE TABLE IF NOT EXISTS waba_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id INT,
    waba_id VARCHAR(50) UNIQUE NOT NULL,
    business_name VARCHAR(255),
    currency VARCHAR(10) DEFAULT 'USD',
    timezone_id VARCHAR(100),
    template_namespace VARCHAR(100),
    review_status VARCHAR(50) DEFAULT 'PENDING',
    business_verification_status VARCHAR(50),
    access_token TEXT,
    token_expires_at TIMESTAMP NULL,
    webhook_subscribed BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    ban_info JSON,
    restriction_info JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_waba_user (user_id),
    INDEX idx_waba_org (organization_id),
    INDEX idx_waba_status (status)
);

-- Phone Numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    waba_id VARCHAR(50) NOT NULL,
    phone_number_id VARCHAR(50) UNIQUE NOT NULL,
    display_phone_number VARCHAR(30) NOT NULL,
    verified_name VARCHAR(255),
    quality_rating VARCHAR(20) DEFAULT 'GREEN',
    messaging_limit_tier VARCHAR(30) DEFAULT 'TIER_1K',
    current_limit INT DEFAULT 1000,
    platform_type VARCHAR(30) DEFAULT 'CLOUD_API',
    code_verification_status VARCHAR(30) DEFAULT 'VERIFIED',
    name_status VARCHAR(30),
    status VARCHAR(30) DEFAULT 'CONNECTED',
    is_official_business_account BOOLEAN DEFAULT FALSE,
    is_pin_enabled BOOLEAN DEFAULT FALSE,
    last_onboarded_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (waba_id) REFERENCES waba_accounts(waba_id) ON DELETE CASCADE,
    INDEX idx_phone_waba (waba_id),
    INDEX idx_phone_status (status),
    INDEX idx_phone_quality (quality_rating)
);

-- Embedded Signup Sessions table (for tracking signup flow)
CREATE TABLE IF NOT EXISTS embedded_signup_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    organization_id INT,
    status VARCHAR(30) DEFAULT 'initialized',
    auth_code TEXT,
    access_token TEXT,
    waba_id VARCHAR(50),
    phone_number_id VARCHAR(50),
    error_message TEXT,
    metadata JSON,
    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_user (user_id),
    INDEX idx_session_status (status),
    INDEX idx_session_expires (expires_at)
);

-- Business Manager accounts (for organizations with multiple WABAs)
CREATE TABLE IF NOT EXISTS business_manager_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id INT,
    business_manager_id VARCHAR(50) UNIQUE NOT NULL,
    business_name VARCHAR(255),
    verification_status VARCHAR(30),
    primary_page_id VARCHAR(50),
    access_token TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_bm_user (user_id),
    INDEX idx_bm_org (organization_id)
);

-- API Credentials table (for storing per-account API settings)
CREATE TABLE IF NOT EXISTS api_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    waba_id VARCHAR(50) NOT NULL,
    credential_type VARCHAR(30) NOT NULL, -- 'system_user', 'user_token', 'permanent_token'
    credential_name VARCHAR(100),
    access_token TEXT NOT NULL,
    token_type VARCHAR(30) DEFAULT 'bearer',
    expires_at TIMESTAMP NULL,
    scopes JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (waba_id) REFERENCES waba_accounts(waba_id) ON DELETE CASCADE,
    INDEX idx_cred_waba (waba_id),
    INDEX idx_cred_active (is_active)
);

-- Webhook Subscriptions table
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    waba_id VARCHAR(50) NOT NULL,
    webhook_url VARCHAR(500) NOT NULL,
    verify_token VARCHAR(255) NOT NULL,
    subscribed_fields JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_event_at TIMESTAMP NULL,
    error_count INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (waba_id) REFERENCES waba_accounts(waba_id) ON DELETE CASCADE,
    INDEX idx_webhook_waba (waba_id),
    INDEX idx_webhook_active (is_active)
);

-- Rate Limit Tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number_id VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(30),
    message_count INT DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_rate_limit (phone_number_id, recipient_phone, window_start),
    INDEX idx_rate_phone (phone_number_id),
    INDEX idx_rate_window (window_end)
);
