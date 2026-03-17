import { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';

import { authGuard } from '../../shared/middleware/authorization.js';
import { tenantContext } from '../../shared/middleware/tenant-context.js';

import { getDashboardData } from './dashboard.service.js';

import type { DashboardData } from './dashboard.service.js';

export const registerAdminDashboardRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  fastify.get<{}>(
    '/admin/dashboard',
    {
      preHandler: [authGuard, tenantContext],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  tenantInfo: {
                    type: 'object',
                    properties: {
                      tenantId: { type: 'string' },
                      name: { type: 'string' },
                      slug: { type: 'string' },
                      domain: { type: 'string', nullable: true },
                      tier: { type: 'string' },
                      status: { type: 'string' },
                      dataRegion: { type: 'string' },
                      planId: { type: 'string' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                      featureFlags: {
                        type: 'object',
                        properties: {
                          trainingCampaigns: { type: 'boolean' },
                          advancedAnalytics: { type: 'boolean' },
                          customBranding: { type: 'boolean' },
                          apiAccess: { type: 'boolean' },
                          ssoEnabled: { type: 'boolean' },
                        },
                      },
                    },
                  },
                  activeUsers: {
                    type: 'object',
                    properties: {
                      activeSessionCount: { type: 'number' },
                      usersOnlineLast15Min: { type: 'number' },
                      dailyActiveUsers: { type: 'number' },
                      weeklyActiveUsers: { type: 'number' },
                      monthlyActiveUsers: { type: 'number' },
                      userGrowthTrend: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            date: { type: 'string' },
                            count: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                  metrics: {
                    type: 'object',
                    properties: {
                      totalUsers: { type: 'number' },
                      usersByRole: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            role: { type: 'string' },
                            count: { type: 'number' },
                          },
                        },
                      },
                      recentAdminActionsCount: { type: 'number' },
                      campaignCompletionRate: { type: 'number', nullable: true },
                      averageCompetencyScore: { type: 'number', nullable: true },
                    },
                  },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
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

        const dashboardData = await getDashboardData(tenantId);

        const response: { success: boolean; data: DashboardData } = {
          success: true,
          data: dashboardData,
        };

        return reply.code(200).send(response);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.code(500).send({
          success: false,
          error: {
            code: 'DASHBOARD_ERROR',
            message: errorMessage,
          },
        });
      }
    },
  );
};
