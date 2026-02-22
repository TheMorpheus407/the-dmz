import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import ErrorToast from '$lib/ui/components/ErrorToast.svelte';
import type { CategorizedApiError } from '$lib/api/types';

import { render } from '../helpers/render';

describe('ErrorToast', () => {
  const baseError: CategorizedApiError = {
    category: 'network',
    code: 'NETWORK_ERROR',
    message: 'Network request failed',
    status: 0,
    retryable: true,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders error message for game surface', () => {
    const { getByText } = render(ErrorToast, {
      props: {
        error: baseError,
        surface: 'game',
        onDismiss: vi.fn(),
      },
    });

    expect(getByText(/Connection lost/)).toBeTruthy();
  });

  it('renders error message for admin surface', () => {
    const { getByText } = render(ErrorToast, {
      props: {
        error: baseError,
        surface: 'admin',
        onDismiss: vi.fn(),
      },
    });

    expect(getByText(/Unable to connect/)).toBeTruthy();
  });

  it('shows retry button when onRetry provided and error is retryable', () => {
    const onRetry = vi.fn();

    const { getByText } = render(ErrorToast, {
      props: {
        error: baseError,
        surface: 'game',
        onRetry,
        onDismiss: vi.fn(),
      },
    });

    expect(getByText('RECONNECT')).toBeTruthy();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();

    const { getByText } = render(ErrorToast, {
      props: {
        error: baseError,
        surface: 'game',
        onRetry,
        onDismiss,
      },
    });

    getByText('RECONNECT').click();
    expect(onRetry).toHaveBeenCalled();
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();

    const { getByLabelText } = render(ErrorToast, {
      props: {
        error: baseError,
        surface: 'game',
        onDismiss,
      },
    });

    getByLabelText('DISMISS').click();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('has correct ARIA attributes', () => {
    const { container } = render(ErrorToast, {
      props: {
        error: baseError,
        surface: 'game',
        onDismiss: vi.fn(),
      },
    });

    const toast = container.querySelector('.error-toast');
    expect(toast?.getAttribute('role')).toBe('alert');
    expect(toast?.getAttribute('aria-live')).toBe('polite');
  });

  it('has correct category class', () => {
    const { container } = render(ErrorToast, {
      props: {
        error: baseError,
        surface: 'game',
        onDismiss: vi.fn(),
      },
    });

    const toast = container.querySelector('.error-toast');
    expect(toast?.classList.contains('error-toast--network')).toBe(true);
  });
});
