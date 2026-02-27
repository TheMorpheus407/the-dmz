import { index, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

import { ssoConnections } from './sso-connections.js';

export const userSsoIdentities = pgTable(
  'user_sso_identities',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    ssoProviderId: uuid('sso_provider_id')
      .notNull()
      .references(() => ssoConnections.id, { onDelete: 'cascade' }),
    subject: varchar('subject', { length: 512 }).notNull(),
    email: varchar('email', { length: 255 }),
    displayName: varchar('display_name', { length: 128 }),
    groups: text('groups'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.ssoProviderId] }),
    tenantProviderSubjectIdx: index('auth_user_sso_identities_tenant_provider_subject_idx').on(
      table.tenantId,
      table.ssoProviderId,
      table.subject,
    ),
    tenantEmailIdx: index('auth_user_sso_identities_tenant_email_idx').on(
      table.tenantId,
      table.email,
    ),
  }),
);

export type UserSsoIdentity = typeof userSsoIdentities.$inferSelect;
export type NewUserSsoIdentity = typeof userSsoIdentities.$inferInsert;
