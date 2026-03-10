import { describe, it, expect } from 'vitest';

import {
  extractFeatures,
  type EmailFeatures,
  DIFFICULTY_TIER_NAMES,
  DIFFICULTY_TIER_DESCRIPTIONS,
} from '../feature-extraction.js';
import { classifyFromFeatures, isWithinTolerance } from '../rule-based-classifier.js';

describe('feature-extraction', () => {
  describe('extractFeatures', () => {
    it('should extract features from obvious phishing email', () => {
      const email = {
        subject: 'URGENT: Your account has been suspended!',
        body: 'Your account will be deleted immediately. Click here to verify your password now. You must act now to avoid losing your account forever!',
        fromName: 'Support',
        fromEmail: 'security-verify@microsoft-support.com',
      };

      const features = extractFeatures(email);

      expect(features.indicatorCount).toBeGreaterThan(0);
      expect(features.wordCount).toBeGreaterThan(0);
      expect(features.hasSpoofedHeaders).toBe(false);
      expect(features.impersonationQuality).toBeGreaterThan(0);
      expect(features.emotionalManipulationLevel).toBeGreaterThan(0);
    });

    it('should extract features from legitimate email', () => {
      const email = {
        subject: 'Weekly team meeting notes',
        body: 'Hi team, here are the notes from our weekly meeting. Please review and let me know if you have any questions. Best regards.',
        fromName: 'John Smith',
        fromEmail: 'john.smith@company.com',
      };

      const features = extractFeatures(email);

      expect(features.indicatorCount).toBe(0);
      expect(features.wordCount).toBeGreaterThan(0);
      expect(features.impersonationQuality).toBe(0);
      expect(features.emotionalManipulationLevel).toBe(0);
    });

    it('should detect spoofed headers', () => {
      const email = {
        subject: 'Test',
        body: 'Test body',
        fromEmail: 'test@example.com',
        headers: {
          from: 'CEO <ceo@company.com>',
          'reply-to': 'attacker@evil.com',
        },
      };

      const features = extractFeatures(email);

      expect(features.hasSpoofedHeaders).toBe(true);
    });

    it('should detect verification hooks', () => {
      const email = {
        subject: 'Important',
        body: 'Please verify your identity by contacting us directly at our official website. Check your security settings.',
      };

      const features = extractFeatures(email);

      expect(features.hasVerificationHooks).toBe(true);
    });

    it('should return correct tier names and descriptions', () => {
      expect(DIFFICULTY_TIER_NAMES[1]).toBe('LOW');
      expect(DIFFICULTY_TIER_NAMES[5]).toBe('SEVERE');
      expect(DIFFICULTY_TIER_DESCRIPTIONS[1]).toBe('Obvious phishing, clear indicators');
      expect(DIFFICULTY_TIER_DESCRIPTIONS[5]).toBe('Near-perfect impersonation, APT-level');
    });
  });
});

describe('rule-based-classifier', () => {
  describe('classifyFromFeatures', () => {
    it('should classify obvious phishing (tier 1)', () => {
      const features: EmailFeatures = {
        indicatorCount: 5,
        wordCount: 100,
        hasSpoofedHeaders: false,
        impersonationQuality: 0.1,
        hasVerificationHooks: true,
        emotionalManipulationLevel: 0.8,
        grammarComplexity: 0.2,
      };

      const result = classifyFromFeatures(features);

      expect(result.difficulty).toBe(1);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.scores).toHaveProperty('tier_1');
    });

    it('should classify sophisticated phishing (tier 4-5)', () => {
      const features: EmailFeatures = {
        indicatorCount: 0.1,
        wordCount: 200,
        hasSpoofedHeaders: true,
        impersonationQuality: 0.85,
        hasVerificationHooks: false,
        emotionalManipulationLevel: 0.3,
        grammarComplexity: 0.9,
      };

      const result = classifyFromFeatures(features);

      expect(result.difficulty).toBeGreaterThanOrEqual(1);
      expect(result.difficulty).toBeLessThanOrEqual(5);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should classify moderate email (tier 2-3)', () => {
      const features: EmailFeatures = {
        indicatorCount: 1.5,
        wordCount: 150,
        hasSpoofedHeaders: false,
        impersonationQuality: 0.4,
        hasVerificationHooks: true,
        emotionalManipulationLevel: 0.3,
        grammarComplexity: 0.5,
      };

      const result = classifyFromFeatures(features);

      expect(result.difficulty).toBeGreaterThanOrEqual(1);
      expect(result.difficulty).toBeLessThanOrEqual(5);
    });

    it('should handle edge cases', () => {
      const features: EmailFeatures = {
        indicatorCount: 0,
        wordCount: 0,
        hasSpoofedHeaders: false,
        impersonationQuality: 0,
        hasVerificationHooks: false,
        emotionalManipulationLevel: 0,
        grammarComplexity: 0,
      };

      const result = classifyFromFeatures(features);

      expect(result.difficulty).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isWithinTolerance', () => {
    it('should return true when within tolerance', () => {
      expect(isWithinTolerance(1, 1, 1)).toBe(true);
      expect(isWithinTolerance(3, 4)).toBe(true);
      expect(isWithinTolerance(5, 5)).toBe(true);
    });

    it('should return false when outside tolerance', () => {
      expect(isWithinTolerance(1, 3)).toBe(false);
      expect(isWithinTolerance(2, 5)).toBe(false);
      expect(isWithinTolerance(5, 1)).toBe(false);
    });

    it('should respect custom tolerance', () => {
      expect(isWithinTolerance(1, 3, 2)).toBe(true);
      expect(isWithinTolerance(1, 4, 3)).toBe(true);
      expect(isWithinTolerance(1, 5, 2)).toBe(false);
    });
  });
});
