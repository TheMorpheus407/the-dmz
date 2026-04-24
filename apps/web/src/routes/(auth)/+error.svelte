<script lang="ts">
  import ErrorState from '$lib/ui/components/ErrorState.svelte';
  import type { CategorizedApiError } from '$lib/api/types';

  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  const rawError = $derived($page.error);

  interface AppError {
    message?: string;
    code?: string;
    requestId?: string;
  }

  const appError = $derived(rawError as AppError | null);
  const requestId = $derived(appError?.requestId);

  const errorForComponent = $derived.by((): CategorizedApiError | undefined => {
    if (!appError) return undefined;
    return {
      category: 'server',
      code: appError.code || 'ROUTE_ERROR',
      message: appError.message || 'Something went wrong',
      status: 500,
      retryable: false,
    };
  });

  function handleRetry() {
    void goto($page.url.pathname);
  }

  function handleGoToLogin() {
    void goto('/login');
  }

  const errorMessage = $derived(
    requestId
      ? `${errorForComponent?.message || 'Something went wrong'} (Reference: ${requestId})`
      : errorForComponent?.message || 'Something went wrong',
  );
</script>

<div class="error-boundary">
  {#if errorForComponent}
    <ErrorState
      error={errorForComponent}
      surface="auth"
      message={errorMessage}
      onRetry={handleRetry}
      onAction={handleGoToLogin}
      actionLabel="Sign In"
    />
  {:else}
    <ErrorState
      surface="auth"
      title="Something Went Wrong"
      message="Please try again."
      onRetry={handleRetry}
      onAction={handleGoToLogin}
      actionLabel="Sign In"
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
