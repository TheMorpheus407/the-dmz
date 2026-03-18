import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { sql } from 'drizzle-orm';

import { GAME_EVENT_TYPES, type GameEventType } from '@the-dmz/shared';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  xapiStatements,
  xapiLrsConfig,
  type XapiStatement,
  type XapiLrsConfig,
  type NewXapiStatement,
} from '../../db/schema/lrs/index.js';

import type { AppConfig } from '../../config.js';

export type XapiVersion = '1.0.3' | '2.0';

export const XAPI_VERBS = {
  COMPLETED: {
    id: 'http://adlnet.gov/expapi/verbs/completed',
    display: { 'en-US': 'completed' },
  },
  PASSED: {
    id: 'http://adlnet.gov/expapi/verbs/passed',
    display: { 'en-US': 'passed' },
  },
  EXPERIENCED: {
    id: 'http://adlnet.gov/expapi/verbs/experienced',
    display: { 'en-US': 'experienced' },
  },
  ANSWERED: {
    id: 'http://adlnet.gov/expapi/verbs/answered',
    display: { 'en-US': 'answered' },
  },
  ATTEMPTED: {
    id: 'http://adlnet.gov/expapi/verbs/attempted',
    display: { 'en-US': 'attempted' },
  },
  CORRECT: {
    id: 'https://the-dmz.example.com/xapi/verbs/correct',
    display: { 'en-US': 'correct' },
  },
  INCORRECT: {
    id: 'https://the-dmz.example.com/xapi/verbs/incorrect',
    display: { 'en-US': 'incorrect' },
  },
  LAUNCHED: {
    id: 'http://adlnet.gov/expapi/verbs/launched',
    display: { 'en-US': 'launched' },
  },
  INITIALIZED: {
    id: 'http://adlnet.gov/expapi/verbs/initialized',
    display: { 'en-US': 'initialized' },
  },
  TERMINATED: {
    id: 'http://adlnet.gov/expapi/verbs/terminated',
    display: { 'en-US': 'terminated' },
  },
} as const;

export type XapiVerbId = keyof typeof XAPI_VERBS;

