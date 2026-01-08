CREATE DATABASE IF NOT EXISTS campaign_service;
USE campaign_service;

CREATE TABLE IF NOT EXISTS campaigns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_id VARCHAR(255),
  group_id INT,
  scheduled_at DATETIME,
  status ENUM('draft', 'scheduled', 'running', 'completed', 'failed', 'paused') DEFAULT 'draft',
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_scheduled_at (scheduled_at)
);

CREATE TABLE IF NOT EXISTS campaign_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  campaign_id INT NOT NULL,
  contact_id INT,
  phone_number VARCHAR(20),
  status ENUM('pending', 'sent', 'delivered', 'failed', 'read') DEFAULT 'pending',
  message_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  INDEX idx_campaign_id (campaign_id),
  INDEX idx_status (status)
);
