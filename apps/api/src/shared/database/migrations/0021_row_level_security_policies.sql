-- Migration: 0021_row_level_security_policies
-- Description: Implement Row-Level Security (RLS) policies on all tenant-scoped tables
--
-- This migration adds RLS to all tables that were missing it:
-- - public.users
-- - public.game_sessions
-- - public.game_events
-- - public.game_state_snapshots
-- - public.economy_transactions
-- - content.email_templates
-- - content.scenarios
-- - content.scenario_beats
-- - content.document_templates
-- - content.localized_content
-- - content.ai_generation_log
-- - content.factions
-- - content.faction_relations
-- - content.narrative_events
-- - content.morpheus_messages
-- - content.player_narrative_state
-- - analytics.events
-- - analytics.player_profiles
-- - analytics.dead_letter_queue
-- - analytics.metrics (RLS for non-null tenant_id only)
-- - idempotency.records
--
-- Also adds Super Admin bypass support via app.is_super_admin session variable.

-- Enable RLS on public.users
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'tenant_isolation_users'
  ) THEN
    CREATE POLICY "tenant_isolation_users" ON "public"."users"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "public"."users" FORCE ROW LEVEL SECURITY;

-- Enable RLS on public.game_sessions
ALTER TABLE "public"."game_sessions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_sessions' AND policyname = 'tenant_isolation_game_sessions'
  ) THEN
    CREATE POLICY "tenant_isolation_game_sessions" ON "public"."game_sessions"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "public"."game_sessions" FORCE ROW LEVEL SECURITY;

-- Enable RLS on public.game_events
ALTER TABLE "public"."game_events" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_events' AND policyname = 'tenant_isolation_game_events'
  ) THEN
    CREATE POLICY "tenant_isolation_game_events" ON "public"."game_events"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "public"."game_events" FORCE ROW LEVEL SECURITY;

-- Enable RLS on public.game_state_snapshots
ALTER TABLE "public"."game_state_snapshots" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_state_snapshots' AND policyname = 'tenant_isolation_game_state_snapshots'
  ) THEN
    CREATE POLICY "tenant_isolation_game_state_snapshots" ON "public"."game_state_snapshots"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "public"."game_state_snapshots" FORCE ROW LEVEL SECURITY;

-- Enable RLS on public.economy_transactions
ALTER TABLE "public"."economy_transactions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'economy_transactions' AND policyname = 'tenant_isolation_economy_transactions'
  ) THEN
    CREATE POLICY "tenant_isolation_economy_transactions" ON "public"."economy_transactions"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "public"."economy_transactions" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.email_templates
ALTER TABLE "content"."email_templates" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'email_templates' AND policyname = 'tenant_isolation_email_templates'
  ) THEN
    CREATE POLICY "tenant_isolation_email_templates" ON "content"."email_templates"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."email_templates" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.scenarios
ALTER TABLE "content"."scenarios" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'scenarios' AND policyname = 'tenant_isolation_scenarios'
  ) THEN
    CREATE POLICY "tenant_isolation_scenarios" ON "content"."scenarios"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."scenarios" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.scenario_beats
ALTER TABLE "content"."scenario_beats" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'scenario_beats' AND policyname = 'tenant_isolation_scenario_beats'
  ) THEN
    CREATE POLICY "tenant_isolation_scenario_beats" ON "content"."scenario_beats"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."scenario_beats" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.document_templates
ALTER TABLE "content"."document_templates" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'document_templates' AND policyname = 'tenant_isolation_document_templates'
  ) THEN
    CREATE POLICY "tenant_isolation_document_templates" ON "content"."document_templates"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."document_templates" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.localized_content
ALTER TABLE "content"."localized_content" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'localized_content' AND policyname = 'tenant_isolation_localized_content'
  ) THEN
    CREATE POLICY "tenant_isolation_localized_content" ON "content"."localized_content"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."localized_content" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.ai_generation_log
ALTER TABLE "content"."ai_generation_log" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'ai_generation_log' AND policyname = 'tenant_isolation_ai_generation_log'
  ) THEN
    CREATE POLICY "tenant_isolation_ai_generation_log" ON "content"."ai_generation_log"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."ai_generation_log" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.factions
