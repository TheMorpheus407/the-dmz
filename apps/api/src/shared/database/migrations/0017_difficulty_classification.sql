-- Migration: 0017_difficulty_classification.sql
-- Difficulty Classification System for M3-09
--
-- This migration creates tables for:
-- - difficulty_thresholds: Configurable thresholds for classification
-- - email_features: Extracted features from emails
-- - difficulty_history: Classification audit trail

-- Create difficulty_thresholds table
CREATE TABLE IF NOT EXISTS "content"."difficulty_thresholds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"difficulty" integer NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
	"feature_name" varchar(100) NOT NULL,
	"min_value" numeric,
	"max_value" numeric,
	"weight" numeric DEFAULT 1.0,
	"metadata" jsonb DEFAULT '{}',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE ("tenant_id", "difficulty", "feature_name")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "difficulty_thresholds_tenant_idx" ON "content"."difficulty_thresholds" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "difficulty_thresholds_difficulty_idx" ON "content"."difficulty_thresholds" USING btree ("difficulty");
CREATE INDEX IF NOT EXISTS "difficulty_thresholds_feature_idx" ON "content"."difficulty_thresholds" USING btree ("feature_name");

-- Create email_features table
CREATE TABLE IF NOT EXISTS "content"."email_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email_template_id" uuid REFERENCES "content"."email_templates"("id") ON DELETE cascade,
	"indicator_count" integer,
	"word_count" integer,
	"has_spoofed_headers" boolean,
	"impersonation_quality" numeric,
	"has_verification_hooks" boolean,
	"emotional_manipulation_level" numeric,
	"grammar_complexity" numeric,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_features_tenant_idx" ON "content"."email_features" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "email_features_email_idx" ON "content"."email_features" USING btree ("email_template_id");
CREATE INDEX IF NOT EXISTS "email_features_created_idx" ON "content"."email_features" USING btree ("created_at");

-- Create difficulty_history table
CREATE TABLE IF NOT EXISTS "content"."difficulty_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email_template_id" uuid REFERENCES "content"."email_templates"("id") ON DELETE cascade,
	"requested_difficulty" integer CHECK (requested_difficulty >= 1 AND requested_difficulty <= 5),
	"classified_difficulty" integer NOT NULL CHECK (classified_difficulty >= 1 AND classified_difficulty <= 5),
	"classification_method" varchar(20) NOT NULL CHECK (classification_method IN ('haiku', 'rule-based', 'manual')),
	"confidence" numeric,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "difficulty_history_tenant_idx" ON "content"."difficulty_history" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "difficulty_history_email_idx" ON "content"."difficulty_history" USING btree ("email_template_id");
CREATE INDEX IF NOT EXISTS "difficulty_history_difficulty_idx" ON "content"."difficulty_history" USING btree ("classified_difficulty");
CREATE INDEX IF NOT EXISTS "difficulty_history_method_idx" ON "content"."difficulty_history" USING btree ("classification_method");
CREATE INDEX IF NOT EXISTS "difficulty_history_created_idx" ON "content"."difficulty_history" USING btree ("created_at");

-- Difficulty classification tables created
-- Note: Default thresholds are embedded in the rule-based classifier code
-- For custom thresholds per tenant, insert into difficulty_thresholds table
