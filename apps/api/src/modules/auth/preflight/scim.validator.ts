import type { SSOValidationCheckResult } from '@the-dmz/shared/auth';

export class SCIMPreflightValidator {
  async validateBaseUrlReachability(
    baseUrl: string,
    correlationId: string,
  ): Promise<SSOValidationCheckResult> {
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
  }

  async validateAuthentication(
    baseUrl: string,
    bearerToken: string,
    correlationId: string,
  ): Promise<SSOValidationCheckResult> {
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
  }

  async validateEndpointAvailability(
    baseUrl: string,
    bearerToken: string,
    correlationId: string,
  ): Promise<SSOValidationCheckResult> {
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
  }
}

export const scimValidator = new SCIMPreflightValidator();
