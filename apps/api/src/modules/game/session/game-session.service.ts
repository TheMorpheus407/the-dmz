import { getDatabaseClient } from '../../../shared/database/connection.js';

import {
  findActiveGameSession,
  createGameSession,
  type GameSessionData,
  type GameSession,
} from './game-session.repo.js';

import type { AppConfig } from '../../../config.js';

export type AuthenticatedUser = {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
};

export type GameSessionBootstrapData = {
  schemaVersion: 1;
  tenantId: string;
  sessionId: string;
  userId: string;
  day: number;
  funds: number;
  clientCount: number;
  threatLevel: 'low' | 'medium' | 'high';
  facilityLoadout: {
    defenseLevel: number;
    serverLevel: number;
    networkLevel: number;
  };
  createdAt: string;
  updatedAt: string;
};

export const bootstrapGameSession = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<{ session: GameSessionBootstrapData; isNew: boolean }> => {
  const db = getDatabaseClient(config);

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
    day: 1,
    funds: 1000,
    clientCount: 5,
    threatLevel: 'low',
    defenseLevel: 1,
    serverLevel: 1,
    networkLevel: 1,
  };

  const createdSession = await createGameSession(db, sessionData);

  return {
    session: mapToBootstrapData(createdSession),
    isNew: true,
  };
};

export const getGameSession = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<GameSessionBootstrapData | null> => {
  const db = getDatabaseClient(config);

  const session = await findActiveGameSession(db, user.userId, user.tenantId);

  if (!session) {
    return null;
  }

  return mapToBootstrapData(session);
};

export const ensureGameSession = async (
  config: AppConfig,
  user: AuthenticatedUser,
): Promise<GameSessionBootstrapData> => {
  const existingSession = await getGameSession(config, user);

  if (existingSession) {
    return existingSession;
  }

  const { session } = await bootstrapGameSession(config, user);
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
    threatLevel: session.threatLevel as 'low' | 'medium' | 'high',
    facilityLoadout: {
      defenseLevel: session.defenseLevel,
      serverLevel: session.serverLevel,
      networkLevel: session.networkLevel,
    },
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}
