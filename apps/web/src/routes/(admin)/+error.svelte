<script lang="ts">
  import ErrorState from '$lib/ui/components/ErrorState.svelte';
  import type { CategorizedApiError, ApiErrorCategory } from '$lib/api/types';
  import { mapStatusToErrorCategory } from '$lib/api/error-copy';

  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  const rawError = $derived($page.error);
  const status = $derived($page.status);

  interface AppError {
    message?: string;
    code?: string;
    requestId?: string;
  }

  const appError = $derived(rawError as AppError | null);

  const errorForComponent = $derived.by((): CategorizedApiError | undefined => {
    if (!appError) return undefined;

    if (appError.code === 'UNAUTHENTICATED') {
      return {
        category: 'authentication',
        code: appError.code || 'AUTH_UNAUTHORIZED',
        message: appError.message || 'Your session has expired. Please sign in again.',
        status: 401,
        retryable: false,
      };
    }

    if (appError.code === 'FORBIDDEN') {
      return {
        category: 'authorization',
        code: appError.code || 'AUTH_FORBIDDEN',
        message: appError.message || 'You do not have permission to perform this action.',
        status: 403,
        retryable: false,
      };
    }

    const category: ApiErrorCategory =
      appError.code === 'TENANT_BLOCKED' ? 'authorization' : mapStatusToErrorCategory(status);

    return {
      category,
      code: appError.code || 'ROUTE_ERROR',
      message: appError.message || 'An unexpected error occurred',
      status: status || 500,
      retryable: false,
    };
  });

  function handleRetry() {
    void goto($page.url.pathname);
  }

  function handleGoToDashboard() {
    void goto('/admin');
  }

  function handleGoToLogin() {
    void goto('/login');
  }

  const showLoginOption = $derived(
    errorForComponent?.category === 'authentication' || errorForComponent?.status === 401,
  );
</script>

<div class="error-boundary">
  {#if errorForComponent}
    <ErrorState
      error={errorForComponent}
      surface="admin"
      onRetry={handleRetry}
      onAction={showLoginOption ? handleGoToLogin : handleGoToDashboard}
      actionLabel={showLoginOption ? 'Sign In' : 'Go to Dashboard'}
    />
  {:else}
    <ErrorState
      surface="admin"
      title="Server Error"
      message="An unexpected error occurred. Please try again or return to the dashboard. Reference ID has been logged for support."
      onRetry={handleRetry}
      onAction={handleGoToDashboard}
      actionLabel="Go to Dashboard"
    />
  {/if}
</div>

<style>
  .error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--space-4);
    background-color: var(--color-bg);
  }
</style>
