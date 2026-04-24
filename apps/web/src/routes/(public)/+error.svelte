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
      message: appError.message || 'Page unavailable',
      status: 500,
      retryable: false,
    };
  });

  function handleRetry() {
    void goto($page.url.pathname);
  }

  function handleGoHome() {
    void goto('/');
  }

  const errorMessage = $derived(
    requestId
      ? `${errorForComponent?.message || 'Page unavailable'} (Reference: ${requestId})`
      : errorForComponent?.message || 'Page unavailable',
  );
</script>

<div class="error-boundary">
  {#if errorForComponent}
    <ErrorState
      error={errorForComponent}
      surface="public"
      message={errorMessage}
      onRetry={handleRetry}
      onAction={handleGoHome}
      actionLabel="Go Home"
    />
  {:else}
    <ErrorState
      surface="public"
      title="Page Unavailable"
      message="We couldn't load this page. Please try again or go back home."
      onRetry={handleRetry}
      onAction={handleGoHome}
      actionLabel="Go Home"
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
