import {
  isActionAllowed,
  type EnforcementResult,
} from '../../modules/social/moderation-enforcement.service.js';

import { AppError, ErrorCodes } from './error-handler.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    moderationEnforcement?: EnforcementResult;
  }
}

export const moderationEnforcement = async (
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> => {
  const user = request.user;

  if (!user || !user.tenantId || !user.userId) {
    return;
  }

  const config = request.server.config;

  const routeOptions = request.routeOptions as
    | { config?: { moderationAction?: string } }
    | undefined;
  const action = routeOptions?.config?.moderationAction;

  if (!action) {
    return;
  }

  const result = await isActionAllowed(config, user.tenantId, user.userId, action);

  if (!result.allowed && result.restriction) {
    request.moderationEnforcement = result;

    const actionType = result.restriction.actionType;
    let message = 'Action blocked due to active moderation action';
    const code = ErrorCodes.AUTH_FORBIDDEN;

    if (actionType === 'mute' || actionType === 'mute_duration') {
      message = 'You are currently muted';
    } else if (actionType === 'ban') {
      message = 'Your account has been restricted';
    } else if (actionType === 'restriction') {
      message = 'Your account has restrictions';
    }

    const details: Record<string, unknown> = {
      restrictionType: actionType,
    };

    if (result.restriction.expiresAt) {
      details['expiresAt'] = result.restriction.expiresAt.toISOString();
    }

    if (result.retryAfterMs !== undefined) {
      details['retryAfterMs'] = result.retryAfterMs;
    }

    request.log.warn(
      {
        requestId: request.id,
        userId: user.userId,
        tenantId: user.tenantId,
        action,
        restrictionType: actionType,
      },
      'moderation enforcement blocked action',
    );

    throw new AppError({
      code,
      message,
      statusCode: 403,
      details,
    });
  }

  request.moderationEnforcement = result;
};

export type ModerationActionConfig = {
  action: string;
};

export const registerModerationEnforcement = async (
  app: FastifyInstance,
  action: string,
): Promise<void> => {
  app.addHook('preHandler', async (request) => {
    const user = request.user;

    if (!user || !user.tenantId || !user.userId) {
      return;
    }

    const config = request.server.config;
    const result = await isActionAllowed(config, user.tenantId, user.userId, action);

    if (!result.allowed && result.restriction) {
      request.moderationEnforcement = result;

      const actionType = result.restriction.actionType;
      const message = 'Action blocked due to active moderation action';
      const details: Record<string, unknown> = {
        restrictionType: actionType,
      };

      if (result.restriction.expiresAt) {
        details['expiresAt'] = result.restriction.expiresAt.toISOString();
      }

      if (result.retryAfterMs !== undefined) {
        details['retryAfterMs'] = result.retryAfterMs;
      }

      request.log.warn(
        {
          requestId: request.id,
          userId: user.userId,
          tenantId: user.tenantId,
          action,
          restrictionType: actionType,
        },
        'moderation enforcement blocked action',
      );

      throw new AppError({
        code: ErrorCodes.AUTH_FORBIDDEN,
        message,
        statusCode: 403,
        details,
      });
    }

    request.moderationEnforcement = result;
  });
};
