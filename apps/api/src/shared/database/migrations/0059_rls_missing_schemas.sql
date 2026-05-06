-- Migration: 0059_rls_missing_schemas
-- Description: Add Row Level Security (RLS) policies to tables across 6 schemas
-- that were missing tenant isolation despite having tenant_id columns.
--
-- Schemas covered:
--   social       (20 tables)
--   multiplayer  (2 tables)
--   billing      (5 tables)
--   feature_flags (3 tables)
--   lrs          (4 tables)
--   lti          (5 tables)
--   audit        (2 tables)
--
-- Tables without tenant_id are intentionally excluded:
--   social.achievement_icon, social.endorsement_tags, social.endorsement_decay,
--   social.leaderboard, social.chat_message, content.avatars,
--   multiplayer.party_member, multiplayer.coop_decision_proposal,
--   multiplayer.coop_incident_response, multiplayer.coop_role_assignment,
--   multiplayer.coop_scenario, billing.plans, billing.webhook_events,
--   lti.lti_nonces, lti.lti_states
--
-- Uses the same idempotent pattern as migration 0021_row_level_security_policies.

-- ============================================================================
-- SOCIAL SCHEMA
-- ============================================================================

-- Enable RLS on social.achievement_definitions
ALTER TABLE "social"."achievement_definitions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'achievement_definitions' AND policyname = 'tenant_isolation_achievement_definitions'
  ) THEN
    CREATE POLICY "tenant_isolation_achievement_definitions" ON "social"."achievement_definitions"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."achievement_definitions" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.player_profiles
ALTER TABLE "social"."player_profiles" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'player_profiles' AND policyname = 'tenant_isolation_player_profiles'
  ) THEN
    CREATE POLICY "tenant_isolation_player_profiles" ON "social"."player_profiles"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."player_profiles" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.social_relationship
ALTER TABLE "social"."social_relationship" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'social_relationship' AND policyname = 'tenant_isolation_social_relationship'
  ) THEN
    CREATE POLICY "tenant_isolation_social_relationship" ON "social"."social_relationship"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."social_relationship" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.presence
ALTER TABLE "social"."presence" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'presence' AND policyname = 'tenant_isolation_presence'
  ) THEN
    CREATE POLICY "tenant_isolation_presence" ON "social"."presence"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."presence" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.quick_signal_template
ALTER TABLE "social"."quick_signal_template" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'quick_signal_template' AND policyname = 'tenant_isolation_quick_signal_template'
  ) THEN
    CREATE POLICY "tenant_isolation_quick_signal_template" ON "social"."quick_signal_template"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."quick_signal_template" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.player_quick_signal_usage
ALTER TABLE "social"."player_quick_signal_usage" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'player_quick_signal_usage' AND policyname = 'tenant_isolation_player_quick_signal_usage'
  ) THEN
    CREATE POLICY "tenant_isolation_player_quick_signal_usage" ON "social"."player_quick_signal_usage"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."player_quick_signal_usage" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.leaderboard_entry
ALTER TABLE "social"."leaderboard_entry" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'leaderboard_entry' AND policyname = 'tenant_isolation_leaderboard_entry'
  ) THEN
    CREATE POLICY "tenant_isolation_leaderboard_entry" ON "social"."leaderboard_entry"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."leaderboard_entry" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.enterprise_leaderboard
ALTER TABLE "social"."enterprise_leaderboard" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'enterprise_leaderboard' AND policyname = 'tenant_isolation_enterprise_leaderboard'
  ) THEN
    CREATE POLICY "tenant_isolation_enterprise_leaderboard" ON "social"."enterprise_leaderboard"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."enterprise_leaderboard" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.leaderboard_score
ALTER TABLE "social"."leaderboard_score" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'leaderboard_score' AND policyname = 'tenant_isolation_leaderboard_score'
  ) THEN
    CREATE POLICY "tenant_isolation_leaderboard_score" ON "social"."leaderboard_score"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."leaderboard_score" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.tenant_avatar_restrictions
