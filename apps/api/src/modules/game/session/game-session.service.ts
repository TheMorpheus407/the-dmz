import { generateSeed, type GameThreatTier } from '@the-dmz/shared/game';

import { type DB } from '../../../shared/database/connection.js';
import { recordGameSession } from '../../../shared/metrics/hooks.js';

import {
  findActiveGameSession,
  createGameSession,
  type GameSessionData,
  type GameSession,
} from './game-session.repo.js';

import type { AuthenticatedUser } from '../../auth/auth.types.js';

export type GameSessionBootstrapData = {
  schemaVersion: 1;
  tenantId: string;
  sessionId: string;
  userId: string;
  day: number;
  funds: number;
  clientCount: number;
  threatLevel: GameThreatTier;
  facilityLoadout: {
    defenseLevel: number;
    serverLevel: number;
    networkLevel: number;
  };
  createdAt: string;
  updatedAt: string;
};

export const bootstrapGameSession = async (
  db: DB,
  user: AuthenticatedUser,
): Promise<{ session: GameSessionBootstrapData; isNew: boolean }> => {
  const existingSession = await findActiveGameSession(db, user.userId, user.tenantId);

  if (existingSession) {
    return {
      session: mapToBootstrapData(existingSession),
      isNew: false,
    };
  }

  const sessionData: GameSessionData = {
    tenantId: user.tenantId,
    userId: user.userId,
    seed: generateSeed(),
    day: 1,
    funds: 1000,
    clientCount: 5,
    threatLevel: 'low',
    defenseLevel: 1,
    serverLevel: 1,
    networkLevel: 1,
  };

  const createdSession = await createGameSession(db, sessionData);

  recordGameSession('start', user.tenantId);

  return {
    session: mapToBootstrapData(createdSession),
    isNew: true,
  };
};

export const getGameSession = async (
  db: DB,
  user: AuthenticatedUser,
): Promise<GameSessionBootstrapData | null> => {
  const session = await findActiveGameSession(db, user.userId, user.tenantId);

  if (!session) {
    return null;
  }

  return mapToBootstrapData(session);
};

export const ensureGameSession = async (
  db: DB,
  user: AuthenticatedUser,
): Promise<GameSessionBootstrapData> => {
  const existingSession = await getGameSession(db, user);

  if (existingSession) {
    return existingSession;
  }

  const { session } = await bootstrapGameSession(db, user);
  return session;
};

function mapToBootstrapData(session: GameSession): GameSessionBootstrapData {
  return {
    schemaVersion: 1,
    tenantId: session.tenantId,
    sessionId: session.id,
    userId: session.userId,
    day: session.day,
    funds: session.funds,
    clientCount: session.clientCount,
    threatLevel: session.threatLevel as GameThreatTier,
    facilityLoadout: {
      defenseLevel: session.defenseLevel,
      serverLevel: session.serverLevel,
      networkLevel: session.networkLevel,
    },
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}
