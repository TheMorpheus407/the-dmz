import { describe, it, expect, vi, beforeEach } from 'vitest';

import { stripeService } from '../stripe.service.js';
import { billingRepo } from '../billing.repo.js';

import type { NewStripeCustomer, StripeCustomer } from '../../../db/schema/billing/index.js';

vi.mock('../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(() => ({
    query: {
      subscriptions: { findFirst: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn() })) })),
  })),
  getDatabasePool: vi.fn(() => ({
    query: vi.fn(),
  })),
  closeDatabase: vi.fn(),
}));

vi.mock('../billing.repo', () => ({
  billingRepo: {
    getStripeCustomerByTenantId: vi.fn(),
    getStripeCustomerByStripeId: vi.fn(),
    upsertStripeCustomer: vi.fn(),
    updateStripeCustomer: vi.fn(),
  },
}));

vi.mock('../subscription.service.js', () => ({
  subscriptionService: {
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    reactivateSubscription: vi.fn(),
    markPastDue: vi.fn(),
    cancelSubscription: vi.fn(),
  },
}));

describe('stripeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createStripeCustomer', () => {
    it('should create customer with cryptographically secure stripeCustomerId', async () => {
      vi.mocked(billingRepo.getStripeCustomerByTenantId).mockResolvedValue(null);
      vi.mocked(billingRepo.upsertStripeCustomer).mockImplementation(
        async (data: NewStripeCustomer): Promise<StripeCustomer> => ({
          id: '00000000-0000-0000-0000-000000000001',
          tenantId: data.tenantId,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: null,
          email: data.email ?? null,
          name: data.name ?? null,
          defaultPaymentMethodId: null,
          metadata: data.metadata ?? {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await stripeService.createStripeCustomer({
        tenantId: 'tenant-123',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(result.stripeCustomerId).toMatch(/^cus_[A-Za-z0-9_-]+$/);
      const idPart = result.stripeCustomerId.replace('cus_', '');
      expect(idPart.length).toBeGreaterThanOrEqual(20);
    });

    it('should return existing customer if already exists', async () => {
      const existingCustomer: StripeCustomer = {
        id: '00000000-0000-0000-0000-000000000001',
        tenantId: 'tenant-123',
        stripeCustomerId: 'cus_existing123',
        stripeSubscriptionId: null,
        email: 'existing@example.com',
        name: 'Existing User',
        defaultPaymentMethodId: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(billingRepo.getStripeCustomerByTenantId).mockResolvedValue(existingCustomer);

      const result = await stripeService.createStripeCustomer({
        tenantId: 'tenant-123',
        email: 'new@example.com',
        name: 'New User',
      });

      expect(result.stripeCustomerId).toBe('cus_existing123');
      expect(billingRepo.upsertStripeCustomer).not.toHaveBeenCalled();
    });

    it('should generate unique stripeCustomerIds', async () => {
      vi.mocked(billingRepo.getStripeCustomerByTenantId).mockResolvedValue(null);
      vi.mocked(billingRepo.upsertStripeCustomer).mockImplementation(
        async (data: NewStripeCustomer): Promise<StripeCustomer> => ({
          id: '00000000-0000-0000-0000-000000000001',
          tenantId: data.tenantId,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: null,
          email: data.email ?? null,
          name: data.name ?? null,
          defaultPaymentMethodId: null,
          metadata: data.metadata ?? {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const results = await Promise.all([
        stripeService.createStripeCustomer({ tenantId: 'tenant-1' }),
        stripeService.createStripeCustomer({ tenantId: 'tenant-2' }),
        stripeService.createStripeCustomer({ tenantId: 'tenant-3' }),
      ]);

      const ids = results.map((r) => r.stripeCustomerId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('stripeCustomerId format', () => {
    it('should use cus_ prefix followed by base64url characters', async () => {
      vi.mocked(billingRepo.getStripeCustomerByTenantId).mockResolvedValue(null);
      vi.mocked(billingRepo.upsertStripeCustomer).mockImplementation(
        async (data: NewStripeCustomer): Promise<StripeCustomer> => ({
          id: '00000000-0000-0000-0000-000000000001',
          tenantId: data.tenantId,
          stripeCustomerId: data.stripeCustomerId,
          stripeSubscriptionId: null,
          email: data.email ?? null,
          name: data.name ?? null,
          defaultPaymentMethodId: null,
          metadata: data.metadata ?? {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await stripeService.createStripeCustomer({
        tenantId: 'tenant-123',
      });

      const idPart = result.stripeCustomerId.replace('cus_', '');
      expect(idPart).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});
