import { sql } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { xapiLrsConfig, type XapiLrsConfig } from '../../db/schema/lrs/index.js';

import { encryptSecret } from './xapi-crypto.js';

import type { AppConfig } from '../../config.js';
import type { XapiVersion } from './xapi-verbs.js';

export async function createLrsConfig(
  config: AppConfig,
  tenantId: string,
  data: {
    name: string;
    endpoint: string;
    authKeyId: string;
    authSecret: string;
    version?: XapiVersion;
    enabled?: boolean;
    batchingEnabled?: boolean;
    batchSize?: number;
    retryMaxAttempts?: number;
    retryBaseDelayMs?: number;
  },
): Promise<XapiLrsConfig> {
  const db = getDatabaseClient(config);

  const encryptedSecret = encryptSecret(data.authSecret);

  const [lrsConfig] = await db
    .insert(xapiLrsConfig)
    .values({
      tenantId,
      name: data.name,
      endpoint: data.endpoint,
      authKeyId: data.authKeyId,
      authSecretEncrypted: encryptedSecret,
      version: data.version ?? '1.0.3',
      enabled: data.enabled ?? true,
      batchingEnabled: data.batchingEnabled ?? true,
      batchSize: data.batchSize ?? 10,
      retryMaxAttempts: data.retryMaxAttempts ?? 3,
      retryBaseDelayMs: data.retryBaseDelayMs ?? 1000,
    })
    .returning();

  return lrsConfig!;
}

export async function listLrsConfigs(
  config: AppConfig,
  tenantId: string,
): Promise<XapiLrsConfig[]> {
  const db = getDatabaseClient(config);

  return db
    .select()
    .from(xapiLrsConfig)
    .where(sql`${xapiLrsConfig.tenantId} = ${tenantId}`)
    .orderBy(sql`${xapiLrsConfig.createdAt} desc`);
}

export async function getLrsConfig(
  config: AppConfig,
  configId: string,
  tenantId: string,
): Promise<XapiLrsConfig | undefined> {
  const db = getDatabaseClient(config);

  const [configResult] = await db
    .select()
    .from(xapiLrsConfig)
    .where(sql`${xapiLrsConfig.id} = ${configId} AND ${xapiLrsConfig.tenantId} = ${tenantId}`)
    .limit(1);

  return configResult;
}

export async function updateLrsConfig(
  config: AppConfig,
  configId: string,
  tenantId: string,
  updates: {
    name?: string;
    endpoint?: string;
    authKeyId?: string;
    authSecret?: string;
    version?: string;
    enabled?: boolean;
    batchingEnabled?: boolean;
    batchSize?: number;
    retryMaxAttempts?: number;
    retryBaseDelayMs?: number;
  },
): Promise<XapiLrsConfig | undefined> {
  const db = getDatabaseClient(config);

  const setValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) setValues['name'] = updates.name;
  if (updates.endpoint !== undefined) setValues['endpoint'] = updates.endpoint;
  if (updates.authKeyId !== undefined) setValues['authKeyId'] = updates.authKeyId;
  if (updates.authSecret !== undefined) {
    setValues['authSecretEncrypted'] = encryptSecret(updates.authSecret);
  }
  if (updates.version !== undefined) setValues['version'] = updates.version;
  if (updates.enabled !== undefined) setValues['enabled'] = updates.enabled;
  if (updates.batchingEnabled !== undefined) setValues['batchingEnabled'] = updates.batchingEnabled;
  if (updates.batchSize !== undefined) setValues['batchSize'] = updates.batchSize;
  if (updates.retryMaxAttempts !== undefined)
    setValues['retryMaxAttempts'] = updates.retryMaxAttempts;
  if (updates.retryBaseDelayMs !== undefined)
    setValues['retryBaseDelayMs'] = updates.retryBaseDelayMs;

  const [updated] = await db
    .update(xapiLrsConfig)
    .set(setValues)
    .where(sql`${xapiLrsConfig.id} = ${configId} AND ${xapiLrsConfig.tenantId} = ${tenantId}`)
    .returning();

  return updated;
}

export async function deleteLrsConfig(
  config: AppConfig,
  configId: string,
  tenantId: string,
): Promise<boolean> {
  const db = getDatabaseClient(config);

  const result = await db
    .delete(xapiLrsConfig)
    .where(sql`${xapiLrsConfig.id} = ${configId} AND ${xapiLrsConfig.tenantId} = ${tenantId}`)
    .returning({ id: xapiLrsConfig.id });

  return result.length > 0;
}
