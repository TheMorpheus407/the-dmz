-- Migration: 0051_coop_scenarios
-- Description: Create coop_scenario reference table for co-op mission scenarios
--
-- Issue #260: M11-09: Two-Player Co-op Missions
-- Adds the coop_scenario table to store scenario definitions for co-op missions.
-- This is reference data (no tenant_id) as scenarios are game-wide.

CREATE TABLE IF NOT EXISTS "multiplayer"."coop_scenario" (
  "id" varchar(50) PRIMARY KEY,
  "name" varchar(100) NOT NULL,
  "description" varchar(500),
  "threat_domain" varchar(100)[],
  "difficulty_tier" varchar(20)[],
  "email_routing" varchar(20),
  "unique_mechanics" jsonb,
  "phase_overrides" jsonb,
  "success_conditions" jsonb,
  "failure_conditions" jsonb,
  "narrative_setup" varchar(500),
  "narrative_exit" varchar(500)
);

CREATE INDEX IF NOT EXISTS "coop_scenario_difficulty_idx" 
    ON "multiplayer"."coop_scenario" USING btree ("difficulty_tier");
