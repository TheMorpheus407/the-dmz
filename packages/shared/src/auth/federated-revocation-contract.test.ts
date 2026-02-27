import { describe, it, expect } from 'vitest';

import {
  FederatedRevocationSourceType,
  federatedRevocationSourceTypeSchema,
  FederatedRevocationResult,
  federatedRevocationResultSchema,
  SAMLLogoutReason,
  samlLogoutReasonSchema,
  SAMLLogoutStatus,
  samlLogoutStatusSchema,
  SAMLLogoutPayloadSchema,
  OIDCLogoutType,
  oidcLogoutTypeSchema,
  OIDCLogoutPayloadSchema,
  SCIMDeprovisionTriggerSchema,
  FederatedRevocationRequestSchema,
  FederatedRevocationResponseSchema,
  FederatedRevocationErrorSchema,
  FederatedRevocationTrustFailureReason,
  federatedRevocationTrustFailureReasonSchema,
} from '@the-dmz/shared/auth';

describe('Federated Revocation Contract', () => {
  describe('FederatedRevocationSourceType', () => {
    it('should have saml, oidc, and scim source types', () => {
      expect(FederatedRevocationSourceType.SAML).toBe('saml');
      expect(FederatedRevocationSourceType.OIDC).toBe('oidc');
      expect(FederatedRevocationSourceType.SCIM).toBe('scim');
    });

    it('should validate source type schema', () => {
      expect(federatedRevocationSourceTypeSchema.parse('saml')).toBe('saml');
      expect(federatedRevocationSourceTypeSchema.parse('oidc')).toBe('oidc');
      expect(federatedRevocationSourceTypeSchema.parse('scim')).toBe('scim');
      expect(() => federatedRevocationSourceTypeSchema.parse('invalid')).toThrow();
    });
  });

  describe('FederatedRevocationResult', () => {
    it('should have all expected result types', () => {
      expect(FederatedRevocationResult.REVOKED).toBe('revoked');
      expect(FederatedRevocationResult.ALREADY_REVOKED).toBe('already_revoked');
      expect(FederatedRevocationResult.IGNORED_INVALID).toBe('ignored_invalid');
      expect(FederatedRevocationResult.FAILED).toBe('failed');
    });

    it('should validate result schema', () => {
      expect(federatedRevocationResultSchema.parse('revoked')).toBe('revoked');
      expect(federatedRevocationResultSchema.parse('already_revoked')).toBe('already_revoked');
      expect(federatedRevocationResultSchema.parse('ignored_invalid')).toBe('ignored_invalid');
      expect(federatedRevocationResultSchema.parse('failed')).toBe('failed');
      expect(() => federatedRevocationResultSchema.parse('invalid')).toThrow();
    });
  });

  describe('SAMLLogoutReason', () => {
    it('should have all expected logout reasons', () => {
      expect(SAMLLogoutReason.IDP_INITIATED).toBe('idp_initiated');
      expect(SAMLLogoutReason.SP_INITIATED).toBe('sp_initiated');
      expect(SAMLLogoutReason.SINGLE_LOGOUT).toBe('single_logout');
      expect(SAMLLogoutReason.SESSION_TIMEOUT).toBe('session_timeout');
      expect(SAMLLogoutReason.USER_REQUEST).toBe('user_request');
    });

    it('should validate logout reason schema', () => {
      expect(samlLogoutReasonSchema.parse('idp_initiated')).toBe('idp_initiated');
      expect(() => samlLogoutReasonSchema.parse('invalid')).toThrow();
    });
  });

  describe('SAMLLogoutStatus', () => {
    it('should have all expected logout statuses', () => {
      expect(SAMLLogoutStatus.SUCCESS).toBe('success');
      expect(SAMLLogoutStatus.PARTIAL).toBe('partial');
      expect(SAMLLogoutStatus.FAILURE).toBe('failure');
    });

    it('should validate logout status schema', () => {
      expect(samlLogoutStatusSchema.parse('success')).toBe('success');
      expect(samlLogoutStatusSchema.parse('partial')).toBe('partial');
      expect(samlLogoutStatusSchema.parse('failure')).toBe('failure');
      expect(() => samlLogoutStatusSchema.parse('invalid')).toThrow();
    });
  });

  describe('SAMLLogoutPayload', () => {
    it('should validate a complete SAML logout payload', () => {
      const payload = {
        issuer: 'https://idp.example.com',
        destination: 'https://sp.example.com/logout',
        sessionIndex: 'session-123',
        nameId: 'user@example.com',
        reason: 'idp_initiated' as const,
        status: 'success' as const,
        relayState: 'state-456',
        signature: 'sig-789',
        signatureAlgorithm: 'RSA-SHA256',
      };

      expect(() => SAMLLogoutPayloadSchema.parse(payload)).not.toThrow();
    });

    it('should validate a minimal SAML logout payload', () => {
      const payload = {
        issuer: 'https://idp.example.com',
      };

      expect(() => SAMLLogoutPayloadSchema.parse(payload)).not.toThrow();
    });

    it('should reject invalid issuer', () => {
      const payload = {
        issuer: '',
      };

      expect(() => SAMLLogoutPayloadSchema.parse(payload)).toThrow();
    });
  });

  describe('OIDCLogoutType', () => {
    it('should have all expected logout types', () => {
      expect(OIDCLogoutType.BACK_CHANNEL).toBe('back_channel');
      expect(OIDCLogoutType.FRONT_CHANNEL).toBe('front_channel');
      expect(OIDCLogoutType.POST_LOGOUT_REDIRECT).toBe('post_logout_redirect');
    });

    it('should validate logout type schema', () => {
      expect(oidcLogoutTypeSchema.parse('back_channel')).toBe('back_channel');
      expect(oidcLogoutTypeSchema.parse('front_channel')).toBe('front_channel');
      expect(oidcLogoutTypeSchema.parse('post_logout_redirect')).toBe('post_logout_redirect');
      expect(() => oidcLogoutTypeSchema.parse('invalid')).toThrow();
    });
  });

  describe('OIDCLogoutPayload', () => {
    it('should validate a complete OIDC logout payload', () => {
      const payload = {
        issuer: 'https://idp.example.com',
        logoutType: 'back_channel' as const,
        sub: 'user-123',
        sid: 'session-456',
        aud: 'client-789',
        nonce: 'nonce-abc',
        idTokenHint: 'token-hint-xyz',
        postLogoutRedirectUri: 'https://sp.example.com/after-logout',
        state: 'state-def',
      };

      expect(() => OIDCLogoutPayloadSchema.parse(payload)).not.toThrow();
    });

    it('should validate a minimal OIDC logout payload', () => {
      const payload = {
        issuer: 'https://idp.example.com',
        logoutType: 'back_channel' as const,
      };

      expect(() => OIDCLogoutPayloadSchema.parse(payload)).not.toThrow();
    });
  });

  describe('SCIMDeprovisionTrigger', () => {
    it('should validate a complete SCIM deprovision trigger', () => {
      const trigger = {
        scimUserId: 'scim-user-123',
        externalId: 'ext-456',
        email: 'user@example.com',
        reason: 'deactivate' as const,
        idempotencyKey: 'idem-789',
      };

      expect(() => SCIMDeprovisionTriggerSchema.parse(trigger)).not.toThrow();
    });

    it('should validate a minimal SCIM deprovision trigger', () => {
      const trigger = {
        scimUserId: 'scim-user-123',
        reason: 'delete' as const,
        idempotencyKey: 'idem-789',
      };

      expect(() => SCIMDeprovisionTriggerSchema.parse(trigger)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const trigger = {
        scimUserId: 'scim-user-123',
        email: 'invalid-email',
        reason: 'deactivate' as const,
        idempotencyKey: 'idem-789',
      };

      expect(() => SCIMDeprovisionTriggerSchema.parse(trigger)).toThrow();
    });
  });

  describe('FederatedRevocationRequest', () => {
    it('should validate a SAML revocation request', () => {
      const request = {
        sourceType: 'saml' as const,
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        correlationId: '550e8400-e29b-41d4-a716-446655440001',
        timestamp: '2024-01-01T00:00:00.000Z',
        samlPayload: {
          issuer: 'https://idp.example.com',
          reason: 'idp_initiated' as const,
        },
      };

      expect(() => FederatedRevocationRequestSchema.parse(request)).not.toThrow();
    });

    it('should validate an OIDC revocation request', () => {
      const request = {
        sourceType: 'oidc' as const,
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        correlationId: '550e8400-e29b-41d4-a716-446655440001',
        oidcPayload: {
          issuer: 'https://idp.example.com',
          logoutType: 'back_channel' as const,
        },
      };

      expect(() => FederatedRevocationRequestSchema.parse(request)).not.toThrow();
    });

    it('should validate a SCIM revocation request', () => {
      const request = {
        sourceType: 'scim' as const,
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        correlationId: '550e8400-e29b-41d4-a716-446655440001',
        scimPayload: {
          scimUserId: 'scim-user-123',
          reason: 'deactivate' as const,
          idempotencyKey: 'idem-789',
        },
      };

      expect(() => FederatedRevocationRequestSchema.parse(request)).not.toThrow();
    });
  });

  describe('FederatedRevocationResponse', () => {
    it('should validate a successful revocation response', () => {
      const response = {
        result: 'revoked' as const,
        sourceType: 'saml' as const,
        sessionsRevoked: 3,
        userId: '550e8400-e29b-41d4-a716-446655440000',
        correlationId: '550e8400-e29b-41d4-a716-446655440001',
        reason: 'saml_logout',
        diagnostics: {
          timestamp: '2024-01-01T00:00:00.000Z',
          processingTimeMs: 150,
          idempotent: true,
        },
      };

      expect(() => FederatedRevocationResponseSchema.parse(response)).not.toThrow();
    });

    it('should validate an already-revoked response', () => {
      const response = {
        result: 'already_revoked' as const,
        sourceType: 'oidc' as const,
        sessionsRevoked: 0,
        userId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'no_active_sessions',
      };

      expect(() => FederatedRevocationResponseSchema.parse(response)).not.toThrow();
    });

    it('should validate an ignored-invalid response', () => {
      const response = {
        result: 'ignored_invalid' as const,
        sourceType: 'scim' as const,
        sessionsRevoked: 0,
        reason: 'user_not_found',
      };

      expect(() => FederatedRevocationResponseSchema.parse(response)).not.toThrow();
    });

    it('should validate a failed response', () => {
      const response = {
        result: 'failed' as const,
        sourceType: 'saml' as const,
        sessionsRevoked: 0,
        reason: 'configuration_error',
      };

      expect(() => FederatedRevocationResponseSchema.parse(response)).not.toThrow();
    });
  });

  describe('FederatedRevocationError', () => {
    it('should validate a revocation error', () => {
      const error = {
        error: 'invalid_signature',
        errorCode: 'FEDERATED_REVOCATION_TRUST_FAILURE',
        message: 'Invalid logout message signature',
        correlationId: '550e8400-e29b-41d4-a716-446655440001',
        sourceType: 'saml' as const,
        reason: 'signature_validation_failed',
      };

      expect(() => FederatedRevocationErrorSchema.parse(error)).not.toThrow();
    });
  });

  describe('FederatedRevocationTrustFailureReason', () => {
    it('should have all expected trust failure reasons', () => {
      expect(FederatedRevocationTrustFailureReason.INVALID_SIGNATURE).toBe('invalid_signature');
      expect(FederatedRevocationTrustFailureReason.ISSUER_MISMATCH).toBe('issuer_mismatch');
      expect(FederatedRevocationTrustFailureReason.AUDIENCE_MISMATCH).toBe('audience_mismatch');
      expect(FederatedRevocationTrustFailureReason.TOKEN_EXPIRED).toBe('token_expired');
      expect(FederatedRevocationTrustFailureReason.MISSING_REQUIRED_FIELD).toBe(
        'missing_required_field',
      );
      expect(FederatedRevocationTrustFailureReason.INVALID_STATE).toBe('invalid_state');
      expect(FederatedRevocationTrustFailureReason.TENANT_MISMATCH).toBe('tenant_mismatch');
      expect(FederatedRevocationTrustFailureReason.USER_NOT_FOUND).toBe('user_not_found');
      expect(FederatedRevocationTrustFailureReason.CONFIGURATION_ERROR).toBe('configuration_error');
      expect(FederatedRevocationTrustFailureReason.UNAUTHORIZED).toBe('unauthorized');
    });

    it('should validate trust failure reason schema', () => {
      expect(federatedRevocationTrustFailureReasonSchema.parse('invalid_signature')).toBe(
        'invalid_signature',
      );
      expect(federatedRevocationTrustFailureReasonSchema.parse('issuer_mismatch')).toBe(
        'issuer_mismatch',
      );
      expect(() => federatedRevocationTrustFailureReasonSchema.parse('invalid')).toThrow();
    });
  });
});
