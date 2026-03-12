import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import {
  ransomLockoutStore,
  isRansomLockoutActive,
  canPay,
  canAttemptRecovery,
  countdownTime,
} from './ransom-lockout-store';

describe('ransomLockoutStore', () => {
  beforeEach(() => {
    ransomLockoutStore.reset();
  });

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const state = get(ransomLockoutStore);
      expect(state.isActive).toBe(false);
      expect(state.severity).toBe(null);
      expect(state.ransomAmount).toBe(null);
      expect(state.currentFunds).toBe(0);
      expect(state.lifetimeEarnings).toBe(0);
      expect(state.deadline).toBe(null);
      expect(state.deadlineTimestamp).toBe(null);
      expect(state.phase).toBe('active');
      expect(state.daysRemaining).toBe(null);
      expect(state.entryPoint).toBe('');
      expect(state.attackVector).toBe('');
      expect(state.redFlagsMissed).toEqual([]);
      expect(state.hasPaid).toBe(false);
      expect(state.hasRefused).toBe(false);
      expect(state.hasAttemptedRecovery).toBe(false);
      expect(state.canAfford).toBe(false);
      expect(state.willCauseGameOver).toBe(false);
    });

    it('should have inactive derived states', () => {
      expect(get(isRansomLockoutActive)).toBe(false);
      expect(get(canPay)).toBe(false);
      expect(get(canAttemptRecovery)).toBe(true);
      expect(get(countdownTime)).toBe(null);
    });
  });

  describe('activate', () => {
    it('should activate with correct values', () => {
      ransomLockoutStore.activate(
        3,
        10000,
        5000,
        3,
        'Request #42 from unknown@fake-edu.net',
        'Credential harvesting via spoofed domain',
        ['Domain age (2 days)', 'No verification'],
      );

      const state = get(ransomLockoutStore);
      expect(state.isActive).toBe(true);
      expect(state.severity).toBe(3);
      expect(state.ransomAmount).toBe(1000);
      expect(state.currentFunds).toBe(5000);
      expect(state.lifetimeEarnings).toBe(10000);
      expect(state.deadline).toBe(3);
      expect(state.entryPoint).toBe('Request #42 from unknown@fake-edu.net');
      expect(state.attackVector).toBe('Credential harvesting via spoofed domain');
      expect(state.redFlagsMissed).toEqual(['Domain age (2 days)', 'No verification']);
      expect(state.canAfford).toBe(true);
      expect(state.willCauseGameOver).toBe(false);
    });

    it('should calculate correct canAfford when funds are insufficient', () => {
      ransomLockoutStore.activate(3, 10000, 500, 3, '', '', []);

      const state = get(ransomLockoutStore);
      expect(state.ransomAmount).toBe(1000);
      expect(state.canAfford).toBe(false);
      expect(state.willCauseGameOver).toBe(false);
    });

    it('should set willCauseGameOver for severity 4 when cannot afford', () => {
      ransomLockoutStore.activate(4, 10000, 500, 3, '', '', []);

      const state = get(ransomLockoutStore);
      expect(state.ransomAmount).toBe(1000);
      expect(state.canAfford).toBe(false);
      expect(state.willCauseGameOver).toBe(true);
    });

    it('should set willCauseGameOver false for severity 4 when can afford', () => {
      ransomLockoutStore.activate(4, 10000, 5000, 3, '', '', []);

      const state = get(ransomLockoutStore);
      expect(state.ransomAmount).toBe(1000);
      expect(state.canAfford).toBe(true);
      expect(state.willCauseGameOver).toBe(false);
    });
  });

  describe('payRansom', () => {
    it('should set hasPaid to true when can afford', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, '', '', []);
      ransomLockoutStore.payRansom();

      const state = get(ransomLockoutStore);
      expect(state.hasPaid).toBe(true);
    });

    it('should not set hasPaid when cannot afford', () => {
      ransomLockoutStore.activate(3, 10000, 500, 3, '', '', []);
      ransomLockoutStore.payRansom();

      const state = get(ransomLockoutStore);
      expect(state.hasPaid).toBe(false);
    });

    it('should not set hasPaid twice', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, '', '', []);
      ransomLockoutStore.payRansom();
      ransomLockoutStore.payRansom();

      const state = get(ransomLockoutStore);
      expect(state.hasPaid).toBe(true);
    });
  });

  describe('refuseRansom', () => {
    it('should set hasRefused to true', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, '', '', []);
      ransomLockoutStore.refuseRansom();

      const state = get(ransomLockoutStore);
      expect(state.hasRefused).toBe(true);
    });
  });

  describe('attemptRecovery', () => {
    it('should set hasAttemptedRecovery to true', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, '', '', []);
      ransomLockoutStore.attemptRecovery();

      const state = get(ransomLockoutStore);
      expect(state.hasAttemptedRecovery).toBe(true);
    });

    it('should set canAttemptRecovery derived to false', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, '', '', []);
      expect(get(canAttemptRecovery)).toBe(true);

      ransomLockoutStore.attemptRecovery();
      expect(get(canAttemptRecovery)).toBe(false);
    });
  });

  describe('updateCountdown', () => {
    it('should update phase based on time remaining', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, '', '', []);

      const state1 = get(ransomLockoutStore);
      expect(state1.phase).toBe('active');
      expect(state1.daysRemaining).toBe(3);

      ransomLockoutStore.updateCountdown();
      const state2 = get(ransomLockoutStore);
      expect(state2.daysRemaining).toBeLessThanOrEqual(3);
    });
  });

  describe('deactivate', () => {
    it('should reset to initial state', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, '', '', []);
      ransomLockoutStore.deactivate();

      const state = get(ransomLockoutStore);
      expect(state.isActive).toBe(false);
      expect(state.ransomAmount).toBe(null);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, 'entry', 'vector', ['flag']);
      ransomLockoutStore.payRansom();
      ransomLockoutStore.reset();

      const state = get(ransomLockoutStore);
      expect(state.isActive).toBe(false);
      expect(state.hasPaid).toBe(false);
      expect(state.entryPoint).toBe('');
      expect(get(isRansomLockoutActive)).toBe(false);
    });
  });
});

describe('derived stores', () => {
  beforeEach(() => {
    ransomLockoutStore.reset();
  });

  describe('canPay', () => {
    it('should be false when cannot afford', () => {
      ransomLockoutStore.activate(3, 10000, 500, 3, '', '', []);
      expect(get(canPay)).toBe(false);
    });

    it('should be true when can afford and not paid', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, '', '', []);
      expect(get(canPay)).toBe(true);
    });

    it('should be false when has paid', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, '', '', []);
      ransomLockoutStore.payRansom();
      expect(get(canPay)).toBe(false);
    });
  });

  describe('countdownTime', () => {
    it('should be null when inactive', () => {
      expect(get(countdownTime)).toBe(null);
    });

    it('should return time object when active', () => {
      ransomLockoutStore.activate(3, 10000, 5000, 3, '', '', []);
      const time = get(countdownTime);
      expect(time).not.toBe(null);
      expect(time).toHaveProperty('hours');
      expect(time).toHaveProperty('minutes');
      expect(time).toHaveProperty('seconds');
      expect(time).toHaveProperty('total');
    });
  });
});
