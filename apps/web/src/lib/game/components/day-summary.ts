export interface DaySummaryData {
  dayNumber: number;
  summaryStatistics: {
    emailsProcessed: number;
    decisionsMade: {
      approved: number;
      denied: number;
      flagged: number;
      verified: number;
    };
    accuracyRate: number;
    trustScoreChange: number;
    fundsChange: number;
    resourcesConsumed: {
      rackUnits: number;
      powerKw: number;
      coolingTons: number;
      bandwidthMbps: number;
    };
    threatsEncountered: number;
  };
  netChanges: {
    trustScore: { before: number; after: number };
    funds: { before: number; after: number };
    intelFragments: { before: number; after: number };
    resources: {
      rackUnits: { before: number; after: number };
      powerKw: { before: number; after: number };
      coolingTons: { before: number; after: number };
      bandwidthMbps: { before: number; after: number };
    };
  };
  narrativeNotes: {
    keyEvents: string[];
    notableDecisions: string[];
    coachingTips: string[];
    factionUpdates: { faction: string; change: string }[];
  };
  incidentSummary: {
    detected: number;
    resolved: number;
    severityBreakdown: { critical: number; high: number; medium: number; low: number };
  };
  verificationStats: {
    requestsMade: number;
    discrepanciesFound: number;
    accuracy: number;
  };
}
