import { describe, expect, it } from 'vitest';

import Badge from '$lib/ui/components/Badge.svelte';

import { render } from '../helpers/render';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('Badge', () => {
  it('renders badge', () => {
    const { container } = render(Badge, {
      props: { children: () => 'New' as any },
    });

    const badge = container.querySelector('.badge');
    expect(badge).toBeTruthy();
  });

  it('renders with correct variant class', () => {
    const { container } = render(Badge, {
      props: { variant: 'success', children: () => 'Active' as any },
    });

    const badge = container.querySelector('.badge');
    expect(badge?.classList.contains('badge--success')).toBe(true);
  });

  it('applies aria-label', () => {
    const { container } = render(Badge, {
      props: { ariaLabel: 'Status indicator', children: () => '5' as any },
    });

    const badge = container.querySelector('.badge');
    expect(badge?.getAttribute('aria-label')).toBe('Status indicator');
  });

  it('has role status', () => {
    const { container } = render(Badge, {
      props: { children: () => 'Info' as any },
    });

    const badge = container.querySelector('.badge');
    expect(badge?.getAttribute('role')).toBe('status');
  });
});
