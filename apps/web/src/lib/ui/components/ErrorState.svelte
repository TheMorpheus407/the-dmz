<script lang="ts">
  import { onMount } from 'svelte';

  import type { CategorizedApiError } from '$lib/api/types';
  import type { ErrorCopy, RouteSurface } from '$lib/api/error-copy';
  import { getErrorCopy, getAriaLivePriority } from '$lib/api/error-copy';

  import Button from './Button.svelte';

  interface Props {
    error?: CategorizedApiError;
    surface: RouteSurface;
    title?: string;
    message?: string;
    onRetry?: () => void;
    onAction?: () => void;
    actionLabel?: string;
  }

  const { error, surface, title, message, onRetry, onAction, actionLabel }: Props = $props();

  const copy: ErrorCopy | null = $derived(error ? getErrorCopy(error, surface) : null);

  const displayTitle = $derived(title || copy?.title || 'Something went wrong');

  const displayMessage = $derived(message || copy?.message || 'Please try again later.');

  const ariaLivePriority = $derived(error ? getAriaLivePriority(error.category) : 'polite');

  let containerRef: HTMLDivElement | null = null;

  onMount(() => {
    const el = containerRef;
    if (el) {
      (el as HTMLElement).focus();
    }
  });

  function handleRetry(e: MouseEvent) {
    e.preventDefault();
    onRetry?.();
  }

  function handleAction(e: MouseEvent) {
    e.preventDefault();
    onAction?.();
  }

  function getIcon(category?: string): string {
    switch (category) {
      case 'network':
        return '⌁';
      case 'authentication':
      case 'authorization':
        return '⊘';
      case 'rate_limiting':
        return '◷';
      case 'not_found':
        return '⦰';
      case 'tenant_blocked':
        return '⊘';
      case 'validation':
        return '⚠';
      default:
        return '⚠';
    }
  }
</script>

<div
  class="error-state"
  role="alert"
  aria-live={ariaLivePriority}
  aria-atomic="true"
  tabindex="-1"
  bind:this={containerRef}
>
  <div class="error-state__icon" aria-hidden="true">
    {getIcon(error?.category)}
  </div>

  <h2 class="error-state__title" id="error-title">{displayTitle}</h2>
  <p class="error-state__message" id="error-message">{displayMessage}</p>

  <div class="error-state__actions">
    {#if onRetry}
      <Button variant="secondary" onclick={handleRetry}>
        {copy?.retryLabel || 'Try Again'}
      </Button>
    {/if}
    {#if onAction}
      <Button variant="primary" onclick={handleAction}>
        {actionLabel || 'Go Back'}
      </Button>
    {/if}
  </div>
</div>

<style>
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-8) var(--space-4);
    min-height: 300px;
  }

  .error-state__icon {
    font-size: 48px;
    line-height: 1;
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  .error-state__title {
    font-family: var(--font-ui);
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 var(--space-2) 0;
  }

  .error-state__message {
    font-family: var(--font-ui);
    font-size: var(--text-base);
    color: var(--color-text-muted);
    margin: 0 0 var(--space-6) 0;
    max-width: 400px;
    line-height: 1.5;
  }

  .error-state__actions {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
    justify-content: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .error-state__icon {
      animation: none;
    }
  }
</style>
