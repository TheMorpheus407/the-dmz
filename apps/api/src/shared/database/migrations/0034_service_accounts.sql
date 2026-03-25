-- Migration: 0034_service_accounts
-- Description: Service accounts with RBAC, IP allowlist for API keys, and referer restrictions
-- Created: 2026-03-19

-- Create service_accounts table
CREATE TABLE IF NOT EXISTS "auth"."service_accounts" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "service_id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenants" ("tenant_id") ON DELETE RESTRICT,
  "name" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(16) NOT NULL DEFAULT 'active',
  "owner_id" uuid,
  "metadata" jsonb,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "disabled_at" timestamptz,
  PRIMARY KEY ("id")
);

-- Create indexes for service_accounts
CREATE UNIQUE INDEX IF NOT EXISTS "auth_service_accounts_service_id_unique" ON "auth"."service_accounts" ("service_id");
CREATE INDEX IF NOT EXISTS "auth_service_accounts_tenant_idx" ON "auth"."service_accounts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "auth_service_accounts_tenant_name_idx" ON "auth"."service_accounts" ("tenant_id", "name");
CREATE INDEX IF NOT EXISTS "auth_service_accounts_status_idx" ON "auth"."service_accounts" ("status");

-- Enable RLS on service_accounts
ALTER TABLE "auth"."service_accounts" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'service_accounts' AND policyname = 'tenant_isolation_service_accounts'
  ) THEN
    CREATE POLICY "tenant_isolation_service_accounts" ON "auth"."service_accounts"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);
  END IF;
END $$;

-- Create service_account_roles table (RBAC for service accounts)
CREATE TABLE IF NOT EXISTS "auth"."service_account_roles" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
  "tenant_id" uuid NOT NULL REFERENCES "public"."tenants" ("tenant_id") ON DELETE RESTRICT,
  "service_account_id" uuid NOT NULL REFERENCES "auth"."service_accounts" ("id") ON DELETE CASCADE,
  "role_id" uuid NOT NULL REFERENCES "auth"."roles" ("id") ON DELETE RESTRICT,
  "assigned_by" uuid,
  "assigned_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz,
  "scope" varchar(255),
  PRIMARY KEY ("id")
);

-- Create indexes for service_account_roles
CREATE UNIQUE INDEX IF NOT EXISTS "auth_service_account_roles_tenant_service_role_unique" ON "auth"."service_account_roles" ("tenant_id", "service_account_id", "role_id");
CREATE INDEX IF NOT EXISTS "auth_service_account_roles_tenant_service_idx" ON "auth"."service_account_roles" ("tenant_id", "service_account_id");
CREATE INDEX IF NOT EXISTS "auth_service_account_roles_tenant_role_idx" ON "auth"."service_account_roles" ("tenant_id", "role_id");

-- Enable RLS on service_account_roles
ALTER TABLE "auth"."service_account_roles" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'service_account_roles' AND policyname = 'tenant_isolation_service_account_roles'
  ) THEN
    CREATE POLICY "tenant_isolation_service_account_roles" ON "auth"."service_account_roles"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);
  END IF;
END $$;

