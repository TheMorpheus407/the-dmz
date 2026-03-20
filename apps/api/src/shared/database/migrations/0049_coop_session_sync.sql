-- Migration: 0049_coop_session_sync
-- Description: Add co-op state synchronization fields for Issue #258: Co-op State Synchronization
--
-- Adds:
-- - session_seq: monotonic sequence counter for lock-free optimistic concurrency
-- - last_snapshot_seq: last snapshot sequence for recovery
-- - last_snapshot_at: snapshot timestamp
--
-- Required by Issue #258: M13-01: Co-op State Synchronization

ALTER TABLE "multiplayer"."coop_session"
ADD COLUMN IF NOT EXISTS "session_seq" bigint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_snapshot_seq" bigint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "last_snapshot_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "coop_session_seq_idx" 
    ON "multiplayer"."coop_session" USING btree ("session_seq");

CREATE INDEX IF NOT EXISTS "coop_session_tenant_seq_idx" 
    ON "multiplayer"."coop_session" USING btree ("tenant_id", "session_seq");