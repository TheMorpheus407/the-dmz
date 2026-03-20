-- Migration: 0052_coop_session_scenario_and_role_preference
-- Description: Add scenario fields to coop_session and role_preference to coop_role_assignment
--
-- Issue #260: M11-09: Two-Player Co-op Missions
-- Adds:
-- - scenarioId and difficultyTier columns to coop_session (if not already added via schema)
-- - role_preference column to coop_role_assignment for role preference tracking

ALTER TABLE "multiplayer"."coop_session"
ADD COLUMN IF NOT EXISTS "scenario_id" varchar(50),
ADD COLUMN IF NOT EXISTS "difficulty_tier" varchar(20);

ALTER TABLE "multiplayer"."coop_role_assignment"
ADD COLUMN IF NOT EXISTS "role_preference" varchar(20);

CREATE INDEX IF NOT EXISTS "coop_session_scenario_idx" 
    ON "multiplayer"."coop_session" USING btree ("scenario_id");

CREATE INDEX IF NOT EXISTS "coop_role_assignment_preference_idx" 
    ON "multiplayer"."coop_role_assignment" USING btree ("role_preference");
