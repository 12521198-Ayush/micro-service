-- Migration: Add wallet columns to users table
-- Date: 2025-12-22
-- Description: Adds user_balance and per-message pricing columns for marketing, utility, and auth messages

USE user_service;

-- Add wallet-related columns to users table
ALTER TABLE users 
ADD COLUMN user_balance DECIMAL(10, 2) DEFAULT 0.00 AFTER meta_business_account_id,
ADD COLUMN marketing_message_price DECIMAL(10, 2) DEFAULT 0.10 AFTER user_balance,
ADD COLUMN utility_message_price DECIMAL(10, 2) DEFAULT 0.05 AFTER marketing_message_price,
ADD COLUMN auth_message_price DECIMAL(10, 2) DEFAULT 0.05 AFTER utility_message_price;

-- Create wallet_transactions table to track all balance changes
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
