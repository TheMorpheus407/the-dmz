CREATE TABLE IF NOT EXISTS "public"."game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"day" integer DEFAULT 1 NOT NULL,
	"funds" integer DEFAULT 1000 NOT NULL,
	"client_count" integer DEFAULT 5 NOT NULL,
	"threat_level" varchar(16) DEFAULT 'low' NOT NULL,
	"defense_level" integer DEFAULT 1 NOT NULL,
	"server_level" integer DEFAULT 1 NOT NULL,
	"network_level" integer DEFAULT 1 NOT NULL,
	"is_active" uuid DEFAULT uuid_generate_v7() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "game_sessions_tenant_user_unique" ON "public"."game_sessions" USING btree ("tenant_id","user_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_sessions_tenant_idx" ON "public"."game_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_sessions_user_idx" ON "public"."game_sessions" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "public"."game_sessions" ADD CONSTRAINT "game_sessions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "public"."game_sessions" ADD CONSTRAINT "game_sessions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."set_game_session_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_game_sessions_updated_at'
      AND tgrelid = 'public.game_sessions'::regclass
  ) THEN
    CREATE TRIGGER "trg_game_sessions_updated_at"
      BEFORE UPDATE ON "public"."game_sessions"
      FOR EACH ROW EXECUTE FUNCTION "public"."set_game_session_updated_at"();
  END IF;
END $$;