ALTER TABLE "social"."tenant_avatar_restrictions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'tenant_avatar_restrictions' AND policyname = 'tenant_isolation_tenant_avatar_restrictions'
  ) THEN
    CREATE POLICY "tenant_isolation_tenant_avatar_restrictions" ON "social"."tenant_avatar_restrictions"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."tenant_avatar_restrictions" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.player_achievements
ALTER TABLE "social"."player_achievements" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'player_achievements' AND policyname = 'tenant_isolation_player_achievements'
  ) THEN
    CREATE POLICY "tenant_isolation_player_achievements" ON "social"."player_achievements"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."player_achievements" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.endorsement
ALTER TABLE "social"."endorsement" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'endorsement' AND policyname = 'tenant_isolation_endorsement'
  ) THEN
    CREATE POLICY "tenant_isolation_endorsement" ON "social"."endorsement"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."endorsement" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.reputation_score
ALTER TABLE "social"."reputation_score" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'reputation_score' AND policyname = 'tenant_isolation_reputation_score'
  ) THEN
    CREATE POLICY "tenant_isolation_reputation_score" ON "social"."reputation_score"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."reputation_score" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.reputation_history
ALTER TABLE "social"."reputation_history" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'reputation_history' AND policyname = 'tenant_isolation_reputation_history'
  ) THEN
    CREATE POLICY "tenant_isolation_reputation_history" ON "social"."reputation_history"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."reputation_history" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.moderation_blocklist
ALTER TABLE "social"."moderation_blocklist" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'moderation_blocklist' AND policyname = 'tenant_isolation_moderation_blocklist'
  ) THEN
    CREATE POLICY "tenant_isolation_moderation_blocklist" ON "social"."moderation_blocklist"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."moderation_blocklist" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.moderation_report
ALTER TABLE "social"."moderation_report" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'moderation_report' AND policyname = 'tenant_isolation_moderation_report'
  ) THEN
    CREATE POLICY "tenant_isolation_moderation_report" ON "social"."moderation_report"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."moderation_report" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.moderation_action
ALTER TABLE "social"."moderation_action" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'moderation_action' AND policyname = 'tenant_isolation_moderation_action'
  ) THEN
    CREATE POLICY "tenant_isolation_moderation_action" ON "social"."moderation_action"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."moderation_action" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.rate_limit_config
ALTER TABLE "social"."rate_limit_config" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'rate_limit_config' AND policyname = 'tenant_isolation_rate_limit_config'
  ) THEN
    CREATE POLICY "tenant_isolation_rate_limit_config" ON "social"."rate_limit_config"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."rate_limit_config" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.player_consent
ALTER TABLE "social"."player_consent" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'player_consent' AND policyname = 'tenant_isolation_player_consent'
  ) THEN
    CREATE POLICY "tenant_isolation_player_consent" ON "social"."player_consent"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."player_consent" FORCE ROW LEVEL SECURITY;

-- Enable RLS on social.chat_channel
ALTER TABLE "social"."chat_channel" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'social' AND tablename = 'chat_channel' AND policyname = 'tenant_isolation_chat_channel'
  ) THEN
    CREATE POLICY "tenant_isolation_chat_channel" ON "social"."chat_channel"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "social"."chat_channel" FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- MULTIPLAYER SCHEMA
-- ============================================================================

-- Enable RLS on multiplayer.party
ALTER TABLE "multiplayer"."party" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'multiplayer' AND tablename = 'party' AND policyname = 'tenant_isolation_party'
  ) THEN
    CREATE POLICY "tenant_isolation_party" ON "multiplayer"."party"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "multiplayer"."party" FORCE ROW LEVEL SECURITY;

