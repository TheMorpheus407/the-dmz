-- Migration: 0038_presence_service
-- Description: Create presence table for real-time online/offline/in-game status tracking
--
-- Creates:
-- - social.presence table (tracks player presence state)
-- - presence_status enum
--
-- Required by Issue #242: M10-03 Presence Service
--
-- Presence States:
-- - offline: No active connection
-- - online: Connected, idle in lobby/menu
-- - in_session: Active in a single-player session
-- - in_coop: Active in a cooperative multiplayer session
-- - in_ranked: Active in a competitive/ranked session
--
-- Key Features:
-- - TTL-based Redis key expiration (90 seconds)
-- - Background reconciler syncs expired keys to offline state
-- - Privacy controls: public, friends_only, private
-- - RLS for tenant isolation

DO $$ BEGIN
  CREATE TYPE presence_status AS ENUM (
    'offline',
    'online',
    'in_session',
    'in_coop',
    'in_ranked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "social"."presence" (
  "player_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "status" varchar(20) NOT NULL DEFAULT 'offline',
  "status_data" jsonb NOT NULL DEFAULT '{}',
  "last_heartbeat" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("player_id")
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "presence_tenant_idx" ON "social"."presence" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "presence_status_idx" ON "social"."presence" USING btree ("status");
CREATE INDEX IF NOT EXISTS "presence_last_heartbeat_idx" ON "social"."presence" USING btree ("last_heartbeat");

-- Enable RLS on presence
ALTER TABLE "social"."presence" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on presence
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'presence' AND policyname = 'tenant_isolation_presence'
  ) THEN
    CREATE POLICY "tenant_isolation_presence" ON "social"."presence"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Seed feature flag for presence system
INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Social Presence System',
    'Enable the social presence functionality for tracking online/offline status',
    'social.presence_enabled',
    false,
    100,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;
