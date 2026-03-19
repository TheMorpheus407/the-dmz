-- Migration: 0037_social_relationship
-- Description: Create social_relationship table for friend, block, and mute functionality
--
-- Creates:
-- - social.social_relationship table (core relationship layer for social graph)
--
-- Required by Issue #240: M10-02 Social Graph Module
--
-- Relationship Rules:
-- - Friend: Bi-directional. When A adds B and B accepts, two records are created (A→B and B→A)
-- - Block: Uni-directional. A blocks B. Takes precedence over all other relationship types
-- - Mute: Uni-directional. A mutes B. Does not prevent visibility
--
-- Limits:
-- - Max 500 friends per player
-- - Max 1000 blocked users per player
-- - Max 1000 muted users per player

CREATE TABLE IF NOT EXISTS "social"."social_relationship" (
    "relationship_id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
    "requester_id" uuid NOT NULL,
    "addressee_id" uuid NOT NULL,
    "relationship_type" varchar(20) NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "relationship_type_check" CHECK (relationship_type IN ('friend', 'block', 'mute')),
    CONSTRAINT "status_check" CHECK (status IN ('pending', 'accepted', 'rejected'))
);

-- Indexes for efficient querying
CREATE UNIQUE INDEX IF NOT EXISTS "social_relationship_requester_addressee_type_unique" 
    ON "social"."social_relationship" USING btree ("requester_id", "addressee_id", "relationship_type");
CREATE INDEX IF NOT EXISTS "social_relationship_tenant_idx" 
    ON "social"."social_relationship" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "social_relationship_addressee_idx" 
    ON "social"."social_relationship" USING btree ("addressee_id");
CREATE INDEX IF NOT EXISTS "social_relationship_status_idx" 
    ON "social"."social_relationship" USING btree ("status");
CREATE INDEX IF NOT EXISTS "social_relationship_requester_tenant_idx" 
    ON "social"."social_relationship" USING btree ("requester_id", "tenant_id");
CREATE INDEX IF NOT EXISTS "social_relationship_addressee_tenant_idx" 
    ON "social"."social_relationship" USING btree ("addressee_id", "tenant_id");

-- Enable RLS on social_relationship
ALTER TABLE "social"."social_relationship" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on social_relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'social_relationship' AND policyname = 'tenant_isolation_social_relationship'
  ) THEN
    CREATE POLICY "tenant_isolation_social_relationship" ON "social"."social_relationship"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Seed feature flag for social friend system
INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Social Friend System',
    'Enable the social friend system functionality',
    'social.friend_system_enabled',
    true,
    100,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;

-- Seed feature flag for social block system
INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Social Block System',
    'Enable the social block functionality',
    'social.block_system_enabled',
    true,
    100,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;

-- Seed feature flag for social mute system
INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Social Mute System',
    'Enable the social mute functionality',
    'social.mute_system_enabled',
    true,
    100,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;
