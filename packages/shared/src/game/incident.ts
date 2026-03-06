import type { AttackVector } from './threat-catalog.js';

export const INCIDENT_STATUSES = [
  'open',
  'investigating',
  'contained',
  'eradicated',
  'recovered',
  'closed',
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_CLASSIFICATIONS = [
  'phishing',
  'supply_chain',
  'insider',
  'infrastructure',
  'apt',
  'zero_day',
  'credential',
  'ddos',
  'breach',
] as const;

export type IncidentClassification = (typeof INCIDENT_CLASSIFICATIONS)[number];

export const DETECTION_SOURCES = [
  'email_analysis',
  'ids_ips',
  'siem',
  'edr',
  'waf',
  'threat_intel',
  'honeypot',
  'ai_anomaly',
  'manual',
] as const;

export type DetectionSource = (typeof DETECTION_SOURCES)[number];

export const RESPONSE_ACTIONS = [
  'deny_email',
  'add_sender_blacklist',
  'report_threat_intel',
  'flag_investigation',
  'revoke_access',
  'quarantine_data',
  'forensic_scan',
  'notify_affected',
  'isolate_segment',
  'integrity_scan',
  'deploy_monitoring',
  'restrict_readonly',
  'deploy_honeytokens',
  'behavioral_monitoring',
  'revoke_blacklist',
  'activate_mitigation',
  'rate_limiting',
  'reallocate_bandwidth',
  'sacrifice_low_priority',
  'enable_lockout',
  'deploy_mfa',
  'block_ip_ranges',
  'increase_monitoring',
  'correlate_events',
  'brief_morpheus',
  'comprehensive_containment',
  'prepare_followon',
  'patch_tool',
  'compensating_controls',
  'manual_monitor',
  'accept_risk',
] as const;

export type ResponseAction = (typeof RESPONSE_ACTIONS)[number];

export const RESPONSE_ACTION_EFFECTS: Record<
  ResponseAction,
  {
    phase: 'containment' | 'eradication' | 'recovery';
    severityModifier: number;
    trustModifier: number;
    creditsModifier: number;
  }
> = {
  deny_email: {
    phase: 'containment',
    severityModifier: -0.3,
    trustModifier: 0,
    creditsModifier: 0,
  },
  add_sender_blacklist: {
    phase: 'containment',
    severityModifier: -0.1,
    trustModifier: 0,
    creditsModifier: 0,
  },
  report_threat_intel: {
    phase: 'containment',
    severityModifier: -0.15,
    trustModifier: 0.05,
    creditsModifier: 0,
  },
  flag_investigation: {
    phase: 'containment',
    severityModifier: -0.1,
    trustModifier: 0,
    creditsModifier: 0,
  },
  revoke_access: {
    phase: 'containment',
    severityModifier: -0.4,
    trustModifier: 0,
    creditsModifier: -10,
  },
  quarantine_data: {
    phase: 'containment',
    severityModifier: -0.3,
    trustModifier: 0,
    creditsModifier: -20,
  },
  forensic_scan: {
    phase: 'containment',
    severityModifier: -0.2,
    trustModifier: 0,
    creditsModifier: -15,
  },
  notify_affected: {
    phase: 'containment',
    severityModifier: -0.1,
    trustModifier: 0.1,
    creditsModifier: -5,
  },
  isolate_segment: {
    phase: 'containment',
    severityModifier: -0.35,
    trustModifier: 0,
    creditsModifier: -25,
  },
  integrity_scan: {
    phase: 'eradication',
    severityModifier: -0.25,
    trustModifier: 0,
    creditsModifier: -15,
  },
  deploy_monitoring: {
    phase: 'eradication',
    severityModifier: -0.15,
    trustModifier: 0,
    creditsModifier: -10,
  },
  restrict_readonly: {
    phase: 'containment',
    severityModifier: -0.25,
    trustModifier: 0,
    creditsModifier: -5,
  },
  deploy_honeytokens: {
    phase: 'containment',
    severityModifier: -0.2,
    trustModifier: 0.05,
    creditsModifier: -10,
  },
  behavioral_monitoring: {
    phase: 'containment',
    severityModifier: -0.15,
    trustModifier: 0,
    creditsModifier: -5,
  },
  revoke_blacklist: {
    phase: 'containment',
    severityModifier: -0.3,
    trustModifier: 0,
    creditsModifier: 0,
  },
  activate_mitigation: {
    phase: 'containment',
    severityModifier: -0.4,
    trustModifier: 0,
    creditsModifier: -20,
  },
  rate_limiting: {
    phase: 'containment',
    severityModifier: -0.25,
    trustModifier: 0,
    creditsModifier: -10,
  },
  reallocate_bandwidth: {
    phase: 'containment',
    severityModifier: -0.2,
    trustModifier: 0,
    creditsModifier: -15,
  },
  sacrifice_low_priority: {
    phase: 'containment',
    severityModifier: -0.3,
    trustModifier: -0.1,
    creditsModifier: -5,
  },
  enable_lockout: {
    phase: 'containment',
    severityModifier: -0.35,
    trustModifier: 0,
    creditsModifier: -5,
  },
  deploy_mfa: {
    phase: 'containment',
    severityModifier: -0.2,
    trustModifier: 0.05,
    creditsModifier: -15,
  },
  block_ip_ranges: {
    phase: 'containment',
    severityModifier: -0.3,
    trustModifier: 0,
    creditsModifier: -10,
  },
  increase_monitoring: {
    phase: 'containment',
    severityModifier: -0.1,
    trustModifier: 0,
    creditsModifier: -5,
  },
  correlate_events: {
    phase: 'containment',
    severityModifier: -0.2,
    trustModifier: 0.1,
    creditsModifier: 0,
  },
  brief_morpheus: {
    phase: 'containment',
    severityModifier: -0.15,
    trustModifier: 0.15,
    creditsModifier: 0,
  },
  comprehensive_containment: {
    phase: 'containment',
    severityModifier: -0.5,
    trustModifier: 0,
    creditsModifier: -30,
  },
  prepare_followon: {
    phase: 'containment',
    severityModifier: -0.1,
    trustModifier: 0.05,
    creditsModifier: 0,
  },
  patch_tool: {
    phase: 'eradication',
    severityModifier: -0.35,
    trustModifier: 0,
    creditsModifier: -25,
  },
  compensating_controls: {
    phase: 'eradication',
    severityModifier: -0.2,
    trustModifier: 0,
    creditsModifier: -15,
  },
  manual_monitor: {
    phase: 'recovery',
    severityModifier: -0.1,
    trustModifier: 0,
    creditsModifier: -5,
  },
  accept_risk: {
    phase: 'recovery',
    severityModifier: 0.1,
    trustModifier: -0.1,
    creditsModifier: 0,
  },
};

export const INCIDENT_TYPE_TO_ATTACK_VECTOR: Record<IncidentClassification, AttackVector[]> = {
  phishing: ['email_phishing', 'spear_phishing', 'whaling', 'bec'],
  supply_chain: ['supply_chain'],
  insider: ['insider_threat'],
  infrastructure: ['brute_force', 'ddos', 'coordinated_attack'],
  apt: ['apt_campaign'],
  zero_day: ['zero_day'],
  credential: ['credential_harvesting'],
  ddos: ['ddos'],
  breach: ['supply_chain', 'insider_threat', 'apt_campaign'],
};

export const ATTACK_VECTOR_TO_INCIDENT_CLASSIFICATION: Record<
  AttackVector,
  IncidentClassification
> = {
  email_phishing: 'phishing',
  spear_phishing: 'phishing',
  whaling: 'phishing',
  bec: 'phishing',
  supply_chain: 'supply_chain',
  insider_threat: 'insider',
  brute_force: 'infrastructure',
  ddos: 'ddos',
  apt_campaign: 'apt',
  coordinated_attack: 'infrastructure',
  zero_day: 'zero_day',
  credential_harvesting: 'credential',
};

export const INCIDENT_TYPE_TO_DETECTION_SOURCES: Record<IncidentClassification, DetectionSource[]> =
  {
    phishing: ['email_analysis', 'siem', 'manual'],
    supply_chain: ['siem', 'edr', 'threat_intel'],
    insider: ['edr', 'siem', 'ai_anomaly', 'honeypot'],
    infrastructure: ['ids_ips', 'waf', 'siem'],
    apt: ['siem', 'threat_intel', 'ai_anomaly'],
    zero_day: ['threat_intel', 'siem', 'edr'],
    credential: ['ids_ips', 'edr', 'waf'],
    ddos: ['ids_ips', 'waf', 'siem'],
    breach: ['siem', 'edr', 'ids_ips'],
  };

export interface IncidentTimelineEntry {
  timestamp: string;
  day: number;
  action: string;
  description: string;
  actor: 'system' | 'player';
}

export interface IncidentResponseAction {
  actionId: string;
  actionType: ResponseAction;
  timestamp: string;
  day: number;
  effectiveness: number;
  notes?: string | undefined;
}

export interface IncidentEvidence {
  indicators: string[];
  logs: string[];
  screenshots?: string[];
  networkPackets?: string[];
}

export interface Incident {
  incidentId: string;
  sessionId: string;
  attackId?: string | null;
  timestamp: string | Date;
  day: number;
  detectionSource: DetectionSource;
  classification: IncidentClassification;
  severity: 1 | 2 | 3 | 4;
  affectedAssets: string[];
  evidence: IncidentEvidence;
  status: IncidentStatus;
  timeline: IncidentTimelineEntry[];
  responseActions: IncidentResponseAction[];
  outcome?: string;
  rootCause?: string;
  lessonsLearned?: string;
  resolvedAt?: string | Date;
  resolutionDays?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IncidentConsequence {
  trustDelta: number;
  creditsDelta: number;
  intelDelta: number;
  clientImpact: number;
  severityAfterResponse: number;
}

export interface PostIncidentReview {
  incidentId: string;
  timeline: IncidentTimelineEntry[];
  detectionAnalysis: {
    source: DetectionSource;
    timeToDetect: number;
    detectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  responseEvaluation: {
    actionsTaken: number;
    effectiveness: number;
    appropriateForType: boolean;
    suggestions: string[];
  };
  rootCause: string;
  recommendations: string[];
  competenceScore: number;
}

export function mapAttackVectorToIncidentClassification(
  vector: AttackVector,
): IncidentClassification {
  return ATTACK_VECTOR_TO_INCIDENT_CLASSIFICATION[vector];
}

export function getAvailableResponseActions(
  classification: IncidentClassification,
): ResponseAction[] {
  const actionsByClassification: Record<IncidentClassification, ResponseAction[]> = {
    phishing: [
      'deny_email',
      'add_sender_blacklist',
      'report_threat_intel',
      'flag_investigation',
      'revoke_access',
      'quarantine_data',
      'forensic_scan',
      'notify_affected',
    ],
    supply_chain: [
      'isolate_segment',
      'integrity_scan',
      'revoke_access',
      'deploy_monitoring',
      'quarantine_data',
      'forensic_scan',
    ],
    insider: [
      'restrict_readonly',
      'deploy_honeytokens',
      'behavioral_monitoring',
      'revoke_blacklist',
      'revoke_access',
      'forensic_scan',
    ],
    infrastructure: [
      'activate_mitigation',
      'rate_limiting',
      'reallocate_bandwidth',
      'sacrifice_low_priority',
      'enable_lockout',
      'deploy_mfa',
      'block_ip_ranges',
      'increase_monitoring',
    ],
    apt: [
      'correlate_events',
      'brief_morpheus',
      'comprehensive_containment',
      'prepare_followon',
      'isolate_segment',
      'deploy_monitoring',
    ],
    zero_day: [
      'patch_tool',
      'compensating_controls',
      'manual_monitor',
      'accept_risk',
      'increase_monitoring',
    ],
    credential: [
      'enable_lockout',
      'deploy_mfa',
      'revoke_access',
      'block_ip_ranges',
      'increase_monitoring',
      'forensic_scan',
    ],
    ddos: [
      'activate_mitigation',
      'rate_limiting',
      'reallocate_bandwidth',
      'sacrifice_low_priority',
      'increase_monitoring',
    ],
    breach: [
      'isolate_segment',
      'comprehensive_containment',
      'revoke_access',
      'quarantine_data',
      'forensic_scan',
      'notify_affected',
    ],
  };
  return actionsByClassification[classification];
}

export function calculateIncidentSeverity(
  attackDifficulty: number,
  detectionProbability: number,
  securityToolCoverage: number,
): 1 | 2 | 3 | 4 {
  const difficultyScore = attackDifficulty / 5;
  const detectionScore = 1 - detectionProbability;
  const coverageScore = 1 - securityToolCoverage;

  const score = difficultyScore + detectionScore + coverageScore;

  if (score >= 2.21) return 4;
  if (score >= 1.61) return 3;
  if (score >= 0.5) return 2;
  return 1;
}

export function calculateConsequences(
  initialSeverity: 1 | 2 | 3 | 4,
  responseActions: IncidentResponseAction[],
  _classification: IncidentClassification,
): IncidentConsequence {
  let severityAfterResponse: 1 | 2 | 3 | 4 = initialSeverity;
  let trustDelta = 0;
  let creditsDelta = 0;

  const severityWeights: Record<1 | 2 | 3 | 4, number> = { 1: 10, 2: 25, 3: 50, 4: 100 };
  const baseCredits = severityWeights[initialSeverity];

  creditsDelta = -baseCredits;

  for (const response of responseActions) {
    const effect = RESPONSE_ACTION_EFFECTS[response.actionType];
    if (!effect) continue;

    const adjustedSeverity = severityAfterResponse + Math.round(effect.severityModifier * 4);
    severityAfterResponse = Math.max(1, Math.min(4, adjustedSeverity)) as 1 | 2 | 3 | 4;
    trustDelta += effect.trustModifier * response.effectiveness;
    creditsDelta += effect.creditsModifier * response.effectiveness;
  }

  trustDelta = Math.max(-0.5, Math.min(0.2, trustDelta));

  const clientImpact = severityAfterResponse > 2 ? Math.random() * 0.2 : 0;

  return {
    trustDelta,
    creditsDelta,
    intelDelta: Math.floor(responseActions.length * 0.5),
    clientImpact,
    severityAfterResponse,
  };
}

export function generatePostIncidentReview(incident: Incident): PostIncidentReview {
  const firstEntry = incident.timeline[0];
  const timeToDetect = firstEntry
    ? Math.floor(
        (new Date(firstEntry.timestamp).getTime() - new Date(incident.timestamp).getTime()) /
          (1000 * 60 * 60),
      )
    : 0;

  const detectionQuality: PostIncidentReview['detectionAnalysis']['detectionQuality'] =
    timeToDetect <= 1
      ? 'excellent'
      : timeToDetect <= 4
        ? 'good'
        : timeToDetect <= 12
          ? 'fair'
          : 'poor';

  const effectiveness =
    incident.responseActions.reduce((sum, a) => sum + a.effectiveness, 0) /
    Math.max(1, incident.responseActions.length);

  const appropriateForType = incident.responseActions.length > 0;

  const suggestions: string[] = [];
  if (effectiveness < 0.5) {
    suggestions.push('Consider faster response times');
  }
  if (incident.severity >= 3 && incident.responseActions.length < 2) {
    suggestions.push('More comprehensive response actions needed');
  }

  const competenceScore = Math.min(
    100,
    Math.max(
      0,
      100 -
        incident.severity * 15 +
        effectiveness * 20 +
        (detectionQuality === 'excellent' ? 20 : 0),
    ),
  );

  return {
    incidentId: incident.incidentId,
    timeline: incident.timeline,
    detectionAnalysis: {
      source: incident.detectionSource,
      timeToDetect,
      detectionQuality,
    },
    responseEvaluation: {
      actionsTaken: incident.responseActions.length,
      effectiveness,
      appropriateForType,
      suggestions,
    },
    rootCause: incident.rootCause || 'Analysis pending',
    recommendations: incident.lessonsLearned
      ? [incident.lessonsLearned]
      : ['Continue monitoring for similar incidents'],
    competenceScore,
  };
}
