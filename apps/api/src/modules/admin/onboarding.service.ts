import { eq, sql } from 'drizzle-orm';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  tenants,
  type OnboardingState,
  type OrgProfileData,
  type IdpConfigData,
  type OnboardingStep,
  type RegulatoryRegion,
  type ComplianceCoordinatorContact,
} from '../../shared/database/schema/index.js';
import * as scimService from '../scim/scim.service.js'; // eslint-disable-line import-x/no-restricted-paths
import { createAuditLog } from '../audit/audit.service.js'; // eslint-disable-line import-x/no-restricted-paths

export { type OnboardingStep };

const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  currentStep: 'not_started',
  completedSteps: [],
  startedAt: null,
  completedAt: null,
  regulatoryRegion: undefined,
  complianceCoordinatorContact: undefined,
};

const STEP_ORDER: OnboardingStep[] = [
  'org_profile',
  'idp_config',
  'scim_token',
  'compliance',
  'complete',
];

export { DEFAULT_ONBOARDING_STATE, STEP_ORDER };

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

export interface OrgProfileResult {
  tenantId: string;
  state: OnboardingState;
  completed: boolean;
  nextStep: OnboardingStep | null;
}

export interface IdpConfigResult {
  tenantId: string;
  state: OnboardingState;
  idpConfig: IdpConfigData;
  completed: boolean;
  nextStep: OnboardingStep | null;
}

export interface ScimTokenResult {
  tenantId: string;
  state: OnboardingState;
  tokenId: string;
  token?: string;
  completed: boolean;
  nextStep: OnboardingStep | null;
}

export interface ComplianceResult {
  tenantId: string;
  state: OnboardingState;
  frameworks: string[];
  regulatoryRegion: RegulatoryRegion | undefined;
  complianceCoordinatorContact: ComplianceCoordinatorContact | undefined;
  completed: boolean;
  nextStep: OnboardingStep | null;
}

export interface IdpTestConnectionResult {
  success: boolean;
  message: string;
  diagnostics: {
    metadataValid: boolean;
    entityIdValid: boolean;
    ssoUrlReachable: boolean;
    certificateValid: boolean;
    attributes: string[];
    errors: string[];
  };
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

export const saveOrgProfile = async (
  tenantId: string,
  userId: string,
  profile: OrgProfileData,
  config: AppConfig = loadConfig(),
): Promise<OrgProfileResult> => {
  const db = getDatabaseClient(config);

  if (!profile.name || !profile.domain) {
    throw new OnboardingError('Organization name and domain are required', 'VALIDATION_ERROR', 400);
  }

  if (!profile.industry) {
    throw new OnboardingError('Industry is required', 'VALIDATION_ERROR', 400);
  }

  if (!profile.companySize) {
    throw new OnboardingError('Company size is required', 'VALIDATION_ERROR', 400);
  }

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

  if (
    currentState.currentStep !== 'org_profile' &&
    !currentState.completedSteps.includes('org_profile')
  ) {
    throw new OnboardingError('Cannot save org profile at this step', 'INVALID_STEP', 400);
  }

  const completedSteps = currentState.completedSteps.includes('org_profile')
    ? currentState.completedSteps
    : [...currentState.completedSteps, 'org_profile'];

  const nextStep = getNextStep('org_profile');

  const newState: OnboardingState = {
    ...currentState,
    currentStep: nextStep ?? 'org_profile',
    completedSteps: completedSteps as OnboardingStep[],
    orgProfile: profile,
  };

  await db
    .update(tenants)
    .set({
      name: profile.name,
      domain: profile.domain,
      onboardingState: newState,
      updatedAt: sql`now()`,
    })
    .where(eq(tenants.tenantId, tenantId));

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'onboarding_org_profile_saved',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { domain: profile.domain, industry: profile.industry },
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    completed: completedSteps.includes('org_profile'),
    nextStep,
  };
};

