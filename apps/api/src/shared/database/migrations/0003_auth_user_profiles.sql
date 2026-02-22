CREATE TABLE IF NOT EXISTS "auth"."user_profiles" (
	"profile_id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"accessibility_settings" jsonb NOT NULL DEFAULT '{}',
	"notification_settings" jsonb NOT NULL DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_profiles_tenant_user_unique" ON "auth"."user_profiles" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_user_profiles_tenant_idx" ON "auth"."user_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_user_profiles_user_idx" ON "auth"."user_profiles" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "auth"."user_profiles" ADD CONSTRAINT "user_profiles_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "auth"."user_profiles" ADD CONSTRAINT "user_profiles_tenant_id_user_id_users_tenant_id_user_id_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "auth"."set_updated_at"()
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
    WHERE tgname = 'trg_user_profiles_updated_at'
      AND tgrelid = 'auth.user_profiles'::regclass
  ) THEN
    CREATE TRIGGER "trg_user_profiles_updated_at"
      BEFORE UPDATE ON "auth"."user_profiles"
      FOR EACH ROW EXECUTE FUNCTION "auth"."set_updated_at"();
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "auth"."user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'user_profiles' AND policyname = 'tenant_isolation_user_profiles'
  ) THEN
    CREATE POLICY "tenant_isolation_user_profiles" ON "auth"."user_profiles"
      USING ("tenant_id" = "auth"."current_tenant_id"())
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"());
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'user_profiles' AND policyname = 'user_own_profile_user_profiles'
  ) THEN
    CREATE POLICY "user_own_profile_user_profiles" ON "auth"."user_profiles"
      USING (
        "user_id"::text = current_setting('app.current_user_id', true)
      )
      WITH CHECK (
        "user_id"::text = current_setting('app.current_user_id', true)
      );
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "auth"."user_profiles" FORCE ROW LEVEL SECURITY;
