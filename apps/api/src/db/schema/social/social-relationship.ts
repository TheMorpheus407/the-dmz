import { sql } from 'drizzle-orm';
import { index, pgSchema, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

const socialSchema = pgSchema('social');

export const relationshipTypes = ['friend', 'block', 'mute'] as const;
export type RelationshipType = (typeof relationshipTypes)[number];

export const relationshipStatuses = ['pending', 'accepted', 'rejected'] as const;
export type RelationshipStatus = (typeof relationshipStatuses)[number];

export const socialRelationships = socialSchema.table(
  'social_relationship',
  {
    relationshipId: uuid('relationship_id')
      .default(sql`uuid_generate_v7()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    requesterId: uuid('requester_id').notNull(),
    addresseeId: uuid('addressee_id').notNull(),
    relationshipType: varchar('relationship_type', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    requesterAddresseeTypeUnique: uniqueIndex(
      'social_relationship_requester_addressee_type_unique',
    ).on(table.requesterId, table.addresseeId, table.relationshipType),
    tenantIdx: index('social_relationship_tenant_idx').on(table.tenantId),
    addresseeIdx: index('social_relationship_addressee_idx').on(table.addresseeId),
    statusIdx: index('social_relationship_status_idx').on(table.status),
    requesterTenantIdx: index('social_relationship_requester_tenant_idx').on(
      table.requesterId,
      table.tenantId,
    ),
    addresseeTenantIdx: index('social_relationship_addressee_tenant_idx').on(
      table.addresseeId,
      table.tenantId,
    ),
  }),
);

export type SocialRelationship = typeof socialRelationships.$inferSelect;
export type NewSocialRelationship = typeof socialRelationships.$inferInsert;

export const MAX_FRIENDS = 500;
export const MAX_BLOCKED = 1000;
export const MAX_MUTED = 1000;

export interface RelationshipWithProfile extends SocialRelationship {
  requesterDisplayName?: string;
  addresseeDisplayName?: string;
}
