<script lang="ts">
  import { connectivityStore } from '$lib/stores/connectivity';
  import { offlineModeStore } from '$lib/game/services/offline-mode';
  import { Badge } from '$lib/ui';

  const syncStatus = $derived(() => {
    const conn = $connectivityStore;
    const offline = $offlineModeStore;

    if (conn.syncInProgress) {
      return { status: 'syncing', label: 'Syncing...', variant: 'info' as const };
    }

    if (conn.syncError) {
      return { status: 'error', label: 'Sync Error', variant: 'warning' as const };
    }

    if (!conn.online || offline.status === 'offline') {
      return { status: 'offline', label: 'Offline', variant: 'default' as const };
    }

    if (offline.pendingEventCount > 0) {
      return {
        status: 'pending',
        label: `${offline.pendingEventCount} Pending`,
        variant: 'info' as const,
      };
    }

    return { status: 'online', label: 'Online', variant: 'success' as const };
  });

  const retryInfo = $derived(() => {
    const conn = $connectivityStore;
    if (conn.syncInProgress && conn.retryCount > 0) {
      return `Retry ${conn.retryCount}/3`;
    }
    return null;
  });
</script>

<div class="sync-status">
  <Badge variant={syncStatus().variant}>
    {syncStatus().label}
  </Badge>
  {#if retryInfo()}
    <span class="sync-status__retry">{retryInfo()}</span>
  {/if}
</div>

<style>
  .sync-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .sync-status__retry {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
</style>