export const saveIdpConfig = async (
  tenantId: string,
  userId: string,
  idpConfig: IdpConfigData,
  config: AppConfig = loadConfig(),
): Promise<IdpConfigResult> => {
  const db = getDatabaseClient(config);

  if (!idpConfig.type || !['saml', 'oidc'].includes(idpConfig.type)) {
    throw new OnboardingError('IdP type must be either saml or oidc', 'VALIDATION_ERROR', 400);
  }

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

  if (!currentState.completedSteps.includes('org_profile')) {
    throw new OnboardingError(
      'Must complete org profile before configuring IdP',
      'INVALID_STEP',
      400,
    );
  }

  const completedSteps = currentState.completedSteps.includes('idp_config')
    ? currentState.completedSteps
    : [...currentState.completedSteps, 'idp_config'];

  const nextStep = getNextStep('idp_config');

  const newState: OnboardingState = {
    ...currentState,
    currentStep: nextStep ?? 'idp_config',
    completedSteps: completedSteps as OnboardingStep[],
    idpConfig,
  };

  await db
    .update(tenants)
    .set({
      idpConfig,
      onboardingState: newState,
      updatedAt: sql`now()`,
    })
    .where(eq(tenants.tenantId, tenantId));

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'onboarding_idp_config_saved',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { idpType: idpConfig.type, enabled: idpConfig.enabled },
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    idpConfig,
    completed: completedSteps.includes('idp_config'),
    nextStep,
  };
};

export const testIdpConnection = async (
  _tenantId: string,
  idpConfig: IdpConfigData,
  _config: AppConfig = loadConfig(),
): Promise<IdpTestConnectionResult> => {
  const diagnostics = {
    metadataValid: false,
    entityIdValid: false,
    ssoUrlReachable: false,
    certificateValid: false,
    attributes: [] as string[],
    errors: [] as string[],
  };

  if (!idpConfig.type) {
    diagnostics.errors.push('IdP type is required (saml or oidc)');
    return {
      success: false,
      message: 'IdP configuration validation failed',
      diagnostics,
    };
  }

  if (idpConfig.type === 'saml') {
    if (idpConfig.entityId) {
      diagnostics.entityIdValid = idpConfig.entityId.length > 0;
      if (!diagnostics.entityIdValid) {
        diagnostics.errors.push('Entity ID is empty');
      }
    } else {
      diagnostics.errors.push('Entity ID is required for SAML');
    }

    if (idpConfig.ssoUrl) {
      try {
        new URL(idpConfig.ssoUrl);
        diagnostics.ssoUrlReachable = true;
      } catch {
        diagnostics.errors.push('SSO URL is not a valid URL');
      }
    } else {
      diagnostics.errors.push('SSO URL is required for SAML');
    }

    if (idpConfig.certificate) {
      const certStart = idpConfig.certificate.includes('-----BEGIN CERTIFICATE-----');
      const certEnd = idpConfig.certificate.includes('-----END CERTIFICATE-----');
      diagnostics.certificateValid = certStart && certEnd;
      if (!diagnostics.certificateValid) {
        diagnostics.errors.push('Certificate must be in PEM format');
      }
    } else {
      diagnostics.errors.push('Certificate is recommended for SAML');
    }

    diagnostics.attributes = ['email', 'name', 'groups'];
    if (idpConfig.authorizedDomains && idpConfig.authorizedDomains.length > 0) {
      diagnostics.attributes.push('domain');
    }

    diagnostics.metadataValid =
      diagnostics.entityIdValid &&
      (diagnostics.ssoUrlReachable || idpConfig.metadataUrl !== undefined);
  } else if (idpConfig.type === 'oidc') {
    if (idpConfig.clientId) {
      diagnostics.entityIdValid = idpConfig.clientId.length > 0;
      if (!diagnostics.entityIdValid) {
        diagnostics.errors.push('Client ID is required for OIDC');
      }
    } else {
      diagnostics.errors.push('Client ID is required for OIDC');
    }

    if (idpConfig.issuer) {
      diagnostics.ssoUrlReachable = idpConfig.issuer.length > 0;
      if (!diagnostics.ssoUrlReachable) {
        diagnostics.errors.push('Issuer is required for OIDC');
      }
    } else {
      diagnostics.errors.push('Issuer is required for OIDC');
    }

    diagnostics.certificateValid = true;
    diagnostics.metadataValid = diagnostics.entityIdValid && diagnostics.ssoUrlReachable;

    diagnostics.attributes = ['email', 'name', 'picture', 'sub'];
    if (idpConfig.scopes && idpConfig.scopes.includes('groups')) {
      diagnostics.attributes.push('groups');
    }
  }

  const success = diagnostics.errors.length === 0 && diagnostics.metadataValid;

  return {
    success,
    message: success
      ? 'IdP connection validation successful'
      : 'IdP connection validation failed with errors',
    diagnostics,
  };
};

