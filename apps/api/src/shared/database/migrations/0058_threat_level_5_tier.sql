-- Extend threat_level column to accommodate 5-tier threat levels
-- Previous: varchar(16) with 3 tiers (low, medium, high)
-- Now: varchar(20) with 5 tiers (low, guarded, elevated, high, severe)

ALTER TABLE game_sessions
ALTER COLUMN threat_level TYPE varchar(20);

-- Migrate any existing 'medium' values to 'elevated' (closest equivalent in 5-tier system)
UPDATE game_sessions
SET threat_level = 'elevated'
WHERE threat_level = 'medium';
