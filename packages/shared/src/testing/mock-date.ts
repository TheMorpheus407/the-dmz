export const MOCK_NOW = new Date('2024-01-15T10:00:00Z');

export function createMockDate(overrides?: Partial<{ daysFromNow: number; msFromNow: number }>): Date {
  if (overrides?.daysFromNow !== undefined) {
    return new Date(MOCK_NOW.getTime() + overrides.daysFromNow * 24 * 60 * 60 * 1000);
  }
  if (overrides?.msFromNow !== undefined) {
    return new Date(MOCK_NOW.getTime() + overrides.msFromNow);
  }
  return new Date(MOCK_NOW);
}

export function createMockTimestamp(): number {
  return MOCK_NOW.getTime();
}
