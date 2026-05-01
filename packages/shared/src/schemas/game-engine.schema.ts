import { z } from 'zod';

import { INCIDENT_STATUSES } from '../game/incident.js';
import {
  SESSION_MACRO_STATES,
  DAY_PHASES,
  GAME_ACTIONS,
  DECISION_TYPES,
  GAME_THREAT_TIERS,
  FACILITY_TIER_LEVELS,
} from '../types/game-engine.js';

import { COOP_ROLES } from './coop-session.schema.js';

import type { EmailInstance, VerificationPacket } from '../game/email-instance.js';
import type { GeneratedAttack } from '../game/threat-catalog.js';
import type { BreachState } from '../game/breach.js';
import type { CoopContext } from '../game/coop-scaling.js';
import type { FacilityState } from '../types/game-state.js';
import type { CoopRole } from './coop-session.schema.js';

export const sessionMacroStateSchema = z.enum(
  Object.values(SESSION_MACRO_STATES) as [string, ...string[]],
);

export const dayPhaseSchema = z.enum(Object.values(DAY_PHASES) as [string, ...string[]]);

export const gameActionTypeSchema = z.enum(Object.values(GAME_ACTIONS) as [string, ...string[]]);

export const decisionTypeSchema = z.enum(Object.values(DECISION_TYPES) as [string, ...string[]]);

export const gameThreatTierSchema = z.enum(
  Object.values(GAME_THREAT_TIERS) as [string, ...string[]],
);

export const gameFacilityTierSchema = z.enum(
  Object.values(FACILITY_TIER_LEVELS) as [string, ...string[]],
);

export const emailStatusSchema = z.enum([
  'pending',
  'opened',
  'flagged',
  'request_verification',
  'approved',
  'denied',
  'deferred',
]);

export const incidentStatusSchema = z.enum(
  Object.values(INCIDENT_STATUSES) as [string, ...string[]],
);

export const facilityResourceCapacitiesSchema = z.object({
  rackCapacityU: z.number().int(),
  powerCapacityKw: z.number(),
  coolingCapacityTons: z.number(),
  bandwidthCapacityMbps: z.number(),
});

export const facilityResourceUsageSchema = z.object({
  rackUsedU: z.number().int(),
  powerUsedKw: z.number(),
  coolingUsedTons: z.number(),
  bandwidthUsedMbps: z.number(),
});

export const clientLeaseSchema = z.object({
  clientId: z.string().uuid(),
  clientName: z.string(),
  organization: z.string(),
  rackUnitsU: z.number().int(),
  powerKw: z.number(),
  coolingTons: z.number(),
  bandwidthMbps: z.number(),
  dailyRate: z.number(),
  leaseStartDay: z.number().int().min(1),
  leaseEndDay: z.number().int().min(1).nullable(),
  isActive: z.boolean(),
  burstProfile: z.enum(['steady', 'moderate', 'spiky']),
});

export const upgradeStatusSchema = z.enum([
  'available',
  'purchased',
  'installing',
  'completed',
  'maintained',
]);

export const upgradeCategorySchema = z.enum([
  'capacity',
  'efficiency',
  'security',
  'operations',
  'maintenance',
]);

export const upgradeTypeSchema = z.enum([
  'rack',
  'power',
  'cooling',
  'bandwidth',
  'firewall',
  'ids',
  'ips',
  'siem',
  'edr',
  'waf',
  'threat_intel_feed',
  'soar',
  'honeypots',
  'zero_trust_gateway',
  'ai_anomaly_detection',
  'power_efficiency',
  'cooling_efficiency',
  'bandwidth_efficiency',
  'monitoring',
  'maintenance_automation',
  'redundancy',
  'preventive_maintenance',
  'rapid_repair',
  'diagnostics',
]);

export const resourceDeltaSchema = z.object({
  rackCapacity: z.number().optional(),
  powerCapacity: z.number().optional(),
  coolingCapacity: z.number().optional(),
  bandwidthCapacity: z.number().optional(),
  rackUsage: z.number().optional(),
  powerUsage: z.number().optional(),
  coolingUsage: z.number().optional(),
  bandwidthUsage: z.number().optional(),
  efficiencyMultiplier: z.number().optional(),
});

