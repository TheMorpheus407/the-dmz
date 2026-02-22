<script lang="ts">
  import type { CategorizedApiError } from '$lib/api/types';
  import type { ErrorCopy, RouteSurface } from '$lib/api/error-copy';
  import { getErrorCopy, getAriaLivePriority, getSeverity } from '$lib/api/error-copy';

  import Button from './Button.svelte';

  interface Props {
    error: CategorizedApiError;
    surface: RouteSurface;
    onRetry?: () => void;
    onDismiss?: () => void;
    role?: string;
  }

  const { error, surface, onRetry, onDismiss, role = 'alert' }: Props = $props();

  const copy: ErrorCopy = $derived(getErrorCopy(error, surface));
  const ariaLive: 'polite' | 'assertive' = $derived(getAriaLivePriority(error.category));
  const severity: 'low' | 'medium' | 'high' = $derived(getSeverity(error.category));

  function handleRetry(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onRetry?.();
  }

  function handleDismiss(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onDismiss?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && onDismiss) {
      handleDismiss(new MouseEvent('click'));
    }
  }
</script>

<div
  class="error-panel error-panel--{severity}"
  {role}
  aria-live={ariaLive}
  aria-labelledby="error-panel-title"
  onkeydown={handleKeydown}
>
  <div class="error-panel__icon" aria-hidden="true">
    {#if severity === 'high'}
      ⚠
    {:else if severity === 'medium'}
      ▲
    {:else}
      ◆
    {/if}
  </div>

  <div class="error-panel__content">
    <h2 id="error-panel-title" class="error-panel__title">{copy.title}</h2>
    <p class="error-panel__message">{copy.message}</p>

    {#if error.code && (surface === 'admin' || surface === 'game')}
      <p class="error-panel__code">Error code: {error.code}</p>
    {/if}
  </div>

  <div class="error-panel__actions">
    {#if onRetry && error.retryable}
      <Button variant="secondary" size="sm" onclick={handleRetry}>
        {copy.retryLabel || 'Retry'}
      </Button>
    {/if}
    {#if onDismiss}
      <Button variant="ghost" size="sm" onclick={handleDismiss}>
        {copy.dismissLabel || 'Dismiss'}
      </Button>
    {/if}
  </div>
</div>

<style>
  .error-panel {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4);
    border: var(--border-default);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
    font-family: var(--font-ui);
    animation: error-panel-appear 200ms ease-out;
  }

  @keyframes error-panel-appear {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .error-panel--low {
    border-color: var(--color-warning);
    background-color: var(--color-warning-bg);
  }

  .error-panel--medium {
    border-color: var(--color-warning);
    background-color: var(--color-warning-bg);
  }

  .error-panel--high {
    border-color: var(--color-danger);
    background-color: var(--color-danger-bg);
  }

  .error-panel__icon {
    font-size: var(--text-xl);
    line-height: 1;
    flex-shrink: 0;
  }

  .error-panel--low .error-panel__icon {
    color: var(--color-warning);
  }

  .error-panel--medium .error-panel__icon {
    color: var(--color-warning);
  }

  .error-panel--high .error-panel__icon {
    color: var(--color-danger);
  }

  .error-panel__content {
    flex: 1;
    min-width: 0;
  }

  .error-panel__title {
    font-size: var(--text-base);
    font-weight: 600;
    margin: 0 0 var(--space-1) 0;
    color: var(--color-text);
  }

  .error-panel__message {
    font-size: var(--text-sm);
    color: var(--color-text);
    margin: 0;
    line-height: 1.5;
  }

  .error-panel__code {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin: var(--space-2) 0 0 0;
    font-family: var(--font-mono);
  }

  .error-panel__actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  @media (max-width: 480px) {
    .error-panel {
      flex-direction: column;
    }

    .error-panel__actions {
      flex-direction: row;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .error-panel {
      animation: none;
    }
  }
</style>
