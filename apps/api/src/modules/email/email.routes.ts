import {
  createEmailIntegrationJsonSchema,
  updateEmailIntegrationJsonSchema,
} from '@the-dmz/shared/schemas';
import { ErrorCodes } from '@the-dmz/shared/constants';
import type {
  CreateEmailIntegrationInput,
  UpdateEmailIntegrationInput,
} from '@the-dmz/shared/schemas';

import { AppError } from '../../shared/middleware/error-handler.js';

import { emailService } from './email.service.js';

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
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const tenantContext = request.tenant;

      if (!tenantContext) {
        throw new AppError({
          code: ErrorCodes.AUTH_UNAUTHORIZED,
          message: 'Unauthorized',
          statusCode: 401,
        });
      }

      const hasScope =
        tenantContext.scopes?.includes(EMAIL_SCOPE) || tenantContext.scopes?.includes('admin');

      if (!hasScope) {
        throw new AppError({
          code: ErrorCodes.OAUTH_INSUFFICIENT_SCOPE,
          message: `Insufficient scope: ${EMAIL_SCOPE} required`,
          statusCode: 403,
        });
      }

      request.tenant = tenantContext;
    },
  );

  fastify.post<{ Body: CreateEmailIntegrationInput }>(
    '/integrations',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
      schema: {
        body: createEmailIntegrationJsonSchema,
      },
    },
    async (request: FastifyRequest<{ Body: CreateEmailIntegrationInput }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;

      const integration = await emailService.createIntegration(
        tenantContext.tenantId,
        request.body,
      );

      return reply.status(201).send({ data: integration });
    },
  );

  fastify.get(
    '/integrations',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 30,
              timeWindow: '1 minute',
            },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { limit?: number; cursor?: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { limit, cursor } = request.query;

      const queryOptions: { limit?: number; cursor?: string } = {};
      if (limit !== undefined) queryOptions.limit = limit;
      if (cursor !== undefined) queryOptions.cursor = cursor;

      const result = await emailService.listIntegrations(tenantContext.tenantId, queryOptions);

      return reply.send({
        data: result.integrations,
        total: result.total,
        ...(result.cursor && { cursor: result.cursor }),
      });
    },
  );

  fastify.get<{ Params: { integrationId: string } }>(
    '/integrations/:integrationId',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 30,
              timeWindow: '1 minute',
            },
      },
    },
    async (request: FastifyRequest<{ Params: { integrationId: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      const integration = await emailService.getIntegration(tenantContext.tenantId, integrationId);

      return reply.send({ data: integration });
    },
  );

  fastify.patch<{ Params: { integrationId: string }; Body: UpdateEmailIntegrationInput }>(
    '/integrations/:integrationId',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
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

      const integration = await emailService.updateIntegration(
        tenantContext.tenantId,
        integrationId,
        request.body,
      );

      return reply.send({ data: integration });
    },
  );

  fastify.delete<{ Params: { integrationId: string } }>(
    '/integrations/:integrationId',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
    },
    async (request: FastifyRequest<{ Params: { integrationId: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      await emailService.deleteIntegration(tenantContext.tenantId, integrationId);

      return reply.status(204).send();
    },
  );

  fastify.get<{ Params: { integrationId: string } }>(
    '/integrations/:integrationId/ready',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 10,
              timeWindow: '1 minute',
            },
      },
    },
    async (request: FastifyRequest<{ Params: { integrationId: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      const result = await emailService.checkReadiness(tenantContext.tenantId, integrationId);

      return reply.send({ data: result });
    },
  );

  fastify.post<{ Params: { integrationId: string } }>(
    '/integrations/:integrationId/ready',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 5,
              timeWindow: '1 minute',
            },
      },
    },
    async (request: FastifyRequest<{ Params: { integrationId: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      const integration = await emailService.transitionToReady(
        tenantContext.tenantId,
        integrationId,
      );

      return reply.send({ data: integration });
    },
  );

  fastify.post<{
    Params: { integrationId: string };
    Body: { runSpfCheck?: boolean; runDkimCheck?: boolean; runDmarcCheck?: boolean };
  }>(
    '/integrations/:integrationId/validate',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 5,
              timeWindow: '1 minute',
            },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { integrationId: string };
        Body: { runSpfCheck?: boolean; runDkimCheck?: boolean; runDmarcCheck?: boolean };
      }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { integrationId } = request.params;

      const result = await emailService.validateIntegration(tenantContext.tenantId, {
        integrationId,
        runSpfCheck: request.body?.runSpfCheck ?? false,
        runDkimCheck: request.body?.runDkimCheck ?? false,
        runDmarcCheck: request.body?.runDmarcCheck ?? false,
      });

      return reply.send({ data: result });
    },
  );
}
