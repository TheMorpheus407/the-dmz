import { sql } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  xapiStatements,
  xapiLrsConfig,
  type XapiStatement,
  type XapiLrsConfig,
} from '../../db/schema/lrs/index.js';

import { decryptSecret } from './xapi-crypto.js';
import { convertSecondsToIso8601 } from './xapi-statement-builder.js';

import type { AppConfig } from '../../config.js';
import type { XapiStatementDoc } from './xapi-statement-builder.js';

export async function sendStatementToLrs(
  lrsConfig: XapiLrsConfig,
  statements: XapiStatementDoc[],
): Promise<{ success: boolean; error?: string }> {
  const authSecret = decryptSecret(lrsConfig.authSecretEncrypted);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${lrsConfig.authKeyId}:${authSecret}`).toString('base64')}`,
    'X-Experience-API-Version': lrsConfig.version,
  };

  const maxRetries = lrsConfig.retryMaxAttempts ?? 3;
  const baseDelay = lrsConfig.retryBaseDelayMs ?? 1000;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${lrsConfig.endpoint}/statements`, {
        method: 'POST',
        headers,
        body: JSON.stringify(statements),
      });

      if (response.ok) {
        return { success: true };
      }

      const errorText = await response.text();
      lastError = new Error(`LRS returned ${response.status}: ${errorText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (attempt < maxRetries - 1) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError?.message ?? 'Unknown error',
  };
}

export function buildStatusUpdate(result: {
  success: boolean;
  error?: string;
}): Record<string, unknown> {
  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (result.success) {
    updateValues['lrsStatus'] = 'sent';
    updateValues['sentAt'] = new Date();
  } else {
    updateValues['lrsStatus'] = 'failed';
    updateValues['lrsError'] = result.error;
    updateValues['retryCount'] = sql`${xapiStatements.retryCount} + 1`;
  }

  return updateValues;
}

export async function sendPendingStatements(
  config: AppConfig,
  tenantId: string,
): Promise<{ sent: number; failed: number }> {
  const db = getDatabaseClient(config);

  const pendingStatements = await db
    .select()
    .from(xapiStatements)
    .where(
      sql`${xapiStatements.tenantId} = ${tenantId} AND ${xapiStatements.lrsStatus} = 'pending' AND ${xapiStatements.archived} = false`,
    )
    .orderBy(sql`${xapiStatements.storedAt} asc`)
    .limit(100);

  if (pendingStatements.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const lrsConfigs = await db
    .select()
    .from(xapiLrsConfig)
    .where(sql`${xapiLrsConfig.tenantId} = ${tenantId} AND ${xapiLrsConfig.enabled} = true`)
    .limit(1);

  if (lrsConfigs.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const lrsConfig = lrsConfigs[0];
  if (!lrsConfig) {
    return { sent: 0, failed: 0 };
  }

  const stmtObjects: XapiStatementDoc[] = pendingStatements.map(buildStatementFromRow);

  const result = await sendStatementToLrs(lrsConfig, stmtObjects);

  const updateValues = buildStatusUpdate(result);

  await db
    .update(xapiStatements)
    .set(updateValues)
    .where(
      sql`${xapiStatements.tenantId} = ${tenantId} AND ${xapiStatements.id} IN (${pendingStatements.map((s) => s.id).join(',')})`,
    );

  return {
    sent: result.success ? pendingStatements.length : 0,
    failed: result.success ? 0 : pendingStatements.length,
  };
}

export function buildStatementFromRow(row: XapiStatement): XapiStatementDoc {
  const doc: XapiStatementDoc = {
    id: row['statementId'],
    actor: {
      objectType: 'Agent',
      mbox: row['actorMbox'],
      name: row['actorName'],
    },
    verb: {
      id: row['verbId'],
      display: row['verbDisplay'] as Record<string, string>,
    },
    object: {
      objectType: 'Activity',
      id: row['objectId'],
    },
    timestamp: row['storedAt'].toISOString(),
    stored: row['storedAt'].toISOString(),
  };

  if (row['objectName'] || row['objectDescription']) {
    doc.object.definition = {};
    if (row['objectName']) {
      doc.object.definition['name'] = { 'en-US': row['objectName'] };
    }
    if (row['objectDescription']) {
      doc.object.definition['description'] = { 'en-US': row['objectDescription'] };
    }
  }

  if (row['resultScore'] !== null || row['resultSuccess'] !== null) {
    doc.result = {};
    if (row['resultScore'] !== null) {
      doc.result.score = {
        raw: row['resultScore'],
        min: 0,
        max: 100,
        scaled: (row['resultScore'] ?? 0) / 100,
      };
    }
    if (row['resultSuccess'] !== null) {
      doc.result.success = row['resultSuccess'];
    }
    if (row['resultCompletion'] !== null) {
      doc.result.completion = row['resultCompletion'];
    }
    if (row['resultDuration']) {
      doc.result.duration = convertSecondsToIso8601(row['resultDuration']);
    }
  }

  return doc;
}
