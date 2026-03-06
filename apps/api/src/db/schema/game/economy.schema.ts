import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
  check,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

import { gameSessions } from './game-sessions.js';

export const CURRENCY_TYPES = ['credits', 'trust', 'intel'] as const;
export type CurrencyType = (typeof CURRENCY_TYPES)[number];

export const TRANSACTION_REASONS = [
  'client_approval',
  'client_denial',
  'breach_penalty',
  'operational_cost',
  'upgrade_purchase',
  'facility_upgrade',
  'ransom_payment',
  'incident_analysis',
  'threat_intel_purchase',
  'initial_balance',
  'level_up_reward',
  'xp_reward',
  'decision_correct',
  'decision_incorrect',
  'trust_change',
] as const;
export type TransactionReason = (typeof TRANSACTION_REASONS)[number];

export const economyTransactions = pgTable(
  'economy_transactions',
  {
    transactionId: uuid('transaction_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => gameSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    currency: varchar('currency', { length: 16 }).notNull().$type<CurrencyType>(),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    reason: varchar('reason', { length: 128 }).notNull().$type<TransactionReason>(),
    context: jsonb('context').$type<Record<string, unknown>>().default({}),
    relatedEntityId: uuid('related_entity_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('economy_transactions_session_idx').on(table.sessionId),
    userIdIdx: index('economy_transactions_user_idx').on(table.userId),
    tenantIdIdx: index('economy_transactions_tenant_idx').on(table.tenantId),
    currencyIdx: index('economy_transactions_currency_idx').on(table.currency),
    reasonIdx: index('economy_transactions_reason_idx').on(table.reason),
    createdAtIdx: index('economy_transactions_created_idx').on(table.createdAt),
    currencyCheck: check('currency_check', sql`currency IN ('credits', 'trust', 'intel')`),
  }),
);

export type EconomyTransaction = typeof economyTransactions.$inferSelect;
export type NewEconomyTransaction = typeof economyTransactions.$inferInsert;
