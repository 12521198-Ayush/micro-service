-- JWT Auth User Service - Complete Database Schema
-- This file contains all tables and migrations in one place

-- ============================================
-- 1. CREATE DATABASE
-- ============================================
CREATE DATABASE IF NOT EXISTS user_service;
USE user_service;

-- ============================================
-- 2. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  meta_business_account_id VARCHAR(255),
  user_balance DECIMAL(10, 2) DEFAULT 0.00,
  marketing_message_price DECIMAL(10, 2) DEFAULT 0.10,
  utility_message_price DECIMAL(10, 2) DEFAULT 0.05,
  auth_message_price DECIMAL(10, 2) DEFAULT 0.05,
  reset_token VARCHAR(255),
  reset_token_expires DATETIME,
  reset_attempts INT DEFAULT 0,
  reset_attempts_reset_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- 3. ORGANIZATION DETAILS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS organization_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  organization_name VARCHAR(255),
  physical_address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- ============================================
-- 4. WALLET TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  transaction_type ENUM('credit', 'debit') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id_transactions (user_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_created_at (created_at)
);

-- ============================================
-- 5. INDEXES
-- ============================================
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_reset_token ON users(reset_token);
CREATE INDEX idx_reset_token_org ON organization_details(user_id);

-- ============================================
-- TABLE DESCRIPTIONS
-- ============================================

-- USERS TABLE:
-- - id: Unique user identifier
-- - email: User's email address (unique)
-- - password: Hashed password using bcrypt
-- - name: User's full name
-- - reset_token: Token for password reset (nullable)
-- - reset_token_expires: Expiration time for reset token
-- - reset_attempts: Counter for password reset attempts in 24 hours
-- - reset_attempts_reset_at: Timestamp when reset attempt counter started
-- - created_at: Account creation timestamp
-- - updated_at: Last update timestamp

-- ORGANIZATION_DETAILS TABLE:
-- - id: Unique organization details identifier
-- - user_id: Foreign key referencing users table (one-to-one relationship)
-- - organization_name: Name of the business/organization
-- - physical_address: Street address of the organization
-- - city: City where organization is located
-- - state: State/Province of organization
-- - zip_code: Postal/Zip code
-- - country: Country of organization
-- - created_at: Organization details creation timestamp
-- - updated_at: Last update timestamp
