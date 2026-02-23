ALTER TABLE "auth"."sessions" ADD COLUMN IF NOT EXISTS "mfa_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auth"."sessions" ADD COLUMN IF NOT EXISTS "mfa_method" varchar(32);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."webauthn_credentials" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"credential_id" varchar(255) NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer NOT NULL DEFAULT 0,
	"transports" text[],
	"device_type" varchar(64),
	"backed_up" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_webauthn_credentials_credential_id_unique" ON "auth"."webauthn_credentials" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_webauthn_credentials_user_tenant_idx" ON "auth"."webauthn_credentials" USING btree ("user_id","tenant_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_tenant_id_user_id_users_tenant_id_user_id_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "auth"."webauthn_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'webauthn_credentials' AND policyname = 'tenant_isolation_webauthn_credentials'
  ) THEN
    CREATE POLICY "tenant_isolation_webauthn_credentials" ON "auth"."webauthn_credentials"
      USING ("tenant_id" = "auth"."current_tenant_id"())
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"());
  END IF;
END $$;
