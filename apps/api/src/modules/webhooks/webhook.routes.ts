import { type WebhookSubscriptionStatus } from '@the-dmz/shared/contracts';

import { webhookService } from './webhook.service.js';
import {
  WebhookSubscriptionNotFoundError,
  WebhookCircuitBreakerOpenError,
  WEBHOOK_ERROR_CODES,
} from './webhook.errors.js';

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
  },
  additionalProperties: false,
} as const;

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const tenantContext = request.tenant;

      if (!tenantContext) {
        throw Object.assign(new Error('Unauthorized'), {
          statusCode: 401,
          code: WEBHOOK_ERROR_CODES.UNAUTHORIZED,
        });
      }

      const hasScope =
        tenantContext.scopes?.includes(WEBHOOK_SCOPE) || tenantContext.scopes?.includes('admin');

      if (!hasScope && request.url !== '/health') {
        throw Object.assign(new Error(`Insufficient scope: ${WEBHOOK_SCOPE} required`), {
          statusCode: 403,
          code: WEBHOOK_ERROR_CODES.INSUFFICIENT_SCOPE,
        });
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
    };
  }>(
    '/subscriptions',
    {
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
        };
      }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;

      try {
        const subscription = await webhookService.createSubscription(
          tenantContext.tenantId,
          request.body,
        );

        return reply.status(201).send({
          data: subscription,
        });
      } catch (error) {
        const err = error as Error;
        request.log.error({ err }, 'Failed to create webhook subscription');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
          requestId: request.id,
        });
      }
    },
  );

  fastify.get(
    '/subscriptions',
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

      try {
        const result = await webhookService.listSubscriptions(tenantContext.tenantId, queryOptions);

        return reply.send({
          data: result.subscriptions,
          ...(result.nextCursor !== undefined && { nextCursor: result.nextCursor }),
        });
      } catch (error) {
        const err = error as Error;
        request.log.error({ err }, 'Failed to list webhook subscriptions');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
          requestId: request.id,
        });
      }
    },
  );

  fastify.get<{
    Params: { subscriptionId: string };
  }>(
    '/subscriptions/:subscriptionId',
    async (
      request: FastifyRequest<{ Params: { subscriptionId: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { subscriptionId } = request.params;

      try {
        const subscription = await webhookService.getSubscription(
          tenantContext.tenantId,
          subscriptionId,
        );

        return reply.send({ data: subscription });
      } catch (error) {
        if (error instanceof WebhookSubscriptionNotFoundError) {
          return reply.status(404).send({
            code: WEBHOOK_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
            message: error.message,
            requestId: request.id,
          });
        }

        const err = error as Error;
        request.log.error({ err }, 'Failed to get webhook subscription');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
          requestId: request.id,
        });
      }
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
    };
  }>(
    '/subscriptions/:subscriptionId',
    {
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
        };
      }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { subscriptionId } = request.params;

      try {
        const updateData: {
          name?: string;
          targetUrl?: string;
          eventTypes?: string[];
          filters?: Record<string, unknown>;
          status?: WebhookSubscriptionStatus;
        } = {};

        if (request.body.name !== undefined) updateData.name = request.body.name;
        if (request.body.targetUrl !== undefined) updateData.targetUrl = request.body.targetUrl;
        if (request.body.eventTypes !== undefined) updateData.eventTypes = request.body.eventTypes;
        if (request.body.filters !== undefined) updateData.filters = request.body.filters;
        if (request.body.status !== undefined) {
          updateData.status = request.body.status as WebhookSubscriptionStatus;
        }

        const subscription = await webhookService.updateSubscription(
          tenantContext.tenantId,
          subscriptionId,
          updateData,
        );

        return reply.send({ data: subscription });
      } catch (error) {
        if (error instanceof WebhookSubscriptionNotFoundError) {
          return reply.status(404).send({
            code: WEBHOOK_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
            message: error.message,
            requestId: request.id,
          });
        }

        const err = error as Error;
        request.log.error({ err }, 'Failed to update webhook subscription');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
          requestId: request.id,
        });
      }
    },
  );

  fastify.delete<{
    Params: { subscriptionId: string };
  }>(
    '/subscriptions/:subscriptionId',
    async (
      request: FastifyRequest<{ Params: { subscriptionId: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { subscriptionId } = request.params;

      try {
        await webhookService.deleteSubscription(tenantContext.tenantId, subscriptionId);

        return reply.status(204).send();
      } catch (error) {
        if (error instanceof WebhookSubscriptionNotFoundError) {
          return reply.status(404).send({
            code: WEBHOOK_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
            message: error.message,
            requestId: request.id,
          });
        }

        const err = error as Error;
        request.log.error({ err }, 'Failed to delete webhook subscription');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
          requestId: request.id,
        });
      }
    },
  );

  fastify.post<{
    Params: { subscriptionId: string };
  }>(
    '/subscriptions/:subscriptionId/test',
    async (
      request: FastifyRequest<{ Params: { subscriptionId: string } }>,
      reply: FastifyReply,
    ) => {
      const tenantContext = request.tenant as TenantContext;
      const { subscriptionId } = request.params;

      try {
        const result = await webhookService.testSubscription(
          tenantContext.tenantId,
          subscriptionId,
        );

        return reply.send({ data: result });
      } catch (error) {
        if (error instanceof WebhookSubscriptionNotFoundError) {
          return reply.status(404).send({
            code: WEBHOOK_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
            message: error.message,
            requestId: request.id,
          });
        }

        if (error instanceof WebhookCircuitBreakerOpenError) {
          return reply.status(503).send({
            code: WEBHOOK_ERROR_CODES.SUBSCRIPTION_CIRCUIT_BREAKER_OPEN,
            message: error.message,
            requestId: request.id,
          });
        }

        const err = error as Error;
        request.log.error({ err }, 'Failed to test webhook subscription');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
          requestId: request.id,
        });
      }
    },
  );

  fastify.get(
    '/deliveries',
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

      try {
        const result = await webhookService.listDeliveries(tenantContext.tenantId, queryOptions);

        return reply.send({
          data: result.deliveries,
          ...(result.nextCursor !== undefined && { nextCursor: result.nextCursor }),
        });
      } catch (error) {
        const err = error as Error;
        request.log.error({ err }, 'Failed to list webhook deliveries');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
          requestId: request.id,
        });
      }
    },
  );

  fastify.get<{
    Params: { deliveryId: string };
  }>(
    '/deliveries/:deliveryId',
    async (request: FastifyRequest<{ Params: { deliveryId: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const { deliveryId } = request.params;

      try {
        const delivery = await webhookService.getDelivery(tenantContext.tenantId, deliveryId);

        return reply.send({ data: delivery });
      } catch (error) {
        const err = error as Error;
        request.log.error({ err }, 'Failed to get webhook delivery');

        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
          requestId: request.id,
        });
      }
    },
  );
}
