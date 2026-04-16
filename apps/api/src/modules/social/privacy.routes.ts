import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  getOrCreateTenantPrivacySettings,
  updateTenantPrivacySettings,
  isValidSocialProfileMode,
  type UpdateTenantPrivacySettingsInput,
} from './privacy.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

const socialProfileModeSchema = z.enum([
  'anonymous_tenant',
  'pseudonymous_tenant',
  'employee_identifiable',
]);

const updatePlayerPrivacySettingsSchema = z.object({
  privacyMode: z.enum(['public', 'friends_only', 'private']).optional(),
  socialVisibility: z.record(z.unknown()).optional(),
});

const updateTenantPrivacySettingsSchema = z.object({
  socialProfileMode: socialProfileModeSchema.optional(),
  requireConsentForSocialFeatures: z.boolean().optional(),
  allowPublicProfiles: z.boolean().optional(),
  enforceRealNamePolicy: z.boolean().optional(),
  shareAchievementsWithEmployer: z.boolean().optional(),
  shareLeaderboardWithEmployer: z.boolean().optional(),
  dataRetentionDays: z.number().int().nullable().optional(),
});

const tenantPrivacySettingsResponseSchema = z.object({
  tenantId: z.string().uuid(),
  socialProfileMode: z.string(),
  requireConsentForSocialFeatures: z.boolean(),
  allowPublicProfiles: z.boolean(),
  enforceRealNamePolicy: z.boolean(),
  shareAchievementsWithEmployer: z.boolean(),
  shareLeaderboardWithEmployer: z.boolean(),
  dataRetentionDays: z.number().int().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const consentPolicySchema = z.object({
  requireConsentForSocialFeatures: z.boolean(),
});

export async function privacyRoutes(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.get(
    '/api/v1/players/me/privacy-settings',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            privacyMode: z.string(),
            socialVisibility: z.record(z.unknown()),
          }),
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const settings = await getOrCreateTenantPrivacySettings(config, user.tenantId);

      return {
        privacyMode: settings.socialProfileMode,
        socialVisibility: {},
      };
    },
  );

  fastify.put(
    '/api/v1/players/me/privacy-settings',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: updatePlayerPrivacySettingsSchema,
        response: {
          200: z.object({
            privacyMode: z.string(),
            socialVisibility: z.record(z.unknown()),
          }),
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      void request.user;
      const body = request.body as z.infer<typeof updatePlayerPrivacySettingsSchema>;

      if (body.privacyMode && !['public', 'friends_only', 'private'].includes(body.privacyMode)) {
        throw new AppError({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Invalid privacy mode',
          statusCode: 400,
        });
      }

      return {
        privacyMode: body.privacyMode || 'public',
        socialVisibility: body.socialVisibility || {},
      };
    },
  );

  fastify.get(
    '/api/v1/tenant/privacy-settings',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: tenantPrivacySettingsResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      if (user.role !== 'admin' && user.role !== 'owner') {
        throw new AppError({
          code: ErrorCodes.AUTH_FORBIDDEN,
          message: 'Only tenant admins can access tenant privacy settings',
          statusCode: 403,
        });
      }

      const settings = await getOrCreateTenantPrivacySettings(config, user.tenantId);

      return {
        tenantId: settings.tenantId,
        socialProfileMode: settings.socialProfileMode,
        requireConsentForSocialFeatures: settings.requireConsentForSocialFeatures,
        allowPublicProfiles: settings.allowPublicProfiles,
        enforceRealNamePolicy: settings.enforceRealNamePolicy,
        shareAchievementsWithEmployer: settings.shareAchievementsWithEmployer,
        shareLeaderboardWithEmployer: settings.shareLeaderboardWithEmployer,
        dataRetentionDays: settings.dataRetentionDays,
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      };
    },
  );

  fastify.put(
    '/api/v1/tenant/privacy-settings',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: updateTenantPrivacySettingsSchema,
        response: {
          200: tenantPrivacySettingsResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body as z.infer<typeof updateTenantPrivacySettingsSchema>;

      if (user.role !== 'admin' && user.role !== 'owner') {
        throw new AppError({
          code: ErrorCodes.AUTH_FORBIDDEN,
          message: 'Only tenant admins can update tenant privacy settings',
          statusCode: 403,
        });
      }

      if (body.socialProfileMode && !isValidSocialProfileMode(body.socialProfileMode)) {
        throw new AppError({
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Invalid social profile mode',
          statusCode: 400,
        });
      }

      const input: UpdateTenantPrivacySettingsInput = {
        ...(body.socialProfileMode && {
          socialProfileMode: body.socialProfileMode,
        }),
        ...(body.requireConsentForSocialFeatures !== undefined && {
          requireConsentForSocialFeatures: body.requireConsentForSocialFeatures,
        }),
        ...(body.allowPublicProfiles !== undefined && {
          allowPublicProfiles: body.allowPublicProfiles,
        }),
        ...(body.enforceRealNamePolicy !== undefined && {
          enforceRealNamePolicy: body.enforceRealNamePolicy,
        }),
        ...(body.shareAchievementsWithEmployer !== undefined && {
          shareAchievementsWithEmployer: body.shareAchievementsWithEmployer,
        }),
        ...(body.shareLeaderboardWithEmployer !== undefined && {
          shareLeaderboardWithEmployer: body.shareLeaderboardWithEmployer,
        }),
        ...(body.dataRetentionDays !== undefined && { dataRetentionDays: body.dataRetentionDays }),
      };

      const settings = await updateTenantPrivacySettings(config, user.tenantId, input);

      if (!settings) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: 'Tenant privacy settings not found',
          statusCode: 404,
        });
      }

      return {
        tenantId: settings.tenantId,
        socialProfileMode: settings.socialProfileMode,
        requireConsentForSocialFeatures: settings.requireConsentForSocialFeatures,
        allowPublicProfiles: settings.allowPublicProfiles,
        enforceRealNamePolicy: settings.enforceRealNamePolicy,
        shareAchievementsWithEmployer: settings.shareAchievementsWithEmployer,
        shareLeaderboardWithEmployer: settings.shareLeaderboardWithEmployer,
        dataRetentionDays: settings.dataRetentionDays,
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      };
    },
  );

  fastify.post<{ Body: z.infer<typeof consentPolicySchema> }>(
    '/api/v1/tenant/consent-policy',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: consentPolicySchema,
        response: {
          200: tenantPrivacySettingsResponseSchema,
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const body = request.body;

      if (user.role !== 'admin' && user.role !== 'owner') {
        throw new AppError({
          code: ErrorCodes.AUTH_FORBIDDEN,
          message: 'Only tenant admins can set consent policy',
          statusCode: 403,
        });
      }

      const settings = await updateTenantPrivacySettings(config, user.tenantId, {
        requireConsentForSocialFeatures: body.requireConsentForSocialFeatures,
      });

      if (!settings) {
        const created = await getOrCreateTenantPrivacySettings(config, user.tenantId);
        return {
          tenantId: created.tenantId,
          socialProfileMode: created.socialProfileMode,
          requireConsentForSocialFeatures: created.requireConsentForSocialFeatures,
          allowPublicProfiles: created.allowPublicProfiles,
          enforceRealNamePolicy: created.enforceRealNamePolicy,
          shareAchievementsWithEmployer: created.shareAchievementsWithEmployer,
          shareLeaderboardWithEmployer: created.shareLeaderboardWithEmployer,
          dataRetentionDays: created.dataRetentionDays,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        };
      }

      return {
        tenantId: settings.tenantId,
        socialProfileMode: settings.socialProfileMode,
        requireConsentForSocialFeatures: settings.requireConsentForSocialFeatures,
        allowPublicProfiles: settings.allowPublicProfiles,
        enforceRealNamePolicy: settings.enforceRealNamePolicy,
        shareAchievementsWithEmployer: settings.shareAchievementsWithEmployer,
        shareLeaderboardWithEmployer: settings.shareLeaderboardWithEmployer,
        dataRetentionDays: settings.dataRetentionDays,
        createdAt: settings.createdAt.toISOString(),
        updatedAt: settings.updatedAt.toISOString(),
      };
    },
  );
}
