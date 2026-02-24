import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['src/modules/auth/__tests__/password-policy.test.ts'],
    testTimeout: 30000,
  },
});
