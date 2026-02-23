import { z } from 'zod';

export const mfaMethodSchema = z.enum(['webauthn', 'totp', 'sms', 'email']);

export type MfaMethod = z.infer<typeof mfaMethodSchema>;

export const mfaChallengeStateSchema = z.object({
  required: z.boolean(),
  verified: z.boolean().nullable(),
  method: mfaMethodSchema.nullable(),
  expiresAt: z.string().datetime().nullable(),
});

export type MfaChallengeState = z.infer<typeof mfaChallengeStateSchema>;

export const webauthnChallengeRequestSchema = z
  .object({
    challengeType: z.enum(['registration', 'verification']),
  })
  .strict();

export type WebauthnChallengeRequest = z.infer<typeof webauthnChallengeRequestSchema>;

export const publicKeyCredentialDescriptorSchema = z.object({
  id: z.string(),
  type: z.literal('public-key'),
});

export type PublicKeyCredentialDescriptor = z.infer<typeof publicKeyCredentialDescriptorSchema>;

export const publicKeyCredentialRpEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type PublicKeyCredentialRpEntity = z.infer<typeof publicKeyCredentialRpEntitySchema>;

export const publicKeyCredentialUserEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
});

export type PublicKeyCredentialUserEntity = z.infer<typeof publicKeyCredentialUserEntitySchema>;

export const publicKeyCredentialParametersSchema = z.object({
  type: z.literal('public-key'),
  alg: z.number(),
});

export type PublicKeyCredentialParameters = z.infer<typeof publicKeyCredentialParametersSchema>;

export const webauthnChallengeResponseSchema = z
  .object({
    challenge: z.string(),
    rp: publicKeyCredentialRpEntitySchema,
    user: publicKeyCredentialUserEntitySchema,
    pubKeyCredParams: z.array(publicKeyCredentialParametersSchema),
    timeout: z.number().optional(),
    excludeCredentials: z.array(publicKeyCredentialDescriptorSchema).optional(),
    authenticatorSelection: z
      .object({
        requireResidentKey: z.boolean().optional(),
        residentKey: z.enum(['discouraged', 'preferred', 'required']).optional(),
        authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
        userVerification: z.enum(['required', 'preferred', 'discouraged']).optional(),
      })
      .optional(),
    attestation: z.enum(['none', 'indirect', 'direct', 'enterprise']).optional(),
    extensions: z.record(z.unknown()).optional(),
  })
  .strict();

export type WebauthnChallengeResponse = z.infer<typeof webauthnChallengeResponseSchema>;

export const authenticatorAttestationResponseSchema = z.object({
  clientDataJSON: z.string(),
  attestationObject: z.string(),
  transports: z.array(z.enum(['usb', 'nfc', 'ble', 'internal'])).optional(),
});

export type AuthenticatorAttestationResponse = z.infer<
  typeof authenticatorAttestationResponseSchema
>;

export const authenticatorAssertionResponseSchema = z.object({
  clientDataJSON: z.string(),
  authenticatorData: z.string(),
  signature: z.string(),
  userHandle: z.string().optional(),
});

export type AuthenticatorAssertionResponse = z.infer<typeof authenticatorAssertionResponseSchema>;

export const webauthnRegistrationRequestSchema = z
  .object({
    credential: z.object({
      id: z.string(),
      rawId: z.string(),
      type: z.literal('public-key'),
      response: authenticatorAttestationResponseSchema,
      clientExtensionResults: z.record(z.unknown()).optional(),
    }),
  })
  .strict();

export type WebauthnRegistrationRequest = z.infer<typeof webauthnRegistrationRequestSchema>;

export const webauthnVerificationRequestSchema = z
  .object({
    credential: z.object({
      id: z.string(),
      rawId: z.string(),
      type: z.literal('public-key'),
      response: authenticatorAssertionResponseSchema,
      clientExtensionResults: z.record(z.unknown()).optional(),
    }),
    challengeId: z.string().uuid(),
  })
  .strict();

export type WebauthnVerificationRequest = z.infer<typeof webauthnVerificationRequestSchema>;

export const webauthnCredentialSchema = z
  .object({
    id: z.string().uuid(),
    credentialId: z.string(),
    publicKey: z.string(),
    counter: z.number(),
    transports: z.array(z.enum(['usb', 'nfc', 'ble', 'internal'])).optional(),
    createdAt: z.string().datetime(),
  })
  .strict();

export type WebauthnCredential = z.infer<typeof webauthnCredentialSchema>;

export const webauthnCredentialsListResponseSchema = z
  .object({
    credentials: z.array(
      z.object({
        id: z.string().uuid(),
        credentialId: z.string(),
        transports: z.array(z.enum(['usb', 'nfc', 'ble', 'internal'])).optional(),
        createdAt: z.string().datetime(),
      }),
    ),
  })
  .strict();

export type WebauthnCredentialsListResponse = z.infer<typeof webauthnCredentialsListResponseSchema>;

export const webauthnRegistrationResponseSchema = z
  .object({
    success: z.boolean(),
    credentialId: z.string().uuid(),
  })
  .strict();

export type WebauthnRegistrationResponse = z.infer<typeof webauthnRegistrationResponseSchema>;

export const webauthnVerificationResponseSchema = z
  .object({
    success: z.boolean(),
    mfaVerifiedAt: z.string().datetime(),
  })
  .strict();

export type WebauthnVerificationResponse = z.infer<typeof webauthnVerificationResponseSchema>;

export const mfaStatusResponseSchema = z
  .object({
    mfaRequired: z.boolean(),
    mfaVerified: z.boolean(),
    method: mfaMethodSchema.nullable(),
    mfaVerifiedAt: z.string().datetime().nullable(),
    hasCredentials: z.boolean(),
  })
  .strict();

export type MfaStatusResponse = z.infer<typeof mfaStatusResponseSchema>;
