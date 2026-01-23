-- Migration: Add lock_token column to reservations table
-- This enables tracking of which client owns a temporary slot lock

ALTER TABLE reservations ADD COLUMN lock_token TEXT;

-- Create index for faster lookup of locks by client token
CREATE INDEX IF NOT EXISTS idx_reservations_lock_token ON reservations(lock_token);
