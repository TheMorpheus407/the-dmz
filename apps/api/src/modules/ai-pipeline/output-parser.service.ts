import { isDeepStrictEqual } from 'node:util';

import * as AjvFormatsModule from 'ajv-formats';
import * as AjvModule from 'ajv';
import { z } from 'zod';

import type { PromptTemplateCategory } from './ai-pipeline.types.js';
import type { AnySchemaObject, ErrorObject, ValidateFunction } from 'ajv';
import type { FormatsPlugin } from 'ajv-formats';

type JsonSchemaNode = Record<string, unknown>;

const jsonObjectSchema = z.record(z.unknown());
const AjvConstructor = AjvModule.default as unknown as typeof AjvModule.Ajv;
const addFormats = AjvFormatsModule.default as unknown as FormatsPlugin;
const ajv = new AjvConstructor({
  allErrors: true,
  allowUnionTypes: true,
  strict: false,
  validateFormats: true,
});
const validatorCache = new Map<string, ValidateFunction>();

addFormats(ajv);

const emailHeaderSchema = {
  type: 'object',
  required: ['from', 'to', 'subject', 'date', 'message_id'],
  additionalProperties: false,
  properties: {
    from: { type: 'string', minLength: 3 },
    to: { type: 'string', minLength: 3 },
    subject: { type: 'string', minLength: 3, maxLength: 500 },
    date: { type: 'string', minLength: 5 },
    message_id: { type: 'string', minLength: 3 },
    reply_to: { type: 'string' },
    spf: { type: 'string' },
    dkim: { type: 'string' },
    dmarc: { type: 'string' },
  },
} satisfies JsonSchemaNode;

const emailBodySchema = {
  type: 'object',
  required: ['greeting', 'summary', 'justification', 'call_to_action', 'signature'],
  additionalProperties: false,
  properties: {
    greeting: { type: 'string', minLength: 1 },
    summary: { type: 'string', minLength: 1 },
    justification: { type: 'string', minLength: 1 },
    call_to_action: { type: 'string', minLength: 1 },
    signature: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchemaNode;

const emailLinkSchema = {
  type: 'object',
  required: ['label', 'url', 'is_suspicious'],
  additionalProperties: false,
  properties: {
    label: { type: 'string', minLength: 1 },
    url: { type: 'string', minLength: 3 },
    is_suspicious: { type: 'boolean' },
  },
} satisfies JsonSchemaNode;

const emailAttachmentSchema = {
  type: 'object',
  required: ['name', 'type', 'is_suspicious'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1 },
    is_suspicious: { type: 'boolean' },
  },
} satisfies JsonSchemaNode;

const emailSignalSchema = {
  type: 'object',
  required: ['type', 'location', 'explanation'],
  additionalProperties: false,
  properties: {
    type: { type: 'string', minLength: 1 },
    location: { type: 'string', minLength: 1 },
    explanation: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchemaNode;

const createEmailOutputSchema = (options: { allowAttackType: boolean }): JsonSchemaNode => ({
  type: 'object',
  required: ['content_type', 'headers', 'body', 'links', 'attachments', 'signals', 'safety_flags'],
  additionalProperties: false,
  properties: {
    content_type: { type: 'string', enum: ['email'] },
    headers: emailHeaderSchema,
    body: emailBodySchema,
    links: {
      type: 'array',
      items: emailLinkSchema,
    },
    attachments: {
      type: 'array',
      items: emailAttachmentSchema,
    },
    signals: {
      type: 'array',
      items: emailSignalSchema,
    },
    safety_flags: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    faction: { type: 'string', minLength: 1, maxLength: 64 },
    difficulty: { type: 'integer', minimum: 1, maximum: 5 },
    threat_level: { type: 'string', minLength: 1, maxLength: 32 },
    season: { type: 'integer', minimum: 1 },
    chapter: { type: 'integer', minimum: 1 },
    ...(options.allowAttackType
      ? {
          attack_type: { type: 'string', minLength: 1, maxLength: 64 },
        }
      : {}),
  },
});

const emailOutputSchema = createEmailOutputSchema({ allowAttackType: true });
const legitimateEmailOutputSchema = createEmailOutputSchema({ allowAttackType: false });

const defaultSchemas: Record<PromptTemplateCategory, JsonSchemaNode> = {
  email_phishing: emailOutputSchema,
  email_legitimate: legitimateEmailOutputSchema,
  intel_brief: {
    type: 'object',
    required: [
      'content_type',
      'executive_summary',
      'observed_indicators',
      'expected_adversary_tactics',
      'recommended_posture',
      'safety_flags',
    ],
    additionalProperties: false,
    properties: {
      content_type: { type: 'string', enum: ['intel_brief'] },
      executive_summary: { type: 'string', minLength: 1 },
      observed_indicators: { type: 'array', items: { type: 'string', minLength: 1 } },
      expected_adversary_tactics: { type: 'array', items: { type: 'string', minLength: 1 } },
      recommended_posture: { type: 'string', minLength: 1 },
      safety_flags: { type: 'array', items: { type: 'string', minLength: 1 } },
    },
  },
  incident_summary: {
    type: 'object',
    required: ['content_type', 'summary', 'impacts', 'lessons', 'safety_flags'],
    additionalProperties: false,
    properties: {
      content_type: { type: 'string', enum: ['incident_summary'] },
      summary: { type: 'string', minLength: 1 },
      impacts: { type: 'array', items: { type: 'string', minLength: 1 } },
      lessons: { type: 'array', items: { type: 'string', minLength: 1 } },
      safety_flags: { type: 'array', items: { type: 'string', minLength: 1 } },
    },
  },
  scenario_variation: {
    type: 'object',
    required: [
      'content_type',
      'name',
      'summary',
      'trigger_conditions',
      'required_deliverables',
      'follow_up_triggers',
      'safety_flags',
    ],
    additionalProperties: false,
    properties: {
      content_type: { type: 'string', enum: ['scenario_variation'] },
      name: { type: 'string', minLength: 1 },
      summary: { type: 'string', minLength: 1 },
      trigger_conditions: { type: 'array', items: { type: 'string', minLength: 1 } },
      required_deliverables: { type: 'array', items: { type: 'string', minLength: 1 } },
      follow_up_triggers: { type: 'array', items: { type: 'string', minLength: 1 } },
      safety_flags: { type: 'array', items: { type: 'string', minLength: 1 } },
    },
  },
  micro_lesson: {
    type: 'object',
    required: ['content_type', 'title', 'lesson', 'reinforcement_points', 'safety_flags'],
    additionalProperties: false,
    properties: {
      content_type: { type: 'string', enum: ['micro_lesson'] },
      title: { type: 'string', minLength: 1 },
      lesson: { type: 'string', minLength: 1 },
      reinforcement_points: { type: 'array', items: { type: 'string', minLength: 1 } },
      safety_flags: { type: 'array', items: { type: 'string', minLength: 1 } },
    },
  },
};

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

const getSchemaValidator = (schema: JsonSchemaNode): ValidateFunction => {
  const cacheKey = JSON.stringify(schema);
  const cachedValidator = validatorCache.get(cacheKey);
  if (cachedValidator) {
    return cachedValidator;
  }

  const validator = ajv.compile(schema as AnySchemaObject);
  validatorCache.set(cacheKey, validator);

  return validator;
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
