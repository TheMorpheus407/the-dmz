import { sql } from 'drizzle-orm';
import { index, pgSchema, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { KEY_STATUS, type KEY_TYPE } from '@the-dmz/shared/contracts';

const authSchema = pgSchema('auth');

export const signingKeys = authSchema.table(
  'signing_keys',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    keyType: varchar('key_type', { length: 16 })
      .notNull()
      .$type<(typeof KEY_TYPE)[keyof typeof KEY_TYPE]>(),
    algorithm: varchar('algorithm', { length: 16 }).notNull(),
    publicKeyPem: text('public_key_pem').notNull(),
    privateKeyEncryptedPem: text('private_key_encrypted_pem').notNull(),
    status: varchar('status', { length: 16 })
      .notNull()
      .$type<(typeof KEY_STATUS)[keyof typeof KEY_STATUS]>()
      .default(KEY_STATUS.ACTIVE),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    activatedAt: timestamp('activated_at', { withTimezone: true, mode: 'date' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    rotatedAt: timestamp('rotated_at', { withTimezone: true, mode: 'date' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    statusIdx: index('auth_signing_keys_status_idx').on(table.status),
    expiresAtIdx: index('auth_signing_keys_expires_at_idx').on(table.expiresAt),
  }),
);

export type SigningKey = typeof signingKeys.$inferSelect;
export type NewSigningKey = typeof signingKeys.$inferInsert;
