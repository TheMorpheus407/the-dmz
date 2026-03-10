import { describe, expect, it, vi } from 'vitest';

import { classifyDifficulty } from '../difficulty-classifier.service.js';

import type { ClaudeClient } from '../ai-pipeline.types.js';

const phishingEmail = {
  content_type: 'email',
  headers: {
    from: 'liaison@nexion.invalid',
    to: 'intake@archive.invalid',
    subject: 'Urgent Credential Refresh',
    spf: 'fail',
    dkim: 'neutral',
    dmarc: 'fail',
  },
  body: {
    summary: 'Review the relay access request before the shift rollover.',
    justification: 'The records queue was moved to a secondary intake path.',
    call_to_action: 'Open the relay verification portal immediately.',
    signature: 'Relay Office',
  },
  links: [
    {
      label: 'Verification Portal',
      url: 'https://verify.nexion.invalid/portal',
      is_suspicious: true,
    },
  ],
  signals: [
    {
      type: 'urgency',
      location: 'body.call_to_action',
      explanation: 'Immediate action is demanded.',
    },
  ],
};

const legitimateEmail = {
  content_type: 'email',
  headers: {
    from: 'records-desk@librarians.test',
    to: 'intake@archive.invalid',
    subject: 'Packet Follow-up',
    spf: 'pass',
    dkim: 'pass',
    dmarc: 'pass',
  },
  body: {
    summary: 'Please review the attached packet before approving access.',
    justification: 'The packet already exists in the archive ledger for cross-checking.',
    call_to_action: 'Use the offline verification packet before approving this request.',
    signature: 'Records Desk',
  },
  links: [
    {
      label: 'Packet Index',
      url: 'https://packet.librarians.test/index',
      is_suspicious: false,
    },
  ],
  signals: [
    {
      type: 'verification_hint',
      location: 'body.justification',
      explanation: 'The request references an offline packet that can be verified.',
    },
  ],
};

const intelBrief = {
  content_type: 'intel_brief',
  executive_summary:
    'Threat telemetry suggests a focused access-manipulation wave against archive intake procedures.',
  observed_indicators: [
    'Increased use of urgency language in access requests',
    'Credential refresh narratives tied to routine maintenance',
  ],
  expected_adversary_tactics: ['spear_phishing', 'credential_harvesting'],
  recommended_posture:
    'Require offline verification for any request that introduces urgency or unexpected identity changes.',
  safety_flags: ['ok'],
};

const scenarioVariation = {
  content_type: 'scenario_variation',
  name: 'Archive relay sync anomaly',
  summary:
    'A staggered campaign attempts to blend routine archive relay maintenance with escalating credential abuse.',
  trigger_conditions: [
    'Threat level remains at ELEVATED',
    'Player processes a suspicious maintenance-themed access request',
  ],
  required_deliverables: ['email_wave', 'intel_brief'],
  follow_up_triggers: ['verification_requested', 'delayed_response'],
  safety_flags: ['ok'],
};

describe('difficulty-classifier.service', () => {
  it('returns model classifications with usage metrics when Claude succeeds', async () => {
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue({
        text: '{"difficulty":5,"rationale":"Targeted pretext with limited overt indicators."}',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: 10,
        outputTokens: 20,
        latencyMs: 7,
        estimatedCostUsd: 0.00011,
      }),
    };

    const result = await classifyDifficulty({
      category: 'email_phishing',
      content: phishingEmail,
      attackType: 'spear_phishing',
      claudeClient,
      requestId: 'req-classifier-model',
    });

    expect(result).toMatchObject({
      difficulty: 5,
      source: 'model',
      rationale: 'Targeted pretext with limited overt indicators.',
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        latencyMs: 7,
        estimatedCostUsd: 0.00011,
      },
    });
    expect(claudeClient.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        task: 'classification',
        requestId: 'req-classifier-model',
        maxTokens: 128,
        temperature: 0,
      }),
    );
  });

  it('falls back to heuristic classification without usage when model output is invalid', async () => {
    const claudeClient: ClaudeClient = {
      complete: vi.fn().mockResolvedValue({
        text: '{"difficulty":"hard"}',
        model: 'claude-haiku-4-5-20251001',
        inputTokens: 9,
        outputTokens: 11,
        latencyMs: 5,
        estimatedCostUsd: 0.000064,
      }),
    };

    const result = await classifyDifficulty({
      category: 'email_legitimate',
      content: legitimateEmail,
      baselineDifficulty: 2,
      claudeClient,
    });

    expect(result).toMatchObject({
      difficulty: 2,
      source: 'heuristic',
    });
    expect(result.usage).toBeUndefined();
  });

  it('preserves baseline difficulty for non-email heuristic classifications', async () => {
    const intelResult = await classifyDifficulty({
      category: 'intel_brief',
      content: intelBrief,
      baselineDifficulty: 5,
    });
    const scenarioResult = await classifyDifficulty({
      category: 'scenario_variation',
      content: scenarioVariation,
      baselineDifficulty: 1,
    });

    expect(intelResult).toMatchObject({
      difficulty: 5,
      source: 'heuristic',
      rationale: 'Non-email content uses the requested/template baseline difficulty for v1.',
    });
    expect(scenarioResult).toMatchObject({
      difficulty: 1,
      source: 'heuristic',
      rationale: 'Non-email content uses the requested/template baseline difficulty for v1.',
    });
  });
});
