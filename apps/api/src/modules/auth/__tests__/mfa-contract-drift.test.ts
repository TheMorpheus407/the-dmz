import { describe, expect, it } from 'vitest';

import {
  mfaMethodJsonSchema as sharedMfaMethodJsonSchema,
  mfaChallengeStateJsonSchema as sharedMfaChallengeStateJsonSchema,
  webauthnChallengeRequestJsonSchema as sharedWebauthnChallengeRequestJsonSchema,
  webauthnChallengeResponseJsonSchema as sharedWebauthnChallengeResponseJsonSchema,
  webauthnRegistrationRequestJsonSchema as sharedWebauthnRegistrationRequestJsonSchema,
  webauthnVerificationRequestJsonSchema as sharedWebauthnVerificationRequestJsonSchema,
  webauthnRegistrationResponseJsonSchema as sharedWebauthnRegistrationResponseJsonSchema,
  webauthnVerificationResponseJsonSchema as sharedWebauthnVerificationResponseJsonSchema,
  mfaStatusResponseJsonSchema as sharedMfaStatusResponseJsonSchema,
  webauthnCredentialsListResponseJsonSchema as sharedWebauthnCredentialsListResponseJsonSchema,
  webauthnCredentialJsonSchema as sharedWebauthnCredentialJsonSchema,
  mfaMethodSchema,
  webauthnChallengeRequestSchema,
  webauthnVerificationRequestSchema,
  mfaStatusResponseSchema,
  webauthnVerificationResponseSchema,
  webauthnRegistrationResponseSchema,
} from '@the-dmz/shared/schemas';

import {
  mfaMethodJsonSchema,
  mfaChallengeStateJsonSchema,
  webauthnChallengeRequestJsonSchema,
  webauthnChallengeResponseJsonSchema,
  webauthnRegistrationRequestJsonSchema,
  webauthnVerificationRequestJsonSchema,
  webauthnRegistrationResponseJsonSchema,
  webauthnVerificationResponseJsonSchema,
  mfaStatusResponseJsonSchema,
  webauthnCredentialsListResponseJsonSchema,
  webauthnCredentialJsonSchema,
} from '../mfa.routes.js';

describe('anti-drift: MFA API routes derive from shared contracts', () => {
  describe('MFA method schema', () => {
    it('mfaMethodJsonSchema matches shared mfaMethodJsonSchema', () => {
      expect(mfaMethodJsonSchema).toEqual(sharedMfaMethodJsonSchema);
    });
  });

  describe('MFA challenge state schema', () => {
    it('mfaChallengeStateJsonSchema matches shared mfaChallengeStateJsonSchema', () => {
      expect(mfaChallengeStateJsonSchema).toEqual(sharedMfaChallengeStateJsonSchema);
    });
  });

  describe('WebAuthn challenge schemas', () => {
    it('webauthnChallengeRequestJsonSchema matches shared webauthnChallengeRequestJsonSchema', () => {
      expect(webauthnChallengeRequestJsonSchema).toEqual(sharedWebauthnChallengeRequestJsonSchema);
    });

    it('webauthnChallengeResponseJsonSchema matches shared webauthnChallengeResponseJsonSchema', () => {
      expect(webauthnChallengeResponseJsonSchema).toEqual(
        sharedWebauthnChallengeResponseJsonSchema,
      );
    });
  });

  describe('WebAuthn registration schemas', () => {
    it('webauthnRegistrationRequestJsonSchema matches shared webauthnRegistrationRequestJsonSchema', () => {
      expect(webauthnRegistrationRequestJsonSchema).toEqual(
        sharedWebauthnRegistrationRequestJsonSchema,
      );
    });

    it('webauthnRegistrationResponseJsonSchema matches shared webauthnRegistrationResponseJsonSchema', () => {
      expect(webauthnRegistrationResponseJsonSchema).toEqual(
        sharedWebauthnRegistrationResponseJsonSchema,
      );
    });
  });

  describe('WebAuthn verification schemas', () => {
    it('webauthnVerificationRequestJsonSchema matches shared webauthnVerificationRequestJsonSchema', () => {
      expect(webauthnVerificationRequestJsonSchema).toEqual(
        sharedWebauthnVerificationRequestJsonSchema,
      );
    });

    it('webauthnVerificationResponseJsonSchema matches shared webauthnVerificationResponseJsonSchema', () => {
      expect(webauthnVerificationResponseJsonSchema).toEqual(
        sharedWebauthnVerificationResponseJsonSchema,
      );
    });
  });

  describe('MFA status schemas', () => {
    it('mfaStatusResponseJsonSchema matches shared mfaStatusResponseJsonSchema', () => {
      expect(mfaStatusResponseJsonSchema).toEqual(sharedMfaStatusResponseJsonSchema);
    });
  });

  describe('WebAuthn credentials schemas', () => {
    it('webauthnCredentialsListResponseJsonSchema matches shared webauthnCredentialsListResponseJsonSchema', () => {
      expect(webauthnCredentialsListResponseJsonSchema).toEqual(
        sharedWebauthnCredentialsListResponseJsonSchema,
      );
    });

    it('webauthnCredentialJsonSchema matches shared webauthnCredentialJsonSchema', () => {
      expect(webauthnCredentialJsonSchema).toEqual(sharedWebauthnCredentialJsonSchema);
    });
  });

  describe('shared MFA schemas integrity', () => {
    it('mfaMethodSchema has correct values', () => {
      const parsed = mfaMethodSchema.safeParse('webauthn');
      expect(parsed.success).toBe(true);
    });

    it('webauthnChallengeRequestSchema has correct structure', () => {
      const parsed = webauthnChallengeRequestSchema.safeParse({ challengeType: 'registration' });
      expect(parsed.success).toBe(true);

      const parsedVerification = webauthnChallengeRequestSchema.safeParse({
        challengeType: 'verification',
      });
      expect(parsedVerification.success).toBe(true);
    });

    it('webauthnVerificationRequestSchema requires challengeId', () => {
      const valid = webauthnVerificationRequestSchema.safeParse({
        credential: {
          id: 'test',
          rawId: 'test',
          type: 'public-key',
          response: {
            clientDataJSON: 'test',
            authenticatorData: 'test',
            signature: 'test',
          },
        },
        challengeId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(valid.success).toBe(true);
    });

    it('mfaStatusResponseSchema has correct structure', () => {
      const valid = mfaStatusResponseSchema.safeParse({
        mfaRequired: true,
        mfaVerified: false,
        method: 'webauthn',
        mfaVerifiedAt: null,
        hasCredentials: true,
      });
      expect(valid.success).toBe(true);
    });

    it('webauthnVerificationResponseSchema requires success and mfaVerifiedAt', () => {
      const valid = webauthnVerificationResponseSchema.safeParse({
        success: true,
        mfaVerifiedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(valid.success).toBe(true);
    });

    it('webauthnRegistrationResponseSchema requires success and credentialId', () => {
      const valid = webauthnRegistrationResponseSchema.safeParse({
        success: true,
        credentialId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(valid.success).toBe(true);
    });
  });
});
