import { type WebhookSubscriptionStatus, WEBHOOK_RATE_LIMITS } from '@the-dmz/shared/contracts';

import { webhookService } from './webhook.service.js';
import { WebhookUnauthorizedError, WebhookInsufficientScopeError } from './webhook.errors.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const WEBHOOK_SCOPE = 'webhooks.manage';

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

const createWebhookSubscriptionJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    targetUrl: { type: 'string', format: 'uri' },
    eventTypes: { type: 'array', items: { type: 'string' }, minItems: 1 },
    filters: { type: 'object' },
    ipAllowlist: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'targetUrl', 'eventTypes'],
  additionalProperties: false,
} as const;

const updateWebhookSubscriptionJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    targetUrl: { type: 'string', format: 'uri' },
    eventTypes: { type: 'array', items: { type: 'string' }, minItems: 1 },
    filters: { type: 'object' },
    status: { type: 'string', enum: ['active', 'disabled', 'test_pending', 'failure_disabled'] },
    ipAllowlist: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
} as const;

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  const config = fastify.config;
  const isTest = config.NODE_ENV === 'test';

  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const tenantContext = request.tenant;

      if (!tenantContext) {
        throw new WebhookUnauthorizedError();
      }

      const hasScope =
        tenantContext.scopes?.includes(WEBHOOK_SCOPE) || tenantContext.scopes?.includes('admin');

      if (!hasScope && request.url !== '/health') {
        throw new WebhookInsufficientScopeError(WEBHOOK_SCOPE);
      }

      request.tenant = tenantContext;
    },
  );

  fastify.post<{
    Body: {
      name: string;
      targetUrl: string;
      eventTypes: string[];
      filters?: Record<string, unknown>;
      ipAllowlist?: string[];
    };
  }>(
    '/subscriptions',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: 20,
              timeWindow: '1 minute',
            },
      },
      schema: {
        body: createWebhookSubscriptionJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          name: string;
          targetUrl: string;
          eventTypes: string[];
          filters?: Record<string, unknown>;
          ipAllowlist?: string[];
        };
      }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;

      const subscription = await webhookService.createSubscription(
        tenantContext.tenantId,
        request.body,
      );

      return reply.status(201).send({
        data: subscription,
      });
    },
  );

  fastify.get(
    '/subscriptions',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: WEBHOOK_RATE_LIMITS.LIST.limit,
              timeWindow: '1 minute',
            },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { status?: string; limit?: number; cursor?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { status, limit, cursor } = request.query;
      const queryOptions: { status?: string; limit?: number; cursor?: string } = {};

      if (status) queryOptions.status = status;
      if (limit) queryOptions.limit = limit;
      if (cursor) queryOptions.cursor = cursor;

      const result = await webhookService.listSubscriptions(tenantContext.tenantId, queryOptions);

      return reply.send({
        data: result.subscriptions,
        ...(result.nextCursor !== undefined && { nextCursor: result.nextCursor }),
      });
    },
  );

  fastify.get<{
    Params: { subscriptionId: string };
  }>(
    '/subscriptions/:subscriptionId',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: WEBHOOK_RATE_LIMITS.GET.limit,
              timeWindow: '1 minute',
            },
      },
    },
    async (
      request: FastifyRequest<{ Params: { subscriptionId: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { subscriptionId } = request.params;

      const subscription = await webhookService.getSubscription(
        tenantContext.tenantId,
        subscriptionId,
      );

      return reply.send({ data: subscription });
    },
  );

  fastify.patch<{
    Params: { subscriptionId: string };
    Body: {
      name?: string;
      targetUrl?: string;
      eventTypes?: string[];
      filters?: Record<string, unknown>;
      status?: string;
      ipAllowlist?: string[];
    };
  }>(
    '/subscriptions/:subscriptionId',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: WEBHOOK_RATE_LIMITS.UPDATE.limit,
              timeWindow: '1 minute',
            },
      },
      schema: {
        body: updateWebhookSubscriptionJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Params: { subscriptionId: string };
        Body: {
          name?: string;
          targetUrl?: string;
          eventTypes?: string[];
          filters?: Record<string, unknown>;
          status?: string;
          ipAllowlist?: string[];
        };
      }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { subscriptionId } = request.params;

      const updateData: {
        name?: string;
        targetUrl?: string;
        eventTypes?: string[];
        filters?: Record<string, unknown>;
        status?: WebhookSubscriptionStatus;
        ipAllowlist?: string[];
      } = {};

      if (request.body.name !== undefined) updateData.name = request.body.name;
      if (request.body.targetUrl !== undefined) updateData.targetUrl = request.body.targetUrl;
      if (request.body.eventTypes !== undefined) updateData.eventTypes = request.body.eventTypes;
      if (request.body.filters !== undefined) updateData.filters = request.body.filters;
      if (request.body.status !== undefined) {
        updateData.status = request.body.status as WebhookSubscriptionStatus;
      }
      if (request.body.ipAllowlist !== undefined) updateData.ipAllowlist = request.body.ipAllowlist;

      const subscription = await webhookService.updateSubscription(
        tenantContext.tenantId,
        subscriptionId,
        updateData as Parameters<typeof webhookService.updateSubscription>[2],
      );

      return reply.send({ data: subscription });
    },
  );

  fastify.delete<{
    Params: { subscriptionId: string };
  }>(
    '/subscriptions/:subscriptionId',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: WEBHOOK_RATE_LIMITS.DELETE.limit,
              timeWindow: '1 minute',
            },
      },
    },
    async (
      request: FastifyRequest<{ Params: { subscriptionId: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { subscriptionId } = request.params;

      await webhookService.deleteSubscription(tenantContext.tenantId, subscriptionId);

      return reply.status(204).send();
    },
  );

  fastify.post<{
    Params: { subscriptionId: string };
  }>(
    '/subscriptions/:subscriptionId/test',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: WEBHOOK_RATE_LIMITS.TEST.limit,
              timeWindow: '1 minute',
            },
      },
    },
    async (
      request: FastifyRequest<{ Params: { subscriptionId: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { subscriptionId } = request.params;

      const result = await webhookService.testSubscription(tenantContext.tenantId, subscriptionId);

      return reply.send({ data: result });
    },
  );

  fastify.post<{
    Params: { subscriptionId: string };
  }>(
    '/subscriptions/:subscriptionId/rotate-secret',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: WEBHOOK_RATE_LIMITS.ROTATE_SECRET.limit,
              timeWindow: '1 minute',
            },
      },
    },
    async (
      request: FastifyRequest<{ Params: { subscriptionId: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { subscriptionId } = request.params;

      const result = await webhookService.rotateSecret(tenantContext.tenantId, subscriptionId);

      return reply.send({ data: result });
    },
  );

  fastify.get(
    '/deliveries',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: WEBHOOK_RATE_LIMITS.DELIVERY_LIST.limit,
              timeWindow: '1 minute',
            },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          subscriptionId?: string;
          status?: string;
          limit?: number;
          cursor?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { subscriptionId, status, limit, cursor } = request.query;
      const queryOptions: {
        subscriptionId?: string;
        status?: string;
        limit?: number;
        cursor?: string;
      } = {};

      if (subscriptionId) queryOptions.subscriptionId = subscriptionId;
      if (status) queryOptions.status = status;
      if (limit) queryOptions.limit = limit;
      if (cursor) queryOptions.cursor = cursor;

      const result = await webhookService.listDeliveries(tenantContext.tenantId, queryOptions);

      return reply.send({
        data: result.deliveries,
        ...(result.nextCursor !== undefined && { nextCursor: result.nextCursor }),
      });
    },
  );

  fastify.get<{
    Params: { deliveryId: string };
  }>(
    '/deliveries/:deliveryId',
    {
      config: {
        rateLimit: isTest
          ? false
          : {
              max: WEBHOOK_RATE_LIMITS.DELIVERY_GET.limit,
              timeWindow: '1 minute',
            },
      },
    },
    async (request: FastifyRequest<{ Params: { deliveryId: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const { deliveryId } = request.params;

      const delivery = await webhookService.getDelivery(tenantContext.tenantId, deliveryId);

      return reply.send({ data: delivery });
    },
  );
}