export const securityDeltaSchema = z.object({
  breachProbabilityModifier: z.number().optional(),
  detectionProbabilityModifier: z.number().optional(),
  mitigationBonus: z.number().optional(),
  threatVectorModifiers: z.record(z.number()).optional(),
});

export const facilityUpgradeSchema = z.object({
  upgradeId: z.string().uuid(),
  upgradeType: upgradeTypeSchema,
  category: upgradeCategorySchema,
  tierLevel: z.number().int().min(1),
  status: upgradeStatusSchema,
  purchasedDay: z.number().int().min(1),
  completesDay: z.number().int().min(1).optional(),
  isCompleted: z.boolean(),
  completionDay: z.number().int().min(1).optional(),
  resourceDelta: resourceDeltaSchema,
  securityDelta: securityDeltaSchema.optional(),
  maintenanceDelta: z.number().optional(),
  opExPerDay: z.number(),
  threatSurfaceDelta: z.number(),
  installationOverhead: z.number().optional(),
});

export const facilityStateSchema: z.ZodType<FacilityState> = z.object({
  tier: z.string(),
  capacities: facilityResourceCapacitiesSchema,
  usage: facilityResourceUsageSchema,
  clients: z.array(clientLeaseSchema),
  upgrades: z.array(facilityUpgradeSchema),
  maintenanceDebt: z.number(),
  facilityHealth: z.number(),
  operatingCostPerDay: z.number(),
  securityToolOpExPerDay: z.number(),
  attackSurfaceScore: z.number(),
  lastTickDay: z.number().int().min(1),
});

export const emailSenderSchema = z.object({
  displayName: z.string(),
  emailAddress: z.string(),
  domain: z.string(),
  jobRole: z.string(),
  organization: z.string(),
  relationshipHistory: z.number(),
});

export const embeddedLinkSchema = z.object({
  displayText: z.string(),
  actualUrl: z.string(),
  isSuspicious: z.boolean(),
});

export const emailHeadersSchema = z.object({
  messageId: z.string(),
  returnPath: z.string(),
  received: z.array(z.string()),
  spfResult: z.enum(['pass', 'fail', 'softfail', 'none']),
  dkimResult: z.enum(['pass', 'fail', 'none']),
  dmarcResult: z.enum(['pass', 'fail', 'none']),
  originalDate: z.string(),
  subject: z.string(),
});

