import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDatabase, getDatabaseClient } from "./connection.js";

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

const run = async () => {
  const db = getDatabaseClient();
  await migrate(db, { migrationsFolder });
  await closeDatabase();
};

run().catch((error) => {
  console.error("Database migration failed", error);
  process.exit(1);
});
