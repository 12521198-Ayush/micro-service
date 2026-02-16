-- Support Ticket Service - Complete Database Schema
-- This file contains all tables for support ticket management

-- ============================================
-- 1. CREATE DATABASE
-- ============================================
CREATE DATABASE IF NOT EXISTS support_service;
USE support_service;

-- ============================================
-- 2. SUPPORT TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  
  -- Ticket Details
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category ENUM(
    'BILLING', 'TECHNICAL', 'FEATURE_REQUEST', 
    'BUG_REPORT', 'ACCOUNT', 'INTEGRATION', 
    'GENERAL', 'OTHER'
  ) NOT NULL DEFAULT 'GENERAL',
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  
  -- Status Management
  status ENUM('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED', 'REOPENED') 
    NOT NULL DEFAULT 'OPEN',
  
  -- Assignment
  assigned_to INT,
  assigned_at DATETIME,
  
  -- Resolution
  resolved_by INT,
  resolved_at DATETIME,
  resolution_time INT, -- in minutes
  
  -- Closure
  closed_by INT,
  closed_at DATETIME,
  
  -- Feedback
  has_feedback BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  tags JSON,
  attachments JSON,
  metadata JSON,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_ticket_number (ticket_number),
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_category (category),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_created_at (created_at),
  INDEX idx_resolved_at (resolved_at),
  INDEX idx_composite_status_priority (status, priority)
);

-- ============================================
-- 3. TICKET MESSAGES/REPLIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- Message Details
  message TEXT NOT NULL,
  message_type ENUM('USER_REPLY', 'ADMIN_REPLY', 'SYSTEM_NOTE', 'STATUS_CHANGE') 
    NOT NULL DEFAULT 'USER_REPLY',
  
  -- Attachments
  attachments JSON,
  
  -- Status Change Info (if message_type = STATUS_CHANGE)
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  
  -- Metadata
  is_internal BOOLEAN DEFAULT FALSE, -- Only visible to admins
  metadata JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_message_type (message_type)
);

-- ============================================
-- 4. TICKET FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- Ratings (1-5 stars)
  overall_rating INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  response_time_rating INT CHECK (response_time_rating BETWEEN 1 AND 5),
  solution_quality_rating INT CHECK (solution_quality_rating BETWEEN 1 AND 5),
  support_agent_rating INT CHECK (support_agent_rating BETWEEN 1 AND 5),
  
  -- Feedback
  comment TEXT,
  
  -- Satisfaction
  would_recommend BOOLEAN,
  
  -- Metadata
  feedback_tags JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  UNIQUE KEY unique_ticket_feedback (ticket_id),
  INDEX idx_user_id (user_id),
  INDEX idx_overall_rating (overall_rating),
  INDEX idx_created_at (created_at)
);

-- ============================================
-- 5. TICKET ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- Activity Details
  action ENUM(
    'CREATED', 'UPDATED', 'ASSIGNED', 'STATUS_CHANGED', 
    'PRIORITY_CHANGED', 'REPLIED', 'RESOLVED', 'CLOSED', 
    'REOPENED', 'FEEDBACK_SUBMITTED'
  ) NOT NULL,
  
  -- Change Details
  old_value VARCHAR(500),
  new_value VARCHAR(500),
  description TEXT,
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);

-- ============================================
-- 6. SUPPORT CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS support_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  
  -- Auto-assignment
  default_assignee INT,
  auto_assign_enabled BOOLEAN DEFAULT FALSE,
  
  -- SLA
  expected_response_time INT, -- in minutes
  expected_resolution_time INT, -- in minutes
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_slug (slug),
  INDEX idx_is_active (is_active)
);

-- ============================================
-- 7. CANNED RESPONSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS canned_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  
  -- Usage
  usage_count INT DEFAULT 0,
  last_used_at DATETIME,
  
  -- Organization
  tags JSON,
  
  -- Access
  is_public BOOLEAN DEFAULT TRUE,
  created_by INT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_is_active (is_active),
  INDEX idx_created_by (created_by)
);

