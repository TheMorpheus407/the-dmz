import { act, cleanup, setup } from '@testing-library/svelte';
import { afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  setup();
});

afterEach(async () => {
  await act();
  cleanup();
});
