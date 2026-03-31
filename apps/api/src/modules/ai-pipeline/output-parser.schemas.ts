import type { PromptTemplateCategory } from './ai-pipeline.types.js';

export type JsonSchemaNode = Record<string, unknown>;

export const emailHeaderSchema = {
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

export const emailBodySchema = {
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

export const emailLinkSchema = {
  type: 'object',
  required: ['label', 'url', 'is_suspicious'],
  additionalProperties: false,
  properties: {
    label: { type: 'string', minLength: 1 },
    url: { type: 'string', minLength: 3 },
    is_suspicious: { type: 'boolean' },
  },
} satisfies JsonSchemaNode;

export const emailAttachmentSchema = {
  type: 'object',
  required: ['name', 'type', 'is_suspicious'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1 },
    is_suspicious: { type: 'boolean' },
  },
} satisfies JsonSchemaNode;

export const emailSignalSchema = {
  type: 'object',
  required: ['type', 'location', 'explanation'],
  additionalProperties: false,
  properties: {
    type: { type: 'string', minLength: 1 },
    location: { type: 'string', minLength: 1 },
    explanation: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchemaNode;

export const createEmailOutputSchema = (options: { allowAttackType: boolean }): JsonSchemaNode => ({
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

export const emailOutputSchema = createEmailOutputSchema({ allowAttackType: true });
export const legitimateEmailOutputSchema = createEmailOutputSchema({ allowAttackType: false });

export const defaultSchemas: Record<PromptTemplateCategory, JsonSchemaNode> = {
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
