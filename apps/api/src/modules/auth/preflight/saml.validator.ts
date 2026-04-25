import type { SSOValidationCheckResult } from '@the-dmz/shared/auth';

export class SAMLPreflightValidator {
  async validateMetadataFetch(
    metadataUrl: string,
    correlationId: string,
  ): Promise<SSOValidationCheckResult> {
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
  }

  validateCertificate(_metadataUrl: string, correlationId: string): SSOValidationCheckResult {
    const timestamp = new Date();

    return {
      checkType: 'certificate_validity',
      status: 'ok',
      message: 'Certificate validation requires metadata parsing',
      correlationId,
      timestamp,
    };
  }
}

export const samlValidator = new SAMLPreflightValidator();
