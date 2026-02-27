import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import type {
  SSOValidationRequest,
  SSOActivationRequest,
  SCIMValidationRequest,
} from '@the-dmz/shared/auth';
import { ErrorCodes } from '@the-dmz/shared/constants';

import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { requireRole } from '../../shared/middleware/authorization.js';

import { authGuard } from './auth.routes.js';
import {
  getValidationPreflight,
  runOIDCValidation,
  runSAMLValidation,
  runSCIMValidation,
  activateSSO,
  getValidationSummary,
  SSOValidationError,
} from './auth.preflight.service.js';

const adminPreHandler = requireRole('admin');

export async function preflightRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { providerId: string } }>(
    '/auth/sso/validation/preflight/:providerId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
    },
    async (request: FastifyRequest<{ Params: { providerId: string } }>, reply: FastifyReply) => {
      try {
        const user = request.user as { tenantId: string };
        const { providerId } = request.params;

        const preflight = await getValidationPreflight(providerId, user.tenantId);

        return reply.send({
          success: true,
          data: preflight,
        });
      } catch (error) {
        if (error instanceof SSOValidationError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }

        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
          },
        });
      }
    },
  );

  fastify.post<{ Body: SSOValidationRequest }>(
    '/auth/sso/validation/run',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, adminPreHandler],
    },
    async (request: FastifyRequest<{ Body: SSOValidationRequest }>, reply: FastifyReply) => {
      try {
        const user = request.user as { tenantId: string; userId: string };
        const { providerId, validationType, testClaims } = request.body;
        const userId = user.userId;

        let result;

        if (validationType === 'oidc') {
          const claims = testClaims
            ? {
                email: testClaims.email ?? undefined,
                groups: testClaims.groups ?? undefined,
              }
            : undefined;
          result = await runOIDCValidation(providerId, user.tenantId, claims, userId);
        } else if (validationType === 'saml') {
          result = await runSAMLValidation(providerId, user.tenantId, userId);
        } else if (validationType === 'scim') {
          return reply.status(400).send({
            success: false,
            error: {
              code: ErrorCodes.INVALID_INPUT,
              message: 'SCIM validation requires separate endpoint',
            },
          });
        } else {
          return reply.status(400).send({
            success: false,
            error: {
              code: ErrorCodes.INVALID_INPUT,
              message: 'Invalid validation type',
            },
          });
        }

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof SSOValidationError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }

        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
          },
        });
      }
    },
  );

  fastify.post<{ Body: SCIMValidationRequest }>(
    '/auth/scim/validation/run',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, adminPreHandler],
    },
    async (request: FastifyRequest<{ Body: SCIMValidationRequest }>, reply: FastifyReply) => {
      try {
        const user = request.user as { tenantId: string; userId: string };
        const { baseUrl, bearerToken, dryRunEmail } = request.body;
        const userId = user.userId;

        const result = await runSCIMValidation(
          baseUrl,
          bearerToken,
          user.tenantId,
          dryRunEmail,
          userId,
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof SSOValidationError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }

        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
          },
        });
      }
    },
  );

  fastify.get<{ Params: { providerId: string } }>(
    '/auth/sso/validation/summary/:providerId',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard],
    },
    async (request: FastifyRequest<{ Params: { providerId: string } }>, reply: FastifyReply) => {
      try {
        const user = request.user as { tenantId: string };
        const { providerId } = request.params;

        const summary = await getValidationSummary(providerId, user.tenantId);

        return reply.send({
          success: true,
          data: summary,
        });
      } catch (error) {
        if (error instanceof SSOValidationError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }

        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
          },
        });
      }
    },
  );

  fastify.post<{ Body: SSOActivationRequest }>(
    '/auth/sso/activation',
    {
      preHandler: [authGuard, tenantContext, tenantStatusGuard, adminPreHandler],
    },
    async (request: FastifyRequest<{ Body: SSOActivationRequest }>, reply: FastifyReply) => {
      try {
        const user = request.user as { tenantId: string; userId: string };
        const { providerId, enforceSSOOnly } = request.body;
        const userId = user.userId;

        const result = await activateSSO(providerId, user.tenantId, enforceSSOOnly, userId);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof SSOValidationError) {
          return reply.status(error.statusCode).send({
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }

        request.log.error(error);
        return reply.status(500).send({
          success: false,
          error: {
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
          },
        });
      }
    },
  );
}
