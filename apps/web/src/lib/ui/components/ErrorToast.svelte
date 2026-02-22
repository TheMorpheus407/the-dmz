<script lang="ts">
  import type { CategorizedApiError } from '$lib/api/types';
  import type { ErrorCopy, RouteSurface } from '$lib/api/error-copy';
  import { getErrorCopy, getAriaLivePriority } from '$lib/api/error-copy';

  interface Props {
    error: CategorizedApiError;
    surface: RouteSurface;
    onRetry?: () => void;
    onDismiss: () => void;
    duration?: number;
  }

  const { error, surface, onRetry, onDismiss, duration = 5000 }: Props = $props();

  const copy: ErrorCopy = $derived(getErrorCopy(error, surface));
  const ariaLive: 'polite' | 'assertive' = $derived(getAriaLivePriority(error.category));
  let timer: ReturnType<typeof setTimeout> | null = null;

  function startTimer() {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      onDismiss();
    }, duration);
  }

  function stopTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function handleRetry(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    stopTimer();
    onRetry?.();
  }

  function handleDismiss(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    stopTimer();
    onDismiss();
  }

  function handleMouseEnter() {
    stopTimer();
  }

  function handleMouseLeave() {
    if (duration > 0) {
      startTimer();
    }
  }

  function handleFocus() {
    stopTimer();
  }

  function handleBlur() {
    if (duration > 0) {
      startTimer();
    }
  }
</script>

<div
  class="error-toast error-toast--{error.category}"
  role="alert"
  aria-live={ariaLive}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
  onfocus={handleFocus}
  onblur={handleBlur}
>
  <div class="error-toast__icon" aria-hidden="true">
    {#if error.category === 'network' || error.category === 'server'}
      ⚠
    {:else if error.category === 'rate_limiting'}
      ◷
    {:else if error.category === 'authentication' || error.category === 'authorization'}
      🔒
    {:else}
      ◆
    {/if}
  </div>

  <div class="error-toast__content">
    <p class="error-toast__message">{copy.message}</p>
  </div>

  <div class="error-toast__actions">
    {#if onRetry && error.retryable}
      <button type="button" class="error-toast__action" onclick={handleRetry}>
        {copy.retryLabel || 'Retry'}
      </button>
    {/if}
    <button
      type="button"
      class="error-toast__action error-toast__action--dismiss"
      onclick={handleDismiss}
      aria-label={copy.dismissLabel || 'Dismiss'}
    >
      ✕
    </button>
  </div>
</div>

<style>
  .error-toast {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border: var(--border-default);
    border-radius: var(--radius-md);
    background-color: var(--color-surface);
    box-shadow: var(--shadow-lg);
    font-family: var(--font-ui);
    max-width: 400px;
    animation: toast-appear 200ms ease-out;
  }

  @keyframes toast-appear {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .error-toast--authentication,
  .error-toast--authorization {
    border-color: var(--color-danger);
  }

  .error-toast--rate_limiting,
  .error-toast--server,
  .error-toast--network {
    border-color: var(--color-warning);
  }

  .error-toast--validation {
    border-color: var(--color-accent);
  }

  .error-toast__icon {
    font-size: var(--text-lg);
    line-height: 1;
    flex-shrink: 0;
  }

  .error-toast--authentication .error-toast__icon,
  .error-toast--authorization .error-toast__icon {
    color: var(--color-danger);
  }

  .error-toast--rate_limiting .error-toast__icon,
  .error-toast--server .error-toast__icon,
  .error-toast--network .error-toast__icon {
    color: var(--color-warning);
  }

  .error-toast__content {
    flex: 1;
    min-width: 0;
  }

  .error-toast__message {
    font-size: var(--text-sm);
    color: var(--color-text);
    margin: 0;
    line-height: 1.4;
  }

  .error-toast__actions {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  .error-toast__action {
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      color 150ms ease-out,
      background-color 150ms ease-out;
  }

  .error-toast__action:hover {
    color: var(--color-text);
    background-color: var(--color-bg-hover);
  }

  .error-toast__action:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .error-toast__action--dismiss {
    font-size: var(--text-sm);
    padding: var(--space-1);
  }

  @media (prefers-reduced-motion: reduce) {
    .error-toast {
      animation: none;
    }
  }
</style>
