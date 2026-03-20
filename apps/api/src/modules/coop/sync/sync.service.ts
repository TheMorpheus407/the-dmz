import { eq, and, sql } from 'drizzle-orm';

import { getDatabaseClient } from '../../../shared/database/connection.js';
import { coopSession, coopRoleAssignment } from '../../../db/schema/multiplayer/index.js';
import { appendEvent } from '../../game/event-store/event-store.repo.js'; // eslint-disable-line import-x/no-restricted-paths

import type { AppConfig } from '../../../config.js';
import type { IEventBus } from '../../../shared/events/event-types.js';

export interface SyncActionInput {
  sessionId: string;
  tenantId: string;
  playerId: string;
  action: string;
  payload: Record<string, unknown>;
  clientSeq: number;
  requestId: string;
}

export interface SyncActionResult {
  accepted: boolean;
  reason?: 'STALE_SEQ' | 'GAP_DETECTED';
  currentSeq?: number;
  newSeq?: number;
  events?: Record<string, unknown>[];
  error?: string;
}

export async function validateAndApplyAction(
  config: AppConfig,
  _eventBus: IEventBus,
  input: SyncActionInput,
): Promise<SyncActionResult> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(
      eq(coopSession.sessionId, input.sessionId),
      eq(coopSession.tenantId, input.tenantId),
    ),
  });

  if (!session) {
    return { accepted: false, error: 'Session not found' };
  }

  if (session.status !== 'active') {
    return { accepted: false, error: 'Session is not active' };
  }

  const currentSeq = Number(session.sessionSeq);

  if (input.clientSeq < currentSeq) {
    return {
      accepted: false,
      reason: 'STALE_SEQ',
      currentSeq,
    };
  }

  if (input.clientSeq > currentSeq + 1) {
    return {
      accepted: false,
      reason: 'GAP_DETECTED',
      currentSeq,
    };
  }

  const newSeq = currentSeq + 1;

  if (!session.gameSessionId) {
    return {
      accepted: false,
      error: 'Co-op session not linked to game session. Cannot persist events.',
    };
  }

  const gameSessionId = session.gameSessionId;

  let transactionError: Error | null = null;
  let persistedEvent: Awaited<ReturnType<typeof appendEvent>> | undefined;

  try {
    await db.transaction(async (tx) => {
      const result = await tx
        .update(coopSession)
        .set({ sessionSeq: newSeq })
        .where(
          and(
            eq(coopSession.sessionId, input.sessionId),
            eq(coopSession.tenantId, input.tenantId),
            eq(coopSession.sessionSeq, currentSeq),
          ),
        )
        .returning({ sessionSeq: coopSession.sessionSeq });

      if (result.length === 0) {
        throw new Error('STALE_SEQ');
      }

      const roleAssignment = await tx.query.coopRoleAssignment.findFirst({
        where: and(
          eq(coopRoleAssignment.sessionId, input.sessionId),
          eq(coopRoleAssignment.playerId, input.playerId),
        ),
      });

      const partyId = session.partyId;
      const coopRole = roleAssignment?.role ?? null;

      const event = await appendEvent(tx, {
        sessionId: gameSessionId,
        userId: input.playerId,
        tenantId: input.tenantId,
        eventType: 'coop.action.applied',
        eventData: {
          coopSessionId: input.sessionId,
          playerId: input.playerId,
          action: input.action,
          payload: input.payload,
          seq: newSeq,
          partyId,
          coopRole,
        } as Record<string, unknown>,
        eventVersion: 1,
        clientTime: new Date(),
        partyId,
        coopRole,
      });

      persistedEvent = event;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'STALE_SEQ') {
      const currentSession = await db.query.coopSession.findFirst({
        where: and(
          eq(coopSession.sessionId, input.sessionId),
          eq(coopSession.tenantId, input.tenantId),
        ),
      });
      return {
        accepted: false,
        reason: 'STALE_SEQ',
        currentSeq: currentSession ? Number(currentSession.sessionSeq) : 0,
      };
    }
    transactionError = error instanceof Error ? error : new Error('Transaction failed');
  }

  if (transactionError) {
    return {
      accepted: false,
      error: transactionError.message,
    };
  }

  if (!persistedEvent) {
    return {
      accepted: false,
      error: 'Failed to persist event',
    };
  }

  const returnRoleAssignment = await db.query.coopRoleAssignment.findFirst({
    where: and(
      eq(coopRoleAssignment.sessionId, input.sessionId),
      eq(coopRoleAssignment.playerId, input.playerId),
    ),
  });

  const events: Record<string, unknown>[] = [
    {
      eventType: 'coop.action.applied',
      sessionId: input.sessionId,
      playerId: input.playerId,
      action: input.action,
      payload: {
        ...input.payload,
        partyId: session.partyId,
        coopRole: returnRoleAssignment?.role ?? null,
      },
      seq: newSeq,
      timestamp: persistedEvent.serverTime.toISOString(),
      eventId: persistedEvent.eventId,
    },
  ];

  return {
    accepted: true,
    newSeq,
    events,
  };
}

export async function getSessionSeq(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
): Promise<{ sessionSeq: number; lastSnapshotSeq: number; lastSnapshotAt: Date | null } | null> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return null;
  }

  return {
    sessionSeq: Number(session.sessionSeq),
    lastSnapshotSeq: Number(session.lastSnapshotSeq),
    lastSnapshotAt: session.lastSnapshotAt,
  };
}

export async function incrementSessionSeq(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
): Promise<number> {
  const db = getDatabaseClient(config);

  const [updated] = await db
    .update(coopSession)
    .set({
      sessionSeq: sql`${coopSession.sessionSeq} + 1`,
    })
    .where(and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)))
    .returning({ sessionSeq: coopSession.sessionSeq });

  return Number(updated?.sessionSeq ?? 0);
}
