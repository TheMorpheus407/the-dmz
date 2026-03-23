import Stripe from 'stripe';

import {
  stripeWebhookPayloadSchema,
  stripeWebhookDataObjectSchema,
  stripeWebhookResponseSchema,
  stripeWebhookErrorResponseSchema,
  type StripeWebhookDataObject,
} from '@the-dmz/shared/schemas';

import { billingRepo } from './billing.repo.js';
import { stripeService } from './stripe.service.js';
import { subscriptionService } from './subscription.service.js';
import { PLAN_LIMITS } from './billing.types.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AppConfig } from '../../config.js';

function getPlanLimits(planId: string) {
  return PLAN_LIMITS[planId] ?? { seatLimit: -1, storageGb: -1, apiRateLimit: -1 };
}

async function constructStripeEvent(
  request: FastifyRequest,
  stripe: Stripe,
  webhookSecret: string,
): Promise<Stripe.Event> {
  const signature = request.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    throw new Error('Missing stripe-signature header');
  }

  const rawBody = request.rawBody;
  if (!rawBody) {
    throw new Error('Raw body not available for signature verification');
  }

  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export async function stripeWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  if (!fastify.config.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not configured. Set the STRIPE_WEBHOOK_SECRET environment variable.',
    );
  }

  const stripe = new Stripe(fastify.config.STRIPE_WEBHOOK_SECRET, {
    apiVersion: '2024-06-20',
  });

  fastify.post(
    '/stripe/webhook',
    {
      schema: {
        body: stripeWebhookPayloadSchema,
        response: {
          200: stripeWebhookResponseSchema,
          400: stripeWebhookErrorResponseSchema,
          401: stripeWebhookErrorResponseSchema,
          500: stripeWebhookErrorResponseSchema,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const config = fastify.config;

      let event: Stripe.Event;
      try {
        event = await constructStripeEvent(request, stripe, config.STRIPE_WEBHOOK_SECRET!);
      } catch (err) {
        const error = err as Error;
        request.log.warn({ err: error.message }, 'Stripe webhook signature verification failed');
        return reply.status(401).send({ error: error.message });
      }

      const parsedData = stripeWebhookDataObjectSchema.safeParse(event.data.object);
      if (!parsedData.success) {
        request.log.warn(
          { eventId: event.id, eventType: event.type },
          'Invalid webhook payload structure',
        );
        throw new Error('Invalid webhook payload structure');
      }

      const existingEvent = await billingRepo.getWebhookEventByEventId(event.id, config);
      if (existingEvent) {
        return reply.status(200).send({ received: true, duplicate: true });
      }

      await recordAndProcessEvent(event, parsedData.data, config, request);

      return reply.status(200).send({ received: true });
    },
  );
}

async function recordAndProcessEvent(
  event: Stripe.Event,
  data: StripeWebhookDataObject,
  config: AppConfig,
  request: FastifyRequest,
): Promise<void> {
  const { id: eventId, type: eventType } = event;

  await billingRepo.recordWebhookEvent(
    { eventId, eventType, payload: event.data.object as unknown as Record<string, unknown> },
    config,
  );

  try {
    await handleStripeEvent(eventType, data, config);
    await billingRepo.updateWebhookEvent(eventId, { processingResult: 'success' }, config);
  } catch (error) {
    const err = error as Error;
    await billingRepo.updateWebhookEvent(eventId, { processingResult: 'error' }, config);
    request.log.error({ err, eventType }, 'Failed to process Stripe webhook');
  }
}

async function handleStripeEvent(
  eventType: string,
  data: StripeWebhookDataObject,
  config: AppConfig,
): Promise<void> {
  switch (eventType) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(data, config);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(data, config);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(data, config);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(data, config);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(data, config);
      break;

    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(data, config);
      break;

    default:
      break;
  }
}

async function handleSubscriptionCreated(
  data: StripeWebhookDataObject,
  config: AppConfig,
): Promise<void> {
  const stripeCustomerId = data.customer ?? '';
  const stripeSubscriptionId = data.id ?? '';
  const planId = data.items?.data?.[0]?.price?.product ?? 'starter';
  const status = mapStripeSubscriptionStatus(data.status ?? '');
  const currentPeriodStart = new Date((data.current_period_start ?? 0) * 1000);
  const currentPeriodEnd = new Date((data.current_period_end ?? 0) * 1000);
  const trialEnd = data.trial_end ? new Date(data.trial_end * 1000) : undefined;

  const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
  if (!customer) {
    throw new Error(`Stripe customer not found: ${stripeCustomerId}`);
  }

  await billingRepo.updateStripeCustomer(stripeCustomerId, { stripeSubscriptionId }, config);

  const planLimits = getPlanLimits(planId);
  const trialDays = trialEnd
    ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  await subscriptionService.createSubscription(
    { tenantId: customer.tenantId, planId, seatLimit: planLimits.seatLimit, trialDays },
    config,
  );

  await subscriptionService.updateSubscription(
    customer.tenantId,
    { status, currentPeriodStart, currentPeriodEnd, trialEndsAt: trialEnd ?? null },
    config,
  );
}

