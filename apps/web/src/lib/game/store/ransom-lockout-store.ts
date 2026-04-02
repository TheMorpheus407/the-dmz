import { writable, derived } from 'svelte/store';

import type { BreachSeverity } from '@the-dmz/shared/game';
import {
  calculateRansomAmount,
  canPayRansom,
  SEVERITY_LEVEL_GAME_OVER,
} from '@the-dmz/shared/game';

export type RansomLockoutPhase = 'active' | 'countdown_warning' | 'imminent' | 'expired';

export interface RansomLockoutState {
  isActive: boolean;
  severity: BreachSeverity | null;
  ransomAmount: number | null;
  currentFunds: number;
  lifetimeEarnings: number;
  deadline: number | null;
  deadlineTimestamp: number | null;
  phase: RansomLockoutPhase;
  daysRemaining: number | null;
  entryPoint: string;
  attackVector: string;
  redFlagsMissed: string[];
  hasPaid: boolean;
  hasRefused: boolean;
  hasAttemptedRecovery: boolean;
  canAfford: boolean;
  willCauseGameOver: boolean;
}

const initialState: RansomLockoutState = {
  isActive: false,
  severity: null,
  ransomAmount: null,
  currentFunds: 0,
  lifetimeEarnings: 0,
  deadline: null,
  deadlineTimestamp: null,
  phase: 'active',
  daysRemaining: null,
  entryPoint: '',
  attackVector: '',
  redFlagsMissed: [],
  hasPaid: false,
  hasRefused: false,
  hasAttemptedRecovery: false,
  canAfford: false,
  willCauseGameOver: false,
};

function createRansomLockoutStore() {
  const { subscribe, set, update } = writable<RansomLockoutState>(initialState);

  return {
    subscribe,

    activate(
      severity: BreachSeverity,
      lifetimeEarnings: number,
      currentFunds: number,
      deadlineDays: number,
      entryPoint: string,
      attackVector: string,
      redFlagsMissed: string[],
    ): void {
      const ransomAmount = calculateRansomAmount(lifetimeEarnings);
      const canAfford = canPayRansom(currentFunds, ransomAmount);
      const willCauseGameOver = severity === SEVERITY_LEVEL_GAME_OVER && !canAfford;

      const deadlineTimestamp = Date.now() + deadlineDays * 24 * 60 * 60 * 1000;

      update((state) => ({
        ...state,
        isActive: true,
        severity,
        ransomAmount,
        currentFunds,
        lifetimeEarnings,
        deadline: deadlineDays,
        deadlineTimestamp,
        phase: 'active',
        daysRemaining: deadlineDays,
        entryPoint,
        attackVector,
        redFlagsMissed,
        hasPaid: false,
        hasRefused: false,
        hasAttemptedRecovery: false,
        canAfford,
        willCauseGameOver,
      }));
    },

    updateCountdown(): void {
      update((state) => {
        if (!state.isActive || !state.deadlineTimestamp) return state;

        const now = Date.now();
        const remaining = state.deadlineTimestamp - now;
        const daysRemaining = Math.max(0, remaining / (24 * 60 * 60 * 1000));

        let phase: RansomLockoutPhase = 'active';
        if (daysRemaining <= 0) {
          phase = 'expired';
        } else if (daysRemaining <= 0.25) {
          phase = 'imminent';
        } else if (daysRemaining <= 1) {
          phase = 'countdown_warning';
        }

        return {
          ...state,
          daysRemaining: Math.ceil(daysRemaining),
          phase,
        };
      });
    },

    payRansom(): void {
      update((state) => {
        if (!state.canAfford || state.hasPaid || state.ransomAmount === null) return state;
        return {
          ...state,
          hasPaid: true,
          currentFunds: state.currentFunds - state.ransomAmount,
        };
      });
    },

    refuseRansom(): void {
      update((state) => ({ ...state, hasRefused: true }));
    },

    attemptRecovery(): void {
      update((state) => ({ ...state, hasAttemptedRecovery: true }));
    },

    deactivate(): void {
      set(initialState);
    },

    reset(): void {
      set(initialState);
    },
  };
}

export const ransomLockoutStore = createRansomLockoutStore();

export const isRansomLockoutActive = derived(ransomLockoutStore, ($ransom) => $ransom.isActive);

export const ransomPhase = derived(ransomLockoutStore, ($ransom) => $ransom.phase);

export const canPay = derived(
  ransomLockoutStore,
  ($ransom) => $ransom.canAfford && !$ransom.hasPaid,
);

export const canAttemptRecovery = derived(
  ransomLockoutStore,
  ($ransom) => !$ransom.hasAttemptedRecovery,
);

export const countdownTime = derived(ransomLockoutStore, ($ransom) => {
  if (!$ransom.deadlineTimestamp) return null;
  const remaining = Math.max(0, $ransom.deadlineTimestamp - Date.now());
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, total: remaining };
});
