-- Add columns to track password reset attempts
ALTER TABLE users ADD COLUMN reset_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN reset_attempts_reset_at DATETIME;
