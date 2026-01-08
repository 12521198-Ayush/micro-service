-- Migration: Add meta_business_account_id column to users table
-- Date: 2025-12-18
-- Description: Adds META_BUSINESS_ACCOUNT_ID column to store Meta/Facebook business account identifier

USE user_service;

-- Add meta_business_account_id column
ALTER TABLE users 
ADD COLUMN meta_business_account_id VARCHAR(255) AFTER name;

-- Add index for better query performance (optional)
CREATE INDEX idx_meta_business_account_id ON users(meta_business_account_id);