export const emailAttachmentSchema = z.object({
  attachmentId: z.string().uuid(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number().int(),
  hash: z.string(),
  isSuspicious: z.boolean(),
});

export const accessRequestSchema = z.object({
  applicantName: z.string(),
  applicantRole: z.string(),
  organization: z.string(),
  requestedAssets: z.array(z.string()),
  requestedServices: z.array(z.string()),
  justification: z.string(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  value: z.number(),
});

export const indicatorTypeSchema = z.enum([
  'domain_mismatch',
  'sender_display_mismatch',
  'suspicious_link',
  'url_mismatch',
  'urgency_cue',
  'authority_claim',
  'grammar_anomaly',
  'tone_mismatch',
  'attachment_suspicious',
  'attachment_mismatch',
  'date_inconsistency',
  'signature_missing',
  'organization_mismatch',
  'request_anomaly',
]);

export const indicatorLocationSchema = z.enum([
  'sender',
  'subject',
  'body',
  'header',
  'attachment',
  'link',
]);

export const emailIndicatorSchema = z.object({
  indicatorId: z.string().uuid(),
  type: indicatorTypeSchema,
  location: indicatorLocationSchema,
  description: z.string(),
  severity: z.number(),
  isVisible: z.boolean(),
});

export const consequenceDetailsSchema = z.object({
  trustImpact: z.number(),
  fundsImpact: z.number(),
  factionImpact: z.number(),
  threatImpact: z.number(),
});

export const groundTruthConsequencesSchema = z.object({
  approved: consequenceDetailsSchema,
  denied: consequenceDetailsSchema,
  flagged: consequenceDetailsSchema,
  deferred: consequenceDetailsSchema,
});

export const emailGroundTruthSchema = z.object({
  isMalicious: z.boolean(),
  correctDecision: decisionTypeSchema,
  riskScore: z.number(),
  explanation: z.string(),
  consequences: groundTruthConsequencesSchema,
});

export const emailDifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const emailIntentSchema = z.enum(['legitimate', 'malicious', 'ambiguous']);

export const emailTechniqueSchema = z.enum([
  'phishing',
  'spear_phishing',
  'bec',
  'credential_harvesting',
  'malware_delivery',
  'pretexting',
  'supply_chain',
  'insider_threat',
]);

export const emailBodySchema = z.object({
  preview: z.string(),
  fullBody: z.string(),
  embeddedLinks: z.array(embeddedLinkSchema),
});

export const emailInstanceSchema: z.ZodType<EmailInstance> = z.object({
  emailId: z.string().uuid(),
  sessionId: z.string().uuid(),
  dayNumber: z.number().int().min(1),
  difficulty: emailDifficultySchema,
  intent: emailIntentSchema,
  technique: emailTechniqueSchema,
  threatTier: gameThreatTierSchema,
  faction: z.string(),
  sender: emailSenderSchema,
  headers: emailHeadersSchema,
  body: emailBodySchema,
  attachments: z.array(emailAttachmentSchema),
  accessRequest: accessRequestSchema,
  indicators: z.array(emailIndicatorSchema),
  groundTruth: emailGroundTruthSchema,
  createdAt: z.string().datetime(),
});

export const verificationDocumentTypeSchema = z.enum([
  'id_document',
  'employee_badge',
  'account_record',
  'registration',
  'transfer_log',
  'approval_chain',
  'threat_assessment',
  'faction_report',
]);

export const validityIndicatorSchema = z.enum(['valid', 'suspicious', 'invalid', 'unknown']);

export const verificationArtifactSchema = z.object({
  artifactId: z.string().uuid(),
  documentType: verificationDocumentTypeSchema,
  title: z.string(),
  description: z.string(),
  issuer: z.string(),
  issuedDate: z.string(),
  validityIndicator: validityIndicatorSchema,
  metadata: z.record(z.unknown()),
});

export const verificationPacketSchema: z.ZodType<VerificationPacket> = z.object({
  packetId: z.string().uuid(),
  emailId: z.string().uuid(),
  sessionId: z.string().uuid(),
  createdAt: z.string().datetime(),
  artifacts: z.array(verificationArtifactSchema),
  hasIntelligenceBrief: z.boolean(),
});

export const attackVectorSchema = z.enum([
  'email_phishing',
  'spear_phishing',
  'credential_harvesting',
  'supply_chain',
  'insider_threat',
  'brute_force',
  'ddos',
  'apt_campaign',
  'coordinated_attack',
  'zero_day',
  'whaling',
  'bec',
]);

export const generatedAttackSchema: z.ZodType<GeneratedAttack> = z.object({
  attackId: z.string().uuid(),
  vector: attackVectorSchema,
  difficulty: z.number(),
  faction: z.string(),
  timestamp: z.string().datetime(),
  isCampaignPart: z.boolean(),
  campaignId: z.string().uuid().optional(),
});

export const breachSeveritySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const breachStateSchema: z.ZodType<BreachState> = z.object({
  hasActiveBreach: z.boolean(),
  currentSeverity: breachSeveritySchema.nullable(),
  ransomAmount: z.number().nullable(),
  ransomDeadline: z.number().nullable(),
  recoveryDaysRemaining: z.number().nullable(),
  recoveryStartDay: z.number().nullable(),
  totalLifetimeEarningsAtBreach: z.number().nullable(),
  lastBreachDay: z.number().nullable(),
  postBreachEffectsActive: z.boolean(),
  revenueDepressionDaysRemaining: z.number().nullable(),
  increasedScrutinyDaysRemaining: z.number().nullable(),
  reputationImpactDaysRemaining: z.number().nullable(),
  toolsRequireReverification: z.boolean(),
  intelligenceRevealed: z.array(z.string()),
});

export const partyDifficultyTierSchema = z.enum(['training', 'standard', 'hardened', 'nightmare']);

export const coopThreatScalingSchema = z.object({
  emailVolumeMultiplier: z.number(),
  threatProbabilityBonus: z.number(),
  incidentProbabilityBonus: z.number(),
  breachSeverityBonus: z.number(),
  timePressureMultiplier: z.number(),
});

export const coopRoleSchema: z.ZodType<CoopRole> = z.enum(COOP_ROLES);

export const coopContextSchema: z.ZodType<CoopContext> = z.object({
  partySize: z.number().int().min(1),
  coopRole: coopRoleSchema.optional(),
  difficultyTier: partyDifficultyTierSchema,
  threatScaling: coopThreatScalingSchema,
});

export const inboxEmailSchema = z.object({
  emailId: z.string().uuid(),
  status: emailStatusSchema,
  indicators: z.array(z.string()),
  verificationRequested: z.boolean(),
  timeSpentMs: z.number().int().min(0),
  openedAt: z.string().datetime().optional(),
});

export const incidentSchema = z.object({
  incidentId: z.string().uuid(),
  status: incidentStatusSchema,
  severity: z.number().int().min(1).max(10),
  type: z.string(),
  createdDay: z.number().int().min(1),
  resolvedDay: z.number().int().min(1).optional(),
  responseActions: z.array(z.string()),
});

export const narrativeStateSchema = z.object({
  currentChapter: z.number().int().min(1),
  activeTriggers: z.array(z.string()),
  completedEvents: z.array(z.string()),
});

export const analyticsStateSchema = z.object({
  totalEmailsProcessed: z.number().int().min(0),
  totalDecisions: z.number().int().min(0),
  approvals: z.number().int().min(0),
  denials: z.number().int().min(0),
  flags: z.number().int().min(0),
  verificationsRequested: z.number().int().min(0),
  incidentsTriggered: z.number().int().min(0),
  breaches: z.number().int().min(0),
});

export const gameStateSchema = z
  .object({
    sessionId: z.string().uuid(),
    userId: z.string().uuid(),
    tenantId: z.string().uuid(),
    seed: z.number().int(),
    currentDay: z.number().int().min(1),
    currentMacroState: sessionMacroStateSchema,
    currentPhase: dayPhaseSchema,
    funds: z.number().int().min(0),
    trustScore: z.number().int().min(0),
    intelFragments: z.number().int().min(0),
    playerLevel: z.number().int().min(1).max(50),
    playerXP: z.number().int().min(0),
    threatTier: gameThreatTierSchema,
    facilityTier: gameFacilityTierSchema,
    facility: facilityStateSchema,
    inbox: z.array(inboxEmailSchema),
    emailInstances: z.record(z.string().uuid(), emailInstanceSchema),
    verificationPackets: z.record(z.string().uuid(), verificationPacketSchema),
    incidents: z.array(incidentSchema),
    threats: z.array(generatedAttackSchema),
    breachState: breachStateSchema,
    narrativeState: narrativeStateSchema,
    factionRelations: z.record(z.string(), z.number().int()),
    blacklist: z.array(z.string()),
    whitelist: z.array(z.string()),
    analyticsState: analyticsStateSchema,
    sequenceNumber: z.number().int().min(0),
    partyContext: coopContextSchema.optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type GameStateSchema = z.infer<typeof gameStateSchema>;

export const gameActionSchema = z
  .object({
    actionId: z.string().uuid(),
    actionType: gameActionTypeSchema,
    sessionId: z.string().uuid(),
    userId: z.string().uuid(),
    tenantId: z.string().uuid(),
    timestamp: z.string().datetime(),
    payload: z.record(z.unknown()),
    sequenceNumber: z.number().int().min(0),
  })
  .strict();

export type GameActionSchema = z.infer<typeof gameActionSchema>;
