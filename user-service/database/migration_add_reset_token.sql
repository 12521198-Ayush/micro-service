-- Add password reset columns to users table
ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN reset_token_expires DATETIME;

-- Create index on reset_token for faster lookups
CREATE INDEX idx_reset_token ON users(reset_token);
