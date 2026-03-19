-- Migration: 0039_quick_signals
-- Description: Create quick_signal_template and player_quick_signal_usage tables
--
-- Creates:
-- - social.quick_signal_template (predefined signal catalog)
-- - social.player_quick_signal_usage (signal usage tracking)
--
-- Required by Issue #243: M10-04 Quick Signals - Predefined Phrase System

-- Create quick_signal_template table
CREATE TABLE IF NOT EXISTS "social"."quick_signal_template" (
  "template_id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "signal_key" varchar(50) NOT NULL UNIQUE,
  "category" varchar(20) NOT NULL,
  "icon" varchar(10) NOT NULL,
  "label" varchar(50) NOT NULL,
  "description" varchar(200) NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true
);

-- Create player_quick_signal_usage table
CREATE TABLE IF NOT EXISTS "social"."player_quick_signal_usage" (
  "usage_id" uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  "player_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE RESTRICT,
  "session_id" uuid,
  "signal_key" varchar(50) NOT NULL,
  "target_player_id" uuid,
  "sent_at" timestamp with time zone NOT NULL DEFAULT now(),
  "context" jsonb NOT NULL DEFAULT '{}'
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "quick_signal_template_category_idx" ON "social"."quick_signal_template" USING btree ("category");
CREATE INDEX IF NOT EXISTS "quick_signal_template_is_active_idx" ON "social"."quick_signal_template" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "quick_signal_usage_player_sent_idx" ON "social"."player_quick_signal_usage" USING btree ("player_id", "sent_at");
CREATE INDEX IF NOT EXISTS "quick_signal_usage_session_sent_idx" ON "social"."player_quick_signal_usage" USING btree ("session_id", "sent_at");
CREATE INDEX IF NOT EXISTS "quick_signal_usage_tenant_idx" ON "social"."player_quick_signal_usage" USING btree ("tenant_id");

-- Enable RLS on player_quick_signal_usage only (quick_signal_template is globally shared, no RLS needed)
ALTER TABLE "social"."player_quick_signal_usage" ENABLE ROW LEVEL SECURITY;

-- RLS policy for tenant isolation on player_quick_signal_usage
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

-- Seed templates (17 signals)
INSERT INTO "social"."quick_signal_template" ("signal_key", "category", "icon", "label", "description", "sort_order") VALUES
  -- Decision
  ('signal.approve', 'decision', '✅', 'APPROVE', 'Recommend approving this request', 1),
  ('signal.deny', 'decision', '❌', 'DENY', 'Recommend denying this request', 2),
  ('signal.flag', 'decision', '🚩', 'FLAG', 'Flag for additional review', 3),
  ('signal.verify', 'decision', '🔍', 'VERIFY', 'Request verification packet', 4),
  ('signal.unsure', 'decision', '❓', 'UNSURE', 'Not enough information to decide', 5),
  -- Urgency
  ('signal.urgent', 'urgency', '⚡', 'URGENT', 'Time-sensitive, needs immediate attention', 1),
  ('signal.wait', 'urgency', '⏳', 'WAIT', 'Hold off, investigating something', 2),
  ('signal.clear', 'urgency', '✔️', 'CLEAR', 'This one looks clean', 3),
  ('signal.suspicious', 'urgency', '⚠️', 'SUSPICIOUS', 'Something feels off about this', 4),
  -- Coordination
  ('signal.coordinating', 'coordination', '🔄', 'COORDINATING', 'I am handling this, stay back', 1),
  ('signal.backup', 'coordination', '🆘', 'BACKUP', 'Need help on this one', 2),
  ('signal.done', 'coordination', '✅', 'DONE', 'Finished my part', 3),
  ('signal.ready', 'coordination', '👍', 'READY', 'Ready to proceed', 4),
  -- Resource
  ('signal.low_power', 'resource', '🔋', 'LOW_POWER', 'Power resources low', 1),
  ('signal.low_cooling', 'resource', '❄️', 'LOW_COOLING', 'Cooling capacity low', 2),
  ('signal.bandwidth_ok', 'resource', '📶', 'BANDWIDTH_OK', 'Bandwidth is stable', 3),
  ('signal.space_low', 'resource', '📉', 'SPACE_LOW', 'Rack space running out', 4)
ON CONFLICT (signal_key) DO NOTHING;

-- Seed feature flag for quick signals
INSERT INTO "feature_flags"."flags" ("tenant_id", "name", "description", "key", "enabled_by_default", "rollout_percentage", "is_active")
SELECT 
    t.tenant_id,
    'Quick Signals System',
    'Enable quick signals for in-session communication',
    'social.quick_signals_enabled',
    false,
    100,
    true
FROM tenants t
WHERE t.status = 'active'
ON CONFLICT (tenant_id, key) DO NOTHING;