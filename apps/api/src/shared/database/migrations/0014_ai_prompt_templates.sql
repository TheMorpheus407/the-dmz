-- Migration: 0014_ai_prompt_templates.sql
-- AI pipeline prompt template registry.

CREATE SCHEMA IF NOT EXISTS ai;

CREATE TABLE IF NOT EXISTS "ai"."prompt_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "category" varchar(64) NOT NULL,
  "description" text,
  "attack_type" varchar(100),
  "threat_level" varchar(20),
  "difficulty" integer,
  "season" integer,
  "chapter" integer,
  "system_prompt" text NOT NULL,
  "user_template" text NOT NULL,
  "output_schema" jsonb NOT NULL DEFAULT '{}',
  "version" varchar(32) NOT NULL,
  "token_budget" integer NOT NULL DEFAULT 1200,
  "is_active" boolean NOT NULL DEFAULT true,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_prompt_templates_tenant_idx"
  ON "ai"."prompt_templates" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ai_prompt_templates_category_idx"
  ON "ai"."prompt_templates" USING btree ("category");
CREATE INDEX IF NOT EXISTS "ai_prompt_templates_active_idx"
  ON "ai"."prompt_templates" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "ai_prompt_templates_version_idx"
  ON "ai"."prompt_templates" USING btree ("version");
CREATE INDEX IF NOT EXISTS "ai_prompt_templates_selection_idx"
  ON "ai"."prompt_templates" USING btree ("category", "attack_type", "season", "difficulty");
CREATE UNIQUE INDEX IF NOT EXISTS "ai_prompt_templates_name_version_idx"
  ON "ai"."prompt_templates" USING btree ("tenant_id", "name", "version");

DO $$ BEGIN
  ALTER TABLE "ai"."prompt_templates"
    ADD CONSTRAINT "ai_prompt_templates_version_check"
    CHECK ("version" ~ '^[0-9]+\.[0-9]+\.[0-9]+$');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai"."prompt_templates"
    ADD CONSTRAINT "ai_prompt_templates_tenant_id_tenants_tenant_id_fk"
    FOREIGN KEY ("tenant_id")
    REFERENCES "public"."tenants"("tenant_id")
    ON DELETE restrict
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "ai"."prompt_templates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'ai'
      AND tablename = 'prompt_templates'
      AND policyname = 'tenant_isolation_prompt_templates'
  ) THEN
    CREATE POLICY "tenant_isolation_prompt_templates" ON "ai"."prompt_templates"
      USING ("tenant_id" = "auth"."current_tenant_id"())
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"());
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "ai"."prompt_templates" FORCE ROW LEVEL SECURITY;
