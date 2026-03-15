import type { CircuitBreakerState } from './analytics.types.js';

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailure: null,
    isOpen: false,
  };

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  public constructor(failureThreshold: number, resetTimeout: number) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  public recordSuccess(): void {
    this.state.failures = 0;
    this.state.isOpen = false;
  }

  public recordFailure(): void {
    this.state.failures++;
    this.state.lastFailure = new Date();

    if (this.state.failures >= this.failureThreshold) {
      this.state.isOpen = true;
    }
  }

  public isAvailable(): boolean {
    if (!this.state.isOpen) {
      return true;
    }

    if (this.state.lastFailure) {
      const timeSinceLastFailure = Date.now() - this.state.lastFailure.getTime();
      if (timeSinceLastFailure >= this.resetTimeout) {
        this.state.isOpen = false;
        this.state.failures = 0;
        return true;
      }
    }

    return false;
  }

  public getState(): CircuitBreakerState {
    return { ...this.state };
  }

  public reset(): void {
    this.state = {
      failures: 0,
      lastFailure: null,
      isOpen: false,
    };
  }
}
