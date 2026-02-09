-- Migration: Add synced_templates table for storing templates from Meta
-- Run this migration to support template syncing feature

CREATE TABLE IF NOT EXISTS synced_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    waba_id VARCHAR(50) NOT NULL,
    meta_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    language VARCHAR(20) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING',
    metadata JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (waba_id) REFERENCES waba_accounts(waba_id) ON DELETE CASCADE,
    INDEX idx_template_org (organization_id),
    INDEX idx_template_waba (waba_id),
    INDEX idx_template_status (status),
    INDEX idx_template_name (name),
    INDEX idx_template_category (category)
);

-- Add unique constraint on organization + meta_id combination
ALTER TABLE synced_templates 
ADD UNIQUE KEY unique_org_meta_template (organization_id, meta_id);
