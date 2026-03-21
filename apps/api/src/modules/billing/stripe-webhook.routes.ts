import { billingRepo } from './billing.repo.js';
import { stripeService } from './stripe.service.js';
import { subscriptionService } from './subscription.service.js';
import { PLAN_LIMITS } from './billing.types.js';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AppConfig } from '../../config.js';

interface StripeWebhookPayload {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

export async function stripeWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/stripe/webhook',
    async (request: FastifyRequest<{ Body: StripeWebhookPayload }>, reply: FastifyReply) => {
      const config = fastify.config;
      const eventId = request.body.id;
      const eventType = request.body.type;

      const existingEvent = await billingRepo.getWebhookEventByEventId(eventId, config);
      if (existingEvent) {
        return reply.status(200).send({ received: true, duplicate: true });
      }

      await billingRepo.recordWebhookEvent(
        {
          eventId,
          eventType,
          payload: request.body.data.object,
        },
        config,
      );

      try {
        await handleStripeEvent(eventType, request.body.data.object, config);
        await billingRepo.updateWebhookEvent(eventId, { processingResult: 'success' }, config);
      } catch (error) {
        const err = error as Error;
        await billingRepo.updateWebhookEvent(
          eventId,
          {
            processingResult: 'error',
          },
          config,
        );
        request.log.error({ err, eventType }, 'Failed to process Stripe webhook');
      }

      return reply.status(200).send({ received: true });
    },
  );
}

async function handleStripeEvent(
  eventType: string,
  data: Record<string, unknown>,
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
  data: Record<string, unknown>,
  config: AppConfig,
): Promise<void> {
  const stripeCustomerId = data['customer'] as string;
  const stripeSubscriptionId = data['id'] as string;
  const planId =
    (data['items'] as { data: Array<{ price: { product: string } }> })?.data?.[0]?.price?.product ??
    'starter';
  const status = mapStripeSubscriptionStatus(data['status'] as string);
  const currentPeriodStart = new Date((data['current_period_start'] as number) * 1000);
  const currentPeriodEnd = new Date((data['current_period_end'] as number) * 1000);
  const trialEnd = data['trial_end'] ? new Date((data['trial_end'] as number) * 1000) : undefined;

  const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
  if (!customer) {
    throw new Error(`Stripe customer not found: ${stripeCustomerId}`);
  }

  await billingRepo.updateStripeCustomer(stripeCustomerId, { stripeSubscriptionId }, config);

  const planLimits = PLAN_LIMITS[planId] ?? { seatLimit: -1, storageGb: -1, apiRateLimit: -1 };

  await subscriptionService.createSubscription(
    {
      tenantId: customer.tenantId,
      planId,
      seatLimit: planLimits.seatLimit,
      trialDays: trialEnd
        ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0,
    },
    config,
  );

  await subscriptionService.updateSubscription(
    customer.tenantId,
    {
      status,
      currentPeriodStart,
      currentPeriodEnd,
      trialEndsAt: trialEnd ?? null,
    },
    config,
  );
}

async function handleSubscriptionUpdated(
  data: Record<string, unknown>,
  config: AppConfig,
): Promise<void> {
  const stripeCustomerId = data['customer'] as string;
  const planId = (data['items'] as { data: Array<{ price: { product: string } }> })?.data?.[0]
    ?.price?.product;
  const status = mapStripeSubscriptionStatus(data['status'] as string);
  const currentPeriodStart = new Date((data['current_period_start'] as number) * 1000);
  const currentPeriodEnd = new Date((data['current_period_end'] as number) * 1000);
  const trialEnd = data['trial_end'] ? new Date((data['trial_end'] as number) * 1000) : undefined;
  const cancelAtPeriodEnd = data['cancel_at_period_end'] as boolean;

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
  data: Record<string, unknown>,
  config: AppConfig,
): Promise<void> {
  const stripeCustomerId = data['customer'] as string;

  const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
  if (!customer) {
    throw new Error(`Stripe customer not found: ${stripeCustomerId}`);
  }

  await subscriptionService.cancelSubscription(customer.tenantId, false, config);
}

async function handleInvoicePaymentSucceeded(
  data: Record<string, unknown>,
  config: AppConfig,
): Promise<void> {
  const stripeInvoiceId = data['id'] as string;
  const stripeCustomerId = data['customer'] as string;
  const amountPaid = data['amount_paid'] as number;
  const currency = data['currency'] as string;
  const billingReason = data['billing_reason'] as string | undefined;
  const paidAt = data['status'] === 'paid' ? new Date() : undefined;
  const stripePaymentIntentId = data['payment_intent'] as string | undefined;

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
  data: Record<string, unknown>,
  config: AppConfig,
): Promise<void> {
  const stripeInvoiceId = data['id'] as string;
  const stripeCustomerId = data['customer'] as string;
  const amountDue = data['amount_due'] as number;
  const currency = data['currency'] as string;
  const billingReason = data['billing_reason'] as string | undefined;
  const dueDate = data['due_date'] ? new Date((data['due_date'] as number) * 1000) : undefined;

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

async function handleTrialWillEnd(data: Record<string, unknown>, config: AppConfig): Promise<void> {
  const stripeCustomerId = data['customer'] as string;

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
