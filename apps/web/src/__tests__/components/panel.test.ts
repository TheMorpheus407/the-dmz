import { describe, expect, it } from 'vitest';

import Panel from '$lib/ui/components/Panel.svelte';

import { render } from '../helpers/render';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('Panel', () => {
  it('renders panel', () => {
    const { container } = render(Panel, {
      props: { children: () => 'Panel content' as any },
    });

    const panel = container.querySelector('.panel');
    expect(panel).toBeTruthy();
  });

  it('renders with correct variant class', () => {
    const { container } = render(Panel, {
      props: { variant: 'elevated', children: () => 'Elevated panel' as any },
    });

    const panel = container.querySelector('.panel');
    expect(panel?.classList.contains('panel--elevated')).toBe(true);
  });

  it('applies aria-label', () => {
    const { container } = render(Panel, {
      props: { ariaLabel: 'Main panel', children: () => 'Content' as any },
    });

    const panel = container.querySelector('.panel');
    expect(panel?.getAttribute('aria-label')).toBe('Main panel');
  });

  it('renders with outlined variant', () => {
    const { container } = render(Panel, {
      props: { variant: 'outlined', children: () => 'Outlined' as any },
    });

    const panel = container.querySelector('.panel');
    expect(panel?.classList.contains('panel--outlined')).toBe(true);
  });
});
