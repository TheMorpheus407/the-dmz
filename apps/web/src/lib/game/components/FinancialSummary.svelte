<script lang="ts">
  import type { FacilityState } from '@the-dmz/shared/types';

  interface Props {
    funds: number;
    facility: FacilityState;
  }

  const { funds, facility }: Props = $props();

  const dailyRevenue = $derived(
    facility.clients.filter((c) => c.isActive).reduce((sum, client) => sum + client.dailyRate, 0),
  );

  const dailyOpEx = $derived(facility.operatingCostPerDay + facility.securityToolOpExPerDay);

  const dailyNet = $derived(dailyRevenue - dailyOpEx);

  const ransomReserve = $derived(Math.floor(funds / 10));

  function formatCurrency(amount: number): string {
    return amount.toLocaleString('en-US');
  }

  function formatNet(amount: number): string {
    const prefix = amount >= 0 ? '+' : '';
    return `${prefix}${formatCurrency(amount)}`;
  }
</script>

<div class="financial-summary">
  <h3 class="financial-summary__title">Financial Summary</h3>

  <div class="financial-summary__grid">
    <div class="financial-stat">
      <span class="financial-stat__label">Daily Revenue</span>
      <span class="financial-stat__value financial-stat__value--positive">
        ₵{formatCurrency(dailyRevenue)}
      </span>
    </div>

    <div class="financial-stat">
      <span class="financial-stat__label">Daily OpEx</span>
      <span class="financial-stat__value financial-stat__value--negative">
        -₵{formatCurrency(dailyOpEx)}
      </span>
    </div>

    <div class="financial-stat">
      <span class="financial-stat__label">Daily Net</span>
      <span
        class="financial-stat__value"
        class:financial-stat__value--positive={dailyNet >= 0}
        class:financial-stat__value--negative={dailyNet < 0}
      >
        ₵{formatNet(dailyNet)}
      </span>
    </div>

    <div class="financial-stat financial-stat--highlight">
      <span class="financial-stat__label">Total Funds</span>
      <span class="financial-stat__value">
        ₵{formatCurrency(funds)}
      </span>
    </div>

    <div class="financial-stat">
      <span class="financial-stat__label">Ransom Reserve</span>
      <span class="financial-stat__value financial-stat__value--muted">
        ₵{formatCurrency(ransomReserve)} (={Math.round((ransomReserve / funds) * 100) || 0}%)
      </span>
    </div>
  </div>
</div>

<style>
  .financial-summary {
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
  }

  .financial-summary__title {
    font-family: var(--font-terminal);
    font-size: var(--text-base);
    color: var(--color-amber);
    margin: 0 0 var(--space-3) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .financial-summary__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-3);
  }

  .financial-stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
  }

  .financial-stat--highlight {
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-accent);
  }

  .financial-stat__label {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .financial-stat__value {
    font-family: var(--font-terminal);
    font-size: var(--text-md);
    color: var(--color-text);
    font-weight: 500;
  }

  .financial-stat__value--positive {
    color: var(--color-safe);
  }

  .financial-stat__value--negative {
    color: var(--color-danger);
  }

  .financial-stat__value--muted {
    color: var(--color-text-muted);
  }
</style>
