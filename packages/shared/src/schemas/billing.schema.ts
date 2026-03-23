import { z } from 'zod';

export const stripeItemsSchema = z.object({
  data: z.array(
    z.object({
      price: z.object({
        product: z.string(),
      }),
    }),
  ),
});

export type StripeItems = z.infer<typeof stripeItemsSchema>;

export const stripeWebhookDataObjectSchema = z.object({
  id: z.string(),
  customer: z.string().optional(),
  status: z.string().optional(),
  items: stripeItemsSchema.optional(),
  current_period_start: z.number().optional(),
  current_period_end: z.number().optional(),
  trial_end: z.number().optional(),
  cancel_at_period_end: z.boolean().optional(),
  amount_paid: z.number().optional(),
  amount_due: z.number().optional(),
  currency: z.string().optional(),
  billing_reason: z.string().optional(),
  payment_intent: z.string().optional(),
  due_date: z.number().optional(),
});

export type StripeWebhookDataObject = z.infer<typeof stripeWebhookDataObjectSchema>;

export const stripeWebhookPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
  created: z.number(),
});

export type StripeWebhookPayload = z.infer<typeof stripeWebhookPayloadSchema>;

export const stripeWebhookResponseSchema = z.object({
  received: z.boolean(),
  duplicate: z.boolean().optional(),
});

export const stripeWebhookErrorResponseSchema = z.object({
  error: z.string(),
});

export type StripeWebhookErrorResponse = z.infer<typeof stripeWebhookErrorResponseSchema>;
