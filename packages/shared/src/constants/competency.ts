export const COMPETENCY_DOMAINS = [
  'phishing_detection',
  'password_security',
  'data_handling',
  'social_engineering_resistance',
  'incident_response',
  'physical_security',
  'compliance_awareness',
] as const;

export type CompetencyDomain = (typeof COMPETENCY_DOMAINS)[number];

export const COMPETENCY_DOMAIN_LABELS: Record<CompetencyDomain, string> = {
  phishing_detection: 'Phishing Detection',
  password_security: 'Password Security',
  data_handling: 'Data Handling',
  social_engineering_resistance: 'Social Engineering Resistance',
  incident_response: 'Incident Response',
  physical_security: 'Physical Security',
  compliance_awareness: 'Compliance Awareness',
};

export const COMPETENCY_DOMAIN_DESCRIPTIONS: Record<CompetencyDomain, string> = {
  phishing_detection:
    'Ability to identify phishing attempts, malicious links, suspicious attachments, and social engineering tactics in electronic communications.',
  password_security:
    'Understanding of strong password practices, credential handling, and multi-factor authentication awareness.',
  data_handling:
    'Knowledge of data classification, retention policies, least privilege principles, and secure data disposal.',
  social_engineering_resistance:
    'Ability to recognize and resist pretexting, authority pressure, emotional manipulation, and other social engineering attacks.',
  incident_response:
    'Skills in containment decisions, recovery sequencing, reporting timeliness, and proper incident handling procedures.',
  physical_security:
    'Awareness of physical access controls, badge validation, facility entry protocols, and physical security best practices.',
  compliance_awareness:
    'Understanding of regulatory frameworks, policy acknowledgements, compliance requirements, and security awareness.',
};

export const COMPETENCY_SCORE_RANGES = {
  FOUNDATIONAL: { min: 0, max: 39, label: 'Foundational' },
  OPERATIONAL: { min: 40, max: 69, label: 'Operational' },
  CONSISTENT: { min: 70, max: 89, label: 'Consistent' },
  MASTERY: { min: 90, max: 100, label: 'Mastery' },
} as const;

export type CompetencyScoreRange =
  (typeof COMPETENCY_SCORE_RANGES)[keyof typeof COMPETENCY_SCORE_RANGES];

export const MECHANIC_TO_DOMAIN_MAPPING: Record<string, CompetencyDomain[]> = {
  email_triage: ['phishing_detection', 'social_engineering_resistance'],
  verification_packet: ['social_engineering_resistance', 'phishing_detection'],
  threat_assessment: ['compliance_awareness', 'incident_response'],
  approve_deny_decision: ['phishing_detection', 'data_handling'],
  incident_log: ['incident_response'],
  data_salvage_contract: ['data_handling', 'compliance_awareness'],
  facility_status_review: ['incident_response'],
};

export function isCompetencyDomain(value: unknown): value is CompetencyDomain {
  return COMPETENCY_DOMAINS.includes(value as CompetencyDomain);
}

export function getCompetencyLabel(domain: CompetencyDomain): string {
  return COMPETENCY_DOMAIN_LABELS[domain];
}

export function getCompetencyDescription(domain: CompetencyDomain): string {
  return COMPETENCY_DOMAIN_DESCRIPTIONS[domain];
}

export function getScoreRange(score: number): CompetencyScoreRange {
  if (score >= COMPETENCY_SCORE_RANGES.MASTERY.min) return COMPETENCY_SCORE_RANGES.MASTERY;
  if (score >= COMPETENCY_SCORE_RANGES.CONSISTENT.min) return COMPETENCY_SCORE_RANGES.CONSISTENT;
  if (score >= COMPETENCY_SCORE_RANGES.OPERATIONAL.min) return COMPETENCY_SCORE_RANGES.OPERATIONAL;
  return COMPETENCY_SCORE_RANGES.FOUNDATIONAL;
}