export const DMZ_VERB_MAP: Record<GameEventType, XapiVerbId | null> = {
  [GAME_EVENT_TYPES.SESSION_STARTED]: 'LAUNCHED',
  [GAME_EVENT_TYPES.SESSION_COMPLETED]: 'COMPLETED',
  [GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED]: 'ATTEMPTED',
  [GAME_EVENT_TYPES.EMAIL_DECISION_RESOLVED]: null,
  [GAME_EVENT_TYPES.DAY_ENDED]: 'COMPLETED',
  [GAME_EVENT_TYPES.BREACH_OCCURRED]: 'EXPERIENCED',
  [GAME_EVENT_TYPES.GAME_OVER]: 'EXPERIENCED',
  [GAME_EVENT_TYPES.VERIFICATION_PACKET_GENERATED]: 'ANSWERED',
  [GAME_EVENT_TYPES.INCIDENT_CREATED]: 'EXPERIENCED',
  [GAME_EVENT_TYPES.INCIDENT_RESOLVED]: 'COMPLETED',
  [GAME_EVENT_TYPES.UPGRADE_PURCHASED]: 'COMPLETED',
  [GAME_EVENT_TYPES.FACILITY_TIER_UPGRADED]: 'PASSED',
  [GAME_EVENT_TYPES.FACILITY_UPGRADE_COMPLETED]: 'COMPLETED',
  [GAME_EVENT_TYPES.FUNDS_MODIFIED]: null,
  [GAME_EVENT_TYPES.TRUST_MODIFIED]: null,
  [GAME_EVENT_TYPES.FACTION_MODIFIED]: null,
  [GAME_EVENT_TYPES.BACKLOG_PRESSURE_CHANGED]: null,
  [GAME_EVENT_TYPES.THREATS_GENERATED]: null,
  [GAME_EVENT_TYPES.INCIDENT_STATUS_CHANGED]: null,
  [GAME_EVENT_TYPES.INCIDENT_RESPONSE_ACTION]: null,
  [GAME_EVENT_TYPES.INCIDENT_CONTAINED]: 'COMPLETED',
  [GAME_EVENT_TYPES.INCIDENT_ERADICATED]: 'COMPLETED',
  [GAME_EVENT_TYPES.INCIDENT_RECOVERED]: 'COMPLETED',
  [GAME_EVENT_TYPES.INCIDENT_CLOSED]: 'COMPLETED',
  [GAME_EVENT_TYPES.BREACH_RANSOM_PAID]: 'COMPLETED',
  [GAME_EVENT_TYPES.BREACH_RANSOM_REFUSED]: 'INCORRECT',
  [GAME_EVENT_TYPES.BREACH_RECOVERY_COMPLETED]: 'PASSED',
  [GAME_EVENT_TYPES.EMAIL_OPENED]: 'EXPERIENCED',
  [GAME_EVENT_TYPES.EMAIL_INDICATOR_MARKED]: 'ANSWERED',
  [GAME_EVENT_TYPES.EMAIL_VERIFICATION_REQUESTED]: 'ATTEMPTED',
  [GAME_EVENT_TYPES.VERIFICATION_DISCREPANCY_FLAGGED]: 'CORRECT',
  [GAME_EVENT_TYPES.CONSEQUENCES_APPLIED]: null,
  [GAME_EVENT_TYPES.RESOURCE_ADJUSTED]: null,
  [GAME_EVENT_TYPES.SESSION_PAUSED]: 'TERMINATED',
  [GAME_EVENT_TYPES.SESSION_RESUMED]: 'INITIALIZED',
  [GAME_EVENT_TYPES.SESSION_ABANDONED]: 'TERMINATED',
  [GAME_EVENT_TYPES.DAY_STARTED]: 'LAUNCHED',
  [GAME_EVENT_TYPES.INBOX_GENERATED]: 'EXPERIENCED',
  [GAME_EVENT_TYPES.BREACH_RANSOM_DISPLAYED]: 'EXPERIENCED',
  [GAME_EVENT_TYPES.BREACH_RECOVERY_STARTED]: 'ATTEMPTED',
  [GAME_EVENT_TYPES.BREACH_POST_EFFECTS_STARTED]: 'EXPERIENCED',
  [GAME_EVENT_TYPES.FACILITY_CLIENT_ONBOARDED]: 'COMPLETED',
  [GAME_EVENT_TYPES.FACILITY_CLIENT_EVICTED]: 'EXPERIENCED',
  [GAME_EVENT_TYPES.FACILITY_RESOURCE_CRITICAL]: 'EXPERIENCED',
  [GAME_EVENT_TYPES.FACILITY_UPGRADE_PURCHASED]: 'ATTEMPTED',
  [GAME_EVENT_TYPES.FACILITY_TICK_PROCESSED]: null,
};

export interface XapiActor {
  objectType: 'Agent';
  mbox: string;
  name: string;
}

export interface XapiVerb {
  id: string;
  display: Record<string, string>;
}

export interface XapiActivity {
  objectType: 'Activity';
  id: string;
  definition?: {
    name?: Record<string, string>;
    description?: Record<string, string>;
    type?: string;
  };
}

export interface XapiResult {
  score?: {
    scaled?: number;
    raw?: number;
    min?: number;
    max?: number;
  };
  success?: boolean;
  completion?: boolean;
  duration?: string;
}

export interface XapiContext {
  registration?: string;
  contextActivities?: {
    parent?: XapiActivity[];
    grouping?: XapiActivity[];
    category?: XapiActivity[];
  };
  extensions?: Record<string, unknown>;
}

export interface XapiStatementTemplate {
  actor: XapiActor;
  verb: XapiVerb;
  object: XapiActivity;
  result?: XapiResult;
  context?: XapiContext;
  timestamp?: string;
}

export interface XapiStatementDoc extends XapiStatementTemplate {
  id: string;
  stored: string;
  authority?: XapiActor;
}

const EXTENSION_TENANT = 'https://the-dmz.example.com/xapi/extensions/tenant';
const EXTENSION_CAMPAIGN = 'https://the-dmz.example.com/xapi/extensions/campaign';
const EXTENSION_COMPETENCY_DOMAIN = 'https://the-dmz.example.com/xapi/extensions/competency-domain';
const EXTENSION_DIFFICULTY_LEVEL = 'https://the-dmz.example.com/xapi/extensions/difficulty-level';

