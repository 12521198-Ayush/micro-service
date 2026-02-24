-- Create database
CREATE DATABASE IF NOT EXISTS user_service;
USE user_service;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'subadmin', 'user', 'subuser') NOT NULL DEFAULT 'user',
  meta_business_account_id VARCHAR(255),
  user_balance DECIMAL(10, 2) DEFAULT 0.00,
  marketing_message_price DECIMAL(10, 2) DEFAULT 0.10,
  utility_message_price DECIMAL(10, 2) DEFAULT 0.05,
  auth_message_price DECIMAL(10, 2) DEFAULT 0.05,
  reset_token VARCHAR(255),
  reset_token_expires DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_reset_token ON users(reset_token);
