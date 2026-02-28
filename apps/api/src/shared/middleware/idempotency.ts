import crypto from 'node:crypto';

import { eq, and } from 'drizzle-orm';

import {
  IDEMPOTENCY_KEY_FORMAT,
  IdempotencyOutcome,
  isIdempotencyRequiredForMethod,
  validateIdempotencyKey,
  generateFingerprint,
} from '@the-dmz/shared';

import { getDatabaseClient, type DB } from '../database/connection.js';
import { idempotencyRecords } from '../../db/schema/idempotency.js';

import { AppError, ErrorCodes } from './error-handler.js';

import type { FastifyRequest, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';
import type { IdempotencyRecord } from '../../db/schema/idempotency.js';

const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const REPLAY_HEADER = 'X-Idempotency-Replay';
const OUTCOME_HEADER = 'X-Idempotency-Outcome';
const IDEMPOTENCY_TTL_SECONDS = 86400;

const hashKey = (key: string): string => {
  return crypto.createHash('sha256').update(key).digest('hex').substring(0, 64);
};

const extractTenantId = (request: FastifyRequest): string | undefined => {
  if (request.tenantContext?.tenantId) {
    return request.tenantContext.tenantId;
  }
  return undefined;
};

const extractActorId = (request: FastifyRequest): string | null => {
  if (request.user?.userId) {
    return request.user.userId;
  }
  return null;
};

const isIdempotencyEnabledRoute = (request: FastifyRequest): boolean => {
  const method = request.method.toUpperCase();
  const route = request.routeOptions?.url || request.url;

  if (!isIdempotencyRequiredForMethod(method)) {
    return false;
  }

  const exemptPaths = [
    '/health',
    '/ready',
    '/auth/refresh',
    '/auth/login',
    '/auth/profile',
    '/api/v1/auth/profile',
  ];
  if (exemptPaths.some((path) => route.startsWith(path))) {
    return false;
  }

  return true;
};

const getIdempotencyRecord = async (
  db: DB,
  tenantId: string,
  keyHash: string,
): Promise<IdempotencyRecord | undefined> => {
  const records = await db
    .select()
    .from(idempotencyRecords)
    .where(and(eq(idempotencyRecords.tenantId, tenantId), eq(idempotencyRecords.keyHash, keyHash)))
    .limit(1);

  return records[0];
};

const createInProgressRecord = async (
  db: DB,
  tenantId: string,
  actorId: string | null,
  route: string,
  method: string,
  keyHash: string,
  keyValue: string,
  fingerprint: string,
): Promise<IdempotencyRecord> => {
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_SECONDS * 1000);

  const [record] = await db
    .insert(idempotencyRecords)
    .values({
      tenantId,
      actorId,
      route,
      method,
      keyHash,
      keyValue,
      fingerprint,
      status: IdempotencyOutcome.IN_PROGRESS,
      responseStatus: null,
      responseBody: null,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [idempotencyRecords.tenantId, idempotencyRecords.keyHash],
      set: {
        status: IdempotencyOutcome.IN_PROGRESS,
        fingerprint,
      },
    })
    .returning();

  if (!record) {
    throw new AppError({
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
      message: 'Failed to create idempotency record',
      statusCode: 500,
    });
  }

  return record;
};

const updateRecordWithResponse = async (
  db: DB,
  recordId: string,
  status: IdempotencyOutcome,
  responseStatus: number,
  responseBody: unknown,
): Promise<void> => {
  await db
    .update(idempotencyRecords)
    .set({
      status,
      responseStatus,
      responseBody: responseBody ? JSON.stringify(responseBody) : null,
    })
    .where(eq(idempotencyRecords.id, recordId));
};

const sendReplayResponse = (reply: FastifyReply, record: IdempotencyRecord): void => {
  reply.header(REPLAY_HEADER, 'true');
  reply.header(OUTCOME_HEADER, IdempotencyOutcome.REPLAY);

  if (record.responseStatus) {
    reply.status(record.responseStatus);
  }

  if (record.responseBody) {
    try {
      const body = JSON.parse(record.responseBody) as unknown;
      reply.send(body);
    } catch {
      reply.send(record.responseBody);
    }
  } else {
    reply.send();
  }
};

