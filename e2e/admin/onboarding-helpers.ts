export const generateUniqueDomain = (): string =>
  `test-${Date.now()}-${Math.random().toFixed(6)}.example.com`;
