import { z } from 'zod';

const ISO8601_DURATION_REGEX = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;
const MAX_EXTENSIONS_SIZE = 10 * 1024;

const MAILTO_EMAIL_REGEX = /^mailto:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const xapiExtensionsSchema = z.record(z.unknown()).refine(
  (extensions) => {
    const size = JSON.stringify(extensions).length;
    return size <= MAX_EXTENSIONS_SIZE;
  },
  { message: `Extensions payload too large (max ${MAX_EXTENSIONS_SIZE} bytes)` },
);

export const xapiActorInputSchema = z
  .object({
    mbox: z.string().regex(MAILTO_EMAIL_REGEX, 'Invalid mailto email format').optional(),
    mbox_sha1sum: z.string().optional(),
    openid: z.string().url().optional(),
    account: z
      .object({
        homePage: z.string().url(),
        name: z.string(),
      })
      .optional(),
    name: z.string().max(255).optional(),
  })
  .refine((actor) => actor.mbox || actor.mbox_sha1sum || actor.openid || actor.account, {
    message: 'Actor must have at least one of: mbox, mbox_sha1sum, openid, account',
  });

export type XapiActorInput = z.infer<typeof xapiActorInputSchema>;

export const xapiVerbInputSchema = z.object({
  id: z.string().url().max(512),
  display: z.record(z.string().max(255)).optional(),
});

export type XapiVerbInput = z.infer<typeof xapiVerbInputSchema>;

export const xapiObjectDefinitionInputSchema = z
  .object({
    name: z.record(z.string().max(1000)).optional(),
    description: z.record(z.string().max(2000)).optional(),
    type: z.string().url().optional(),
  })
  .optional();

export const xapiObjectInputSchema = z.object({
  id: z.string().url().max(512),
  objectType: z.string().max(64).default('Activity'),
  definition: xapiObjectDefinitionInputSchema,
});

export type XapiObjectInput = z.infer<typeof xapiObjectInputSchema>;

export const xapiScoreInputSchema = z
  .object({
    scaled: z.number().min(-1).max(1).optional(),
    raw: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .optional();

export const xapiResultInputSchema = z
  .object({
    score: xapiScoreInputSchema,
    success: z.boolean().optional(),
    completion: z.boolean().optional(),
    duration: z
      .string()
      .regex(ISO8601_DURATION_REGEX, 'Invalid ISO 8601 duration format')
      .optional(),
  })
  .optional();

export type XapiResultInput = z.infer<typeof xapiResultInputSchema>;

export const xapiContextInputSchema = z
  .object({
    registration: z.string().uuid().optional(),
    contextActivities: z
      .object({
        parent: z.array(xapiObjectInputSchema).optional(),
        grouping: z.array(xapiObjectInputSchema).optional(),
        category: z.array(xapiObjectInputSchema).optional(),
      })
      .optional(),
    extensions: xapiExtensionsSchema.optional(),
  })
  .optional();

export type XapiContextInput = z.infer<typeof xapiContextInputSchema>;

export const xapiStatementInputSchema = z.object({
  actor: xapiActorInputSchema.optional(),
  verb: z.object({
    id: z.string().url().max(512),
    display: z.record(z.string().max(255)).optional(),
  }),
  object: xapiObjectInputSchema,
  result: xapiResultInputSchema,
  context: xapiContextInputSchema,
  version: z.enum(['1.0.3', '2.0']).default('1.0.3'),
  timestamp: z.string().datetime().optional(),
});

export type XapiStatementInput = z.infer<typeof xapiStatementInputSchema>;

export const xapiArchiveInputSchema = z
  .object({
    beforeDate: z.string().datetime({ message: 'Invalid ISO 8601 datetime format' }),
  })
  .strict();

export type XapiArchiveInput = z.infer<typeof xapiArchiveInputSchema>;

const xapiVersionSchema = z.enum(['1.0.3', '2.0']).default('1.0.3');

export const lrsConfigInputSchema = z.object({
  name: z.string().min(1).max(255),
  endpoint: z.string().url().max(512),
  authKeyId: z.string().min(1).max(255),
  authSecret: z.string().min(8).max(512),
  version: xapiVersionSchema,
  enabled: z.boolean().default(true),
  batchingEnabled: z.boolean().default(true),
  batchSize: z.number().int().positive().max(1000).default(10),
  retryMaxAttempts: z.number().int().min(1).max(10).default(3),
  retryBaseDelayMs: z.number().int().positive().max(60000).default(1000),
});

export type LrsConfigInput = z.infer<typeof lrsConfigInputSchema>;

export const lrsConfigUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  endpoint: z.string().url().max(512).optional(),
  authKeyId: z.string().min(1).max(255).optional(),
  authSecret: z.string().min(8).max(512).optional(),
  version: xapiVersionSchema.optional(),
  enabled: z.boolean().optional(),
  batchingEnabled: z.boolean().optional(),
  batchSize: z.number().int().positive().max(1000).optional(),
  retryMaxAttempts: z.number().int().min(1).max(10).optional(),
  retryBaseDelayMs: z.number().int().positive().max(60000).optional(),
});

export type LrsConfigUpdate = z.infer<typeof lrsConfigUpdateSchema>;