const createIdempotencyMiddleware = (): preHandlerAsyncHookHandler => {
  return async function idempotencyMiddleware(
    this: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    if (!isIdempotencyEnabledRoute(request)) {
      return;
    }

    const tenantId = extractTenantId(request);
    if (!tenantId) {
      throw new AppError({
        code: ErrorCodes.TENANT_CONTEXT_MISSING,
        message: 'Tenant context is required for idempotency',
        statusCode: 400,
      });
    }

    const idempotencyKey = request.headers[IDEMPOTENCY_HEADER.toLowerCase()] as string | undefined;

    if (!idempotencyKey) {
      throw new AppError({
        code: ErrorCodes.IDEMPOTENCY_KEY_REQUIRED,
        message: `Idempotency-Key header is required for ${request.method} requests`,
        statusCode: 400,
        details: {
          header: IDEMPOTENCY_HEADER,
        },
      });
    }

    const validation = validateIdempotencyKey(idempotencyKey);
    if (!validation.valid) {
      throw new AppError({
        code: ErrorCodes.IDEMPOTENCY_KEY_INVALID_FORMAT,
        message: `Invalid Idempotency-Key format. Must be ${IDEMPOTENCY_KEY_FORMAT.minLength}-${IDEMPOTENCY_KEY_FORMAT.maxLength} characters, alphanumeric with underscores/hyphens only.`,
        statusCode: 400,
        details: {
          minLength: IDEMPOTENCY_KEY_FORMAT.minLength,
          maxLength: IDEMPOTENCY_KEY_FORMAT.maxLength,
        },
      });
    }

    const db = getDatabaseClient();
    const keyHash = hashKey(idempotencyKey);
    const route = request.routeOptions?.url || request.url;
    const method = request.method;
    const actorId = extractActorId(request);

    let bodyContent: unknown = null;
    if (request.body && typeof request.body === 'object') {
      bodyContent = request.body;
    }

    const fingerprint = generateFingerprint(method, route, bodyContent);

    const existingRecord = await getIdempotencyRecord(db, tenantId, keyHash);

    if (existingRecord) {
      if (existingRecord.expiresAt < new Date()) {
        await db.delete(idempotencyRecords).where(eq(idempotencyRecords.id, existingRecord.id));
      } else if (existingRecord.status === IdempotencyOutcome.IN_PROGRESS) {
        throw new AppError({
          code: ErrorCodes.IDEMPOTENCY_IN_PROGRESS,
          message: 'A request with this Idempotency-Key is already in progress',
          statusCode: 409,
          details: {
            outcome: IdempotencyOutcome.IN_PROGRESS,
          },
        });
      } else if (existingRecord.fingerprint !== fingerprint) {
        throw new AppError({
          code: ErrorCodes.IDEMPOTENCY_KEY_CONFLICT,
          message: 'Idempotency-Key reused with different request payload',
          statusCode: 409,
          details: {
            outcome: IdempotencyOutcome.CONFLICT,
            conflictingFingerprint: existingRecord.fingerprint,
          },
        });
      } else {
        sendReplayResponse(reply, existingRecord);
        return;
      }
    }

    const newRecord = await createInProgressRecord(
      db,
      tenantId,
      actorId,
      route,
      method,
      keyHash,
      idempotencyKey,
      fingerprint,
    );

    request.idempotencyRecordId = newRecord.id;
  };
};

declare module 'fastify' {
  interface FastifyRequest {
    idempotencyRecordId?: string;
  }
}

export const idempotency = createIdempotencyMiddleware();

export const completeIdempotencyRecord = async (
  recordId: string,
  responseStatus: number,
  responseBody: unknown,
): Promise<void> => {
  const db = getDatabaseClient();
  await updateRecordWithResponse(
    db,
    recordId,
    IdempotencyOutcome.REPLAY,
    responseStatus,
    responseBody,
  );
};

export const failIdempotencyRecord = async (
  recordId: string,
  responseStatus: number,
  responseBody: unknown,
): Promise<void> => {
  const db = getDatabaseClient();
  await updateRecordWithResponse(
    db,
    recordId,
    IdempotencyOutcome.CONFLICT,
    responseStatus,
    responseBody,
  );
};
