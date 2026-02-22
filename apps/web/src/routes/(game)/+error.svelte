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
      message: rawError.message || 'System failure',
      status: 500,
      retryable: false,
    };
  });

  function handleRetry() {
    void goto($page.url.pathname);
  }

  function handleGoToSafeRoute() {
    void goto('/');
  }
</script>

<div class="error-boundary">
  {#if errorForComponent}
    <ErrorState
      error={errorForComponent}
      surface="game"
      onRetry={handleRetry}
      onAction={handleGoToSafeRoute}
      actionLabel="RETURN_TO_BASE"
    />
  {:else}
    <ErrorState
      surface="game"
      title="SYSTEM_FAILURE"
      message="An unexpected error occurred in the game interface. Please retry or return to a safe location."
      onRetry={handleRetry}
      onAction={handleGoToSafeRoute}
      actionLabel="RETURN_TO_BASE"
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
