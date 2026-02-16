-- Migration: Add group_id column to contacts table for direct group relationship
-- This enables cascade delete of contacts when group is deleted

-- Add group_id column to contacts table
ALTER TABLE contacts 
ADD COLUMN group_id INT NULL AFTER is_favorite,
ADD CONSTRAINT fk_contact_group FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_contacts_group_id ON contacts(group_id);
