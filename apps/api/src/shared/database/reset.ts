import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { loadConfig } from "../../config.js";

import {
  closeDatabase,
  getDatabaseClient,
  getDatabasePool,
} from "./connection.js";
import { seedDatabase } from "./seed.js";

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

const run = async () => {
  const config = loadConfig();

  if (config.NODE_ENV === "production") {
    throw new Error("db:reset is disabled in production");
  }

  const sql = getDatabasePool(config);
  await sql`drop schema if exists public cascade`;
  await sql`create schema public`;

  const db = getDatabaseClient(config);
  await migrate(db, { migrationsFolder });
  await seedDatabase();
  await closeDatabase();
};

run().catch((error) => {
  console.error("Database reset failed", error);
  process.exit(1);
});