async function handleSubscriptionUpdated(
  data: StripeWebhookDataObject,
  config: AppConfig,
): Promise<void> {
  const stripeCustomerId = data.customer ?? '';
  const planId = data.items?.data?.[0]?.price?.product;
  const status = mapStripeSubscriptionStatus(data.status ?? '');
  const currentPeriodStart = new Date((data.current_period_start ?? 0) * 1000);
  const currentPeriodEnd = new Date((data.current_period_end ?? 0) * 1000);
  const trialEnd = data.trial_end ? new Date(data.trial_end * 1000) : undefined;
  const cancelAtPeriodEnd = data.cancel_at_period_end ?? false;

  const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
  if (!customer) {
    throw new Error(`Stripe customer not found: ${stripeCustomerId}`);
  }

  await subscriptionService.updateSubscription(
    customer.tenantId,
    {
      ...(planId !== undefined && { planId }),
      status,
      currentPeriodStart,
      currentPeriodEnd,
      trialEndsAt: trialEnd ?? null,
      cancelAtPeriodEnd,
    },
    config,
  );
}

async function handleSubscriptionDeleted(
  data: StripeWebhookDataObject,
  config: AppConfig,
): Promise<void> {
  const stripeCustomerId = data.customer ?? '';

  const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
  if (!customer) {
    throw new Error(`Stripe customer not found: ${stripeCustomerId}`);
  }

  await subscriptionService.cancelSubscription(customer.tenantId, false, config);
}

async function handleInvoicePaymentSucceeded(
  data: StripeWebhookDataObject,
  config: AppConfig,
): Promise<void> {
  const stripeInvoiceId = data.id ?? '';
  const stripeCustomerId = data.customer ?? '';
  const amountPaid = data.amount_paid ?? 0;
  const currency = data.currency ?? '';
  const billingReason = data.billing_reason;
  const paidAt = data.status === 'paid' ? new Date() : undefined;
  const stripePaymentIntentId = data.payment_intent;

  const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
  if (!customer) {
    return;
  }

  await stripeService.createInvoice(
    customer.tenantId,
    stripeInvoiceId,
    {
      amountDue: amountPaid,
      amountPaid,
      currency,
      status: 'paid',
      ...(paidAt !== undefined && { paidAt }),
      ...(billingReason !== undefined && { billingReason }),
      ...(stripePaymentIntentId !== undefined && { stripePaymentIntentId }),
    },
    config,
  );

  await subscriptionService.reactivateSubscription(customer.tenantId, config);
}

async function handleInvoicePaymentFailed(
  data: StripeWebhookDataObject,
  config: AppConfig,
): Promise<void> {
  const stripeInvoiceId = data.id ?? '';
  const stripeCustomerId = data.customer ?? '';
  const amountDue = data.amount_due ?? 0;
  const currency = data.currency ?? '';
  const billingReason = data.billing_reason;
  const dueDate = data.due_date ? new Date(data.due_date * 1000) : undefined;

  const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
  if (!customer) {
    return;
  }

  await stripeService.createInvoice(
    customer.tenantId,
    stripeInvoiceId,
    {
      amountDue,
      amountPaid: 0,
      currency,
      status: 'open',
      ...(dueDate !== undefined && { dueDate }),
      ...(billingReason !== undefined && { billingReason }),
    },
    config,
  );

  await subscriptionService.markPastDue(customer.tenantId, config);
}

async function handleTrialWillEnd(data: StripeWebhookDataObject, config: AppConfig): Promise<void> {
  const stripeCustomerId = data.customer ?? '';

  const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
  if (!customer) {
    return;
  }

  const subscription = await subscriptionService.getSubscription(customer.tenantId, config);
  if (subscription && subscription.status === 'trial') {
    // Could emit notification event here for trial ending soon
  }
}

function mapStripeSubscriptionStatus(
  stripeStatus: string,
): 'trial' | 'active' | 'suspended' | 'cancelled' | 'past_due' | 'expired' {
  switch (stripeStatus) {
    case 'trialing':
      return 'trial';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'unpaid':
      return 'suspended';
    default:
      return 'active';
  }
}
