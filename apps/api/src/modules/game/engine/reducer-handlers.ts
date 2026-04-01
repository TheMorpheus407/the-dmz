export type { DomainEvent } from './handlers/handler-utils.js';
export {
  aggregateSecurityDeltas,
  applyUpgradeEffects,
  processInstallations,
  recalculateSecurityOpEx,
  recalculateAttackSurface,
  validateUpgradePurchase,
  installUpgrade,
} from './handlers/handler-utils.js';
export { UPGRADE_CATALOG } from './handlers/upgrade-catalog.js';

export {
  handleAckDayStart,
  handleLoadInbox,
  handleOpenEmail,
  handleMarkIndicator,
  handleRequestVerification,
  handleSubmitDecision,
} from './handlers/email-handlers.js';

export { handleProcessThreats } from './handlers/threat-handlers.js';

export {
  handleResolveIncident,
  handleTriggerBreach,
  handlePayRansom,
  handleRefuseRansom,
  handleAdvanceRecovery,
} from './handlers/breach-handlers.js';

export {
  handlePurchaseUpgrade,
  handleAdjustResource,
  handleOnboardClient,
  handleEvictClient,
  handleProcessFacilityTick,
  handleUpgradeFacilityTier,
  handlePurchaseFacilityUpgrade,
} from './handlers/facility-handlers.js';

export {
  handlePauseSession,
  handleResumeSession,
  handleAbandonSession,
  handleAdvanceDay,
} from './handlers/session-handlers.js';

export { handleFlagDiscrepancy } from './handlers/verification-handlers.js';
