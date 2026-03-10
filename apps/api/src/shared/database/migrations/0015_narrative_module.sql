-- Migration: 0014_narrative_module.sql
-- Narrative module tables for factions, faction relations, and Morpheus coaching
--
-- This migration creates the narrative storage for:
-- - Faction definitions (5 core factions)
-- - Per-player faction reputation
-- - Narrative events triggered by game state
-- - Morpheus coaching message templates
-- - Player narrative progress tracking
--
-- Required by M3-07 (Narrative module v1)

-- Factions table (5 core factions)
CREATE TABLE IF NOT EXISTS "content"."factions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"faction_key" varchar(50) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"motivations" text NOT NULL,
	"communication_style" varchar(20) NOT NULL CHECK (communication_style IN ('formal', 'casual', 'technical', 'urgent')),
	"initial_reputation" integer NOT NULL DEFAULT 50,
	"metadata" jsonb DEFAULT '{}',
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE ("tenant_id", "faction_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "factions_tenant_idx" ON "content"."factions" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "factions_key_idx" ON "content"."factions" USING btree ("faction_key");

-- Faction relations table (per-player faction reputation)
CREATE TABLE IF NOT EXISTS "content"."faction_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"faction_id" uuid NOT NULL REFERENCES "content"."factions"("id") ON DELETE cascade,
	"reputation" integer NOT NULL DEFAULT 50 CHECK (reputation >= 0 AND reputation <= 100),
	"last_interaction_day" integer NOT NULL DEFAULT 0,
	"interaction_count" integer NOT NULL DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE ("tenant_id", "user_id", "faction_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "faction_relations_tenant_idx" ON "content"."faction_relations" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "faction_relations_user_idx" ON "content"."faction_relations" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "faction_relations_faction_idx" ON "content"."faction_relations" USING btree ("faction_id");

-- Narrative events table (triggered narrative beats)
CREATE TABLE IF NOT EXISTS "content"."narrative_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_key" varchar(100) NOT NULL,
	"faction_key" varchar(50),
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"trigger_type" varchar(50) NOT NULL CHECK (trigger_type IN ('faction_reputation', 'threat_level', 'decision', 'milestone', 'breach', 'recovery', 'first_login', 'manual')),
	"trigger_threshold" integer,
	"day_triggered" integer NOT NULL,
	"is_read" boolean NOT NULL DEFAULT false,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "narrative_events_tenant_idx" ON "content"."narrative_events" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "narrative_events_user_idx" ON "content"."narrative_events" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "narrative_events_key_idx" ON "content"."narrative_events" USING btree ("event_key");
CREATE INDEX IF NOT EXISTS "narrative_events_day_idx" ON "content"."narrative_events" USING btree ("day_triggered");

-- Morpheus messages table (coaching message templates)
CREATE TABLE IF NOT EXISTS "content"."morpheus_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"message_key" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"trigger_type" varchar(50) NOT NULL CHECK (trigger_type IN ('first_login', 'decision', 'low_trust', 'high_threat', 'post_incident', 'milestone', 'recovery', 'general')),
	"severity" varchar(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'urgent', 'encouragement')),
	"min_day" integer,
	"max_day" integer,
	"min_trust_score" integer,
	"max_trust_score" integer,
	"min_threat_level" varchar(16),
	"max_threat_level" varchar(16),
	"faction_key" varchar(50),
	"is_active" boolean NOT NULL DEFAULT true,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE ("tenant_id", "message_key")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "morpheus_messages_tenant_idx" ON "content"."morpheus_messages" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "morpheus_messages_key_idx" ON "content"."morpheus_messages" USING btree ("message_key");
CREATE INDEX IF NOT EXISTS "morpheus_messages_trigger_idx" ON "content"."morpheus_messages" USING btree ("trigger_type");
CREATE INDEX IF NOT EXISTS "morpheus_messages_active_idx" ON "content"."morpheus_messages" USING btree ("is_active");

-- Player narrative state table (player narrative progress)
CREATE TABLE IF NOT EXISTS "content"."player_narrative_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"current_season" integer NOT NULL DEFAULT 1,
	"current_chapter" integer NOT NULL DEFAULT 1,
	"current_act" integer NOT NULL DEFAULT 1,
	"milestones_reached" jsonb DEFAULT '[]',
	"conversations_completed" jsonb DEFAULT '[]',
	"last_morpheus_message_day" integer NOT NULL DEFAULT 0,
	"welcome_message_shown" boolean NOT NULL DEFAULT false,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE ("tenant_id", "user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "player_narrative_state_tenant_idx" ON "content"."player_narrative_state" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "player_narrative_state_user_idx" ON "content"."player_narrative_state" USING btree ("user_id");

-- Add foreign key constraints
DO $$ BEGIN
	ALTER TABLE "content"."factions" ADD CONSTRAINT "factions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."faction_relations" ADD CONSTRAINT "faction_relations_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."faction_relations" ADD CONSTRAINT "faction_relations_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."narrative_events" ADD CONSTRAINT "narrative_events_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."narrative_events" ADD CONSTRAINT "narrative_events_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."morpheus_messages" ADD CONSTRAINT "morpheus_messages_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."player_narrative_state" ADD CONSTRAINT "player_narrative_state_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
	ALTER TABLE "content"."player_narrative_state" ADD CONSTRAINT "player_narrative_state_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Seed default factions
INSERT INTO "content"."factions" ("tenant_id", "faction_key", "display_name", "description", "motivations", "communication_style", "initial_reputation")
SELECT 
	tenant_id,
	'sovereign_compact',
	'The Sovereign Compact',
	'Governments and intergovernmental organizations united to preserve civilization. They control critical infrastructure and hold legal authority.',
	'Maintain order, ensure public safety, rebuild networks, enforce regulations',
	'formal',
	50
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."factions" WHERE "faction_key" = 'sovereign_compact' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;

INSERT INTO "content"."factions" ("tenant_id", "faction_key", "display_name", "description", "motivations", "communication_style", "initial_reputation")
SELECT 
	tenant_id,
	'nexion_industries',
	'Nexion Industries',
	'Major corporations seeking to rebuild global commerce. They have resources but prioritize profit and market dominance.',
	'Profit maximization, market control, rebuilding commerce, competitive advantage',
	'technical',
	50
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."factions" WHERE "faction_key" = 'nexion_industries' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;

INSERT INTO "content"."factions" ("tenant_id", "faction_key", "display_name", "description", "motivations", "communication_style", "initial_reputation")
SELECT 
	tenant_id,
	'the_librarians',
	'The Librarians',
	'Academics, archivists, and preservationists dedicated to saving human knowledge. They value information integrity above all.',
	'Preserve knowledge, maintain academic integrity, ensure information accessibility, protect cultural heritage',
	'formal',
	50
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."factions" WHERE "faction_key" = 'the_librarians' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;

INSERT INTO "content"."factions" ("tenant_id", "faction_key", "display_name", "description", "motivations", "communication_style", "initial_reputation")
SELECT 
	tenant_id,
	'hacktivists',
	'Hacktivist Collectives',
	'Decentralized hacker groups fighting for information freedom and against corporate/government control. They challenge authority.',
	'Information freedom, anti-corporate activism, privacy rights, exposing corruption',
	'casual',
	50
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."factions" WHERE "faction_key" = 'hacktivists' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;

INSERT INTO "content"."factions" ("tenant_id", "faction_key", "display_name", "description", "motivations", "communication_style", "initial_reputation")
SELECT 
	tenant_id,
	'criminal_networks',
	'Criminal Networks',
	'Underground organizations that profit from chaos. They exploit desperation and offer services others cannot.',
	'Profit from chaos, exploit desperation, maintain power through leverage, survival of the fittest',
	'urgent',
	50
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."factions" WHERE "faction_key" = 'criminal_networks' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;

-- Seed default Morpheus coaching messages
INSERT INTO "content"."morpheus_messages" ("tenant_id", "message_key", "title", "content", "trigger_type", "severity", "min_day", "max_day")
SELECT 
	tenant_id,
	'welcome_message',
	'Welcome to the Archive',
	'You have been chosen as one of the few operators with clearance to access the Archive. Your decisions will determine who gets a second chance at rebuilding. Be vigilant. Every request could be a lifeline or a trap. Trust no one completely.',
	'first_login',
	'info',
	1,
	1
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."morpheus_messages" WHERE "message_key" = 'welcome_message' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;

INSERT INTO "content"."morpheus_messages" ("tenant_id", "message_key", "title", "content", "trigger_type", "severity", "min_trust_score", "max_trust_score")
SELECT 
	tenant_id,
	'low_trust_encouragement',
	'Trust is Fragile',
	'Your trust score has dropped. Remember: every denial has consequences, but so does every approval. Take time to verify before making decisions that cannot be undone.',
	'low_trust',
	'encouragement',
	0,
	25
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."morpheus_messages" WHERE "message_key" = 'low_trust_encouragement' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;

INSERT INTO "content"."morpheus_messages" ("tenant_id", "message_key", "title", "content", "trigger_type", "severity", "min_threat_level")
SELECT 
	tenant_id,
	'high_threat_warning',
	'Threat Level Elevated',
	'Incoming attack detected. Increase vigilance on all incoming requests. Threat actors are actively probing our defenses. Do not approve any requests that raise suspicion.',
	'high_threat',
	'urgent',
	'HIGH'
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."morpheus_messages" WHERE "message_key" = 'high_threat_warning' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;

INSERT INTO "content"."morpheus_messages" ("tenant_id", "message_key", "title", "content", "trigger_type", "severity")
SELECT 
	tenant_id,
	'post_incident_recovery',
	'Recovery in Progress',
	'We survived the incident. Now is the time to review what went wrong, tighten our defenses, and learn from this experience. The Archive endures.',
	'post_incident',
	'encouragement'
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."morpheus_messages" WHERE "message_key" = 'post_incident_recovery' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;

INSERT INTO "content"."morpheus_messages" ("tenant_id", "message_key", "title", "content", "trigger_type", "severity")
SELECT 
	tenant_id,
	'milestone_congratulations',
	'Milestone Reached',
	'You have achieved a significant milestone. Your decisions have strengthened the Archive. Continue on this path and remember: every access decision is a test of judgment.',
	'milestone',
	'info'
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."morpheus_messages" WHERE "message_key" = 'milestone_congratulations' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;

INSERT INTO "content"."morpheus_messages" ("tenant_id", "message_key", "title", "content", "trigger_type", "severity")
SELECT 
	tenant_id,
	'general_wisdom',
	'Morpheus Guidance',
	'The Archive watches all. Trust, but verify. Every request tells a story if you know how to read it. Your judgment is our best defense.',
	'general',
	'info'
FROM public.tenants
WHERE NOT EXISTS (SELECT 1 FROM "content"."morpheus_messages" WHERE "message_key" = 'general_wisdom' AND "tenant_id" = "tenants"."tenant_id")
ON CONFLICT DO NOTHING;