ALTER TABLE "content"."factions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'factions' AND policyname = 'tenant_isolation_factions'
  ) THEN
    CREATE POLICY "tenant_isolation_factions" ON "content"."factions"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."factions" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.faction_relations
ALTER TABLE "content"."faction_relations" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'faction_relations' AND policyname = 'tenant_isolation_faction_relations'
  ) THEN
    CREATE POLICY "tenant_isolation_faction_relations" ON "content"."faction_relations"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."faction_relations" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.narrative_events
ALTER TABLE "content"."narrative_events" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'narrative_events' AND policyname = 'tenant_isolation_narrative_events'
  ) THEN
    CREATE POLICY "tenant_isolation_narrative_events" ON "content"."narrative_events"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."narrative_events" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.morpheus_messages
ALTER TABLE "content"."morpheus_messages" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'morpheus_messages' AND policyname = 'tenant_isolation_morpheus_messages'
  ) THEN
    CREATE POLICY "tenant_isolation_morpheus_messages" ON "content"."morpheus_messages"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."morpheus_messages" FORCE ROW LEVEL SECURITY;

-- Enable RLS on content.player_narrative_state
ALTER TABLE "content"."player_narrative_state" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'content' AND tablename = 'player_narrative_state' AND policyname = 'tenant_isolation_player_narrative_state'
  ) THEN
    CREATE POLICY "tenant_isolation_player_narrative_state" ON "content"."player_narrative_state"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "content"."player_narrative_state" FORCE ROW LEVEL SECURITY;

-- Enable RLS on analytics.events
ALTER TABLE "analytics"."events" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'analytics' AND tablename = 'events' AND policyname = 'tenant_isolation_analytics_events'
  ) THEN
    CREATE POLICY "tenant_isolation_analytics_events" ON "analytics"."events"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "analytics"."events" FORCE ROW LEVEL SECURITY;

-- Enable RLS on analytics.player_profiles
ALTER TABLE "analytics"."player_profiles" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'analytics' AND tablename = 'player_profiles' AND policyname = 'tenant_isolation_player_profiles'
  ) THEN
    CREATE POLICY "tenant_isolation_player_profiles" ON "analytics"."player_profiles"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "analytics"."player_profiles" FORCE ROW LEVEL SECURITY;

-- Enable RLS on analytics.dead_letter_queue
ALTER TABLE "analytics"."dead_letter_queue" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'analytics' AND tablename = 'dead_letter_queue' AND policyname = 'tenant_isolation_dead_letter_queue'
  ) THEN
    CREATE POLICY "tenant_isolation_dead_letter_queue" ON "analytics"."dead_letter_queue"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "analytics"."dead_letter_queue" FORCE ROW LEVEL SECURITY;

-- Enable RLS on analytics.metrics (only for rows with non-null tenant_id)
ALTER TABLE "analytics"."metrics" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'analytics' AND tablename = 'metrics' AND policyname = 'tenant_isolation_metrics'
  ) THEN
    CREATE POLICY "tenant_isolation_metrics" ON "analytics"."metrics"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true' OR "tenant_id" IS NULL)
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true' OR "tenant_id" IS NULL);
  END IF;
END $$;

ALTER TABLE "analytics"."metrics" FORCE ROW LEVEL SECURITY;

-- Enable RLS on idempotency.records
ALTER TABLE "idempotency"."records" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'idempotency' AND tablename = 'records' AND policyname = 'tenant_isolation_idempotency_records'
  ) THEN
    CREATE POLICY "tenant_isolation_idempotency_records" ON "idempotency"."records"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "idempotency"."records" FORCE ROW LEVEL SECURITY;

-- Add Super Admin bypass helper function
CREATE OR REPLACE FUNCTION "auth"."is_super_admin"() RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(NULLIF(current_setting('app.is_super_admin', true), ''), 'false')::boolean;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update existing RLS policies to include Super Admin bypass
-- Update auth.sessions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'sessions' AND policyname = 'tenant_isolation_sessions'
  ) THEN
    DROP POLICY IF EXISTS "tenant_isolation_sessions" ON "auth"."sessions";
  END IF;
