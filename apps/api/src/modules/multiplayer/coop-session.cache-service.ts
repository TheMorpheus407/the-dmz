import {
  getCachedCoopSession,
  setCachedCoopSession,
  deleteCachedCoopSession,
  type CachedCoopSession,
  type CachedCoopRoleAssignment,
} from '../../shared/cache/index.js';

import type { AppConfig } from '../../config.js';
import type { CoopSessionStatus } from '../../db/schema/multiplayer/index.js';
import type { CoopRoleAssignmentResult } from './coop-session.repository.js';

export interface CoopSessionCacheData {
  sessionId: string;
  tenantId: string;
  partyId: string;
  seed: string;
  status: CoopSessionStatus;
  authorityPlayerId: string | null;
  dayNumber: number;
  roles: CachedCoopRoleAssignment[];
  updatedAt: number;
}

export class CoopSessionCacheService {
  private readonly config: AppConfig;

  public constructor(config: AppConfig) {
    this.config = config;
  }

  public async get(sessionId: string, tenantId: string): Promise<CachedCoopSession | null> {
    return getCachedCoopSession(this.config, tenantId, sessionId);
  }

  public async set(
    sessionId: string,
    tenantId: string,
    sessionData: CoopSessionCacheData,
  ): Promise<void> {
    const cached: CachedCoopSession = {
      sessionId: sessionData.sessionId,
      tenantId: sessionData.tenantId,
      partyId: sessionData.partyId,
      seed: sessionData.seed,
      status: sessionData.status,
      authorityPlayerId: sessionData.authorityPlayerId,
      dayNumber: sessionData.dayNumber,
      roles: sessionData.roles.map((r) => ({
        assignmentId: r.assignmentId,
        playerId: r.playerId,
        role: r.role,
        isAuthority: r.isAuthority,
      })),
      updatedAt: Date.now(),
    };

    await setCachedCoopSession(this.config, tenantId, sessionId, cached);
  }

  public async invalidate(sessionId: string, tenantId: string): Promise<void> {
    await deleteCachedCoopSession(this.config, tenantId, sessionId);
  }
}

export function toCacheData(
  sessionId: string,
  tenantId: string,
  sessionData: {
    sessionId: string;
    tenantId: string;
    partyId: string;
    seed: string;
    status: string;
    authorityPlayerId: string | null;
    dayNumber: number;
    roles: CoopRoleAssignmentResult[];
  },
): CoopSessionCacheData {
  return {
    sessionId,
    tenantId,
    partyId: sessionData.partyId,
    seed: sessionData.seed,
    status: sessionData.status as CoopSessionStatus,
    authorityPlayerId: sessionData.authorityPlayerId,
    dayNumber: sessionData.dayNumber,
    roles: sessionData.roles.map((r) => ({
      assignmentId: r.assignmentId,
      playerId: r.playerId,
      role: r.role,
      isAuthority: r.isAuthority,
    })),
    updatedAt: Date.now(),
  };
}
