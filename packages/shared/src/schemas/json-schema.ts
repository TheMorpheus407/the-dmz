import { zodToJsonSchema } from 'zod-to-json-schema';

import type { ZodTypeAny } from 'zod';

export type JsonSchema = Record<string, unknown>;

const TO_JSON_SCHEMA = zodToJsonSchema as unknown as (
  schema: ZodTypeAny,
  options: { $refStrategy: 'none' },
) => JsonSchema;

export const createJsonSchema = (schema: ZodTypeAny): JsonSchema =>
  TO_JSON_SCHEMA(schema, {
    $refStrategy: 'none',
  });
