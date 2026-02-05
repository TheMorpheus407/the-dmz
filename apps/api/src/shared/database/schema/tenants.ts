import { sql } from "drizzle-orm";
import { jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  tenantId: uuid("tenant_id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 63 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  settings: jsonb("settings").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});
