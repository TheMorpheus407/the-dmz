-- Migration: 0010_game_events.sql
-- Event sourcing tables for game engine
--
-- NOTE: Monthly partitioning by server_time is planned but not implemented in this migration.
-- PostgreSQL 16 supports table partitioning. To enable partitioning:
-- 1. Recreate game_events as a partitioned table using PARTITION BY RANGE (server_time)
-- 2. Create monthly partitions (e.g., game_events_2026_01, game_events_2026_02, etc.)
-- 3. Set up automation to create new partitions monthly
--
-- This is deferred to avoid migration complexity and potential downtime.

CREATE TABLE IF NOT EXISTS "public"."game_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"event_data" jsonb NOT NULL DEFAULT '{}',
	"event_version" integer NOT NULL DEFAULT 1,
	"sequence_num" bigint NOT NULL,
	"server_time" timestamp with time zone DEFAULT now() NOT NULL,
	"client_time" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_events_session_sequence_idx" ON "public"."game_events" USING btree ("session_id","sequence_num");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_events_type_time_idx" ON "public"."game_events" USING btree ("event_type","server_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_events_tenant_idx" ON "public"."game_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_events_user_idx" ON "public"."game_events" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "public"."game_events" ADD CONSTRAINT "game_events_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "public"."game_events" ADD CONSTRAINT "game_events_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "public"."game_events" ADD CONSTRAINT "game_events_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."game_state_snapshots" (
	"snapshot_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sequence_num" bigint NOT NULL,
	"state_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE ("session_id", "sequence_num")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_state_snapshots_session_idx" ON "public"."game_state_snapshots" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_state_snapshots_tenant_idx" ON "public"."game_state_snapshots" USING btree ("tenant_id");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "public"."game_state_snapshots" ADD CONSTRAINT "game_state_snapshots_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "public"."game_state_snapshots" ADD CONSTRAINT "game_state_snapshots_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
