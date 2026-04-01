import type { StripeWebhookDataObject } from '@the-dmz/shared/schemas';

import { billingRepo } from '../billing.repo.js';
import { stripeService } from '../stripe.service.js';
import { subscriptionService } from '../subscription.service.js';

import type { AppConfig } from '../../../config.js';

export async function handleInvoicePaymentSucceeded(
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

export async function handleInvoicePaymentFailed(
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
