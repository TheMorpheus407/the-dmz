<script lang="ts">
  import { Button, Badge } from '$lib/ui';
  import type { ClientLease } from '@the-dmz/shared/types';
  import VirtualizedList from '$lib/ui/components/VirtualizedList.svelte';
  import { effectiveVirtualization } from '$lib/stores/settings';

  interface Props {
    clients: ClientLease[];
    pageSize?: number;
    useVirtualization?: boolean;
    onviewclient?: (clientId: string) => void;
  }

  const {
    clients = [],
    pageSize = 6,
    useVirtualization: propUseVirtualization,
    onviewclient = () => {},
  }: Props = $props();

  const storeVirtualizationEnabled = $derived($effectiveVirtualization);
  const virtualizationEnabled = $derived(propUseVirtualization ?? storeVirtualizationEnabled);

  interface VirtualClientItem {
    id: string;
    data: ClientLease;
  }

  const virtualClients: VirtualClientItem[] = $derived(
    clients.map((client) => ({
      id: client.clientId,
      data: client,
    })),
  );

  let currentPage = $state(1);
  const totalPages = $derived(Math.ceil(clients.length / pageSize) || 1);
  const paginatedClients = $derived(
    clients.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  );

  function prevPage() {
    if (currentPage > 1) currentPage--;
  }

  function nextPage() {
    if (currentPage < totalPages) currentPage++;
  }

  function getDaysRemaining(leaseEndDay: number | null, currentDay: number): number {
    if (leaseEndDay === null) return Infinity;
    return leaseEndDay - currentDay;
  }

  function formatStorage(rackUnitsU: number): string {
    if (rackUnitsU >= 1000) {
      return `${(rackUnitsU / 1000).toFixed(1)} PB`;
    }
    if (rackUnitsU >= 1) {
      return `${rackUnitsU} TB`;
    }
    return `${rackUnitsU * 1000} GB`;
  }

  function getLeaseStatus(daysRemaining: number): 'active' | 'expiring' | 'expired' {
    if (daysRemaining <= 0) return 'expired';
    if (daysRemaining <= 7) return 'expiring';
    return 'active';
  }
</script>

