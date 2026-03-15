-- Migration: 0020_analytics_module
-- Description: Create analytics module tables for event ingestion and player profiles
-- Created: 2026-03-15

-- Create analytics schema
CREATE SCHEMA IF NOT EXISTS analytics;

-- Analytics events table with monthly partitioning
CREATE TABLE analytics.events (
    event_id UUID PRIMARY KEY,
    correlation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    session_id UUID,
    event_name VARCHAR(128) NOT NULL,
    event_version INT NOT NULL DEFAULT 1,
    event_time TIMESTAMPTZ NOT NULL,
    source VARCHAR(64) NOT NULL,
    environment VARCHAR(32) NOT NULL DEFAULT 'development',
    event_properties JSONB NOT NULL DEFAULT '{}',
    device_info JSONB,
    geo_info JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (date_trunc('month', event_time));

-- Create indexes for analytics.events
CREATE INDEX analytics_events_tenant_idx ON analytics.events (tenant_id);
CREATE INDEX analytics_events_event_name_idx ON analytics.events (event_name);
CREATE INDEX analytics_events_user_idx ON analytics.events (user_id);
CREATE INDEX analytics_events_created_at_idx ON analytics.events (created_at);
CREATE INDEX analytics_events_session_idx ON analytics.events (session_id);

-- Player profiles table for competency tracking
CREATE TABLE analytics.player_profiles (
    user_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    total_sessions INT NOT NULL DEFAULT 0,
    total_days_played INT NOT NULL DEFAULT 0,
    phishing_detection_rate REAL NOT NULL DEFAULT 0.5,
    false_positive_rate REAL NOT NULL DEFAULT 0.5,
    avg_decision_time_seconds REAL,
    indicator_proficiency JSONB NOT NULL DEFAULT '{}',
    competency_scores JSONB NOT NULL DEFAULT '{}',
    skill_rating INT NOT NULL DEFAULT 1000,
    last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for analytics.player_profiles
CREATE INDEX analytics_player_profiles_tenant_idx ON analytics.player_profiles (tenant_id);
CREATE INDEX analytics_player_profiles_skill_rating_idx ON analytics.player_profiles (skill_rating DESC);

-- Dead-letter queue for failed events
CREATE TABLE analytics.dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_event JSONB NOT NULL,
    error_message TEXT NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID NOT NULL
);

-- Create index for dead-letter queue
CREATE INDEX analytics_dlq_tenant_idx ON analytics.dead_letter_queue (tenant_id);
CREATE INDEX analytics_dlq_created_idx ON analytics.dead_letter_queue (created_at);

-- Analytics metrics table for monitoring
CREATE TABLE analytics.metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(128) NOT NULL,
    metric_value JSONB NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID
);

-- Create index for metrics
CREATE INDEX analytics_metrics_name_idx ON analytics.metrics (metric_name);
CREATE INDEX analytics_metrics_recorded_idx ON analytics.metrics (recorded_at);
CREATE INDEX analytics_metrics_tenant_idx ON analytics.metrics (tenant_id);

-- Create monthly partitions for analytics.events
CREATE TABLE analytics.events_2026_03 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE analytics.events_2026_04 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE analytics.events_2026_05 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Add comments
COMMENT ON TABLE analytics.events IS 'Analytics event store with monthly partitioning';
COMMENT ON TABLE analytics.player_profiles IS 'Player skill profiles with 7-domain competency tracking';
COMMENT ON TABLE analytics.dead_letter_queue IS 'Dead-letter queue for failed analytics events';
COMMENT ON TABLE analytics.metrics IS 'Analytics module metrics for monitoring';
