import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { authGuard, requirePermission } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';
import { validateCsrf } from '../auth/index.js'; // eslint-disable-line import-x/no-restricted-paths

import * as userService from './user.service.js';

interface UserIdParams {
  id: string;
}

interface ListUsersQuery {
  page?: number;
  limit?: number;
  sortBy?: 'displayName' | 'email' | 'role' | 'createdAt' | 'lastActive';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  role?: string;
  isActive?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

interface CreateUserBody {
  email: string;
  displayName: string;
  role?: string;
}

interface UpdateUserBody {
  email?: string;
  displayName?: string;
  isActive?: boolean;
}

interface AssignRoleBody {
  roleId: string;
  expiresAt?: string;
}

export const registerAdminUserRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<{ Querystring: ListUsersQuery }>(
    '/admin/users',
    {
      preHandler: [authGuard, tenantContext, requirePermission('users', 'read')],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            sortBy: {
              type: 'string',
              enum: ['displayName', 'email', 'role', 'createdAt', 'lastActive'],
            },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
            search: { type: 'string', maxLength: 255 },
            role: { type: 'string', maxLength: 32 },
            isActive: { type: 'boolean' },
            createdAfter: { type: 'string', format: 'date-time' },
            createdBefore: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: ListUsersQuery }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const params: userService.UserListParams = {};
        if (request.query.page) params.page = request.query.page;
        if (request.query.limit) params.limit = request.query.limit;
        if (request.query.sortBy) params.sortBy = request.query.sortBy;
        if (request.query.sortOrder) params.sortOrder = request.query.sortOrder;
        if (request.query.search) params.search = request.query.search;
        if (request.query.role) params.role = request.query.role;
        if (request.query.isActive !== undefined) params.isActive = request.query.isActive;
        if (request.query.createdAfter) params.createdAfter = new Date(request.query.createdAfter);
        if (request.query.createdBefore)
          params.createdBefore = new Date(request.query.createdBefore);

        const result = await userService.listUsers(
          tenantContext.tenantId,
          params,
          request.server.config,
        );

        return reply.code(200).send({
          success: true,
          data: result,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'USER_LIST_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.get<{ Params: UserIdParams }>(
    '/admin/users/:id',
    {
      preHandler: [authGuard, tenantContext, requirePermission('users', 'read')],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const user = await userService.getUserById(
          tenantContext.tenantId,
          request.params.id,
          request.server.config,
        );

        if (!user) {
          return reply.code(404).send({
            success: false,
            error: { code: 'USER_NOT_FOUND', message: 'User not found' },
          });
        }

        return reply.code(200).send({
          success: true,
          data: user,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'USER_GET_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.post<{ Body: CreateUserBody }>(
    '/admin/users',
    {
      preHandler: [authGuard, tenantContext, validateCsrf, requirePermission('users', 'write')],
      schema: {
        body: {
          type: 'object',
          required: ['email', 'displayName'],
          properties: {
            email: { type: 'string', format: 'email', maxLength: 255 },
            displayName: { type: 'string', minLength: 1, maxLength: 128 },
            role: { type: 'string', maxLength: 32 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateUserBody }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;
      const user = request.user;

      if (!tenantContext || !user) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const newUser = await userService.createUser(
          tenantContext.tenantId,
          {
            email: request.body.email,
            displayName: request.body.displayName,
            role: request.body.role ?? 'learner',
          },
          user.userId,
          request.server.config,
        );

        return reply.code(201).send({
          success: true,
          data: newUser,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'USER_CREATE_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.patch<{ Params: UserIdParams; Body: UpdateUserBody }>(
    '/admin/users/:id',
    {
      preHandler: [authGuard, tenantContext, validateCsrf, requirePermission('users', 'write')],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', maxLength: 255 },
            displayName: { type: 'string', minLength: 1, maxLength: 128 },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: UserIdParams; Body: UpdateUserBody }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenantContext;
      const user = request.user;

      if (!tenantContext || !user) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const updatedUser = await userService.updateUser(
          tenantContext.tenantId,
          request.params.id,
          request.body,
          user.userId,
          request.server.config,
        );

        return reply.code(200).send({
          success: true,
          data: updatedUser,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('last tenant admin')) {
          return reply.code(403).send({
            success: false,
            error: { code: 'CANNOT_DELETE_ADMIN', message: errorMessage },
          });
        }

        if (errorMessage.includes('Cannot delete your own')) {
          return reply.code(403).send({
            success: false,
            error: { code: 'SELF_OPERATION_FORBIDDEN', message: errorMessage },
          });
        }

        return reply.code(400).send({
          success: false,
          error: { code: 'USER_UPDATE_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.delete<{ Params: UserIdParams }>(
    '/admin/users/:id',
    {
      preHandler: [authGuard, tenantContext, validateCsrf, requirePermission('users', 'write')],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;
      const user = request.user;

      if (!tenantContext || !user) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        await userService.deleteUser(
          tenantContext.tenantId,
          request.params.id,
          user.userId,
          request.server.config,
        );

        return reply.code(200).send({
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('last tenant admin')) {
          return reply.code(403).send({
            success: false,
            error: { code: 'CANNOT_DELETE_ADMIN', message: errorMessage },
          });
        }

        if (errorMessage.includes('Cannot delete your own')) {
          return reply.code(403).send({
            success: false,
            error: { code: 'SELF_OPERATION_FORBIDDEN', message: errorMessage },
          });
        }

        return reply.code(400).send({
          success: false,
          error: { code: 'USER_DELETE_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.post<{ Params: UserIdParams; Body: AssignRoleBody }>(
    '/admin/users/:id/roles',
    {
      preHandler: [authGuard, tenantContext, validateCsrf, requirePermission('roles', 'write')],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['roleId'],
          properties: {
            roleId: { type: 'string', format: 'uuid' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: UserIdParams; Body: AssignRoleBody }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenantContext;
      const user = request.user;

      if (!tenantContext || !user) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        await userService.assignUserRole(
          tenantContext.tenantId,
          request.params.id,
          request.body.roleId,
          user.userId,
          request.body.expiresAt ? new Date(request.body.expiresAt) : undefined,
          request.server.config,
        );

        return reply.code(201).send({
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'ROLE_ASSIGN_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.delete<{ Params: { id: string; roleId: string } }>(
    '/admin/users/:id/roles/:roleId',
    {
      preHandler: [authGuard, tenantContext, validateCsrf, requirePermission('roles', 'write')],
      schema: {
        params: {
          type: 'object',
          required: ['id', 'roleId'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            roleId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string; roleId: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenantContext;
      const user = request.user;

      if (!tenantContext || !user) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        await userService.revokeUserRole(
          tenantContext.tenantId,
          request.params.id,
          request.params.roleId,
          user.userId,
          request.server.config,
        );

        return reply.code(200).send({
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'ROLE_REVOKE_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.get<{ Params: UserIdParams }>(
    '/admin/users/:id/activity',
    {
      preHandler: [authGuard, tenantContext, requirePermission('users', 'read')],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const activity = await userService.getUserActivity(
          tenantContext.tenantId,
          request.params.id,
          request.server.config,
        );

        if (!activity) {
          return reply.code(404).send({
            success: false,
            error: { code: 'USER_NOT_FOUND', message: 'User not found' },
          });
        }

        return reply.code(200).send({
          success: true,
          data: activity,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'ACTIVITY_GET_FAILED', message: errorMessage },
        });
      }
    },
  );
};