-- Enable RLS on multiplayer.coop_session
ALTER TABLE "multiplayer"."coop_session" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'multiplayer' AND tablename = 'coop_session' AND policyname = 'tenant_isolation_coop_session'
  ) THEN
    CREATE POLICY "tenant_isolation_coop_session" ON "multiplayer"."coop_session"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "multiplayer"."coop_session" FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- BILLING SCHEMA
-- ============================================================================

-- Enable RLS on billing.subscriptions
ALTER TABLE "billing"."subscriptions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'billing' AND tablename = 'subscriptions' AND policyname = 'tenant_isolation_subscriptions'
  ) THEN
    CREATE POLICY "tenant_isolation_subscriptions" ON "billing"."subscriptions"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "billing"."subscriptions" FORCE ROW LEVEL SECURITY;

-- Enable RLS on billing.seats
ALTER TABLE "billing"."seats" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'billing' AND tablename = 'seats' AND policyname = 'tenant_isolation_seats'
  ) THEN
    CREATE POLICY "tenant_isolation_seats" ON "billing"."seats"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "billing"."seats" FORCE ROW LEVEL SECURITY;

-- Enable RLS on billing.seat_history
ALTER TABLE "billing"."seat_history" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'billing' AND tablename = 'seat_history' AND policyname = 'tenant_isolation_seat_history'
  ) THEN
    CREATE POLICY "tenant_isolation_seat_history" ON "billing"."seat_history"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "billing"."seat_history" FORCE ROW LEVEL SECURITY;

-- Enable RLS on billing.stripe_customers
ALTER TABLE "billing"."stripe_customers" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'billing' AND tablename = 'stripe_customers' AND policyname = 'tenant_isolation_stripe_customers'
  ) THEN
    CREATE POLICY "tenant_isolation_stripe_customers" ON "billing"."stripe_customers"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "billing"."stripe_customers" FORCE ROW LEVEL SECURITY;

-- Enable RLS on billing.invoices
ALTER TABLE "billing"."invoices" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'billing' AND tablename = 'invoices' AND policyname = 'tenant_isolation_invoices'
  ) THEN
    CREATE POLICY "tenant_isolation_invoices" ON "billing"."invoices"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "billing"."invoices" FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- FEATURE_FLAGS SCHEMA
-- ============================================================================

-- Enable RLS on feature_flags.flags
ALTER TABLE "feature_flags"."flags" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'feature_flags' AND tablename = 'flags' AND policyname = 'tenant_isolation_flags'
  ) THEN
    CREATE POLICY "tenant_isolation_flags" ON "feature_flags"."flags"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "feature_flags"."flags" FORCE ROW LEVEL SECURITY;

-- Enable RLS on feature_flags.tenant_overrides
ALTER TABLE "feature_flags"."tenant_overrides" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'feature_flags' AND tablename = 'tenant_overrides' AND policyname = 'tenant_isolation_tenant_overrides'
  ) THEN
    CREATE POLICY "tenant_isolation_tenant_overrides" ON "feature_flags"."tenant_overrides"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "feature_flags"."tenant_overrides" FORCE ROW LEVEL SECURITY;

-- Enable RLS on feature_flags.ab_test_assignments
ALTER TABLE "feature_flags"."ab_test_assignments" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'feature_flags' AND tablename = 'ab_test_assignments' AND policyname = 'tenant_isolation_ab_test_assignments'
  ) THEN
    CREATE POLICY "tenant_isolation_ab_test_assignments" ON "feature_flags"."ab_test_assignments"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "feature_flags"."ab_test_assignments" FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- LRS SCHEMA
-- ============================================================================

-- Enable RLS on lrs.scorm_packages
ALTER TABLE "lrs"."scorm_packages" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'lrs' AND tablename = 'scorm_packages' AND policyname = 'tenant_isolation_scorm_packages'
  ) THEN
    CREATE POLICY "tenant_isolation_scorm_packages" ON "lrs"."scorm_packages"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "lrs"."scorm_packages" FORCE ROW LEVEL SECURITY;

