import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['src/shared/policies/__tests__/auth-abuse-policy.test.ts'],
    testTimeout: 30000,
  },
});
