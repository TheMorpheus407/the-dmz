import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  getFriendsPresence,
  getPlayerPresence,
  updatePresenceStatus,
  getPresencePrivacySettings,
  updatePresencePrivacy,
} from './presence.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

const presenceStatusSchema = z.enum(['offline', 'online', 'in_session', 'in_coop', 'in_ranked']);

const updatePresenceStatusSchema = z.object({
  status: presenceStatusSchema,
  statusData: z.record(z.unknown()).optional(),
});

const privacyModeSchema = z.enum(['public', 'friends_only', 'private']);

const presenceResponseSchema = z.object({
  playerId: z.string().uuid(),
  status: presenceStatusSchema,
  statusData: z.record(z.unknown()),
  lastHeartbeat: z.string().datetime(),
});

const friendPresenceResponseSchema = z.object({
  playerId: z.string().uuid(),
  displayName: z.string(),
  status: presenceStatusSchema,
  statusData: z.record(z.unknown()),
  lastHeartbeat: z.string().datetime(),
});

const privacySettingsResponseSchema = z.object({
  privacyMode: privacyModeSchema,
});

const updatePrivacySettingsSchema = z.object({
  privacyMode: privacyModeSchema,
});

export async function presenceRoutes(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.get(
    '/api/v1/presence/friends',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: z.array(friendPresenceResponseSchema),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const friendsPresence = await getFriendsPresence(config, user.tenantId, user.userId);

      return friendsPresence.map((friend) => ({
        playerId: friend.playerId,
        displayName: friend.displayName,
        status: friend.status,
        statusData: friend.statusData,
        lastHeartbeat: friend.lastHeartbeat.toISOString(),
      }));
    },
  );

  fastify.get<{ Params: { playerId: string } }>(
    '/api/v1/presence/players/:playerId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          playerId: z.string().uuid(),
        }),
        response: {
          200: presenceResponseSchema.nullable(),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          404: errorResponseSchemas.NotFound,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { playerId } = request.params;

      const presenceData = await getPlayerPresence(config, user.tenantId, user.userId, playerId);

      if (!presenceData) {
        return null;
      }

      return {
        playerId,
        status: presenceData.status,
        statusData: presenceData.statusData,
        lastHeartbeat: new Date(presenceData.lastHeartbeat).toISOString(),
      };
    },
  );

  fastify.put(
    '/api/v1/presence/status',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: updatePresenceStatusSchema,
        response: {
          200: presenceResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { status, statusData } = request.body as z.infer<typeof updatePresenceStatusSchema>;

      const result = await updatePresenceStatus(config, user.tenantId, user.userId, {
        status,
        statusData: statusData ?? {},
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.INVALID_INPUT,
          message: result.error ?? 'Failed to update presence status',
          statusCode: 400,
        });
      }

      return {
        playerId: user.userId,
        status: result.presence!.status as z.infer<typeof presenceStatusSchema>,
        statusData: result.presence!.statusData as Record<string, unknown>,
        lastHeartbeat: result.presence!.lastHeartbeat.toISOString(),
      };
    },
  );

  fastify.get(
    '/api/v1/presence/privacy',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: privacySettingsResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const settings = await getPresencePrivacySettings(config, user.tenantId, user.userId);

      if (!settings) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Privacy settings not found',
          statusCode: 404,
        });
      }

      return {
        privacyMode: settings.privacyMode,
      };
    },
  );

  fastify.put(
    '/api/v1/presence/privacy',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: updatePrivacySettingsSchema,
        response: {
          200: privacySettingsResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { privacyMode } = request.body as z.infer<typeof updatePrivacySettingsSchema>;

      const success = await updatePresencePrivacy(config, user.tenantId, user.userId, privacyMode);

      if (!success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Failed to update privacy settings',
          statusCode: 404,
        });
      }

      return {
        privacyMode,
      };
    },
  );
}
