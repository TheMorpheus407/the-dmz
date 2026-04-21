import { eq, and, desc } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { getRedisClient, type RedisRateLimitClient } from '../../shared/database/redis.js';
import {
  quickSignalTemplates,
  playerQuickSignalUsage,
  type QuickSignalTemplate,
  type PlayerQuickSignalUsage,
  type SignalCategory,
  signalCategories,
} from '../../db/schema/social/index.js';
import { evaluateFlag } from '../feature-flags/index.js';
import {
  buildChannelName,
  type WebSocketGatewayInterface,
  type WSServerMessage,
} from '../notification/websocket/index.js';

import type { AppConfig } from '../../config.js';

const QUICK_SIGNAL_RATE_LIMIT_MAX = 10;
const QUICK_SIGNAL_RATE_LIMIT_WINDOW_MS = 60_000;
const QUICK_SIGNAL_RATE_LIMIT_KEY_PREFIX = 'quick-signal';

export interface SignalTemplateResult {
  success: boolean;
  templates?: QuickSignalTemplate[];
  error?: string;
}

export interface SignalSendInput {
  signalKey: string;
  sessionId?: string;
  targetPlayerId?: string;
  context?: Record<string, unknown>;
}

export interface SignalSendResult {
  success: boolean;
  usage?: PlayerQuickSignalUsage;
  error?: string;
  rateLimited?: boolean;
  retryAfterMs?: number;
}

export interface SessionSignalResult {
  success: boolean;
  signals?: PlayerQuickSignalUsage[];
  error?: string;
}

export interface PlayerSignalHistoryResult {
  success: boolean;
  signals?: PlayerQuickSignalUsage[];
  error?: string;
}

interface RateLimitResult {
  allowed: boolean;
  current: number;
  retryAfterMs?: number;
}

async function checkSignalRateLimit(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  redisClient?: RedisRateLimitClient,
): Promise<RateLimitResult> {
  const client = redisClient ?? getRedisClient(config);

  if (!client) {
    return { allowed: true, current: 0 };
  }

  try {
    const key = `${QUICK_SIGNAL_RATE_LIMIT_KEY_PREFIX}:${tenantId}:${playerId}`;
    const result = await client.incrementRateLimitKey({
      key,
      timeWindowMs: QUICK_SIGNAL_RATE_LIMIT_WINDOW_MS,
      max: QUICK_SIGNAL_RATE_LIMIT_MAX,
      continueExceeding: false,
      exponentialBackoff: false,
    });

    if (result.current > QUICK_SIGNAL_RATE_LIMIT_MAX) {
      return {
        allowed: false,
        current: result.current,
        retryAfterMs: result.ttl,
      };
    }

    return { allowed: true, current: result.current };
  } catch {
    return { allowed: true, current: 0 };
  }
}

export async function getActiveTemplates(
  config: AppConfig,
  _tenantId: string,
): Promise<SignalTemplateResult> {
  const db = getDatabaseClient(config);

  const templates = await db.query.quickSignalTemplates.findMany({
    where: and(eq(quickSignalTemplates.isActive, true)),
    orderBy: [desc(quickSignalTemplates.category), quickSignalTemplates.sortOrder],
  });

  return { success: true, templates };
}

export async function sendSignal(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  input: SignalSendInput,
  redisClient?: RedisRateLimitClient,
  gateway?: WebSocketGatewayInterface,
): Promise<SignalSendResult> {
  const quickSignalsEnabled = await evaluateFlag(config, tenantId, 'social.quick_signals_enabled');
  if (!quickSignalsEnabled) {
    return { success: false, error: 'Quick Signals system is disabled' };
  }

  const rateLimitResult = await checkSignalRateLimit(config, tenantId, playerId, redisClient);
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded. Maximum 10 signals per minute.',
      rateLimited: true,
      retryAfterMs: rateLimitResult.retryAfterMs ?? 60000,
    };
  }

  const db = getDatabaseClient(config);

  const template = await db.query.quickSignalTemplates.findFirst({
    where: and(
      eq(quickSignalTemplates.signalKey, input.signalKey),
      eq(quickSignalTemplates.isActive, true),
    ),
  });

  if (!template) {
    return { success: false, error: 'Invalid or inactive signal key' };
  }

  const [usage] = await db
    .insert(playerQuickSignalUsage)
    .values({
      playerId,
      tenantId,
      sessionId: input.sessionId ?? null,
      signalKey: input.signalKey,
      targetPlayerId: input.targetPlayerId ?? null,
      context: input.context ?? {},
    })
    .returning();

  if (input.sessionId && gateway) {
    const channel = buildChannelName('signals', input.sessionId);
    const message: WSServerMessage = gateway.createMessage('QUICK_SIGNAL', {
      signalKey: input.signalKey,
      playerId,
      targetPlayerId: input.targetPlayerId ?? null,
      context: input.context ?? {},
      icon: template.icon,
      label: template.label,
      timestamp: new Date().toISOString(),
    });
    gateway.broadcastToChannel(channel, message);
  }

  if (usage) {
    return { success: true, usage };
  }
  return { success: true };
}

export async function getSessionSignals(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  limit = 50,
): Promise<SessionSignalResult> {
  const quickSignalsEnabled = await evaluateFlag(config, tenantId, 'social.quick_signals_enabled');
  if (!quickSignalsEnabled) {
    return { success: false, error: 'Quick Signals system is disabled' };
  }

  const db = getDatabaseClient(config);

  const signals = await db.query.playerQuickSignalUsage.findMany({
    where: and(
      eq(playerQuickSignalUsage.sessionId, sessionId),
      eq(playerQuickSignalUsage.tenantId, tenantId),
    ),
    orderBy: [desc(playerQuickSignalUsage.sentAt)],
    limit,
  });

  return { success: true, signals };
}

export async function getPlayerHistory(
  config: AppConfig,
  tenantId: string,
  playerId: string,
  limit = 50,
): Promise<PlayerSignalHistoryResult> {
  const quickSignalsEnabled = await evaluateFlag(config, tenantId, 'social.quick_signals_enabled');
  if (!quickSignalsEnabled) {
    return { success: false, error: 'Quick Signals system is disabled' };
  }

  const db = getDatabaseClient(config);

  const signals = await db.query.playerQuickSignalUsage.findMany({
    where: and(
      eq(playerQuickSignalUsage.playerId, playerId),
      eq(playerQuickSignalUsage.tenantId, tenantId),
    ),
    orderBy: [desc(playerQuickSignalUsage.sentAt)],
    limit,
  });

  return { success: true, signals };
}

export async function getTemplatesGroupedByCategory(
  config: AppConfig,
  tenantId: string,
): Promise<{
  success: boolean;
  templates?: Record<SignalCategory, QuickSignalTemplate[]>;
  error?: string;
}> {
  const result = await getActiveTemplates(config, tenantId);

  if (!result.success || !result.templates) {
    return { success: false, error: result.error ?? 'Failed to get templates' };
  }

  const grouped: Record<SignalCategory, QuickSignalTemplate[]> = {
    decision: [],
    urgency: [],
    coordination: [],
    resource: [],
  };

  for (const template of result.templates) {
    const category = template.category;
    if (signalCategories.includes(category) && grouped[category]) {
      grouped[category].push(template);
    }
  }

  return { success: true, templates: grouped };
}

export type { SignalCategory, QuickSignalTemplate, PlayerQuickSignalUsage };
