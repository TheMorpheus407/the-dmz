-- Migration: 0040_leaderboard
-- Description: Create leaderboard and leaderboard_entry tables
--
-- Creates:
-- - social.leaderboard (leaderboard metadata)
-- - social.leaderboard_entry (player scores on leaderboards)
--
-- Required by Issue #244: M10-05 Global and Regional Leaderboards

-- Create scope enum
DO $$ BEGIN
  CREATE TYPE leaderboard_scope AS ENUM ('global', 'regional', 'guild', 'tenant', 'friends');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create ranking category enum
DO $$ BEGIN
  CREATE TYPE ranking_category AS ENUM ('overall', 'accuracy', 'incident_response', 'resource_efficiency', 'speed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create time frame enum
DO $$ BEGIN
  CREATE TYPE time_frame AS ENUM ('daily', 'weekly', 'seasonal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create leaderboard table
CREATE TABLE IF NOT EXISTS "social"."leaderboard" (
  "leaderboard_id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "scope" varchar(20) NOT NULL,
  "region" varchar(20),
  "season_id" varchar(20) NOT NULL,
  "ranking_category" varchar(30) NOT NULL,
  "time_frame" varchar(20) NOT NULL DEFAULT 'seasonal',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create leaderboard_entry table
CREATE TABLE IF NOT EXISTS "social"."leaderboard_entry" (
  "entry_id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "leaderboard_id" uuid NOT NULL REFERENCES "social"."leaderboard"("leaderboard_id") ON DELETE CASCADE,
  "player_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "score" integer NOT NULL DEFAULT 0,
  "rank" integer NOT NULL DEFAULT 0,
  "metrics" jsonb NOT NULL DEFAULT '{"accuracy": 0, "avgDecisionTime": 0, "incidentsResolved": 0, "resourceEfficiency": 0}',
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "leaderboard_entry_leaderboard_rank_idx" ON "social"."leaderboard_entry" ("leaderboard_id", "rank");
CREATE INDEX IF NOT EXISTS "leaderboard_entry_player_idx" ON "social"."leaderboard_entry" ("player_id");
CREATE INDEX IF NOT EXISTS "leaderboard_entry_tenant_idx" ON "social"."leaderboard_entry" ("tenant_id");
CREATE INDEX IF NOT EXISTS "leaderboard_scope_season_idx" ON "social"."leaderboard" ("scope", "season_id");

-- Enable RLS
ALTER TABLE "social"."leaderboard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social"."leaderboard_entry" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on leaderboard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'leaderboard'
    AND policyname = 'tenant_isolation_leaderboard'
  ) THEN
    CREATE POLICY "tenant_isolation_leaderboard" ON "social"."leaderboard"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- RLS policy for tenant isolation on leaderboard_entry
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'leaderboard_entry'
    AND policyname = 'tenant_isolation_leaderboard_entry'
  ) THEN
    CREATE POLICY "tenant_isolation_leaderboard_entry" ON "social"."leaderboard_entry"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Seed default leaderboards for each scope
INSERT INTO "social"."leaderboard" ("scope", "region", "season_id", "ranking_category", "time_frame")
VALUES
  ('global', NULL, 'season-1', 'overall', 'seasonal'),
  ('global', NULL, 'season-1', 'accuracy', 'seasonal'),
  ('global', NULL, 'season-1', 'incident_response', 'seasonal'),
  ('global', NULL, 'season-1', 'resource_efficiency', 'seasonal'),
  ('global', NULL, 'season-1', 'speed', 'seasonal'),
  ('tenant', NULL, 'season-1', 'overall', 'seasonal'),
  ('tenant', NULL, 'season-1', 'accuracy', 'seasonal'),
  ('friends', NULL, 'season-1', 'overall', 'seasonal'),
  ('guild', NULL, 'season-1', 'overall', 'seasonal')
ON CONFLICT DO NOTHING;

-- Seed feature flag for leaderboards
INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Leaderboards System',
    'Enable global and regional leaderboards',
    'social.leaderboards_enabled',
    false,
    100,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;
