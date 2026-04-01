import type { StripeWebhookDataObject } from '@the-dmz/shared/schemas';

import { billingRepo } from '../billing.repo.js';
import { subscriptionService } from '../subscription.service.js';
import { PLAN_LIMITS } from '../billing.types.js';

import type { AppConfig } from '../../../config.js';

function getPlanLimits(planId: string) {
  return PLAN_LIMITS[planId] ?? { seatLimit: -1, storageGb: -1, apiRateLimit: -1 };
}

export async function handleSubscriptionCreated(
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

export async function handleSubscriptionUpdated(
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

export async function handleSubscriptionDeleted(
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

export function mapStripeSubscriptionStatus(
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
