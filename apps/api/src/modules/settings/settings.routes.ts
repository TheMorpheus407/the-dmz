import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';

import {
  getUserSettings,
  updateUserSettings,
  exportUserSettings,
  requestAccountDeletion,
  requestDataExport,
} from './settings.service.js';
import { SettingsRepository } from './settings.repository.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

export async function settingsRoutes(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.get<{ Params: { category: string } }>(
    '/settings/:category',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['display', 'accessibility', 'gameplay', 'audio', 'account', 'all'],
            },
          },
          required: ['category'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              display: {
                type: 'object',
                nullable: true,
              },
              accessibility: {
                type: 'object',
                nullable: true,
              },
              gameplay: {
                type: 'object',
                nullable: true,
              },
              audio: {
                type: 'object',
                nullable: true,
              },
              account: {
                type: 'object',
                nullable: true,
              },
            },
          },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;
      const { category } = request.params;

      const repository = SettingsRepository.create(config);
      const settings = await getUserSettings(repository, user.userId, user.tenantId);

      if (category === 'all') {
        return settings;
      }

      return {
        [category]: settings[category as keyof typeof settings] ?? null,
      };
    },
  );

  fastify.patch<{ Params: { category: string } }>(
    '/settings/:category',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['display', 'accessibility', 'gameplay', 'audio', 'account'],
            },
          },
          required: ['category'],
        },
        body: {
          oneOf: [
            {
              schema: {
                params: { category: { const: 'display' } },
                body: {
                  type: 'object',
                  properties: {
                    theme: {
                      type: 'string',
                      enum: [
                        'green',
                        'amber',
                        'high-contrast',
                        'enterprise',
                        'admin-light',
                        'admin-dark',
                        'custom',
                      ],
                    },
                    enableTerminalEffects: { type: 'boolean' },
                    fontSize: { type: 'number', minimum: 12, maximum: 32 },
                    terminalGlowIntensity: { type: 'number', minimum: 0, maximum: 100 },
                    effects: {
                      type: 'object',
                      properties: {
                        scanlines: { type: 'boolean' },
                        curvature: { type: 'boolean' },
                        glow: { type: 'boolean' },
                        noise: { type: 'boolean' },
                        vignette: { type: 'boolean' },
                        flicker: { type: 'boolean' },
                      },
                      required: ['scanlines', 'curvature', 'glow', 'noise', 'vignette', 'flicker'],
                      additionalProperties: false,
                    },
                    effectIntensity: {
                      type: 'object',
                      properties: {
                        scanlines: { type: 'number', minimum: 0, maximum: 100 },
                        curvature: { type: 'number', minimum: 0, maximum: 100 },
                        glow: { type: 'number', minimum: 0, maximum: 100 },
                        noise: { type: 'number', minimum: 0, maximum: 100 },
                        vignette: { type: 'number', minimum: 0, maximum: 100 },
                        flicker: { type: 'number', minimum: 0, maximum: 100 },
                      },
                      required: ['scanlines', 'curvature', 'glow', 'noise', 'vignette', 'flicker'],
                      additionalProperties: false,
                    },
                  },
                  additionalProperties: false,
                },
              },
            },
            {
              schema: {
                params: { category: { const: 'accessibility' } },
                body: {
                  type: 'object',
                  properties: {
                    reducedMotion: { type: 'boolean' },
                    highContrast: { type: 'boolean' },
                    fontSize: { type: 'number', minimum: 12, maximum: 32 },
                    colorBlindMode: {
                      type: 'string',
                      enum: ['none', 'protanopia', 'deuteranopia', 'tritanopia'],
                    },
                    screenReaderAnnouncements: { type: 'boolean' },
                    keyboardNavigationHints: { type: 'boolean' },
                    focusIndicatorStyle: {
                      type: 'string',
                      enum: ['subtle', 'strong'],
                    },
                  },
                  additionalProperties: false,
                },
              },
            },
            {
              schema: {
                params: { category: { const: 'gameplay' } },
                body: {
                  type: 'object',
                  properties: {
                    difficulty: {
                      type: 'string',
                      enum: ['tutorial', 'easy', 'normal', 'hard'],
                    },
                    notificationVolume: { type: 'number', minimum: 0, maximum: 100 },
                    notificationCategoryVolumes: {
                      type: 'object',
                      additionalProperties: { type: 'number', minimum: 0, maximum: 100 },
                      propertyNames: { enum: ['master', 'alerts', 'ui', 'ambient'] },
                    },
                    notificationDuration: { type: 'number', minimum: 1, maximum: 30 },
                    autoAdvanceTiming: { type: 'number', minimum: 0, maximum: 30 },
                    queueBuildupRate: { type: 'number', minimum: 1, maximum: 10 },
                  },
                  additionalProperties: false,
                },
              },
            },
            {
              schema: {
                params: { category: { const: 'audio' } },
                body: {
                  type: 'object',
                  properties: {
                    masterVolume: { type: 'number', minimum: 0, maximum: 100 },
                    categoryVolumes: {
                      type: 'object',
                      additionalProperties: { type: 'number', minimum: 0, maximum: 100 },
                      propertyNames: { enum: ['alerts', 'ui', 'ambient', 'narrative', 'effects'] },
                    },
                    muteAll: { type: 'boolean' },
                    textToSpeechEnabled: { type: 'boolean' },
                    textToSpeechSpeed: { type: 'number', minimum: 50, maximum: 200 },
                  },
                  additionalProperties: false,
                },
              },
            },
            {
              schema: {
                params: { category: { const: 'account' } },
                body: {
                  type: 'object',
                  properties: {
                    displayName: { type: 'string', minLength: 1, maxLength: 50 },
                    privacyMode: {
                      type: 'string',
                      enum: ['public', 'friends', 'private'],
                    },
                  },
                  additionalProperties: false,
                },
              },
            },
          ],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              settings: { type: 'object' },
            },
          },
          400: errorResponseSchemas.BadRequest,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const { category } = request.params;
      const body = request.body as Record<string, unknown>;

      const repository = SettingsRepository.create(config);
      const settings = await updateUserSettings(
        repository,
        user.userId,
        user.tenantId,
        category,
        body,
      );

      return {
        success: true,
        settings,
      };
    },
  );

  fastify.get(
    '/settings/export',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              settings: { type: 'object' },
              exportedAt: { type: 'string', format: 'date-time' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const repository = SettingsRepository.create(config);
      const exportedData = await exportUserSettings(repository, user.userId, user.tenantId);
      return exportedData;
    },
  );

  fastify.post(
    '/settings/account/data-export',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              requestId: { type: 'string' },
              message: { type: 'string' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const result = await requestDataExport(user.userId, user.tenantId);
      return result;
    },
  );

  fastify.post(
    '/settings/account/delete',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              requestId: { type: 'string' },
              message: { type: 'string' },
            },
          },
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.TenantInactive,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request) => {
      const user = request.user as AuthenticatedUser;
      const result = await requestAccountDeletion(user.userId, user.tenantId);
      return result;
    },
  );
}
