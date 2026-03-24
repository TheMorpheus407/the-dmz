-- Migration: 0054_add_missing_tenant_columns.sql
-- Description: Add missing tenant columns that were added in migration 0030 but may not exist in test databases
-- Root cause: Test database dmz_test was not updated when migration 0030 (enterprise onboarding) was added
-- Issue: Tests fail with "column onboarding_state does not exist" because the test database schema is stale

-- Add onboarding_state column for wizard progress tracking (from migration 0030)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_state JSONB NOT NULL DEFAULT '{}';

-- Add idp_config column for encrypted IdP metadata (from migration 0030)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS idp_config JSONB NOT NULL DEFAULT '{}';

-- Add compliance_frameworks column to store selected frameworks (from migration 0030)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_frameworks JSONB NOT NULL DEFAULT '[]';

-- Create index for onboarding state queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_tenants_onboarding_state ON tenants(tenant_id)
    WHERE onboarding_state != '{}'::jsonb;
