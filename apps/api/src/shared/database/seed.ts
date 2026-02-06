import { pathToFileURL } from "node:url";

import { eq } from "drizzle-orm";

import { closeDatabase, getDatabaseClient } from "./connection.js";
import { tenants } from "./schema/index.js";

const SYSTEM_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export const seedDatabase = async (): Promise<void> => {
  const db = getDatabaseClient();

  const defaultTenants = [
    {
      tenantId: SYSTEM_TENANT_ID,
      name: "The DMZ",
      slug: "system",
      status: "active",
      settings: {},
    },
    {
      name: "Test Tenant",
      slug: "test",
      status: "active",
      settings: {},
    },
  ];

  await db
    .insert(tenants)
    .values(defaultTenants)
    .onConflictDoNothing({
      target: [tenants.slug],
    });

  const systemTenant = await db
    .select({ tenantId: tenants.tenantId })
    .from(tenants)
    .where(eq(tenants.slug, "system"))
    .limit(1);

  if (systemTenant.length === 0) {
    throw new Error("System tenant seeding failed");
  }
};

const isDirectRun =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  seedDatabase()
    .then(() => closeDatabase())
    .catch((error) => {
      console.error("Database seed failed", error);
      process.exit(1);
    });
}
