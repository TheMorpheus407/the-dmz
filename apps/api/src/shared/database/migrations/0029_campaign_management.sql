-- Migration: 0029_campaign_management.sql
-- Description: Create campaign management tables for training programs
-- Issue: #227 - M9-05 Campaign Management v1

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for campaign management
DO $$ BEGIN
    CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE campaign_type AS ENUM ('onboarding', 'quarterly', 'annual', 'event-driven');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE recurrence_pattern AS ENUM ('one-time', 'weekly', 'monthly', 'quarterly', 'annual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE content_type AS ENUM ('module', 'assessment', 'phishing_simulation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM ('not_started', 'in_progress', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Campaign Templates (must come before campaigns due to FK if needed, but we make it independent)
CREATE TABLE IF NOT EXISTS training.campaign_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type campaign_type NOT NULL,
    audience_config JSONB NOT NULL DEFAULT '{}',
    content_config JSONB NOT NULL DEFAULT '{}',
    schedule_config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_templates_tenant ON training.campaign_templates(tenant_id);

-- Campaigns table
CREATE TABLE IF NOT EXISTS training.campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status campaign_status NOT NULL DEFAULT 'draft',
    campaign_type campaign_type NOT NULL,
    created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'UTC',
    recurrence_pattern recurrence_pattern DEFAULT 'one-time',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON training.campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON training.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON training.campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON training.campaigns(created_by);

-- Campaign Audience targeting
CREATE TABLE IF NOT EXISTS training.campaign_audience (
    audience_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    campaign_id UUID NOT NULL REFERENCES training.campaigns(campaign_id) ON DELETE CASCADE,
    group_ids UUID[] DEFAULT '{}',
    departments VARCHAR(128)[] DEFAULT '{}',
    locations VARCHAR(128)[] DEFAULT '{}',
    roles VARCHAR(128)[] DEFAULT '{}',
    attribute_filters JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_audience_campaign ON training.campaign_audience(campaign_id);

-- Campaign Content assignment
CREATE TABLE IF NOT EXISTS training.campaign_content (
    content_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    campaign_id UUID NOT NULL REFERENCES training.campaigns(campaign_id) ON DELETE CASCADE,
    content_type content_type NOT NULL,
    content_item_id UUID NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    due_days INTEGER DEFAULT 7,
    is_prerequisite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_content_campaign ON training.campaign_content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_content_item ON training.campaign_content(content_item_id);

-- Campaign Enrollments (per-user tracking)
CREATE TABLE IF NOT EXISTS training.campaign_enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    campaign_id UUID NOT NULL REFERENCES training.campaigns(campaign_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status enrollment_status NOT NULL DEFAULT 'not_started',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    last_reminder_at TIMESTAMPTZ,
    reminder_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_campaign ON training.campaign_enrollments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_user ON training.campaign_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_enrollments_status ON training.campaign_enrollments(status);

-- Campaign Escalation Settings
CREATE TABLE IF NOT EXISTS training.campaign_escalations (
    escalation_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    campaign_id UUID NOT NULL REFERENCES training.campaigns(campaign_id) ON DELETE CASCADE,
    reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[1, 3, 7],
    manager_notification BOOLEAN NOT NULL DEFAULT TRUE,
    compliance_alert BOOLEAN NOT NULL DEFAULT FALSE,
    compliance_alert_threshold INTEGER DEFAULT 14,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_escalations_campaign ON training.campaign_escalations(campaign_id);

-- Add RLS policies for campaign tables
ALTER TABLE training.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.campaign_audience ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.campaign_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.campaign_escalations ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaigns (tenant isolation)
CREATE POLICY campaigns_tenant_isolation_policy ON training.campaigns
    USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
    WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY campaign_audience_tenant_isolation_policy ON training.campaign_audience
    USING (campaign_id IN (
        SELECT campaign_id FROM training.campaigns 
        WHERE "tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true'
    ));

CREATE POLICY campaign_content_tenant_isolation_policy ON training.campaign_content
    USING (campaign_id IN (
        SELECT campaign_id FROM training.campaigns 
        WHERE "tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true'
    ));

CREATE POLICY campaign_enrollments_tenant_isolation_policy ON training.campaign_enrollments
    USING (campaign_id IN (
        SELECT campaign_id FROM training.campaigns 
        WHERE "tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true'
    ));

CREATE POLICY campaign_templates_tenant_isolation_policy ON training.campaign_templates
    USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
    WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY campaign_escalations_tenant_isolation_policy ON training.campaign_escalations
    USING (campaign_id IN (
        SELECT campaign_id FROM training.campaigns 
        WHERE "tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true'
    ));

-- Add comments for documentation
COMMENT ON TABLE training.campaigns IS 'Training campaigns for onboarding, quarterly, annual, and event-driven training programs';
COMMENT ON TABLE training.campaign_audience IS 'Target audience configuration for campaigns (groups, departments, locations, roles)';
COMMENT ON TABLE training.campaign_content IS 'Training content assigned to campaigns (modules, assessments, phishing simulations)';
COMMENT ON TABLE training.campaign_enrollments IS 'Per-user enrollment and completion tracking for campaigns';
COMMENT ON TABLE training.campaign_templates IS 'Reusable campaign templates for common training programs';
COMMENT ON TABLE training.campaign_escalations IS 'Escalation workflow configuration for campaign reminders and notifications';
