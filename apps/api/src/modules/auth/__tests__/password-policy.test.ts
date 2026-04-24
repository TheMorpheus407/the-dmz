import { describe, expect, it, afterAll, beforeEach, afterEach, vi } from 'vitest';

import { hashPassword } from '../auth.service.js';
import { closeDatabase } from '../../../shared/database/connection.js';
import {
  HaveIBeenPwnedProvider,
  NoOpCompromisedCredentialProvider,
  screenPassword,
} from '../../../shared/services/compromised-credential.service.js';

import type { AppConfig } from '../../../config.js';

vi.mock('../../../config.js', async () => {
  const actual = await vi.importActual('../../../config.js');
  return {
    ...actual,
  };
});

const mockConfig = {} as AppConfig;

describe('password policy service', () => {
  describe('HaveIBeenPwnedProvider', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should return not compromised for a unique password', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => 'AABBCC001:5\nDDEEFF002:3',
      } as Response);

      const provider = new HaveIBeenPwnedProvider();
      const result = await provider.checkPassword('ThisIsAVeryUniquePassword12345!@#$%');
      const typedResult = result as { compromised: boolean };
      expect(typedResult.compromised).toBe(false);
    });

    it('should return unavailable:true when fetch times out (AbortError)', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      vi.mocked(fetch).mockRejectedValueOnce(abortError);

      const provider = new HaveIBeenPwnedProvider();
      const result = await provider.checkPassword('test-password');

      expect(result).toMatchObject({
        unavailable: true,
        provider: 'hibp',
      });
      expect((result as { error: string }).error).toBe('Aborted');
    });

    it('should return unavailable:true when HIBP API returns HTTP 503', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      } as Response);

      const provider = new HaveIBeenPwnedProvider();
      const result = await provider.checkPassword('test-password');

      expect(result).toMatchObject({
        unavailable: true,
        provider: 'hibp',
        error: 'HTTP 503: Service Unavailable',
      });
    });

    it('should return unavailable:true when HIBP API returns HTTP 429', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      } as Response);

      const provider = new HaveIBeenPwnedProvider();
      const result = await provider.checkPassword('test-password');

      expect(result).toMatchObject({
        unavailable: true,
        provider: 'hibp',
        error: 'HTTP 429: Too Many Requests',
      });
    });

    it('should return unavailable:true when HIBP API returns HTTP 500', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const provider = new HaveIBeenPwnedProvider();
      const result = await provider.checkPassword('test-password');

      expect(result).toMatchObject({
        unavailable: true,
        provider: 'hibp',
        error: 'HTTP 500: Internal Server Error',
      });
    });

    it('should return unavailable:true when network error occurs (ECONNREFUSED)', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const provider = new HaveIBeenPwnedProvider();
      const result = await provider.checkPassword('test-password');

      expect(result).toMatchObject({
        unavailable: true,
        provider: 'hibp',
        error: 'ECONNREFUSED',
      });
    });

    it('should return unavailable:true when DNS resolution fails', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('ENOTFOUND'));

      const provider = new HaveIBeenPwnedProvider();
      const result = await provider.checkPassword('test-password');

      expect(result).toMatchObject({
        unavailable: true,
        provider: 'hibp',
        error: 'ENOTFOUND',
      });
    });
  });

  describe('NoOpCompromisedCredentialProvider', () => {
    it('should always return not compromised', async () => {
      const provider = new NoOpCompromisedCredentialProvider();
      const result = await provider.checkPassword('any-password');
      const typedResult = result as { compromised: boolean; provider: string };
      expect(typedResult.compromised).toBe(false);
      expect(typedResult.provider).toBe('noop');
    });
  });

  describe('screenPassword', () => {
    it('should use HIBP provider by default', async () => {
      const result = await screenPassword(mockConfig, 'test-password');
      expect(result.provider).toBe('hibp');
    });
  });

  describe('password hashing', () => {
    it('hashes password correctly', async () => {
      const password = ['hash', 'policy', 'input'].join('-');
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });
  });
});

afterAll(async () => {
  vi.resetModules();
  await closeDatabase();
});
