import { describe, it, expect } from 'vitest';

import {
  getFrameworkLabel,
  getFrameworkCertificateText,
  getFrameworkValidityYears,
  isRegulatoryFramework,
  REGULATORY_FRAMEWORKS,
} from '@the-dmz/shared';

describe('regulatory frameworks', () => {
  it('should have all required frameworks defined', () => {
    expect(REGULATORY_FRAMEWORKS).toContain('nist_800_50');
    expect(REGULATORY_FRAMEWORKS).toContain('iso_27001');
    expect(REGULATORY_FRAMEWORKS).toContain('pci_dss');
    expect(REGULATORY_FRAMEWORKS).toContain('hipaa');
    expect(REGULATORY_FRAMEWORKS).toContain('gdpr');
    expect(REGULATORY_FRAMEWORKS).toContain('soc_2');
    expect(REGULATORY_FRAMEWORKS).toContain('nis2_article_20');
    expect(REGULATORY_FRAMEWORKS).toContain('dora_article_5');
  });

  it('should return correct label for framework', () => {
    expect(getFrameworkLabel('nist_800_50')).toBe('NIST 800-50');
    expect(getFrameworkLabel('gdpr')).toBe('GDPR');
  });

  it('should return certificate text for framework', () => {
    const text = getFrameworkCertificateText('nist_800_50');
    expect(text).toContain('NIST 800-50');
  });

  it('should return validity years for framework', () => {
    expect(getFrameworkValidityYears('nist_800_50')).toBe(1);
  });

  it('should validate regulatory framework', () => {
    expect(isRegulatoryFramework('nist_800_50')).toBe(true);
    expect(isRegulatoryFramework('invalid')).toBe(false);
  });
});
