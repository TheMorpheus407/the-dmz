export class TokenManager {
  private authToken: string | null = null;
  private csrfToken: string | null = null;

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  hasAuthToken(): boolean {
    return this.authToken !== null;
  }

  setCsrfToken(token: string): void {
    this.csrfToken = token;
  }

  clearCsrfToken(): void {
    this.csrfToken = null;
  }

  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  hasCsrfToken(): boolean {
    return this.csrfToken !== null;
  }

  buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    return headers;
  }
}
