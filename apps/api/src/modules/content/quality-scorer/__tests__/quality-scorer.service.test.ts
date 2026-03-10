import { describe, expect, it } from 'vitest';

import {
  scoreEmail,
  scoreBatch,
  WEIGHTS_CONFIG,
  QUALITY_THRESHOLDS,
} from '../quality-scorer.service.js';

describe('quality-scorer.service', () => {
  describe('scoreEmail', () => {
    it('returns a valid quality score result', () => {
      const input = {
        subject: 'Urgent: Account Verification Required',
        body: 'Please click the link below to verify your account immediately. Your credentials are needed.',
        faction: 'Sovereign Compact',
        attackType: 'phishing',
        difficulty: 3,
      };

      const result = scoreEmail(input);

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
      expect(result.flags).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(['excellent', 'good', 'fair', 'poor']).toContain(result.status);
    });

    it('calculates weighted scores correctly', () => {
      const input = {
        subject: 'Test Email',
        body: 'This is a test email with normal content and proper grammar.',
        faction: 'Librarians',
        difficulty: 2,
      };

      const result = scoreEmail(input);

      const expectedWeighted =
        result.breakdown.narrativePlausibility * WEIGHTS_CONFIG.narrativePlausibility +
        result.breakdown.grammarClarity * WEIGHTS_CONFIG.grammarClarity +
        result.breakdown.attackAlignment * WEIGHTS_CONFIG.attackAlignment +
        result.breakdown.signalDiversity * WEIGHTS_CONFIG.signalDiversity +
        result.breakdown.learnability * WEIGHTS_CONFIG.learnability;

      expect(result.overall).toBeCloseTo(Math.round(expectedWeighted), 0);
    });

    it('detects poor grammar', () => {
      const input = {
        subject: 'Test',
        body: 'Their going to send you an email about your account. Its important to verify there information.',
        faction: 'Librarians',
      };

      const result = scoreEmail(input);

      expect(result.flags).toContain('poor_grammar');
    });

    it('detects invalid faction', () => {
      const input = {
        subject: 'Test',
        body: 'This is a test email.',
        faction: 'Invalid Faction',
      };

      const result = scoreEmail(input);

      expect(result.flags).toContain('inconsistent_faction');
    });

    it('detects too vague content', () => {
      const input = {
        subject: 'Hi',
        body: 'Hello.',
        faction: 'Librarians',
      };

      const result = scoreEmail(input);

      expect(result.flags).toContain('too_vague');
    });

    it('detects repetitive patterns', () => {
      const input = {
        subject: 'Urgent',
        body: 'Urgent urgent urgent. Click here click here. Account account account password password.',
        faction: 'Hacktivists',
      };

      const result = scoreEmail(input);

      expect(result.flags).toContain('repetitive_pattern');
    });

    it('detects missing indicators', () => {
      const input = {
        subject: 'Hello',
        body: 'This is a normal email about regular business. Nothing suspicious here.',
        faction: 'Criminal Networks',
        attackType: 'phishing',
      };

      const result = scoreEmail(input);

      expect(result.flags).toContain('missing_indicators');
    });

    it('applies difficulty to learnability scoring', () => {
      const vagueBody =
        'Please contact support for more information. Please understand and do the needful.';

      const lowDifficultyResult = scoreEmail({
        subject: 'Test',
        body: vagueBody,
        faction: 'Nexion Industries',
        difficulty: 1,
      });

      const highDifficultyResult = scoreEmail({
        subject: 'Test',
        body: vagueBody,
        faction: 'Nexion Industries',
        difficulty: 5,
      });

      expect(lowDifficultyResult.breakdown.learnability).toBeLessThanOrEqual(
        highDifficultyResult.breakdown.learnability,
      );
    });

    it('validates attack type alignment', () => {
      const phishingInput = {
        subject: 'Verify Account',
        body: 'Click the link to login and verify your password credentials.',
        faction: 'Sovereign Compact',
        attackType: 'phishing',
      };

      const becInput = {
        subject: 'Payment Needed',
        body: 'Please process this wire transfer payment for the invoice.',
        faction: 'Sovereign Compact',
        attackType: 'bec',
      };

      const phishingResult = scoreEmail(phishingInput);
      const becResult = scoreEmail(becInput);

      expect(phishingResult.breakdown.attackAlignment).toBeGreaterThanOrEqual(
        becResult.breakdown.attackAlignment,
      );
    });

    it('maps score to correct status', () => {
      const excellentInput = {
        subject: 'Verification Required',
        body: 'Click here to verify your account. Your password needs updating. Unauthorized access detected. Mismatched domain found. Contact support immediately.',
        faction: 'Nexion Industries',
        attackType: 'phishing',
        difficulty: 3,
      };

      const result = scoreEmail(excellentInput);

      if (result.overall >= 80) {
        expect(result.status).toBe('excellent');
      } else if (result.overall >= 60) {
        expect(result.status).toBe('good');
      } else if (result.overall >= 40) {
        expect(result.status).toBe('fair');
      } else {
        expect(result.status).toBe('poor');
      }
    });

    it('includes world state in scoring', () => {
      const input = {
        subject: 'Alert',
        body: 'This is an urgent message about suspicious activity.',
        faction: 'Librarians',
        worldState: {
          day: 5,
          threatLevel: 'HIGH',
          facilityTier: 2,
        },
      };

      const result = scoreEmail(input);

      expect(result.overall).toBeGreaterThan(0);
    });

    it('validates threat level in world state', () => {
      const invalidThreatInput = {
        subject: 'Alert',
        body: 'Important message.',
        faction: 'Librarians',
        worldState: {
          threatLevel: 'INVALID_LEVEL',
        },
      };

      const result = scoreEmail(invalidThreatInput);

      expect(result.breakdown.narrativePlausibility).toBeLessThan(100);
    });
  });

  describe('scoreBatch', () => {
    it('scores multiple emails', () => {
      const emails = [
        { subject: 'Test 1', body: 'First test email.', faction: 'Librarians' },
        { subject: 'Test 2', body: 'Second test email.', faction: 'Nexion Industries' },
        { subject: 'Test 3', body: 'Third test email.', faction: 'Sovereign Compact' },
      ];

      const results = scoreBatch(emails);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(100);
      });
    });

    it('handles empty batch', () => {
      const results = scoreBatch([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('WEIGHTS_CONFIG', () => {
    it('has correct weight values', () => {
      expect(WEIGHTS_CONFIG.narrativePlausibility).toBe(0.25);
      expect(WEIGHTS_CONFIG.grammarClarity).toBe(0.2);
      expect(WEIGHTS_CONFIG.attackAlignment).toBe(0.2);
      expect(WEIGHTS_CONFIG.signalDiversity).toBe(0.2);
      expect(WEIGHTS_CONFIG.learnability).toBe(0.15);
    });

    it('weights sum to 1', () => {
      const sum =
        WEIGHTS_CONFIG.narrativePlausibility +
        WEIGHTS_CONFIG.grammarClarity +
        WEIGHTS_CONFIG.attackAlignment +
        WEIGHTS_CONFIG.signalDiversity +
        WEIGHTS_CONFIG.learnability;

      expect(sum).toBe(1);
    });
  });

  describe('QUALITY_THRESHOLDS', () => {
    it('has correct threshold ranges', () => {
      expect(QUALITY_THRESHOLDS.excellent.min).toBe(80);
      expect(QUALITY_THRESHOLDS.excellent.max).toBe(100);
      expect(QUALITY_THRESHOLDS.good.min).toBe(60);
      expect(QUALITY_THRESHOLDS.good.max).toBe(79);
      expect(QUALITY_THRESHOLDS.fair.min).toBe(40);
      expect(QUALITY_THRESHOLDS.fair.max).toBe(59);
      expect(QUALITY_THRESHOLDS.poor.min).toBe(0);
      expect(QUALITY_THRESHOLDS.poor.max).toBe(39);
    });

    it('threshold ranges are valid', () => {
      expect(QUALITY_THRESHOLDS.excellent.min).toBeLessThanOrEqual(
        QUALITY_THRESHOLDS.excellent.max,
      );
      expect(QUALITY_THRESHOLDS.good.min).toBeLessThanOrEqual(QUALITY_THRESHOLDS.good.max);
      expect(QUALITY_THRESHOLDS.fair.min).toBeLessThanOrEqual(QUALITY_THRESHOLDS.fair.max);
      expect(QUALITY_THRESHOLDS.poor.min).toBeLessThanOrEqual(QUALITY_THRESHOLDS.poor.max);
      expect(QUALITY_THRESHOLDS.excellent.min).toBeGreaterThan(QUALITY_THRESHOLDS.poor.max);
    });
  });
});
