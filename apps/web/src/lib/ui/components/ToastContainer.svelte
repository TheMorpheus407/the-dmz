<script lang="ts">
  import { notifications, notificationQueue, uiStore } from '$lib/game/store/ui-store';
  import type { ToastAction } from '$lib/game/store/ui-store';

  import NotificationToast from './NotificationToast.svelte';

  const activeToasts = $derived($notifications);
  const queuedCount = $derived($notificationQueue.length);

  function handleDismiss(id: string) {
    uiStore.removeNotification(id);
  }

  function handleAction(action: ToastAction) {
    action.onClick();
  }
</script>

{#if activeToasts.length > 0}
  <div class="toast-container" role="region" aria-label="Notifications" aria-live="polite">
    {#each activeToasts as toast (toast.id)}
      <NotificationToast {toast} onDismiss={handleDismiss} onAction={handleAction} />
    {/each}

    {#if queuedCount > 0}
      <div class="toast-queue-indicator">
        +{queuedCount} more notification{queuedCount === 1 ? '' : 's'} queued
      </div>
    {/if}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: var(--space-4);
    right: var(--space-4);
    z-index: 1000;
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-3);
    pointer-events: none;
  }

  .toast-container :global(.toast) {
    pointer-events: auto;
  }

  .toast-queue-indicator {
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-md);
    text-align: center;
  }

  @media (max-width: 767px) {
    .toast-container {
      bottom: var(--space-2);
      right: var(--space-2);
      left: var(--space-2);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .toast-container {
      display: contents;
    }

    .toast-container :global(.toast) {
      position: static;
      margin-bottom: var(--space-2);
    }
  }
</style>
