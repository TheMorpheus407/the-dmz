import { isDeepStrictEqual } from 'node:util';

import { z } from 'zod';

import { defaultSchemas } from './output-parser.schemas.js';
import { getSchemaValidator } from './email-schema.provider.js';

import type { PromptTemplateCategory } from './ai-pipeline.types.js';
import type { ErrorObject, ValidateFunction } from 'ajv';

const jsonObjectSchema = z.record(z.unknown());

const extractJsonCandidate = (rawText: string): string => {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1);
  }

  return rawText.trim();
};

const decodeJsonPointerSegment = (segment: string): string =>
  segment.replace(/~1/g, '/').replace(/~0/g, '~');

const appendJsonPathSegment = (path: string, segment: string): string => {
  if (/^\d+$/.test(segment)) {
    return `${path}[${segment}]`;
  }

  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)
    ? `${path}.${segment}`
    : `${path}[${JSON.stringify(segment)}]`;
};

const toJsonPath = (instancePath: string): string => {
  if (!instancePath) {
    return '$';
  }

  return instancePath
    .split('/')
    .slice(1)
    .map(decodeJsonPointerSegment)
    .reduce(appendJsonPathSegment, '$');
};

const getAjvErrorParam = (error: ErrorObject, key: string): string | undefined => {
  const params = error.params as Record<string, unknown>;
  const value = params[key];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const formatAjvError = (error: ErrorObject): string => {
  if (error.keyword === 'required') {
    const missingProperty = getAjvErrorParam(error, 'missingProperty');

    return `${toJsonPath(error.instancePath)}.${missingProperty ?? 'unknown'} is required`;
  }

  if (error.keyword === 'additionalProperties') {
    const additionalProperty = getAjvErrorParam(error, 'additionalProperty');

    return `${toJsonPath(error.instancePath)} must not include additional property ${additionalProperty ?? 'unknown'}`;
  }

  return `${toJsonPath(error.instancePath)} ${error.message ?? 'is invalid'}`;
};

export const getDefaultOutputSchema = (category: PromptTemplateCategory): Record<string, unknown> =>
  structuredClone(defaultSchemas[category]);

export const assertValidOutputSchema = (schema: unknown): Record<string, unknown> => {
  const parsed = jsonObjectSchema.parse(schema);

  if (Object.keys(parsed).length === 0) {
    throw new Error('Prompt template outputSchema must define at least one schema rule');
  }

  try {
    getSchemaValidator(parsed);
  } catch (error) {
    throw new Error(
      `Prompt template outputSchema must be a valid JSON schema: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const schemaType = parsed['type'];
  if (typeof schemaType === 'string' && schemaType !== 'object') {
    throw new Error('Prompt template outputSchema must describe a JSON object');
  }

  if (
    Array.isArray(schemaType) &&
    !schemaType.some((entry) => typeof entry === 'string' && entry === 'object')
  ) {
    throw new Error('Prompt template outputSchema must describe a JSON object');
  }

  return parsed;
};

export const assertCategoryOutputSchema = (
  category: PromptTemplateCategory,
  schema: unknown,
): Record<string, unknown> => {
  const parsed = assertValidOutputSchema(schema);
  const canonicalSchema = getDefaultOutputSchema(category);

  if (!isDeepStrictEqual(parsed, canonicalSchema)) {
    throw new Error(
      `Prompt template outputSchema must match the canonical schema for category ${category}`,
    );
  }

  return parsed;
};

export const parseStructuredOutput = <T extends Record<string, unknown>>(
  rawText: string,
  schema: Record<string, unknown>,
): T => {
  const candidate = extractJsonCandidate(rawText);
  const parsed = jsonObjectSchema.parse(JSON.parse(candidate));
  let validator: ValidateFunction;

  try {
    validator = getSchemaValidator(schema);
  } catch (error) {
    throw new Error(
      `Invalid output schema: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!validator(parsed)) {
    const issues = validator.errors?.map(formatAjvError) ?? ['Unknown schema validation error'];

    throw new Error(`Structured output validation failed: ${issues.join('; ')}`);
  }

  return parsed as T;
};
