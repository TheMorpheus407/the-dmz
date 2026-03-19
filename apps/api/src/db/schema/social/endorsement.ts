import { pgSchema, uuid, timestamp, uniqueIndex, index, foreignKey } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

import { endorsementTags } from './endorsement-tags.js';
import { playerProfiles } from './player-profiles.js';

const socialSchema = pgSchema('social');

export const endorsements = socialSchema.table(
  'endorsement',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id'),
    endorserPlayerId: uuid('endorser_player_id')
      .notNull()
      .references(() => playerProfiles.profileId, { onDelete: 'cascade' }),
    endorsedPlayerId: uuid('endorsed_player_id')
      .notNull()
      .references(() => playerProfiles.profileId, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => endorsementTags.id, { onDelete: 'restrict' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    seasonId: uuid('season_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('endorsement_session_idx').on(table.sessionId),
    endorserPlayerIdIdx: index('endorsement_endorser_idx').on(table.endorserPlayerId),
    endorsedPlayerIdIdx: index('endorsement_endorsed_idx').on(table.endorsedPlayerId),
    tagIdIdx: index('endorsement_tag_idx').on(table.tagId),
    tenantIdIdx: index('endorsement_tenant_idx').on(table.tenantId),
    seasonIdIdx: index('endorsement_season_idx').on(table.seasonId),
    createdAtIdx: index('endorsement_created_idx').on(table.createdAt),
    uniqueEndorsement: uniqueIndex('endorsement_unique').on(
      table.sessionId,
      table.endorserPlayerId,
      table.endorsedPlayerId,
      table.tagId,
    ),
    tenantEndorserFk: foreignKey({
      name: 'endorsement_tenant_endorser_fk',
      columns: [table.tenantId, table.endorserPlayerId],
      foreignColumns: [playerProfiles.tenantId, playerProfiles.profileId],
    }).onDelete('cascade'),
    tenantEndorsedFk: foreignKey({
      name: 'endorsement_tenant_endorsed_fk',
      columns: [table.tenantId, table.endorsedPlayerId],
      foreignColumns: [playerProfiles.tenantId, playerProfiles.profileId],
    }).onDelete('cascade'),
  }),
);

export type Endorsement = typeof endorsements.$inferSelect;
export type NewEndorsement = typeof endorsements.$inferInsert;
