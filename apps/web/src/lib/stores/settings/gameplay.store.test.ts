import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';

import { gameplayStore } from './gameplay.store';
import { defaultGameplaySettings } from './defaults';

describe('gameplayStore', () => {
  beforeEach(() => {
    gameplayStore.resetToDefaults();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = get(gameplayStore);
      expect(state.difficulty).toBe('normal');
      expect(state.notificationVolume).toBe(80);
      expect(state.notificationDuration).toBe(5);
      expect(state.queueBuildupRate).toBe(3);
    });
  });

  describe('setDifficulty', () => {
    it('sets difficulty to easy', () => {
      gameplayStore.setDifficulty('easy');
      expect(get(gameplayStore).difficulty).toBe('easy');
    });

    it('sets difficulty to hard', () => {
      gameplayStore.setDifficulty('hard');
      expect(get(gameplayStore).difficulty).toBe('hard');
    });

    it('sets difficulty to hard', () => {
      gameplayStore.setDifficulty('hard');
      expect(get(gameplayStore).difficulty).toBe('hard');
    });
  });

  describe('setNotificationVolume', () => {
    it('clamps volume to 0 when negative', () => {
      gameplayStore.setNotificationVolume(-10);
      expect(get(gameplayStore).notificationVolume).toBe(0);
    });

    it('clamps volume to 100 when over 100', () => {
      gameplayStore.setNotificationVolume(150);
      expect(get(gameplayStore).notificationVolume).toBe(100);
    });

    it('accepts valid volume values 0-100', () => {
      gameplayStore.setNotificationVolume(75);
      expect(get(gameplayStore).notificationVolume).toBe(75);
    });
  });

  describe('setNotificationCategoryVolume', () => {
    it('updates master category volume', () => {
      gameplayStore.setNotificationCategoryVolume('master', 90);
      expect(get(gameplayStore).notificationCategoryVolumes.master).toBe(90);
    });

    it('updates alerts category volume', () => {
      gameplayStore.setNotificationCategoryVolume('alerts', 100);
      expect(get(gameplayStore).notificationCategoryVolumes.alerts).toBe(100);
    });

    it('clamps category volume to valid range', () => {
      gameplayStore.setNotificationCategoryVolume('ui', -5);
      expect(get(gameplayStore).notificationCategoryVolumes.ui).toBe(0);
    });
  });

  describe('setNotificationDuration', () => {
    it('clamps duration to minimum of 1', () => {
      gameplayStore.setNotificationDuration(0);
      expect(get(gameplayStore).notificationDuration).toBe(1);
    });

    it('clamps duration to maximum of 30', () => {
      gameplayStore.setNotificationDuration(50);
      expect(get(gameplayStore).notificationDuration).toBe(30);
    });

    it('accepts valid duration values 1-30', () => {
      gameplayStore.setNotificationDuration(15);
      expect(get(gameplayStore).notificationDuration).toBe(15);
    });
  });

  describe('setQueueBuildupRate', () => {
    it('clamps rate to minimum of 1', () => {
      gameplayStore.setQueueBuildupRate(0);
      expect(get(gameplayStore).queueBuildupRate).toBe(1);
    });

    it('clamps rate to maximum of 10', () => {
      gameplayStore.setQueueBuildupRate(15);
      expect(get(gameplayStore).queueBuildupRate).toBe(10);
    });

    it('accepts valid rate values 1-10', () => {
      gameplayStore.setQueueBuildupRate(7);
      expect(get(gameplayStore).queueBuildupRate).toBe(7);
    });
  });

  describe('setAutoAdvanceTiming', () => {
    it('clamps timing to minimum of 0', () => {
      gameplayStore.setAutoAdvanceTiming(-5);
      expect(get(gameplayStore).autoAdvanceTiming).toBe(0);
    });

    it('clamps timing to maximum of 30', () => {
      gameplayStore.setAutoAdvanceTiming(50);
      expect(get(gameplayStore).autoAdvanceTiming).toBe(30);
    });

    it('accepts valid timing values', () => {
      gameplayStore.setAutoAdvanceTiming(10);
      expect(get(gameplayStore).autoAdvanceTiming).toBe(10);
    });
  });

  describe('updateGameplay', () => {
    it('updates multiple settings at once', () => {
      gameplayStore.updateGameplay({
        difficulty: 'hard',
        notificationVolume: 50,
      });
      const state = get(gameplayStore);
      expect(state.difficulty).toBe('hard');
      expect(state.notificationVolume).toBe(50);
    });
  });

  describe('resetToDefaults', () => {
    it('resets all settings to defaults', () => {
      gameplayStore.updateGameplay({
        difficulty: 'hard',
        notificationVolume: 100,
        queueBuildupRate: 10,
      });

      gameplayStore.resetToDefaults();

      const state = get(gameplayStore);
      expect(state).toEqual(defaultGameplaySettings);
    });
  });
});
