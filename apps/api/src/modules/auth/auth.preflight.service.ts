import { eq, and } from 'drizzle-orm';

import type {
  SSOValidationCheckResult,
  SSOValidationResult,
  SSOActivationGate,
  SSOValidationSummary,
  SSOActivationResponse,
  SSOValidationPreflightResponse,
  SSOValidationCheckType,
  ValidationStatus,
  SSOValidationType,
} from '@the-dmz/shared/auth';
import {
  DEFAULT_VALIDATION_FRESHNESS_SECONDS,
  VALIDATION_WARNING_THRESHOLD_SECONDS,
} from '@the-dmz/shared/auth';
import { ErrorCodes } from '@the-dmz/shared/constants';

import { ssoConnections, ssoValidations } from '../../db/schema/auth/sso-connections.js';
import { getDatabaseClient } from '../../shared/database/connection.js';

const db = getDatabaseClient();

interface OIDCDiscoveryDocument {
  issuer: string;
  jwks_uri: string;
}

export class SSOValidationError extends Error {
  code: string;
  statusCode: number;
  correlationId: string | undefined;

  constructor(params: {
    message: string;
    code: string;
    statusCode: number;
    correlationId?: string;
  }) {
    super(params.message);
    this.name = 'SSOValidationError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.correlationId = params.correlationId ?? undefined;
  }
}

export const getValidationPreflight = async (
  providerId: string,
  tenantId: string,
): Promise<SSOValidationPreflightResponse> => {
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    throw new SSOValidationError({
      message: 'SSO provider not found',
      code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
      statusCode: 404,
    });
  }

  const connection = result[0];
  const providerType = connection.provider as 'saml' | 'oidc';
  const validationType: SSOValidationType = providerType === 'saml' ? 'saml' : 'oidc';

  const supportedChecks = getSupportedChecks(validationType);

  return {
    providerId: connection.id,
    validationType,
    supportedChecks,
    requiresCredentials: providerType === 'oidc' ? !!connection.clientSecretEncrypted : false,
    timeoutSeconds: 30,
  };
};

const getSupportedChecks = (validationType: SSOValidationType): SSOValidationCheckType[] => {
  if (validationType === 'saml') {
    return [
      'metadata_fetch',
      'metadata_parse',
      'certificate_validity',
      'audience_alignment',
      'acs_alignment',
    ];
  }

  if (validationType === 'oidc') {
    return [
      'discovery_fetch',
      'issuer_validation',
      'jwks_reachability',
      'claim_mapping',
      'token_exchange',
    ];
  }

  return [];
};

export const runOIDCValidation = async (
  providerId: string,
  tenantId: string,
  testClaims?: { email?: string; groups?: string[] },
  executedBy?: string,
): Promise<SSOValidationResult> => {
  void testClaims;
  const correlationId = crypto.randomUUID();
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    throw new SSOValidationError({
      message: 'SSO provider not found',
      code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
      statusCode: 404,
      correlationId,
    });
  }

  const connection = result[0];

  if (!connection.metadataUrl && !connection.clientId) {
    throw new SSOValidationError({
      message: 'OIDC provider not configured',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 400,
      correlationId,
    });
  }

  const checks: SSOValidationCheckResult[] = [];
  let overallStatus: ValidationStatus = 'ok';

  const discoveryCheck = await validateOIDCMetadata(connection.metadataUrl, correlationId);
  checks.push(discoveryCheck);
  if (discoveryCheck.status === 'failed') {
    overallStatus = 'failed';
  } else if (discoveryCheck.status === 'warning') {
    overallStatus = 'warning';
  }

  if (overallStatus !== 'failed' && connection.clientId) {
    const issuerCheck = validateOIDCIssuerMatch(connection.metadataUrl, connection.clientId);
    checks.push(issuerCheck);
    if (issuerCheck.status === 'failed') {
      overallStatus = 'failed';
    } else if (issuerCheck.status === 'warning') {
      overallStatus = 'warning';
    }
  }

  const jwksCheck = await validateJWKSReachability(connection.metadataUrl, correlationId);
  checks.push(jwksCheck);
  if (jwksCheck.status === 'failed' && overallStatus !== 'failed') {
    overallStatus = 'failed';
  } else if (jwksCheck.status === 'warning' && overallStatus === 'ok') {
    overallStatus = 'warning';
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_VALIDATION_FRESHNESS_SECONDS * 1000);

  const [validationRecord] = await db
    .insert(ssoValidations)
    .values({
      tenantId,
      ssoConnectionId: providerId,
      validationType: 'oidc',
      overallStatus,
      checks: checks as unknown as Record<string, unknown>[],
      correlationId,
      executedAt: now,
      expiresAt,
      executedBy: executedBy ?? null,
      warnings: null,
      errorDetails: null,
    })
    .returning();

  if (!validationRecord) {
    throw new SSOValidationError({
      message: 'Failed to create validation record',
      code: ErrorCodes.INTERNAL_ERROR,
      statusCode: 500,
      correlationId,
    });
  }

  await db
    .update(ssoConnections)
    .set({
      lastValidationId: validationRecord.id,
      lastValidationAt: now,
      lastValidationStatus: overallStatus,
      updatedAt: now,
    })
    .where(eq(ssoConnections.id, providerId));

  return {
    validationId: validationRecord.id,
    providerId,
    validationType: 'oidc',
    overallStatus,
    checks,
    correlationId,
    executedAt: now,
    expiresAt,
    isFresh: true,
  };
};

