import { describe, it, expect } from 'vitest';

import {
  calculateContrastRatio,
  validateContrast,
  validateThemeColors,
  simulateColorBlindness,
  applyColorBlindSimulation,
} from '$lib/themes/validation';
import type { ThemeColors } from '@the-dmz/shared/types';

describe('WCAG Contrast Validation', () => {
  describe('calculateContrastRatio', () => {
    it('should calculate correct ratio for black on white', () => {
      const ratio = calculateContrastRatio('#000000', '#ffffff');
      expect(ratio).toBe(21);
    });

    it('should calculate correct ratio for white on black', () => {
      const ratio = calculateContrastRatio('#ffffff', '#000000');
      expect(ratio).toBe(21);
    });

    it('should calculate correct ratio for green on black', () => {
      const ratio = calculateContrastRatio('#33ff33', '#0a0e14');
      expect(ratio).toBeGreaterThan(10);
      expect(ratio).toBeLessThan(15);
    });

    it('should return 1 for invalid hex colors', () => {
      const ratio = calculateContrastRatio('invalid', '#ffffff');
      expect(ratio).toBe(1);
    });

    it('should handle 3-digit hex colors', () => {
      const ratio = calculateContrastRatio('#fff', '#000');
      expect(ratio).toBe(21);
    });
  });

  describe('validateContrast', () => {
    it('should pass AA for high contrast', () => {
      const result = validateContrast('#ffffff', '#000000');
      expect(result.passesAA).toBe(true);
      expect(result.passesAAA).toBe(true);
      expect(result.isWarning).toBe(false);
    });

    it('should fail AA for low contrast', () => {
      const result = validateContrast('#cccccc', '#ffffff');
      expect(result.passesAA).toBe(false);
      expect(result.passesAALarge).toBe(false);
    });

    it('should not warn for very low contrast', () => {
      const result = validateContrast('#cccccc', '#ffffff');
      expect(result.isWarning).toBe(false);
    });

    it('should handle green phosphor on dark background', () => {
      const result = validateContrast('#33ff33', '#0a0e14');
      expect(result.passesAA).toBe(true);
    });

    it('should handle amber on dark background', () => {
      const result = validateContrast('#ffb000', '#0a0e14');
      expect(result.passesAA).toBe(true);
    });
  });

  describe('validateThemeColors', () => {
    const validThemeColors: ThemeColors = {
      background: {
        primary: '#0a0e14',
        secondary: '#141a22',
      },
      text: {
        primary: '#33ff33',
        secondary: '#88aa88',
        accent: '#33ff33',
      },
      border: '#334433',
      highlight: '#253040',
      semantic: {
        error: '#ff5555',
        warning: '#ffcc00',
        success: '#33cc66',
        info: '#3399ff',
      },
    };

    const invalidThemeColors: ThemeColors = {
      background: {
        primary: '#ffffff',
        secondary: '#f0f0f0',
      },
      text: {
        primary: '#cccccc',
        secondary: '#aaaaaa',
        accent: '#bbbbbb',
      },
      border: '#dddddd',
      highlight: '#eeeeee',
      semantic: {
        error: '#ffaaaa',
        warning: '#ffffaa',
        success: '#aaffaa',
        info: '#aaaaff',
      },
    };

    it('should validate a valid theme', () => {
      const result = validateThemeColors(validThemeColors);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect invalid contrast in an invalid theme', () => {
      const result = validateThemeColors(invalidThemeColors);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return contrast results for text colors', () => {
      const result = validateThemeColors(validThemeColors);
      expect(result.contrastResults.primaryText).toBeDefined();
      expect(result.contrastResults.secondaryText).toBeDefined();
      expect(result.contrastResults.accentText).toBeDefined();
    });
  });

  describe('simulateColorBlindness', () => {
    it('should not modify color for none mode', () => {
      const result = simulateColorBlindness('#ff0000', 'none');
      expect(result).toBe('#ff0000');
    });

    it('should apply protanopia simulation', () => {
      const result = simulateColorBlindness('#ff0000', 'protanopia');
      expect(result).not.toBe('#ff0000');
    });

    it('should apply deuteranopia simulation', () => {
      const result = simulateColorBlindness('#00ff00', 'deuteranopia');
      expect(result).not.toBe('#00ff00');
    });

    it('should apply tritanopia simulation', () => {
      const result = simulateColorBlindness('#0000ff', 'tritanopia');
      expect(result).not.toBe('#0000ff');
    });

    it('should return original for invalid hex', () => {
      const result = simulateColorBlindness('invalid', 'protanopia');
      expect(result).toBe('invalid');
    });
  });

  describe('applyColorBlindSimulation', () => {
    const testColors: ThemeColors = {
      background: {
        primary: '#000000',
        secondary: '#ffffff',
      },
      text: {
        primary: '#ff0000',
        secondary: '#00ff00',
        accent: '#0000ff',
      },
      border: '#808080',
      highlight: '#ffff00',
      semantic: {
        error: '#ff0000',
        warning: '#ffff00',
        success: '#00ff00',
        info: '#0000ff',
      },
    };

    it('should return original colors for none mode', () => {
      const result = applyColorBlindSimulation(testColors, 'none');
      expect(result).toEqual(testColors);
    });

    it('should apply simulation for protanopia', () => {
      const result = applyColorBlindSimulation(testColors, 'protanopia');
      expect(result.text.primary).not.toBe(testColors.text.primary);
    });

    it('should apply simulation for deuteranopia', () => {
      const result = applyColorBlindSimulation(testColors, 'deuteranopia');
      expect(result.text.secondary).not.toBe(testColors.text.secondary);
    });

    it('should apply simulation for tritanopia', () => {
      const result = applyColorBlindSimulation(testColors, 'tritanopia');
      expect(result.text.accent).not.toBe(testColors.text.accent);
    });
  });
});
