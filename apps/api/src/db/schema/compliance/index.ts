import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgSchema,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const complianceSchema = pgSchema('compliance');

export const complianceSnapshots = complianceSchema.table(
  'compliance_snapshots',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v7()`),
    tenantId: uuid('tenant_id').notNull(),
    frameworkId: varchar('framework_id', { length: 32 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('not_started'),
    completionPercentage: real('completion_percentage').notNull().default(0),
    lastAssessedAt: timestamp('last_assessed_at', { withTimezone: true, mode: 'date' }),
    nextAssessmentDue: timestamp('next_assessment_due', { withTimezone: true, mode: 'date' }),
    requirements: jsonb('requirements').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),
    snapshotDate: timestamp('snapshot_date', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('compliance_snapshots_tenant_idx').on(table.tenantId),
    frameworkIdx: index('compliance_snapshots_framework_idx').on(table.frameworkId),
    snapshotDateIdx: index('compliance_snapshots_snapshot_date_idx').on(table.snapshotDate),
    tenantFrameworkIdx: index('compliance_snapshots_tenant_framework_idx').on(
      table.tenantId,
      table.frameworkId,
    ),
  }),
);

export type ComplianceSnapshot = typeof complianceSnapshots.$inferSelect;
export type NewComplianceSnapshot = typeof complianceSnapshots.$inferInsert;

export const frameworkRequirements = complianceSchema.table(
  'framework_requirements',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuid_generate_v7()`),
    tenantId: uuid('tenant_id').notNull(),
    frameworkId: varchar('framework_id', { length: 32 }).notNull(),
    requirementId: varchar('requirement_id', { length: 64 }).notNull(),
    requirementName: varchar('requirement_name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 128 }),
    isRequired: integer('is_required').notNull().default(1),
    minCompetencyScore: integer('min_competency_score').notNull().default(0),
    requiredTrainingModules: jsonb('required_training_modules').notNull().default([]),
    status: varchar('status', { length: 32 }).notNull().default('not_started'),
    completionPercentage: real('completion_percentage').notNull().default(0),
    lastAssessedAt: timestamp('last_assessed_at', { withTimezone: true, mode: 'date' }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('framework_requirements_tenant_idx').on(table.tenantId),
    frameworkIdx: index('framework_requirements_framework_idx').on(table.frameworkId),
    tenantFrameworkReqIdx: index('framework_requirements_tenant_framework_req_idx').on(
      table.tenantId,
      table.frameworkId,
      table.requirementId,
    ),
  }),
);

export type FrameworkRequirement = typeof frameworkRequirements.$inferSelect;
export type NewFrameworkRequirement = typeof frameworkRequirements.$inferInsert;
