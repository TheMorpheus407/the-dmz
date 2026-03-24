-- Migration: 0055_fix_missing_tenant_columns.sql
-- Description: Ensure missing tenant columns exist (onboarding_state, idp_config, compliance_frameworks)
-- Root cause: Migration 0030 may not have been applied, and 0054's index creation can fail if columns don't exist
-- Issue: Tests fail with "column onboarding_state does not exist" on stale test databases

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'onboarding_state') THEN
    ALTER TABLE tenants ADD COLUMN onboarding_state JSONB NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'idp_config') THEN
    ALTER TABLE tenants ADD COLUMN idp_config JSONB NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'compliance_frameworks') THEN
    ALTER TABLE tenants ADD COLUMN compliance_frameworks JSONB NOT NULL DEFAULT '[]';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'onboarding_state') THEN
    CREATE INDEX IF NOT EXISTS idx_tenants_onboarding_state ON tenants(tenant_id) WHERE onboarding_state != '{}'::jsonb;
  END IF;
END $$;