export function generateStatementId(): string {
  return randomBytes(16).toString('hex');
}

export function generateXapiStatement(
  actor: XapiActor,
  verb: XapiVerb,
  object: XapiActivity,
  options?: {
    result?: XapiResult;
    context?: XapiContext;
    version?: XapiVersion;
    timestamp?: Date;
  },
): XapiStatementDoc {
  const version = options?.version ?? '1.0.3';
  const timestamp = options?.timestamp ?? new Date();

  const statement: XapiStatementDoc = {
    id: generateStatementId(),
    actor,
    verb,
    object,
    stored: timestamp.toISOString(),
    timestamp: timestamp.toISOString(),
  };

  if (options?.result) {
    statement.result = options.result;
  }

  if (options?.context) {
    statement.context = options.context;
  }

  if (version === '2.0') {
    statement.authority = {
      objectType: 'Agent',
      mbox: 'mailto:system@the-dmz.example.com',
      name: 'The DMZ System',
    };
  }

  return statement;
}

export function buildActorFromUser(email: string, name: string): XapiActor {
  return {
    objectType: 'Agent',
    mbox: `mailto:${email}`,
    name,
  };
}

export function buildActivityFromGameContent(
  activityId: string,
  name: string,
  description?: string,
  activityType?: string,
): XapiActivity {
  const activity: XapiActivity = {
    objectType: 'Activity',
    id: `https://the-dmz.example.com/xapi/activities/${activityId}`,
  };

  if (name || description || activityType) {
    activity.definition = {};
    if (name) {
      activity.definition.name = { 'en-US': name };
    }
    if (description) {
      activity.definition.description = { 'en-US': description };
    }
    if (activityType) {
      activity.definition.type = activityType;
    }
  }

  return activity;
}

export function buildResultFromDecision(
  isCorrect: boolean,
  score?: number,
  durationSeconds?: number,
): XapiResult {
  const result: XapiResult = {
    success: isCorrect,
    completion: true,
  };

  if (score !== undefined) {
    result.score = {
      raw: score,
      min: 0,
      max: 100,
      scaled: score / 100,
    };
  }

  if (durationSeconds !== undefined) {
    result.duration = convertSecondsToIso8601(durationSeconds);
  }

  return result;
}

export function convertSecondsToIso8601(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (minutes > 0) duration += `${minutes}M`;
  if (secs > 0 || duration === 'PT') duration += `${secs}S`;

  return duration;
}

export function buildContext(
  options: {
    tenantId?: string;
    sessionId?: string;
    campaignId?: string;
    campaignSessionId?: string;
    competencyDomain?: string;
    difficultyLevel?: string;
  } = {},
): XapiContext {
  const context: XapiContext = {
    extensions: {},
  };

  if (options.tenantId) {
    context.extensions![EXTENSION_TENANT] = options.tenantId;
  }
  if (options.campaignId) {
    context.extensions![EXTENSION_CAMPAIGN] = options.campaignId;
  }
  if (options.competencyDomain) {
    context.extensions![EXTENSION_COMPETENCY_DOMAIN] = options.competencyDomain;
  }
  if (options.difficultyLevel) {
    context.extensions![EXTENSION_DIFFICULTY_LEVEL] = options.difficultyLevel;
  }

  if (options.sessionId || options.campaignSessionId) {
    context.contextActivities = {};
    if (options.sessionId) {
      context.registration = options.sessionId;
    }
    if (options.campaignSessionId) {
      context.contextActivities.grouping = [
        {
          objectType: 'Activity',
          id: `https://the-dmz.example.com/xapi/activities/campaign-session/${options.campaignSessionId}`,
        },
      ];
    }
  }

  return context;
}

export function getVerbFromMapping(eventType: GameEventType): XapiVerb | null {
  const verbKey = DMZ_VERB_MAP[eventType];
  if (!verbKey) return null;
  return XAPI_VERBS[verbKey];
}

export function isCorrectDecisionVerb(verb: XapiVerb): boolean {
  return verb.id === XAPI_VERBS.CORRECT.id || verb.id === XAPI_VERBS.PASSED.id;
}

export function isIncorrectDecisionVerb(verb: XapiVerb): boolean {
  return verb.id === XAPI_VERBS.INCORRECT.id;
}

