<script lang="ts">
  import type { Toast, ToastAction } from '$lib/game/store/ui-store';

  interface Props {
    toast: Toast;
    onDismiss: (id: string) => void;
    onAction?: (action: ToastAction) => void;
  }

  const { toast, onDismiss, onAction }: Props = $props();

  const ICONS: Record<string, string> = {
    decision: '◉',
    threat: '⚠',
    incident: '◆',
    breach: '✸',
    system: '⌘',
    achievement: '★',
    info: '○',
    success: '✓',
    warning: '▲',
    error: '✗',
  };

  const DURATIONS: Record<string, number> = {
    decision: 5000,
    threat: 8000,
    incident: 10000,
    breach: 0,
    system: 4000,
    achievement: 6000,
    info: 5000,
    success: 5000,
    warning: 8000,
    error: 10000,
  };

  const TYPE_LABELS: Record<string, string> = {
    decision: 'DECISION',
    threat: 'THREAT',
    incident: 'INCIDENT',
    breach: 'BREACH',
    system: 'SYSTEM',
    achievement: 'ACHIEVEMENT',
    info: 'INFO',
    success: 'SUCCESS',
    warning: 'WARNING',
    error: 'ERROR',
  };

  let progress = $state(100);
  let timer: ReturnType<typeof setInterval> | null = null;
  let isExiting = $state(false);

  const icon = $derived(ICONS[toast.type] || '○');
  const typeLabel = $derived(TYPE_LABELS[toast.type] || 'INFO');
  const duration = $derived(toast.duration ?? DURATIONS[toast.type] ?? 5000);
  const isPersistent = $derived(duration === 0);

  function startProgress() {
    if (isPersistent || duration <= 0) return;

    const startTime = Date.now();
    const updateInterval = 50;

    timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      progress = remaining;

      if (remaining <= 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    }, updateInterval);
  }

  function stopProgress() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function handleDismiss(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    isExiting = true;
    stopProgress();
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  }

  function handleAction(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (toast.action && onAction) {
      onAction(toast.action);
    }
  }

  function handleMouseEnter() {
    stopProgress();
  }

  function handleMouseLeave() {
    if (!isPersistent) {
      startProgress();
    }
  }

  $effect(() => {
    startProgress();
    return () => stopProgress();
  });
</script>

