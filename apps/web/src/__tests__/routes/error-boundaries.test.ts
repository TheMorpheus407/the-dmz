import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';

import ErrorState from '$lib/ui/components/ErrorState.svelte';
import type { CategorizedApiError } from '$lib/api/types';

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
}));

describe('Game Error Boundary', () => {
  it('renders error state with game surface', () => {
    const error: CategorizedApiError = {
      category: 'server',
      code: 'ROUTE_ERROR',
      message: 'System failure',
      status: 500,
      retryable: false,
    };

    const { container } = render(ErrorState, {
      props: {
        error,
        surface: 'game',
        title: 'SYSTEM_FAILURE',
        message: 'An unexpected error occurred in the game interface.',
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'RETURN_TO_BASE',
      },
    });

    const errorState = container.querySelector('.error-state');
    expect(errorState).toBeTruthy();
  });

  it('renders error title when provided', () => {
    const { getByText } = render(ErrorState, {
      props: {
        surface: 'game',
        title: 'SYSTEM_FAILURE',
        message: 'An unexpected error occurred in the game interface.',
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'RETURN_TO_BASE',
      },
    });

    expect(getByText('SYSTEM_FAILURE')).toBeTruthy();
  });

  it('renders diegetic-style messaging for game surface', () => {
    const { getByText } = render(ErrorState, {
      props: {
        surface: 'game',
        title: 'SYSTEM_FAILURE',
        message:
          'An unexpected error occurred in the game interface. Please retry or return to a safe location.',
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'RETURN_TO_BASE',
      },
    });

    expect(getByText(/game interface/)).toBeTruthy();
    expect(getByText('RETURN_TO_BASE')).toBeTruthy();
  });
});

describe('Admin Error Boundary', () => {
  it('renders professional error message for admin surface', () => {
    const { getByText } = render(ErrorState, {
      props: {
        surface: 'admin',
        title: 'Server Error',
        message: 'An unexpected error occurred. Please try again or return to the dashboard.',
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'Go to Dashboard',
      },
    });

    expect(getByText('Server Error')).toBeTruthy();
    expect(getByText('Go to Dashboard')).toBeTruthy();
  });

  it('shows request ID field when error has requestId', () => {
    const error: CategorizedApiError = {
      category: 'server',
      code: 'ROUTE_ERROR',
      message: 'An unexpected error occurred',
      status: 500,
      retryable: false,
      requestId: 'ERR-12345',
    };

    const { getByText } = render(ErrorState, {
      props: {
        error,
        surface: 'admin',
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'Go to Dashboard',
      },
    });

    expect(getByText(/ERR-12345/)).toBeTruthy();
  });
});

describe('Auth Error Boundary', () => {
  it('renders concise error message for auth surface', () => {
    const { getByText } = render(ErrorState, {
      props: {
        surface: 'auth',
        title: 'Something Went Wrong',
        message: 'Please try again.',
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'Sign In',
      },
    });

    expect(getByText('Something Went Wrong')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });
});

describe('Public Error Boundary', () => {
  it('renders minimal error message for public surface', () => {
    const { getByText } = render(ErrorState, {
      props: {
        surface: 'public',
        title: 'Page Unavailable',
        message: "We couldn't load this page. Please try again or go back home.",
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'Go Home',
      },
    });

    expect(getByText('Page Unavailable')).toBeTruthy();
    expect(getByText('Go Home')).toBeTruthy();
  });
});

describe('Recovery Actions', () => {
  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();

    const { getByText } = render(ErrorState, {
      props: {
        surface: 'game',
        title: 'SYSTEM_FAILURE',
        message: 'An unexpected error occurred.',
        onRetry,
        onAction: vi.fn(),
        actionLabel: 'RETURN_TO_BASE',
      },
    });

    const retryButton = getByText('Try Again');
    await retryButton.click();

    expect(onRetry).toHaveBeenCalled();
  });

  it('calls onAction when action button is clicked', async () => {
    const onAction = vi.fn();

    const { getByText } = render(ErrorState, {
      props: {
        surface: 'game',
        title: 'SYSTEM_FAILURE',
        message: 'An unexpected error occurred.',
        onRetry: vi.fn(),
        onAction,
        actionLabel: 'RETURN_TO_BASE',
      },
    });

    const actionButton = getByText('RETURN_TO_BASE');
    await actionButton.click();

    expect(onAction).toHaveBeenCalled();
  });

  it('shows retry button when onRetry is provided', () => {
    const { getByText } = render(ErrorState, {
      props: {
        surface: 'game',
        title: 'SYSTEM_FAILURE',
        message: 'An unexpected error occurred.',
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'RETURN_TO_BASE',
      },
    });

    expect(getByText('Try Again')).toBeTruthy();
  });

  it('shows action button when onAction is provided', () => {
    const { getByText } = render(ErrorState, {
      props: {
        surface: 'game',
        title: 'SYSTEM_FAILURE',
        message: 'An unexpected error occurred.',
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'RETURN_TO_BASE',
      },
    });

    expect(getByText('RETURN_TO_BASE')).toBeTruthy();
  });
});

describe('Accessibility', () => {
  it('has role status for error state', () => {
    const { container } = render(ErrorState, {
      props: {
        surface: 'game',
        title: 'SYSTEM_FAILURE',
        message: 'An unexpected error occurred.',
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'RETURN_TO_BASE',
      },
    });

    const errorState = container.querySelector('.error-state');
    expect(errorState?.getAttribute('role')).toBe('status');
  });

  it('renders buttons that are keyboard accessible', () => {
    const { getByText } = render(ErrorState, {
      props: {
        surface: 'game',
        title: 'SYSTEM_FAILURE',
        message: 'An unexpected error occurred.',
        onRetry: vi.fn(),
        onAction: vi.fn(),
        actionLabel: 'RETURN_TO_BASE',
      },
    });

    const retryButton = getByText('Try Again');
    expect(retryButton).toBeTruthy();

    const actionButton = getByText('RETURN_TO_BASE');
    expect(actionButton).toBeTruthy();
  });
});
