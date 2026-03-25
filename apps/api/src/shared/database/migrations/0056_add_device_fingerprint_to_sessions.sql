-- Migration: 0056_add_device_fingerprint_to_sessions.sql
-- Description: Add missing columns to auth.sessions table (device_fingerprint, mfa_failed_attempts, mfa_locked_at)
-- Root cause: The session schema (sessions.ts) defines these fields but no migration was created to add them to the database
-- Issue: Tests fail with "column does not exist" errors

ALTER TABLE "auth"."sessions" ADD COLUMN IF NOT EXISTS "device_fingerprint" varchar(128);
ALTER TABLE "auth"."sessions" ADD COLUMN IF NOT EXISTS "mfa_failed_attempts" integer DEFAULT 0;
ALTER TABLE "auth"."sessions" ADD COLUMN IF NOT EXISTS "mfa_locked_at" timestamp with time zone;
