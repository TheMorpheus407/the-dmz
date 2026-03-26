-- Migration: 0041_avatars
-- Description: Enhance avatars table with metadata fields and add enterprise controls
--
-- Adds:
-- - description, tags, rarity_tier, unlock_condition columns to avatars table
-- - tenant_avatar_restrictions table for corporate-approved avatar subsets
-- - Feature flag for social.avatars.enabled
--
-- Required by Issue #245: Avatar System

-- Create rarity tier enum
DO $$ BEGIN
  CREATE TYPE rarity_tier AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create avatar categories enum (updated to include issue-specified categories)
DO $$ BEGIN
  CREATE TYPE avatar_category AS ENUM ('character_silhouette', 'facility_theme', 'faction_emblem', 'animal', 'robot', 'geometric', 'character');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to avatars table
ALTER TABLE "content"."avatars" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "content"."avatars" ADD COLUMN IF NOT EXISTS "tags" text[];
ALTER TABLE "content"."avatars" ADD COLUMN IF NOT EXISTS "rarity_tier" rarity_tier DEFAULT 'common';
ALTER TABLE "content"."avatars" ADD COLUMN IF NOT EXISTS "unlock_condition" text;

-- Set default values for existing rows
UPDATE "content"."avatars" SET "description" = '' WHERE "description" IS NULL;
UPDATE "content"."avatars" SET "tags" = ARRAY[]::text[] WHERE "tags" IS NULL;
UPDATE "content"."avatars" SET "rarity_tier" = 'common' WHERE "rarity_tier" IS NULL;
UPDATE "content"."avatars" SET "unlock_condition" = 'Default avatar' WHERE "unlock_condition" IS NULL;

-- Make new columns NOT NULL after setting defaults
ALTER TABLE "content"."avatars" ALTER COLUMN "description" SET NOT NULL;
ALTER TABLE "content"."avatars" ALTER COLUMN "tags" SET NOT NULL;
ALTER TABLE "content"."avatars" ALTER COLUMN "rarity_tier" SET NOT NULL;
ALTER TABLE "content"."avatars" ALTER COLUMN "unlock_condition" SET NOT NULL;

-- Add index on rarity_tier for sorting/filtering
CREATE INDEX IF NOT EXISTS "avatars_rarity_tier_idx" ON "content"."avatars" ("rarity_tier");

-- Add index on tags for filtering
CREATE INDEX IF NOT EXISTS "avatars_tags_idx" ON "content"."avatars" USING GIN ("tags");

-- Create tenant_avatar_restrictions table for enterprise controls
CREATE TABLE IF NOT EXISTS "social"."tenant_avatar_restrictions" (
  "restriction_id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
  "avatar_id" varchar(36) NOT NULL REFERENCES "content"."avatars"("id") ON DELETE CASCADE,
  "is_allowed" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  UNIQUE("tenant_id", "avatar_id")
);

-- Enable RLS on tenant_avatar_restrictions
ALTER TABLE "social"."tenant_avatar_restrictions" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'tenant_avatar_restrictions'
    AND policyname = 'tenant_isolation_tenant_avatar_restrictions'
  ) THEN
    CREATE POLICY "tenant_isolation_tenant_avatar_restrictions" ON "social"."tenant_avatar_restrictions"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Create index for tenant lookups
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_avatar_restrictions_tenant_avatar_idx" 
  ON "social"."tenant_avatar_restrictions" ("tenant_id", "avatar_id");

-- Seed feature flag for avatars
INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Avatar System',
    'Enable avatar functionality for players',
    'social.avatars_enabled',
    true,
    100,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;
