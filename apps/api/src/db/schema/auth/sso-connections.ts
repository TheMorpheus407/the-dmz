import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const authSchema = pgSchema('auth');

export const ssoConnections = authSchema.table(
  'sso_connections',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    provider: varchar('provider', { length: 32 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    metadataUrl: text('metadata_url'),
    clientId: varchar('client_id', { length: 255 }),
    clientSecretEncrypted: text('client_secret_encrypted'),
    isActive: boolean('is_active').notNull().default(true),
    enforceSSOOnly: boolean('enforce_sso_only').notNull().default(false),
    lastValidationId: uuid('last_validation_id'),
    lastValidationAt: timestamp('last_validation_at', { withTimezone: true, mode: 'date' }),
    lastValidationStatus: varchar('last_validation_status', { length: 32 }),
    activatedAt: timestamp('activated_at', { withTimezone: true, mode: 'date' }),
    activatedBy: uuid('activated_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantProviderIdx: index('auth_sso_connections_tenant_provider_idx').on(
      table.tenantId,
      table.provider,
    ),
    tenantEnforceSSOOnlyIdx: index('auth_sso_connections_enforce_sso_only_idx').on(
      table.tenantId,
      table.enforceSSOOnly,
    ),
  }),
);

export const ssoValidations = authSchema.table(
  'sso_validations',
  {
    id: uuid('id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    ssoConnectionId: uuid('sso_connection_id').references(() => ssoConnections.id, {
      onDelete: 'cascade',
    }),
    validationType: varchar('validation_type', { length: 32 }).notNull(),
    overallStatus: varchar('overall_status', { length: 32 }).notNull(),
    checks: jsonb('checks').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    warnings: jsonb('warnings'),
    executedBy: uuid('executed_by'),
    errorDetails: jsonb('error_details'),
  },
  (table) => ({
    tenantConnectionIdx: index('auth_sso_validations_tenant_connection_idx').on(
      table.tenantId,
      table.ssoConnectionId,
    ),
    executedAtIdx: index('auth_sso_validations_executed_at_idx').on(table.executedAt),
  }),
);

export type SsoConnection = typeof ssoConnections.$inferSelect;
export type NewSsoConnection = typeof ssoConnections.$inferInsert;
export type SsoValidation = typeof ssoValidations.$inferSelect;
export type NewSsoValidation = typeof ssoValidations.$inferInsert;
