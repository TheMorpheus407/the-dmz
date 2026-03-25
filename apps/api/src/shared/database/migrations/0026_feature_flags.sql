-- Migration: 0026_feature_flags.sql
-- Feature flags system for enterprise tenants with A/B testing support
--
-- This migration creates tables for feature flags that allow granular control
-- over feature availability per tenant with server-side evaluation,
-- tenant isolation, and A/B testing capabilities.
--
-- Required by Issue #221: Feature flags with server-evaluated, tenant-isolated, A/B testing

-- Create feature flags schema
CREATE SCHEMA IF NOT EXISTS feature_flags;

-- Feature flags table - stores feature flag configuration per tenant
CREATE TABLE IF NOT EXISTS "feature_flags"."flags" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "description" text,
    "key" varchar(128) NOT NULL,
    "enabled_by_default" boolean DEFAULT false NOT NULL,
    "rollout_percentage" integer DEFAULT 0 NOT NULL,
    "tenant_overrides" jsonb DEFAULT '{}' NOT NULL,
    "user_segments" jsonb DEFAULT '[]' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Tenant overrides table - stores per-tenant flag overrides
CREATE TABLE IF NOT EXISTS "feature_flags"."tenant_overrides" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "flag_id" uuid NOT NULL REFERENCES "feature_flags"."flags"("id") ON DELETE CASCADE,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "enabled" boolean NOT NULL,
    "rollout_percentage" integer,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- A/B test assignments table - tracks user assignments to variants
CREATE TABLE IF NOT EXISTS "feature_flags"."ab_test_assignments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "flag_id" uuid NOT NULL REFERENCES "feature_flags"."flags"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL,
    "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "variant" varchar(32) NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
    "converted_at" timestamp with time zone,
    "metadata" jsonb DEFAULT '{}' NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "feature_flags_tenant_id_idx" ON feature_flags.flags USING btree ("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "feature_flags_tenant_key_unique" ON feature_flags.flags USING btree ("tenant_id", "key");
CREATE INDEX IF NOT EXISTS "feature_flags_tenant_active_idx" ON feature_flags.flags USING btree ("tenant_id", "is_active");

CREATE INDEX IF NOT EXISTS "feature_flag_overrides_flag_id_idx" ON feature_flags.tenant_overrides USING btree ("flag_id");
CREATE INDEX IF NOT EXISTS "feature_flag_overrides_tenant_id_idx" ON feature_flags.tenant_overrides USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "feature_flag_overrides_flag_tenant_unique" ON feature_flags.tenant_overrides USING btree ("flag_id", "tenant_id");

CREATE INDEX IF NOT EXISTS "ab_test_assignments_flag_id_idx" ON feature_flags.ab_test_assignments USING btree ("flag_id");
CREATE INDEX IF NOT EXISTS "ab_test_assignments_user_id_idx" ON feature_flags.ab_test_assignments USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "ab_test_assignments_tenant_id_idx" ON feature_flags.ab_test_assignments USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ab_test_assignments_user_flag_unique" ON feature_flags.ab_test_assignments USING btree ("user_id", "flag_id");

-- Insert initial feature flags for M8
-- These flags control the initial enterprise features
INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'New Admin Dashboard',
    'New admin dashboard with improved UX and navigation',
    'new_admin_dashboard',
    false,
    0,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;

INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Certificate PDF Download',
    'Enable PDF download for training certificates',
    'certificate_pdf_download',
    true,
    100,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;

INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Trainer Dashboard V2',
    'New trainer dashboard with enhanced reporting',
    'trainer_dashboard_v2',
    false,
    0,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;

INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Compliance Reports',
    'Advanced compliance reporting features',
    'compliance_reports',
    false,
    0,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;

INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Feature X',
    'Feature flag for testing rollout percentage',
    'feature_x',
    false,
    0,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;
