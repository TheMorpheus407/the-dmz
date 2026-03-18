-- Migration: 0032_lti_platforms.sql
-- Description: LTI 1.3 with Advantage - Deep Linking, AGS, NRPS
-- Created: 2026-03-18

-- Create LTI schema
CREATE SCHEMA IF NOT EXISTS lti;

-- LTI Platforms table (LMS instances like Canvas, Moodle, etc.)
CREATE TABLE IF NOT EXISTS lti.lti_platforms (
    platform_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    platform_url VARCHAR(2048) NOT NULL,
    client_id VARCHAR(255) NOT NULL,
    deployment_id VARCHAR(255),
    public_keyset_url VARCHAR(2048) NOT NULL,
    auth_token_url VARCHAR(2048) NOT NULL,
    auth_login_url VARCHAR(2048) NOT NULL,
    jwks JSONB NOT NULL DEFAULT '{}',
    tool_url VARCHAR(2048),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_validation_status VARCHAR(32),
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lti_platforms_tenant_idx ON lti.lti_platforms(tenant_id);
CREATE INDEX IF NOT EXISTS lti_platforms_client_id_idx ON lti.lti_platforms(client_id);
CREATE INDEX IF NOT EXISTS lti_platforms_platform_url_idx ON lti.lti_platforms(platform_url);

COMMENT ON TABLE lti.lti_platforms IS 'LTI 1.3 platform configurations (LMS instances)';

-- LTI Nonces table (for OIDC state validation)
CREATE TABLE IF NOT EXISTS lti.lti_nonces (
    nonce_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nonce_value VARCHAR(255) NOT NULL UNIQUE,
    platform_id UUID NOT NULL REFERENCES lti.lti_platforms(platform_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lti_nonces_nonce_idx ON lti.lti_nonces(nonce_value);
CREATE INDEX IF NOT EXISTS lti_nonces_expires_idx ON lti.lti_nonces(expires_at);
CREATE INDEX IF NOT EXISTS lti_nonces_platform_idx ON lti.lti_nonces(platform_id);

COMMENT ON TABLE lti.lti_nonces IS 'LTI OIDC nonce tracking for replay attack prevention';

-- LTI Deep Link Content Items table
CREATE TABLE IF NOT EXISTS lti.lti_deep_link_content (
    content_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    platform_id UUID NOT NULL REFERENCES lti.lti_platforms(platform_id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(2048),
    line_item_id UUID,
    custom_params JSONB DEFAULT '{}',
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lti_deep_link_content_tenant_idx ON lti.lti_deep_link_content(tenant_id);
CREATE INDEX IF NOT EXISTS lti_deep_link_content_platform_idx ON lti.lti_deep_link_content(platform_id);

COMMENT ON TABLE lti.lti_deep_link_content IS 'LTI Deep Linking content items for content selection';

-- LTI Line Items table (Assignment and Grade Services)
CREATE TABLE IF NOT EXISTS lti.lti_line_items (
    line_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    platform_id UUID NOT NULL REFERENCES lti.lti_platforms(platform_id) ON DELETE CASCADE,
    resource_link_id VARCHAR(255),
    label VARCHAR(255) NOT NULL,
    score_maximum INTEGER NOT NULL DEFAULT 100,
    resource_id VARCHAR(255),
    tag VARCHAR(255),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lti_line_items_tenant_idx ON lti.lti_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS lti_line_items_platform_idx ON lti.lti_line_items(platform_id);
CREATE INDEX IF NOT EXISTS lti_line_items_resource_link_idx ON lti.lti_line_items(resource_link_id);

COMMENT ON TABLE lti.lti_line_items IS 'LTI Assignment and Grade Services line items';

-- LTI Scores table
CREATE TABLE IF NOT EXISTS lti.lti_scores (
    score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    line_item_id UUID NOT NULL REFERENCES lti.lti_line_items(line_item_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    score_given NUMERIC(5, 2),
    score_maximum INTEGER NOT NULL DEFAULT 100,
    activity_progress VARCHAR(32) NOT NULL DEFAULT 'initialized',
    grading_progress VARCHAR(32) NOT NULL DEFAULT 'pending',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lti_scores_tenant_idx ON lti.lti_scores(tenant_id);
CREATE INDEX IF NOT EXISTS lti_scores_line_item_idx ON lti.lti_scores(line_item_id);
CREATE INDEX IF NOT EXISTS lti_scores_user_idx ON lti.lti_scores(user_id);

COMMENT ON TABLE lti.lti_scores IS 'LTI AGS score submissions';

-- LTI Sessions table (track LTI launches)
CREATE TABLE IF NOT EXISTS lti.lti_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    platform_id UUID NOT NULL REFERENCES lti.lti_platforms(platform_id) ON DELETE CASCADE,
    user_id VARCHAR(255),
    resource_link_id VARCHAR(255),
    context_id VARCHAR(255),
    roles JSONB DEFAULT '[]',
    launch_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lti_sessions_tenant_idx ON lti.lti_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS lti_sessions_platform_idx ON lti.lti_sessions(platform_id);
CREATE INDEX IF NOT EXISTS lti_sessions_launch_id_idx ON lti.lti_sessions(launch_id);

COMMENT ON TABLE lti.lti_sessions IS 'LTI session tracking for launches';

-- Row Level Security (RLS) Policies for tenant isolation
-- Enable RLS on all LTI tables
ALTER TABLE lti.lti_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti.lti_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti.lti_deep_link_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti.lti_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti.lti_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti.lti_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for lti_platforms
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'lti' AND tablename = 'lti_platforms' AND policyname = 'tenant_isolation_lti_platforms'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_platforms" ON lti.lti_platforms
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- RLS Policy for lti_nonces (tenant isolation via platform join)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'lti' AND tablename = 'lti_nonces' AND policyname = 'tenant_isolation_lti_nonces'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_nonces" ON lti.lti_nonces
      USING (
        EXISTS (
          SELECT 1 FROM lti.lti_platforms p
          WHERE p.platform_id = lti.lti_nonces.platform_id
          AND (p.tenant_id = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM lti.lti_platforms p
          WHERE p.platform_id = lti.lti_nonces.platform_id
          AND (p.tenant_id = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      );
  END IF;
END $$;

-- RLS Policy for lti_deep_link_content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'lti' AND tablename = 'lti_deep_link_content' AND policyname = 'tenant_isolation_lti_deep_link_content'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_deep_link_content" ON lti.lti_deep_link_content
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- RLS Policy for lti_line_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'lti' AND tablename = 'lti_line_items' AND policyname = 'tenant_isolation_lti_line_items'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_line_items" ON lti.lti_line_items
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- RLS Policy for lti_scores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'lti' AND tablename = 'lti_scores' AND policyname = 'tenant_isolation_lti_scores'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_scores" ON lti.lti_scores
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- RLS Policy for lti_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'lti' AND tablename = 'lti_sessions' AND policyname = 'tenant_isolation_lti_sessions'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_sessions" ON lti.lti_sessions
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Force RLS on all tables
ALTER TABLE lti.lti_platforms FORCE ROW LEVEL SECURITY;
ALTER TABLE lti.lti_nonces FORCE ROW LEVEL SECURITY;
ALTER TABLE lti.lti_deep_link_content FORCE ROW LEVEL SECURITY;
ALTER TABLE lti.lti_line_items FORCE ROW LEVEL SECURITY;
ALTER TABLE lti.lti_scores FORCE ROW LEVEL SECURITY;
ALTER TABLE lti.lti_sessions FORCE ROW LEVEL SECURITY;