import {
  createEmailIntegrationJsonSchema,
  updateEmailIntegrationJsonSchema,
} from '@the-dmz/shared/schemas';
import { ErrorCodes } from '@the-dmz/shared/constants';
import type {
  CreateEmailIntegrationInput,
  UpdateEmailIntegrationInput,
} from '@the-dmz/shared/schemas';

import { emailService } from './email.service.js';
import {
  EmailIntegrationNotFoundError,
  EmailTenantIsolationViolationError,
  EmailStatusTransitionInvalidError,
  EmailValidationFailedError,
  EMAIL_ERROR_CODES,
} from './email.errors.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface TenantContext {
  tenantId: string;
  userId?: string;
  scopes?: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantContext;
  }
}

const EMAIL_SCOPE = 'email.manage';

export async function emailRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const tenantContext = request.tenant;

      if (!tenantContext) {
        throw Object.assign(new Error('Unauthorized'), {
          statusCode: 401,
          code: ErrorCodes.AUTH_UNAUTHORIZED,
        });
      }

      const hasScope =
        tenantContext.scopes?.includes(EMAIL_SCOPE) || tenantContext.scopes?.includes('admin');

      if (!hasScope) {
        throw Object.assign(new Error(`Insufficient scope: ${EMAIL_SCOPE} required`), {
          statusCode: 403,
          code: ErrorCodes.OAUTH_INSUFFICIENT_SCOPE,
        });
      }

      request.tenant = tenantContext;
    },
  );

  fastify.post<{ Body: CreateEmailIntegrationInput }>(
    '/integrations',
    {
      schema: {
        body: createEmailIntegrationJsonSchema,
      },
    },
    async (request: FastifyRequest<{ Body: CreateEmailIntegrationInput }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;

      try {
        const integration = await emailService.createIntegration(
          tenantContext.tenantId,
          request.body,
        );

        return reply.status(201).send({ data: integration });
      } catch (error) {
        const err = error as Error;
        request.log.error({ err }, 'Failed to create email integration');

        return reply.status(500).send({
          code: EMAIL_ERROR_CODES.CONFIG_INVALID,
          message: 'An internal error occurred',
          requestId: request.id,
        });
      }
    },
  );

  fastify.get(
    '/integrations',
    async (
      request: FastifyRequest<{ Querystring: { limit?: number; cursor?: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { limit, cursor } = request.query;

      const queryOptions: { limit?: number; cursor?: string } = {};
      if (limit !== undefined) queryOptions.limit = limit;
      if (cursor !== undefined) queryOptions.cursor = cursor;

      try {
        const result = await emailService.listIntegrations(tenantContext.tenantId, queryOptions);

        return reply.send({
          data: result.integrations,
          total: result.total,
          ...(result.cursor && { cursor: result.cursor }),
        });
      } catch (error) {
        const err = error as Error;
        request.log.error({ err }, 'Failed to list email integrations');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          requestId: request.id,
        });
      }
    },
  );

  fastify.get<{ Params: { integrationId: string } }>(
    '/integrations/:integrationId',
    async (request: FastifyRequest<{ Params: { integrationId: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      try {
        const integration = await emailService.getIntegration(
          tenantContext.tenantId,
          integrationId,
        );

        return reply.send({ data: integration });
      } catch (error) {
        if (error instanceof EmailIntegrationNotFoundError) {
          return reply.status(404).send({
            code: EMAIL_ERROR_CODES.CONFIG_NOT_FOUND,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof EmailTenantIsolationViolationError) {
          return reply.status(403).send({
            code: EMAIL_ERROR_CODES.TENANT_ISOLATION_VIOLATED,
            message: error.message,
            requestId: request.id,
          });
        }

        const err = error as Error;
        request.log.error({ err }, 'Failed to get email integration');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          requestId: request.id,
        });
      }
    },
  );

  fastify.patch<{ Params: { integrationId: string }; Body: UpdateEmailIntegrationInput }>(
    '/integrations/:integrationId',
    {
      schema: {
        body: updateEmailIntegrationJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Params: { integrationId: string };
        Body: UpdateEmailIntegrationInput;
      }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      try {
        const integration = await emailService.updateIntegration(
          tenantContext.tenantId,
          integrationId,
          request.body,
        );

        return reply.send({ data: integration });
      } catch (error) {
        if (error instanceof EmailIntegrationNotFoundError) {
          return reply.status(404).send({
            code: EMAIL_ERROR_CODES.CONFIG_NOT_FOUND,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof EmailTenantIsolationViolationError) {
          return reply.status(403).send({
            code: EMAIL_ERROR_CODES.TENANT_ISOLATION_VIOLATED,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof EmailStatusTransitionInvalidError) {
          return reply.status(400).send({
            code: EMAIL_ERROR_CODES.STATUS_TRANSITION_INVALID,
            message: error.message,
            requestId: request.id,
          });
        }

        const err = error as Error;
        request.log.error({ err }, 'Failed to update email integration');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          requestId: request.id,
        });
      }
    },
  );

  fastify.delete<{ Params: { integrationId: string } }>(
    '/integrations/:integrationId',
    async (request: FastifyRequest<{ Params: { integrationId: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      try {
        await emailService.deleteIntegration(tenantContext.tenantId, integrationId);

        return reply.status(204).send();
      } catch (error) {
        if (error instanceof EmailIntegrationNotFoundError) {
          return reply.status(404).send({
            code: EMAIL_ERROR_CODES.CONFIG_NOT_FOUND,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof EmailTenantIsolationViolationError) {
          return reply.status(403).send({
            code: EMAIL_ERROR_CODES.TENANT_ISOLATION_VIOLATED,
            message: error.message,
            requestId: request.id,
          });
        }

        const err = error as Error;
        request.log.error({ err }, 'Failed to delete email integration');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          requestId: request.id,
        });
      }
    },
  );

  fastify.get<{ Params: { integrationId: string } }>(
    '/integrations/:integrationId/ready',
    async (request: FastifyRequest<{ Params: { integrationId: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      try {
        const result = await emailService.checkReadiness(tenantContext.tenantId, integrationId);

        return reply.send({ data: result });
      } catch (error) {
        if (error instanceof EmailIntegrationNotFoundError) {
          return reply.status(404).send({
            code: EMAIL_ERROR_CODES.CONFIG_NOT_FOUND,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof EmailTenantIsolationViolationError) {
          return reply.status(403).send({
            code: EMAIL_ERROR_CODES.TENANT_ISOLATION_VIOLATED,
            message: error.message,
            requestId: request.id,
          });
        }

        const err = error as Error;
        request.log.error({ err }, 'Failed to check email readiness');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          requestId: request.id,
        });
      }
    },
  );

  fastify.post<{ Params: { integrationId: string } }>(
    '/integrations/:integrationId/ready',
    async (request: FastifyRequest<{ Params: { integrationId: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      try {
        const integration = await emailService.transitionToReady(
          tenantContext.tenantId,
          integrationId,
        );

        return reply.send({ data: integration });
      } catch (error) {
        if (error instanceof EmailIntegrationNotFoundError) {
          return reply.status(404).send({
            code: EMAIL_ERROR_CODES.CONFIG_NOT_FOUND,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof EmailTenantIsolationViolationError) {
          return reply.status(403).send({
            code: EMAIL_ERROR_CODES.TENANT_ISOLATION_VIOLATED,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof EmailStatusTransitionInvalidError) {
          return reply.status(400).send({
            code: EMAIL_ERROR_CODES.STATUS_TRANSITION_INVALID,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof EmailValidationFailedError) {
          return reply.status(400).send({
            code: EMAIL_ERROR_CODES.AUTH_POSTURE_INSUFFICIENT,
            message: error.message,
            failures: error.failures,
            requestId: request.id,
          });
        }

        const err = error as Error;
        request.log.error({ err }, 'Failed to transition to ready');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          requestId: request.id,
        });
      }
    },
  );

  fastify.post<{
    Params: { integrationId: string };
    Body: { runSpfCheck?: boolean; runDkimCheck?: boolean; runDmarcCheck?: boolean };
  }>(
    '/integrations/:integrationId/validate',
    async (
      request: FastifyRequest<{
        Params: { integrationId: string };
        Body: { runSpfCheck?: boolean; runDkimCheck?: boolean; runDmarcCheck?: boolean };
      }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      try {
        const result = await emailService.validateIntegration(tenantContext.tenantId, {
          integrationId,
          runSpfCheck: request.body?.runSpfCheck ?? false,
          runDkimCheck: request.body?.runDkimCheck ?? false,
          runDmarcCheck: request.body?.runDmarcCheck ?? false,
        });

        return reply.send({ data: result });
      } catch (error) {
        if (error instanceof EmailIntegrationNotFoundError) {
          return reply.status(404).send({
            code: EMAIL_ERROR_CODES.CONFIG_NOT_FOUND,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof EmailTenantIsolationViolationError) {
          return reply.status(403).send({
            code: EMAIL_ERROR_CODES.TENANT_ISOLATION_VIOLATED,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof EmailValidationFailedError) {
          return reply.status(400).send({
            code: EMAIL_ERROR_CODES.VALIDATION_FAILED,
            message: error.message,
            failures: error.failures,
            requestId: request.id,
          });
        }

        const err = error as Error;
        request.log.error({ err }, 'Failed to validate email integration');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          requestId: request.id,
        });
      }
    },
  );
}
