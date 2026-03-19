import { subscriptionService } from './subscription.service.js';
import { seatService } from './seat.service.js';
import { entitlementsService } from './entitlements.service.js';
import { stripeService } from './stripe.service.js';
import { billingRepo } from './billing.repo.js';
import { PLAN_FEATURES, PLAN_LIMITS } from './billing.types.js';

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

export async function billingRoutes(fastify: FastifyInstance): Promise<void> {
  const config = fastify.config;

  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const tenantContext = request.tenant;

      if (!tenantContext) {
        throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
      }

      const hasScope =
        tenantContext.scopes?.includes('billing:read') ||
        tenantContext.scopes?.includes('billing:update') ||
        tenantContext.scopes?.includes('admin');

      if (!hasScope) {
        throw Object.assign(
          new Error(`Insufficient scope: billing:read or billing:update required`),
          {
            statusCode: 403,
          },
        );
      }

      request.tenant = tenantContext;
    },
  );

  fastify.get('/subscription', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext = request.tenant as TenantContext;

    try {
      const subscription = await subscriptionService.getSubscription(
        tenantContext.tenantId,
        config,
      );

      if (!subscription) {
        return reply.status(404).send({
          code: 'SUBSCRIPTION_NOT_FOUND',
          message: 'No subscription found for this tenant',
        });
      }

      return reply.send({ data: subscription });
    } catch (error) {
      const err = error as Error;
      request.log.error({ err }, 'Failed to get subscription');
      return reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  });

  fastify.get('/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const plans = await billingRepo.listActivePlans(config);
      const plansWithFeatures = plans.map((plan) => ({
        ...plan,
        features: PLAN_FEATURES[plan.id] ?? {},
        limits: PLAN_LIMITS[plan.id] ?? { seatLimit: 0, storageGb: 0, apiRateLimit: 0 },
      }));

      return reply.send({ data: plansWithFeatures });
    } catch (error) {
      const err = error as Error;
      request.log.error({ err }, 'Failed to list plans');
      return reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  });

  fastify.get('/seats', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext = request.tenant as TenantContext;

    try {
      const seatInfo = await seatService.getSeatInfo(tenantContext.tenantId, config);
      return reply.send({ data: seatInfo });
    } catch (error) {
      const err = error as Error;
      request.log.error({ err }, 'Failed to get seat info');
      return reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  });

  fastify.get(
    '/seats/history',
    async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const limit = request.query.limit ?? 100;

      try {
        const history = await seatService.getSeatHistory(tenantContext.tenantId, limit, config);
        return reply.send({ data: history });
      } catch (error) {
        const err = error as Error;
        request.log.error({ err }, 'Failed to get seat history');
        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
        });
      }
    },
  );

  fastify.get('/entitlements', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext = request.tenant as TenantContext;

    try {
      const entitlements = await entitlementsService.getEntitlements(
        tenantContext.tenantId,
        tenantContext.userId,
        config,
      );
      return reply.send({ data: entitlements });
    } catch (error) {
      const err = error as Error;
      request.log.error({ err }, 'Failed to get entitlements');
      return reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  });

  fastify.get(
    '/entitlements/features',
    async (request: FastifyRequest<{ Querystring: { feature?: string } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;

      try {
        if (request.query.feature) {
          const result = await entitlementsService.checkFeature(
            tenantContext.tenantId,
            request.query.feature,
            tenantContext.userId,
            config,
          );
          return reply.send({ data: result });
        }

        const features = await entitlementsService.getPlanFeatures(tenantContext.tenantId, config);
        return reply.send({ data: features });
      } catch (error) {
        const err = error as Error;
        request.log.error({ err }, 'Failed to get feature entitlements');
        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
        });
      }
    },
  );

  fastify.get(
    '/invoices',
    async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
      const tenantContext = request.tenant as TenantContext;
      const limit = request.query.limit ?? 50;

      try {
        const invoices = await stripeService.listInvoices(tenantContext.tenantId, limit, config);
        return reply.send({ data: invoices });
      } catch (error) {
        const err = error as Error;
        request.log.error({ err }, 'Failed to list invoices');
        return reply.status(500).send({
          code: 'INTERNAL_ERROR',
          message: err.message,
        });
      }
    },
  );

  fastify.get('/stripe-customer', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantContext = request.tenant as TenantContext;

    try {
      const customer = await stripeService.getStripeCustomer(tenantContext.tenantId, config);

      if (!customer) {
        return reply.status(404).send({
          code: 'STRIPE_CUSTOMER_NOT_FOUND',
          message: 'No Stripe customer found for this tenant',
        });
      }

      return reply.send({ data: customer });
    } catch (error) {
      const err = error as Error;
      request.log.error({ err }, 'Failed to get Stripe customer');
      return reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  });
}
