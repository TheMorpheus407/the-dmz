<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import type { PurchasedUpgrade, QueuedUpgrade, ShopCategory } from '@the-dmz/shared/types';
  import {
    UPGRADE_CATALOG,
    getUpgradesByCategory,
    getUpgradeById,
    canPurchase,
  } from '$lib/game/data/upgrade-catalog';

  interface Props {
    availableFunds: number;
    currentDay: number;
    purchased?: PurchasedUpgrade[];
    queued?: QueuedUpgrade[];
    onclose?: () => void;
    onpurchase?: (upgradeId: string) => void;
  }

  const {
    availableFunds = 10000,
    currentDay = 1,
    purchased = [],
    queued = [],
    onclose = () => {},
    onpurchase = () => {},
  }: Props = $props();

  let selectedCategory: ShopCategory = $state('infrastructure');
  let selectedUpgradeId: string | null = $state(null);

  const categories: { id: ShopCategory; label: string; icon: string }[] = [
    { id: 'infrastructure', label: 'Infrastructure', icon: '▦' },
    { id: 'security', label: 'Security', icon: '🛡' },
    { id: 'staff', label: 'Staff', icon: '♟' },
  ];

  const filteredUpgrades = $derived(getUpgradesByCategory(UPGRADE_CATALOG, selectedCategory));
  const selectedUpgrade = $derived(
    selectedUpgradeId ? getUpgradeById(UPGRADE_CATALOG, selectedUpgradeId) : null,
  );

  function selectCategory(category: ShopCategory) {
    selectedCategory = category;
    selectedUpgradeId = null;
  }

  function selectUpgrade(upgradeId: string) {
    selectedUpgradeId = upgradeId;
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function handlePurchase() {
    if (!selectedUpgrade) return;
    const { canPurchase: canBuy, reason: _reason } = canPurchase(
      selectedUpgrade,
      availableFunds,
      purchased,
    );
    if (canBuy) {
      onpurchase(selectedUpgrade.id);
    }
  }

  function isUpgradePurchased(upgradeId: string): boolean {
    return purchased.some((p) => p.upgradeId === upgradeId);
  }

  function isUpgradeQueued(upgradeId: string): boolean {
    return queued.some((q) => q.upgradeId === upgradeId);
  }

  function getQueuedProgress(upgradeId: string): number {
    const queue = queued.find((q) => q.upgradeId === upgradeId);
    if (!queue) return 0;
    const totalDays = queue.completesDay - queue.purchasedDay;
    const elapsedDays = currentDay - queue.purchasedDay;
    return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  }
</script>

<div class="upgrade-shop">
  <div class="upgrade-shop__header">
    <div class="upgrade-shop__title">
      <span class="upgrade-shop__title-icon">⬆</span>
      <h2>UPGRADE SHOP</h2>
    </div>
    <div class="upgrade-shop__funds">
      <span class="upgrade-shop__funds-label">Available Funds:</span>
      <span class="upgrade-shop__funds-value">{formatCurrency(availableFunds)}</span>
    </div>
  </div>

  <div class="upgrade-shop__body">
    <aside class="upgrade-shop__categories" aria-label="Upgrade categories">
      <nav class="upgrade-shop__category-nav">
        {#each categories as category (category.id)}
          <button
            type="button"
            class="upgrade-shop__category-btn"
            class:upgrade-shop__category-btn--active={selectedCategory === category.id}
            onclick={() => selectCategory(category.id)}
          >
            <span class="upgrade-shop__category-icon">{category.icon}</span>
            <span class="upgrade-shop__category-label">{category.label}</span>
          </button>
        {/each}
      </nav>
    </aside>

    <section class="upgrade-shop__list" aria-label="Available upgrades">
      <h3 class="upgrade-shop__section-title">
        {categories.find((c) => c.id === selectedCategory)?.label} Upgrades
      </h3>
      <ul class="upgrade-shop__upgrade-list">
        {#each filteredUpgrades as upgrade (upgrade.id)}
          {@const purchased = isUpgradePurchased(upgrade.id)}
          {@const queued = isUpgradeQueued(upgrade.id)}
          {@const queuedProgress = getQueuedProgress(upgrade.id)}
          <li>
            <button
              type="button"
              class="upgrade-shop__upgrade-item"
              class:upgrade-shop__upgrade-item--selected={selectedUpgradeId === upgrade.id}
              class:upgrade-shop__upgrade-item--purchased={purchased}
              class:upgrade-shop__upgrade-item--queued={queued}
              onclick={() => selectUpgrade(upgrade.id)}
            >
              <div class="upgrade-shop__upgrade-header">
                <span class="upgrade-shop__upgrade-icon">{upgrade.icon || '○'}</span>
                <span class="upgrade-shop__upgrade-name">{upgrade.name}</span>
              </div>
              <div class="upgrade-shop__upgrade-meta">
                {#if purchased}
                  <Badge variant="success" size="sm">Owned</Badge>
                {:else if queued}
                  <Badge variant="warning" size="sm"
                    >Installing ({Math.round(queuedProgress)}%)</Badge
                  >
                {:else}
                  <span class="upgrade-shop__upgrade-cost">{formatCurrency(upgrade.cost)}</span>
                {/if}
              </div>
            </button>
          </li>
        {/each}
      </ul>
    </section>

    <section class="upgrade-shop__detail" aria-label="Upgrade details">
      {#if selectedUpgrade}
        {@const purchaseInfo = canPurchase(selectedUpgrade, availableFunds, purchased)}
        {@const isPurchased = isUpgradePurchased(selectedUpgrade.id)}
        {@const isQueued = isUpgradeQueued(selectedUpgrade.id)}

        <div class="upgrade-shop__detail-header">
          <div class="upgrade-shop__detail-title-row">
            <span class="upgrade-shop__detail-icon">{selectedUpgrade.icon || '○'}</span>
            <h3 class="upgrade-shop__detail-name">{selectedUpgrade.name}</h3>
          </div>
          <Badge
            variant={selectedUpgrade.tier === 'enterprise'
              ? 'danger'
              : selectedUpgrade.tier === 'advanced'
                ? 'warning'
                : 'default'}
            size="sm"
          >
            {selectedUpgrade.tier.toUpperCase()}
          </Badge>
        </div>

        <p class="upgrade-shop__detail-description">{selectedUpgrade.description}</p>

        {#if selectedUpgrade.longDescription}
          <p class="upgrade-shop__detail-long-description">{selectedUpgrade.longDescription}</p>
        {/if}

        <div class="upgrade-shop__detail-stats">
          <div class="upgrade-shop__detail-stat">
            <span class="upgrade-shop__detail-stat-label">Cost</span>
            <span class="upgrade-shop__detail-stat-value upgrade-shop__detail-stat-value--cost">
              {formatCurrency(selectedUpgrade.cost)}
              {#if selectedUpgrade.costType === 'recurring'}/mo{/if}
            </span>
          </div>
          <div class="upgrade-shop__detail-stat">
            <span class="upgrade-shop__detail-stat-label">Installation</span>
            <span class="upgrade-shop__detail-stat-value">
              {selectedUpgrade.installationDays} days
            </span>
          </div>
          <div class="upgrade-shop__detail-stat">
            <span class="upgrade-shop__detail-stat-label">Daily OpEx</span>
            <span class="upgrade-shop__detail-stat-value">
              {formatCurrency(selectedUpgrade.opExPerDay)}/day
            </span>
          </div>
          <div class="upgrade-shop__detail-stat">
            <span class="upgrade-shop__detail-stat-label">Threat Surface</span>
            <span
              class="upgrade-shop__detail-stat-value"
              class:upgrade-shop__detail-stat-value--danger={selectedUpgrade.threatSurfaceDelta > 0}
              class:upgrade-shop__detail-stat-value--safe={selectedUpgrade.threatSurfaceDelta < 0}
            >
              {selectedUpgrade.threatSurfaceDelta > 0
                ? '+'
                : ''}{selectedUpgrade.threatSurfaceDelta}
            </span>
          </div>
        </div>

        {#if selectedUpgrade.benefits.length > 0}
          <div class="upgrade-shop__detail-section">
            <h4 class="upgrade-shop__detail-section-title">BENEFITS</h4>
            <ul class="upgrade-shop__detail-benefits">
              {#each selectedUpgrade.benefits as benefit (benefit.description)}
                <li class="upgrade-shop__detail-benefit">
                  <span class="upgrade-shop__detail-benefit-impact">{benefit.impact}</span>
                  <span class="upgrade-shop__detail-benefit-description">{benefit.description}</span
                  >
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if selectedUpgrade.prerequisites.length > 0}
          <div class="upgrade-shop__detail-section">
            <h4 class="upgrade-shop__detail-section-title">PREREQUISITES</h4>
            <ul class="upgrade-shop__detail-prereqs">
              {#each selectedUpgrade.prerequisites as prereq (prereq.name)}
                <li
                  class="upgrade-shop__detail-prereq"
                  class:upgrade-shop__detail-prereq--satisfied={prereq.satisfied}
                  class:upgrade-shop__detail-prereq--unsatisfied={!prereq.satisfied}
                >
                  <span class="upgrade-shop__detail-prereq-status">
                    [{prereq.satisfied ? '✓' : '✗'}]
                  </span>
                  <span class="upgrade-shop__detail-prereq-name">{prereq.name}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <div class="upgrade-shop__detail-actions">
          {#if isPurchased}
            <Button variant="secondary" disabled>Already Owned</Button>
          {:else if isQueued}
            <Button variant="secondary" disabled>Installing...</Button>
          {:else}
            <Button variant="primary" disabled={!purchaseInfo.canPurchase} onclick={handlePurchase}>
              {#if !purchaseInfo.canPurchase}
                {purchaseInfo.reason}
              {:else}
                Purchase Upgrade
              {/if}
            </Button>
          {/if}
        </div>
      {:else}
        <div class="upgrade-shop__detail-empty">
          <p>Select an upgrade to view details</p>
        </div>
      {/if}
    </section>
  </div>

  <footer class="upgrade-shop__footer">
    <Button variant="ghost" onclick={() => onclose()}>Close</Button>
  </footer>
</div>

<style>
  .upgrade-shop {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 500px;
    max-height: 80vh;
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .upgrade-shop__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border-bottom: var(--border-default);
    background-color: var(--color-bg-tertiary);
  }

  .upgrade-shop__title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .upgrade-shop__title-icon {
    font-size: var(--text-lg);
    color: var(--color-amber);
  }

  .upgrade-shop__title h2 {
    font-family: var(--font-terminal);
    font-size: var(--text-base);
    color: var(--color-amber);
    margin: 0;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .upgrade-shop__funds {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-terminal);
  }

  .upgrade-shop__funds-label {
    color: var(--color-phosphor-green-dim);
    font-size: var(--text-xs);
  }

  .upgrade-shop__funds-value {
    color: var(--color-phosphor-green);
    font-size: var(--text-base);
    font-weight: 600;
  }

  .upgrade-shop__body {
    display: grid;
    grid-template-columns: 150px 200px 1fr;
    flex: 1;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .upgrade-shop__body {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto 1fr;
    }
  }

  .upgrade-shop__categories {
    background-color: var(--color-bg-primary);
    border-right: var(--border-default);
    padding: var(--space-2);
  }

  .upgrade-shop__category-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .upgrade-shop__category-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 150ms ease;
    text-align: left;
  }

  .upgrade-shop__category-btn:hover {
    background-color: var(--color-bg-hover);
    color: var(--color-text);
  }

  .upgrade-shop__category-btn--active {
    background-color: var(--color-bg-tertiary);
    border-color: var(--color-amber);
    color: var(--color-amber);
  }

  .upgrade-shop__category-icon {
    font-size: var(--text-base);
  }

  .upgrade-shop__list {
    border-right: var(--border-default);
    padding: var(--space-3);
    overflow-y: auto;
  }

  .upgrade-shop__section-title {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .upgrade-shop__upgrade-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .upgrade-shop__upgrade-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    background-color: var(--color-bg-secondary);
    border: 1px solid var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 150ms ease;
    width: 100%;
    text-align: left;
  }

  .upgrade-shop__upgrade-item:hover {
    border-color: var(--color-amber);
    background-color: var(--color-bg-hover);
  }

  .upgrade-shop__upgrade-item--selected {
    border-color: var(--color-amber);
    background-color: var(--color-bg-tertiary);
  }

  .upgrade-shop__upgrade-item--purchased {
    opacity: 0.7;
  }

  .upgrade-shop__upgrade-item--queued {
    opacity: 0.8;
  }

  .upgrade-shop__upgrade-header {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .upgrade-shop__upgrade-icon {
    color: var(--color-phosphor-green-dim);
    font-size: var(--text-sm);
  }

  .upgrade-shop__upgrade-name {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .upgrade-shop__upgrade-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .upgrade-shop__upgrade-cost {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-amber);
  }

  .upgrade-shop__detail {
    padding: var(--space-4);
    overflow-y: auto;
  }

  .upgrade-shop__detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-3);
  }

  .upgrade-shop__detail-title-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .upgrade-shop__detail-icon {
    font-size: var(--text-xl);
    color: var(--color-phosphor-green);
  }

  .upgrade-shop__detail-name {
    font-family: var(--font-terminal);
    font-size: var(--text-lg);
    color: var(--color-text);
    margin: 0;
  }

  .upgrade-shop__detail-description {
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0 0 var(--space-2) 0;
  }

  .upgrade-shop__detail-long-description {
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-text);
    margin: 0 0 var(--space-3) 0;
    line-height: 1.5;
  }

  .upgrade-shop__detail-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
    padding: var(--space-3);
    background-color: var(--color-bg-primary);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-3);
  }

  .upgrade-shop__detail-stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-0);
  }

  .upgrade-shop__detail-stat-label {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
  }

  .upgrade-shop__detail-stat-value {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    font-weight: 600;
  }

  .upgrade-shop__detail-stat-value--cost {
    color: var(--color-amber);
  }

  .upgrade-shop__detail-stat-value--danger {
    color: var(--color-danger);
  }

  .upgrade-shop__detail-stat-value--safe {
    color: var(--color-safe);
  }

  .upgrade-shop__detail-section {
    margin-bottom: var(--space-3);
  }

  .upgrade-shop__detail-section-title {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-amber);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .upgrade-shop__detail-benefits {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .upgrade-shop__detail-benefit {
    display: flex;
    gap: var(--space-2);
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .upgrade-shop__detail-benefit-impact {
    color: var(--color-safe);
    font-weight: 600;
    min-width: 60px;
  }

  .upgrade-shop__detail-prereqs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .upgrade-shop__detail-prereq {
    display: flex;
    gap: var(--space-2);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg-primary);
  }

  .upgrade-shop__detail-prereq--satisfied {
    color: var(--color-safe);
  }

  .upgrade-shop__detail-prereq--unsatisfied {
    color: var(--color-danger);
  }

  .upgrade-shop__detail-prereq-status {
    font-family: var(--font-terminal);
  }

  .upgrade-shop__detail-actions {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: var(--border-default);
  }

  .upgrade-shop__detail-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
  }

  .upgrade-shop__footer {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-3) var(--space-4);
    border-top: var(--border-default);
    background-color: var(--color-bg-tertiary);
  }
</style>