-- ============================================
-- 8. SUPPORT AGENTS TABLE (Optional)
-- ============================================
CREATE TABLE IF NOT EXISTS support_agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  
  -- Agent Details
  display_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role ENUM('AGENT', 'SENIOR_AGENT', 'TEAM_LEAD', 'MANAGER') DEFAULT 'AGENT',
  
  -- Assignment
  max_concurrent_tickets INT DEFAULT 10,
  current_ticket_count INT DEFAULT 0,
  
  -- Specialization
  specializations JSON,
  languages JSON,
  
  -- Performance
  total_tickets_handled INT DEFAULT 0,
  average_resolution_time INT, -- in minutes
  average_rating DECIMAL(3, 2),
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  last_active_at DATETIME,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_is_available (is_available),
  INDEX idx_is_active (is_active)
);

-- ============================================
-- 9. INSERT DEFAULT CATEGORIES
-- ============================================
INSERT INTO support_categories (name, slug, description, icon, color, expected_response_time, expected_resolution_time, display_order) VALUES
('Billing & Payments', 'billing', 'Issues related to billing, payments, invoices, and subscriptions', 'rupee', '#10B981', 60, 240, 1),
('Technical Support', 'technical', 'Technical issues, bugs, and system errors', 'wrench', '#F59E0B', 30, 480, 2),
('Feature Request', 'feature-request', 'Suggestions for new features or improvements', 'lightbulb', '#8B5CF6', 120, 1440, 3),
('Bug Report', 'bug-report', 'Report bugs and unexpected behavior', 'bug', '#EF4444', 30, 720, 4),
('Account Management', 'account', 'Account settings, profile, and access issues', 'user', '#3B82F6', 60, 240, 5),
('Integration Help', 'integration', 'Help with WhatsApp API integration', 'plug', '#EC4899', 60, 480, 6),
('General Inquiry', 'general', 'General questions and information', 'info', '#6B7280', 120, 480, 7),
('Other', 'other', 'Issues not covered by other categories', 'question', '#9CA3AF', 120, 720, 8);

-- ============================================
-- 10. INSERT SAMPLE CANNED RESPONSES
-- ============================================
INSERT INTO canned_responses (title, content, category, tags) VALUES
('Welcome Message', 'Thank you for contacting support! We have received your ticket and will respond shortly. Our team is working to resolve your issue as quickly as possible.', 'general', '["welcome", "initial"]'),
('Request More Info', 'Thank you for your message. To help us better understand and resolve your issue, could you please provide the following additional information:\n\n1. [Specific information needed]\n2. [Additional details]\n\nThis will help us resolve your issue more quickly.', 'general', '["info-request"]'),
('Issue Resolved', 'Great news! We have successfully resolved your issue. Please let us know if you need any further assistance or if you experience any other problems.\n\nWe''re marking this ticket as resolved. If you have any feedback, please share it with us!', 'general', '["resolved"]'),
('Billing Issue', 'I understand you''re experiencing a billing issue. I''ve reviewed your account and [explanation of the issue]. [Solution or next steps].\n\nIf you have any questions about this, please let me know.', 'billing', '["billing"]'),
('Technical Troubleshooting', 'Thank you for reporting this technical issue. Let''s troubleshoot this step by step:\n\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\nPlease try these steps and let me know the results.', 'technical', '["troubleshooting"]'),
('Feature Request Acknowledgment', 'Thank you for your feature request! We really appreciate your feedback. I''ve added this to our feature request list for the product team to review.\n\nWhile I can''t guarantee when or if this will be implemented, we carefully consider all user feedback in our product roadmap.', 'feature-request', '["feature"]'),
('Escalation Notice', 'Thank you for your patience. I''ve escalated your ticket to our senior support team for further investigation. They will review your case and get back to you within [timeframe].', 'general', '["escalation"]');

-- ============================================
-- TABLE DESCRIPTIONS
-- ============================================

-- SUPPORT_TICKETS:
-- Main table storing all support tickets with status, priority, and assignment

-- TICKET_MESSAGES:
-- All messages/replies in a ticket thread (user + admin replies)

-- TICKET_FEEDBACK:
-- User feedback after ticket resolution (ratings + comments)

-- TICKET_ACTIVITY_LOG:
-- Complete audit trail of all ticket activities

-- SUPPORT_CATEGORIES:
-- Pre-defined categories for organizing tickets

-- CANNED_RESPONSES:
-- Pre-written responses for common queries

-- SUPPORT_AGENTS:
-- Agent profiles with performance metrics and availability
