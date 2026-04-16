import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';
import { evaluateFlag } from '../feature-flags/index.js';

import {
  getPlayerProfileById,
  getPlayerProfileByUserId,
  updatePlayerProfile,
  getPrivacySettings,
  updatePrivacySettings,
  listAvatars,
  getAvatarById,
  setPlayerAvatar,
} from './player-profiles.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatarId: z.string().max(36).optional(),
  bio: z.string().max(280).optional(),
  seasonRank: z.number().int().optional(),
  skillRatingBlue: z.number().int().optional(),
  skillRatingRed: z.number().int().optional(),
  skillRatingCoop: z.number().int().optional(),
  totalSessionsPlayed: z.number().int().optional(),
  currentStreak: z.number().int().optional(),
});

const updatePrivacySchema = z.object({
  privacyMode: z.enum(['public', 'friends_only', 'private']).optional(),
  socialVisibility: z.record(z.unknown()).optional(),
});

const playerProfileResponseSchema = z.object({
  profileId: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  displayName: z.string(),
  avatarId: z.string().nullable(),
  privacyMode: z.string(),
  bio: z.string().nullable(),
  socialVisibility: z.record(z.unknown()),
  seasonRank: z.number().int().nullable(),
  skillRatingBlue: z.number().int().nullable(),
  skillRatingRed: z.number().int().nullable(),
  skillRatingCoop: z.number().int().nullable(),
  totalSessionsPlayed: z.number().int(),
  currentStreak: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActiveAt: z.string().datetime().nullable(),
  isOwner: z.boolean().optional(),
});

const privacySettingsResponseSchema = z.object({
  privacyMode: z.enum(['public', 'friends_only', 'private']),
  socialVisibility: z.record(z.unknown()),
});

const avatarResponseSchema = z.object({
  id: z.string(),
  category: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  rarityTier: z.string(),
  unlockCondition: z.string(),
  imageUrl: z.string().nullable(),
  isActive: z.boolean(),
});

const setAvatarRequestSchema = z.object({
  avatarId: z.string().max(36),
});

