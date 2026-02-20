import { describe, expect, it } from 'vitest';

import LoadingState from '$lib/ui/components/LoadingState.svelte';

import { render } from '../helpers/render';

describe('LoadingState', () => {
  it('renders spinner variant by default', () => {
    const { container } = render(LoadingState, {
      props: { loading: true },
    });

    const spinner = container.querySelector('.loading__spinner');
    expect(spinner).toBeTruthy();
  });

  it('renders dots variant', () => {
    const { container } = render(LoadingState, {
      props: { loading: true, variant: 'dots' },
    });

    const dots = container.querySelectorAll('.loading__dot');
    expect(dots.length).toBe(3);
  });

  it('renders skeleton variant', () => {
    const { container } = render(LoadingState, {
      props: { loading: true, variant: 'skeleton' },
    });

    const skeleton = container.querySelector('.loading__skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('displays message when provided', () => {
    const { getByText } = render(LoadingState, {
      props: { loading: true, message: 'Loading data...' },
    });

    expect(getByText('Loading data...')).toBeTruthy();
  });

  it('does not render when loading is false', () => {
    const { container } = render(LoadingState, {
      props: { loading: false },
    });

    expect(container.querySelector('.loading')).toBeFalsy();
  });

  it('has role status and aria-live', () => {
    const { container } = render(LoadingState, {
      props: { loading: true },
    });

    const loading = container.querySelector('.loading');
    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.getAttribute('aria-live')).toBe('polite');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
  });

  it('applies size classes', () => {
    const { container } = render(LoadingState, {
      props: { loading: true, size: 'lg' },
    });

    const loading = container.querySelector('.loading');
    expect(loading?.classList.contains('loading--lg')).toBe(true);
  });
});
