-- Migration 0028: JIT User Provisioning Columns
-- Issue #226: SSO JIT User Provisioning

BEGIN;

-- Add JIT provisioning columns to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS is_jit_created boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS idp_source varchar(32),
    ADD COLUMN IF NOT EXISTS idp_attributes jsonb;

CREATE INDEX IF NOT EXISTS users_is_jit_created_idx ON users(is_jit_created);
CREATE INDEX IF NOT EXISTS users_idp_source_idx ON users(idp_source);

-- Admin notifications table for JIT user creation notifications
CREATE TABLE IF NOT EXISTS auth.admin_notifications (
    id uuid NOT NULL DEFAULT uuid_generate_v7(),
    tenant_id uuid NOT NULL,
    admin_user_id uuid NOT NULL,
    notification_type varchar(50) NOT NULL,
    title varchar(255) NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT NOW(),
    read_at timestamp with time zone,
    CONSTRAINT admin_notifications_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS admin_notifications_tenant_id_idx ON auth.admin_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS admin_notifications_admin_user_id_idx ON auth.admin_notifications(admin_user_id);
CREATE INDEX IF NOT EXISTS admin_notifications_is_read_idx ON auth.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS admin_notifications_created_at_idx ON auth.admin_notifications(created_at);

-- Add FK constraints for tenant isolation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_notifications_tenant_id_tenants_tenant_id_fk'
  ) THEN
    ALTER TABLE auth.admin_notifications ADD CONSTRAINT admin_notifications_tenant_id_tenants_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id) ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_notifications_admin_user_id_users_user_id_fk'
  ) THEN
    ALTER TABLE auth.admin_notifications ADD CONSTRAINT admin_notifications_admin_user_id_users_user_id_fk FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;

-- RLS policies for admin notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'admin_notifications' AND policyname = 'tenant_isolation_admin_notifications'
  ) THEN
    CREATE POLICY "tenant_isolation_admin_notifications" ON auth.admin_notifications
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE auth.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.admin_notifications FORCE ROW LEVEL SECURITY;

COMMIT;
