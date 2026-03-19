-- Migration: 0036_social_player_profiles
-- Description: Create social schema with player_profiles and avatars tables
--
-- Creates:
-- - social schema with player_profiles table (foundational social identity layer)
-- - content.avatars table (pre-approved avatar catalog)
--
-- Required by Issue #239: M10-01: Player Profile Module

-- Create social schema
CREATE SCHEMA IF NOT EXISTS social;

-- Player profiles table - stores player identity and social information
CREATE TABLE IF NOT EXISTS "social"."player_profiles" (
    "profile_id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
    "user_id" uuid NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
    "display_name" varchar(50) NOT NULL,
    "avatar_id" varchar(36),
    "privacy_mode" varchar(20) DEFAULT 'public' NOT NULL,
    "bio" varchar(280),
    "social_visibility" jsonb DEFAULT '{}' NOT NULL,
    "season_rank" integer,
    "skill_rating_blue" integer,
    "skill_rating_red" integer,
    "skill_rating_coop" integer,
    "total_sessions_played" integer DEFAULT 0 NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "last_active_at" timestamp with time zone
);

-- Indexes for efficient querying
CREATE UNIQUE INDEX IF NOT EXISTS "social_player_profiles_user_unique" ON "social"."player_profiles" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "social_player_profiles_tenant_idx" ON "social"."player_profiles" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "social_player_profiles_season_rank_idx" ON "social"."player_profiles" USING btree ("season_rank" DESC);
CREATE INDEX IF NOT EXISTS "social_player_profiles_last_active_idx" ON "social"."player_profiles" USING btree ("last_active_at");

-- Foreign key constraint for tenant_id and user_id composite
ALTER TABLE "social"."player_profiles" ADD CONSTRAINT "player_profiles_tenant_id_user_id_users_tenant_id_user_id_fk"
    FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Avatar catalog table in content schema
CREATE TABLE IF NOT EXISTS "content"."avatars" (
    "id" varchar(36) PRIMARY KEY,
    "category" varchar(50) NOT NULL,
    "name" varchar(100) NOT NULL,
    "image_url" varchar(500),
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Seed 20+ curated avatars across categories
INSERT INTO "content"."avatars" ("id", "category", "name", "image_url", "is_active") VALUES
    -- Animal avatars
    ('avatar_cat_001', 'animal', 'Whiskers', '/avatars/cat-001.svg', true),
    ('avatar_dog_001', 'animal', 'Buddy', '/avatars/dog-001.svg', true),
    ('avatar_rabbit_001', 'animal', 'Fluffy', '/avatars/rabbit-001.svg', true),
    ('avatar_fox_001', 'animal', 'Rusty', '/avatars/fox-001.svg', true),
    ('avatar_owl_001', 'animal', 'Hoot', '/avatars/owl-001.svg', true),
    ('avatar_panda_001', 'animal', 'Bamboo', '/avatars/panda-001.svg', true),
    -- Robot avatars
    ('avatar_robot_001', 'robot', 'Sparky', '/avatars/robot-001.svg', true),
    ('avatar_robot_002', 'robot', 'Circuit', '/avatars/robot-002.svg', true),
    ('avatar_robot_003', 'robot', 'Byte', '/avatars/robot-003.svg', true),
    ('avatar_robot_004', 'robot', 'Pixel', '/avatars/robot-004.svg', true),
    ('avatar_robot_005', 'robot', 'Nova', '/avatars/robot-005.svg', true),
    -- Geometric avatars
    ('avatar_geo_001', 'geometric', 'Cube', '/avatars/geo-cube.svg', true),
    ('avatar_geo_002', 'geometric', 'Sphere', '/avatars/geo-sphere.svg', true),
    ('avatar_geo_003', 'geometric', 'Pyramid', '/avatars/geo-pyramid.svg', true),
    ('avatar_geo_004', 'geometric', 'Prism', '/avatars/geo-prism.svg', true),
    ('avatar_geo_005', 'geometric', 'Hexagon', '/avatars/geo-hexagon.svg', true),
    -- Character avatars
    ('avatar_char_001', 'character', 'Knight', '/avatars/char-knight.svg', true),
    ('avatar_char_002', 'character', 'Wizard', '/avatars/char-wizard.svg', true),
    ('avatar_char_003', 'character', 'Explorer', '/avatars/char-explorer.svg', true),
    ('avatar_char_004', 'character', 'Pilot', '/avatars/char-pilot.svg', true),
    ('avatar_char_005', 'character', 'Scientist', '/avatars/char-scientist.svg', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on player_profiles
ALTER TABLE "social"."player_profiles" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on player_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'player_profiles' AND policyname = 'tenant_isolation_player_profiles'
  ) THEN
    CREATE POLICY "tenant_isolation_player_profiles" ON "social"."player_profiles"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Enable RLS on avatars
ALTER TABLE "content"."avatars" ENABLE ROW LEVEL SECURITY;

-- RLS policy for avatars (global catalog - accessible to all authenticated users within tenant context)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'avatars' AND policyname = 'tenant_isolation_avatars'
  ) THEN
    CREATE POLICY "tenant_isolation_avatars" ON "content"."avatars"
      USING ("auth"."current_tenant_id"() IS NOT NULL OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("auth"."current_tenant_id"() IS NOT NULL OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;