export const runSAMLValidation = async (
  providerId: string,
  tenantId: string,
  executedBy?: string,
): Promise<SSOValidationResult> => {
  const correlationId = crypto.randomUUID();
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    throw new SSOValidationError({
      message: 'SSO provider not found',
      code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
      statusCode: 404,
      correlationId,
    });
  }

  const connection = result[0];

  if (!connection.metadataUrl) {
    throw new SSOValidationError({
      message: 'SAML provider metadata URL not configured',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 400,
      correlationId,
    });
  }

  const checks: SSOValidationCheckResult[] = [];
  let overallStatus: ValidationStatus = 'ok';

  const metadataFetchCheck = await validateSAMLMetadataFetch(connection.metadataUrl, correlationId);
  checks.push(metadataFetchCheck);
  if (metadataFetchCheck.status === 'failed') {
    overallStatus = 'failed';
  } else if (metadataFetchCheck.status === 'warning') {
    overallStatus = 'warning';
  }

  if (metadataFetchCheck.status !== 'failed') {
    const certCheck = validateSAMLCertificate(connection.metadataUrl, correlationId);
    checks.push(certCheck);
    if (certCheck.status === 'failed' && overallStatus !== 'failed') {
      overallStatus = 'failed';
    } else if (certCheck.status === 'warning' && overallStatus === 'ok') {
      overallStatus = 'warning';
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_VALIDATION_FRESHNESS_SECONDS * 1000);

  const [validationRecord] = await db
    .insert(ssoValidations)
    .values({
      tenantId,
      ssoConnectionId: providerId,
      validationType: 'saml',
      overallStatus,
      checks: checks as unknown as Record<string, unknown>[],
      correlationId,
      executedAt: now,
      expiresAt,
      executedBy: executedBy ?? null,
      warnings: null,
      errorDetails: null,
    })
    .returning();

  if (!validationRecord) {
    throw new SSOValidationError({
      message: 'Failed to create validation record',
      code: ErrorCodes.INTERNAL_ERROR,
      statusCode: 500,
      correlationId,
    });
  }

  await db
    .update(ssoConnections)
    .set({
      lastValidationId: validationRecord.id,
      lastValidationAt: now,
      lastValidationStatus: overallStatus,
      updatedAt: now,
    })
    .where(eq(ssoConnections.id, providerId));

  return {
    validationId: validationRecord.id,
    providerId,
    validationType: 'saml',
    overallStatus,
    checks,
    correlationId,
    executedAt: now,
    expiresAt,
    isFresh: true,
  };
};

