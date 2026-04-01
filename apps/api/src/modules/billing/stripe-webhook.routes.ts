import Stripe from 'stripe';

import {
  stripeWebhookPayloadSchema,
  stripeWebhookDataObjectSchema,
  stripeWebhookResponseSchema,
  stripeWebhookErrorResponseSchema,
  type StripeWebhookDataObject,
} from '@the-dmz/shared/schemas';

import { billingRepo } from './billing.repo.js';
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handleTrialWillEnd,
} from './handlers/index.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AppConfig } from '../../config.js';

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