-- Enable RLS on lrs.scorm_registrations
ALTER TABLE "lrs"."scorm_registrations" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'lrs' AND tablename = 'scorm_registrations' AND policyname = 'tenant_isolation_scorm_registrations'
  ) THEN
    CREATE POLICY "tenant_isolation_scorm_registrations" ON "lrs"."scorm_registrations"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "lrs"."scorm_registrations" FORCE ROW LEVEL SECURITY;

-- Enable RLS on lrs.xapi_statements
ALTER TABLE "lrs"."xapi_statements" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'lrs' AND tablename = 'xapi_statements' AND policyname = 'tenant_isolation_xapi_statements'
  ) THEN
    CREATE POLICY "tenant_isolation_xapi_statements" ON "lrs"."xapi_statements"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "lrs"."xapi_statements" FORCE ROW LEVEL SECURITY;

-- Enable RLS on lrs.xapi_lrs_config
ALTER TABLE "lrs"."xapi_lrs_config" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'lrs' AND tablename = 'xapi_lrs_config' AND policyname = 'tenant_isolation_xapi_lrs_config'
  ) THEN
    CREATE POLICY "tenant_isolation_xapi_lrs_config" ON "lrs"."xapi_lrs_config"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "lrs"."xapi_lrs_config" FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- LTI SCHEMA
-- ============================================================================

-- Enable RLS on lti.lti_platforms
ALTER TABLE "lti"."lti_platforms" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'lti' AND tablename = 'lti_platforms' AND policyname = 'tenant_isolation_lti_platforms'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_platforms" ON "lti"."lti_platforms"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "lti"."lti_platforms" FORCE ROW LEVEL SECURITY;

-- Enable RLS on lti.lti_deep_link_content
ALTER TABLE "lti"."lti_deep_link_content" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'lti' AND tablename = 'lti_deep_link_content' AND policyname = 'tenant_isolation_lti_deep_link_content'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_deep_link_content" ON "lti"."lti_deep_link_content"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "lti"."lti_deep_link_content" FORCE ROW LEVEL SECURITY;

-- Enable RLS on lti.lti_line_items
ALTER TABLE "lti"."lti_line_items" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'lti' AND tablename = 'lti_line_items' AND policyname = 'tenant_isolation_lti_line_items'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_line_items" ON "lti"."lti_line_items"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "lti"."lti_line_items" FORCE ROW LEVEL SECURITY;

-- Enable RLS on lti.lti_scores
ALTER TABLE "lti"."lti_scores" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'lti' AND tablename = 'lti_scores' AND policyname = 'tenant_isolation_lti_scores'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_scores" ON "lti"."lti_scores"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "lti"."lti_scores" FORCE ROW LEVEL SECURITY;

-- Enable RLS on lti.lti_sessions
ALTER TABLE "lti"."lti_sessions" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'lti' AND tablename = 'lti_sessions' AND policyname = 'tenant_isolation_lti_sessions'
  ) THEN
    CREATE POLICY "tenant_isolation_lti_sessions" ON "lti"."lti_sessions"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "lti"."lti_sessions" FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- AUDIT SCHEMA
-- ============================================================================

-- Enable RLS on audit.logs
ALTER TABLE "audit"."logs" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'audit' AND tablename = 'logs' AND policyname = 'tenant_isolation_audit_logs'
  ) THEN
    CREATE POLICY "tenant_isolation_audit_logs" ON "audit"."logs"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "audit"."logs" FORCE ROW LEVEL SECURITY;

-- Enable RLS on audit.retention_config
ALTER TABLE "audit"."retention_config" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'audit' AND tablename = 'retention_config' AND policyname = 'tenant_isolation_retention_config'
  ) THEN
    CREATE POLICY "tenant_isolation_retention_config" ON "audit"."retention_config"
      USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');
  END IF;
END $$;

ALTER TABLE "audit"."retention_config" FORCE ROW LEVEL SECURITY;
