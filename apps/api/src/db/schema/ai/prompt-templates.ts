import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';

import type { PromptTemplateCategory } from '../../../modules/ai-pipeline/prompt-template-category.js';

const aiSchema = pgSchema('ai');

export const promptTemplates = aiSchema.table(
  'prompt_templates',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.tenantId, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 64 }).$type<PromptTemplateCategory>().notNull(),
    description: text('description'),
    attackType: varchar('attack_type', { length: 100 }),
    threatLevel: varchar('threat_level', { length: 20 }),
    difficulty: integer('difficulty'),
    season: integer('season'),
    chapter: integer('chapter'),
    systemPrompt: text('system_prompt').notNull(),
    userTemplate: text('user_template').notNull(),
    outputSchema: jsonb('output_schema').notNull().default({}),
    version: varchar('version', { length: 32 }).notNull(),
    tokenBudget: integer('token_budget').notNull().default(1200),
    isActive: boolean('is_active').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('ai_prompt_templates_tenant_idx').on(table.tenantId),
    categoryIdx: index('ai_prompt_templates_category_idx').on(table.category),
    activeIdx: index('ai_prompt_templates_active_idx').on(table.isActive),
    versionIdx: index('ai_prompt_templates_version_idx').on(table.version),
    selectionIdx: index('ai_prompt_templates_selection_idx').on(
      table.category,
      table.attackType,
      table.season,
      table.difficulty,
    ),
    nameVersionIdx: uniqueIndex('ai_prompt_templates_name_version_idx').on(
      table.tenantId,
      table.name,
      table.version,
    ),
    versionCheck: check(
      'ai_prompt_templates_version_check',
      sql`${table.version} ~ '^[0-9]+\\.[0-9]+\\.[0-9]+$'`,
    ),
  }),
);

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type NewPromptTemplate = typeof promptTemplates.$inferInsert;
