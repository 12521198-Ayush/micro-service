CREATE DATABASE IF NOT EXISTS whatsapp_service;
USE whatsapp_service;

CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  template_id VARCHAR(255),
  message_type ENUM('text', 'template', 'image', 'video', 'document') DEFAULT 'text',
  content JSON,
  status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending',
  meta_message_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_phone_number (phone_number),
  INDEX idx_status (status),
  INDEX idx_meta_message_id (meta_message_id)
);

CREATE TABLE IF NOT EXISTS webhooks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(50),
  payload JSON,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_processed (processed)
);
