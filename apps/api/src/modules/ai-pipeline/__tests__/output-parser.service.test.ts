import { describe, expect, it } from 'vitest';

import {
  assertCategoryOutputSchema,
  assertValidOutputSchema,
  getDefaultOutputSchema,
  parseStructuredOutput,
} from '../output-parser.service.js';

describe('output-parser.service', () => {
  it('accepts content that matches a strict JSON schema', () => {
    const parsed = parseStructuredOutput<{ name: string; email: string }>(
      '{"name":"archivist","email":"liaison@nexion.invalid"}',
      {
        type: 'object',
        required: ['name', 'email'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', pattern: '^[a-z]+$' },
          email: { type: 'string', format: 'email' },
        },
      },
    );

    expect(parsed).toEqual({
      name: 'archivist',
      email: 'liaison@nexion.invalid',
    });
  });

  it('rejects additional properties when the schema forbids them', () => {
    expect(() =>
      parseStructuredOutput('{"name":"archivist","unexpected":true}', {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1 },
        },
      }),
    ).toThrow(/additional propert/i);
  });

  it('rejects values that fail pattern and format checks', () => {
    expect(() =>
      parseStructuredOutput('{"name":"INVALID-123","email":"not-an-email"}', {
        type: 'object',
        required: ['name', 'email'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', pattern: '^[a-z]+$' },
          email: { type: 'string', format: 'email' },
        },
      }),
    ).toThrow(/pattern|format/i);
  });

  it('enforces schema combinators such as oneOf', () => {
    expect(() =>
      parseStructuredOutput('{"delivery":"sms"}', {
        type: 'object',
        required: ['delivery'],
        additionalProperties: false,
        properties: {
          delivery: {
            oneOf: [{ const: 'email' }, { const: 'brief' }],
          },
        },
      }),
    ).toThrow(/oneOf|must match exactly one schema/i);
  });

  it('rejects output schemas that are not valid JSON schemas', () => {
    expect(() =>
      assertValidOutputSchema({
        type: 'definitely-not-a-real-json-schema-type',
      }),
    ).toThrow(/valid JSON schema/i);
  });

  it('rejects category schemas that do not match the canonical output contract', () => {
    expect(() =>
      assertCategoryOutputSchema('email_phishing', {
        type: 'object',
        required: ['foo'],
        additionalProperties: false,
        properties: {
          foo: { type: 'string' },
        },
      }),
    ).toThrow(/canonical schema for category email_phishing/i);
  });

  it('rejects phishing-only metadata in legitimate email output', () => {
    expect(() =>
      parseStructuredOutput(
        JSON.stringify({
          content_type: 'email',
          headers: {
            from: 'records-desk@librarians.test',
            to: 'intake@archive.invalid',
            subject: 'Archive Relay Follow-up Review',
            date: '2063-09-14T14:22:00Z',
            message_id: '<curated-legitimate@archive.test>',
            reply_to: 'records-desk@librarians.test',
            spf: 'pass',
            dkim: 'pass',
            dmarc: 'pass',
          },
          body: {
            greeting: 'Gatekeeper,',
            summary: 'Please review the relay follow-up request attached to this intake packet.',
            justification: 'The request matches the relay ticket already logged with records desk.',
            call_to_action: 'Verify the packet details before approving access.',
            signature: 'Records Desk, Librarians',
          },
          links: [],
          attachments: [],
          signals: [],
          safety_flags: ['ok'],
          attack_type: 'spear_phishing',
        }),
        getDefaultOutputSchema('email_legitimate'),
      ),
    ).toThrow(/attack_type|additional propert/i);
  });

  it.each([
    [
      'intel_brief',
      {
        content_type: 'intel_brief',
        executive_summary: 'Archive relay anomalies increased after shift change.',
        observed_indicators: ['Unexpected credential reset requests'],
        expected_adversary_tactics: ['credential_harvesting'],
        recommended_posture: 'Verify access requests against relay manifests.',
        safety_flags: ['ok'],
        unexpected: true,
      },
    ],
    [
      'incident_summary',
      {
        content_type: 'incident_summary',
        summary: 'A forged records notice reached intake before manual review.',
        impacts: ['Two delayed approvals'],
        lessons: ['Cross-check message IDs before approval'],
        safety_flags: ['ok'],
        unexpected: true,
      },
    ],
    [
      'scenario_variation',
      {
        content_type: 'scenario_variation',
        name: 'Relay Queue Escalation',
        summary: 'A supply-chain probe escalates across archive relay queues.',
        trigger_conditions: ['Threat level HIGH'],
        required_deliverables: ['Escalation brief'],
        follow_up_triggers: ['Inbox saturation'],
        safety_flags: ['ok'],
        unexpected: true,
      },
    ],
    [
      'micro_lesson',
      {
        content_type: 'micro_lesson',
        title: 'Reserved TLD Hygiene',
        lesson: 'Safe training links must stay within reserved TLDs.',
        reinforcement_points: ['Reject real-world domains in simulated emails'],
        safety_flags: ['ok'],
        unexpected: true,
      },
    ],
  ] as const)('rejects additional properties for %s outputs', (category, payload) => {
    expect(() =>
      parseStructuredOutput(JSON.stringify(payload), getDefaultOutputSchema(category)),
    ).toThrow(/additional propert/i);
  });
});
