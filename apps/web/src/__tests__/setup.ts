import { act, cleanup, setup } from '@testing-library/svelte';
import * as axeMatchers from 'vitest-axe/matchers';
import { afterEach, beforeEach, expect, vi } from 'vitest';

import 'vitest-axe/extend-expect';

expect.extend(axeMatchers);

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
