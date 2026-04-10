import { apiClient } from './client.js';

export class AuthService {
  private storedToken: string | null = null;

  constructor(options?: { initializeFromCookie?: boolean }) {
    if (options?.initializeFromCookie) {
      this.setCsrfFromCurrentCookie();
    }
  }

  extractCsrfFromCookie(): string | null {
    if (typeof document === 'undefined') {
      return null;
    }
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const name = trimmed.substring(0, idx);
        const value = trimmed.substring(idx + 1);
        if (name === 'csrf-token' && value) {
          return value;
        }
      }
    }
    return null;
  }

  setCsrfToken(token: string): void {
    this.storedToken = token;
    apiClient.setCsrfToken(token);
  }

  getCsrfToken(): string | null {
    return this.storedToken;
  }

  clearCsrfToken(): void {
    this.storedToken = null;
    apiClient.clearCsrfToken();
  }

  hasCsrfToken(): boolean {
    return this.storedToken !== null;
  }

  setCsrfFromCurrentCookie(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const csrfValue = this.extractCsrfFromCookie();
    if (csrfValue) {
      this.setCsrfToken(csrfValue);
    }
  }
}

export const authService = new AuthService();
