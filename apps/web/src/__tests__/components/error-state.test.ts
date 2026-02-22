import { describe, expect, it, vi } from 'vitest';

import ErrorState from '$lib/ui/components/ErrorState.svelte';
import type { CategorizedApiError } from '$lib/api/types';

import { render } from '../helpers/render';

describe('ErrorState', () => {
  const baseError: CategorizedApiError = {
    category: 'network',
    code: 'NETWORK_ERROR',
    message: 'Network request failed',
    status: 0,
    retryable: true,
  };

  it('renders default title and message when no error provided', () => {
    const { getByText } = render(ErrorState, {
      props: {
        surface: 'game',
      },
    });

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText(/Please try again later/)).toBeTruthy();
  });

  it('renders error title and message when error provided', () => {
    const { getByText } = render(ErrorState, {
      props: {
        error: baseError,
        surface: 'game',
      },
    });

    expect(getByText('NETWORK_FAILURE')).toBeTruthy();
    expect(getByText(/Connection lost/)).toBeTruthy();
  });

  it('renders custom title when provided', () => {
    const { getByText } = render(ErrorState, {
      props: {
        error: baseError,
        surface: 'game',
        title: 'Custom Error Title',
      },
    });

    expect(getByText('Custom Error Title')).toBeTruthy();
  });

  it('renders custom message when provided', () => {
    const { getByText } = render(ErrorState, {
      props: {
        error: baseError,
        surface: 'game',
        message: 'Custom error message',
      },
    });

    expect(getByText('Custom error message')).toBeTruthy();
  });

  it('shows retry button when onRetry provided', () => {
    const onRetry = vi.fn();

    const { getByText } = render(ErrorState, {
      props: {
        error: baseError,
        surface: 'game',
        onRetry,
      },
    });

    expect(getByText('RECONNECT')).toBeTruthy();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();

    const { getByText } = render(ErrorState, {
      props: {
        error: baseError,
        surface: 'game',
        onRetry,
      },
    });

    getByText('RECONNECT').click();
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows action button when onAction provided', () => {
    const onAction = vi.fn();

    const { getByText } = render(ErrorState, {
      props: {
        error: baseError,
        surface: 'game',
        onAction,
        actionLabel: 'Go Home',
      },
    });

    expect(getByText('Go Home')).toBeTruthy();
  });

  it('calls onAction when action button clicked', () => {
    const onAction = vi.fn();

    const { getByText } = render(ErrorState, {
      props: {
        error: baseError,
        surface: 'game',
        onAction,
        actionLabel: 'Go Home',
      },
    });

    getByText('Go Home').click();
    expect(onAction).toHaveBeenCalled();
  });

  it('renders with correct icon for network error', () => {
    const { container } = render(ErrorState, {
      props: {
        error: baseError,
        surface: 'game',
      },
    });

    const icon = container.querySelector('.error-state__icon');
    expect(icon?.textContent).toBe('⌁');
  });

  it('renders with correct icon for auth error', () => {
    const authError: CategorizedApiError = {
      ...baseError,
      category: 'authentication',
    };

    const { container } = render(ErrorState, {
      props: {
        error: authError,
        surface: 'game',
      },
    });

    const icon = container.querySelector('.error-state__icon');
    expect(icon?.textContent).toBe('⊘');
  });

  it('has role status', () => {
    const { container } = render(ErrorState, {
      props: {
        error: baseError,
        surface: 'game',
      },
    });

    const state = container.querySelector('.error-state');
    expect(state?.getAttribute('role')).toBe('status');
  });
});
