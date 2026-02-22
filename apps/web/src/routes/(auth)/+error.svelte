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
      message: rawError.message || 'Something went wrong',
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
</script>

<div class="error-boundary">
  {#if errorForComponent}
    <ErrorState
      error={errorForComponent}
      surface="auth"
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