END $$;

CREATE POLICY "tenant_isolation_sessions" ON "auth"."sessions"
  USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
  WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);

-- Update auth.roles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'roles' AND policyname = 'tenant_isolation_roles'
  ) THEN
    DROP POLICY IF EXISTS "tenant_isolation_roles" ON "auth"."roles";
  END IF;
END $$;

CREATE POLICY "tenant_isolation_roles" ON "auth"."roles"
  USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
  WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);

-- Update auth.role_permissions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'role_permissions' AND policyname = 'tenant_isolation_role_permissions'
  ) THEN
    DROP POLICY IF EXISTS "tenant_isolation_role_permissions" ON "auth"."role_permissions";
  END IF;
END $$;

CREATE POLICY "tenant_isolation_role_permissions" ON "auth"."role_permissions"
  USING (
    EXISTS (
      SELECT 1
      FROM "auth"."roles" AS "roles"
      WHERE "roles"."id" = "role_id"
        AND ("roles"."tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "auth"."roles" AS "roles"
      WHERE "roles"."id" = "role_id"
        AND ("roles"."tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
    )
  );

-- Update auth.user_roles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'user_roles' AND policyname = 'tenant_isolation_user_roles'
  ) THEN
    DROP POLICY IF EXISTS "tenant_isolation_user_roles" ON "auth"."user_roles";
  END IF;
END $$;

CREATE POLICY "tenant_isolation_user_roles" ON "auth"."user_roles"
  USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
  WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);

-- Update auth.sso_connections
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'sso_connections' AND policyname = 'tenant_isolation_sso_connections'
  ) THEN
    DROP POLICY IF EXISTS "tenant_isolation_sso_connections" ON "auth"."sso_connections";
  END IF;
END $$;

CREATE POLICY "tenant_isolation_sso_connections" ON "auth"."sso_connections"
  USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
  WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);

-- Update auth.user_profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'user_profiles' AND policyname = 'tenant_isolation_user_profiles'
  ) THEN
    DROP POLICY IF EXISTS "tenant_isolation_user_profiles" ON "auth"."user_profiles";
  END IF;
END $$;

CREATE POLICY "tenant_isolation_user_profiles" ON "auth"."user_profiles"
  USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
  WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);

-- Update auth.webauthn_credentials
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'webauthn_credentials' AND policyname = 'tenant_isolation_webauthn_credentials'
  ) THEN
    DROP POLICY IF EXISTS "tenant_isolation_webauthn_credentials" ON "auth"."webauthn_credentials";
  END IF;
END $$;

CREATE POLICY "tenant_isolation_webauthn_credentials" ON "auth"."webauthn_credentials"
  USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
  WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);

-- Update auth.mfa_credentials
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'mfa_credentials' AND policyname = 'tenant_isolation_mfa_credentials'
  ) THEN
    DROP POLICY IF EXISTS "tenant_isolation_mfa_credentials" ON "auth"."mfa_credentials";
  END IF;
END $$;

CREATE POLICY "tenant_isolation_mfa_credentials" ON "auth"."mfa_credentials"
  USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
  WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);

-- Update auth.backup_codes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'backup_codes' AND policyname = 'tenant_isolation_backup_codes'
  ) THEN
    DROP POLICY IF EXISTS "tenant_isolation_backup_codes" ON "auth"."backup_codes";
  END IF;
END $$;

CREATE POLICY "tenant_isolation_backup_codes" ON "auth"."backup_codes"
  USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
  WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);

-- Update ai.prompt_templates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'ai' AND tablename = 'prompt_templates' AND policyname = 'tenant_isolation_prompt_templates'
  ) THEN
    DROP POLICY IF EXISTS "tenant_isolation_prompt_templates" ON "ai"."prompt_templates";
  END IF;
END $$;

CREATE POLICY "tenant_isolation_prompt_templates" ON "ai"."prompt_templates"
  USING ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true)
  WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR "auth"."is_super_admin"() = true);