<div class="client-list">
  <div class="client-list__header">
    <h3 class="client-list__title">Active Clients</h3>
    <span class="client-list__count">[{clients.length}]</span>
  </div>

  {#if clients.length === 0}
    <div class="client-list__empty">
      <span class="client-list__empty-text">No active clients</span>
    </div>
  {:else if virtualizationEnabled}
    <div class="client-list__virtual">
      <VirtualizedList
        items={virtualClients as Array<{ id: string | number; data: unknown }>}
        itemHeight={120}
        containerHeight={400}
        overscan={3}
      >
        {#snippet renderItem({
          item,
        }: {
          item: { id: string | number; data: unknown };
          index: number;
        })}
          {@const client = item.data as ClientLease}
          <div class="client-card">
            <div class="client-card__header">
              <span class="client-card__name">{client.clientName}</span>
              <Badge
                variant={getLeaseStatus(getDaysRemaining(client.leaseEndDay, 1)) === 'active'
                  ? 'success'
                  : getLeaseStatus(getDaysRemaining(client.leaseEndDay, 1)) === 'expiring'
                    ? 'warning'
                    : 'danger'}
                size="sm"
              >
                {getLeaseStatus(getDaysRemaining(client.leaseEndDay, 1)) === 'active'
                  ? 'ACTIVE'
                  : getLeaseStatus(getDaysRemaining(client.leaseEndDay, 1)) === 'expiring'
                    ? 'EXPIRING'
                    : 'EXPIRED'}
              </Badge>
            </div>
            <div class="client-card__details">
              <div class="client-card__detail">
                <span class="client-card__label">Storage:</span>
                <span class="client-card__value">{formatStorage(client.rackUnitsU)}</span>
              </div>
              <div class="client-card__detail">
                <span class="client-card__label">Contract:</span>
                <span class="client-card__value">
                  {#if client.leaseEndDay === null}
                    ∞ days
                  {:else}
                    {getDaysRemaining(client.leaseEndDay, 1)} days
                  {/if}
                </span>
              </div>
              <div class="client-card__detail">
                <span class="client-card__label">Rate:</span>
                <span class="client-card__value">₵{client.dailyRate}/day</span>
              </div>
            </div>
            <div class="client-card__actions">
              <Button size="sm" variant="ghost" onclick={() => onviewclient?.(client.clientId)}>
                View Details
              </Button>
            </div>
          </div>
        {/snippet}
      </VirtualizedList>
    </div>
  {:else}
    <div class="client-list__grid">
      {#each paginatedClients as client (client.clientId)}
        <div class="client-card">
          <div class="client-card__header">
            <span class="client-card__name">{client.clientName}</span>
            <Badge
              variant={getLeaseStatus(getDaysRemaining(client.leaseEndDay, 1)) === 'active'
                ? 'success'
                : getLeaseStatus(getDaysRemaining(client.leaseEndDay, 1)) === 'expiring'
                  ? 'warning'
                  : 'danger'}
              size="sm"
            >
              {getLeaseStatus(getDaysRemaining(client.leaseEndDay, 1)) === 'active'
                ? 'ACTIVE'
                : getLeaseStatus(getDaysRemaining(client.leaseEndDay, 1)) === 'expiring'
                  ? 'EXPIRING'
                  : 'EXPIRED'}
            </Badge>
          </div>
          <div class="client-card__details">
            <div class="client-card__detail">
              <span class="client-card__label">Storage:</span>
              <span class="client-card__value">{formatStorage(client.rackUnitsU)}</span>
            </div>
            <div class="client-card__detail">
              <span class="client-card__label">Contract:</span>
              <span class="client-card__value">
                {#if client.leaseEndDay === null}
                  ∞ days
                {:else}
                  {getDaysRemaining(client.leaseEndDay, 1)} days
                {/if}
              </span>
            </div>
            <div class="client-card__detail">
              <span class="client-card__label">Rate:</span>
              <span class="client-card__value">₵{client.dailyRate}/day</span>
            </div>
          </div>
          <div class="client-card__actions">
            <Button size="sm" variant="ghost" onclick={() => onviewclient?.(client.clientId)}>
              View Details
            </Button>
          </div>
        </div>
      {/each}
    </div>

    {#if totalPages > 1}
      <div class="client-list__pagination">
        <Button size="sm" variant="secondary" disabled={currentPage === 1} onclick={prevPage}>
          ‹ Prev
        </Button>
        <span class="client-list__page-info">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={currentPage === totalPages}
          onclick={nextPage}
        >
          Next ›
        </Button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .client-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .client-list__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--space-2);
    border-bottom: var(--border-default);
  }

  .client-list__title {
    font-family: var(--font-terminal);
    font-size: var(--text-base);
    color: var(--color-amber);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .client-list__count {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .client-list__empty {
    padding: var(--space-4);
    text-align: center;
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
  }

  .client-list__empty-text {
    font-family: var(--font-document);
    color: var(--color-text-muted);
  }

  .client-list__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-3);
  }

  .client-list__virtual {
    flex: 1;
    overflow: hidden;
  }

  .client-card {
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .client-card__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .client-card__name {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    font-weight: 500;
  }

  .client-card__details {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .client-card__detail {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-xs);
  }

  .client-card__label {
    font-family: var(--font-ui);
    color: var(--color-text-muted);
  }

  .client-card__value {
    font-family: var(--font-terminal);
    color: var(--color-text);
  }

  .client-card__actions {
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: var(--border-default);
  }

  .client-list__pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-3);
    padding-top: var(--space-2);
  }

  .client-list__page-info {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }
</style>
