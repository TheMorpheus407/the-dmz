CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."permissions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"resource" varchar(128) NOT NULL,
	"action" varchar(64) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "auth_role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."roles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."sso_connections" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"name" varchar(255) NOT NULL,
	"metadata_url" text,
	"client_id" varchar(255),
	"client_secret_encrypted" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."user_roles" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"scope" varchar(255)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_user_id_unique" ON "public"."users" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_roles_tenant_id_id_unique" ON "auth"."roles" USING btree ("tenant_id","id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "auth"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "auth"."permissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."roles" ADD CONSTRAINT "roles_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_tenant_id_user_id_users_tenant_id_user_id_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."sso_connections" ADD CONSTRAINT "sso_connections_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_tenant_id_user_id_users_tenant_id_user_id_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","user_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_tenant_id_role_id_roles_tenant_id_id_fk" FOREIGN KEY ("tenant_id","role_id") REFERENCES "auth"."roles"("tenant_id","id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_tenant_id_assigned_by_users_tenant_id_user_id_fk" FOREIGN KEY ("tenant_id","assigned_by") REFERENCES "public"."users"("tenant_id","user_id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_permissions_resource_action_unique" ON "auth"."permissions" USING btree ("resource","action");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_roles_tenant_name_unique" ON "auth"."roles" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_token_hash_unique" ON "auth"."sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_user_expires_at_idx" ON "auth"."sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sso_connections_tenant_provider_idx" ON "auth"."sso_connections" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_roles_tenant_user_role_unique" ON "auth"."user_roles" USING btree ("tenant_id","user_id","role_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_user_roles_tenant_user_idx" ON "auth"."user_roles" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_auth_roles_updated_at'
      AND tgrelid = 'auth.roles'::regclass
  ) THEN
    CREATE TRIGGER "trg_auth_roles_updated_at"
      BEFORE UPDATE ON "auth"."roles"
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_auth_sso_connections_updated_at'
      AND tgrelid = 'auth.sso_connections'::regclass
  ) THEN
    CREATE TRIGGER "trg_auth_sso_connections_updated_at"
      BEFORE UPDATE ON "auth"."sso_connections"
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "auth"."current_tenant_id"() RETURNS uuid AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.current_tenant_id', true), ''),
    NULLIF(current_setting('app.tenant_id', true), '')
  )::uuid;
END;
$$ LANGUAGE plpgsql STABLE;
--> statement-breakpoint
ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."sso_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'sessions' AND policyname = 'tenant_isolation_sessions'
  ) THEN
    CREATE POLICY "tenant_isolation_sessions" ON "auth"."sessions"
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
    WHERE schemaname = 'auth' AND tablename = 'roles' AND policyname = 'tenant_isolation_roles'
  ) THEN
    CREATE POLICY "tenant_isolation_roles" ON "auth"."roles"
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
    WHERE schemaname = 'auth' AND tablename = 'role_permissions' AND policyname = 'tenant_isolation_role_permissions'
  ) THEN
    CREATE POLICY "tenant_isolation_role_permissions" ON "auth"."role_permissions"
      USING (
        EXISTS (
          SELECT 1
          FROM "auth"."roles" AS "roles"
          WHERE "roles"."id" = "role_id"
            AND "roles"."tenant_id" = "auth"."current_tenant_id"()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM "auth"."roles" AS "roles"
          WHERE "roles"."id" = "role_id"
            AND "roles"."tenant_id" = "auth"."current_tenant_id"()
        )
      );
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'auth' AND tablename = 'user_roles' AND policyname = 'tenant_isolation_user_roles'
  ) THEN
    CREATE POLICY "tenant_isolation_user_roles" ON "auth"."user_roles"
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
    WHERE schemaname = 'auth' AND tablename = 'sso_connections' AND policyname = 'tenant_isolation_sso_connections'
  ) THEN
    CREATE POLICY "tenant_isolation_sso_connections" ON "auth"."sso_connections"
      USING ("tenant_id" = "auth"."current_tenant_id"())
      WITH CHECK ("tenant_id" = "auth"."current_tenant_id"());
  END IF;
