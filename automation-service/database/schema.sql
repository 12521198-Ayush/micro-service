-- Automation Flow Builder Database Schema
-- Service: automation-service

-- Flows table - stores automation flow definitions
CREATE TABLE IF NOT EXISTS flows (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  organization_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  `trigger` ENUM('new_contact', 'keywords') NULL,
  keywords TEXT NULL,
  metadata LONGTEXT NULL COMMENT 'JSON: stores entire flow graph {nodes, edges}',
  status ENUM('active', 'inactive') DEFAULT 'inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_organization_id (organization_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_trigger (`trigger`),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Flow user data - tracks which step a contact is on in a flow
CREATE TABLE IF NOT EXISTS flow_user_data (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contact_id BIGINT UNSIGNED NOT NULL,
  flow_id BIGINT UNSIGNED NOT NULL,
  current_step VARCHAR(255) NOT NULL DEFAULT '1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_contact_id (contact_id),
  INDEX idx_flow_id (flow_id),
  FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Flow logs - tracks flow execution per message
CREATE TABLE IF NOT EXISTS flow_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  flow_id BIGINT UNSIGNED NOT NULL,
  chat_id BIGINT UNSIGNED NULL,
  contact_id BIGINT UNSIGNED NULL,
  action_type VARCHAR(100) NULL,
  status VARCHAR(50) DEFAULT 'completed',
  metadata TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_flow_id (flow_id),
  INDEX idx_chat_id (chat_id),
  FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Flow media - stores uploaded media files for flow nodes
CREATE TABLE IF NOT EXISTS flow_media (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  flow_id BIGINT UNSIGNED NOT NULL,
  step_id VARCHAR(255) NOT NULL,
  path VARCHAR(500) NULL,
  location ENUM('local', 'aws') DEFAULT 'local',
  metadata TEXT NULL COMMENT 'JSON: {name, extension, size}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_flow_id (flow_id),
  INDEX idx_step_id (step_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
