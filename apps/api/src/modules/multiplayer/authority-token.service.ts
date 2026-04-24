import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { coopSession, coopRoleAssignment } from '../../db/schema/multiplayer/index.js';
import { deleteCachedCoopSession } from '../../shared/cache/index.js';
import { generateId } from '../../shared/utils/id.js';

import { createAuthorityTokenRelinquishedEvent } from './arbitration.events.js';

import type { AppConfig } from '../../config.js';
import type { EventBus } from '../../shared/events/event-types.js';

export type TokenRelinquishReason = 'self_proposal' | 'timer_rotation' | 'manual';

export interface TokenHolderInfo {
  playerId: string;
  isAuthority: boolean;
  role: string;
}

export async function getCurrentTokenHolder(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
): Promise<TokenHolderInfo | null> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session || !session.authorityPlayerId) {
    return null;
  }

  const roleAssignment = await db.query.coopRoleAssignment.findFirst({
    where: and(
      eq(coopRoleAssignment.sessionId, sessionId),
      eq(coopRoleAssignment.playerId, session.authorityPlayerId),
    ),
  });

  if (!roleAssignment) {
    return null;
  }

  return {
    playerId: session.authorityPlayerId,
    isAuthority: roleAssignment.isAuthority,
    role: roleAssignment.role,
  };
}

export async function relinquishTokenIfOwner(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  proposingPlayerId: string,
  reason: TokenRelinquishReason,
  eventBus: EventBus,
): Promise<{ tokenRelinquished: boolean; newAuthorityId: string | null }> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session || !session.authorityPlayerId) {
    return { tokenRelinquished: false, newAuthorityId: null };
  }

  if (session.authorityPlayerId !== proposingPlayerId) {
    return { tokenRelinquished: false, newAuthorityId: null };
  }

  const roles = await db.query.coopRoleAssignment.findMany({
    where: eq(coopRoleAssignment.sessionId, sessionId),
  });

  const otherRole = roles.find((r) => r.playerId !== proposingPlayerId);
  if (!otherRole) {
    return { tokenRelinquished: false, newAuthorityId: null };
  }

  const previousAuthorityId = session.authorityPlayerId;

  await db
    .update(coopRoleAssignment)
    .set({ isAuthority: false })
    .where(
      and(eq(coopRoleAssignment.sessionId, sessionId), eq(coopRoleAssignment.isAuthority, true)),
    );

  await db
    .update(coopRoleAssignment)
    .set({ isAuthority: true })
    .where(eq(coopRoleAssignment.assignmentId, otherRole.assignmentId));

  await db
    .update(coopSession)
    .set({ authorityPlayerId: otherRole.playerId })
    .where(eq(coopSession.sessionId, sessionId));

  await deleteCachedCoopSession(config, tenantId, sessionId);

  emitTokenRelinquished(
    eventBus,
    tenantId,
    proposingPlayerId,
    sessionId,
    previousAuthorityId,
    otherRole.playerId,
    reason,
  );

  return { tokenRelinquished: true, newAuthorityId: otherRole.playerId };
}

export async function forceRelinquishToken(
  config: AppConfig,
  tenantId: string,
  sessionId: string,
  currentAuthorityId: string,
  reason: TokenRelinquishReason,
  eventBus: EventBus,
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabaseClient(config);

  const session = await db.query.coopSession.findFirst({
    where: and(eq(coopSession.sessionId, sessionId), eq(coopSession.tenantId, tenantId)),
  });

  if (!session) {
    return { success: false, error: 'Co-op session not found' };
  }

  if (session.authorityPlayerId !== currentAuthorityId) {
    return { success: false, error: 'Only the current authority can force token relinquishment' };
  }

  const roles = await db.query.coopRoleAssignment.findMany({
    where: eq(coopRoleAssignment.sessionId, sessionId),
  });

  const otherRole = roles.find((r) => r.playerId !== currentAuthorityId);
  if (!otherRole) {
    return { success: false, error: 'No other player to transfer authority to' };
  }

  const previousAuthorityId = session.authorityPlayerId;

  await db
    .update(coopRoleAssignment)
    .set({ isAuthority: false })
    .where(
      and(eq(coopRoleAssignment.sessionId, sessionId), eq(coopRoleAssignment.isAuthority, true)),
    );

  await db
    .update(coopRoleAssignment)
    .set({ isAuthority: true })
    .where(eq(coopRoleAssignment.assignmentId, otherRole.assignmentId));

  await db
    .update(coopSession)
    .set({ authorityPlayerId: otherRole.playerId })
    .where(eq(coopSession.sessionId, sessionId));

  await deleteCachedCoopSession(config, tenantId, sessionId);

  emitTokenRelinquished(
    eventBus,
    tenantId,
    currentAuthorityId,
    sessionId,
    previousAuthorityId,
    otherRole.playerId,
    reason,
  );

  return { success: true };
}

function emitTokenRelinquished(
  eventBus: EventBus,
  tenantId: string,
  userId: string,
  sessionId: string,
  previousAuthorityId: string,
  newAuthorityId: string,
  reason: TokenRelinquishReason,
): void {
  const event = createAuthorityTokenRelinquishedEvent({
    correlationId: generateId(),
    tenantId,
    userId,
    payload: {
      sessionId,
      previousAuthorityPlayerId: previousAuthorityId,
      newAuthorityPlayerId: newAuthorityId,
      reason,
      relinquishedAt: new Date().toISOString(),
    },
  });
  eventBus.publish(event);
}

export function validateRationale(
  rationale: string | null | undefined,
): { valid: true } | { valid: false; error: string } {
  if (!rationale) {
    return { valid: false, error: 'Rationale is required for override actions' };
  }

  const trimmed = rationale.trim();

  if (trimmed.length < 10) {
    return { valid: false, error: 'Rationale must be at least 10 characters' };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: 'Rationale must be at most 500 characters' };
  }

  return { valid: true };
}
