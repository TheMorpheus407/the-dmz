import { describe, expect, it, vi } from 'vitest';

import ErrorPanel from '$lib/ui/components/ErrorPanel.svelte';
import type { CategorizedApiError } from '$lib/api/types';

import { render } from '../helpers/render';

describe('ErrorPanel', () => {
  const baseError: CategorizedApiError = {
    category: 'authentication',
    code: 'AUTH_TOKEN_EXPIRED',
    message: 'Token expired',
    status: 401,
    retryable: false,
  };

  it('renders error title and message for game surface', () => {
    const { getByText } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'game',
      },
    });

    expect(getByText('AUTH_FAILURE')).toBeTruthy();
    expect(getByText(/Session token/)).toBeTruthy();
  });

  it('renders error title and message for admin surface', () => {
    const { getByText } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'admin',
      },
    });

    expect(getByText('Authentication Failed')).toBeTruthy();
    expect(getByText(/session has expired/)).toBeTruthy();
  });

  it('renders error title and message for auth surface', () => {
    const { getByText } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'auth',
      },
    });

    expect(getByText('Sign In Failed')).toBeTruthy();
    expect(getByText(/Invalid email/)).toBeTruthy();
  });

  it('shows retry button when onRetry provided and error is retryable', () => {
    const retryableError: CategorizedApiError = {
      ...baseError,
      retryable: true,
    };
    const onRetry = vi.fn();

    const { getByText } = render(ErrorPanel, {
      props: {
        error: retryableError,
        surface: 'game',
        onRetry,
      },
    });

    expect(getByText('RETRY_AUTH')).toBeTruthy();
  });

  it('does not show retry button when error is not retryable', () => {
    const { queryByText } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'game',
        onRetry: vi.fn(),
      },
    });

    expect(queryByText('RETRY_AUTH')).toBeFalsy();
  });

  it('shows dismiss button when onDismiss provided', () => {
    const { getByText } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'game',
        onDismiss: vi.fn(),
      },
    });

    expect(getByText('DISMISS')).toBeTruthy();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    const retryableError: CategorizedApiError = {
      ...baseError,
      retryable: true,
    };

    const { getByText } = render(ErrorPanel, {
      props: {
        error: retryableError,
        surface: 'game',
        onRetry,
      },
    });

    getByText('RETRY_AUTH').click();
    expect(onRetry).toHaveBeenCalled();
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();

    const { getByText } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'game',
        onDismiss,
      },
    });

    getByText('DISMISS').click();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('has correct ARIA attributes', () => {
    const { container } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'game',
      },
    });

    const panel = container.querySelector('.error-panel');
    expect(panel?.getAttribute('role')).toBe('alert');
    expect(panel?.getAttribute('aria-live')).toBe('assertive');
    expect(panel?.getAttribute('aria-labelledby')).toBe('error-panel-title');
  });

  it('displays error code for game surface', () => {
    const { getByText } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'game',
      },
    });

    expect(getByText('Error code: AUTH_TOKEN_EXPIRED')).toBeTruthy();
  });

  it('displays error code for admin surface', () => {
    const { getByText } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'admin',
      },
    });

    expect(getByText('Error code: AUTH_TOKEN_EXPIRED')).toBeTruthy();
  });

  it('does not display error code for auth surface', () => {
    const { queryByText } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'auth',
      },
    });

    expect(queryByText(/Error code/)).toBeFalsy();
  });

  it('renders with correct severity class for high severity', () => {
    const { container } = render(ErrorPanel, {
      props: {
        error: baseError,
        surface: 'game',
      },
    });

    const panel = container.querySelector('.error-panel');
    expect(panel?.classList.contains('error-panel--high')).toBe(true);
  });

  it('renders with correct severity class for medium severity', () => {
    const serverError: CategorizedApiError = {
      ...baseError,
      category: 'server',
    };

    const { container } = render(ErrorPanel, {
      props: {
        error: serverError,
        surface: 'game',
      },
    });

    const panel = container.querySelector('.error-panel');
    expect(panel?.classList.contains('error-panel--medium')).toBe(true);
  });

  it('renders with correct severity class for low severity', () => {
    const validationError: CategorizedApiError = {
      ...baseError,
      category: 'validation',
    };

    const { container } = render(ErrorPanel, {
      props: {
        error: validationError,
        surface: 'game',
      },
    });

    const panel = container.querySelector('.error-panel');
    expect(panel?.classList.contains('error-panel--low')).toBe(true);
  });
});
