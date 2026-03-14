<script lang="ts">
  import { offlineModeStore, type OfflineModeStatus } from '$lib/game/services/offline-mode';

  let status: OfflineModeStatus = $state('online');
  let isOfflinePlay: boolean = $state(false);
  let pendingCount: number = $state(0);

  $effect(() => {
    const unsubscribe = offlineModeStore.subscribe((state) => {
      status = state.status;
      isOfflinePlay = state.isOfflinePlay;
      pendingCount = state.pendingEventCount;
    });

    return unsubscribe;
  });

  function getStatusColor(s: OfflineModeStatus): string {
    switch (s) {
      case 'offline':
        return 'var(--color-warning, #ffb000)';
      case 'syncing':
        return 'var(--color-info, #33ccff)';
      case 'online':
        return 'var(--color-success, #33ff33)';
      default:
        return 'var(--color-text, #ffffff)';
    }
  }
</script>

{#if isOfflinePlay}
  <div class="offline-badge" style="--status-color: {getStatusColor(status)}">
    <span class="offline-badge__indicator"></span>
    <span class="offline-badge__text">
      PLAYING OFFLINE
      {#if pendingCount > 0}
        <span class="offline-badge__pending">({pendingCount} pending)</span>
      {/if}
    </span>
  </div>
{/if}

<style>
  .offline-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: rgba(10, 14, 20, 0.9);
    border: 1px solid var(--status-color);
    border-radius: 4px;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.75rem;
    color: var(--status-color);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    animation: pulse 2s ease-in-out infinite;
  }

  .offline-badge__indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--status-color);
    animation: blink 1s ease-in-out infinite;
  }

  .offline-badge__pending {
    opacity: 0.7;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
</style>
