-- Migration: Add preferences column to user_profiles
-- Description: Stores user preferences for settings system (display, accessibility, gameplay, audio, account)

ALTER TABLE auth.user_profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN auth.user_profiles.preferences IS 'User preferences for display, accessibility, gameplay, audio, and account settings';
