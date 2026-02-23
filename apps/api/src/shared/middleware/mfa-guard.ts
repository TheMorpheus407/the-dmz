import { eq, and } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { sessions as sessionsTable } from '../../db/schema/auth/sessions.js';
import { users } from '../../shared/database/schema/users.js';
import { AppError, ErrorCodes } from '../middleware/error-handler.js';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AppConfig } from '../../config.js';

export const requireMfaForSuperAdmin = async (
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> => {
  const user = request.user;
  const tenantContext = request.tenantContext;

  if (!user || !tenantContext) {
    return;
  }

  const config = request.server.config;
  const db = getDatabaseClient(config);

  const userRecord = await db.query.users.findFirst({
    where: and(eq(users.userId, user.userId), eq(users.tenantId, user.tenantId)),
  });

  if (!userRecord) {
    return;
  }

  if (userRecord.role !== 'super-admin') {
    return;
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessionsTable.id, user.sessionId),
  });

  if (!session || !session.mfaVerifiedAt) {
    throw new AppError({
      code: ErrorCodes.AUTH_MFA_REQUIRED,
      message: 'Super Admin access requires MFA verification',
      statusCode: 403,
      details: {
        requiresMfa: true,
        mfaVerified: false,
      },
    });
  }
};

export const isMfaVerifiedForSession = async (
  config: AppConfig,
  sessionId: string,
): Promise<boolean> => {
  const db = getDatabaseClient(config);

  const session = await db.query.sessions.findFirst({
    where: eq(sessionsTable.id, sessionId),
  });

  return session?.mfaVerifiedAt !== null && session?.mfaVerifiedAt !== undefined;
};
