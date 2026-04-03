import { eq, sql } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  tenants,
  type OnboardingState,
  type OnboardingStep,
} from '../../shared/database/schema/index.js';
import { createAuditLog } from '../audit/index.js';

export { type OnboardingStep };

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  currentStep: 'not_started',
  completedSteps: [],
  startedAt: null,
  completedAt: null,
  regulatoryRegion: undefined,
  complianceCoordinatorContact: undefined,
};

export const STEP_ORDER: OnboardingStep[] = [
  'org_profile',
  'idp_config',
  'scim_token',
  'compliance',
  'complete',
];

export function getNextStep(currentStep: OnboardingStep): OnboardingStep | null {
  const stepIndex = STEP_ORDER.indexOf(currentStep);
  if (stepIndex === -1) {
    return 'org_profile';
  }
  if (stepIndex >= STEP_ORDER.length - 1) {
    return null;
  }
  const next = STEP_ORDER[stepIndex + 1];
  return next ?? null;
}

export function canProceedToStep(
  onboardingState: OnboardingState,
  targetStep: OnboardingStep,
): boolean {
  if (targetStep === 'org_profile') {
    return (
      onboardingState.currentStep === 'not_started' || onboardingState.currentStep === 'org_profile'
    );
  }
  if (targetStep === 'idp_config') {
    return onboardingState.completedSteps.includes('org_profile');
  }
  if (targetStep === 'scim_token') {
    return onboardingState.completedSteps.includes('idp_config');
  }
  if (targetStep === 'compliance') {
    return onboardingState.completedSteps.includes('scim_token');
  }
  if (targetStep === 'complete') {
    return onboardingState.completedSteps.includes('compliance');
  }
  return false;
}

export class OnboardingError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'OnboardingError';
  }
}

export interface OnboardingStatus {
  tenantId: string;
  state: OnboardingState;
  canProceed: boolean;
  nextStep: OnboardingStep | null;
}

export interface StartOnboardingResult {
  tenantId: string;
  state: OnboardingState;
  nextStep: OnboardingStep;
}

export interface CompleteOnboardingResult {
  tenantId: string;
  state: OnboardingState;
  completed: boolean;
}

export const getOnboardingStatus = async (
  tenantId: string,
  config: AppConfig = loadConfig(),
): Promise<OnboardingStatus> => {
  const db = getDatabaseClient(config);

  const [tenant] = await db
    .select({
      tenantId: tenants.tenantId,
      onboardingState: tenants.onboardingState,
    })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);

  if (!tenant) {
    throw new OnboardingError('Tenant not found', 'TENANT_NOT_FOUND', 404);
  }

  const state = (tenant.onboardingState as OnboardingState) || DEFAULT_ONBOARDING_STATE;
  const nextStep = getNextStep(state.currentStep);
  const canProceed = nextStep !== null;

  return {
    tenantId: tenant.tenantId,
    state,
    canProceed,
    nextStep,
  };
};

export const startOnboarding = async (
  tenantId: string,
  userId: string,
  config: AppConfig = loadConfig(),
): Promise<StartOnboardingResult> => {
  const db = getDatabaseClient(config);

  const [tenant] = await db
    .select({
      tenantId: tenants.tenantId,
      onboardingState: tenants.onboardingState,
      tier: tenants.tier,
    })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);

  if (!tenant) {
    throw new OnboardingError('Tenant not found', 'TENANT_NOT_FOUND', 404);
  }

  if ((tenant.tier as string) !== 'enterprise' && (tenant.tier as string) !== 'government') {
    throw new OnboardingError(
      'Onboarding wizard is only available for enterprise and government tiers',
      'INVALID_TIER',
      400,
    );
  }

  const currentState = (tenant.onboardingState as OnboardingState) || DEFAULT_ONBOARDING_STATE;

  if (currentState.currentStep !== 'not_started') {
    throw new OnboardingError(
      'Onboarding has already been started',
      'ONBOARDING_ALREADY_STARTED',
      400,
    );
  }

  const newState: OnboardingState = {
    ...DEFAULT_ONBOARDING_STATE,
    currentStep: 'org_profile',
    startedAt: new Date().toISOString(),
  };

  await db
    .update(tenants)
    .set({
      onboardingState: newState,
      updatedAt: sql`now()`,
    })
    .where(eq(tenants.tenantId, tenantId));

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'onboarding_started',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { tier: tenant.tier },
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    nextStep: 'org_profile',
  };
};

export const completeOnboarding = async (
  tenantId: string,
  userId: string,
  config: AppConfig = loadConfig(),
): Promise<CompleteOnboardingResult> => {
  const db = getDatabaseClient(config);

  const [tenant] = await db
    .select({
      tenantId: tenants.tenantId,
      onboardingState: tenants.onboardingState,
    })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);

  if (!tenant) {
    throw new OnboardingError('Tenant not found', 'TENANT_NOT_FOUND', 404);
  }

  const currentState = (tenant.onboardingState as OnboardingState) || DEFAULT_ONBOARDING_STATE;

  if (!currentState.completedSteps.includes('compliance')) {
    throw new OnboardingError(
      'Must complete all previous steps before completing onboarding',
      'INVALID_STEP',
      400,
    );
  }

  const newState: OnboardingState = {
    ...currentState,
    currentStep: 'complete',
    completedAt: new Date().toISOString(),
  };

  await db
    .update(tenants)
    .set({
      onboardingState: newState,
      updatedAt: sql`now()`,
    })
    .where(eq(tenants.tenantId, tenantId));

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'onboarding_completed',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: {
        orgProfile: currentState.orgProfile,
        idpType: currentState.idpConfig?.type,
        frameworks: currentState.complianceFrameworks,
      },
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    completed: true,
  };
};

export const resetOnboarding = async (
  tenantId: string,
  userId: string,
  config: AppConfig = loadConfig(),
): Promise<StartOnboardingResult> => {
  const db = getDatabaseClient(config);

  const [tenant] = await db
    .select({
      tenantId: tenants.tenantId,
    })
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);

  if (!tenant) {
    throw new OnboardingError('Tenant not found', 'TENANT_NOT_FOUND', 404);
  }

  const newState: OnboardingState = {
    ...DEFAULT_ONBOARDING_STATE,
    currentStep: 'org_profile',
    startedAt: new Date().toISOString(),
  };

  await db
    .update(tenants)
    .set({
      onboardingState: newState,
      idpConfig: {},
      complianceFrameworks: [],
      updatedAt: sql`now()`,
    })
    .where(eq(tenants.tenantId, tenantId));

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'onboarding_reset',
      resourceType: 'tenant',
      resourceId: tenantId,
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    nextStep: 'org_profile',
  };
};
