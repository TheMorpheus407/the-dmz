-- Migration: 0015_admin_permission_backfill.sql
-- Adds the admin read/write permissions introduced for admin-only content
-- surfaces and grants them to each tenant's existing admin role so upgraded
-- tenants keep access without rerunning seed scripts.

INSERT INTO "auth"."permissions" ("resource", "action", "description")
VALUES
  ('admin', 'read', 'View tenant admin-only content and settings'),
  ('admin', 'write', 'Create and update tenant admin-only content and settings')
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

    INSERT INTO "auth"."role_permissions" ("role_id", "permission_id")
    SELECT
      "roles"."id",
      "permissions"."id"
    FROM "auth"."roles" AS "roles"
    JOIN (
      VALUES
        ('admin', 'read'),
        ('admin', 'write')
    ) AS "admin_permissions"("resource", "action") ON true
    JOIN "auth"."permissions" AS "permissions"
      ON "permissions"."resource" = "admin_permissions"."resource"
     AND "permissions"."action" = "admin_permissions"."action"
    WHERE "roles"."tenant_id" = tenant_row."tenant_id"
      AND "roles"."name" = 'admin'
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
