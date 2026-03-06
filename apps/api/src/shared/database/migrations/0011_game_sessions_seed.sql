-- Add seed column to game_sessions for deterministic RNG
-- Issue #133: M2-03 Implement deterministic RNG system

ALTER TABLE game_sessions ADD COLUMN seed BIGINT NOT NULL DEFAULT 0;

-- Index for seed lookups (useful for session recovery by seed)
CREATE INDEX IF NOT EXISTS game_sessions_seed_idx ON game_sessions(seed);
