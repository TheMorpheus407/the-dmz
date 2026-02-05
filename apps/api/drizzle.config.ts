import type { Config } from "drizzle-kit";

const config = {
  schema: "./src/shared/database/schema/tenants.ts",
  out: "./src/shared/database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/the_dmz",
  },
  strict: true,
  verbose: true,
} satisfies Config;

export default config;
