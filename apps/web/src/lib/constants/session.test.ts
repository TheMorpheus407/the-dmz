import { describe, expect, it } from 'vitest';

describe('session constants', () => {
  describe('SessionStatus', () => {
    it('exports SessionStatus constants object', async () => {
      const { SessionStatus } = await import('./session');
      expect(SessionStatus).toBeDefined();
      expect(typeof SessionStatus).toBe('object');
    });

    it('has ANONYMOUS constant with value "anonymous"', async () => {
      const { SessionStatus } = await import('./session');
      expect(SessionStatus.ANONYMOUS).toBe('anonymous');
    });

    it('has AUTHENTICATING constant with value "authenticating"', async () => {
      const { SessionStatus } = await import('./session');
      expect(SessionStatus.AUTHENTICATING).toBe('authenticating');
    });

    it('has AUTHENTICATED constant with value "authenticated"', async () => {
      const { SessionStatus } = await import('./session');
      expect(SessionStatus.AUTHENTICATED).toBe('authenticated');
    });

    it('has EXPIRED constant with value "expired"', async () => {
      const { SessionStatus } = await import('./session');
      expect(SessionStatus.EXPIRED).toBe('expired');
    });

    it('has REVOKED constant with value "revoked"', async () => {
      const { SessionStatus } = await import('./session');
      expect(SessionStatus.REVOKED).toBe('revoked');
    });

    it('has POLICY_DENIED constant with value "policy_denied"', async () => {
      const { SessionStatus } = await import('./session');
      expect(SessionStatus.POLICY_DENIED).toBe('policy_denied');
    });

    it('has MFA_REQUIRED constant with value "mfa_required"', async () => {
      const { SessionStatus } = await import('./session');
      expect(SessionStatus.MFA_REQUIRED).toBe('mfa_required');
    });

    it('SessionStatus values match expected SessionStatus string union', async () => {
      const { SessionStatus } = await import('./session');
      const validStatuses = [
        'anonymous',
        'authenticating',
        'authenticated',
        'expired',
        'revoked',
        'policy_denied',
        'mfa_required',
      ] as const;
      for (const status of validStatuses) {
        expect(Object.values(SessionStatus)).toContain(status);
      }
    });

    it('returns undefined on accessing non-existent SessionStatus property', async () => {
      const { SessionStatus } = await import('./session');
      expect((SessionStatus as Record<string, unknown>)['NONEXISTENT']).toBeUndefined();
    });

    it('SessionStatus constants can be used in equality checks', async () => {
      const { SessionStatus } = await import('./session');
      const mockStatus: string = 'authenticated';
      expect(mockStatus === SessionStatus.AUTHENTICATED).toBe(true);
    });
  });

  describe('UserRole', () => {
    it('exports UserRole constants object', async () => {
      const { UserRole } = await import('./session');
      expect(UserRole).toBeDefined();
      expect(typeof UserRole).toBe('object');
    });

    it('has ADMIN constant with value "admin"', async () => {
      const { UserRole } = await import('./session');
      expect(UserRole.ADMIN).toBe('admin');
    });

    it('has PLAYER constant with value "player"', async () => {
      const { UserRole } = await import('./session');
      expect(UserRole.PLAYER).toBe('player');
    });

    it('has SUPER_ADMIN constant with value "super-admin"', async () => {
      const { UserRole } = await import('./session');
      expect(UserRole.SUPER_ADMIN).toBe('super-admin');
    });

    it('UserRole values match expected UserRole string union', async () => {
      const { UserRole } = await import('./session');
      const validRoles = ['admin', 'player', 'super-admin'] as const;
      for (const role of validRoles) {
        expect(Object.values(UserRole)).toContain(role);
      }
    });

    it('returns undefined on accessing non-existent UserRole property', async () => {
      const { UserRole } = await import('./session');
      expect((UserRole as Record<string, unknown>)['NONEXISTENT']).toBeUndefined();
    });

    it('UserRole constants can be used in equality checks', async () => {
      const { UserRole } = await import('./session');
      const mockRole: string = 'admin';
      expect(mockRole === UserRole.ADMIN).toBe(true);
    });
  });
});
