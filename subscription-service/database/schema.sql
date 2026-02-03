-- Subscription Plans Service - Complete Database Schema
-- This file contains all tables for subscription and billing management

-- ============================================
-- 1. CREATE DATABASE
-- ============================================
CREATE DATABASE IF NOT EXISTS subscription_service;
USE subscription_service;

-- ============================================
-- 2. SUBSCRIPTION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_code VARCHAR(50) UNIQUE NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  plan_description TEXT,
  plan_type ENUM('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'LIFETIME') NOT NULL,
  
  -- Pricing (in INR)
  monthly_price DECIMAL(10, 2) DEFAULT 0.00,
  yearly_price DECIMAL(10, 2) DEFAULT 0.00,
  lifetime_price DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Feature Limits
  max_contacts INT DEFAULT 0,
  max_templates INT DEFAULT 0,
  max_campaigns_per_month INT DEFAULT 0,
  max_messages_per_month INT DEFAULT 0,
  max_team_members INT DEFAULT 1,
  max_whatsapp_numbers INT DEFAULT 1,
  
  -- Feature Flags
  has_advanced_analytics BOOLEAN DEFAULT FALSE,
  has_automation BOOLEAN DEFAULT FALSE,
  has_api_access BOOLEAN DEFAULT FALSE,
  has_priority_support BOOLEAN DEFAULT FALSE,
  has_white_label BOOLEAN DEFAULT FALSE,
  has_custom_reports BOOLEAN DEFAULT FALSE,
  has_webhooks BOOLEAN DEFAULT FALSE,
  has_bulk_messaging BOOLEAN DEFAULT FALSE,
  
  -- Message Pricing (per message in INR)
  marketing_message_price DECIMAL(10, 4) DEFAULT 0.3500,
  utility_message_price DECIMAL(10, 4) DEFAULT 0.1500,
  auth_message_price DECIMAL(10, 4) DEFAULT 0.1500,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_plan_code (plan_code),
  INDEX idx_plan_type (plan_type),
  INDEX idx_is_active (is_active)
);

-- ============================================
-- 3. USER SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  
  -- Billing Details
  billing_cycle ENUM('MONTHLY', 'YEARLY', 'LIFETIME') NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  
  -- Subscription Period
  start_date DATETIME NOT NULL,
  end_date DATETIME,
  next_billing_date DATETIME,
  
  -- Status
  status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'TRIAL') DEFAULT 'ACTIVE',
  auto_renew BOOLEAN DEFAULT TRUE,
  
  -- Trial Information
  is_trial BOOLEAN DEFAULT FALSE,
  trial_end_date DATETIME,
  
  -- Cancellation
  cancelled_at DATETIME,
  cancellation_reason TEXT,
  cancelled_by INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_end_date (end_date),
  INDEX idx_next_billing_date (next_billing_date)
);

-- ============================================
-- 4. SUBSCRIPTION TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- Transaction Details
  transaction_type ENUM('NEW', 'RENEWAL', 'UPGRADE', 'DOWNGRADE', 'REFUND') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  
  -- Payment Details
  payment_method ENUM('RAZORPAY', 'STRIPE', 'WALLET', 'MANUAL', 'FREE') DEFAULT 'RAZORPAY',
  payment_id VARCHAR(255),
  payment_status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
  
  -- Payment Gateway Response
  gateway_order_id VARCHAR(255),
  gateway_payment_id VARCHAR(255),
  gateway_signature VARCHAR(255),
  gateway_response JSON,
  
  -- Invoice
  invoice_number VARCHAR(100),
  invoice_url VARCHAR(500),
  
  -- Metadata
  description TEXT,
  metadata JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE RESTRICT,
  INDEX idx_user_id (user_id),
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_payment_status (payment_status),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_created_at (created_at)
);

