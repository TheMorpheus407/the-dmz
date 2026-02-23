import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['src/**/__tests__/logging-contract.test.ts'],
    testTimeout: 30000,
  },
});
