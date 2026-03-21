-- Migration: 0053_oauth_client_grace_period
-- Description: Add grace period columns for OAuth client secret rotation
--
-- Issue #279: OAuth client previousSecretHash has no expiration mechanism
-- Adds:
-- - rotation_grace_period_hours: configurable grace period (default 1 hour)
-- - rotation_grace_ends_at: timestamp when grace period expires

ALTER TABLE "auth"."oauth_clients"
ADD COLUMN IF NOT EXISTS "rotation_grace_period_hours" varchar(3) NOT NULL DEFAULT '1',
ADD COLUMN IF NOT EXISTS "rotation_grace_ends_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "oauth_clients_grace_ends_at_idx"
    ON "auth"."oauth_clients" USING btree ("rotation_grace_ends_at")
    WHERE "rotation_grace_ends_at" IS NOT NULL;