export const REGULATORY_FRAMEWORKS = [
  'nist_800_50',
  'iso_27001',
  'pci_dss',
  'hipaa',
  'gdpr',
  'soc_2',
  'nis2_article_20',
  'dora_article_5',
] as const;

export type RegulatoryFramework = (typeof REGULATORY_FRAMEWORKS)[number];

export const REGULATORY_FRAMEWORK_LABELS: Record<RegulatoryFramework, string> = {
  nist_800_50: 'NIST 800-50',
  iso_27001: 'ISO 27001',
  pci_dss: 'PCI-DSS',
  hipaa: 'HIPAA',
  gdpr: 'GDPR',
  soc_2: 'SOC 2',
  nis2_article_20: 'NIS2 Article 20',
  dora_article_5: 'DORA Article 5',
};

export const REGULATORY_FRAMEWORK_DESCRIPTIONS: Record<RegulatoryFramework, string> = {
  nist_800_50:
    'NIST Special Publication 800-50: Building an Information Technology Security Awareness and Training Program',
  iso_27001: 'ISO/IEC 27001: Information Security Management Systems',
  pci_dss: 'PCI DSS: Payment Card Industry Data Security Standard',
  hipaa: 'HIPAA: Health Insurance Portability and Accountability Act',
  gdpr: 'GDPR: General Data Protection Regulation',
  soc_2: 'SOC 2: Service Organization Control 2',
  nis2_article_20: 'NIS2 Article 20: Cybersecurity risk-management measures',
  dora_article_5: 'DORA Article 5: ICT risk management framework',
};

export const REGULATORY_FRAMEWORK_CERTIFICATE_TEXT: Record<RegulatoryFramework, string> = {
  nist_800_50: 'Completes phishing awareness training required by NIST 800-50',
  iso_27001: 'Completes security awareness training required by ISO 27001',
  pci_dss: 'Completes security awareness training required by PCI-DSS',
  hipaa: 'Completes HIPAA security awareness training required by HIPAA Privacy Rule',
  gdpr: 'Completes data protection training required by GDPR',
  soc_2: 'Completes security awareness training required by SOC 2',
  nis2_article_20: 'Completes cybersecurity training required by NIS2 Article 20',
  dora_article_5: 'Completes ICT security awareness training required by DORA Article 5',
};

export const REGULATORY_FRAMEWORK_DEFAULT_VALIDITY_YEARS: Record<RegulatoryFramework, number> = {
  nist_800_50: 1,
  iso_27001: 1,
  pci_dss: 1,
  hipaa: 1,
  gdpr: 1,
  soc_2: 1,
  nis2_article_20: 1,
  dora_article_5: 1,
};

export function isRegulatoryFramework(value: unknown): value is RegulatoryFramework {
  return REGULATORY_FRAMEWORKS.includes(value as RegulatoryFramework);
}

export function getFrameworkLabel(framework: RegulatoryFramework): string {
  return REGULATORY_FRAMEWORK_LABELS[framework];
}

export function getFrameworkDescription(framework: RegulatoryFramework): string {
  return REGULATORY_FRAMEWORK_DESCRIPTIONS[framework];
}

export function getFrameworkCertificateText(framework: RegulatoryFramework): string {
  return REGULATORY_FRAMEWORK_CERTIFICATE_TEXT[framework];
}

export function getFrameworkValidityYears(framework: RegulatoryFramework): number {
  return REGULATORY_FRAMEWORK_DEFAULT_VALIDITY_YEARS[framework];
}