export const generateScimToken = async (
  tenantId: string,
  userId: string,
  tokenName: string,
  config: AppConfig = loadConfig(),
): Promise<ScimTokenResult> => {
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

  if (!currentState.completedSteps.includes('idp_config')) {
    throw new OnboardingError(
      'Must complete IdP configuration before generating SCIM token',
      'INVALID_STEP',
      400,
    );
  }

  const result = await scimService.generateScimToken(config, tenantId, tokenName, [
    'scim.read',
    'scim.write',
  ]);

  const completedSteps = currentState.completedSteps.includes('scim_token')
    ? currentState.completedSteps
    : [...currentState.completedSteps, 'scim_token'];

  const nextStep = getNextStep('scim_token');

  const newState: OnboardingState = {
    ...currentState,
    currentStep: nextStep ?? 'scim_token',
    completedSteps: completedSteps as OnboardingStep[],
    scimTokenId: result.tokenId,
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
      action: 'onboarding_scim_token_generated',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { tokenName },
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    tokenId: result.tokenId,
    token: result.token,
    completed: completedSteps.includes('scim_token'),
    nextStep,
  };
};

export const saveComplianceFrameworks = async (
  tenantId: string,
  userId: string,
  data: {
    frameworks: string[];
    regulatoryRegion: RegulatoryRegion | undefined;
    complianceCoordinatorContact: ComplianceCoordinatorContact | undefined;
  },
  config: AppConfig = loadConfig(),
): Promise<ComplianceResult> => {
  const { frameworks, regulatoryRegion, complianceCoordinatorContact } = data;
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

  if (!currentState.completedSteps.includes('scim_token')) {
    throw new OnboardingError(
      'Must generate SCIM token before selecting compliance frameworks',
      'INVALID_STEP',
      400,
    );
  }

  const completedSteps = currentState.completedSteps.includes('compliance')
    ? currentState.completedSteps
    : [...currentState.completedSteps, 'compliance'];

  const nextStep = getNextStep('compliance');

  const newState: OnboardingState = {
    ...currentState,
    currentStep: nextStep ?? 'compliance',
    completedSteps: completedSteps as OnboardingStep[],
    complianceFrameworks: frameworks,
    regulatoryRegion,
    complianceCoordinatorContact,
  };

  await db
    .update(tenants)
    .set({
      complianceFrameworks: frameworks as unknown as Record<string, unknown>,
      onboardingState: newState,
      updatedAt: sql`now()`,
    })
    .where(eq(tenants.tenantId, tenantId));

  await createAuditLog(
    {
      tenantId,
      userId,
      action: 'onboarding_compliance_frameworks_saved',
      resourceType: 'tenant',
      resourceId: tenantId,
      metadata: { frameworks },
    },
    config,
  );

  return {
    tenantId,
    state: newState,
    frameworks,
    regulatoryRegion,
    complianceCoordinatorContact,
    completed: completedSteps.includes('compliance'),
    nextStep,
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
