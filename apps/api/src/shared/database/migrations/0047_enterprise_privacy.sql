-- Migration: 0047_enterprise_privacy
-- Description: Create enterprise privacy infrastructure:
--              - social.player_consent table for granular consent tracking
--              - tenant_privacy_settings table for tenant-wide privacy configuration
--
-- Creates:
-- - social.player_consent table (player consent records per feature type)
-- - tenant_privacy_settings table (tenant-level privacy configuration)
--
-- Required by Issue #251: M10-12: Enterprise Consent and Privacy

-- Player consent table - tracks player consent for specific feature types
CREATE TABLE IF NOT EXISTS "social"."player_consent" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
    "player_id" uuid NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
    "consent_type" varchar(30) NOT NULL,
    "granted" boolean DEFAULT true NOT NULL,
    "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
    "revoked_at" timestamp with time zone,
    "ip_address_hash" varchar(64),
    "user_agent" varchar(500)
);

-- Tenant privacy settings table - stores tenant-wide privacy configuration
CREATE TABLE IF NOT EXISTS "tenant_privacy_settings" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT UNIQUE,
    "social_profile_mode" varchar(30) DEFAULT 'anonymous_tenant' NOT NULL,
    "require_consent_for_social_features" boolean DEFAULT true NOT NULL,
    "allow_public_profiles" boolean DEFAULT false NOT NULL,
    "enforce_real_name_policy" boolean DEFAULT false NOT NULL,
    "share_achievements_with_employer" boolean DEFAULT false NOT NULL,
    "share_leaderboard_with_employer" boolean DEFAULT false NOT NULL,
    "data_retention_days" integer,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for player_consent
CREATE UNIQUE INDEX IF NOT EXISTS "player_consent_player_tenant_type_unique" 
    ON "social"."player_consent" USING btree ("player_id", "tenant_id", "consent_type");
CREATE INDEX IF NOT EXISTS "player_consent_tenant_idx" 
    ON "social"."player_consent" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "player_consent_player_idx" 
    ON "social"."player_consent" USING btree ("player_id");
CREATE INDEX IF NOT EXISTS "player_consent_type_idx" 
    ON "social"."player_consent" USING btree ("consent_type");

-- Indexes for tenant_privacy_settings
CREATE INDEX IF NOT EXISTS "tenant_privacy_settings_tenant_idx" 
    ON "tenant_privacy_settings" USING btree ("tenant_id");

-- Enable RLS on player_consent
ALTER TABLE "social"."player_consent" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on player_consent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'player_consent' 
    AND policyname = 'tenant_isolation_player_consent'
  ) THEN
    CREATE POLICY "tenant_isolation_player_consent" ON "social"."player_consent"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Enable RLS on tenant_privacy_settings
ALTER TABLE "tenant_privacy_settings" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on tenant_privacy_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tenant_privacy_settings' 
    AND policyname = 'tenant_isolation_tenant_privacy_settings'
  ) THEN
    CREATE POLICY "tenant_isolation_tenant_privacy_settings" ON "tenant_privacy_settings"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;
