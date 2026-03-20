import { DAY_PHASES, type DayPhase } from '@the-dmz/shared/game';

import { isActionPermitted } from './permission-matrix.js';

import type { PermissionMatrixConfig } from './permission-matrix.js';
import type { CoopRole } from '../../../db/schema/multiplayer/index.js';

export class PermissionDeniedError extends Error {
  public readonly code: string;
  public readonly action: string;
  public readonly role: string;
  public readonly phase: string;
  public readonly reason: string;

  constructor(params: {
    code: string;
    message: string;
    action: string;
    role: string;
    phase: string;
    reason: string;
  }) {
    super(params.message);
    this.name = 'PermissionDeniedError';
    this.code = params.code;
    this.action = params.action;
    this.role = params.role;
    this.phase = params.phase;
    this.reason = params.reason;
  }
}

export interface PermissionCheckParams {
  action: string;
  actorRole: CoopRole;
  actorId: string;
  authorityPlayerId: string | null;
  phase: DayPhase;
  matrix: PermissionMatrixConfig;
}

export function checkPermission(params: PermissionCheckParams): void {
  const { action, actorRole, actorId, authorityPlayerId, phase, matrix } = params;

  const permitted = isActionPermitted(matrix, actorRole, phase, action);

  if (!permitted) {
    throw new PermissionDeniedError({
      code: 'ACTION_NOT_PERMITTED',
      message: `Role ${actorRole} cannot perform ${action} in phase ${phase}`,
      action,
      role: actorRole,
      phase,
      reason: 'ACTION_NOT_PERMITTED',
    });
  }

  if (permitted === 'Authority') {
    if (actorId !== authorityPlayerId) {
      throw new PermissionDeniedError({
        code: 'AUTHORITY_REQUIRED',
        message: `Role ${actorRole} requires authority status to perform ${action}`,
        action,
        role: actorRole,
        phase,
        reason: 'AUTHORITY_REQUIRED',
      });
    }
  }
}

export function createPermissionDeniedEvent(params: {
  actorId: string;
  role: string;
  attemptedAction: string;
  phase: string;
  reason: string;
  sessionId: string;
  tenantId: string;
}): Record<string, unknown> {
  return {
    eventType: 'permission.denied',
    actorId: params.actorId,
    role: params.role,
    attemptedAction: params.attemptedAction,
    phase: params.phase,
    reason: params.reason,
    sessionId: params.sessionId,
    tenantId: params.tenantId,
    timestamp: new Date().toISOString(),
  };
}

export function mapGameActionToPermissionAction(gameAction: string): string {
  const actionMapping: Record<string, string> = {
    OPEN_EMAIL: 'view.inbox',
    MARK_INDICATOR: 'email.mark_indicator',
    REQUEST_VERIFICATION: 'verification.request',
    SUBMIT_DECISION: 'email.propose_decision',
    OPEN_VERIFICATION: 'view.verification_packet',
    FLAG_DISCREPANCY: 'verification.mark_inconsistency',
    CLOSE_VERIFICATION: 'verification.propose_decision',
  };

  return actionMapping[gameAction] ?? gameAction;
}

export function mapPhaseToPermissionPhase(phase: DayPhase): DayPhase {
  if (phase === DAY_PHASES.PHASE_TRIAGE) {
    return DAY_PHASES.PHASE_EMAIL_INTAKE;
  }
  return phase;
}
