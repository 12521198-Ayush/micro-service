-- Kafka Service Database Schema
-- This schema is used by the Kafka service to track message processing

-- Messages table for tracking outbound messages
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(100) PRIMARY KEY,
    campaign_id VARCHAR(100),
    organization_id VARCHAR(100) NOT NULL,
    phone_number_id VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    message_type VARCHAR(30) NOT NULL,
    content JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    delivery_status VARCHAR(20),
    whatsapp_message_id VARCHAR(100),
    conversation_id VARCHAR(100),
    conversation_origin VARCHAR(30),
    pricing_category VARCHAR(30),
    error_code VARCHAR(20),
    error_message TEXT,
    error_details JSONB,
    attempt_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_organization ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_id ON messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Incoming messages table for tracking inbound messages
CREATE TABLE IF NOT EXISTS incoming_messages (
    id SERIAL PRIMARY KEY,
    whatsapp_message_id VARCHAR(100) UNIQUE NOT NULL,
    waba_id VARCHAR(50) NOT NULL,
    phone_number_id VARCHAR(50) NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    contact_name VARCHAR(255),
    message_type VARCHAR(30) NOT NULL,
    content JSONB,
    context_message_id VARCHAR(100),
    context_from VARCHAR(20),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    received_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for incoming messages
CREATE INDEX IF NOT EXISTS idx_incoming_waba ON incoming_messages(waba_id);
CREATE INDEX IF NOT EXISTS idx_incoming_phone ON incoming_messages(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_incoming_from ON incoming_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_incoming_received ON incoming_messages(received_at);
CREATE INDEX IF NOT EXISTS idx_incoming_type ON incoming_messages(message_type);

-- Campaign analytics table
CREATE TABLE IF NOT EXISTS campaign_analytics (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(100) UNIQUE NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily analytics snapshot
CREATE TABLE IF NOT EXISTS daily_analytics (
    id SERIAL PRIMARY KEY,
    organization_id VARCHAR(100) NOT NULL,
    campaign_id VARCHAR(100),
    date DATE NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_analytics_org ON daily_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON daily_analytics(date);

-- Dead letter queue for failed messages
CREATE TABLE IF NOT EXISTS dead_letter_messages (
    id SERIAL PRIMARY KEY,
    original_message_id VARCHAR(100),
    message_payload JSONB NOT NULL,
    error_type VARCHAR(50),
    error_message TEXT,
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dlq_resolved ON dead_letter_messages(resolved);
CREATE INDEX IF NOT EXISTS idx_dlq_created ON dead_letter_messages(created_at);

-- WABA accounts table (for webhook processing)
CREATE TABLE IF NOT EXISTS waba_accounts (
    id SERIAL PRIMARY KEY,
    waba_id VARCHAR(50) UNIQUE NOT NULL,
    organization_id VARCHAR(100) NOT NULL,
    business_name VARCHAR(255),
    account_status VARCHAR(30) DEFAULT 'ACTIVE',
    ban_info JSONB,
    restriction_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phone numbers table
CREATE TABLE IF NOT EXISTS phone_numbers (
    id SERIAL PRIMARY KEY,
    phone_number_id VARCHAR(50) UNIQUE NOT NULL,
    waba_id VARCHAR(50) NOT NULL,
    display_phone_number VARCHAR(20) NOT NULL,
    verified_name VARCHAR(255),
    quality_rating VARCHAR(20) DEFAULT 'GREEN',
    messaging_limit VARCHAR(20) DEFAULT 'TIER_1K',
    status VARCHAR(20) DEFAULT 'CONNECTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (waba_id) REFERENCES waba_accounts(waba_id) ON DELETE CASCADE
);

-- Templates table (for webhook status updates)
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    meta_template_id VARCHAR(50),
    waba_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    category VARCHAR(30),
    status VARCHAR(30) DEFAULT 'PENDING',
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (waba_id) REFERENCES waba_accounts(waba_id) ON DELETE CASCADE,
    UNIQUE(waba_id, name, language)
);

-- Rate limiting tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id SERIAL PRIMARY KEY,
    phone_number_id VARCHAR(50) NOT NULL,
    recipient_phone VARCHAR(20),
    message_count INTEGER DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phone_number_id, recipient_phone, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_phone ON rate_limit_tracking(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracking(window_end);

-- Webhook events log for debugging
CREATE TABLE IF NOT EXISTS webhook_events_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    waba_id VARCHAR(50),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_type ON webhook_events_log(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_log_waba ON webhook_events_log(waba_id);
CREATE INDEX IF NOT EXISTS idx_webhook_log_processed ON webhook_events_log(processed);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_analytics_updated_at
    BEFORE UPDATE ON campaign_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waba_accounts_updated_at
    BEFORE UPDATE ON waba_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_numbers_updated_at
    BEFORE UPDATE ON phone_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