<div
  class="toast toast--{toast.type}"
  class:toast--exiting={isExiting}
  role="alert"
  aria-live={toast.type === 'breach' ? 'assertive' : 'polite'}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <div class="toast__header">
    <span class="toast__icon" aria-hidden="true">{icon}</span>
    <span class="toast__type">[{typeLabel}]</span>
    {#if toast.source}
      <span class="toast__source">{toast.source}</span>
    {/if}
    <button
      type="button"
      class="toast__dismiss"
      onclick={handleDismiss}
      aria-label="Dismiss notification"
    >
      ✕
    </button>
  </div>

  <div class="toast__content">
    {#if toast.title}
      <p class="toast__title">{toast.title}</p>
    {/if}
    <p class="toast__message">{toast.message}</p>
    {#if toast.action}
      <button type="button" class="toast__action" onclick={handleAction}>
        {toast.action.label}
      </button>
    {/if}
  </div>

  {#if !isPersistent}
    <div class="toast__progress">
      <div class="toast__progress-bar" style="width: {progress}%"></div>
    </div>
  {/if}
</div>

<style>
  .toast {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-md);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text);
    max-width: 360px;
    min-width: 280px;
    animation: toast-slide-in 300ms ease-out;
    box-shadow: var(--shadow-lg);
  }

  @keyframes toast-slide-in {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .toast--exiting {
    animation: toast-slide-out 200ms ease-in forwards;
  }

  @keyframes toast-slide-out {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }

  .toast__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .toast__icon {
    font-size: var(--text-md);
    line-height: 1;
    flex-shrink: 0;
  }

  .toast__type {
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .toast__source {
    flex: 1;
    color: var(--color-text-muted);
    font-size: var(--text-xs);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toast__dismiss {
    margin-left: auto;
    padding: var(--space-1);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      color 150ms ease-out,
      background-color 150ms ease-out;
  }

  .toast__dismiss:hover {
    color: var(--color-text);
    background-color: var(--color-bg-hover);
  }

  .toast__dismiss:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .toast__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .toast__title {
    margin: 0;
    font-weight: 600;
    font-size: var(--text-sm);
    color: var(--color-text);
    line-height: 1.4;
  }

  .toast__message {
    margin: 0;
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-document-muted);
    line-height: 1.5;
  }

  .toast__action {
    margin-top: var(--space-1);
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-accent);
    background: transparent;
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      color 150ms ease-out,
      background-color 150ms ease-out;
    align-self: flex-start;
  }

  .toast__action:hover {
    color: var(--color-bg-primary);
    background-color: var(--color-accent);
  }

  .toast__action:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .toast__progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background-color: var(--color-bg-primary);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    overflow: hidden;
  }

  .toast__progress-bar {
    height: 100%;
    transition: width 50ms linear;
  }

  .toast--decision {
    border-color: var(--color-safe);
  }

  .toast--decision .toast__icon,
  .toast--decision .toast__type {
    color: var(--color-safe);
  }

  .toast--decision .toast__progress-bar {
    background-color: var(--color-safe);
  }

  .toast--threat {
    border-color: var(--color-warning);
  }

  .toast--threat .toast__icon,
  .toast--threat .toast__type {
    color: var(--color-warning);
  }

  .toast--threat .toast__progress-bar {
    background-color: var(--color-warning);
  }

  .toast--incident {
    border-color: var(--color-flagged);
  }

  .toast--incident .toast__icon,
  .toast--incident .toast__type {
    color: var(--color-flagged);
  }

  .toast--incident .toast__progress-bar {
    background-color: var(--color-flagged);
  }

  .toast--breach {
    border-color: var(--color-critical);
    background-color: rgba(255, 51, 51, 0.1);
  }

  .toast--breach .toast__icon,
  .toast--breach .toast__type {
    color: var(--color-critical);
  }

  .toast--system {
    border-color: var(--color-info);
  }

  .toast--system .toast__icon,
  .toast--system .toast__type {
    color: var(--color-info);
  }

  .toast--system .toast__progress-bar {
    background-color: var(--color-info);
  }

  .toast--achievement {
    border-color: var(--color-amber);
    background-color: rgba(255, 176, 0, 0.05);
  }

  .toast--achievement .toast__icon,
  .toast--achievement .toast__type {
    color: var(--color-amber);
  }

  .toast--achievement .toast__progress-bar {
    background-color: var(--color-amber);
  }

  .toast--info {
    border-color: var(--color-phosphor-green);
  }

  .toast--info .toast__icon,
  .toast--info .toast__type {
    color: var(--color-phosphor-green);
  }

  .toast--info .toast__progress-bar {
    background-color: var(--color-phosphor-green);
  }

  .toast--success {
    border-color: var(--color-safe);
  }

  .toast--success .toast__icon,
  .toast--success .toast__type {
    color: var(--color-safe);
  }

  .toast--success .toast__progress-bar {
    background-color: var(--color-safe);
  }

  .toast--warning {
    border-color: var(--color-warning);
  }

  .toast--warning .toast__icon,
  .toast--warning .toast__type {
    color: var(--color-warning);
  }

  .toast--warning .toast__progress-bar {
    background-color: var(--color-warning);
  }

  .toast--error {
    border-color: var(--color-danger);
  }

  .toast--error .toast__icon,
  .toast--error .toast__type {
    color: var(--color-danger);
  }

  .toast--error .toast__progress-bar {
    background-color: var(--color-danger);
  }

  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation: none;
    }

    .toast--exiting {
      animation: none;
    }

    .toast__progress-bar {
      transition: none;
    }
  }
</style>
