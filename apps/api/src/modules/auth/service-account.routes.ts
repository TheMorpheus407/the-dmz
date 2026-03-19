import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import type { AuthenticatedUserWithMfa } from '@the-dmz/shared/types/auth';
import { ErrorCodes } from '@the-dmz/shared/constants/error-codes';

import { getDatabaseClient } from '../../shared/database/connection.js';
import { preAuthTenantResolver } from '../../shared/middleware/pre-auth-tenant-resolver.js';
import { preAuthTenantStatusGuard } from '../../shared/middleware/pre-auth-tenant-status-guard.js';
import { tenantStatusGuard } from '../../shared/middleware/tenant-status-guard.js';
import { createAppError } from '../../shared/middleware/error-handler.js';

import { serviceAccountService } from './service-account.service.js';

async function serviceAccountRoutes(fastify: FastifyInstance) {
  fastify.get<{
    Querystring: {
      cursor?: string;
      limit?: number;
      status?: string;
    };
  }>(
    '/auth/service-accounts',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          cursor?: string;
          limit?: number;
          status?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId } = user;
      const db = getDatabaseClient();

      const options: {
        cursor?: string;
        limit?: number;
        status?: 'active' | 'disabled' | 'deleted';
      } = {};
      if (request.query.cursor) options.cursor = request.query.cursor;
      if (request.query.limit) options.limit = request.query.limit;
      if (request.query.status)
        options.status = request.query.status as 'active' | 'disabled' | 'deleted';

      const result = await serviceAccountService.listServiceAccounts(db, tenantId, options);

      return reply.send(result);
    },
  );

  fastify.post<{
    Body: {
      name: string;
      description?: string;
      ownerId?: string;
      metadata?: Record<string, unknown>;
    };
  }>(
    '/auth/service-accounts',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          description?: string;
          ownerId?: string;
          metadata?: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId, userId } = user;
      const db = getDatabaseClient();

      const result = await serviceAccountService.createServiceAccount(
        db,
        {
          name: request.body.name,
          description: request.body.description,
          ownerId: request.body.ownerId,
          metadata: request.body.metadata,
        },
        userId,
        tenantId,
      );

      return reply.code(201).send(result);
    },
  );

  fastify.get<{
    Params: { serviceId: string };
  }>(
    '/auth/service-accounts/:serviceId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Params: { serviceId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId } = user;
      const { serviceId } = request.params;
      const db = getDatabaseClient();

      const result = await serviceAccountService.getServiceAccountById(db, serviceId, tenantId);

      if (!result) {
        throw createAppError(ErrorCodes.NOT_FOUND, 'Service account not found');
      }

      return reply.send(result);
    },
  );

  fastify.patch<{
    Params: { serviceId: string };
    Body: {
      name?: string;
      description?: string;
      ownerId?: string;
      metadata?: Record<string, unknown>;
    };
  }>(
    '/auth/service-accounts/:serviceId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Params: { serviceId: string };
        Body: {
          name?: string;
          description?: string;
          ownerId?: string;
          metadata?: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId, userId } = user;
      const { serviceId } = request.params;
      const db = getDatabaseClient();

      const result = await serviceAccountService.updateServiceAccount(
        db,
        serviceId,
        {
          name: request.body.name,
          description: request.body.description,
          ownerId: request.body.ownerId,
          metadata: request.body.metadata,
        },
        tenantId,
        userId,
      );

      return reply.send(result);
    },
  );

  fastify.post<{
    Params: { serviceId: string };
  }>(
    '/auth/service-accounts/:serviceId/disable',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Params: { serviceId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId, userId } = user;
      const { serviceId } = request.params;
      const db = getDatabaseClient();

      const result = await serviceAccountService.disableServiceAccount(
        db,
        serviceId,
        tenantId,
        userId,
      );

      return reply.send(result);
    },
  );

  fastify.post<{
    Params: { serviceId: string };
  }>(
    '/auth/service-accounts/:serviceId/enable',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Params: { serviceId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId, userId } = user;
      const { serviceId } = request.params;
      const db = getDatabaseClient();

      const result = await serviceAccountService.enableServiceAccount(
        db,
        serviceId,
        tenantId,
        userId,
      );

      return reply.send(result);
    },
  );

  fastify.delete<{
    Params: { serviceId: string };
  }>(
    '/auth/service-accounts/:serviceId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Params: { serviceId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId, userId } = user;
      const { serviceId } = request.params;
      const db = getDatabaseClient();

      await serviceAccountService.deleteServiceAccount(db, serviceId, tenantId, userId);

      return reply.code(204).send();
    },
  );

  fastify.get<{
    Params: { serviceId: string };
  }>(
    '/auth/service-accounts/:serviceId/roles',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Params: { serviceId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId } = user;
      const { serviceId } = request.params;
      const db = getDatabaseClient();

      const result = await serviceAccountService.getServiceAccountRoles(db, serviceId, tenantId);

      return reply.send(result);
    },
  );

  fastify.post<{
    Params: { serviceId: string };
    Body: {
      roleId: string;
      expiresAt?: string;
      scope?: string;
    };
  }>(
    '/auth/service-accounts/:serviceId/roles',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Params: { serviceId: string };
        Body: {
          roleId: string;
          expiresAt?: string;
          scope?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId, userId } = user;
      const { serviceId } = request.params;
      const db = getDatabaseClient();

      await serviceAccountService.assignRoleToServiceAccount(
        db,
        serviceId,
        {
          roleId: request.body.roleId,
          expiresAt: request.body.expiresAt ? new Date(request.body.expiresAt) : undefined,
          scope: request.body.scope,
          assignedBy: userId,
        },
        tenantId,
      );

      return reply.code(201).send({ success: true });
    },
  );

  fastify.delete<{
    Params: { serviceId: string; roleId: string };
  }>(
    '/auth/service-accounts/:serviceId/roles/:roleId',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Params: { serviceId: string; roleId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId, userId } = user;
      const { serviceId, roleId } = request.params;
      const db = getDatabaseClient();

      await serviceAccountService.revokeRoleFromServiceAccount(
        db,
        serviceId,
        roleId,
        tenantId,
        userId,
      );

      return reply.code(204).send();
    },
  );

  fastify.get<{
    Params: { serviceId: string };
  }>(
    '/auth/service-accounts/:serviceId/api-keys',
    {
      preHandler: [preAuthTenantResolver(), preAuthTenantStatusGuard, tenantStatusGuard],
    },
    async (
      request: FastifyRequest<{
        Params: { serviceId: string };
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user as AuthenticatedUserWithMfa;
      const { tenantId } = user;
      const { serviceId } = request.params;
      const db = getDatabaseClient();

      const result = await serviceAccountService.getServiceAccountApiKeys(db, serviceId, tenantId);

      return reply.send(result);
    },
  );
}

export { serviceAccountRoutes };
