import { act, cleanup, setup } from '@testing-library/svelte';
import * as axeMatchers from 'vitest-axe/matchers';
import { afterEach, beforeEach, expect } from 'vitest';

import 'vitest-axe/extend-expect';

expect.extend(axeMatchers);

beforeEach(() => {
  setup();
});

afterEach(async () => {
  await act();
  cleanup();
});
