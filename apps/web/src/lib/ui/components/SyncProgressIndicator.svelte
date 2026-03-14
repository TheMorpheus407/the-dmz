<script lang="ts">
  import { connectivityStore } from '$lib/stores/connectivity';
  import { offlineModeStore } from '$lib/game/services/offline-mode';

  const isVisible = $derived(() => {
    const conn = $connectivityStore;
    return conn.syncInProgress;
  });

  const progress = $derived(() => {
    const conn = $connectivityStore;
    const offline = $offlineModeStore;
    const total = offline.pendingEventCount;

    if (total === 0) {
      return { current: 0, total: 0, percentage: 0 };
    }

    const synced = total - conn.pendingEvents;
    return {
      current: synced,
      total,
      percentage: Math.round((synced / total) * 100),
    };
  });
</script>

{#if isVisible()}
  <div class="sync-progress">
    <div class="sync-progress__bar">
      <div class="sync-progress__fill" style="width: {progress().percentage}%"></div>
    </div>
    <span class="sync-progress__text">
      Syncing {progress().current} / {progress().total} events...
    </span>
  </div>
{/if}

<style>
  .sync-progress {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
  }

  .sync-progress__bar {
    flex: 1;
    height: 8px;
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .sync-progress__fill {
    height: 100%;
    background-color: var(--color-info);
    transition: width 0.3s ease;
  }

  .sync-progress__text {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
  }
</style>
