-- Create template_service database
CREATE DATABASE IF NOT EXISTS template_service;
USE template_service;

-- Custom Template Table
CREATE TABLE IF NOT EXISTS custom_template (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    meta_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    language VARCHAR(50),
    metadata JSON,
    status ENUM('Pending', 'approve', 'rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_uuid (uuid),
    INDEX idx_status (status)
);

-- Carousel Template Table
CREATE TABLE IF NOT EXISTS carousel_template (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    meta_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    language VARCHAR(50),
    metadata JSON,
    status ENUM('Pending', 'approve', 'rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_uuid (uuid),
    INDEX idx_status (status)
);

-- Flow Template Table
CREATE TABLE IF NOT EXISTS flow_template (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    meta_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    language VARCHAR(50),
    metadata JSON,
    status ENUM('Pending', 'approve', 'rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_uuid (uuid),
    INDEX idx_status (status)
);
