-- Economy Domain v1 Migration
-- Issue #140: M2-10: Implement economy domain v1 with credits, trust score, and intel fragments

-- 1. Add economy columns to game_sessions table
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 50;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS intel_fragments INTEGER NOT NULL DEFAULT 0;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS player_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS player_xp INTEGER NOT NULL DEFAULT 0;

-- Indexes for economy columns
CREATE INDEX IF NOT EXISTS game_sessions_trust_score_idx ON game_sessions(trust_score);
CREATE INDEX IF NOT EXISTS game_sessions_player_level_idx ON game_sessions(player_level);

-- 2. Create economy_transactions table for immutable audit log
CREATE TABLE IF NOT EXISTS economy_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE RESTRICT,
    currency VARCHAR(16) NOT NULL CHECK (currency IN ('credits', 'trust', 'intel')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    reason VARCHAR(128) NOT NULL,
    context JSONB DEFAULT '{}',
    related_entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for economy_transactions
CREATE INDEX IF NOT EXISTS economy_transactions_session_idx ON economy_transactions(session_id);
CREATE INDEX IF NOT EXISTS economy_transactions_user_idx ON economy_transactions(user_id);
CREATE INDEX IF NOT EXISTS economy_transactions_tenant_idx ON economy_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS economy_transactions_currency_idx ON economy_transactions(currency);
CREATE INDEX IF NOT EXISTS economy_transactions_reason_idx ON economy_transactions(reason);
CREATE INDEX IF NOT EXISTS economy_transactions_created_idx ON economy_transactions(created_at);
