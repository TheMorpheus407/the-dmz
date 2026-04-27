import type { StripeWebhookDataObject } from '@the-dmz/shared/schemas';

import { billingRepo } from '../billing.repo.js';
import { subscriptionService } from '../subscription.service.js';
import { subscriptionStatuses } from '../../../db/schema/billing/index.js';

import type { AppConfig } from '../../../config.js';

export async function handleTrialWillEnd(
  data: StripeWebhookDataObject,
  config: AppConfig,
): Promise<void> {
  const stripeCustomerId = (data as { customer?: string }).customer ?? '';

  const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
  if (!customer) {
    return;
  }

  const subscription = await subscriptionService.getSubscription(customer.tenantId, config);
  if (subscription && subscription.status === subscriptionStatuses[0]) {
    // Could emit notification event here for trial ending soon
  }
}
