-- Migration: 0035_audit_log_enhanced
-- Description: Add enhanced audit log fields for enterprise compliance
--
-- Adds:
-- - user_email: denormalized email for reporting
-- - correlation_id: request correlation for tracing
-- - user_agent: client user agent (truncated)
-- - legal_hold: prevents auto-deletion when set

-- Add new columns to audit.logs table
ALTER TABLE "audit"."logs" ADD COLUMN IF NOT EXISTS "user_email" varchar(255);
ALTER TABLE "audit"."logs" ADD COLUMN IF NOT EXISTS "correlation_id" uuid;
ALTER TABLE "audit"."logs" ADD COLUMN IF NOT EXISTS "user_agent" varchar(512);

-- Add legal_hold to retention_config
ALTER TABLE "audit"."retention_config" ADD COLUMN IF NOT EXISTS "legal_hold" integer NOT NULL DEFAULT 0;

-- Comments for new columns
COMMENT ON COLUMN "audit"."logs"."user_email" IS 'Denormalized user email for reporting performance';
COMMENT ON COLUMN "audit"."logs"."correlation_id" IS 'Request correlation ID for tracing across services';
COMMENT ON COLUMN "audit"."logs"."user_agent" IS 'Client user agent string (truncated to 512 chars)';
COMMENT ON COLUMN "audit"."retention_config"."legal_hold" IS 'When set to 1, prevents automatic deletion of audit logs';

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_user_email_idx" ON "audit"."logs" ("tenant_id", "user_email");
CREATE INDEX IF NOT EXISTS "audit_logs_tenant_correlation_idx" ON "audit"."logs" ("tenant_id", "correlation_id");
