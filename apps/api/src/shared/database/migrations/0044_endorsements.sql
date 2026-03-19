-- Migration: 0044_endorsements
-- Description: Create endorsement system tables:
--              - social.endorsement_tags (structured commendation tags)
--              - social.endorsement (endorsement records)
--              - social.endorsement_decay (decay tracking)
--
-- Required by Issue #248: M10-09 Endorsement System

-- Create endorsement_tags table
CREATE TABLE IF NOT EXISTS "social"."endorsement_tags" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "tag_key" varchar(50) NOT NULL UNIQUE,
  "display_name" varchar(100) NOT NULL,
  "description" varchar(280) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for endorsement_tags
CREATE INDEX IF NOT EXISTS "endorsement_tags_key_unique_idx" ON "social"."endorsement_tags" ("tag_key");
CREATE INDEX IF NOT EXISTS "endorsement_tags_active_idx" ON "social"."endorsement_tags" ("is_active");

-- Create endorsement table
CREATE TABLE IF NOT EXISTS "social"."endorsement" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "session_id" uuid,
  "endorser_player_id" uuid NOT NULL,
  "endorsed_player_id" uuid NOT NULL,
  "tag_id" uuid NOT NULL REFERENCES "social"."endorsement_tags"("id") ON DELETE RESTRICT,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "season_id" uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for endorsement
CREATE INDEX IF NOT EXISTS "endorsement_session_idx" ON "social"."endorsement" ("session_id");
CREATE INDEX IF NOT EXISTS "endorsement_endorser_idx" ON "social"."endorsement" ("endorser_player_id");
CREATE INDEX IF NOT EXISTS "endorsement_endorsed_idx" ON "social"."endorsement" ("endorsed_player_id");
CREATE INDEX IF NOT EXISTS "endorsement_tag_idx" ON "social"."endorsement" ("tag_id");
CREATE INDEX IF NOT EXISTS "endorsement_tenant_idx" ON "social"."endorsement" ("tenant_id");
CREATE INDEX IF NOT EXISTS "endorsement_season_idx" ON "social"."endorsement" ("season_id");
CREATE INDEX IF NOT EXISTS "endorsement_created_idx" ON "social"."endorsement" ("created_at");

-- Create unique constraint for endorsement
CREATE UNIQUE INDEX IF NOT EXISTS "endorsement_unique" ON "social"."endorsement" ("session_id", "endorser_player_id", "endorsed_player_id", "tag_id");

-- Enable RLS on endorsement
ALTER TABLE "social"."endorsement" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on endorsement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'endorsement'
    AND policyname = 'tenant_isolation_endorsement'
  ) THEN
    CREATE POLICY "tenant_isolation_endorsement" ON "social"."endorsement"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Add composite FK for tenant + endorser player
ALTER TABLE "social"."endorsement" ADD CONSTRAINT "endorsement_tenant_endorser_fkey"
  FOREIGN KEY ("tenant_id", "endorser_player_id") 
  REFERENCES "social"."player_profiles"("tenant_id", "profile_id") 
  ON DELETE CASCADE;

-- Add composite FK for tenant + endorsed player
ALTER TABLE "social"."endorsement" ADD CONSTRAINT "endorsement_tenant_endorsed_fkey"
  FOREIGN KEY ("tenant_id", "endorsed_player_id") 
  REFERENCES "social"."player_profiles"("tenant_id", "profile_id") 
  ON DELETE CASCADE;

-- Create endorsement_decay table
CREATE TABLE IF NOT EXISTS "social"."endorsement_decay" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "endorsement_id" uuid NOT NULL REFERENCES "social"."endorsement"("id") ON DELETE CASCADE,
  "reputation_impact" integer NOT NULL DEFAULT 10,
  "decay_schedule" jsonb NOT NULL DEFAULT '{"initialDecay": 0.9, "decayIntervalDays": 30, "finalDecay": 0.1}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "decayed_at" timestamp with time zone
);

-- Create indexes for endorsement_decay
CREATE INDEX IF NOT EXISTS "endorsement_decay_endorsement_idx" ON "social"."endorsement_decay" ("endorsement_id");
CREATE INDEX IF NOT EXISTS "endorsement_decay_decayed_idx" ON "social"."endorsement_decay" ("decayed_at");

-- Enable RLS on endorsement_decay
ALTER TABLE "social"."endorsement_decay" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on endorsement_decay (inherited via endorsement FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'endorsement_decay'
    AND policyname = 'tenant_isolation_endorsement_decay'
  ) THEN
    CREATE POLICY "tenant_isolation_endorsement_decay" ON "social"."endorsement_decay"
      FOR ALL
      USING ("endorsement_id" IN (
        SELECT "id" FROM "social"."endorsement" 
        WHERE "tenant_id" = "auth"."current_tenant_id"()
      ) OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("endorsement_id" IN (
        SELECT "id" FROM "social"."endorsement" 
        WHERE "tenant_id" = "auth"."current_tenant_id"()
      ) OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Seed default endorsement tags
INSERT INTO "social"."endorsement_tags" ("tag_key", "display_name", "description", "is_active") VALUES
  ('careful_verifier', 'Careful Verifier', 'Consistently requested verification and caught discrepancies', true),
  ('clear_communicator', 'Clear Communicator', 'Provided clear rationale for decisions', true),
  ('steady_incident_commander', 'Steady Incident Commander', 'Calm and effective during incidents', true),
  ('quick_responder', 'Quick Responder', 'Fast and accurate decision-making', true),
  ('team_player', 'Team Player', 'Supported partner and collaborated effectively', true),
  ('threat_hunter', 'Threat Hunter', 'Excellent at identifying subtle threats', true)
ON CONFLICT ("tag_key") DO NOTHING;
