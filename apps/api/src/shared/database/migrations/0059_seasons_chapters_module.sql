-- Migration: 0059_seasons_chapters_module.sql
-- Seasons and Chapters tables for narrative content structure
--
-- This migration creates the seasons and chapters tables that define the narrative
-- arc structure for content delivery. Seasons contain chapters, and chapters
-- define the day-by-day progression through content.
--
-- Required by: Issue #1772 (Inline CREATE TABLE in Test Files)

CREATE SCHEMA IF NOT EXISTS content;

-- Seasons table (narrative seasons containing multiple chapters)
CREATE TABLE IF NOT EXISTS "content"."seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"season_number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"theme" text NOT NULL,
	"logline" text NOT NULL,
	"description" text,
	"threat_curve_start" varchar(20) NOT NULL DEFAULT 'LOW',
	"threat_curve_end" varchar(20) NOT NULL DEFAULT 'HIGH',
	"is_active" boolean NOT NULL DEFAULT true,
	"metadata" jsonb NOT NULL DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seasons_tenant_idx" ON "content"."seasons" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "seasons_number_idx" ON "content"."seasons" USING btree ("season_number");
CREATE INDEX IF NOT EXISTS "seasons_active_idx" ON "content"."seasons" USING btree ("is_active");

-- Chapters table (individual chapters within a season)
CREATE TABLE IF NOT EXISTS "content"."chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"chapter_number" integer NOT NULL,
	"act" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"day_start" integer NOT NULL,
	"day_end" integer NOT NULL,
	"difficulty_start" integer NOT NULL DEFAULT 1,
	"difficulty_end" integer NOT NULL DEFAULT 2,
	"threat_level" varchar(20) NOT NULL DEFAULT 'LOW',
	"is_active" boolean NOT NULL DEFAULT true,
	"metadata" jsonb NOT NULL DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapters_tenant_idx" ON "content"."chapters" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "chapters_season_idx" ON "content"."chapters" USING btree ("season_id");
CREATE INDEX IF NOT EXISTS "chapters_number_idx" ON "content"."chapters" USING btree ("chapter_number");
CREATE INDEX IF NOT EXISTS "chapters_act_idx" ON "content"."chapters" USING btree ("act");
CREATE INDEX IF NOT EXISTS "chapters_active_idx" ON "content"."chapters" USING btree ("is_active");

-- Foreign key constraints
DO $$ BEGIN
	ALTER TABLE "content"."seasons" ADD CONSTRAINT "seasons_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."chapters" ADD CONSTRAINT "chapters_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."chapters" ADD CONSTRAINT "chapters_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "content"."seasons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