export function convertStatementToJson(statement: XapiStatementDoc): Record<string, unknown> {
  return {
    id: statement.id,
    actor: statement.actor,
    verb: statement.verb,
    object: statement.object,
    result: statement.result,
    context: statement.context,
    timestamp: statement.timestamp,
    stored: statement.stored,
    authority: statement.authority,
  };
}

export async function storeXapiStatement(
  config: AppConfig,
  tenantId: string,
  statement: XapiStatementDoc,
  lrsEndpoint?: string,
): Promise<XapiStatement> {
  const db = getDatabaseClient(config);

  const statementData: NewXapiStatement = {
    tenantId,
    statementId: statement.id,
    statementVersion: '1.0.3',
    actorMbox: statement.actor.mbox,
    actorName: statement.actor.name,
    verbId: statement.verb.id,
    verbDisplay: statement.verb.display,
    objectId: statement.object.id,
    objectType: statement.object.objectType,
    objectName: statement.object.definition?.name?.['en-US'] ?? null,
    objectDescription: statement.object.definition?.description?.['en-US'] ?? null,
    resultScore: statement.result?.score?.raw ?? null,
    resultSuccess: statement.result?.success ?? null,
    resultCompletion: statement.result?.completion ?? null,
    resultDuration: statement.result
      ? parseIso8601DurationToSeconds(statement.result.duration)
      : null,
    archived: false,
    lrsEndpoint: lrsEndpoint ?? null,
    lrsStatus: lrsEndpoint ? 'pending' : 'disabled',
  };

  const [stored] = await db.insert(xapiStatements).values(statementData).returning();

  return stored!;
}

function parseIso8601DurationToSeconds(duration: string | undefined): number | null {
  if (!duration) return null;

  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;

  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  const seconds = parseInt(match[3] ?? '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
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

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_LENGTH = 32;
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env['XAPI_ENCRYPTION_KEY'];
  if (!key || key.length < ENCRYPTION_KEY_LENGTH) {
    throw new Error('XAPI_ENCRYPTION_KEY must be at least 32 characters');
  }
  return Buffer.from(key.slice(0, ENCRYPTION_KEY_LENGTH), 'utf-8');
}

export function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decryptSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, encryptedData] = encrypted.split(':');

  if (!ivHex || !tagHex || !encryptedData) {
    throw new Error('Invalid encrypted secret format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

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

  const stmtObjects: XapiStatementDoc[] = [];
  for (const stmt of pendingStatements) {
    const doc: XapiStatementDoc = {
      id: stmt['statementId'],
      actor: {
        objectType: 'Agent',
        mbox: stmt['actorMbox'],
        name: stmt['actorName'],
      },
      verb: {
        id: stmt['verbId'],
        display: stmt['verbDisplay'] as Record<string, string>,
      },
      object: {
        objectType: 'Activity',
        id: stmt['objectId'],
      },
      timestamp: stmt['storedAt'].toISOString(),
      stored: stmt['storedAt'].toISOString(),
    };

    if (stmt['objectName'] || stmt['objectDescription']) {
      doc.object.definition = {};
      if (stmt['objectName']) {
        doc.object.definition['name'] = { 'en-US': stmt['objectName'] };
      }
      if (stmt['objectDescription']) {
        doc.object.definition['description'] = { 'en-US': stmt['objectDescription'] };
      }
    }

    if (stmt['resultScore'] !== null || stmt['resultSuccess'] !== null) {
      doc.result = {};
      if (stmt['resultScore'] !== null) {
        doc.result.score = {
          raw: stmt['resultScore'],
          min: 0,
          max: 100,
          scaled: (stmt['resultScore'] ?? 0) / 100,
        };
      }
      if (stmt['resultSuccess'] !== null) {
        doc.result.success = stmt['resultSuccess'];
      }
      if (stmt['resultCompletion'] !== null) {
        doc.result.completion = stmt['resultCompletion'];
      }
      if (stmt['resultDuration']) {
        doc.result.duration = convertSecondsToIso8601(stmt['resultDuration']);
      }
    }

    stmtObjects.push(doc);
  }

  const result = await sendStatementToLrs(lrsConfig, stmtObjects);

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
