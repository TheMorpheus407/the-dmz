import { describe, it, expect } from 'vitest';

import {
  validationStatusSchema,
  ssoValidationTypeSchema,
  ssoValidationCheckTypeSchema,
  ssoValidationCheckResultSchema,
  ssoValidationResultSchema,
  ssoActivationStatusSchema,
  SSOActivationGateSchema,
  SSOActivationRequestSchema,
  SSOActivationResponseSchema,
  SSOValidationRequestSchema,
  SSOValidationSummarySchema,
  SCIMValidationRequestSchema,
  type SSOValidationCheckType,
  type SSOActivationStatus,
} from '@the-dmz/shared/auth';

describe('validation-contract', () => {
  describe('validationStatusSchema', () => {
    it('should accept ok status', () => {
      expect(validationStatusSchema.parse('ok')).toBe('ok');
    });

    it('should accept warning status', () => {
      expect(validationStatusSchema.parse('warning')).toBe('warning');
    });

    it('should accept failed status', () => {
      expect(validationStatusSchema.parse('failed')).toBe('failed');
    });

    it('should reject invalid status', () => {
      expect(() => validationStatusSchema.parse('invalid')).toThrow();
    });
  });

  describe('ssoValidationTypeSchema', () => {
    it('should accept saml type', () => {
      expect(ssoValidationTypeSchema.parse('saml')).toBe('saml');
    });

    it('should accept oidc type', () => {
      expect(ssoValidationTypeSchema.parse('oidc')).toBe('oidc');
    });

    it('should accept scim type', () => {
      expect(ssoValidationTypeSchema.parse('scim')).toBe('scim');
    });

    it('should reject invalid type', () => {
      expect(() => ssoValidationTypeSchema.parse('invalid')).toThrow();
    });
  });

  describe('ssoValidationCheckTypeSchema', () => {
    it('should accept all valid check types', () => {
      const checkTypes: SSOValidationCheckType[] = [
        'metadata_fetch',
        'metadata_parse',
        'certificate_validity',
        'audience_alignment',
        'acs_alignment',
        'discovery_fetch',
        'issuer_validation',
        'jwks_reachability',
        'claim_mapping',
        'token_exchange',
        'scim_base_url_reachability',
        'scim_authentication',
        'scim_endpoint_availability',
        'scim_dry_run',
      ];

      checkTypes.forEach((type) => {
        expect(ssoValidationCheckTypeSchema.parse(type)).toBe(type);
      });
    });
  });

  describe('ssoValidationCheckResultSchema', () => {
    it('should parse a valid check result', () => {
      const result = {
        checkType: 'discovery_fetch' as const,
        status: 'ok' as const,
        message: 'Discovery document fetched successfully',
        timestamp: new Date(),
      };

      const parsed = ssoValidationCheckResultSchema.parse(result);
      expect(parsed.checkType).toBe('discovery_fetch');
      expect(parsed.status).toBe('ok');
    });

    it('should parse a check result with details', () => {
      const result = {
        checkType: 'discovery_fetch' as const,
        status: 'ok' as const,
        message: 'Discovery document fetched successfully',
        details: {
          issuer: 'https://example.com',
          jwksUri: 'https://example.com/.well-known/jwks.json',
        },
        timestamp: new Date(),
      };

      const parsed = ssoValidationCheckResultSchema.parse(result);
      expect(parsed.details).toBeDefined();
    });
  });

  describe('ssoValidationResultSchema', () => {
    it('should parse a valid validation result', () => {
      const result = {
        validationId: crypto.randomUUID(),
        providerId: crypto.randomUUID(),
        validationType: 'oidc' as const,
        overallStatus: 'ok' as const,
        checks: [
          {
            checkType: 'discovery_fetch' as const,
            status: 'ok' as const,
            message: 'Discovery document fetched successfully',
            timestamp: new Date(),
          },
        ],
        correlationId: crypto.randomUUID(),
        executedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isFresh: true,
      };

      const parsed = ssoValidationResultSchema.parse(result);
      expect(parsed.validationType).toBe('oidc');
      expect(parsed.overallStatus).toBe('ok');
      expect(parsed.checks).toHaveLength(1);
    });
  });

  describe('ssoActivationStatusSchema', () => {
    it('should accept all valid activation statuses', () => {
      const statuses: SSOActivationStatus[] = [
        'not_activated',
        'validation_required',
        'validation_stale',
        'ready_to_activate',
        'activated',
        'activation_failed',
      ];

      statuses.forEach((status) => {
        expect(ssoActivationStatusSchema.parse(status)).toBe(status);
      });
    });
  });

  describe('SSOActivationGateSchema', () => {
    it('should parse a valid activation gate', () => {
      const gate = {
        providerId: crypto.randomUUID(),
        tenantId: crypto.randomUUID(),
        activationStatus: 'ready_to_activate' as const,
        lastValidationId: crypto.randomUUID(),
        lastValidationAt: new Date(),
        lastValidationStatus: 'ok' as const,
        activatedAt: null,
        activatedBy: null,
        canActivate: true,
        validationFreshnessSeconds: 86400,
        isStale: false,
      };

      const parsed = SSOActivationGateSchema.parse(gate);
      expect(parsed.canActivate).toBe(true);
      expect(parsed.activationStatus).toBe('ready_to_activate');
    });

    it('should parse a validation required gate', () => {
      const gate = {
        providerId: crypto.randomUUID(),
        tenantId: crypto.randomUUID(),
        activationStatus: 'validation_required' as const,
        lastValidationId: null,
        lastValidationAt: null,
        lastValidationStatus: null,
        activatedAt: null,
        activatedBy: null,
        canActivate: false,
        validationFreshnessSeconds: 86400,
        isStale: false,
      };

      const parsed = SSOActivationGateSchema.parse(gate);
      expect(parsed.canActivate).toBe(false);
      expect(parsed.activationStatus).toBe('validation_required');
    });
  });

  describe('SSOActivationRequestSchema', () => {
    it('should parse a valid activation request', () => {
      const request = {
        providerId: crypto.randomUUID(),
        enforceSSOOnly: true,
      };

      const parsed = SSOActivationRequestSchema.parse(request);
      expect(parsed.enforceSSOOnly).toBe(true);
    });
  });

  describe('SSOActivationResponseSchema', () => {
    it('should parse a valid activation response', () => {
      const response = {
        providerId: crypto.randomUUID(),
        previousStatus: 'ready_to_activate' as const,
        newStatus: 'activated' as const,
        enforceSSOOnly: true,
        correlationId: crypto.randomUUID(),
        message: 'SSO enforcement activated successfully',
        requiresValidation: false,
      };

      const parsed = SSOActivationResponseSchema.parse(response);
      expect(parsed.newStatus).toBe('activated');
    });
  });

  describe('SSOValidationRequestSchema', () => {
    it('should parse a valid OIDC validation request', () => {
      const request = {
        providerId: crypto.randomUUID(),
        validationType: 'oidc' as const,
      };

      const parsed = SSOValidationRequestSchema.parse(request);
      expect(parsed.validationType).toBe('oidc');
    });

    it('should parse a validation request with test claims', () => {
      const request = {
        providerId: crypto.randomUUID(),
        validationType: 'oidc' as const,
        testClaims: {
          email: 'test@example.com',
          groups: ['admin', 'developer'],
        },
      };

      const parsed = SSOValidationRequestSchema.parse(request);
      expect(parsed.testClaims?.email).toBe('test@example.com');
    });
  });

  describe('SCIMValidationRequestSchema', () => {
    it('should parse a valid SCIM validation request', () => {
      const request = {
        baseUrl: 'https://scim.example.com/scim/v2',
        bearerToken: 'test-token',
        tenantId: crypto.randomUUID(),
      };

      const parsed = SCIMValidationRequestSchema.parse(request);
      expect(parsed.baseUrl).toBe('https://scim.example.com/scim/v2');
    });

    it('should parse a SCIM validation request with dry run email', () => {
      const request = {
        baseUrl: 'https://scim.example.com/scim/v2',
        bearerToken: 'test-token',
        tenantId: crypto.randomUUID(),
        dryRunEmail: 'test@example.com',
      };

      const parsed = SCIMValidationRequestSchema.parse(request);
      expect(parsed.dryRunEmail).toBe('test@example.com');
    });
  });

  describe('SSOValidationSummarySchema', () => {
    it('should parse a valid validation summary', () => {
      const summary = {
        providerId: crypto.randomUUID(),
        tenantId: crypto.randomUUID(),
        providerType: 'oidc' as const,
        lastValidationAt: new Date(),
        lastValidationStatus: 'ok' as const,
        activationStatus: 'ready_to_activate' as const,
        isStale: false,
        canActivate: true,
      };

      const parsed = SSOValidationSummarySchema.parse(summary);
      expect(parsed.canActivate).toBe(true);
    });

    it('should parse a validation summary with stale warning', () => {
      const summary = {
        providerId: crypto.randomUUID(),
        tenantId: crypto.randomUUID(),
        providerType: 'oidc' as const,
        lastValidationAt: new Date(Date.now() - 172800000),
        lastValidationStatus: 'ok' as const,
        activationStatus: 'validation_stale' as const,
        isStale: true,
        staleWarning: 'Validation is stale. Re-run preflight validation before activation.',
        canActivate: false,
      };

      const parsed = SSOValidationSummarySchema.parse(summary);
      expect(parsed.staleWarning).toBeDefined();
    });
  });
});
