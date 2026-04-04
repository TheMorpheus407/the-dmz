import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: ['src/__tests__/setup.ts', 'src/__tests__/integration-setup.ts'],
    },
  }),
);
