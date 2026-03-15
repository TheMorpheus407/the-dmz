import { describe, it, expect, beforeEach } from 'vitest';

import { CircuitBreaker } from '../circuit-breaker.js';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(3, 1000);
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      expect(circuitBreaker.isAvailable()).toBe(true);
      expect(circuitBreaker.getState().isOpen).toBe(false);
      expect(circuitBreaker.getState().failures).toBe(0);
    });
  });

  describe('recordFailure', () => {
    it('should increment failure count', () => {
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getState().failures).toBe(1);
    });

    it('should not open circuit below threshold', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.isAvailable()).toBe(true);
      expect(circuitBreaker.getState().isOpen).toBe(false);
    });

    it('should open circuit after threshold', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getState().isOpen).toBe(true);
      expect(circuitBreaker.isAvailable()).toBe(false);
    });
  });

  describe('recordSuccess', () => {
    it('should reset failures after success', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();
      expect(circuitBreaker.getState().failures).toBe(0);
      expect(circuitBreaker.getState().isOpen).toBe(false);
    });

    it('should close circuit after it was opened', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getState().isOpen).toBe(true);
      circuitBreaker.recordSuccess();
      expect(circuitBreaker.getState().isOpen).toBe(false);
    });
  });

  describe('reset', () => {
    it('should fully reset circuit breaker state', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.reset();
      const state = circuitBreaker.getState();
      expect(state.failures).toBe(0);
      expect(state.isOpen).toBe(false);
      expect(state.lastFailure).toBeNull();
    });
  });
});
