import { describe, expect, it } from 'vitest';

import Smoke from '../fixtures/Smoke.svelte';
import { render } from '../helpers/render';

describe('Smoke component', () => {
  it('renders provided message', () => {
    const { getByText } = render(Smoke, { props: { message: 'Test console online' } });

    expect(getByText('Test console online')).toBeTruthy();
  });
});
