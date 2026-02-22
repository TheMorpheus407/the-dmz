import { describe, expect, it } from 'vitest';

import {
  LOADING_STATE_CONFIGS,
  LOADING_TRANSITION_CONFIG,
  ROUTE_GROUP_LOADING_MESSAGES,
  type LoadingStateType,
} from '$lib/types/loading';

describe('Loading Types', () => {
  describe('LOADING_STATE_CONFIGS', () => {
    it('defines initial load configuration', () => {
      const config = LOADING_STATE_CONFIGS.initial;
      expect(config.type).toBe('initial');
      expect(config.surface).toBe('full-page');
      expect(config.timeout).toBeGreaterThan(0);
      expect(config.message).toBeDefined();
    });

    it('defines navigation load configuration', () => {
      const config = LOADING_STATE_CONFIGS.navigation;
      expect(config.type).toBe('navigation');
      expect(config.surface).toBe('panel');
    });

    it('defines revalidation load configuration', () => {
      const config = LOADING_STATE_CONFIGS.revalidation;
      expect(config.type).toBe('revalidation');
      expect(config.surface).toBe('inline');
    });

    it('defines mutation load configuration', () => {
      const config = LOADING_STATE_CONFIGS.mutation;
      expect(config.type).toBe('mutation');
      expect(config.surface).toBe('full-page');
    });

    it('all configs have timeout values', () => {
      const types: LoadingStateType[] = ['initial', 'navigation', 'revalidation', 'mutation'];
      types.forEach((type) => {
        const config = LOADING_STATE_CONFIGS[type];
        expect(config.timeout).toBeDefined();
        expect(config.timeout).toBeGreaterThan(0);
      });
    });

    it('all configs have messages', () => {
      const types: LoadingStateType[] = ['initial', 'navigation', 'revalidation', 'mutation'];
      types.forEach((type) => {
        const config = LOADING_STATE_CONFIGS[type];
        expect(config.message).toBeDefined();
        expect(typeof config.message).toBe('string');
      });
    });
  });

  describe('LOADING_TRANSITION_CONFIG', () => {
    it('has showDelay configured', () => {
      expect(LOADING_TRANSITION_CONFIG.showDelay).toBeGreaterThanOrEqual(0);
    });

    it('has minDisplayDuration configured', () => {
      expect(LOADING_TRANSITION_CONFIG.minDisplayDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ROUTE_GROUP_LOADING_MESSAGES', () => {
    it('has message for game route group', () => {
      expect(ROUTE_GROUP_LOADING_MESSAGES['(game)']).toBeDefined();
      expect(ROUTE_GROUP_LOADING_MESSAGES['(game)'].message).toBeTruthy();
    });

    it('has message for admin route group', () => {
      expect(ROUTE_GROUP_LOADING_MESSAGES['(admin)']).toBeDefined();
      expect(ROUTE_GROUP_LOADING_MESSAGES['(admin)'].message).toBeTruthy();
    });

    it('has message for auth route group', () => {
      expect(ROUTE_GROUP_LOADING_MESSAGES['(auth)']).toBeDefined();
      expect(ROUTE_GROUP_LOADING_MESSAGES['(auth)'].message).toBeTruthy();
    });

    it('has message for public route group', () => {
      expect(ROUTE_GROUP_LOADING_MESSAGES['(public)']).toBeDefined();
      expect(ROUTE_GROUP_LOADING_MESSAGES['(public)'].message).toBeTruthy();
    });
  });
});
