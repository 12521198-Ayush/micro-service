-- Migration: Add role column to users table
-- Date: 2026-02-24
-- Description: Adds non-null role enum with default 'user'

USE user_service;

ALTER TABLE users
ADD COLUMN role ENUM('admin', 'subadmin', 'user', 'subuser') NOT NULL DEFAULT 'user' AFTER name;
