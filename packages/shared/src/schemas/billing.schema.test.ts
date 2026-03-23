import { describe, expect, it } from 'vitest';

import {
  stripeWebhookDataObjectSchema,
  stripeWebhookPayloadSchema,
  stripeItemsSchema,
} from './billing.schema.js';

describe('stripeWebhookDataObjectSchema', () => {
  describe('valid payloads', () => {
    it('should accept valid payload with all fields', () => {
      const validPayload = {
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
        current_period_start: 1700000000,
        current_period_end: 1702592000,
        trial_end: 1702688400,
        cancel_at_period_end: false,
        amount_paid: 999,
        amount_due: 999,
        currency: 'usd',
        billing_reason: 'subscription_create',
        payment_intent: 'pi_123',
        due_date: 1702688400,
      };

      const result = stripeWebhookDataObjectSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept valid payload with required fields only', () => {
      const validPayload = {
        id: 'sub_123',
      };

      const result = stripeWebhookDataObjectSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept valid items structure', () => {
      const validPayload = {
        id: 'sub_123',
        items: {
          data: [
            {
              price: {
                product: 'prod_starter',
              },
            },
            {
              price: {
                product: 'prod_pro',
              },
            },
          ],
        },
      };

      const result = stripeWebhookDataObjectSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept empty items array', () => {
      const validPayload = {
        id: 'sub_123',
        items: {
          data: [],
        },
      };

      const result = stripeWebhookDataObjectSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid payloads', () => {
    it('should reject missing required id field', () => {
      const invalidPayload = {
        customer: 'cus_123',
        status: 'active',
      };

      const result = stripeWebhookDataObjectSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject non-string id', () => {
      const invalidPayload = {
        id: 123,
      };

      const result = stripeWebhookDataObjectSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject non-string customer', () => {
      const invalidPayload = {
        id: 'sub_123',
        customer: 123,
      };

      const result = stripeWebhookDataObjectSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject array as customer', () => {
      const invalidPayload = {
        id: 'sub_123',
        customer: ['cus_123'],
      };

      const result = stripeWebhookDataObjectSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject object as status', () => {
      const invalidPayload = {
        id: 'sub_123',
        status: { value: 'active' },
      };

      const result = stripeWebhookDataObjectSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject non-number current_period_start', () => {
      const invalidPayload = {
        id: 'sub_123',
        current_period_start: '1700000000',
      };

      const result = stripeWebhookDataObjectSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject non-number amount_paid', () => {
      const invalidPayload = {
        id: 'sub_123',
        amount_paid: '999',
      };

      const result = stripeWebhookDataObjectSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean cancel_at_period_end', () => {
      const invalidPayload = {
        id: 'sub_123',
        cancel_at_period_end: 'true',
      };

      const result = stripeWebhookDataObjectSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid nested items structure', () => {
      const invalidPayload = {
        id: 'sub_123',
        items: {
          data: [
            {
              price: {
                product: 123,
              },
            },
          ],
        },
      };

      const result = stripeWebhookDataObjectSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject items with missing price.product', () => {
      const invalidPayload = {
        id: 'sub_123',
        items: {
          data: [
            {
              price: {},
            },
          ],
        },
      };

      const result = stripeWebhookDataObjectSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});

describe('stripeWebhookPayloadSchema', () => {
  describe('valid payloads', () => {
    it('should accept valid top-level payload', () => {
      const validPayload = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
          },
        },
        created: 1700000000,
      };

      const result = stripeWebhookPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept flexible inner object', () => {
      const validPayload = {
        id: 'evt_123',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            amount_paid: 999,
            currency: 'usd',
            custom_field: 'value',
          },
        },
        created: 1700000000,
      };

      const result = stripeWebhookPayloadSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid payloads', () => {
    it('should reject missing required created field', () => {
      const invalidPayload = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        data: {
          object: {},
        },
      };

      const result = stripeWebhookPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject non-string top-level id', () => {
      const invalidPayload = {
        id: 123,
        type: 'customer.subscription.created',
        data: {
          object: {},
        },
        created: 1700000000,
      };

      const result = stripeWebhookPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject array as type field', () => {
      const invalidPayload = {
        id: 'evt_123',
        type: ['customer.subscription.created'],
        data: {
          object: {},
        },
        created: 1700000000,
      };

      const result = stripeWebhookPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject non-number created', () => {
      const invalidPayload = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        data: {
          object: {},
        },
        created: '1700000000',
      };

      const result = stripeWebhookPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it('should reject missing data.object', () => {
      const invalidPayload = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        data: {},
        created: 1700000000,
      };

      const result = stripeWebhookPayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});

describe('stripeItemsSchema', () => {
  it('should accept valid items structure', () => {
    const validItems = {
      data: [
        {
          price: {
            product: 'prod_starter',
          },
        },
      ],
    };

    const result = stripeItemsSchema.safeParse(validItems);
    expect(result.success).toBe(true);
  });

  it('should reject items with non-string product', () => {
    const invalidItems = {
      data: [
        {
          price: {
            product: 123,
          },
        },
      ],
    };

    const result = stripeItemsSchema.safeParse(invalidItems);
    expect(result.success).toBe(false);
  });

  it('should reject items with missing price', () => {
    const invalidItems = {
      data: [
        {
          price: {},
        },
      ],
    };

    const result = stripeItemsSchema.safeParse(invalidItems);
    expect(result.success).toBe(false);
  });
});
