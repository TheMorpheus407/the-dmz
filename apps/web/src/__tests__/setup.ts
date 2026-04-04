import { act, cleanup, setup } from '@testing-library/svelte';
import { afterEach, beforeEach, expect, vi } from 'vitest';

import type { MatcherResult } from 'vitest';

interface AxeViolation {
  id: string;
  description: string;
  nodes: unknown[];
}

interface AxeResults {
  violations: AxeViolation[];
}

expect.extend({
  async toHaveNoViolations(this: MatcherResult, received: AxeResults): Promise<MatcherResult> {
    const violations = received.violations ?? [];
    const pass = violations.length === 0;

    return {
      pass,
      message: pass
        ? () => 'No accessibility violations found.'
        : () => {
            const violationList = violations
              .map((v: AxeViolation) => `  - ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
              .join('\n');
            return (
              `Expected no accessibility violations, but found ${violations.length} violation(s):\n` +
              violationList +
              `\n\nRun axe-core directly to debug: await axe(container)`
            );
          },
    };
  },
});

vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

beforeEach(() => {
  setup();
});

afterEach(async () => {
  await act();
  cleanup();
});
