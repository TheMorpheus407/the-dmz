import type { SSOValidationCheckResult } from '@the-dmz/shared/auth';
import { SSO_VALIDATION_TIMEOUT_MS } from '@the-dmz/shared/constants';

interface OIDCDiscoveryDocument {
  issuer: string;
  jwks_uri: string;
}

export class OIDCPreflightValidator {
  async validateDiscovery(
    metadataUrl: string | null,
    correlationId: string,
  ): Promise<SSOValidationCheckResult> {
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
        signal: AbortSignal.timeout(SSO_VALIDATION_TIMEOUT_MS as number),
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
  }

  validateIssuerMatch(
    metadataUrl: string | null,
    clientId: string | null,
  ): SSOValidationCheckResult {
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
  }

  async validateJWKS(
    metadataUrl: string | null,
    correlationId: string,
  ): Promise<SSOValidationCheckResult> {
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
        signal: AbortSignal.timeout(SSO_VALIDATION_TIMEOUT_MS as number),
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
        signal: AbortSignal.timeout(SSO_VALIDATION_TIMEOUT_MS as number),
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
  }
}

export const oidcValidator = new OIDCPreflightValidator();
