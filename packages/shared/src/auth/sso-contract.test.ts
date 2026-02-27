import { describe, it, expect } from 'vitest';

import {
  SSOProviderType,
  ssoProviderTypeSchema,
  type SAMLProviderConfig,
  type OIDCProviderConfig,
  ssoProviderConfigSchema,
  SSOIdentityClaimSchema,
  SSOTrustFailureReason,
  ssoTrustFailureReasonSchema,
  SSOAccountLinkingOutcome,
  ssoAccountLinkingOutcomeSchema,
  JITProvisioningBehavior,
  jitProvisioningBehaviorSchema,
  type SSOTrustContract,
  ssoTrustContractSchema,
  SSOAuthResponseSchema,
  SSOErrorResponseSchema,
  type IdPMetadata,
  idpMetadataSchema,
  SAMLSignatureAlgorithm,
  OIDCSignatureAlgorithm,
} from '@the-dmz/shared/auth';

describe('SSO Contract', () => {
  describe('SSOProviderType', () => {
    it('should have SAML and OIDC provider types', () => {
      expect(SSOProviderType.SAML).toBe('saml');
      expect(SSOProviderType.OIDC).toBe('oidc');
    });

    it('should validate provider type schema', () => {
      expect(ssoProviderTypeSchema.parse('saml')).toBe('saml');
      expect(ssoProviderTypeSchema.parse('oidc')).toBe('oidc');
      expect(() => ssoProviderTypeSchema.parse('invalid')).toThrow();
    });
  });

  describe('SAMLProviderConfig', () => {
    it('should create a valid SAML provider config', () => {
      const config: SAMLProviderConfig = {
        type: SSOProviderType.SAML,
        issuer: 'https://idp.example.com',
        entityId: 'https://sp.example.com/metadata',
        ssoUrl: 'https://idp.example.com/sso',
        certificate: 'MIIC...',
        signatureAlgorithm: SAMLSignatureAlgorithm.RSA_SHA256,
        wantAssertionsSigned: true,
        wantMessagesSigned: false,
        allowedClockSkewSeconds: 60,
      };

      expect(config.type).toBe('saml');
      expect(config.issuer).toBe('https://idp.example.com');
    });

    it('should validate SAML provider config schema', () => {
      const validConfig = {
        type: 'saml' as const,
        issuer: 'https://idp.example.com',
        entityId: 'https://sp.example.com/metadata',
        ssoUrl: 'https://idp.example.com/sso',
        certificate: 'MIIC...',
        signatureAlgorithm: 'RSA-SHA256' as const,
        wantAssertionsSigned: true,
        wantMessagesSigned: false,
        allowedClockSkewSeconds: 60,
      };

      expect(() => ssoProviderConfigSchema.parse(validConfig)).not.toThrow();
    });
  });

  describe('OIDCProviderConfig', () => {
    it('should create a valid OIDC provider config', () => {
      const config: OIDCProviderConfig = {
        type: SSOProviderType.OIDC,
        issuer: 'https://idp.example.com',
        clientId: 'client-123',
        clientSecret: 'secret-456',
        authorizationEndpoint: 'https://idp.example.com/authorize',
        tokenEndpoint: 'https://idp.example.com/token',
        userinfoEndpoint: 'https://idp.example.com/userinfo',
        jwksUri: 'https://idp.example.com/.well-known/jwks.json',
        scopes: ['openid', 'email', 'profile'],
        idTokenSignedResponseAlg: OIDCSignatureAlgorithm.RS256,
        allowedClockSkewSeconds: 60,
        responseType: 'code',
      };

      expect(config.type).toBe('oidc');
      expect(config.clientId).toBe('client-123');
    });

    it('should validate OIDC provider config schema', () => {
      const validConfig = {
        type: 'oidc' as const,
        issuer: 'https://idp.example.com',
        clientId: 'client-123',
        authorizationEndpoint: 'https://idp.example.com/authorize',
        tokenEndpoint: 'https://idp.example.com/token',
        jwksUri: 'https://idp.example.com/.well-known/jwks.json',
        scopes: ['openid', 'email', 'profile'],
        idTokenSignedResponseAlg: 'RS256' as const,
        allowedClockSkewSeconds: 60,
        responseType: 'code',
      };

      expect(() => ssoProviderConfigSchema.parse(validConfig)).not.toThrow();
    });
  });

  describe('SSOIdentityClaim', () => {
    it('should validate a complete identity claim', () => {
      const claim = {
        subject: 'user-123',
        email: 'user@example.com',
        displayName: 'John Doe',
        groups: ['admins', 'users'],
        tenantHint: 'tenant-456',
      };

      expect(SSOIdentityClaimSchema.parse(claim)).toEqual(claim);
    });

    it('should validate a minimal identity claim', () => {
      const claim = {
        subject: 'user-123',
      };

      expect(SSOIdentityClaimSchema.parse(claim)).toEqual(claim);
    });

    it('should reject invalid email', () => {
      const claim = {
        subject: 'user-123',
        email: 'invalid-email',
      };

      expect(() => SSOIdentityClaimSchema.parse(claim)).toThrow();
    });
  });

  describe('SSOTrustFailureReason', () => {
    it('should have all expected failure reasons', () => {
      expect(SSOTrustFailureReason.INVALID_SIGNATURE).toBe('invalid_signature');
      expect(SSOTrustFailureReason.ISSUER_MISMATCH).toBe('issuer_mismatch');
      expect(SSOTrustFailureReason.AUDIENCE_MISMATCH).toBe('audience_mismatch');
      expect(SSOTrustFailureReason.TOKEN_EXPIRED).toBe('token_expired');
      expect(SSOTrustFailureReason.REPLAY_DETECTED).toBe('replay_detected');
      expect(SSOTrustFailureReason.STATE_MISMATCH).toBe('state_mismatch');
      expect(SSOTrustFailureReason.NONCE_MISMATCH).toBe('nonce_mismatch');
      expect(SSOTrustFailureReason.MISSING_REQUIRED_CLAIM).toBe('missing_required_claim');
    });

    it('should validate failure reason schema', () => {
      expect(ssoTrustFailureReasonSchema.parse('invalid_signature')).toBe('invalid_signature');
      expect(() => ssoTrustFailureReasonSchema.parse('invalid')).toThrow();
    });
  });

  describe('SSOAccountLinkingOutcome', () => {
    it('should have all expected linking outcomes', () => {
      expect(SSOAccountLinkingOutcome.LINKED_EXISTING).toBe('linked_existing');
      expect(SSOAccountLinkingOutcome.LINKED_NEW).toBe('linked_new');
      expect(SSOAccountLinkingOutcome.LINKED_NEW_JIT).toBe('linked_new_jit');
      expect(SSOAccountLinkingOutcome.DENIED_NO_EMAIL).toBe('denied_no_email');
      expect(SSOAccountLinkingOutcome.DENIED_TENANT_MISMATCH).toBe('denied_tenant_mismatch');
      expect(SSOAccountLinkingOutcome.DENIED_BLOCKED).toBe('denied_blocked');
      expect(SSOAccountLinkingOutcome.DENIED_ROLE_ESCALATION).toBe('denied_role_escalation');
    });

    it('should validate linking outcome schema', () => {
      expect(ssoAccountLinkingOutcomeSchema.parse('linked_existing')).toBe('linked_existing');
      expect(() => ssoAccountLinkingOutcomeSchema.parse('invalid')).toThrow();
    });
  });

  describe('JITProvisioningBehavior', () => {
    it('should have all expected behaviors', () => {
      expect(JITProvisioningBehavior.CREATE).toBe('create');
      expect(JITProvisioningBehavior.UPDATE).toBe('update');
      expect(JITProvisioningBehavior.LINK).toBe('link');
      expect(JITProvisioningBehavior.DENY).toBe('deny');
    });

    it('should validate JIT behavior schema', () => {
      expect(jitProvisioningBehaviorSchema.parse('create')).toBe('create');
      expect(() => jitProvisioningBehaviorSchema.parse('invalid')).toThrow();
    });
  });

  describe('SSOTrustContract', () => {
    it('should validate a complete trust contract', () => {
      const contract: SSOTrustContract = {
        version: '1.0.0',
        providerConfigs: [
          {
            type: SSOProviderType.OIDC,
            issuer: 'https://idp.example.com',
            clientId: 'client-123',
            authorizationEndpoint: 'https://idp.example.com/authorize',
            tokenEndpoint: 'https://idp.example.com/token',
            jwksUri: 'https://idp.example.com/.well-known/jwks.json',
            scopes: ['openid', 'email', 'profile'],
            idTokenSignedResponseAlg: OIDCSignatureAlgorithm.RS256,
            allowedClockSkewSeconds: 60,
            responseType: 'code',
          },
        ],
        defaultRole: 'learner',
        allowedRolesForJIT: ['learner', 'trainer'],
        jitProvisioningBehavior: JITProvisioningBehavior.LINK,
        allowGroupRoleMapping: true,
        groupToRoleMapping: {
          admins: 'tenant_admin',
          trainers: 'trainer',
        },
        clockSkewDefaultSeconds: 60,
      };

      expect(() => ssoTrustContractSchema.parse(contract)).not.toThrow();
    });
  });

  describe('SSOAuthResponse', () => {
    it('should validate a valid OAuth response', () => {
      const response = {
        accessToken: 'eyJ...',
        refreshToken: 'refresh...',
        idToken: 'eyJ...',
        tokenType: 'Bearer' as const,
        expiresIn: 3600,
        scope: 'openid email profile',
        user: {
          subject: 'user-123',
          email: 'user@example.com',
          displayName: 'John Doe',
        },
      };

      expect(() => SSOAuthResponseSchema.parse(response)).not.toThrow();
    });
  });

  describe('SSOErrorResponse', () => {
    it('should validate a valid error response', () => {
      const error = {
        error: 'invalid_request',
        errorDescription: 'Missing required parameter',
        errorCode: 'SSO_TOKEN_INVALID',
        correlationId: 'corr-123',
      };

      expect(() => SSOErrorResponseSchema.parse(error)).not.toThrow();
    });
  });

  describe('IdPMetadata', () => {
    it('should validate IdP metadata', () => {
      const metadata: IdPMetadata = {
        issuer: 'https://idp.example.com',
        entityId: 'https://idp.example.com/metadata',
        ssoUrl: 'https://idp.example.com/sso',
        authorizationEndpoint: 'https://idp.example.com/authorize',
        tokenEndpoint: 'https://idp.example.com/token',
        jwksUri: 'https://idp.example.com/.well-known/jwks.json',
        certificates: ['MIIC...', 'MIID...'],
        lastFetched: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      };

      expect(() => idpMetadataSchema.parse(metadata)).not.toThrow();
    });
  });
});
