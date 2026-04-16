import { createHmac } from 'crypto';

import { z } from 'zod';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { errorResponseSchemas } from '../../shared/schemas/error-schemas.js';
import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import {
  grantConsent,
  revokeConsent,
  getPlayerConsents,
  getDataExport,
  isValidConsentType,
  type ConsentType,
} from './consent.service.js';

import type { AppConfig } from '../../config.js';
import type { FastifyInstance } from 'fastify';
import type { AuthenticatedUser } from '../auth/index.js';

const consentTypeSchema = z.enum([
  'social_features',
  'public_profile',
  'leaderboard_public',
  'data_processing',
]);

const grantConsentBodySchema = z.object({
  consentType: consentTypeSchema,
});

const revokeConsentParamsSchema = z.object({
  consentType: consentTypeSchema,
});

const consentResponseSchema = z.object({
  consentType: z.string(),
  granted: z.boolean(),
  grantedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
});

const consentSummaryResponseSchema = z.object({
  playerId: z.string().uuid(),
  consents: z.array(consentResponseSchema),
});

const dataExportResponseSchema = z.object({
  consents: z.array(
    z.object({
      id: z.string().uuid(),
      playerId: z.string().uuid(),
      tenantId: z.string().uuid(),
      consentType: z.string(),
      granted: z.boolean(),
      grantedAt: z.string().datetime(),
      revokedAt: z.string().datetime().nullable(),
      ipAddressHash: z.string().nullable(),
      userAgent: z.string().nullable(),
    }),
  ),
});

export async function consentRoutes(fastify: FastifyInstance, config: AppConfig): Promise<void> {
  fastify.post<{ Body: z.infer<typeof grantConsentBodySchema> }>(
    '/api/v1/players/me/consent',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        body: grantConsentBodySchema,
        response: {
          200: z.object({ success: z.boolean(), consent: consentResponseSchema }),
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

      const ipAddressHash = request.ip
        ? hashIpAddress(request.ip, config.TOKEN_HASH_SALT)
        : undefined;
      const userAgent = request.headers['user-agent'];

      const grantInput: {
        playerId: string;
        consentType: ConsentType;
        ipAddressHash?: string;
        userAgent?: string;
      } = {
        playerId: user.userId,
        consentType: body.consentType,
      };
      if (ipAddressHash) {
        grantInput.ipAddressHash = ipAddressHash;
      }
      if (typeof userAgent === 'string') {
        grantInput.userAgent = userAgent.substring(0, 500);
      }

      const result = await grantConsent(config, user.tenantId, grantInput);

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.VALIDATION_FAILED,
          message: result.error || 'Failed to grant consent',
          statusCode: 400,
        });
      }

      return {
        success: true,
        consent: {
          consentType: result.consent!.consentType,
          granted: result.consent!.granted,
          grantedAt: result.consent!.grantedAt.toISOString(),
          revokedAt: result.consent!.revokedAt?.toISOString() ?? null,
        },
      };
    },
  );

  fastify.delete<{ Params: z.infer<typeof revokeConsentParamsSchema> }>(
    '/api/v1/players/me/consent/:consentType',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        params: revokeConsentParamsSchema,
        response: {
          200: z.object({ success: z.boolean(), consent: consentResponseSchema }),
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
      const params = request.params;
      const consentTypeValue = params.consentType;

      if (!isValidConsentType(consentTypeValue)) {
        throw new AppError({
          code: ErrorCodes.VALIDATION_FAILED,
          message: `Invalid consent type: ${String(consentTypeValue)}`,
          statusCode: 400,
        });
      }

      const result = await revokeConsent(config, user.tenantId, {
        playerId: user.userId,
        consentType: consentTypeValue,
      });

      if (!result.success) {
        throw new AppError({
          code: ErrorCodes.NOT_FOUND,
          message: result.error || 'Failed to revoke consent',
          statusCode: 404,
        });
      }

      return {
        success: true,
        consent: {
          consentType: result.consent!.consentType,
          granted: result.consent!.granted,
          grantedAt: result.consent!.grantedAt.toISOString(),
          revokedAt: result.consent!.revokedAt?.toISOString() ?? null,
        },
      };
    },
  );

  fastify.get(
    '/api/v1/players/me/consent',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: consentSummaryResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const summary = await getPlayerConsents(config, user.tenantId, user.userId);

      return {
        playerId: summary.playerId,
        consents: summary.consents.map((c) => ({
          consentType: c.consentType,
          granted: c.granted,
          grantedAt: c.grantedAt?.toISOString() ?? null,
          revokedAt: c.revokedAt?.toISOString() ?? null,
        })),
      };
    },
  );

  fastify.get(
    '/api/v1/players/me/data-export',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: dataExportResponseSchema,
          401: errorResponseSchemas.Unauthorized,
          403: errorResponseSchemas.Forbidden,
          500: errorResponseSchemas.InternalServerError,
        },
      },
    },
    async (request, _reply) => {
      const user = request.user as AuthenticatedUser;

      const data = await getDataExport(config, user.tenantId, user.userId);

      return {
        consents: data.consents.map((c) => ({
          id: c.id,
          playerId: c.playerId,
          tenantId: c.tenantId,
          consentType: c.consentType,
          granted: c.granted,
          grantedAt: c.grantedAt.toISOString(),
          revokedAt: c.revokedAt?.toISOString() ?? null,
          ipAddressHash: c.ipAddressHash,
          userAgent: c.userAgent,
        })),
      };
    },
  );
}

function hashIpAddress(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex');
}
