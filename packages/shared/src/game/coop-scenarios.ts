export const COOP_SCENARIO_IDS = [
  'cascade_failure',
  'bandwidth_siege',
  'the_insider',
  'data_exodus',
] as const;

export type CoopScenarioId = (typeof COOP_SCENARIO_IDS)[number];

export const SCENARIO_THREAT_DOMAINS = [
  'supply_chain',
  'vendor_impersonation',
  'availability',
  'resource_exhaustion',
  'insider_threat',
  'behavioral_anomaly',
  'data_exfiltration',
  'incident_response',
] as const;

export type ScenarioThreatDomain = (typeof SCENARIO_THREAT_DOMAINS)[number];

export const EMAIL_ROUTING_MODES = ['round_robin', 'threat_type', 'random', 'assigned'] as const;
export type EmailRoutingMode = (typeof EMAIL_ROUTING_MODES)[number];