-- ============================================
-- 5. USAGE TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subscription_id INT NOT NULL,
  
  -- Usage Counters (Current Month)
  month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
  
  contacts_count INT DEFAULT 0,
  templates_count INT DEFAULT 0,
  campaigns_count INT DEFAULT 0,
  messages_sent INT DEFAULT 0,
  team_members_count INT DEFAULT 0,
  whatsapp_numbers_count INT DEFAULT 0,
  
  -- Message Breakdown
  marketing_messages INT DEFAULT 0,
  utility_messages INT DEFAULT 0,
  auth_messages INT DEFAULT 0,
  
  -- Last Update
  last_reset_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_month (user_id, month_year),
  INDEX idx_user_id (user_id),
  INDEX idx_month_year (month_year),
  INDEX idx_subscription_id (subscription_id)
);

-- ============================================
-- 6. SUBSCRIPTION HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subscription_id INT NOT NULL,
  
  -- Action Details
  action_type ENUM('CREATED', 'RENEWED', 'UPGRADED', 'DOWNGRADED', 'CANCELLED', 'EXPIRED', 'SUSPENDED', 'REACTIVATED') NOT NULL,
  from_plan_id INT,
  to_plan_id INT,
  
  -- Details
  description TEXT,
  metadata JSON,
  
  -- Who performed the action
  performed_by INT,
  performed_by_type ENUM('USER', 'ADMIN', 'SYSTEM') DEFAULT 'USER',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (from_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (to_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_subscription_id (subscription_id),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at)
);

-- ============================================
-- 7. PROMO CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS promo_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  -- Discount Details
  discount_type ENUM('PERCENTAGE', 'FIXED_AMOUNT') NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  max_discount_amount DECIMAL(10, 2),
  
  -- Applicability
  applicable_plans JSON, -- Array of plan IDs
  applicable_billing_cycles JSON, -- Array of billing cycles
  
  -- Validity
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  
  -- Usage Limits
  max_uses INT,
  max_uses_per_user INT DEFAULT 1,
  current_uses INT DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_is_active (is_active),
  INDEX idx_valid_from (valid_from),
  INDEX idx_valid_until (valid_until)
);

