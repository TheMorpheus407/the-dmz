import { describe, it, expect } from 'vitest';

import { ErrorCodes, errorCodeMetadata, allErrorCodes } from '@the-dmz/shared';

describe('SSO Error Codes', () => {
  const ssoErrorCodes = [
    'SSO_PROVIDER_NOT_FOUND',
    'SSO_PROVIDER_INACTIVE',
    'SSO_INVALID_ASSERTION',
    'SSO_ASSERTION_EXPIRED',
    'SSO_ASSERTION_REPLAYED',
    'SSO_INVALID_SIGNATURE',
    'SSO_INVALID_ISSUER',
    'SSO_INVALID_AUDIENCE',
    'SSO_INVALID_STATE',
    'SSO_INVALID_NONCE',
    'SSO_MISSING_REQUIRED_CLAIM',
    'SSO_TOKEN_EXPIRED',
    'SSO_TOKEN_INVALID',
    'SSO_METADATA_FETCH_FAILED',
    'SSO_METADATA_INVALID',
    'SSO_CONFIGURATION_ERROR',
    'SSO_ACCOUNT_LINKING_FAILED',
    'SSO_JIT_PROVISIONING_DENIED',
  ];

  it('should have all SSO error codes defined', () => {
    for (const code of ssoErrorCodes) {
      expect(ErrorCodes[code as keyof typeof ErrorCodes]).toBe(code);
    }
  });

  it('should have metadata for all SSO error codes', () => {
    for (const code of ssoErrorCodes) {
      expect(errorCodeMetadata[code as keyof typeof errorCodeMetadata]).toBeDefined();
      expect(errorCodeMetadata[code as keyof typeof errorCodeMetadata].messageKey).toContain('sso');
    }
  });

  it('should have all SSO error codes in allErrorCodes array', () => {
    for (const code of ssoErrorCodes) {
      expect(allErrorCodes).toContain(code);
    }
  });

  it('should categorize SSO provider errors correctly', () => {
    expect(errorCodeMetadata[ErrorCodes.SSO_PROVIDER_NOT_FOUND].category).toBe('not_found');
    expect(errorCodeMetadata[ErrorCodes.SSO_PROVIDER_INACTIVE].category).toBe('authentication');
    expect(errorCodeMetadata[ErrorCodes.SSO_INVALID_ASSERTION].category).toBe('authentication');
    expect(errorCodeMetadata[ErrorCodes.SSO_ASSERTION_EXPIRED].category).toBe('authentication');
    expect(errorCodeMetadata[ErrorCodes.SSO_ASSERTION_REPLAYED].category).toBe('authentication');
    expect(errorCodeMetadata[ErrorCodes.SSO_INVALID_SIGNATURE].category).toBe('authentication');
    expect(errorCodeMetadata[ErrorCodes.SSO_INVALID_ISSUER].category).toBe('authentication');
    expect(errorCodeMetadata[ErrorCodes.SSO_INVALID_AUDIENCE].category).toBe('authentication');
    expect(errorCodeMetadata[ErrorCodes.SSO_INVALID_STATE].category).toBe('authentication');
    expect(errorCodeMetadata[ErrorCodes.SSO_INVALID_NONCE].category).toBe('authentication');
    expect(errorCodeMetadata[ErrorCodes.SSO_MISSING_REQUIRED_CLAIM].category).toBe(
      'authentication',
    );
    expect(errorCodeMetadata[ErrorCodes.SSO_TOKEN_EXPIRED].category).toBe('authentication');
    expect(errorCodeMetadata[ErrorCodes.SSO_TOKEN_INVALID].category).toBe('authentication');
  });

  it('should categorize metadata errors correctly', () => {
    expect(errorCodeMetadata[ErrorCodes.SSO_METADATA_FETCH_FAILED].category).toBe('server');
    expect(errorCodeMetadata[ErrorCodes.SSO_METADATA_FETCH_FAILED].retryable).toBe(true);
    expect(errorCodeMetadata[ErrorCodes.SSO_METADATA_INVALID].category).toBe('validation');
    expect(errorCodeMetadata[ErrorCodes.SSO_CONFIGURATION_ERROR].category).toBe('validation');
  });

  it('should categorize account linking errors correctly', () => {
    expect(errorCodeMetadata[ErrorCodes.SSO_ACCOUNT_LINKING_FAILED].category).toBe(
      'authentication',
    );
    expect(errorCodeMetadata[ErrorCodes.SSO_JIT_PROVISIONING_DENIED].category).toBe(
      'authentication',
    );
  });
});
