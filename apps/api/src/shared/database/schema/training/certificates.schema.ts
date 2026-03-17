import { pgTable, uuid, varchar, timestamp, jsonb, customType } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const certificates = pgTable('training.certificates', {
  certificateId: uuid('certificate_id')
    .primaryKey()
    .default({} as never),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  campaignId: uuid('campaign_id'),
  frameworkId: varchar('framework_id', { length: 32 }).notNull(),
  courseName: varchar('course_name', { length: 255 }).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
  signatureHash: varchar('signature_hash', { length: 64 }),
  pdfBlob: bytea('pdf_blob'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
