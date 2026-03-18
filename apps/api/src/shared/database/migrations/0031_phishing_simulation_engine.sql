-- Migration: 0031_phishing_simulation_engine.sql
-- Description: Phishing simulation campaign engine (v1) for enterprise tenants
-- Created: 2026-03-18

-- Phishing Simulations table
CREATE TABLE IF NOT EXISTS training.phishing_simulations (
    simulation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(65535),
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    template_id UUID,
    difficulty_tier INTEGER NOT NULL DEFAULT 1,
    urgency_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    reply_to VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    include_attachment BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_name VARCHAR(255),
    tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    teachable_moment_id UUID,
    scheduled_start_date TIMESTAMPTZ,
    scheduled_end_date TIMESTAMPTZ,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS phishing_simulations_tenant_idx ON training.phishing_simulations(tenant_id);
CREATE INDEX IF NOT EXISTS phishing_simulations_status_idx ON training.phishing_simulations(status);
CREATE INDEX IF NOT EXISTS phishing_simulations_template_idx ON training.phishing_simulations(template_id);
CREATE INDEX IF NOT EXISTS phishing_simulations_created_by_idx ON training.phishing_simulations(created_by);
CREATE INDEX IF NOT EXISTS phishing_simulations_scheduled_start_idx ON training.phishing_simulations(scheduled_start_date);

COMMENT ON TABLE training.phishing_simulations IS 'Phishing simulation campaigns for enterprise security awareness training';

-- Phishing Simulation Templates table
CREATE TABLE IF NOT EXISTS training.phishing_simulation_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(65535),
    category VARCHAR(100),
    difficulty_tier INTEGER NOT NULL DEFAULT 1,
    urgency_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    reply_to VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    merge_tags JSONB NOT NULL DEFAULT '[]',
    include_attachment BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_name VARCHAR(255),
    indicator_hints JSONB NOT NULL DEFAULT '[]',
    teachable_moment_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_built_in BOOLEAN NOT NULL DEFAULT FALSE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS phishing_simulation_templates_tenant_idx ON training.phishing_simulation_templates(tenant_id);
CREATE INDEX IF NOT EXISTS phishing_simulation_templates_category_idx ON training.phishing_simulation_templates(category);
CREATE INDEX IF NOT EXISTS phishing_simulation_templates_difficulty_idx ON training.phishing_simulation_templates(difficulty_tier);
CREATE INDEX IF NOT EXISTS phishing_simulation_templates_active_idx ON training.phishing_simulation_templates(is_active);

COMMENT ON TABLE training.phishing_simulation_templates IS 'Phishing simulation templates for reusable scenarios';

-- Phishing Simulation Audience table
CREATE TABLE IF NOT EXISTS training.phishing_simulation_audience (
    audience_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL,
    group_ids JSONB NOT NULL DEFAULT '[]',
    departments JSONB NOT NULL DEFAULT '[]',
    locations JSONB NOT NULL DEFAULT '[]',
    roles JSONB NOT NULL DEFAULT '[]',
    attribute_filters JSONB NOT NULL DEFAULT '{}',
    target_user_count INTEGER,
    enrolled_user_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS phishing_simulation_audience_simulation_idx ON training.phishing_simulation_audience(simulation_id);

COMMENT ON TABLE training.phishing_simulation_audience IS 'Target audience configuration for phishing simulations';

-- Phishing Simulation Results table
CREATE TABLE IF NOT EXISTS training.phishing_simulation_results (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    email_delivered BOOLEAN NOT NULL DEFAULT FALSE,
    email_opened BOOLEAN NOT NULL DEFAULT FALSE,
    link_clicked BOOLEAN NOT NULL DEFAULT FALSE,
    clicked_at TIMESTAMPTZ,
    time_to_click_seconds INTEGER,
    reported BOOLEAN NOT NULL DEFAULT FALSE,
    reported_at TIMESTAMPTZ,
    time_to_report_seconds INTEGER,
    attachment_opened BOOLEAN NOT NULL DEFAULT FALSE,
    attachment_opened_at TIMESTAMPTZ,
    simulation_outcome VARCHAR(32),
    teachable_moment_viewed BOOLEAN NOT NULL DEFAULT FALSE,
    teachable_moment_viewed_at TIMESTAMPTZ,
    enrolled_in_micro_training BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(simulation_id, user_id)
);

CREATE INDEX IF NOT EXISTS phishing_simulation_results_simulation_idx ON training.phishing_simulation_results(simulation_id);
CREATE INDEX IF NOT EXISTS phishing_simulation_results_user_idx ON training.phishing_simulation_results(user_id);
CREATE INDEX IF NOT EXISTS phishing_simulation_results_outcome_idx ON training.phishing_simulation_results(simulation_outcome);

COMMENT ON TABLE training.phishing_simulation_results IS 'Individual user results for phishing simulations';

-- Phishing Teachable Moments table
CREATE TABLE IF NOT EXISTS training.phishing_teachable_moments (
    moment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    indicator_type VARCHAR(100),
    educational_content TEXT NOT NULL,
    what_to_do_instead TEXT NOT NULL,
    micro_training_course_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS phishing_teachable_moments_tenant_idx ON training.phishing_teachable_moments(tenant_id);
CREATE INDEX IF NOT EXISTS phishing_teachable_moments_indicator_idx ON training.phishing_teachable_moments(indicator_type);
CREATE INDEX IF NOT EXISTS phishing_teachable_moments_active_idx ON training.phishing_teachable_moments(is_active);

COMMENT ON TABLE training.phishing_teachable_moments IS 'Teachable moment configurations for phishing simulation failures';

-- Phishing Simulation Events table (audit trail)
CREATE TABLE IF NOT EXISTS training.phishing_simulation_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS phishing_simulation_events_simulation_idx ON training.phishing_simulation_events(simulation_id);
CREATE INDEX IF NOT EXISTS phishing_simulation_events_user_idx ON training.phishing_simulation_events(user_id);
CREATE INDEX IF NOT EXISTS phishing_simulation_events_type_idx ON training.phishing_simulation_events(event_type);
CREATE INDEX IF NOT EXISTS phishing_simulation_events_created_idx ON training.phishing_simulation_events(created_at);

COMMENT ON TABLE training.phishing_simulation_events IS 'Event log for phishing simulation tracking and audit';

-- Insert default built-in templates
INSERT INTO training.phishing_simulation_templates (
    template_id,
    tenant_id,
    name,
    description,
    category,
    difficulty_tier,
    urgency_level,
    sender_name,
    sender_email,
    subject,
    body,
    indicator_hints,
    is_active,
    is_built_in
) VALUES 
    (gen_random_uuid(), NULL, 'Password Reset Urgent', 'Fake password reset email with urgency tactics', 'Account Security', 1, 'high', 'IT Support', 'support@company-security.com', 'URGENT: Your password expires in 24 hours', 'Your password will expire in 24 hours. Click here to reset it immediately to avoid losing access to your account.', '["urgent_language", "suspicious_sender", "generic_greeting"]', TRUE, TRUE),
    (gen_random_uuid(), NULL, 'Package Delivery Notification', 'Fake delivery notification requiring personal info', 'Delivery', 2, 'medium', 'FedEx Delivery', 'tracking@fedex-delivery-notice.com', 'Your package could not be delivered', 'We attempted to deliver your package but no one was available. Please confirm your address and payment information to reschedule delivery.', '["suspicious_sender", "requests_personal_info", "attachment_prompt"]', TRUE, TRUE),
    (gen_random_uuid(), NULL, 'CEO Wire Transfer Request', 'Business email compromise attempt', 'Financial', 3, 'high', 'John Smith (CEO)', 'ceo@company-internal.com', 'Urgent Wire Transfer Required', 'I need you to process an urgent wire transfer for a confidential acquisition. Please keep this between us and process immediately. I am in a meeting and cannot discuss.', '["authority_pressure", "secrecy_request", "suspicious_sender_domain"]', TRUE, TRUE),
    (gen_random_uuid(), NULL, 'Shared Document Access', 'Fake sharepoint/Google doc phishing', 'Collaboration', 2, 'low', 'Microsoft SharePoint', 'documents@microsoft-sharepoint.com', 'Document shared with you: Q4 Financial Report', 'John Smith has shared "Q4 Financial Report.xlsx" with you. Click to view the document.', '["impersonation", "suspicious_link", "file_type_hint"]', TRUE, TRUE),
    (gen_random_uuid(), NULL, 'Account Suspension Warning', 'Fake account suspension threat', 'Account Security', 1, 'critical', 'Netflix Support', 'support@netflix-verify.com', 'Your account will be suspended', 'We have detected unusual activity on your account. Your subscription will be suspended in 24 hours unless you verify your payment information.', '["urgency", "threat_language", "suspicious_sender"]', TRUE, TRUE)
ON CONFLICT (template_id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE training.phishing_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.phishing_simulation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.phishing_simulation_audience ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.phishing_simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.phishing_teachable_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.phishing_simulation_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for phishing simulation tables (tenant isolation)
-- Note: RLS policy comments must contain "tenant_isolation" for migration guardrails tests
CREATE POLICY IF NOT EXISTS tenant_isolation_phishing_simulations ON training.phishing_simulations
    USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
    WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY IF NOT EXISTS tenant_isolation_phishing_simulation_templates ON training.phishing_simulation_templates
    USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true' OR "tenant_id" IS NULL)
    WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true' OR "tenant_id" IS NULL);

CREATE POLICY IF NOT EXISTS tenant_isolation_phishing_simulation_audience ON training.phishing_simulation_audience
    USING (simulation_id IN (
        SELECT simulation_id FROM training.phishing_simulations 
        WHERE "tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true'
    ));

CREATE POLICY IF NOT EXISTS tenant_isolation_phishing_simulation_results ON training.phishing_simulation_results
    USING (simulation_id IN (
        SELECT simulation_id FROM training.phishing_simulations 
        WHERE "tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true'
    ));

CREATE POLICY IF NOT EXISTS tenant_isolation_phishing_teachable_moments ON training.phishing_teachable_moments
    USING ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true')
    WITH CHECK ("tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true');

CREATE POLICY IF NOT EXISTS tenant_isolation_phishing_simulation_events ON training.phishing_simulation_events
    USING (simulation_id IN (
        SELECT simulation_id FROM training.phishing_simulations 
        WHERE "tenant_id" = "auth"."current_tenant_id"() OR current_setting('app.is_super_admin', true) = 'true'
    ));
