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

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';

interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

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

      const settings = await getUserSettings(config, user.userId, user.tenantId);

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
          type: 'object',
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

      const settings = await updateUserSettings(config, user.userId, user.tenantId, category, body);

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
      const exportedData = await exportUserSettings(config, user.userId, user.tenantId);
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
      const result = await requestDataExport(config, user.userId, user.tenantId);
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
      const result = await requestAccountDeletion(config, user.userId, user.tenantId);
      return result;
    },
  );
}
