CREATE TABLE IF NOT EXISTS "auth"."mfa_credentials" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"type" varchar(20) NOT NULL,
	"credential_id" varchar(255),
	"encrypted_secret" text NOT NULL,
	"name" varchar(255),
	"device_type" varchar(64),
	"backed_up" varchar(10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_mfa_credentials_user_tenant_idx" ON "auth"."mfa_credentials" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_mfa_credentials_type_idx" ON "auth"."mfa_credentials" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_mfa_credentials_credential_id_idx" ON "auth"."mfa_credentials" USING btree ("credential_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."mfa_credentials" ADD CONSTRAINT "mfa_credentials_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."mfa_credentials" ADD CONSTRAINT "mfa_credentials_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."mfa_credentials" ADD CONSTRAINT "mfa_credentials_tenant_id_user_id_users_tenant_id_user_id_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 END $$;--> statement-breakpoint
ALTER TABLE "auth"."mfa_credentials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'mfa_credentials' AND policyname = 'tenant_isolation_mfa_credentials'
  ) THEN
    CREATE POLICY "tenant_isolation_mfa_credentials" ON "auth"."mfa_credentials"
      USING ("tenant_id" = "auth"."current_tenant_id"())
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"());
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."backup_codes" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_backup_codes_user_tenant_idx" ON "auth"."backup_codes" USING btree ("user_id","tenant_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."backup_codes" ADD CONSTRAINT "backup_codes_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."backup_codes" ADD CONSTRAINT "backup_codes_tenant_id_user_id_users_tenant_id_user_id_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
 END $$;--> statement-breakpoint
ALTER TABLE "auth"."backup_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'backup_codes' AND policyname = 'tenant_isolation_backup_codes'
  ) THEN
    CREATE POLICY "tenant_isolation_backup_codes" ON "auth"."backup_codes"
      USING ("tenant_id" = "auth"."current_tenant_id"())
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"());
  END IF;
END $$;