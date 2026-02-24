import { describe, expect, it, afterAll, vi } from 'vitest';

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
    it('should return not compromised for a unique password', async () => {
      const provider = new HaveIBeenPwnedProvider();
      const result = await provider.checkPassword('ThisIsAVeryUniquePassword12345!@#$%');
      const r = result as { compromised: boolean };
      expect(r.compromised).toBe(false);
    });
  });

  describe('NoOpCompromisedCredentialProvider', () => {
    it('should always return not compromised', async () => {
      const provider = new NoOpCompromisedCredentialProvider();
      const result = await provider.checkPassword('any-password');
      const r = result as { compromised: boolean; provider: string };
      expect(r.compromised).toBe(false);
      expect(r.provider).toBe('noop');
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
