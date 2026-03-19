-- Migration: 0043_achievements
-- Description: Create achievement system tables:
--              - social.achievement_definitions (master catalog)
--              - social.achievement_icon (pre-approved icon catalog)
--              - social.player_achievements (per-player unlocked achievements)
--
-- Required by Issue #247: M10-08 Achievement and Badge System

-- Create achievement_category enum
DO $$ BEGIN
  CREATE TYPE achievement_category AS ENUM ('core_competency', 'operational_mastery', 'social_contribution', 'narrative_milestone', 'hidden_badge');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create achievement_visibility enum
DO $$ BEGIN
  CREATE TYPE achievement_visibility AS ENUM ('visible', 'hidden');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create achievement_icon_category enum
DO $$ BEGIN
  CREATE TYPE achievement_icon_category AS ENUM ('animal', 'robot', 'geometric', 'character', 'milestone', 'competency');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create achievement_icon_rarity enum
DO $$ BEGIN
  CREATE TYPE achievement_icon_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create achievement_definitions table
CREATE TABLE IF NOT EXISTS "social"."achievement_definitions" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "achievement_key" varchar(100) NOT NULL UNIQUE,
  "category" achievement_category NOT NULL,
  "visibility" achievement_visibility NOT NULL DEFAULT 'visible',
  "title" varchar(100) NOT NULL,
  "description" varchar(280) NOT NULL,
  "icon_id" varchar(36),
  "competency_domains" jsonb NOT NULL DEFAULT '[]',
  "enterprise_reportable" boolean NOT NULL DEFAULT false,
  "points" integer NOT NULL DEFAULT 10,
  "criteria" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create achievement_icon table
CREATE TABLE IF NOT EXISTS "social"."achievement_icon" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "icon_key" varchar(36) NOT NULL UNIQUE,
  "category" achievement_icon_category NOT NULL,
  "rarity" achievement_icon_rarity NOT NULL DEFAULT 'common',
  "is_animated" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Create player_achievements table
CREATE TABLE IF NOT EXISTS "social"."player_achievements" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "player_id" uuid NOT NULL,
  "achievement_id" uuid NOT NULL REFERENCES "social"."achievement_definitions"("id") ON DELETE CASCADE,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "unlocked_at" timestamp with time zone,
  "progress" jsonb NOT NULL DEFAULT '{}',
  "notification_sent" boolean NOT NULL DEFAULT false,
  "shared_to_profile" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "player_achievements_player_achievement_unique" UNIQUE ("player_id", "achievement_id")
);

-- Indexes for achievement_definitions
CREATE INDEX IF NOT EXISTS "achievement_definitions_key_unique_idx" ON "social"."achievement_definitions" ("achievement_key");
CREATE INDEX IF NOT EXISTS "achievement_definitions_category_idx" ON "social"."achievement_definitions" ("category");
CREATE INDEX IF NOT EXISTS "achievement_definitions_visibility_idx" ON "social"."achievement_definitions" ("visibility");

-- Indexes for achievement_icon
CREATE INDEX IF NOT EXISTS "achievement_icon_key_unique_idx" ON "social"."achievement_icon" ("icon_key");
CREATE INDEX IF NOT EXISTS "achievement_icon_category_idx" ON "social"."achievement_icon" ("category");
CREATE INDEX IF NOT EXISTS "achievement_icon_rarity_idx" ON "social"."achievement_icon" ("rarity");

-- Indexes for player_achievements
CREATE INDEX IF NOT EXISTS "player_achievements_player_idx" ON "social"."player_achievements" ("player_id");
CREATE INDEX IF NOT EXISTS "player_achievements_achievement_idx" ON "social"."player_achievements" ("achievement_id");
CREATE INDEX IF NOT EXISTS "player_achievements_tenant_idx" ON "social"."player_achievements" ("tenant_id");
CREATE INDEX IF NOT EXISTS "player_achievements_unlocked_idx" ON "social"."player_achievements" ("unlocked_at") WHERE "unlocked_at" IS NOT NULL;

-- Enable RLS
ALTER TABLE "social"."player_achievements" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on player_achievements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'player_achievements'
    AND policyname = 'tenant_isolation_player_achievements'
  ) THEN
    CREATE POLICY "tenant_isolation_player_achievements" ON "social"."player_achievements"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Add foreign key constraint for player_achievements.player_id after ensuring player_profiles table has proper tenant_id
ALTER TABLE "social"."player_achievements" ADD CONSTRAINT "player_achievements_tenant_player_fkey"
  FOREIGN KEY ("tenant_id", "player_id") 
  REFERENCES "social"."player_profiles"("tenant_id", "profile_id") 
  ON DELETE CASCADE;
