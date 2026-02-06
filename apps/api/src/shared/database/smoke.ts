import { closeDatabase, getDatabasePool } from "./connection.js";

const run = async (): Promise<void> => {
  const sql = getDatabasePool();
  await sql`select 1`;
  await closeDatabase();
};

run().catch((error) => {
  console.error("Database smoke test failed", error);
  process.exit(1);
});
