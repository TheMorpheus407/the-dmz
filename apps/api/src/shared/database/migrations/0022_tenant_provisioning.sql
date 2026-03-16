-- Migration: 0022_tenant_provisioning
-- Description: Add tenant provisioning fields and default roles expansion
--
-- Adds:
-- - tier column to tenants (Starter/Professional/Enterprise/Government)
-- - contact_email column to tenants
-- - provisioning_status column to tenants
-- - Unique constraint on domain
-- - Expands DEFAULT_ROLES to 5 roles

-- Add new columns to tenants table
ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS tier varchar(20) DEFAULT 'starter';
ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS contact_email varchar(255);
ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS provisioning_status varchar(20) NOT NULL DEFAULT 'pending';

-- Add unique constraint on domain (allow nulls but enforce uniqueness for non-null values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'tenants_domain_unique'
  ) THEN
    ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_domain_unique" UNIQUE (domain);
  END IF;
END $$;

-- Add index on provisioning_status for faster queries
CREATE INDEX IF NOT EXISTS "tenants_provisioning_status_idx" ON "public"."tenants" ("provisioning_status");

-- Update default tier values based on plan
UPDATE "public"."tenants" SET tier = 'starter' WHERE plan_id = 'free';
UPDATE "public"."tenants" SET tier = 'professional' WHERE plan_id = 'pro';
UPDATE "public"."tenants" SET tier = 'enterprise' WHERE plan_id = 'enterprise';

COMMENT ON COLUMN "public"."tenants".tier IS 'Subscription tier: starter, professional, enterprise, government';
COMMENT ON COLUMN "public"."tenants".contact_email IS 'Primary contact email for the tenant';
COMMENT ON COLUMN "public"."tenants".provisioning_status IS 'Tenant provisioning status: pending, provisioning, ready, failed';
