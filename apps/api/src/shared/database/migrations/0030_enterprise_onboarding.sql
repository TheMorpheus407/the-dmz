-- Migration: 0030_enterprise_onboarding.sql
-- Description: Add onboarding wizard state and IdP configuration columns to tenants table
-- Issue: #228 - M9-06 Enterprise Onboarding Wizard

-- Add onboarding_state JSONB column for wizard progress tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_state JSONB NOT NULL DEFAULT '{}';

-- Add idp_config JSONB column for encrypted IdP metadata (SAML/OIDC)
-- This stores sensitive identity provider configuration
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS idp_config JSONB NOT NULL DEFAULT '{}';

-- Add compliance_frameworks JSONB array to store selected frameworks
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_frameworks JSONB NOT NULL DEFAULT '[]';

-- Create index for onboarding state queries
CREATE INDEX IF NOT EXISTS idx_tenants_onboarding_state ON tenants(tenant_id) 
    WHERE onboarding_state != '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN tenants.onboarding_state IS 'JSONB object storing enterprise onboarding wizard progress and state';
COMMENT ON COLUMN tenants.idp_config IS 'JSONB object storing encrypted IdP configuration (SAML metadata, OIDC settings)';
COMMENT ON COLUMN tenants.compliance_frameworks IS 'JSONB array of selected compliance framework identifiers';
