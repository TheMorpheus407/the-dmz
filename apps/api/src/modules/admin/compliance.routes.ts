import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { REGULATORY_FRAMEWORKS, isRegulatoryFramework } from '@the-dmz/shared';

import { authGuard, requireRole } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';

import {
  getComplianceSummary,
  getComplianceDetail,
  getFrameworkRequirements,
  calculateComplianceSnapshot,
  calculateAllComplianceSnapshots,
} from './compliance.service.js';

interface FrameworkParams {
  frameworkId: string;
}

export const registerComplianceRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get<Record<string, never>>(
    '/admin/compliance',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'manager', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const data = await getComplianceSummary(tenantId);

        return reply.code(200).send({
          success: true,
          data,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'COMPLIANCE_SUMMARY_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.get<{ Params: FrameworkParams }>(
    '/admin/compliance/:frameworkId',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'manager', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            frameworkId: { type: 'string', enum: REGULATORY_FRAMEWORKS },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: FrameworkParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const { frameworkId } = request.params;

        if (!isRegulatoryFramework(frameworkId)) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'INVALID_FRAMEWORK',
              message: 'Invalid or unknown regulatory framework',
            },
          });
        }

        const data = await getComplianceDetail(tenantId, frameworkId);

        if (!data) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'COMPLIANCE_NOT_FOUND',
              message: 'Compliance data not found. Try calculating first.',
            },
          });
        }

        return reply.code(200).send({
          success: true,
          data,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'COMPLIANCE_DETAIL_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.get<{ Params: FrameworkParams }>(
    '/admin/compliance/:frameworkId/requirements',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'manager', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            frameworkId: { type: 'string', enum: REGULATORY_FRAMEWORKS },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: FrameworkParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const { frameworkId } = request.params;

        if (!isRegulatoryFramework(frameworkId)) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'INVALID_FRAMEWORK',
              message: 'Invalid or unknown regulatory framework',
            },
          });
        }

        const data = await getFrameworkRequirements(tenantId, frameworkId);

        return reply.code(200).send({
          success: true,
          data,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'REQUIREMENTS_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.post<Record<string, never>>(
    '/admin/compliance/calculate',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const userId = request.user?.userId ?? 'system';
        const data = await calculateAllComplianceSnapshots(tenantId, userId);

        return reply.code(200).send({
          success: true,
          data,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'COMPLIANCE_CALCULATE_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );

  fastify.post<{ Params: FrameworkParams }>(
    '/admin/compliance/:frameworkId/calculate',
    {
      preHandler: [authGuard, tenantContext, requireRole('tenant_admin', 'super_admin')],
      schema: {
        params: {
          type: 'object',
          properties: {
            frameworkId: { type: 'string', enum: REGULATORY_FRAMEWORKS },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: FrameworkParams }>, reply: FastifyReply) => {
      try {
        const tenantContextData = request.tenantContext;

        if (!tenantContextData) {
          return reply.code(401).send({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Tenant context required',
            },
          });
        }

        const { tenantId } = tenantContextData;
        const userId = request.user?.userId ?? 'system';
        const { frameworkId } = request.params;

        if (!isRegulatoryFramework(frameworkId)) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'INVALID_FRAMEWORK',
              message: 'Invalid or unknown regulatory framework',
            },
          });
        }

        const data = await calculateComplianceSnapshot(tenantId, frameworkId, userId);

        return reply.code(200).send({
          success: true,
          data,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'COMPLIANCE_CALCULATE_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );
};
