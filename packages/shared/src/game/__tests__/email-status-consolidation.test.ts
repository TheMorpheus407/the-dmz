import { describe, it, expect } from 'vitest';

import { EMAIL_STATUS } from '../email-instance.js';
import { emailStatusSchema } from '../../schemas/game-engine.schema.js';

import type { EmailState } from '../../types/game-state.js';

describe('Email Status Consolidation', () => {
  describe('EMAIL_STATUS and emailStatusSchema must have identical values', () => {
    it('should have the same number of status values', () => {
      const emailStatusCount = Object.keys(EMAIL_STATUS).length;
      const schemaValuesCount = emailStatusSchema._def.values.length;
      expect(emailStatusCount).toBe(schemaValuesCount);
    });

    it('should contain all EMAIL_STATUS values in the schema', () => {
      const emailStatusValues = new Set(Object.values(EMAIL_STATUS));
      for (const value of emailStatusValues) {
        const result = emailStatusSchema.safeParse(value);
        expect(result.success, `Expected '${value}' to be valid in emailStatusSchema`).toBe(true);
      }
    });

    it('should contain all schema values in EMAIL_STATUS', () => {
      const emailStatusValues = new Set(Object.values(EMAIL_STATUS));
      for (const value of emailStatusSchema._def.values) {
        expect(emailStatusValues.has(value), `Expected '${value}' to be in EMAIL_STATUS`).toBe(
          true,
        );
      }
    });

    it('should have no values only in EMAIL_STATUS', () => {
      const emailStatusValues = new Set(Object.values(EMAIL_STATUS));
      const schemaValues = new Set(emailStatusSchema._def.values);
      const onlyInEmailStatus = [...emailStatusValues].filter((v) => !schemaValues.has(v));
      expect(onlyInEmailStatus).toHaveLength(0);
    });

    it('should have no values only in schema', () => {
      const emailStatusValues = new Set(Object.values(EMAIL_STATUS));
      const schemaValues = new Set(emailStatusSchema._def.values);
      const onlyInSchema = [...schemaValues].filter((v) => !emailStatusValues.has(v));
      expect(onlyInSchema).toHaveLength(0);
    });
  });

  describe('EmailState.status type must match emailStatusSchema', () => {
    it('EmailState status type should be inferred from emailStatusSchema', () => {
      const testStatus: EmailState['status'] = 'pending';
      const result = emailStatusSchema.safeParse(testStatus);
      expect(result.success).toBe(true);
    });

    it('each EMAIL_STATUS value should pass schema validation', () => {
      for (const [, value] of Object.entries(EMAIL_STATUS)) {
        const result = emailStatusSchema.safeParse(value);
        expect(result.success, `Expected '${value}' to pass schema validation`).toBe(true);
      }
    });

    it('each schema value should be usable as EmailStatus type', () => {
      const testEmailState: EmailState = {
        emailId: 'test-id',
        status: 'pending',
        indicators: [],
        verificationRequested: false,
        timeSpentMs: 0,
      };
      expect(emailStatusSchema.safeParse(testEmailState.status).success).toBe(true);

      const statuses: EmailState['status'][] = [...emailStatusSchema._def.values];
      for (const status of statuses) {
        const testState: EmailState['status'] = status;
        const result = emailStatusSchema.safeParse(testState);
        expect(result.success, `Expected '${status}' to be valid as EmailState.status`).toBe(true);
      }
    });
  });

  describe('Cross-definition validation', () => {
    it('EMAIL_STATUS values should be valid in schema', () => {
      Object.values(EMAIL_STATUS).forEach((value) => {
        const result = emailStatusSchema.safeParse(value);
        expect(result.success).toBe(true);
      });
    });

    it('schema values should be valid EMAIL_STATUS values', () => {
      const emailStatusValueSet = new Set(Object.values(EMAIL_STATUS));
      emailStatusSchema._def.values.forEach((value) => {
        expect(emailStatusValueSet.has(value)).toBe(true);
      });
    });

    it('should support all decision outcomes', () => {
      const decisionOutcomes: EmailState['status'][] = [
        'approved',
        'denied',
        'flagged',
        'deferred',
      ];
      for (const outcome of decisionOutcomes) {
        const testState: EmailState['status'] = outcome;
        expect(emailStatusSchema.safeParse(testState).success).toBe(true);
      }
    });

    it('should support verification flow', () => {
      const verificationFlow: EmailState['status'][] = [
        'pending',
        'opened',
        'request_verification',
      ];
      for (const status of verificationFlow) {
        const testState: EmailState['status'] = status;
        expect(emailStatusSchema.safeParse(testState).success).toBe(true);
      }
    });
  });
});
