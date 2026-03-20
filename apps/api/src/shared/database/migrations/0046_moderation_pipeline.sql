-- Migration: 0046_moderation_pipeline
-- Description: Create moderation pipeline tables:
--              - social.moderation_blocklist (blocklist patterns)
--              - social.moderation_report (user reports)
--              - social.moderation_action (moderator actions)
--              - social.rate_limit_config (rate limit configuration)
--
-- Required by Issue #250: M10-11 Moderation Pipeline v1

-- Create moderation_blocklist table
CREATE TABLE IF NOT EXISTS "social"."moderation_blocklist" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "tenant_id" uuid REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "pattern" varchar(1000) NOT NULL,
  "pattern_type" varchar(20) NOT NULL DEFAULT 'contains',
  "severity" varchar(20) NOT NULL DEFAULT 'flag',
  "category" varchar(20) NOT NULL DEFAULT 'custom',
  "is_active" varchar(10) NOT NULL DEFAULT 'true',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid
);

CREATE INDEX IF NOT EXISTS "moderation_blocklist_tenant_idx" ON "social"."moderation_blocklist" ("tenant_id");
CREATE INDEX IF NOT EXISTS "moderation_blocklist_active_idx" ON "social"."moderation_blocklist" ("is_active");
CREATE INDEX IF NOT EXISTS "moderation_blocklist_category_idx" ON "social"."moderation_blocklist" ("category");
CREATE UNIQUE INDEX IF NOT EXISTS "moderation_blocklist_tenant_pattern_unique" ON "social"."moderation_blocklist" ("tenant_id", "pattern");

-- Enable RLS on moderation_blocklist
ALTER TABLE "social"."moderation_blocklist" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on moderation_blocklist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'moderation_blocklist'
    AND policyname = 'tenant_isolation_moderation_blocklist'
  ) THEN
    CREATE POLICY "tenant_isolation_moderation_blocklist" ON "social"."moderation_blocklist"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true' OR "tenant_id" IS NULL)
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true' OR "tenant_id" IS NULL);
  END IF;
END $$;

-- Create moderation_report table
CREATE TABLE IF NOT EXISTS "social"."moderation_report" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "reporter_player_id" uuid NOT NULL,
  "reported_player_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "report_type" varchar(20) NOT NULL,
  "content_reference" jsonb,
  "evidence" jsonb,
  "description" varchar(500),
  "status" varchar(30) NOT NULL DEFAULT 'pending',
  "assigned_moderator_id" uuid,
  "resolution" varchar(30),
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "moderation_report_tenant_idx" ON "social"."moderation_report" ("tenant_id");
CREATE INDEX IF NOT EXISTS "moderation_report_reporter_idx" ON "social"."moderation_report" ("reporter_player_id");
CREATE INDEX IF NOT EXISTS "moderation_report_reported_idx" ON "social"."moderation_report" ("reported_player_id");
CREATE INDEX IF NOT EXISTS "moderation_report_status_idx" ON "social"."moderation_report" ("status");
CREATE INDEX IF NOT EXISTS "moderation_report_assigned_moderator_idx" ON "social"."moderation_report" ("assigned_moderator_id");
CREATE INDEX IF NOT EXISTS "moderation_report_created_idx" ON "social"."moderation_report" ("created_at");

-- Enable RLS on moderation_report
ALTER TABLE "social"."moderation_report" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on moderation_report
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'moderation_report'
    AND policyname = 'tenant_isolation_moderation_report'
  ) THEN
    CREATE POLICY "tenant_isolation_moderation_report" ON "social"."moderation_report"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Create moderation_action table
CREATE TABLE IF NOT EXISTS "social"."moderation_action" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "player_id" uuid NOT NULL,
  "moderator_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "action_type" varchar(30) NOT NULL,
  "reason" varchar(280),
  "report_id" uuid,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "moderation_action_tenant_idx" ON "social"."moderation_action" ("tenant_id");
CREATE INDEX IF NOT EXISTS "moderation_action_player_idx" ON "social"."moderation_action" ("player_id");
CREATE INDEX IF NOT EXISTS "moderation_action_moderator_idx" ON "social"."moderation_action" ("moderator_id");
CREATE INDEX IF NOT EXISTS "moderation_action_report_idx" ON "social"."moderation_action" ("report_id");
CREATE INDEX IF NOT EXISTS "moderation_action_expires_idx" ON "social"."moderation_action" ("expires_at");
CREATE INDEX IF NOT EXISTS "moderation_action_created_idx" ON "social"."moderation_action" ("created_at");
CREATE INDEX IF NOT EXISTS "moderation_action_player_tenant_idx" ON "social"."moderation_action" ("player_id", "tenant_id");

-- Enable RLS on moderation_action
ALTER TABLE "social"."moderation_action" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on moderation_action
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'moderation_action'
    AND policyname = 'tenant_isolation_moderation_action'
  ) THEN
    CREATE POLICY "tenant_isolation_moderation_action" ON "social"."moderation_action"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

-- Create rate_limit_config table
CREATE TABLE IF NOT EXISTS "social"."rate_limit_config" (
  "id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "tenant_id" uuid REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "action" varchar(30) NOT NULL,
  "window_seconds" varchar(20) NOT NULL,
  "max_count" varchar(20) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_config_tenant_action_unique" ON "social"."rate_limit_config" ("tenant_id", "action");
CREATE INDEX IF NOT EXISTS "rate_limit_config_tenant_idx" ON "social"."rate_limit_config" ("tenant_id");
CREATE INDEX IF NOT EXISTS "rate_limit_config_action_idx" ON "social"."rate_limit_config" ("action");

-- Enable RLS on rate_limit_config
ALTER TABLE "social"."rate_limit_config" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on rate_limit_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'rate_limit_config'
    AND policyname = 'tenant_isolation_rate_limit_config'
  ) THEN
    CREATE POLICY "tenant_isolation_rate_limit_config" ON "social"."rate_limit_config"
      FOR ALL
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true' OR "tenant_id" IS NULL)
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true' OR "tenant_id" IS NULL);
  END IF;
END $$;

-- Seed global default rate limit configs
INSERT INTO "social"."rate_limit_config" ("tenant_id", "action", "window_seconds", "max_count") VALUES
  (NULL, 'send_message', '60', '10'),
  (NULL, 'send_friend_request', '3600', '20'),
  (NULL, 'create_forum_post', '3600', '5'),
  (NULL, 'report_submit', '3600', '10')
ON CONFLICT ("tenant_id", "action") DO NOTHING;

-- Seed basic global blocklist patterns
INSERT INTO "social"."moderation_blocklist" ("tenant_id", "pattern", "pattern_type", "severity", "category", "created_by") VALUES
  (NULL, 'badword1', 'contains', 'block', 'profanity', NULL),
  (NULL, 'badword2', 'contains', 'mute', 'profanity', NULL),
  (NULL, 'spamlink\\.com', 'regex', 'flag', 'spam', NULL)
ON CONFLICT ("tenant_id", "pattern") DO NOTHING;