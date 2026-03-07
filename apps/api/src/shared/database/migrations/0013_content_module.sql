-- Migration: 0013_content_module.sql
-- Content module tables for email templates, scenarios, document templates, and localization
--
-- This migration creates the foundational content storage for the content module.
-- Required by M3-01 (Content Module Foundation)

-- Create content schema
CREATE SCHEMA IF NOT EXISTS content;

-- Email templates table
CREATE TABLE IF NOT EXISTS "content"."email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"from_name" varchar(255),
	"from_email" varchar(255),
	"reply_to" varchar(255),
	"content_type" varchar(50) NOT NULL,
	"difficulty" integer NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
	"faction" varchar(50),
	"attack_type" varchar(100),
	"threat_level" varchar(20) NOT NULL CHECK (threat_level IN ('LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE')),
	"season" integer,
	"chapter" integer,
	"language" varchar(10) NOT NULL DEFAULT 'en',
	"locale" varchar(10) NOT NULL DEFAULT 'en-US',
	"metadata" jsonb DEFAULT '{}',
	"is_ai_generated" boolean NOT NULL DEFAULT false,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_templates_tenant_idx" ON "content"."email_templates" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "email_templates_content_type_idx" ON "content"."email_templates" USING btree ("content_type");
CREATE INDEX IF NOT EXISTS "email_templates_difficulty_idx" ON "content"."email_templates" USING btree ("difficulty");
CREATE INDEX IF NOT EXISTS "email_templates_faction_idx" ON "content"."email_templates" USING btree ("faction");
CREATE INDEX IF NOT EXISTS "email_templates_threat_level_idx" ON "content"."email_templates" USING btree ("threat_level");
CREATE INDEX IF NOT EXISTS "email_templates_season_chapter_idx" ON "content"."email_templates" USING btree ("season", "chapter");
CREATE INDEX IF NOT EXISTS "email_templates_locale_idx" ON "content"."email_templates" USING btree ("locale");
CREATE INDEX IF NOT EXISTS "email_templates_active_idx" ON "content"."email_templates" USING btree ("is_active");

-- Scenarios table (multi-day campaign scenarios)
CREATE TABLE IF NOT EXISTS "content"."scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"difficulty" integer NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
	"faction" varchar(50),
	"season" integer,
	"chapter" integer,
	"language" varchar(10) NOT NULL DEFAULT 'en',
	"locale" varchar(10) NOT NULL DEFAULT 'en-US',
	"metadata" jsonb DEFAULT '{}',
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scenarios_tenant_idx" ON "content"."scenarios" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "scenarios_difficulty_idx" ON "content"."scenarios" USING btree ("difficulty");
CREATE INDEX IF NOT EXISTS "scenarios_faction_idx" ON "content"."scenarios" USING btree ("faction");
CREATE INDEX IF NOT EXISTS "scenarios_season_chapter_idx" ON "content"."scenarios" USING btree ("season", "chapter");

-- Scenario beats table (individual beats/stages within a scenario)
CREATE TABLE IF NOT EXISTS "content"."scenario_beats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"beat_index" integer NOT NULL,
	"day_offset" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"email_template_id" uuid REFERENCES "content"."email_templates"("id") ON DELETE set null,
	"document_type" varchar(50),
	"attack_type" varchar(100),
	"threat_level" varchar(20) CHECK (threat_level IN ('LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE')),
	"required_indicators" jsonb DEFAULT '[]',
	"optional_indicators" jsonb DEFAULT '[]',
	"metadata" jsonb DEFAULT '{}',
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE ("scenario_id", "beat_index")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scenario_beats_scenario_idx" ON "content"."scenario_beats" USING btree ("scenario_id");
CREATE INDEX IF NOT EXISTS "scenario_beats_tenant_idx" ON "content"."scenario_beats" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "scenario_beats_day_idx" ON "content"."scenario_beats" USING btree ("day_offset");

DO $$ BEGIN
	ALTER TABLE "content"."scenario_beats" ADD CONSTRAINT "scenario_beats_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "content"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Document templates table (13 document types)
CREATE TABLE IF NOT EXISTS "content"."document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"document_type" varchar(50) NOT NULL CHECK (document_type IN ('EMAIL', 'PAW', 'VERIFICATION_PACKET', 'THREAT_ASSESSMENT', 'INCIDENT_LOG', 'DATA_SALVAGE_CONTRACT', 'STORAGE_LEASE', 'UPGRADE_PROPOSAL', 'BLACKLIST_NOTICE', 'WHITELIST_EXCEPTION', 'FACILITY_REPORT', 'INTELLIGENCE_BRIEF', 'RANSOM_NOTE')),
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"difficulty" integer CHECK (difficulty >= 1 AND difficulty <= 5),
	"faction" varchar(50),
	"season" integer,
	"chapter" integer,
	"language" varchar(10) NOT NULL DEFAULT 'en',
	"locale" varchar(10) NOT NULL DEFAULT 'en-US',
	"metadata" jsonb DEFAULT '{}',
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_templates_tenant_idx" ON "content"."document_templates" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "document_templates_type_idx" ON "content"."document_templates" USING btree ("document_type");
CREATE INDEX IF NOT EXISTS "document_templates_faction_idx" ON "content"."document_templates" USING btree ("faction");
CREATE INDEX IF NOT EXISTS "document_templates_locale_idx" ON "content"."document_templates" USING btree ("locale");

-- Localized content table
CREATE TABLE IF NOT EXISTS "content"."localized_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"content_key" varchar(255) NOT NULL,
	"content_type" varchar(50) NOT NULL,
	"language" varchar(10) NOT NULL DEFAULT 'en',
	"locale" varchar(10) NOT NULL DEFAULT 'en-US',
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE ("tenant_id", "content_key", "locale")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "localized_content_tenant_idx" ON "content"."localized_content" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "localized_content_key_idx" ON "content"."localized_content" USING btree ("content_key");
CREATE INDEX IF NOT EXISTS "localized_content_locale_idx" ON "content"."localized_content" USING btree ("locale");

-- AI generation log table (audit trail for AI-generated content)
CREATE TABLE IF NOT EXISTS "content"."ai_generation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"request_id" varchar(255) NOT NULL,
	"prompt_hash" varchar(64) NOT NULL,
	"model" varchar(100) NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"content_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'VALIDATED', 'REJECTED')),
	"error_message" text,
	"generation_params" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_generation_log_tenant_idx" ON "content"."ai_generation_log" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_generation_log_request_idx" ON "content"."ai_generation_log" USING btree ("request_id");
CREATE INDEX IF NOT EXISTS "ai_generation_log_status_idx" ON "content"."ai_generation_log" USING btree ("status");
CREATE INDEX IF NOT EXISTS "ai_generation_log_created_idx" ON "content"."ai_generation_log" USING btree ("created_at");

-- Add foreign key constraints for tenant isolation
DO $$ BEGIN
	ALTER TABLE "content"."email_templates" ADD CONSTRAINT "email_templates_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."scenarios" ADD CONSTRAINT "scenarios_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."scenario_beats" ADD CONSTRAINT "scenario_beats_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."document_templates" ADD CONSTRAINT "document_templates_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."localized_content" ADD CONSTRAINT "localized_content_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."ai_generation_log" ADD CONSTRAINT "ai_generation_log_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
