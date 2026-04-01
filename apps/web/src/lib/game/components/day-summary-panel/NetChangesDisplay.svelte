<script lang="ts">
  import type { DaySummaryData } from '../day-summary';

  interface Props {
    netChanges: DaySummaryData['netChanges'];
  }

  const { netChanges }: Props = $props();

  function formatDelta(value: number): string {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toLocaleString()}`;
  }

  function formatChange(before: number, after: number): { text: string; isPositive: boolean } {
    const delta = after - before;
    return {
      text: `${before} → ${after} (${formatDelta(delta)})`,
      isPositive: delta >= 0,
    };
  }
</script>

<div class="net-changes-display">
  <div class="net-changes-display__changes-grid">
    <div class="net-changes-display__change">
      <span class="net-changes-display__change-label">Trust Score</span>
      <span
        class="net-changes-display__change-value"
        class:net-changes-display__change-value--positive={formatChange(
          netChanges.trustScore.before,
          netChanges.trustScore.after,
        ).isPositive}
        class:net-changes-display__change-value--negative={!formatChange(
          netChanges.trustScore.before,
          netChanges.trustScore.after,
        ).isPositive}
      >
        {formatChange(netChanges.trustScore.before, netChanges.trustScore.after).text}
      </span>
    </div>
    <div class="net-changes-display__change">
      <span class="net-changes-display__change-label">Funds</span>
      <span
        class="net-changes-display__change-value"
        class:net-changes-display__change-value--positive={formatChange(
          netChanges.funds.before,
          netChanges.funds.after,
        ).isPositive}
        class:net-changes-display__change-value--negative={!formatChange(
          netChanges.funds.before,
          netChanges.funds.after,
        ).isPositive}
      >
        {formatChange(netChanges.funds.before, netChanges.funds.after).text} CR
      </span>
    </div>
    <div class="net-changes-display__change">
      <span class="net-changes-display__change-label">Intel Fragments</span>
      <span
        class="net-changes-display__change-value"
        class:net-changes-display__change-value--positive={formatChange(
          netChanges.intelFragments.before,
          netChanges.intelFragments.after,
        ).isPositive}
        class:net-changes-display__change-value--negative={!formatChange(
          netChanges.intelFragments.before,
          netChanges.intelFragments.after,
        ).isPositive}
      >
        {formatChange(netChanges.intelFragments.before, netChanges.intelFragments.after).text}
      </span>
    </div>
    <div class="net-changes-display__change">
      <span class="net-changes-display__change-label">Rack Units</span>
      <span
        class="net-changes-display__change-value"
        class:net-changes-display__change-value--positive={formatChange(
          netChanges.resources.rackUnits.before,
          netChanges.resources.rackUnits.after,
        ).isPositive}
        class:net-changes-display__change-value--negative={!formatChange(
          netChanges.resources.rackUnits.before,
          netChanges.resources.rackUnits.after,
        ).isPositive}
      >
        {formatChange(netChanges.resources.rackUnits.before, netChanges.resources.rackUnits.after)
          .text}
      </span>
    </div>
    <div class="net-changes-display__change">
      <span class="net-changes-display__change-label">Power</span>
      <span
        class="net-changes-display__change-value"
        class:net-changes-display__change-value--positive={formatChange(
          netChanges.resources.powerKw.before,
          netChanges.resources.powerKw.after,
        ).isPositive}
        class:net-changes-display__change-value--negative={!formatChange(
          netChanges.resources.powerKw.before,
          netChanges.resources.powerKw.after,
        ).isPositive}
      >
        {formatChange(netChanges.resources.powerKw.before, netChanges.resources.powerKw.after).text} kW
      </span>
    </div>
    <div class="net-changes-display__change">
      <span class="net-changes-display__change-label">Cooling</span>
      <span
        class="net-changes-display__change-value"
        class:net-changes-display__change-value--positive={formatChange(
          netChanges.resources.coolingTons.before,
          netChanges.resources.coolingTons.after,
        ).isPositive}
        class:net-changes-display__change-value--negative={!formatChange(
          netChanges.resources.coolingTons.before,
          netChanges.resources.coolingTons.after,
        ).isPositive}
      >
        {formatChange(
          netChanges.resources.coolingTons.before,
          netChanges.resources.coolingTons.after,
        ).text} tons
      </span>
    </div>
    <div class="net-changes-display__change">
      <span class="net-changes-display__change-label">Bandwidth</span>
      <span
        class="net-changes-display__change-value"
        class:net-changes-display__change-value--positive={formatChange(
          netChanges.resources.bandwidthMbps.before,
          netChanges.resources.bandwidthMbps.after,
        ).isPositive}
        class:net-changes-display__change-value--negative={!formatChange(
          netChanges.resources.bandwidthMbps.before,
          netChanges.resources.bandwidthMbps.after,
        ).isPositive}
      >
        {formatChange(
          netChanges.resources.bandwidthMbps.before,
          netChanges.resources.bandwidthMbps.after,
        ).text} Mbps
      </span>
    </div>
  </div>
</div>

<style>
  .net-changes-display__changes-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .net-changes-display__change {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-secondary);
  }

  .net-changes-display__change-label {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
  }

  .net-changes-display__change-value {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-document-white);
  }

  .net-changes-display__change-value--positive {
    color: var(--color-safe);
  }

  .net-changes-display__change-value--negative {
    color: var(--color-danger);
  }
</style>
