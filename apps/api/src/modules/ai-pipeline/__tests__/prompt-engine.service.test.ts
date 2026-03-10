import { describe, expect, it } from 'vitest';

import { buildPrompt } from '../prompt-engine.service.js';

describe('prompt-engine.service', () => {
  it('interpolates nested context values and appends context plus schema blocks', () => {
    const prompt = buildPrompt(
      {
        systemPrompt: ' Generate JSON only. ',
        userTemplate:
          'Generate a {{attackType}} request for {{player.name}} in {{location.zone}} using {{tags}}.',
        outputSchema: {
          type: 'object',
          required: ['content_type'],
          properties: {
            content_type: { type: 'string' },
          },
        },
      },
      {
        attackType: 'spear_phishing',
        player: { name: 'Archivist Hale' },
        location: { zone: 'Sector 7' },
        tags: ['urgent', 'targeted'],
      },
    );

    expect(prompt.systemPrompt).toBe('Generate JSON only.');
    expect(prompt.userPrompt).toContain(
      'Generate a spear_phishing request for Archivist Hale in Sector 7 using ["urgent","targeted"].',
    );
    expect(prompt.userPrompt).toContain('"attackType": "spear_phishing"');
    expect(prompt.userPrompt).toContain('"required": [');
    expect(prompt.promptHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('changes the prompt hash when rendered prompt content changes', () => {
    const template = {
      systemPrompt: 'Generate JSON only.',
      userTemplate: 'Generate a {{attackType}} request.',
      outputSchema: { type: 'object' },
    };

    const first = buildPrompt(template, { attackType: 'spear_phishing' });
    const second = buildPrompt(template, { attackType: 'supply_chain' });

    expect(first.promptHash).not.toBe(second.promptHash);
  });
});