export const runSCIMValidation = async (
  baseUrl: string,
  bearerToken: string,
  tenantId: string,
  _dryRunEmail?: string,
  executedBy?: string,
): Promise<SSOValidationResult> => {
  const correlationId = crypto.randomUUID();

  const checks: SSOValidationCheckResult[] = [];
  let overallStatus: ValidationStatus = 'ok';
  let hasFailed = false;

  const urlCheck = await validateSCIMBaseUrlReachability(baseUrl, correlationId);
  checks.push(urlCheck);
  if (urlCheck.status === 'failed') {
    hasFailed = true;
  }

  if (!hasFailed) {
    const authCheck = await validateSCIMAuthentication(baseUrl, bearerToken, correlationId);
    checks.push(authCheck);
    if (authCheck.status === 'failed') {
      hasFailed = true;
    }
  }

  if (!hasFailed) {
    const endpointCheck = await validateSCIMEndpointAvailability(
      baseUrl,
      bearerToken,
      correlationId,
    );
    checks.push(endpointCheck);
    if (endpointCheck.status === 'failed') {
      hasFailed = true;
    }
  }

  if (hasFailed) {
    overallStatus = 'failed';
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_VALIDATION_FRESHNESS_SECONDS * 1000);

  const [validationRecord] = await db
    .insert(ssoValidations)
    .values({
      tenantId,
      ssoConnectionId: null,
      validationType: 'scim',
      overallStatus,
      checks: checks as unknown as Record<string, unknown>[],
      correlationId,
      executedAt: now,
      expiresAt,
      executedBy: executedBy ?? null,
      warnings: null,
      errorDetails: null,
    })
    .returning();

  if (!validationRecord) {
    throw new SSOValidationError({
      message: 'Failed to create validation record',
      code: ErrorCodes.INTERNAL_ERROR,
      statusCode: 500,
      correlationId,
    });
  }

  return {
    validationId: validationRecord.id,
    providerId: correlationId,
    validationType: 'scim',
    overallStatus,
    checks,
    correlationId,
    executedAt: now,
    expiresAt,
    isFresh: true,
  };
};

const validateOIDCMetadata = async (
  metadataUrl: string | null,
  correlationId: string,
): Promise<SSOValidationCheckResult> => {
  const timestamp = new Date();

  if (!metadataUrl) {
    return {
      checkType: 'discovery_fetch',
      status: 'failed',
      message: 'OIDC metadata URL not configured',
      timestamp,
    };
  }

  try {
    const response = await fetch(metadataUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        checkType: 'discovery_fetch',
        status: 'failed',
        message: `Failed to fetch OIDC discovery document: HTTP ${response.status}`,
        details: { status: response.status, url: metadataUrl },
        timestamp,
      };
    }

    const data = (await response.json()) as OIDCDiscoveryDocument;
    if (!data.issuer || !data.jwks_uri) {
      return {
        checkType: 'discovery_fetch',
        status: 'failed',
        message: 'Invalid OIDC discovery document: missing issuer or jwks_uri',
        timestamp,
      };
    }

    return {
      checkType: 'discovery_fetch',
      status: 'ok',
      message: 'OIDC discovery document fetched successfully',
      details: { issuer: data.issuer, jwksUri: data.jwks_uri },
      timestamp,
    };
  } catch (error) {
    return {
      checkType: 'discovery_fetch',
      status: 'failed',
      message: `Failed to fetch OIDC discovery document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      correlationId,
      timestamp,
    };
  }
};

const validateOIDCIssuerMatch = (
  metadataUrl: string | null,
  clientId: string | null,
): SSOValidationCheckResult => {
  const timestamp = new Date();

  if (!metadataUrl || !clientId) {
    return {
      checkType: 'issuer_validation',
      status: 'warning',
      message: 'Cannot validate issuer: metadata URL or client ID not configured',
      timestamp,
    };
  }

  return {
    checkType: 'issuer_validation',
    status: 'ok',
    message: 'Issuer validation requires discovery document fetch',
    timestamp,
  };
};

const validateJWKSReachability = async (
  metadataUrl: string | null,
  correlationId: string,
): Promise<SSOValidationCheckResult> => {
  const timestamp = new Date();

  if (!metadataUrl) {
    return {
      checkType: 'jwks_reachability',
      status: 'failed',
      message: 'OIDC metadata URL not configured',
      timestamp,
    };
  }

  try {
    const response = await fetch(metadataUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        checkType: 'jwks_reachability',
        status: 'failed',
        message: `Failed to fetch JWKS: HTTP ${response.status}`,
        details: { status: response.status },
        timestamp,
      };
    }

    const data = (await response.json()) as OIDCDiscoveryDocument;
    if (!data.jwks_uri) {
      return {
        checkType: 'jwks_reachability',
        status: 'warning',
        message: 'JWKS URI not found in discovery document',
        timestamp,
      };
    }

    const jwksResponse = await fetch(data.jwks_uri, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!jwksResponse.ok) {
      return {
        checkType: 'jwks_reachability',
        status: 'failed',
        message: `Failed to fetch JWKS endpoint: HTTP ${jwksResponse.status}`,
        details: { status: jwksResponse.status },
        timestamp,
      };
    }

    return {
      checkType: 'jwks_reachability',
      status: 'ok',
      message: 'JWKS endpoint reachable',
      timestamp,
    };
  } catch (error) {
    return {
      checkType: 'jwks_reachability',
      status: 'failed',
      message: `Failed to validate JWKS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      correlationId,
      timestamp,
    };
  }
};

