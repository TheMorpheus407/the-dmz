-- Migration: 0025_compliance_snapshots.sql
-- Compliance snapshot store for tracking regulatory framework completion status
--
-- This migration creates tables for storing compliance snapshots per tenant,
-- tracking the completion status of various regulatory frameworks.
-- Required by Issue #220: Compliance Snapshot Store

-- Create compliance schema
CREATE SCHEMA IF NOT EXISTS compliance;

-- Compliance snapshots table - stores framework compliance status per tenant
CREATE TABLE IF NOT EXISTS "compliance"."compliance_snapshots" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "framework_id" varchar(32) NOT NULL,
    "status" varchar(32) DEFAULT 'not_started' NOT NULL,
    "completion_percentage" real DEFAULT 0 NOT NULL,
    "last_assessed_at" timestamp with time zone,
    "next_assessment_due" timestamp with time zone,
    "requirements" jsonb DEFAULT '{}' NOT NULL,
    "metadata" jsonb DEFAULT '{}' NOT NULL,
    "snapshot_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Framework requirements table - stores individual requirements breakdown per framework
CREATE TABLE IF NOT EXISTS "compliance"."framework_requirements" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "framework_id" varchar(32) NOT NULL,
    "requirement_id" varchar(64) NOT NULL,
    "requirement_name" varchar(255) NOT NULL,
    "description" text,
    "category" varchar(128),
    "is_required" integer DEFAULT 1 NOT NULL,
    "min_competency_score" integer DEFAULT 0 NOT NULL,
    "required_training_modules" jsonb DEFAULT '[]' NOT NULL,
    "status" varchar(32) DEFAULT 'not_started' NOT NULL,
    "completion_percentage" real DEFAULT 0 NOT NULL,
    "last_assessed_at" timestamp with time zone,
    "metadata" jsonb DEFAULT '{}' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Indexes for efficient querying on snapshots
CREATE INDEX IF NOT EXISTS "compliance_snapshots_tenant_idx" ON "compliance"."compliance_snapshots" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "compliance_snapshots_framework_idx" ON "compliance"."compliance_snapshots" USING btree ("framework_id");
CREATE INDEX IF NOT EXISTS "compliance_snapshots_snapshot_date_idx" ON "compliance"."compliance_snapshots" USING btree ("snapshot_date");
CREATE INDEX IF NOT EXISTS "compliance_snapshots_tenant_framework_idx" ON "compliance"."compliance_snapshots" USING btree ("tenant_id", "framework_id");
-- Unique constraint for upsert operations on compliance snapshots
CREATE UNIQUE INDEX IF NOT EXISTS "compliance_snapshots_tenant_framework_unique_idx" ON "compliance"."compliance_snapshots" ("tenant_id", "framework_id");

-- Indexes for efficient querying on framework requirements
CREATE INDEX IF NOT EXISTS "framework_requirements_tenant_idx" ON "compliance"."framework_requirements" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "framework_requirements_framework_idx" ON "compliance"."framework_requirements" USING btree ("framework_id");
CREATE INDEX IF NOT EXISTS "framework_requirements_tenant_framework_req_idx" ON "compliance"."framework_requirements" USING btree ("tenant_id", "framework_id", "requirement_id");

-- Unique constraint: one requirement per tenant per framework
CREATE UNIQUE INDEX IF NOT EXISTS "framework_requirements_unique_idx" ON "compliance"."framework_requirements" ("tenant_id", "framework_id", "requirement_id");

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "compliance"."compliance_snapshots" ADD CONSTRAINT "compliance_snapshots_tenant_id_tenants_tenant_id_fk" 
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "compliance"."framework_requirements" ADD CONSTRAINT "compliance_framework_requirements_tenant_id_tenants_tenant_id_fk" 
        FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enable RLS
ALTER TABLE "compliance"."compliance_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compliance"."framework_requirements" ENABLE ROW LEVEL SECURITY;

-- RLS policy for compliance snapshots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'compliance' AND tablename = 'compliance_snapshots' AND policyname = 'tenant_isolation_compliance_snapshots'
  ) THEN
    CREATE POLICY "tenant_isolation_compliance_snapshots" ON "compliance"."compliance_snapshots"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- RLS policy for framework requirements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'compliance' AND tablename = 'framework_requirements' AND policyname = 'tenant_isolation_framework_requirements'
  ) THEN
    CREATE POLICY "tenant_isolation_framework_requirements" ON "compliance"."framework_requirements"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "compliance"."compliance_snapshots" FORCE ROW LEVEL SECURITY;
ALTER TABLE "compliance"."framework_requirements" FORCE ROW LEVEL SECURITY;
