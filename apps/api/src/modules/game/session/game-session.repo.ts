import { eq, and, isNotNull, sql } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import { gameSessions } from '../../../db/schema/game/index.js';

import type { GameSession } from '../../../db/schema/game/index.js';

export type GameSessionData = {
  tenantId: string;
  userId: string;
  day?: number;
  funds?: number;
  clientCount?: number;
  threatLevel?: 'low' | 'medium' | 'high';
  defenseLevel?: number;
  serverLevel?: number;
  networkLevel?: number;
};

export type { GameSession };

export const findActiveGameSession = async (
  db: DB,
  userId: string,
  tenantId: string,
): Promise<GameSession | null> => {
  const session = await db.query.gameSessions.findFirst({
    where: and(
      eq(gameSessions.userId, userId),
      eq(gameSessions.tenantId, tenantId),
      isNotNull(gameSessions.isActive),
    ),
  });

  return session || null;
};

export const createGameSession = async (db: DB, data: GameSessionData): Promise<GameSession> => {
  const [created] = await db
    .insert(gameSessions)
    .values({
      tenantId: data.tenantId,
      userId: data.userId,
      day: data.day ?? 1,
      funds: data.funds ?? 1000,
      clientCount: data.clientCount ?? 5,
      threatLevel: data.threatLevel ?? 'low',
      defenseLevel: data.defenseLevel ?? 1,
      serverLevel: data.serverLevel ?? 1,
      networkLevel: data.networkLevel ?? 1,
      isActive: sql`uuid_generate_v7()`,
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create game session');
  }

  return created;
};

type GameSessionUpdateData = {
  day?: number;
  funds?: number;
  clientCount?: number;
  threatLevel?: string;
  defenseLevel?: number;
  serverLevel?: number;
  networkLevel?: number;
  updatedAt: Date;
};

export const updateGameSession = async (
  db: DB,
  sessionId: string,
  data: Partial<GameSessionData>,
): Promise<GameSession | null> => {
  const updates: GameSessionUpdateData = {
    updatedAt: new Date(),
  };

  if (data.day !== undefined) updates.day = data.day;
  if (data.funds !== undefined) updates.funds = data.funds;
  if (data.clientCount !== undefined) updates.clientCount = data.clientCount;
  if (data.threatLevel !== undefined) updates.threatLevel = data.threatLevel;
  if (data.defenseLevel !== undefined) updates.defenseLevel = data.defenseLevel;
  if (data.serverLevel !== undefined) updates.serverLevel = data.serverLevel;
  if (data.networkLevel !== undefined) updates.networkLevel = data.networkLevel;

  const [updated] = await db
    .update(gameSessions)
    .set(updates)
    .where(eq(gameSessions.id, sessionId))
    .returning();

  return updated || null;
};
