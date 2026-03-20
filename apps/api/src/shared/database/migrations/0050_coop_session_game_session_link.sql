-- Migration: 0050_coop_session_game_session_link
-- Description: Add gameSessionId foreign key column to coop_session for event persistence
--
-- Issue #258: Co-op State Synchronization - Critical Fix
-- The game_events table requires a valid game_sessions.id FK, but co-op sessions
-- were not creating corresponding game_session entries. This column links them.
--
-- Required by: sync.service.ts appendEvent() call

ALTER TABLE "multiplayer"."coop_session"
ADD COLUMN IF NOT EXISTS "game_session_id" uuid REFERENCES "public"."game_sessions"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "coop_session_game_session_idx" 
    ON "multiplayer"."coop_session" USING btree ("game_session_id");