-- ============================================
-- 8. PROMO CODE USAGE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS promo_code_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  promo_code_id INT NOT NULL,
  user_id INT NOT NULL,
  subscription_id INT NOT NULL,
  transaction_id INT,
  
  discount_amount DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES subscription_transactions(id) ON DELETE SET NULL,
  INDEX idx_promo_code_id (promo_code_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- ============================================
-- 9. INSERT DEFAULT SUBSCRIPTION PLANS
-- ============================================

-- Free Plan
INSERT INTO subscription_plans (
  plan_code, plan_name, plan_description, plan_type,
  monthly_price, yearly_price, lifetime_price,
  max_contacts, max_templates, max_campaigns_per_month, max_messages_per_month,
  max_team_members, max_whatsapp_numbers,
  has_advanced_analytics, has_automation, has_api_access, has_priority_support,
  has_white_label, has_custom_reports, has_webhooks, has_bulk_messaging,
  marketing_message_price, utility_message_price, auth_message_price,
  is_active, is_visible, display_order
) VALUES (
  'FREE', 'Free Plan', 'Perfect for trying out WhatsApp Business API', 'FREE',
  0.00, 0.00, 0.00,
  100, 3, 5, 500,
  1, 1,
  FALSE, FALSE, FALSE, FALSE,
  FALSE, FALSE, FALSE, FALSE,
  0.3500, 0.1500, 0.1500,
  TRUE, TRUE, 1
);

-- Starter Plan
INSERT INTO subscription_plans (
  plan_code, plan_name, plan_description, plan_type,
  monthly_price, yearly_price, lifetime_price,
  max_contacts, max_templates, max_campaigns_per_month, max_messages_per_month,
  max_team_members, max_whatsapp_numbers,
  has_advanced_analytics, has_automation, has_api_access, has_priority_support,
  has_white_label, has_custom_reports, has_webhooks, has_bulk_messaging,
  marketing_message_price, utility_message_price, auth_message_price,
  is_active, is_visible, display_order
) VALUES (
  'STARTER', 'Starter Plan', 'Great for small businesses getting started', 'STARTER',
  999.00, 9999.00, 0.00,
  1000, 10, 20, 5000,
  3, 1,
  TRUE, FALSE, FALSE, FALSE,
  FALSE, FALSE, FALSE, TRUE,
  0.3000, 0.1200, 0.1200,
  TRUE, TRUE, 2
);

-- Professional Plan
INSERT INTO subscription_plans (
  plan_code, plan_name, plan_description, plan_type,
  monthly_price, yearly_price, lifetime_price,
  max_contacts, max_templates, max_campaigns_per_month, max_messages_per_month,
  max_team_members, max_whatsapp_numbers,
  has_advanced_analytics, has_automation, has_api_access, has_priority_support,
  has_white_label, has_custom_reports, has_webhooks, has_bulk_messaging,
  marketing_message_price, utility_message_price, auth_message_price,
  is_active, is_visible, display_order
) VALUES (
  'PROFESSIONAL', 'Professional Plan', 'Advanced features for growing businesses', 'PROFESSIONAL',
  2999.00, 29999.00, 0.00,
  10000, 50, 100, 50000,
  10, 3,
  TRUE, TRUE, TRUE, TRUE,
  FALSE, TRUE, TRUE, TRUE,
  0.2500, 0.1000, 0.1000,
  TRUE, TRUE, 3
);

-- Enterprise Plan
INSERT INTO subscription_plans (
  plan_code, plan_name, plan_description, plan_type,
  monthly_price, yearly_price, lifetime_price,
  max_contacts, max_templates, max_campaigns_per_month, max_messages_per_month,
  max_team_members, max_whatsapp_numbers,
  has_advanced_analytics, has_automation, has_api_access, has_priority_support,
  has_white_label, has_custom_reports, has_webhooks, has_bulk_messaging,
  marketing_message_price, utility_message_price, auth_message_price,
  is_active, is_visible, display_order
) VALUES (
  'ENTERPRISE', 'Enterprise Plan', 'Unlimited features for large organizations', 'ENTERPRISE',
  9999.00, 99999.00, 0.00,
  -1, -1, -1, -1, -- -1 means unlimited
  -1, 10,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE,
  0.2000, 0.0800, 0.0800,
  TRUE, TRUE, 4
);

-- Lifetime Plan
INSERT INTO subscription_plans (
  plan_code, plan_name, plan_description, plan_type,
  monthly_price, yearly_price, lifetime_price,
  max_contacts, max_templates, max_campaigns_per_month, max_messages_per_month,
  max_team_members, max_whatsapp_numbers,
  has_advanced_analytics, has_automation, has_api_access, has_priority_support,
  has_white_label, has_custom_reports, has_webhooks, has_bulk_messaging,
  marketing_message_price, utility_message_price, auth_message_price,
  is_active, is_visible, display_order
) VALUES (
  'LIFETIME', 'Lifetime Access', 'One-time payment for lifetime access', 'LIFETIME',
  0.00, 0.00, 199999.00,
  -1, -1, -1, -1,
  -1, 5,
  TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE,
  0.2000, 0.0800, 0.0800,
  TRUE, TRUE, 5
);

-- ============================================
-- TABLE DESCRIPTIONS
-- ============================================

-- SUBSCRIPTION_PLANS:
-- Stores all available subscription plans with their features and pricing

-- USER_SUBSCRIPTIONS:
-- Tracks active subscriptions for each user

-- SUBSCRIPTION_TRANSACTIONS:
-- Records all payment transactions related to subscriptions

-- USAGE_TRACKING:
-- Monitors usage against plan limits on monthly basis

-- SUBSCRIPTION_HISTORY:
-- Audit trail of all subscription changes

-- PROMO_CODES:
-- Stores promotional discount codes

-- PROMO_CODE_USAGE:
-- Tracks usage of promo codes by users