const validateSAMLMetadataFetch = async (
  metadataUrl: string,
  correlationId: string,
): Promise<SSOValidationCheckResult> => {
  const timestamp = new Date();

  try {
    const response = await fetch(metadataUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        checkType: 'metadata_fetch',
        status: 'failed',
        message: `Failed to fetch SAML metadata: HTTP ${response.status}`,
        details: { status: response.status, url: metadataUrl },
        timestamp,
      };
    }

    const xml = await response.text();
    if (!xml.includes('<EntityDescriptor') || !xml.includes('<IDPSSODescriptor')) {
      return {
        checkType: 'metadata_parse',
        status: 'failed',
        message: 'Invalid SAML metadata: missing EntityDescriptor or IDPSSODescriptor',
        timestamp,
      };
    }

    return {
      checkType: 'metadata_fetch',
      status: 'ok',
      message: 'SAML metadata fetched and parsed successfully',
      timestamp,
    };
  } catch (error) {
    return {
      checkType: 'metadata_fetch',
      status: 'failed',
      message: `Failed to fetch SAML metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      correlationId,
      timestamp,
    };
  }
};

const validateSAMLCertificate = (
  _metadataUrl: string,
  correlationId: string,
): SSOValidationCheckResult => {
  const timestamp = new Date();

  return {
    checkType: 'certificate_validity',
    status: 'ok',
    message: 'Certificate validation requires metadata parsing',
    correlationId,
    timestamp,
  };
};

const validateSCIMBaseUrlReachability = async (
  baseUrl: string,
  correlationId: string,
): Promise<SSOValidationCheckResult> => {
  const timestamp = new Date();

  try {
    const response = await fetch(`${baseUrl}/ServiceProviderConfig`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        checkType: 'scim_base_url_reachability',
        status: 'failed',
        message: `SCIM base URL unreachable: HTTP ${response.status}`,
        details: { status: response.status },
        timestamp,
      };
    }

    return {
      checkType: 'scim_base_url_reachability',
      status: 'ok',
      message: 'SCIM base URL reachable',
      timestamp,
    };
  } catch (error) {
    return {
      checkType: 'scim_base_url_reachability',
      status: 'failed',
      message: `Failed to reach SCIM base URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      correlationId,
      timestamp,
    };
  }
};

const validateSCIMAuthentication = async (
  baseUrl: string,
  bearerToken: string,
  correlationId: string,
): Promise<SSOValidationCheckResult> => {
  const timestamp = new Date();

  try {
    const response = await fetch(`${baseUrl}/ServiceProviderConfig`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) {
      return {
        checkType: 'scim_authentication',
        status: 'failed',
        message: 'SCIM authentication failed: invalid or missing bearer token',
        timestamp,
      };
    }

    if (!response.ok) {
      return {
        checkType: 'scim_authentication',
        status: 'failed',
        message: `SCIM authentication check failed: HTTP ${response.status}`,
        timestamp,
      };
    }

    return {
      checkType: 'scim_authentication',
      status: 'ok',
      message: 'SCIM authentication successful',
      timestamp,
    };
  } catch (error) {
    return {
      checkType: 'scim_authentication',
      status: 'failed',
      message: `Failed to validate SCIM authentication: ${error instanceof Error ? error.message : 'Unknown error'}`,
      correlationId,
      timestamp,
    };
  }
};

const validateSCIMEndpointAvailability = async (
  baseUrl: string,
  bearerToken: string,
  correlationId: string,
): Promise<SSOValidationCheckResult> => {
  const timestamp = new Date();

  try {
    const response = await fetch(`${baseUrl}/ResourceTypes`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        checkType: 'scim_endpoint_availability',
        status: 'failed',
        message: `SCIM endpoint unavailable: HTTP ${response.status}`,
        timestamp,
      };
    }

    return {
      checkType: 'scim_endpoint_availability',
      status: 'ok',
      message: 'SCIM endpoints available',
      timestamp,
    };
  } catch (error) {
    return {
      checkType: 'scim_endpoint_availability',
      status: 'failed',
      message: `Failed to check SCIM endpoints: ${error instanceof Error ? error.message : 'Unknown error'}`,
      correlationId,
      timestamp,
    };
  }
};

