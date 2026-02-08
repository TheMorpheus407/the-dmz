import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import Smoke from '../fixtures/Smoke.svelte';
import { render } from '../helpers/render';

describe('Smoke component accessibility', () => {
  it('has no WCAG 2.1 AA axe violations', async () => {
    const { container } = render(Smoke, { props: { message: 'Systems nominal' } });
    const results = await axe(container, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
      rules: {
        // Component tests render partial DOM, so landmark checks are validated in E2E.
        region: { enabled: false },
      },
    });

    expect(results).toHaveNoViolations();
  });
});
