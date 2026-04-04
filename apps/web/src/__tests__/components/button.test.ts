import { describe, expect, it } from 'vitest';

import Button from '$lib/ui/components/Button.svelte';

import { render } from '../helpers/render';

import type { Snippet } from 'svelte';

describe('Button', () => {
  it('renders button', () => {
    const { container } = render(Button, {
      props: { children: (() => {}) as Snippet },
    });

    const button = container.querySelector('button');
    expect(button).toBeTruthy();
  });

  it('renders with correct variant class', () => {
    const { container } = render(Button, {
      props: { variant: 'danger', children: (() => {}) as Snippet },
    });

    const button = container.querySelector('button');
    expect(button?.classList.contains('button--danger')).toBe(true);
  });

  it('renders with correct size class', () => {
    const { container } = render(Button, {
      props: { size: 'lg', children: (() => {}) as Snippet },
    });

    const button = container.querySelector('button');
    expect(button?.classList.contains('button--lg')).toBe(true);
  });

  it('handles disabled state', () => {
    const { container } = render(Button, {
      props: { disabled: true, children: (() => {}) as Snippet },
    });

    const button = container.querySelector('button');
    expect(button?.disabled).toBe(true);
  });

  it('applies aria-label', () => {
    const { container } = render(Button, {
      props: { ariaLabel: 'Close dialog', children: (() => {}) as Snippet },
    });

    const button = container.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe('Close dialog');
  });

  it('calls onclick handler', () => {
    let clicked = false;
    const { container } = render(Button, {
      props: {
        onclick: () => {
          clicked = true;
        },
        children: (() => {}) as Snippet,
      },
    });

    container.querySelector('button')?.click();
    expect(clicked).toBe(true);
  });
});
