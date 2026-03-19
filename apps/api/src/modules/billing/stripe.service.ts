import { billingRepo } from './billing.repo.js';
import { subscriptionService } from './subscription.service.js';
import { PLAN_LIMITS } from './billing.types.js';

import type { AppConfig } from '../../config.js';

export interface StripeCustomerResult {
  stripeCustomerId: string;
  tenantId: string;
  email?: string;
  name?: string;
}

export interface CreateStripeCustomerInput {
  tenantId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

export const stripeService = {
  async getStripeCustomer(tenantId: string, config?: AppConfig) {
    return billingRepo.getStripeCustomerByTenantId(tenantId, config);
  },

  async getStripeCustomerByStripeId(stripeCustomerId: string, config?: AppConfig) {
    return billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
  },

  async createStripeCustomer(
    input: CreateStripeCustomerInput,
    config?: AppConfig,
  ): Promise<StripeCustomerResult> {
    const existing = await billingRepo.getStripeCustomerByTenantId(input.tenantId, config);

    if (existing) {
      return {
        stripeCustomerId: existing.stripeCustomerId,
        tenantId: existing.tenantId,
        ...(existing.email !== null && { email: existing.email }),
        ...(existing.name !== null && { name: existing.name }),
      };
    }

    const stripeCustomerId = `cus_${generateStripeId()}`;

    const customer = await billingRepo.upsertStripeCustomer(
      {
        tenantId: input.tenantId,
        stripeCustomerId,
        email: input.email ?? null,
        name: input.name ?? null,
        metadata: input.metadata ?? {},
      },
      config,
    );

    return {
      stripeCustomerId: customer.stripeCustomerId,
      tenantId: customer.tenantId,
      ...(customer.email !== null && { email: customer.email }),
      ...(customer.name !== null && { name: customer.name }),
    };
  },

  async linkSubscription(
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    config?: AppConfig,
  ): Promise<void> {
    await billingRepo.updateStripeCustomer(stripeCustomerId, { stripeSubscriptionId }, config);
  },

  async updateStripeCustomerInfo(
    stripeCustomerId: string,
    data: {
      email?: string;
      name?: string;
      defaultPaymentMethodId?: string;
    },
    config?: AppConfig,
  ): Promise<void> {
    await billingRepo.updateStripeCustomer(stripeCustomerId, data, config);
  },

  async createInvoice(
    tenantId: string,
    stripeInvoiceId: string,
    data: {
      amountDue: number;
      amountPaid: number;
      currency?: string;
      status: string;
      invoiceDate?: Date;
      dueDate?: Date;
      paidAt?: Date;
      billingReason?: string;
      stripePaymentIntentId?: string;
    },
    config?: AppConfig,
  ) {
    const existing = await billingRepo.getInvoiceByStripeId(stripeInvoiceId, config);
    if (existing) {
      return existing;
    }

    return billingRepo.createInvoice(
      {
        tenantId,
        stripeInvoiceId,
        amountDue: data.amountDue,
        amountPaid: data.amountPaid,
        currency: data.currency ?? 'usd',
        status: data.status,
        invoiceDate: data.invoiceDate ?? null,
        dueDate: data.dueDate ?? null,
        paidAt: data.paidAt ?? null,
        billingReason: data.billingReason ?? null,
        stripePaymentIntentId: data.stripePaymentIntentId ?? null,
      },
      config,
    );
  },

  async listInvoices(tenantId: string, limit?: number, config?: AppConfig) {
    return billingRepo.listInvoices(tenantId, limit, config);
  },

  async handleSubscriptionCreated(
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    data: {
      planId: string;
      status: string;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      trialEnd?: Date;
    },
    config?: AppConfig,
  ): Promise<void> {
    const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
    if (!customer) {
      throw new Error(`Stripe customer not found: ${stripeCustomerId}`);
    }

    await billingRepo.updateStripeCustomer(stripeCustomerId, { stripeSubscriptionId }, config);

    const planLimits = PLAN_LIMITS[data.planId] ?? {
      seatLimit: -1,
      storageGb: -1,
      apiRateLimit: -1,
    };

    await subscriptionService.createSubscription(
      {
        tenantId: customer.tenantId,
        planId: data.planId,
        seatLimit: planLimits.seatLimit,
        trialDays: data.trialEnd
          ? Math.ceil((data.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0,
      },
      config,
    );

    await subscriptionService.updateSubscription(
      customer.tenantId,
      {
        status: data.status as 'trial' | 'active',
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        trialEndsAt: data.trialEnd ?? null,
      },
      config,
    );
  },

  async handleSubscriptionUpdated(
    stripeCustomerId: string,
    data: {
      planId?: string;
      status?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      trialEnd?: Date;
      cancelAtPeriodEnd?: boolean;
    },
    config?: AppConfig,
  ): Promise<void> {
    const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
    if (!customer) {
      throw new Error(`Stripe customer not found: ${stripeCustomerId}`);
    }

    await subscriptionService.updateSubscription(
      customer.tenantId,
      {
        ...(data.planId !== undefined && { planId: data.planId }),
        status: data.status as
          | 'trial'
          | 'active'
          | 'suspended'
          | 'cancelled'
          | 'past_due'
          | 'expired',
        ...(data.currentPeriodStart !== undefined && {
          currentPeriodStart: data.currentPeriodStart,
        }),
        ...(data.currentPeriodEnd !== undefined && { currentPeriodEnd: data.currentPeriodEnd }),
        trialEndsAt: data.trialEnd ?? null,
        ...(data.cancelAtPeriodEnd !== undefined && { cancelAtPeriodEnd: data.cancelAtPeriodEnd }),
      },
      config,
    );
  },

  async handleSubscriptionDeleted(stripeCustomerId: string, config?: AppConfig): Promise<void> {
    const customer = await billingRepo.getStripeCustomerByStripeId(stripeCustomerId, config);
    if (!customer) {
      throw new Error(`Stripe customer not found: ${stripeCustomerId}`);
    }

    await subscriptionService.cancelSubscription(customer.tenantId, false, config);
  },

  async handlePaymentSucceeded(
    stripeInvoiceId: string,
    data: {
      amountPaid: number;
      currency: string;
      billingReason?: string;
      paidAt?: Date;
      stripePaymentIntentId?: string;
    },
    config?: AppConfig,
  ): Promise<void> {
    const customer = await billingRepo.getStripeCustomerByTenantId('', config);
    if (!customer) {
      return;
    }

    await this.createInvoice(
      customer.tenantId,
      stripeInvoiceId,
      {
        amountDue: data.amountPaid,
        amountPaid: data.amountPaid,
        currency: data.currency,
        status: 'paid',
        ...(data.paidAt !== undefined && { paidAt: data.paidAt }),
        ...(data.billingReason !== undefined && { billingReason: data.billingReason }),
        ...(data.stripePaymentIntentId !== undefined && {
          stripePaymentIntentId: data.stripePaymentIntentId,
        }),
      },
      config,
    );

    if (customer.tenantId) {
      await subscriptionService.reactivateSubscription(customer.tenantId, config);
    }
  },

  async handlePaymentFailed(
    stripeInvoiceId: string,
    data: {
      amountDue: number;
      currency: string;
      billingReason?: string;
      dueDate?: Date;
    },
    config?: AppConfig,
  ): Promise<void> {
    const customer = await billingRepo.getStripeCustomerByTenantId('', config);
    if (!customer) {
      return;
    }

    await this.createInvoice(
      customer.tenantId,
      stripeInvoiceId,
      {
        amountDue: data.amountDue,
        amountPaid: 0,
        currency: data.currency,
        status: 'open',
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
        ...(data.billingReason !== undefined && { billingReason: data.billingReason }),
      },
      config,
    );

    if (customer.tenantId) {
      await subscriptionService.markPastDue(customer.tenantId, config);
    }
  },
};

function generateStripeId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
