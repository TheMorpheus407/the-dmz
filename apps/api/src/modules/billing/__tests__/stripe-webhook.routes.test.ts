import { describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

vi.mock('../../../shared/database/connection.js', () => ({
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
    getWebhookEventByEventId: vi.fn(),
    recordWebhookEvent: vi.fn(),
    updateWebhookEvent: vi.fn(),
    getStripeCustomerByStripeId: vi.fn(),
    updateStripeCustomer: vi.fn(),
  },
}));

vi.mock('../../auth/jwt-keys.service.js', () => ({
  getActiveSigningKey: vi.fn().mockResolvedValue({
    id: 'key_123',
    keyType: 'RSA',
    publicKey: 'test-public-key',
    privateKeyEncrypted: 'encrypted-private-key',
    algorithm: 'RS256',
    isActive: true,
    createdAt: new Date(),
    expiresAt: null,
  }),
  initializeSigningKeys: vi.fn().mockResolvedValue(undefined),
}));

describe('StripeWebhookPayload', () => {
  describe('signature generation', () => {
    const webhookSecret = 'whsec_test_secret_for_webhook_testing_only';

    const webhookPayload = {
      id: 'evt_test_webhook_123',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
          items: {
            data: [
              {
                price: {
                  product: 'prod_starter',
                },
              },
            ],
          },
        },
      },
      created: Math.floor(Date.now() / 1000),
    };

    it('should generate a valid test webhook signature', () => {
      const stripe = new Stripe(webhookSecret, {
        apiVersion: '2024-06-20',
      });

      const payloadString = JSON.stringify(webhookPayload);
      const signature = stripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: webhookSecret,
      });

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature).toContain('t=');
      expect(signature).toContain('v1=');
    });

    it('should verify signature with correct payload', () => {
      const stripe = new Stripe(webhookSecret, {
        apiVersion: '2024-06-20',
      });

      const payloadString = JSON.stringify(webhookPayload);
      const signature = stripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: webhookSecret,
      });

      const event = stripe.webhooks.constructEvent(payloadString, signature, webhookSecret);

      expect(event.id).toBe(webhookPayload.id);
      expect(event.type).toBe(webhookPayload.type);
    });

    it('should fail verification with tampered payload', () => {
      const stripe = new Stripe(webhookSecret, {
        apiVersion: '2024-06-20',
      });

      const payloadString = JSON.stringify(webhookPayload);
      const signature = stripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: webhookSecret,
      });

      const tamperedPayload = {
        ...webhookPayload,
        data: {
          ...webhookPayload.data,
          object: {
            ...webhookPayload.data.object,
            customer: 'cus_tampered',
          },
        },
      };

      expect(() => {
        stripe.webhooks.constructEvent(JSON.stringify(tamperedPayload), signature, webhookSecret);
      }).toThrow();
    });

    it('should fail verification with wrong secret', () => {
      const stripe = new Stripe(webhookSecret, {
        apiVersion: '2024-06-20',
      });

      const wrongSecretStripe = new Stripe('whsec_wrong_secret', {
        apiVersion: '2024-06-20',
      });

      const payloadString = JSON.stringify(webhookPayload);
      const signature = wrongSecretStripe.webhooks.generateTestHeaderString({
        payload: payloadString,
        secret: 'whsec_wrong_secret',
      });

      expect(() => {
        stripe.webhooks.constructEvent(payloadString, signature, webhookSecret);
      }).toThrow();
    });

    it('should fail verification with invalid signature format', () => {
      const stripe = new Stripe(webhookSecret, {
        apiVersion: '2024-06-20',
      });

      const payloadString = JSON.stringify(webhookPayload);

      expect(() => {
        stripe.webhooks.constructEvent(payloadString, 'invalid_signature_format', webhookSecret);
      }).toThrow();
    });
  });

  describe('event type handling', () => {
    it('should have correct structure for subscription.created event', () => {
      const event = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: {
              data: [
                {
                  price: {
                    product: 'prod_starter',
                  },
                },
              ],
            },
          },
        },
      };

      expect(event.type).toBe('customer.subscription.created');
      expect(event.data.object.id).toBe('sub_123');
      expect(event.data.object.customer).toBe('cus_123');
    });

    it('should have correct structure for invoice.payment_succeeded event', () => {
      const event = {
        id: 'evt_456',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            amount_paid: 999,
            currency: 'usd',
            status: 'paid',
          },
        },
      };

      expect(event.type).toBe('invoice.payment_succeeded');
      expect(event.data.object.amount_paid).toBe(999);
      expect(event.data.object.status).toBe('paid');
    });

    it('should have correct structure for invoice.payment_failed event', () => {
      const event = {
        id: 'evt_789',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_456',
            customer: 'cus_123',
            amount_due: 999,
            currency: 'usd',
          },
        },
      };

      expect(event.type).toBe('invoice.payment_failed');
      expect(event.data.object.amount_due).toBe(999);
    });
  });
});
