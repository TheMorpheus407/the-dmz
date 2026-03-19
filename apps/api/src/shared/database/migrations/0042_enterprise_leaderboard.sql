-- Migration: 0041_enterprise_leaderboard
-- Description: Create enterprise_leaderboard and leaderboard_score tables
--              for department, corporation, and tenant-scoped leaderboards
--              with privacy level support
--
-- Creates:
-- - social.enterprise_leaderboard (enterprise leaderboard metadata)
-- - social.leaderboard_score (player scores with department/corporation scoping)
--
-- Required by Issue #246: M10-07 Enterprise Leaderboards

-- Create enterprise_scope enum
DO $$ BEGIN
  CREATE TYPE enterprise_scope AS ENUM ('department', 'tenant', 'corporation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create privacy_level enum
DO $$ BEGIN
  CREATE TYPE privacy_level AS ENUM ('full_name', 'pseudonym', 'anonymous_aggregate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create leaderboard_type enum for enterprise leaderboards
DO $$ BEGIN
  CREATE TYPE leaderboard_type AS ENUM ('accuracy', 'response_time', 'incident_resolution', 'verification_discipline', 'composite');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create reset_cadence enum
DO $$ BEGIN
  CREATE TYPE reset_cadence AS ENUM ('daily', 'weekly', 'seasonal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enterprise_leaderboard table
CREATE TABLE IF NOT EXISTS "social"."enterprise_leaderboard" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "scope" enterprise_scope NOT NULL,
  "org_unit_id" uuid,
  "corporation_id" uuid,
  "leaderboard_type" leaderboard_type NOT NULL,
  "reset_cadence" reset_cadence NOT NULL DEFAULT 'seasonal',
  "current_season_id" varchar(20) NOT NULL DEFAULT 'season-1',
  "privacy_level" privacy_level NOT NULL DEFAULT 'full_name',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create leaderboard_score table
CREATE TABLE IF NOT EXISTS "social"."leaderboard_score" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "leaderboard_id" uuid NOT NULL REFERENCES "social"."enterprise_leaderboard"("id") ON DELETE CASCADE,
  "player_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "department_id" uuid,
  "corporation_id" uuid,
  "score" integer NOT NULL DEFAULT 0,
  "rank" integer NOT NULL DEFAULT 0,
  "metrics" jsonb NOT NULL DEFAULT '{"accuracy": 0, "avgDecisionTime": 0, "incidentsResolved": 0, "resourceEfficiency": 0}',
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for enterprise_leaderboard
CREATE INDEX IF NOT EXISTS "enterprise_leaderboard_tenant_idx" ON "social"."enterprise_leaderboard" ("tenant_id");
CREATE INDEX IF NOT EXISTS "enterprise_leaderboard_scope_idx" ON "social"."enterprise_leaderboard" ("scope");
CREATE INDEX IF NOT EXISTS "enterprise_leaderboard_org_unit_idx" ON "social"."enterprise_leaderboard" ("org_unit_id") WHERE "org_unit_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "enterprise_leaderboard_corporation_idx" ON "social"."enterprise_leaderboard" ("corporation_id") WHERE "corporation_id" IS NOT NULL;

-- Indexes for leaderboard_score
CREATE INDEX IF NOT EXISTS "leaderboard_score_leaderboard_idx" ON "social"."leaderboard_score" ("leaderboard_id");
CREATE INDEX IF NOT EXISTS "leaderboard_score_player_idx" ON "social"."leaderboard_score" ("player_id");
CREATE INDEX IF NOT EXISTS "leaderboard_score_tenant_idx" ON "social"."leaderboard_score" ("tenant_id");
CREATE INDEX IF NOT EXISTS "leaderboard_score_department_idx" ON "social"."leaderboard_score" ("department_id") WHERE "department_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "leaderboard_score_corporation_idx" ON "social"."leaderboard_score" ("corporation_id") WHERE "corporation_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "leaderboard_score_leaderboard_rank_idx" ON "social"."leaderboard_score" ("leaderboard_id", "rank");

-- Enable RLS
ALTER TABLE "social"."enterprise_leaderboard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social"."leaderboard_score" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on enterprise_leaderboard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'enterprise_leaderboard'
    AND policyname = 'tenant_isolation_enterprise_leaderboard'
  ) THEN
    CREATE POLICY "tenant_isolation_enterprise_leaderboard" ON "social"."enterprise_leaderboard"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- RLS policy for tenant isolation on leaderboard_score
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'leaderboard_score'
    AND policyname = 'tenant_isolation_leaderboard_score'
  ) THEN
    CREATE POLICY "tenant_isolation_leaderboard_score" ON "social"."leaderboard_score"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Seed default enterprise leaderboards for each scope
INSERT INTO "social"."enterprise_leaderboard" ("tenant_id", "scope", "leaderboard_type", "reset_cadence", "current_season_id", "privacy_level")
SELECT 
    t.tenant_id,
    'department',
    'composite',
    'weekly',
    'season-1',
    'full_name'
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT DO NOTHING;

INSERT INTO "social"."enterprise_leaderboard" ("tenant_id", "scope", "leaderboard_type", "reset_cadence", "current_season_id", "privacy_level")
SELECT 
    t.tenant_id,
    'tenant',
    'composite',
    'seasonal',
    'season-1',
    'full_name'
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT DO NOTHING;

-- Seed feature flag for enterprise leaderboards scope control
INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Enterprise Leaderboards Scope',
    'Control which leaderboard scopes are visible to users',
    'social.leaderboards.scope',
    true,
    100,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;
