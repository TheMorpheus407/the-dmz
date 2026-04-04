import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import Stripe from 'stripe';

import { buildApp } from '../../../app.js';
import { loadConfig, type AppConfig } from '../../../config.js';
import { closeDatabase, getDatabasePool } from '../../../shared/database/connection.js';
import { resetTestDatabase } from '../../../__tests__/helpers/db.js';

const createTestConfig = (): AppConfig => {
  const base = loadConfig();
  return {
    ...base,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://dmz:dmz_dev@localhost:5432/dmz_test',
    RATE_LIMIT_MAX: 10000,
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret_for_integration_testing',
  };
};

const testConfig = createTestConfig();

const resetTestData = async (): Promise<void> => {
  await resetTestDatabase(testConfig);

  const pool = getDatabasePool(testConfig);
  try {
    await pool.unsafe(`TRUNCATE TABLE "integration"."webhook_events" RESTART IDENTITY CASCADE`);
    await pool.unsafe(
      `TRUNCATE TABLE "integration"."webhook_subscriptions" RESTART IDENTITY CASCADE`,
    );
    await pool.unsafe(`TRUNCATE TABLE "integration"."webhook_deliveries" RESTART IDENTITY CASCADE`);
  } catch {
    // Tables don't exist - skip
  }
};

describe('Stripe webhook API', () => {
  const app = buildApp(testConfig);

  const webhookSecret = testConfig.STRIPE_WEBHOOK_SECRET!;
  let stripe: Stripe;

  beforeAll(async () => {
    await resetTestData();
    await app.ready();
    stripe = new Stripe(webhookSecret, { apiVersion: '2024-06-20' });
  });

  afterAll(async () => {
    await closeDatabase();
    await app.close();
  });

  afterEach(async () => {
    await resetTestData();
  });

  describe('POST /webhooks/billing/stripe', () => {
    const buildWebhookPayload = (eventId: string, eventType: string) => ({
      id: eventId,
      type: eventType,
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
    });

    const signPayload = (payload: string): string => {
      return stripe.webhooks.generateTestHeaderString({
        payload,
        secret: webhookSecret,
      });
    };

    it('returns 200 with valid Stripe signature', async () => {
      const payload = buildWebhookPayload('evt_valid_signature', 'customer.subscription.created');
      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: payloadString,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.received).toBe(true);
      expect(body.duplicate).toBeUndefined();
    });

    it('returns 401 with missing signature header', async () => {
      const payload = buildWebhookPayload('evt_missing_sig', 'customer.subscription.created');

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'content-type': 'application/json',
        },
        payload: JSON.stringify(payload),
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error).toContain('Missing stripe-signature header');
    });

    it('returns 401 with invalid signature', async () => {
      const payload = buildWebhookPayload('evt_invalid_sig', 'customer.subscription.created');

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': 't=123,v1=invalid_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(payload),
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 200 with duplicate event for same eventId', async () => {
      const eventId = 'evt_duplicate_check';
      const payload = buildWebhookPayload(eventId, 'customer.subscription.created');
      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const firstResponse = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: payloadString,
      });

      expect(firstResponse.statusCode).toBe(200);

      const secondResponse = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: payloadString,
      });

      expect(secondResponse.statusCode).toBe(200);
      const body = secondResponse.json();
      expect(body.received).toBe(true);
      expect(body.duplicate).toBe(true);
    });

    it('processes invoice.payment_succeeded event', async () => {
      const payload = {
        id: 'evt_invoice_success',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            amount_paid: 999,
            currency: 'usd',
            status: 'paid',
          },
        },
        created: Math.floor(Date.now() / 1000),
      };
      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: payloadString,
      });

      expect(response.statusCode).toBe(200);
    });

    it('processes invoice.payment_failed event', async () => {
      const payload = {
        id: 'evt_invoice_failed',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_456',
            customer: 'cus_test_123',
            amount_due: 999,
            currency: 'usd',
          },
        },
        created: Math.floor(Date.now() / 1000),
      };
      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: payloadString,
      });

      expect(response.statusCode).toBe(200);
    });

    it('processes customer.subscription.updated event', async () => {
      const payload = buildWebhookPayload('evt_sub_updated', 'customer.subscription.updated');
      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: payloadString,
      });

      expect(response.statusCode).toBe(200);
    });

    it('processes customer.subscription.deleted event', async () => {
      const payload = buildWebhookPayload('evt_sub_deleted', 'customer.subscription.deleted');
      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: payloadString,
      });

      expect(response.statusCode).toBe(200);
    });

    it('processes customer.subscription.trial_will_end event', async () => {
      const payload = {
        id: 'evt_trial_end',
        type: 'customer.subscription.trial_will_end',
        data: {
          object: {
            id: 'sub_trial_123',
            customer: 'cus_test_123',
            trial_end: Math.floor(Date.now() / 1000) + 86400 * 3,
          },
        },
        created: Math.floor(Date.now() / 1000),
      };
      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: payloadString,
      });

      expect(response.statusCode).toBe(200);
    });

    it('returns 500 for invalid payload structure', async () => {
      const payload = {
        id: 'evt_invalid_structure',
        type: 'unknown.event.type',
        data: 'not an object',
      };
      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: payloadString,
      });

      expect(response.statusCode).toBe(500);
    });

    it('handles unknown event type gracefully', async () => {
      const payload = {
        id: 'evt_unknown_type',
        type: 'unknown.event.type',
        data: {
          object: {
            id: 'obj_123',
          },
        },
        created: Math.floor(Date.now() / 1000),
      };
      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString);

      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/billing/stripe',
        headers: {
          'stripe-signature': signature,
          'content-type': 'application/json',
        },
        payload: payloadString,
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
