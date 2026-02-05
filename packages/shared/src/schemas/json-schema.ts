import type { ZodTypeAny } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export type JsonSchema = Record<string, unknown>;

const toJsonSchema = zodToJsonSchema as unknown as (
  schema: ZodTypeAny,
  options: { $refStrategy: "none" },
) => JsonSchema;

export const createJsonSchema = (schema: ZodTypeAny): JsonSchema =>
  toJsonSchema(schema, {
    $refStrategy: "none",
  });
