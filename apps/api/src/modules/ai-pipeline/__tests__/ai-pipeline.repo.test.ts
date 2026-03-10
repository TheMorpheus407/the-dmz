import { describe, expect, it } from 'vitest';

import { selectBestPromptTemplate } from '../ai-pipeline.repo.js';

import type { PromptTemplate } from '../../../db/schema/ai/prompt-templates.js';

const baseTemplate = {
  tenantId: '5d0af1e9-c75d-4029-a4c8-5dff8c704ec5',
  category: 'email_phishing',
  description: null,
  attackType: null,
  threatLevel: null,
  difficulty: null,
  season: null,
  chapter: null,
  systemPrompt: 'Generate JSON only.',
  userTemplate: 'Generate a phishing email.',
  outputSchema: { type: 'object' },
  version: '1.0.0',
  tokenBudget: 1200,
  isActive: true,
  metadata: {},
  createdAt: new Date('2026-03-01T00:00:00Z'),
  updatedAt: new Date('2026-03-01T00:00:00Z'),
} as const satisfies Omit<PromptTemplate, 'id' | 'name'>;

describe('ai-pipeline.repo', () => {
  it('prefers the closest contextual template match over generic templates', () => {
    const genericTemplate = {
      ...baseTemplate,
      id: '9d6140a2-96e3-4bc8-a468-60ccf4f9c300',
      name: 'Generic phishing template',
      updatedAt: new Date('2026-03-01T00:00:00Z'),
    };
    const contextualTemplate = {
      ...baseTemplate,
      id: '58055ea8-a99d-43ce-8f35-f4019d4178d0',
      name: 'Supply chain season one template',
      attackType: 'supply_chain',
      season: 1,
      difficulty: 4,
      updatedAt: new Date('2026-03-02T00:00:00Z'),
    };
    const wrongAttackTypeTemplate = {
      ...baseTemplate,
      id: 'ab6078bf-b708-47af-b2e8-a9c0042f5d3f',
      name: 'Credential harvesting season one template',
      attackType: 'credential_harvesting',
      season: 1,
      difficulty: 4,
      updatedAt: new Date('2026-03-03T00:00:00Z'),
    };

    const selected = selectBestPromptTemplate(
      [genericTemplate, contextualTemplate, wrongAttackTypeTemplate],
      {
        category: 'email_phishing',
        attackType: 'supply_chain',
        season: 1,
        difficulty: 4,
      },
    );

    expect(selected?.id).toBe(contextualTemplate.id);
  });

  it('falls back to the nearest difficulty match when no exact difficulty template exists', () => {
    const diffThreeTemplate = {
      ...baseTemplate,
      id: '7124b6b0-2bb4-49c6-ae0d-5ca517cbf50f',
      name: 'Difficulty three template',
      difficulty: 3,
      updatedAt: new Date('2026-03-01T00:00:00Z'),
    };
    const diffFourTemplate = {
      ...baseTemplate,
      id: '24a5fb39-9544-4ad6-aa0b-b4c03066e902',
      name: 'Difficulty four template',
      difficulty: 4,
      updatedAt: new Date('2026-03-02T00:00:00Z'),
    };

    const selected = selectBestPromptTemplate([diffThreeTemplate, diffFourTemplate], {
      category: 'email_phishing',
      difficulty: 5,
    });

    expect(selected?.id).toBe(diffFourTemplate.id);
  });

  it('honors an explicit template id even when contextual selectors are omitted', () => {
    const contextualTemplate = {
      ...baseTemplate,
      id: '58055ea8-a99d-43ce-8f35-f4019d4178d0',
      name: 'Supply chain season one template',
      attackType: 'supply_chain',
      season: 1,
      difficulty: 4,
      updatedAt: new Date('2026-03-02T00:00:00Z'),
    };

    const selected = selectBestPromptTemplate([contextualTemplate], {
      category: 'email_phishing',
      templateId: contextualTemplate.id,
    });

    expect(selected?.id).toBe(contextualTemplate.id);
  });

  it('honors an explicit template name even when contextual selectors are omitted', () => {
    const contextualTemplate = {
      ...baseTemplate,
      id: '58055ea8-a99d-43ce-8f35-f4019d4178d0',
      name: 'Supply chain season one template',
      attackType: 'supply_chain',
      season: 1,
      difficulty: 4,
      updatedAt: new Date('2026-03-02T00:00:00Z'),
    };

    const selected = selectBestPromptTemplate([contextualTemplate], {
      category: 'email_phishing',
      templateName: contextualTemplate.name,
    });

    expect(selected?.id).toBe(contextualTemplate.id);
  });

  it('keeps templates selectable when optional request selectors are omitted', () => {
    const contextualTemplate = {
      ...baseTemplate,
      id: '9c4561a3-420f-4a60-b8f8-0dbc48896265',
      name: 'High threat season one brief',
      category: 'intel_brief' as const,
      threatLevel: 'HIGH',
      season: 1,
      updatedAt: new Date('2026-03-04T00:00:00Z'),
    };

    const selected = selectBestPromptTemplate([contextualTemplate], {
      category: 'intel_brief' as const,
      season: 1,
    });

    expect(selected?.id).toBe(contextualTemplate.id);
  });

  it('prefers templates that do not add unrequested selectors when scores tie', () => {
    const seasonOnlyTemplate = {
      ...baseTemplate,
      id: '2f2cfa52-afd4-4d03-a98b-cb270d25276c',
      name: 'Season one brief',
      category: 'intel_brief' as const,
      season: 1,
      updatedAt: new Date('2026-03-04T00:00:00Z'),
    };
    const seasonAndThreatTemplate = {
      ...baseTemplate,
      id: 'd7a77d6b-381c-4adc-9d2d-1227d56d0ce0',
      name: 'Season one high threat brief',
      category: 'intel_brief' as const,
      threatLevel: 'HIGH',
      season: 1,
      updatedAt: new Date('2026-03-05T00:00:00Z'),
    };

    const selected = selectBestPromptTemplate([seasonAndThreatTemplate, seasonOnlyTemplate], {
      category: 'intel_brief',
      season: 1,
    });

    expect(selected?.id).toBe(seasonOnlyTemplate.id);
  });
});
