<script lang="ts">
  import ErrorState from '$lib/ui/components/ErrorState.svelte';
  import type { CategorizedApiError } from '$lib/api/types';

  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  const rawError = $derived($page.error);

  const errorForComponent = $derived.by((): CategorizedApiError | undefined => {
    if (!rawError) return undefined;
    return {
      category: 'server',
      code: 'ROUTE_ERROR',
      message: rawError.message || 'An unexpected error occurred',
      status: 500,
      retryable: false,
      requestId: `ERR-${Date.now().toString(36).toUpperCase()}`,
    };
  });

  function handleRetry() {
    void goto($page.url.pathname);
  }

  function handleGoToDashboard() {
    void goto('/admin');
  }
</script>

<div class="error-boundary">
  {#if errorForComponent}
    <ErrorState
      error={errorForComponent}
      surface="admin"
      onRetry={handleRetry}
      onAction={handleGoToDashboard}
      actionLabel="Go to Dashboard"
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
