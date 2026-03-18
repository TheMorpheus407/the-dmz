-- Migration: 0033_lti_states.sql
-- Description: LTI OIDC state storage for CSRF protection
-- Created: 2026-03-18

-- LTI States table (for OIDC state validation - CSRF protection)
CREATE TABLE IF NOT EXISTS lti.lti_states (
    state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_value VARCHAR(255) NOT NULL UNIQUE,
    platform_id UUID NOT NULL REFERENCES lti.lti_platforms(platform_id) ON DELETE CASCADE,
    code_verifier VARCHAR(128),
    redirect_uri VARCHAR(2048) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lti_states_state_idx ON lti.lti_states(state_value);
CREATE INDEX IF NOT EXISTS lti_states_expires_idx ON lti.lti_states(expires_at);
CREATE INDEX IF NOT EXISTS lti_states_platform_idx ON lti.lti_states(platform_id);

COMMENT ON TABLE lti.lti_states IS 'LTI OIDC state tracking for CSRF protection';

-- Row Level Security
ALTER TABLE lti.lti_states ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'lti' AND tablename = 'lti_states' AND policyname = 'tenant_isolation_lti_states'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_states" ON lti.lti_states
      USING (
        EXISTS (
          SELECT 1 FROM lti.lti_platforms p
          WHERE p.platform_id = lti.lti_states.platform_id
          AND (p.tenant_id = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM lti.lti_platforms p
          WHERE p.platform_id = lti.lti_states.platform_id
          AND (p.tenant_id = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      );
  END IF;
END $$;

ALTER TABLE lti.lti_states FORCE ROW LEVEL SECURITY;
