import { describe, expect, it } from 'vitest';

import {
  COMPETENCY_DOMAINS,
  COMPETENCY_DOMAIN_LABELS,
  COMPETENCY_DOMAIN_DESCRIPTIONS,
  COMPETENCY_SCORE_RANGES,
  MECHANIC_TO_DOMAIN_MAPPING,
  isCompetencyDomain,
  getCompetencyLabel,
  getCompetencyDescription,
  getScoreRange,
} from './competency.js';

describe('COMPETENCY_DOMAINS', () => {
  it('contains all 7 competency domains', () => {
    expect(COMPETENCY_DOMAINS).toHaveLength(7);
    expect(COMPETENCY_DOMAINS).toContain('phishing_detection');
    expect(COMPETENCY_DOMAINS).toContain('password_security');
    expect(COMPETENCY_DOMAINS).toContain('data_handling');
    expect(COMPETENCY_DOMAINS).toContain('social_engineering_resistance');
    expect(COMPETENCY_DOMAINS).toContain('incident_response');
    expect(COMPETENCY_DOMAINS).toContain('physical_security');
    expect(COMPETENCY_DOMAINS).toContain('compliance_awareness');
  });
});

describe('COMPETENCY_DOMAIN_LABELS', () => {
  it('has labels for all domains', () => {
    for (const domain of COMPETENCY_DOMAINS) {
      expect(COMPETENCY_DOMAIN_LABELS[domain]).toBeDefined();
      expect(typeof COMPETENCY_DOMAIN_LABELS[domain]).toBe('string');
    }
  });

  it('returns expected label format', () => {
    expect(COMPETENCY_DOMAIN_LABELS.phishing_detection).toBe('Phishing Detection');
    expect(COMPETENCY_DOMAIN_LABELS.incident_response).toBe('Incident Response');
  });
});

describe('COMPETENCY_DOMAIN_DESCRIPTIONS', () => {
  it('has descriptions for all domains', () => {
    for (const domain of COMPETENCY_DOMAINS) {
      expect(COMPETENCY_DOMAIN_DESCRIPTIONS[domain]).toBeDefined();
      expect(typeof COMPETENCY_DOMAIN_DESCRIPTIONS[domain]).toBe('string');
      expect(COMPETENCY_DOMAIN_DESCRIPTIONS[domain].length).toBeGreaterThan(0);
    }
  });
});

describe('COMPETENCY_SCORE_RANGES', () => {
  it('defines all score ranges', () => {
    expect(COMPETENCY_SCORE_RANGES.FOUNDATIONAL).toBeDefined();
    expect(COMPETENCY_SCORE_RANGES.OPERATIONAL).toBeDefined();
    expect(COMPETENCY_SCORE_RANGES.CONSISTENT).toBeDefined();
    expect(COMPETENCY_SCORE_RANGES.MASTERY).toBeDefined();
  });

  it('has correct min/max values', () => {
    expect(COMPETENCY_SCORE_RANGES.FOUNDATIONAL.min).toBe(0);
    expect(COMPETENCY_SCORE_RANGES.FOUNDATIONAL.max).toBe(39);
    expect(COMPETENCY_SCORE_RANGES.OPERATIONAL.min).toBe(40);
    expect(COMPETENCY_SCORE_RANGES.OPERATIONAL.max).toBe(69);
    expect(COMPETENCY_SCORE_RANGES.CONSISTENT.min).toBe(70);
    expect(COMPETENCY_SCORE_RANGES.CONSISTENT.max).toBe(89);
    expect(COMPETENCY_SCORE_RANGES.MASTERY.min).toBe(90);
    expect(COMPETENCY_SCORE_RANGES.MASTERY.max).toBe(100);
  });

  it('has labels for all ranges', () => {
    expect(COMPETENCY_SCORE_RANGES.FOUNDATIONAL.label).toBe('Foundational');
    expect(COMPETENCY_SCORE_RANGES.OPERATIONAL.label).toBe('Operational');
    expect(COMPETENCY_SCORE_RANGES.CONSISTENT.label).toBe('Consistent');
    expect(COMPETENCY_SCORE_RANGES.MASTERY.label).toBe('Mastery');
  });
});

