import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../../shared/database/connection.js';
import { coopSession } from '../../../db/schema/multiplayer/index.js';
import { createSnapshot, getLatestSnapshot } from '../../game/event-store/index.js';

import type { AppConfig } from '../../../config.js';

export interface SnapshotResult {
  sessionSeq: number;
  lastSnapshotSeq: number;
  snapshotId: string;
}

export async function materializeSnapshot(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  state: Record<string, unknown>,
): Promise<SnapshotResult | null> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return null;
  }

  if (!session.gameSessionId) {
    return null;
  }

  const currentSeq = Number(session.sessionSeq);

  await db
    .update(coopSession)
    .set({
      lastSnapshotSeq: currentSeq,
      lastSnapshotAt: new Date(),
    })
    .where(and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)));

  const snapshot = await createSnapshot(db, {
    sessionId: session.gameSessionId,
    tenantId,
    sequenceNum: currentSeq,
    stateJson: JSON.stringify(state),
  });

  return {
    sessionSeq: currentSeq,
    lastSnapshotSeq: currentSeq,
    snapshotId: snapshot.snapshotId,
  };
}

export async function getSnapshotForRecovery(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
): Promise<{
  sessionSeq: number;
  lastSnapshotSeq: number;
  lastSnapshotAt: Date | null;
  snapshotState: Record<string, unknown> | null;
} | null> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return null;
  }

  let snapshotState: Record<string, unknown> | null = null;

  if (session.lastSnapshotSeq > 0 && session.gameSessionId) {
    const snapshot = await getLatestSnapshot(db, session.gameSessionId);
    if (snapshot) {
      snapshotState = JSON.parse(snapshot.stateJson as string) as Record<string, unknown>;
    }
  }

  return {
    sessionSeq: Number(session.sessionSeq),
    lastSnapshotSeq: Number(session.lastSnapshotSeq),
    lastSnapshotAt: session.lastSnapshotAt,
    snapshotState,
  };
}
