import type { IndicatorType, IndicatorLocation } from './email-instance.js';

export interface IndicatorCatalogEntry {
  type: IndicatorType;
  name: string;
  description: string;
  location: IndicatorLocation;
  baseWeight: number;
  difficultyWeights: Record<number, number>;
}

export const INDICATOR_CATALOG: IndicatorCatalogEntry[] = [
  {
    type: 'domain_mismatch',
    name: 'Domain Mismatch',
    description: 'Sender domain does not match the claimed organization',
    location: 'sender',
    baseWeight: 25,
    difficultyWeights: { 1: 25, 2: 20, 3: 15, 4: 10, 5: 5 },
  },
  {
    type: 'sender_display_mismatch',
    name: 'Display Name Mismatch',
    description: 'Display name does not match the email address',
    location: 'sender',
    baseWeight: 20,
    difficultyWeights: { 1: 20, 2: 18, 3: 15, 4: 10, 5: 5 },
  },
  {
    type: 'suspicious_link',
    name: 'Suspicious Link',
    description: 'Link appears to lead to a malicious or unusual destination',
    location: 'link',
    baseWeight: 30,
    difficultyWeights: { 1: 30, 2: 25, 3: 20, 4: 15, 5: 10 },
  },
  {
    type: 'url_mismatch',
    name: 'URL Mismatch',
    description: 'Displayed URL differs from the actual destination',
    location: 'link',
    baseWeight: 35,
    difficultyWeights: { 1: 35, 2: 30, 3: 25, 4: 20, 5: 15 },
  },
  {
    type: 'urgency_cue',
    name: 'Urgency Cue',
    description: 'Message uses artificial urgency to pressure quick action',
    location: 'body',
    baseWeight: 15,
    difficultyWeights: { 1: 15, 2: 12, 3: 10, 4: 8, 5: 5 },
  },
  {
    type: 'authority_claim',
    name: 'False Authority Claim',
    description: 'Message falsely claims to represent an authoritative entity',
    location: 'body',
    baseWeight: 20,
    difficultyWeights: { 1: 20, 2: 18, 3: 15, 4: 12, 5: 8 },
  },
  {
    type: 'grammar_anomaly',
    name: 'Grammar Anomaly',
    description: 'Unusual grammar or spelling errors present',
    location: 'body',
    baseWeight: 10,
    difficultyWeights: { 1: 10, 2: 8, 3: 6, 4: 4, 5: 2 },
  },
  {
    type: 'tone_mismatch',
    name: 'Tone Mismatch',
    description: 'Tone or language inconsistent with claimed sender',
    location: 'body',
    baseWeight: 15,
    difficultyWeights: { 1: 15, 2: 12, 3: 10, 4: 8, 5: 5 },
  },
  {
    type: 'attachment_suspicious',
    name: 'Suspicious Attachment',
    description: 'Attachment type or name appears suspicious',
    location: 'attachment',
    baseWeight: 25,
    difficultyWeights: { 1: 25, 2: 22, 3: 18, 4: 14, 5: 10 },
  },
  {
    type: 'attachment_mismatch',
    name: 'Attachment Mismatch',
    description: 'Attachment metadata does not match its content',
    location: 'attachment',
    baseWeight: 30,
    difficultyWeights: { 1: 30, 2: 25, 3: 20, 4: 15, 5: 10 },
  },
  {
    type: 'date_inconsistency',
    name: 'Date Inconsistency',
    description: 'Date or timestamp inconsistencies present',
    location: 'header',
    baseWeight: 15,
    difficultyWeights: { 1: 15, 2: 12, 3: 10, 4: 8, 5: 5 },
  },
  {
    type: 'signature_missing',
    name: 'Missing Signature',
    description: 'Expected signature or contact information missing',
    location: 'body',
    baseWeight: 10,
    difficultyWeights: { 1: 10, 2: 8, 3: 6, 4: 4, 5: 2 },
  },
  {
    type: 'organization_mismatch',
    name: 'Organization Mismatch',
    description: 'Organization details inconsistent across message',
    location: 'sender',
    baseWeight: 20,
    difficultyWeights: { 1: 20, 2: 18, 3: 15, 4: 12, 5: 8 },
  },
  {
    type: 'request_anomaly',
    name: 'Request Anomaly',
    description: 'Access request contains unusual or suspicious elements',
    location: 'body',
    baseWeight: 20,
    difficultyWeights: { 1: 20, 2: 18, 3: 15, 4: 12, 5: 8 },
  },
];

export const getIndicatorWeight = (indicatorType: IndicatorType, difficulty: number): number => {
  const entry = INDICATOR_CATALOG.find((i) => i.type === indicatorType);
  if (!entry) {
    return 0;
  }
  return entry.difficultyWeights[difficulty] ?? entry.baseWeight;
};

export const getIndicatorByType = (type: IndicatorType): IndicatorCatalogEntry | undefined => {
  return INDICATOR_CATALOG.find((i) => i.type === type);
};

export const getIndicatorsByLocation = (location: IndicatorLocation): IndicatorCatalogEntry[] => {
  return INDICATOR_CATALOG.filter((i) => i.location === location);
};

export const calculateEmailThreatScore = (
  indicators: Array<{ type: IndicatorType; difficulty: number }>,
): number => {
  return indicators.reduce((total, indicator) => {
    return total + getIndicatorWeight(indicator.type, indicator.difficulty);
  }, 0);
};