END $$;
--> statement-breakpoint
INSERT INTO "auth"."permissions" ("resource", "action", "description")
VALUES
  ('users', 'read', 'View user profiles'),
  ('users', 'write', 'Create and update users'),
  ('users', 'delete', 'Deactivate or remove users'),
  ('roles', 'read', 'View role definitions'),
  ('roles', 'write', 'Create and modify roles'),
  ('reports', 'read', 'View reports and analytics'),
  ('reports', 'export', 'Export report data'),
  ('settings', 'read', 'View tenant settings'),
  ('settings', 'write', 'Modify tenant settings'),
  ('campaigns', 'read', 'View training campaigns'),
  ('campaigns', 'write', 'Create and manage campaigns')
ON CONFLICT ("resource", "action") DO UPDATE
SET "description" = excluded."description";
--> statement-breakpoint
DO $$
DECLARE
  tenant_row RECORD;
BEGIN
  FOR tenant_row IN SELECT "tenant_id" FROM "public"."tenants" LOOP
    PERFORM set_config('app.current_tenant_id', tenant_row."tenant_id"::text, true);
    PERFORM set_config('app.tenant_id', tenant_row."tenant_id"::text, true);

    INSERT INTO "auth"."roles" ("tenant_id", "name", "description", "is_system")
    SELECT
      tenant_row."tenant_id",
      "defaults"."name",
      "defaults"."description",
      true
    FROM (
      VALUES
        ('admin', 'Full tenant administration'),
        ('manager', 'Team and reporting management'),
        ('learner', 'Standard learner access')
    ) AS "defaults"("name", "description")
    ON CONFLICT ("tenant_id", "name") DO UPDATE
    SET
      "description" = excluded."description",
      "is_system" = true,
      "updated_at" = now();

    INSERT INTO "auth"."role_permissions" ("role_id", "permission_id")
    SELECT
      "roles"."id",
      "permissions"."id"
    FROM "auth"."roles" AS "roles"
    JOIN "auth"."permissions" AS "permissions" ON true
    WHERE "roles"."tenant_id" = tenant_row."tenant_id"
      AND "roles"."name" = 'admin'
    ON CONFLICT DO NOTHING;

    INSERT INTO "auth"."role_permissions" ("role_id", "permission_id")
    SELECT
      "roles"."id",
      "permissions"."id"
    FROM "auth"."roles" AS "roles"
    JOIN (
      VALUES
        ('users', 'read'),
        ('users', 'write'),
        ('roles', 'read'),
        ('reports', 'read'),
        ('reports', 'export'),
        ('campaigns', 'read'),
        ('campaigns', 'write')
    ) AS "manager_permissions"("resource", "action") ON true
    JOIN "auth"."permissions" AS "permissions"
      ON "permissions"."resource" = "manager_permissions"."resource"
     AND "permissions"."action" = "manager_permissions"."action"
    WHERE "roles"."tenant_id" = tenant_row."tenant_id"
      AND "roles"."name" = 'manager'
    ON CONFLICT DO NOTHING;

    INSERT INTO "auth"."user_roles" ("tenant_id", "user_id", "role_id")
    SELECT
      "users"."tenant_id",
      "users"."user_id",
      "roles"."id"
    FROM "public"."users" AS "users"
    JOIN "auth"."roles" AS "roles"
      ON "roles"."tenant_id" = "users"."tenant_id"
     AND "roles"."name" = CASE
       WHEN "users"."role" IN ('super_admin', 'tenant_admin', 'admin') THEN 'admin'
       WHEN "users"."role" = 'manager' THEN 'manager'
       ELSE 'learner'
     END
    WHERE "users"."tenant_id" = tenant_row."tenant_id"
    ON CONFLICT ("tenant_id", "user_id", "role_id") DO NOTHING;
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "auth"."sessions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."roles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."role_permissions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."user_roles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "auth"."sso_connections" FORCE ROW LEVEL SECURITY;
