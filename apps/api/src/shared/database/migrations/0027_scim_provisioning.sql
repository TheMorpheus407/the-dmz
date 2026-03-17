-- Migration 0027: SCIM 2.0 Provisioning Tables
-- Issue #225: SCIM 2.0 User and Group Provisioning

BEGIN;

-- SCIM Bearer Tokens table for IdP authentication
CREATE TABLE IF NOT EXISTS auth.scim_tokens (
    id uuid NOT NULL DEFAULT uuid_generate_v7(),
    tenant_id uuid NOT NULL,
    name varchar(255) NOT NULL,
    token_hash varchar(255) NOT NULL,
    scopes text[] NOT NULL DEFAULT ARRAY['scim.read', 'scim.write'],
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    is_revoked boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    CONSTRAINT scim_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT scim_tokens_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS scim_tokens_tenant_id_idx ON auth.scim_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS scim_tokens_token_hash_idx ON auth.scim_tokens(token_hash);

-- SCIM Groups table for persistent group storage
CREATE TABLE IF NOT EXISTS auth.scim_groups (
    id uuid NOT NULL DEFAULT uuid_generate_v7(),
    tenant_id uuid NOT NULL,
    scim_id varchar(255),
    display_name varchar(255) NOT NULL,
    external_id varchar(255),
    role_id uuid REFERENCES auth.roles(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp with time zone NOT NULL DEFAULT NOW(),
    CONSTRAINT scim_groups_pkey PRIMARY KEY (id),
    CONSTRAINT scim_groups_tenant_display_name_unique UNIQUE (tenant_id, display_name)
);

CREATE INDEX IF NOT EXISTS scim_groups_tenant_id_idx ON auth.scim_groups(tenant_id);
CREATE INDEX IF NOT EXISTS scim_groups_scim_id_idx ON auth.scim_groups(scim_id);
CREATE INDEX IF NOT EXISTS scim_groups_role_id_idx ON auth.scim_groups(role_id);

-- SCIM Group Members table for group membership
CREATE TABLE IF NOT EXISTS auth.scim_group_members (
    id uuid NOT NULL DEFAULT uuid_generate_v7(),
    scim_group_id uuid NOT NULL REFERENCES auth.scim_groups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    scim_user_id varchar(255),
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    CONSTRAINT scim_group_members_pkey PRIMARY KEY (id),
    CONSTRAINT scim_group_members_group_user_unique UNIQUE (scim_group_id, user_id)
);

CREATE INDEX IF NOT EXISTS scim_group_members_group_id_idx ON auth.scim_group_members(scim_group_id);
CREATE INDEX IF NOT EXISTS scim_group_members_user_id_idx ON auth.scim_group_members(user_id);

-- Add SCIM extended attributes to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS scim_id varchar(255),
    ADD COLUMN IF NOT EXISTS external_id varchar(255),
    ADD COLUMN IF NOT EXISTS department varchar(128),
    ADD COLUMN IF NOT EXISTS title varchar(128),
    ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES users(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_scim_id_idx ON users(scim_id);
CREATE INDEX IF NOT EXISTS users_external_id_idx ON users(external_id);
CREATE INDEX IF NOT EXISTS users_manager_id_idx ON users(manager_id);

-- SCIM Sync Log for tracking sync status
CREATE TABLE IF NOT EXISTS auth.scim_sync_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v7(),
    tenant_id uuid NOT NULL,
    sync_type varchar(50) NOT NULL,
    status varchar(50) NOT NULL,
    users_created integer NOT NULL DEFAULT 0,
    users_updated integer NOT NULL DEFAULT 0,
    users_deleted integer NOT NULL DEFAULT 0,
    groups_created integer NOT NULL DEFAULT 0,
    groups_updated integer NOT NULL DEFAULT 0,
    groups_deleted integer NOT NULL DEFAULT 0,
    errors jsonb,
    started_at timestamp with time zone NOT NULL DEFAULT NOW(),
    completed_at timestamp with time zone,
    CONSTRAINT scim_sync_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS scim_sync_logs_tenant_id_idx ON auth.scim_sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS scim_sync_logs_started_at_idx ON auth.scim_sync_logs(started_at);

-- Add FK constraints for tenant isolation
ALTER TABLE auth.scim_tokens ADD CONSTRAINT scim_tokens_tenant_id_tenants_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE restrict ON UPDATE no action;
ALTER TABLE auth.scim_groups ADD CONSTRAINT scim_groups_tenant_id_tenants_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE restrict ON UPDATE no action;
ALTER TABLE auth.scim_sync_logs ADD CONSTRAINT scim_sync_logs_tenant_id_tenants_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE restrict ON UPDATE no action;

-- RLS policies for SCIM tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'scim_tokens' AND policyname = 'tenant_isolation_scim_tokens'
  ) THEN
    CREATE POLICY "tenant_isolation_scim_tokens" ON auth.scim_tokens
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'scim_groups' AND policyname = 'tenant_isolation_scim_groups'
  ) THEN
    CREATE POLICY "tenant_isolation_scim_groups" ON auth.scim_groups
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'scim_group_members' AND policyname = 'tenant_isolation_scim_group_members'
  ) THEN
    CREATE POLICY "tenant_isolation_scim_group_members" ON auth.scim_group_members
      USING (
        EXISTS (
          SELECT 1 FROM auth.scim_groups sg
          WHERE sg.id = auth.scim_group_members.scim_group_id
          AND (sg.tenant_id = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM auth.scim_groups sg
          WHERE sg.id = auth.scim_group_members.scim_group_id
          AND (sg.tenant_id = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'scim_sync_logs' AND policyname = 'tenant_isolation_scim_sync_logs'
  ) THEN
    CREATE POLICY "tenant_isolation_scim_sync_logs" ON auth.scim_sync_logs
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE auth.scim_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.scim_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.scim_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.scim_sync_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE auth.scim_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.scim_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.scim_group_members FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.scim_sync_logs FORCE ROW LEVEL SECURITY;

COMMIT;
