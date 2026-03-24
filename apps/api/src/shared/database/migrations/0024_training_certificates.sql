-- Migration: 0024_training_certificates.sql
-- Training certificates table for compliance and completion certificates
--
-- This migration creates the training.certificates table for storing
-- training completion certificates with regulatory framework references.
-- Required by M8-10: Certificate generation

-- Create training schema
CREATE SCHEMA IF NOT EXISTS training;

-- Certificates table
CREATE TABLE IF NOT EXISTS "training"."certificates" (
    "certificate_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "campaign_id" uuid,
    "framework_id" varchar(32) NOT NULL,
    "course_name" varchar(255) NOT NULL,
    "issued_at" timestamp with time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp with time zone,
    "signature_hash" varchar(64),
    "pdf_blob" bytea,
    "metadata" jsonb DEFAULT '{}',
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "certificates_tenant_idx" ON "training"."certificates" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "certificates_user_idx" ON "training"."certificates" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "certificates_campaign_idx" ON "training"."certificates" USING btree ("campaign_id");
CREATE INDEX IF NOT EXISTS "certificates_framework_idx" ON "training"."certificates" USING btree ("framework_id");
CREATE INDEX IF NOT EXISTS "certificates_issued_at_idx" ON "training"."certificates" USING btree ("issued_at");

-- Unique constraint: one certificate per user per campaign
CREATE UNIQUE INDEX IF NOT EXISTS "certificates_user_campaign_unique" ON "training"."certificates" ("user_id", "campaign_id");

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "training"."certificates" ADD CONSTRAINT "certificates_tenant_id_tenants_tenant_id_fk" 
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "training"."certificates" ADD CONSTRAINT "certificates_user_id_auth_users_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enable RLS
ALTER TABLE "training"."certificates" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'training' AND tablename = 'certificates' AND policyname = 'tenant_isolation_certificates'
  ) THEN
    CREATE POLICY "tenant_isolation_certificates" ON "training"."certificates"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "training"."certificates" FORCE ROW LEVEL SECURITY;