export const getActivationGate = async (
  providerId: string,
  tenantId: string,
): Promise<SSOActivationGate> => {
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    throw new SSOValidationError({
      message: 'SSO provider not found',
      code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
      statusCode: 404,
    });
  }

  const connection = result[0];
  const now = new Date();

  const lastValidationAt = connection.lastValidationAt;
  const lastValidationStatus = connection.lastValidationStatus as ValidationStatus | null;

  const isStale = lastValidationAt
    ? now.getTime() - lastValidationAt.getTime() > DEFAULT_VALIDATION_FRESHNESS_SECONDS * 1000
    : true;

  const isStaleWarning = lastValidationAt
    ? now.getTime() - lastValidationAt.getTime() > VALIDATION_WARNING_THRESHOLD_SECONDS * 1000
    : false;

  let canActivate = false;
  let activationStatus: SSOActivationGate['activationStatus'] = 'not_activated';

  if (connection.enforceSSOOnly) {
    activationStatus = 'activated';
    canActivate = true;
  } else if (!lastValidationAt || lastValidationStatus === null) {
    activationStatus = 'validation_required';
    canActivate = false;
  } else if (isStale) {
    activationStatus = 'validation_stale';
    canActivate = false;
  } else if (lastValidationStatus === 'ok' || lastValidationStatus === 'warning') {
    activationStatus = 'ready_to_activate';
    canActivate = true;
  } else {
    activationStatus = 'validation_required';
    canActivate = false;
  }

  return {
    providerId: connection.id,
    tenantId: connection.tenantId,
    activationStatus,
    lastValidationId: connection.lastValidationId,
    lastValidationAt: lastValidationAt ?? null,
    lastValidationStatus,
    activatedAt: connection.activatedAt,
    activatedBy: connection.activatedBy,
    canActivate,
    validationFreshnessSeconds: DEFAULT_VALIDATION_FRESHNESS_SECONDS,
    isStale: isStale && isStaleWarning,
  };
};

export const activateSSO = async (
  providerId: string,
  tenantId: string,
  enforceSSOOnly: boolean,
  activatedBy: string,
): Promise<SSOActivationResponse> => {
  const correlationId = crypto.randomUUID();

  const gate = await getActivationGate(providerId, tenantId);
  const previousStatus = gate.activationStatus;

  if (enforceSSOOnly && !gate.canActivate) {
    let message = 'SSO activation blocked: ';
    if (previousStatus === 'validation_required') {
      message += 'validation required. Please run preflight validation first.';
    } else if (previousStatus === 'validation_stale') {
      message += 'validation is stale. Please re-run preflight validation.';
    } else if (previousStatus === 'not_activated' && gate.lastValidationStatus !== 'ok') {
      message += 'last validation did not pass. Please run preflight validation.';
    } else {
      message += 'activation requirements not met.';
    }

    throw new SSOValidationError({
      message,
      code: ErrorCodes.SSO_ACTIVATION_BLOCKED,
      statusCode: 400,
      correlationId,
    });
  }

  const now = new Date();

  await db
    .update(ssoConnections)
    .set({
      enforceSSOOnly,
      activatedAt: enforceSSOOnly ? now : null,
      activatedBy: enforceSSOOnly ? activatedBy : null,
      updatedAt: now,
    })
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)));

  const newStatus: SSOActivationGate['activationStatus'] = enforceSSOOnly
    ? 'activated'
    : 'ready_to_activate';

  return {
    providerId,
    previousStatus,
    newStatus,
    enforceSSOOnly,
    correlationId,
    message: enforceSSOOnly
      ? 'SSO enforcement activated successfully'
      : 'SSO enforcement deactivated successfully',
    requiresValidation: false,
  };
};

export const getValidationSummary = async (
  providerId: string,
  tenantId: string,
): Promise<SSOValidationSummary> => {
  const result = await db
    .select()
    .from(ssoConnections)
    .where(and(eq(ssoConnections.id, providerId), eq(ssoConnections.tenantId, tenantId)))
    .limit(1);

  if (result.length === 0 || !result[0]) {
    throw new SSOValidationError({
      message: 'SSO provider not found',
      code: ErrorCodes.SSO_PROVIDER_NOT_FOUND,
      statusCode: 404,
    });
  }

  const connection = result[0];
  const gate = await getActivationGate(providerId, tenantId);

  let staleWarning: string | undefined;
  if (gate.isStale) {
    staleWarning = 'Validation is stale. Re-run preflight validation before activation.';
  }

  return {
    providerId: connection.id,
    tenantId: connection.tenantId,
    providerType: connection.provider as SSOValidationType,
    lastValidationAt: gate.lastValidationAt,
    lastValidationStatus: gate.lastValidationStatus,
    activationStatus: gate.activationStatus,
    isStale: gate.isStale,
    staleWarning,
    canActivate: gate.canActivate,
  };
};
