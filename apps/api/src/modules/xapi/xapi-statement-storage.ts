import { sql } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  xapiStatements,
  type XapiStatement,
  type NewXapiStatement,
} from '../../db/schema/lrs/index.js';

import type { AppConfig } from '../../config.js';
import type { XapiStatementDoc } from './xapi-statement-builder.js';

function parseIso8601DurationToSeconds(duration: string | undefined): number | null {
  if (!duration) return null;

  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;

  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const seconds = parseInt(match[3] ?? '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

function extractObjectName(statement: XapiStatementDoc): string | null {
  return statement.object.definition?.name?.['en-US'] ?? null;
}

function extractObjectDescription(statement: XapiStatementDoc): string | null {
  return statement.object.definition?.description?.['en-US'] ?? null;
}

function extractResultScore(statement: XapiStatementDoc): number | null {
  return statement.result?.score?.raw ?? null;
}

function buildStatementData(
  statement: XapiStatementDoc,
  tenantId: string,
  lrsEndpoint?: string,
): NewXapiStatement {
  const resultDuration = statement.result
    ? parseIso8601DurationToSeconds(statement.result.duration)
    : null;

  return {
    tenantId,
    statementId: statement.id,
    statementVersion: '1.0.3',
    actorMbox: statement.actor.mbox,
    actorName: statement.actor.name,
    verbId: statement.verb.id,
    verbDisplay: statement.verb.display,
    objectId: statement.object.id,
    objectType: statement.object.objectType,
    objectName: extractObjectName(statement),
    objectDescription: extractObjectDescription(statement),
    resultScore: extractResultScore(statement),
    resultSuccess: statement.result?.success ?? null,
    resultCompletion: statement.result?.completion ?? null,
    resultDuration,
    archived: false,
    lrsEndpoint: lrsEndpoint ?? null,
    lrsStatus: lrsEndpoint ? 'pending' : 'disabled',
  };
}

export async function storeXapiStatement(
  config: AppConfig,
  tenantId: string,
  statement: XapiStatementDoc,
  lrsEndpoint?: string,
): Promise<XapiStatement> {
  const db = getDatabaseClient(config);
  const statementData = buildStatementData(statement, tenantId, lrsEndpoint);
  const [stored] = await db.insert(xapiStatements).values(statementData).returning();
  return stored!;
}

export async function listXapiStatements(
  config: AppConfig,
  tenantId: string,
  options?: {
    limit?: number;
    offset?: number;
    verbId?: string;
    since?: Date;
    until?: Date;
  },
): Promise<XapiStatement[]> {
  const db = getDatabaseClient(config);

  const conditions = [sql`${xapiStatements.tenantId} = ${tenantId}`];

  if (options?.verbId) {
    conditions.push(sql`${xapiStatements.verbId} = ${options.verbId}`);
  }

  if (options?.since) {
    conditions.push(sql`${xapiStatements.storedAt} >= ${options.since}`);
  }

  if (options?.until) {
    conditions.push(sql`${xapiStatements.storedAt} <= ${options.until}`);
  }

  const query = db
    .select()
    .from(xapiStatements)
    .where(
      sql`${conditions[0]}${conditions.slice(1).reduce((acc, c) => sql`${acc} AND ${c}`, sql``)}`,
    )
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0)
    .orderBy(sql`${xapiStatements.storedAt} desc`);

  return query;
}

export async function getXapiStatement(
  config: AppConfig,
  statementId: string,
  tenantId: string,
): Promise<XapiStatement | undefined> {
  const db = getDatabaseClient(config);

  const [statement] = await db
    .select()
    .from(xapiStatements)
    .where(sql`${xapiStatements.id} = ${statementId} AND ${xapiStatements.tenantId} = ${tenantId}`)
    .limit(1);

  return statement;
}

export async function archiveXapiStatements(
  config: AppConfig,
  tenantId: string,
  beforeDate: Date,
): Promise<number> {
  const db = getDatabaseClient(config);

  const result = await db
    .update(xapiStatements)
    .set({ archived: true, updatedAt: new Date() })
    .where(
      sql`${xapiStatements.tenantId} = ${tenantId} AND ${xapiStatements.storedAt} < ${beforeDate} AND ${xapiStatements.archived} = false`,
    )
    .returning({ id: xapiStatements.id });

  return result.length;
}