export async function playerProfilesRoutes(
  fastify: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  fastify.get<{ Params: { playerId: string } }>(
    '/api/v1/players/:playerId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          playerId: z.string().uuid(),
        }),
        response: {
          200: playerProfileResponseSchema,
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

      const profile = await getPlayerProfileById(config, user.tenantId, playerId, user.userId);

      if (!profile) {
        throw new AppError({
          code: ErrorCodes.PROFILE_NOT_FOUND,
          message: 'Player profile not found',
          statusCode: 404,
        });
      }

      return {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
        lastActiveAt: profile.lastActiveAt?.toISOString() ?? null,
      };
    },
  );

  fastify.patch(
    '/api/v1/players/me/profile',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: updateProfileSchema,
        response: {
          200: playerProfileResponseSchema,
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
      const body = request.body as z.infer<typeof updateProfileSchema>;

      const existingProfile = await getPlayerProfileByUserId(config, user.tenantId, user.userId);

      if (!existingProfile) {
        throw new AppError({
          code: ErrorCodes.PROFILE_NOT_FOUND,
          message: 'Player profile not found. Please create a profile first.',
          statusCode: 404,
        });
      }

      const updated = await updatePlayerProfile(
        config,
        user.tenantId,
        existingProfile.profileId,
        body,
      );

      if (!updated) {
        throw new AppError({
          code: ErrorCodes.PROFILE_UPDATE_FAILED,
          message: 'Failed to update player profile',
          statusCode: 400,
        });
      }

      return {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        lastActiveAt: updated.lastActiveAt?.toISOString() ?? null,
      };
    },
  );

  fastify.get(
    '/api/v1/players/me/privacy',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: privacySettingsResponseSchema,
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

      const settings = await getPrivacySettings(config, user.tenantId, user.userId);

      if (!settings) {
        throw new AppError({
          code: ErrorCodes.PROFILE_NOT_FOUND,
          message: 'Player profile not found',
          statusCode: 404,
        });
      }

      return settings;
    },
  );

  fastify.put(
    '/api/v1/players/me/privacy',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: updatePrivacySchema,
        response: {
          200: privacySettingsResponseSchema,
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
      const body = request.body as z.infer<typeof updatePrivacySchema>;

      const existingProfile = await getPlayerProfileByUserId(config, user.tenantId, user.userId);

      if (!existingProfile) {
        throw new AppError({
          code: ErrorCodes.PROFILE_NOT_FOUND,
          message: 'Player profile not found',
          statusCode: 404,
        });
      }

      const updated = await updatePrivacySettings(config, user.tenantId, user.userId, body);

      if (!updated) {
        throw new AppError({
          code: ErrorCodes.PROFILE_UPDATE_FAILED,
          message: 'Failed to update privacy settings',
          statusCode: 400,
        });
      }

      return {
        privacyMode: updated.privacyMode,
        socialVisibility: updated.socialVisibility,
      };
    },
  );

  fastify.get(
    '/api/v1/avatars',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: z
          .object({
            category: z.string().optional(),
          })
          .optional(),
        response: {
          200: z.array(avatarResponseSchema),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const query = request.query as { category?: string } | undefined;

      const avatarsEnabled = await evaluateFlag(config, user.tenantId, 'social.avatars_enabled');
      if (!avatarsEnabled) {
        throw new AppError({
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: 'Avatar system is disabled',
          statusCode: 503,
        });
      }

      const avatars = await listAvatars(config, user.tenantId, query?.category);

      return avatars.map((avatar) => ({
        id: avatar.id,
        category: avatar.category,
        name: avatar.name,
        description: avatar.description ?? '',
        tags: avatar.tags ?? [],
        rarityTier: avatar.rarityTier ?? 'common',
        unlockCondition: avatar.unlockCondition ?? '',
        imageUrl: avatar.imageUrl,
        isActive: avatar.isActive,
      }));
    },
  );

  fastify.get<{ Params: { avatarId: string } }>(
    '/api/v1/avatars/:avatarId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: z.object({
          avatarId: z.string().max(36),
        }),
        response: {
          200: avatarResponseSchema,
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
      const { avatarId } = request.params;

      const avatarsEnabled = await evaluateFlag(config, user.tenantId, 'social.avatars_enabled');
      if (!avatarsEnabled) {
        throw new AppError({
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: 'Avatar system is disabled',
          statusCode: 503,
        });
      }

      const avatar = await getAvatarById(config, avatarId);

      if (!avatar) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Avatar not found',
          statusCode: 404,
        });
      }

      return {
        id: avatar.id,
        category: avatar.category,
        name: avatar.name,
        description: avatar.description ?? '',
        tags: avatar.tags ?? [],
        rarityTier: avatar.rarityTier ?? 'common',
        unlockCondition: avatar.unlockCondition ?? '',
        imageUrl: avatar.imageUrl,
        isActive: avatar.isActive,
      };
    },
  );

  fastify.post<{ Body: { avatarId: string } }>(
    '/api/v1/players/me/avatar',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: setAvatarRequestSchema,
        response: {
          200: playerProfileResponseSchema,
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
      const body = request.body as z.infer<typeof setAvatarRequestSchema>;

      const avatarsEnabled = await evaluateFlag(config, user.tenantId, 'social.avatars_enabled');
      if (!avatarsEnabled) {
        throw new AppError({
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: 'Avatar system is disabled',
          statusCode: 503,
        });
      }

      const profile = await setPlayerAvatar(config, user.tenantId, user.userId, body.avatarId);

      if (!profile) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Avatar not found or inactive',
          statusCode: 404,
        });
      }

      return {
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
        lastActiveAt: profile.lastActiveAt?.toISOString() ?? null,
      };
    },
  );
}
