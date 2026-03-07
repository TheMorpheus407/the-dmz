<script lang="ts">
  import { Badge } from '$lib/ui';
  import type { FacilityTierLevel } from '@the-dmz/shared/types';

  interface Props {
    organizationName?: string;
    currentDay: number;
    currentTime?: string;
    facilityTier: FacilityTierLevel;
    facilityHealth?: number;
  }

  const {
    organizationName = 'The DMZ',
    currentDay = 1,
    currentTime = '08:00',
    facilityTier = 'outpost',
    facilityHealth = 100,
  }: Props = $props();

  const tierLabel = $derived.by(() => {
    switch (facilityTier) {
      case 'outpost':
        return 'OUTPOST';
      case 'station':
        return 'STATION';
      case 'vault':
        return 'VAULT';
      case 'fortress':
        return 'FORTRESS';
      case 'citadel':
        return 'CITADEL';
      default:
        return 'UNKNOWN';
    }
  });

  const healthStatus = $derived.by(() => {
    if (facilityHealth >= 80) return 'good';
    if (facilityHealth >= 50) return 'warning';
    return 'critical';
  });
</script>

<div class="dashboard-header">
  <div class="dashboard-header__left">
    <h1 class="dashboard-header__org">{organizationName}</h1>
    <span class="dashboard-header__divider">//</span>
    <span class="dashboard-header__subtitle">FACILITY DASHBOARD</span>
  </div>

  <div class="dashboard-header__right">
    <div class="dashboard-header__stat">
      <span class="dashboard-header__label">Day</span>
      <span class="dashboard-header__value">{currentDay}</span>
    </div>

    <div class="dashboard-header__stat">
      <span class="dashboard-header__label">Time</span>
      <span class="dashboard-header__value">{currentTime}</span>
    </div>

    <div class="dashboard-header__stat dashboard-header__stat--tier">
      <span class="dashboard-header__label">Facility</span>
      <Badge
        variant={facilityTier === 'citadel'
          ? 'success'
          : facilityTier === 'fortress'
            ? 'info'
            : 'default'}
      >
        {tierLabel}
      </Badge>
    </div>

    <div class="dashboard-header__stat">
      <span class="dashboard-header__label">Health</span>
      <span
        class="dashboard-header__value"
        class:dashboard-header__value--good={healthStatus === 'good'}
        class:dashboard-header__value--warning={healthStatus === 'warning'}
        class:dashboard-header__value--critical={healthStatus === 'critical'}
      >
        {facilityHealth}%
      </span>
    </div>
  </div>
</div>

<style>
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-4);
    padding: var(--space-4);
    background-color: var(--color-bg-tertiary);
    border: var(--border-default);
    border-radius: var(--radius-md);
  }

  .dashboard-header__left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .dashboard-header__org {
    font-family: var(--font-terminal);
    font-size: var(--text-xl);
    color: var(--color-amber);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .dashboard-header__divider {
    font-family: var(--font-terminal);
    color: var(--color-text-muted);
  }

  .dashboard-header__subtitle {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    letter-spacing: 0.05em;
  }

  .dashboard-header__right {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .dashboard-header__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-0);
  }

  .dashboard-header__stat--tier {
    flex-direction: row;
    gap: var(--space-2);
  }

  .dashboard-header__label {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .dashboard-header__value {
    font-family: var(--font-terminal);
    font-size: var(--text-md);
    color: var(--color-text);
    font-weight: 500;
  }

  .dashboard-header__value--good {
    color: var(--color-safe);
  }

  .dashboard-header__value--warning {
    color: var(--color-warning);
  }

  .dashboard-header__value--critical {
    color: var(--color-danger);
  }

  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .dashboard-header__right {
      flex-wrap: wrap;
      gap: var(--space-3);
    }
  }
</style>