-- Create api_keys table if it doesn't exist (needed for IP allowlist and service account columns)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'auth' AND tablename = 'api_keys'
  ) THEN
    CREATE TABLE "auth"."api_keys" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v7(),
      "key_id" uuid NOT NULL DEFAULT uuid_generate_v7(),
      "tenant_id" uuid NOT NULL,
      "name" varchar(255) NOT NULL,
      "type" varchar(16) NOT NULL,
      "owner_type" varchar(16) NOT NULL,
      "owner_id" uuid,
      "service_account_id" uuid,
      "secret_hash" varchar(255) NOT NULL,
      "previous_secret_hash" varchar(255),
      "scopes" jsonb NOT NULL,
      "status" varchar(16) NOT NULL DEFAULT 'active',
      "expires_at" timestamptz,
      "rotation_grace_period_days" varchar(3) NOT NULL DEFAULT '7',
      "rotation_grace_ends_at" timestamptz,
      "last_used_at" timestamptz,
      "ip_allowlist" jsonb,
      "referer_restrictions" jsonb,
      "rate_limit_requests_per_window" jsonb,
      "rate_limit_window_ms" jsonb,
      "created_by" uuid NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "revoked_at" timestamptz,
      "revoked_by" uuid,
      "revocation_reason" text,
      "metadata" jsonb,
      PRIMARY KEY ("id")
    );
    
    -- Create indexes for api_keys
    CREATE UNIQUE INDEX "auth_api_keys_key_id_unique" ON "auth"."api_keys" ("key_id");
    CREATE INDEX "auth_api_keys_tenant_id_idx" ON "auth"."api_keys" ("tenant_id");
    CREATE INDEX "auth_api_keys_tenant_key_idx" ON "auth"."api_keys" ("tenant_id", "key_id");
    CREATE INDEX "auth_api_keys_tenant_name_idx" ON "auth"."api_keys" ("tenant_id", "name");
    CREATE INDEX "auth_api_keys_status_idx" ON "auth"."api_keys" ("status");
    CREATE INDEX "auth_api_keys_owner_id_idx" ON "auth"."api_keys" ("owner_id");
    CREATE INDEX "auth_api_keys_service_account_id_idx" ON "auth"."api_keys" ("service_account_id");
    CREATE INDEX "auth_api_keys_created_by_idx" ON "auth"."api_keys" ("created_by");
    CREATE INDEX "auth_api_keys_revoked_at_idx" ON "auth"."api_keys" ("revoked_at");
    CREATE INDEX "auth_api_keys_expires_at_idx" ON "auth"."api_keys" ("expires_at");
    CREATE INDEX "auth_api_keys_rotation_grace_ends_at_idx" ON "auth"."api_keys" ("rotation_grace_ends_at");
    CREATE INDEX "auth_api_keys_tenant_owner_type_idx" ON "auth"."api_keys" ("tenant_id", "owner_type");
    
    -- Enable RLS
    ALTER TABLE "auth"."api_keys" ENABLE ROW LEVEL SECURITY;
    
    -- RLS policy for tenant isolation
    CREATE POLICY "tenant_isolation_api_keys" ON "auth"."api_keys"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);
    
    -- Create trigger for updated_at
    CREATE TRIGGER "trg_api_keys_updated_at"
      BEFORE UPDATE ON "auth"."api_keys"
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    
    -- Add comments
    COMMENT ON COLUMN "auth"."api_keys"."ip_allowlist" IS 'Array of allowed IP addresses or CIDR ranges for this API key';
    COMMENT ON COLUMN "auth"."api_keys"."referer_restrictions" IS 'Array of allowed referer patterns for this API key';
    COMMENT ON COLUMN "auth"."api_keys"."service_account_id" IS 'Reference to the service account that owns this API key';
  END IF;
END $$;

-- Add columns to api_keys table for IP allowlist, referer restrictions, and service account reference (if not already added)
-- Note: tenant_id is created by the DO block above if the table didn't exist
ALTER TABLE "auth"."api_keys" ADD COLUMN IF NOT EXISTS "ip_allowlist" jsonb;
ALTER TABLE "auth"."api_keys" ADD COLUMN IF NOT EXISTS "referer_restrictions" jsonb;
ALTER TABLE "auth"."api_keys" ADD COLUMN IF NOT EXISTS "service_account_id" uuid REFERENCES "auth"."service_accounts" ("id") ON DELETE SET NULL;

-- Create indexes for new api_keys columns
CREATE INDEX IF NOT EXISTS "auth_api_keys_service_account_id_idx" ON "auth"."api_keys" ("service_account_id");

-- Function to validate IP against allowlist
CREATE OR REPLACE FUNCTION "auth"."validate_ip_allowlist"(
  p_client_ip varchar,
  p_allowlist jsonb
) RETURNS boolean AS $$
DECLARE
  v_ip_pattern varchar;
  v_is_allowed boolean := false;
BEGIN
  IF p_allowlist IS NULL OR jsonb_array_length(p_allowlist) = 0 THEN
    RETURN true;
  END IF;

  IF p_client_ip IS NULL OR p_client_ip = '' THEN
    RETURN false;
  END IF;

  FOR v_ip_pattern IN SELECT jsonb_array_elements_text(p_allowlist)
  LOOP
    -- Check for CIDR notation (contains '/')
    IF strpos(v_ip_pattern, '/') > 0 THEN
      IF p_client_ip <<= v_ip_pattern::inet THEN
        v_is_allowed := true;
        EXIT;
      END IF;
    ELSE
      -- Direct IP comparison
      IF p_client_ip = v_ip_pattern THEN
        v_is_allowed := true;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  RETURN v_is_allowed;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to validate referer against restrictions
CREATE OR REPLACE FUNCTION "auth"."validate_referer_restriction"(
  p_referer varchar,
  p_restrictions jsonb
) RETURNS boolean AS $$
DECLARE
  v_pattern varchar;
  v_is_allowed boolean := false;
BEGIN
  IF p_restrictions IS NULL OR jsonb_array_length(p_restrictions) = 0 THEN
    RETURN true;
  END IF;

  IF p_referer IS NULL OR p_referer = '' THEN
    RETURN false;
  END IF;

  FOR v_pattern IN SELECT jsonb_array_elements_text(p_restrictions)
  LOOP
    -- Simple pattern matching: allow * as wildcard for subdomains
    -- Pattern examples: "https://*.example.com/*", "https://api.example.com/webhook/*"
    IF p_referer LIKE replace(v_pattern, '*', '%') THEN
      v_is_allowed := true;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_is_allowed;
END;
$$ LANGUAGE plpgsql STABLE;
