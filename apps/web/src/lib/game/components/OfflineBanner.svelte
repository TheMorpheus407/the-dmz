<script lang="ts">
  import { offlineModeStore } from '$lib/game/services/offline-mode';
  import Button from '$lib/ui/components/Button.svelte';

  let status: 'offline' | 'online' | 'syncing' = $state('online');
  let isOfflinePlay: boolean = $state(false);
  let pendingCount: number = $state(0);
  let lastSyncAt: string | null = $state(null);

  $effect(() => {
    const unsubscribe = offlineModeStore.subscribe((state) => {
      status = state.status;
      isOfflinePlay = state.isOfflinePlay;
      pendingCount = state.pendingEventCount;
      lastSyncAt = state.lastSyncAt;
    });

    return unsubscribe;
  });

  async function handleSync() {
    await offlineModeStore.sync();
  }

  function formatLastSync(isoString: string | null): string {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  }
</script>

{#if isOfflinePlay && status === 'offline'}
  <div class="offline-banner">
    <div class="offline-banner__content">
      <div class="offline-banner__icon">!</div>
      <div class="offline-banner__text">
        <span class="offline-banner__title">You are currently playing offline</span>
        <span class="offline-banner__subtitle">
          {#if pendingCount > 0}
            {pendingCount} action{pendingCount === 1 ? '' : 's'} pending sync
          {:else}
            All progress saved locally
          {/if}
          {#if lastSyncAt}
            | Last synced: {formatLastSync(lastSyncAt)}
          {/if}
        </span>
      </div>
      <Button variant="ghost" size="sm" onclick={handleSync}>Sync Now</Button>
    </div>
  </div>
{/if}

<style>
  .offline-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(255, 176, 0, 0.15);
    border-bottom: 1px solid var(--color-warning, #ffb000);
    backdrop-filter: blur(8px);
  }

  .offline-banner__content {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .offline-banner__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: var(--color-warning, #ffb000);
    border-radius: 50%;
    color: var(--color-bg, #0a0e14);
    font-weight: bold;
    font-size: 0.875rem;
    flex-shrink: 0;
  }

  .offline-banner__text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .offline-banner__title {
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.875rem;
    color: var(--color-warning, #ffb000);
    font-weight: 600;
  }

  .offline-banner__subtitle {
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 0.75rem;
    color: var(--color-text-muted, #888);
  }
</style>