describe('MECHANIC_TO_DOMAIN_MAPPING', () => {
  it('maps email_triage to correct domains', () => {
    expect(MECHANIC_TO_DOMAIN_MAPPING.email_triage).toContain('phishing_detection');
    expect(MECHANIC_TO_DOMAIN_MAPPING.email_triage).toContain('social_engineering_resistance');
  });

  it('maps verification_packet to correct domains', () => {
    expect(MECHANIC_TO_DOMAIN_MAPPING.verification_packet).toContain(
      'social_engineering_resistance',
    );
    expect(MECHANIC_TO_DOMAIN_MAPPING.verification_packet).toContain('phishing_detection');
  });

  it('maps incident_log to incident_response', () => {
    expect(MECHANIC_TO_DOMAIN_MAPPING.incident_log).toContain('incident_response');
  });

  it('maps data_salvage_contract to data_handling', () => {
    expect(MECHANIC_TO_DOMAIN_MAPPING.data_salvage_contract).toContain('data_handling');
    expect(MECHANIC_TO_DOMAIN_MAPPING.data_salvage_contract).toContain('compliance_awareness');
  });
});

describe('isCompetencyDomain', () => {
  it('returns true for valid domains', () => {
    expect(isCompetencyDomain('phishing_detection')).toBe(true);
    expect(isCompetencyDomain('incident_response')).toBe(true);
  });

  it('returns false for invalid domains', () => {
    expect(isCompetencyDomain('invalid')).toBe(false);
    expect(isCompetencyDomain(123)).toBe(false);
    expect(isCompetencyDomain(null)).toBe(false);
  });
});

describe('getCompetencyLabel', () => {
  it('returns label for valid domain', () => {
    expect(getCompetencyLabel('phishing_detection')).toBe('Phishing Detection');
    expect(getCompetencyLabel('compliance_awareness')).toBe('Compliance Awareness');
  });

  it('handles all domains', () => {
    for (const domain of COMPETENCY_DOMAINS) {
      expect(getCompetencyLabel(domain)).toBe(COMPETENCY_DOMAIN_LABELS[domain]);
    }
  });
});

describe('getCompetencyDescription', () => {
  it('returns description for valid domain', () => {
    const desc = getCompetencyDescription('phishing_detection');
    expect(typeof desc).toBe('string');
    expect(desc.length).toBeGreaterThan(0);
  });

  it('handles all domains', () => {
    for (const domain of COMPETENCY_DOMAINS) {
      expect(getCompetencyDescription(domain)).toBe(COMPETENCY_DOMAIN_DESCRIPTIONS[domain]);
    }
  });
});

describe('getScoreRange', () => {
  it('returns FOUNDATIONAL for scores 0-39', () => {
    expect(getScoreRange(0)).toBe(COMPETENCY_SCORE_RANGES.FOUNDATIONAL);
    expect(getScoreRange(20)).toBe(COMPETENCY_SCORE_RANGES.FOUNDATIONAL);
    expect(getScoreRange(39)).toBe(COMPETENCY_SCORE_RANGES.FOUNDATIONAL);
  });

  it('returns OPERATIONAL for scores 40-69', () => {
    expect(getScoreRange(40)).toBe(COMPETENCY_SCORE_RANGES.OPERATIONAL);
    expect(getScoreRange(55)).toBe(COMPETENCY_SCORE_RANGES.OPERATIONAL);
    expect(getScoreRange(69)).toBe(COMPETENCY_SCORE_RANGES.OPERATIONAL);
  });

  it('returns CONSISTENT for scores 70-89', () => {
    expect(getScoreRange(70)).toBe(COMPETENCY_SCORE_RANGES.CONSISTENT);
    expect(getScoreRange(80)).toBe(COMPETENCY_SCORE_RANGES.CONSISTENT);
    expect(getScoreRange(89)).toBe(COMPETENCY_SCORE_RANGES.CONSISTENT);
  });

  it('returns MASTERY for scores 90-100', () => {
    expect(getScoreRange(90)).toBe(COMPETENCY_SCORE_RANGES.MASTERY);
    expect(getScoreRange(95)).toBe(COMPETENCY_SCORE_RANGES.MASTERY);
    expect(getScoreRange(100)).toBe(COMPETENCY_SCORE_RANGES.MASTERY);
  });
});
