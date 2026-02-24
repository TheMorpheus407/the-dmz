import { createHash } from 'crypto';

import {
  m1PasswordPolicyManifest,
  type CompromisedCredentialProvider,
  type CompromisedCredentialScreeningResult,
} from '@the-dmz/shared/contracts';

import type { AppConfig } from '../../config.js';

const HIBP_API_URL = 'https://api.pwnedpasswords.com/range/';

export class HaveIBeenPwnedProvider implements CompromisedCredentialProvider {
  private apiUrl: string;
  private timeoutMs: number;

  constructor(apiUrl: string = HIBP_API_URL, timeoutMs: number = 5000) {
    this.apiUrl = apiUrl;
    this.timeoutMs = timeoutMs;
  }

  async checkPassword(password: string): Promise<CompromisedCredentialScreeningResult> {
    try {
      const sha1Hash = createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1Hash.substring(0, 5);
      const suffix = sha1Hash.substring(5);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.apiUrl}${prefix}`, {
        signal: controller.signal,
        headers: {
          'Add-Padding': 'true',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          unavailable: true,
          provider: 'hibp',
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const text = await response.text();
      const lines = text.split('\n');

      for (const line of lines) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix !== undefined && count !== undefined && hashSuffix.trim() === suffix) {
          return {
            compromised: true,
            provider: 'hibp',
            breachCount: parseInt(count.trim(), 10),
          };
        }
      }

      return {
        compromised: false,
        provider: 'hibp',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        unavailable: true,
        provider: 'hibp',
        error: errorMessage,
      };
    }
  }

  getProviderName(): string {
    return 'hibp';
  }
}

export class NoOpCompromisedCredentialProvider implements CompromisedCredentialProvider {
  async checkPassword(_password: string): Promise<CompromisedCredentialScreeningResult> {
    return {
      compromised: false,
      provider: 'noop',
    };
  }

  getProviderName(): string {
    return 'noop';
  }
}

export const getCompromisedCredentialProvider = (
  _config: AppConfig,
): CompromisedCredentialProvider => {
  const manifest = m1PasswordPolicyManifest;

  if (!manifest.compromisedCredential.enabled) {
    return new NoOpCompromisedCredentialProvider();
  }

  if (manifest.compromisedCredential.mode === 'disabled') {
    return new NoOpCompromisedCredentialProvider();
  }

  if (manifest.compromisedCredential.provider) {
    const { apiUrl, timeoutMs } = manifest.compromisedCredential.provider;
    return new HaveIBeenPwnedProvider(apiUrl, timeoutMs);
  }

  return new HaveIBeenPwnedProvider();
};

export const screenPassword = async (
  config: AppConfig,
  password: string,
): Promise<CompromisedCredentialScreeningResult> => {
  const provider = getCompromisedCredentialProvider(config);
  const result = await provider.checkPassword(password);

  const manifest = m1PasswordPolicyManifest;

  if (
    'unavailable' in result &&
    manifest.compromisedCredential.degradedMode.behavior === 'failOpen'
  ) {
    return {
      compromised: false,
      provider: `${provider.getProviderName()}_degraded`,
    };
  }

  if (
    'unavailable' in result &&
    manifest.compromisedCredential.degradedMode.behavior === 'failClosed'
  ) {
    return {
      compromised: true,
      provider: `${provider.getProviderName()}_degraded`,
      breachCount: 0,
    };
  }

  return result;
};
