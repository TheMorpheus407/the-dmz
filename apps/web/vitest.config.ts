import { resolve } from 'node:path';

import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit(), svelteTesting({ autoCleanup: false })],
  resolve: {
    alias: {
      $lib: resolve('./src/lib'),
      $api: resolve('./src/lib/api'),
      $ui: resolve('./src/lib/ui'),
      $stores: resolve('./src/lib/stores'),
      $utils: resolve('./src/lib/utils'),
      $game: resolve('./src/lib/game'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
      include: ['src/**/*.{ts,svelte}'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/*.d.ts'],
    },
  },
});
