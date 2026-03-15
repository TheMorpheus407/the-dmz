import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$app/environment', () => ({
  browser: true,
}));

import {
  detectDevicePerformance,
  getRecommendedEffectsForTier,
  getRecommendedEffectIntensityForTier,
} from './device-detector';

describe('device-detector', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('detectDevicePerformance', () => {
    it('should return a valid performance info object', () => {
      const result = detectDevicePerformance();

      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('hardwareConcurrency');
      expect(result).toHaveProperty('deviceMemory');
      expect(result).toHaveProperty('connectionEffectiveType');
      expect(result).toHaveProperty('isMobile');
      expect(result).toHaveProperty('isLowEndDevice');
    });

    it('should return a valid tier', () => {
      const result = detectDevicePerformance();

      expect(['low', 'medium', 'high']).toContain(result.tier);
    });
  });

  describe('getRecommendedEffectsForTier', () => {
    it('should return all effects disabled for low tier', () => {
      const effects = getRecommendedEffectsForTier('low');

      expect(effects.scanlines).toBe(false);
      expect(effects.curvature).toBe(false);
      expect(effects.glow).toBe(false);
      expect(effects.noise).toBe(false);
      expect(effects.vignette).toBe(false);
      expect(effects.flicker).toBe(false);
    });

    it('should return some effects enabled for medium tier', () => {
      const effects = getRecommendedEffectsForTier('medium');

      expect(effects.scanlines).toBe(true);
      expect(effects.curvature).toBe(false);
      expect(effects.glow).toBe(true);
      expect(effects.noise).toBe(false);
      expect(effects.vignette).toBe(true);
      expect(effects.flicker).toBe(false);
    });

    it('should return all effects enabled for high tier', () => {
      const effects = getRecommendedEffectsForTier('high');

      expect(effects.scanlines).toBe(true);
      expect(effects.curvature).toBe(true);
      expect(effects.glow).toBe(true);
      expect(effects.vignette).toBe(true);
      expect(effects.flicker).toBe(true);
    });
  });

  describe('getRecommendedEffectIntensityForTier', () => {
    it('should return zero intensities for low tier', () => {
      const intensities = getRecommendedEffectIntensityForTier('low');

      expect(intensities.scanlines).toBe(0);
      expect(intensities.curvature).toBe(0);
      expect(intensities.glow).toBe(0);
      expect(intensities.noise).toBe(0);
      expect(intensities.vignette).toBe(0);
      expect(intensities.flicker).toBe(0);
    });

    it('should return medium intensities for medium tier', () => {
      const intensities = getRecommendedEffectIntensityForTier('medium');

      expect(intensities.scanlines).toBeGreaterThan(0);
      expect(intensities.curvature).toBe(0);
      expect(intensities.glow).toBeGreaterThan(0);
      expect(intensities.vignette).toBeGreaterThan(0);
      expect(intensities.flicker).toBe(0);
    });

    it('should return high intensities for high tier', () => {
      const intensities = getRecommendedEffectIntensityForTier('high');

      expect(intensities.scanlines).toBeGreaterThan(0);
      expect(intensities.curvature).toBeGreaterThan(0);
      expect(intensities.glow).toBeGreaterThan(0);
      expect(intensities.vignette).toBeGreaterThan(0);
      expect(intensities.flicker).toBeGreaterThan(0);
    });
  });
});
