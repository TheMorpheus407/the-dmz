import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { playerStore, playerResources } from './player-store';

describe('playerStore', () => {
  beforeEach(() => {
    playerStore.reset();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = get(playerStore);
      expect(state.trust).toBe(100);
      expect(state.funds).toBe(1000);
      expect(state.intelFragments).toBe(0);
    });

    it('playerResources derived returns full state', () => {
      expect(get(playerResources)).toEqual({
        trust: 100,
        funds: 1000,
        intelFragments: 0,
      });
    });
  });

  describe('setPlayer', () => {
    it('sets trust, funds, and intelFragments simultaneously', () => {
      playerStore.setPlayer(50, 500, 10);

      const state = get(playerStore);
      expect(state.trust).toBe(50);
      expect(state.funds).toBe(500);
      expect(state.intelFragments).toBe(10);
    });

    it('overwrites all values', () => {
      playerStore.setPlayer(75, 2000, 5);

      playerStore.setPlayer(25, 100, 1);

      const state = get(playerStore);
      expect(state.trust).toBe(25);
      expect(state.funds).toBe(100);
      expect(state.intelFragments).toBe(1);
    });
  });

  describe('updatePlayer', () => {
    it('updates single field', () => {
      playerStore.updatePlayer({ trust: 50 });

      const state = get(playerStore);
      expect(state.trust).toBe(50);
      expect(state.funds).toBe(1000);
      expect(state.intelFragments).toBe(0);
    });

    it('updates multiple fields', () => {
      playerStore.updatePlayer({ trust: 50, funds: 500 });

      const state = get(playerStore);
      expect(state.trust).toBe(50);
      expect(state.funds).toBe(500);
      expect(state.intelFragments).toBe(0);
    });

    it('does not affect unupdated fields', () => {
      playerStore.updatePlayer({ trust: 50 });

      playerStore.updatePlayer({ funds: 500 });

      const state = get(playerStore);
      expect(state.trust).toBe(50);
      expect(state.funds).toBe(500);
      expect(state.intelFragments).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles zero funds', () => {
      playerStore.updatePlayer({ funds: 0 });

      const state = get(playerStore);
      expect(state.funds).toBe(0);
    });

    it('handles max trust bounds', () => {
      playerStore.updatePlayer({ trust: 100 });

      const state = get(playerStore);
      expect(state.trust).toBe(100);
    });

    it('handles negative trust', () => {
      playerStore.updatePlayer({ trust: -10 });

      const state = get(playerStore);
      expect(state.trust).toBe(-10);
    });
  });

  describe('reset', () => {
    it('returns to initial state', () => {
      playerStore.setPlayer(25, 500, 15);

      playerStore.reset();

      const state = get(playerStore);
      expect(state.trust).toBe(100);
      expect(state.funds).toBe(1000);
      expect(state.intelFragments).toBe(0);
    });
  });

  describe('get', () => {
    it('returns current state', () => {
      playerStore.setPlayer(50, 500, 10);

      const result = playerStore.get();
      expect(result.trust).toBe(50);
      expect(result.funds).toBe(500);
      expect(result.intelFragments).toBe(10);
    });
  });
});
