export {
  DEFAULT_ONBOARDING_STATE,
  STEP_ORDER,
  getNextStep,
  canProceedToStep,
  OnboardingError,
  getOnboardingStatus,
  startOnboarding,
  completeOnboarding,
  resetOnboarding,
  type OnboardingStatus,
  type StartOnboardingResult,
  type CompleteOnboardingResult,
  type OnboardingStep,
} from './onboarding-coordinator.service.js';

export { saveOrgProfile, type OrgProfileResult } from './onboarding-profile.service.js';

export {
  saveIdpConfig,
  testIdpConnection,
  type IdpConfigResult,
  type IdpTestConnectionResult,
} from './onboarding-idp.service.js';

export { generateScimToken, type ScimTokenResult } from './onboarding-scim.service.js';

export {
  saveComplianceFrameworks,
  type ComplianceResult,
} from './onboarding-compliance.service.js';

export type {
  OnboardingState,
  OrgProfileData,
  IdpConfigData,
  RegulatoryRegion,
  ComplianceCoordinatorContact,
} from '../../shared/database/schema/index.js';
