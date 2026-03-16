import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import * as roleAssignmentService from './role-assignment.service.js';

interface AssignRoleBody {
  userId: string;
  roleId: string;
  expiresAt?: string;
  scope?: string;
}

interface UpdateRoleBody {
  expiresAt?: string;
  scope?: string;
}

interface RevokeRoleParams {
  userId: string;
  roleId: string;
}

interface RoleIdParams {
  id: string;
}

interface UserIdParams {
  userId: string;
}

interface CreateCustomRoleBody {
  name: string;
  description: string;
  permissionIds: string[];
}

interface UpdateCustomRoleBody {
  name: string;
  description: string;
  permissionIds: string[];
}

export const registerAdminRoleRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.post<{ Body: AssignRoleBody }>(
    '/admin/roles/assign',
    {
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'roleId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            roleId: { type: 'string', format: 'uuid' },
            expiresAt: { type: 'string', format: 'date-time' },
            scope: { type: 'string', maxLength: 128 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: AssignRoleBody }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;
      const user = request.user;

      if (!tenantContext || !user) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const assignInput: {
          userId: string;
          roleId: string;
          expiresAt?: Date;
          scope?: string;
          assignedBy: string;
        } = {
          userId: request.body.userId,
          roleId: request.body.roleId,
          assignedBy: user.userId,
        };

        if (request.body.expiresAt) {
          assignInput.expiresAt = new Date(request.body.expiresAt);
        }

        if (request.body.scope) {
          assignInput.scope = request.body.scope;
        }

        const assignment = await roleAssignmentService.assignRole(
          tenantContext.tenantId,
          assignInput,
          request.server.config,
        );

        return reply.code(201).send({
          success: true,
          data: assignment,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'ROLE_ASSIGNMENT_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.delete<{ Params: RevokeRoleParams }>(
    '/admin/roles/revoke/:userId/:roleId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['userId', 'roleId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            roleId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: RevokeRoleParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        await roleAssignmentService.revokeRole(
          tenantContext.tenantId,
          request.params.userId,
          request.params.roleId,
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

  fastify.put<{ Params: RevokeRoleParams; Body: UpdateRoleBody }>(
    '/admin/roles/update/:userId/:roleId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['userId', 'roleId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
            roleId: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            expiresAt: { type: 'string', format: 'date-time' },
            scope: { type: 'string', maxLength: 128 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: RevokeRoleParams; Body: UpdateRoleBody }>,
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
        const updateInput: { expiresAt?: Date; scope?: string; assignedBy: string } = {
          assignedBy: user.userId,
        };

        if (request.body.expiresAt) {
          updateInput.expiresAt = new Date(request.body.expiresAt);
        }

        if (request.body.scope) {
          updateInput.scope = request.body.scope;
        }

        const assignment = await roleAssignmentService.updateRoleAssignment(
          tenantContext.tenantId,
          request.params.userId,
          request.params.roleId,
          updateInput,
          request.server.config,
        );

        return reply.code(200).send({
          success: true,
          data: assignment,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'ROLE_UPDATE_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.get<{ Params: UserIdParams }>(
    '/admin/users/:userId/effective-permissions',
    {
      schema: {
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
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
        const effectivePermissions = await roleAssignmentService.getUserEffectivePermissions(
          tenantContext.tenantId,
          request.params.userId,
          request.server.config,
        );

        return reply.code(200).send({
          success: true,
          data: effectivePermissions,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'PERMISSION_QUERY_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.get('/admin/roles', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantContext = req.tenantContext;

    if (!tenantContext) {
      return reply.code(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    try {
      const roles = await roleAssignmentService.getTenantRoles(
        tenantContext.tenantId,
        req.server.config,
      );

      return reply.code(200).send({
        success: true,
        data: roles,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return reply.code(400).send({
        success: false,
        error: { code: 'ROLES_LIST_FAILED', message: errorMessage },
      });
    }
  });

  fastify.get<{ Params: RoleIdParams }>(
    '/admin/roles/:id/permissions',
    {
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
    async (request: FastifyRequest<{ Params: RoleIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const permissions = await roleAssignmentService.getRolePermissions(
          tenantContext.tenantId,
          request.params.id,
          request.server.config,
        );

        return reply.code(200).send({
          success: true,
          data: permissions,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'PERMISSIONS_GET_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.get('/admin/permissions', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const permissions = await roleAssignmentService.getAllPermissions(req.server.config);

      return reply.code(200).send({
        success: true,
        data: permissions,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return reply.code(400).send({
        success: false,
        error: { code: 'PERMISSIONS_LIST_FAILED', message: errorMessage },
      });
    }
  });

  fastify.post<{ Body: CreateCustomRoleBody }>(
    '/admin/roles/custom',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'description', 'permissionIds'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 64 },
            description: { type: 'string', maxLength: 512 },
            permissionIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateCustomRoleBody }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const isEntitled = await roleAssignmentService.checkPlanEntitlement(
          tenantContext.tenantId,
          request.server.config,
        );

        if (!isEntitled) {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'PLAN_NOT_ENTITLED',
              message: 'Custom roles are only available on Enterprise or Government plans',
            },
          });
        }

        const role = await roleAssignmentService.createCustomRole(
          tenantContext.tenantId,
          request.body.name,
          request.body.description,
          request.body.permissionIds,
          request.server.config,
        );

        return reply.code(201).send({
          success: true,
          data: role,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'CUSTOM_ROLE_CREATE_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.put<{ Params: RoleIdParams; Body: UpdateCustomRoleBody }>(
    '/admin/roles/custom/:id',
    {
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
          required: ['name', 'description', 'permissionIds'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 64 },
            description: { type: 'string', maxLength: 512 },
            permissionIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: RoleIdParams; Body: UpdateCustomRoleBody }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const isEntitled = await roleAssignmentService.checkPlanEntitlement(
          tenantContext.tenantId,
          request.server.config,
        );

        if (!isEntitled) {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'PLAN_NOT_ENTITLED',
              message: 'Custom roles are only available on Enterprise or Government plans',
            },
          });
        }

        const role = await roleAssignmentService.updateCustomRole(
          tenantContext.tenantId,
          request.params.id,
          request.body.name,
          request.body.description,
          request.body.permissionIds,
          request.server.config,
        );

        return reply.code(200).send({
          success: true,
          data: role,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'CUSTOM_ROLE_UPDATE_FAILED', message: errorMessage },
        });
      }
    },
  );

  fastify.delete<{ Params: RoleIdParams }>(
    '/admin/roles/custom/:id',
    {
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
    async (request: FastifyRequest<{ Params: RoleIdParams }>, reply: FastifyReply) => {
      const tenantContext = request.tenantContext;

      if (!tenantContext) {
        return reply.code(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      try {
        const isEntitled = await roleAssignmentService.checkPlanEntitlement(
          tenantContext.tenantId,
          request.server.config,
        );

        if (!isEntitled) {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'PLAN_NOT_ENTITLED',
              message: 'Custom roles are only available on Enterprise or Government plans',
            },
          });
        }

        await roleAssignmentService.deleteCustomRole(
          tenantContext.tenantId,
          request.params.id,
          request.server.config,
        );

        return reply.code(200).send({
          success: true,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(400).send({
          success: false,
          error: { code: 'CUSTOM_ROLE_DELETE_FAILED', message: errorMessage },
        });
      }
    },
  );
};
