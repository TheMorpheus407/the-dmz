import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from '../../../shared/database/schema/tenants.js';
import { users } from '../../../shared/database/schema/users.js';

import { gameSessions } from './game-sessions.js';

export const incidentStatuses = [
  'open',
  'investigating',
  'contained',
  'eradicated',
  'recovered',
  'closed',
] as const;
export type IncidentStatus = (typeof incidentStatuses)[number];

export const incidentClassifications = [
  'phishing',
  'supply_chain',
  'insider',
  'infrastructure',
  'apt',
  'zero_day',
  'credential',
  'ddos',
  'breach',
] as const;
export type IncidentClassification = (typeof incidentClassifications)[number];

export const detectionSources = [
  'email_analysis',
  'ids_ips',
  'siem',
  'edr',
  'waf',
  'threat_intel',
  'honeypot',
  'ai_anomaly',
  'manual',
] as const;
export type DetectionSource = (typeof detectionSources)[number];

export const incidents = pgTable(
  'incidents',
  {
    incidentId: uuid('incident_id')
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
    attackId: uuid('attack_id'),
    timestamp: timestamp('timestamp', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    day: integer('day').notNull(),
    detectionSource: varchar('detection_source', { length: 32 }).notNull().$type<DetectionSource>(),
    classification: varchar('classification', { length: 32 })
      .notNull()
      .$type<IncidentClassification>(),
    severity: integer('severity').notNull(),
    affectedAssets: jsonb('affected_assets').$type<string[]>().default([]),
    evidence: jsonb('evidence')
      .$type<{
        indicators: string[];
        logs: string[];
        screenshots?: string[];
        networkPackets?: string[];
      }>()
      .default({ indicators: [], logs: [] }),
    status: varchar('status', { length: 32 }).notNull().$type<IncidentStatus>().default('open'),
    timeline: jsonb('timeline')
      .$type<
        Array<{
          timestamp: string;
          day: number;
          action: string;
          description: string;
          actor: 'system' | 'player';
        }>
      >()
      .default([]),
    responseActions: jsonb('response_actions')
      .$type<
        Array<{
          actionId: string;
          actionType: string;
          timestamp: string;
          day: number;
          effectiveness: number;
          notes?: string;
        }>
      >()
      .default([]),
    outcome: varchar('outcome', { length: 512 }),
    rootCause: varchar('root_cause', { length: 512 }),
    lessonsLearned: varchar('lessons_learned', { length: 1024 }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    resolutionDays: integer('resolution_days'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('incidents_session_idx').on(table.sessionId),
    userIdIdx: index('incidents_user_idx').on(table.userId),
    tenantIdIdx: index('incidents_tenant_idx').on(table.tenantId),
    statusIdx: index('incidents_status_idx').on(table.status),
    severityIdx: index('incidents_severity_idx').on(table.severity),
    dayIdx: index('incidents_day_idx').on(table.day),
    createdAtIdx: index('incidents_created_idx').on(table.createdAt),
    sessionStatusIdx: index('incidents_session_status_idx').on(table.sessionId, table.status),
  }),
);

export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
