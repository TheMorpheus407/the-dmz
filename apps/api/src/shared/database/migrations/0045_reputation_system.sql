-- Migration: 0045_reputation_system
-- Description: Create reputation system tables:
--              - social.reputation_score (player reputation per season)
--              - social.reputation_history (audit trail for reputation changes)
--
-- Required by Issue #249: M10-10 Reputation System v1

-- Create reputation_score table
CREATE TABLE IF NOT EXISTS "social"."reputation_score" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "player_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "season_id" uuid,
  "total_score" integer NOT NULL DEFAULT 500,
  "endorsement_score" integer NOT NULL DEFAULT 0,
  "completion_score" integer NOT NULL DEFAULT 0,
  "report_penalty" integer NOT NULL DEFAULT 0,
  "abandonment_penalty" integer NOT NULL DEFAULT 0,
  "endorsement_count" integer NOT NULL DEFAULT 0,
  "session_completion_rate" decimal(5, 4),
  "verified_report_count" integer NOT NULL DEFAULT 0,
  "abandoned_session_count" integer NOT NULL DEFAULT 0,
  "last_updated_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for reputation_score
CREATE INDEX IF NOT EXISTS "reputation_score_player_idx" ON "social"."reputation_score" ("player_id");
CREATE INDEX IF NOT EXISTS "reputation_score_tenant_idx" ON "social"."reputation_score" ("tenant_id");
CREATE INDEX IF NOT EXISTS "reputation_score_season_idx" ON "social"."reputation_score" ("season_id");
CREATE INDEX IF NOT EXISTS "reputation_score_total_score_idx" ON "social"."reputation_score" ("total_score");

-- Create unique constraint for player per season
CREATE UNIQUE INDEX IF NOT EXISTS "reputation_score_player_season_unique" ON "social"."reputation_score" ("player_id", "season_id");

-- Enable RLS on reputation_score
ALTER TABLE "social"."reputation_score" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on reputation_score
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'reputation_score'
    AND policyname = 'tenant_isolation_reputation_score'
  ) THEN
    CREATE POLICY "tenant_isolation_reputation_score" ON "social"."reputation_score"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Add composite FK for tenant + player
ALTER TABLE "social"."reputation_score" ADD CONSTRAINT "reputation_score_tenant_player_fkey"
  FOREIGN KEY ("tenant_id", "player_id")
  REFERENCES "social"."player_profiles"("tenant_id", "profile_id")
  ON DELETE CASCADE;

-- Create reputation_history table
CREATE TABLE IF NOT EXISTS "social"."reputation_history" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "player_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "season_id" uuid,
  "delta" integer NOT NULL,
  "reason" varchar(50) NOT NULL,
  "reference_id" uuid,
  "score_after" integer NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for reputation_history
CREATE INDEX IF NOT EXISTS "reputation_history_player_idx" ON "social"."reputation_history" ("player_id");
CREATE INDEX IF NOT EXISTS "reputation_history_tenant_idx" ON "social"."reputation_history" ("tenant_id");
CREATE INDEX IF NOT EXISTS "reputation_history_season_idx" ON "social"."reputation_history" ("season_id");
CREATE INDEX IF NOT EXISTS "reputation_history_created_idx" ON "social"."reputation_history" ("created_at");
CREATE INDEX IF NOT EXISTS "reputation_history_reason_idx" ON "social"."reputation_history" ("reason");

-- Enable RLS on reputation_history
ALTER TABLE "social"."reputation_history" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on reputation_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'reputation_history'
    AND policyname = 'tenant_isolation_reputation_history'
  ) THEN
    CREATE POLICY "tenant_isolation_reputation_history" ON "social"."reputation_history"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;
