<script lang="ts">
  import type { DaySummaryData } from '../day-summary';

  interface Props {
    summaryStatistics: DaySummaryData['summaryStatistics'];
  }

  const { summaryStatistics }: Props = $props();

  function formatDelta(value: number): string {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toLocaleString()}`;
  }

  const decisionTotal =
    summaryStatistics.decisionsMade.approved +
    summaryStatistics.decisionsMade.denied +
    summaryStatistics.decisionsMade.flagged +
    summaryStatistics.decisionsMade.verified;
</script>

<div class="summary-statistics">
  <div class="summary-statistics__stats-grid">
    <div class="summary-statistics__stat">
      <span class="summary-statistics__stat-label">Emails Processed</span>
      <span class="summary-statistics__stat-value">{summaryStatistics.emailsProcessed}</span>
    </div>
    <div class="summary-statistics__stat">
      <span class="summary-statistics__stat-label">Decisions Made</span>
      <span class="summary-statistics__stat-value">{decisionTotal}</span>
    </div>
    <div class="summary-statistics__stat">
      <span class="summary-statistics__stat-label">Accuracy Rate</span>
      <span class="summary-statistics__stat-value"
        >{summaryStatistics.accuracyRate.toFixed(1)}%</span
      >
    </div>
    <div class="summary-statistics__stat">
      <span class="summary-statistics__stat-label">Trust Score Change</span>
      <span
        class="summary-statistics__stat-value"
        class:summary-statistics__stat-value--positive={summaryStatistics.trustScoreChange >= 0}
        class:summary-statistics__stat-value--negative={summaryStatistics.trustScoreChange < 0}
      >
        {formatDelta(summaryStatistics.trustScoreChange)}
      </span>
    </div>
    <div class="summary-statistics__stat">
      <span class="summary-statistics__stat-label">Funds Change</span>
      <span
        class="summary-statistics__stat-value"
        class:summary-statistics__stat-value--positive={summaryStatistics.fundsChange >= 0}
        class:summary-statistics__stat-value--negative={summaryStatistics.fundsChange < 0}
      >
        {formatDelta(summaryStatistics.fundsChange)} CR
      </span>
    </div>
    <div class="summary-statistics__stat">
      <span class="summary-statistics__stat-label">Threats Encountered</span>
      <span class="summary-statistics__stat-value">{summaryStatistics.threatsEncountered}</span>
    </div>
  </div>

  <div class="summary-statistics__decisions-breakdown">
    <span class="summary-statistics__decision-item summary-statistics__decision-item--approved">
      Approved: {summaryStatistics.decisionsMade.approved}
    </span>
    <span class="summary-statistics__decision-item summary-statistics__decision-item--denied">
      Denied: {summaryStatistics.decisionsMade.denied}
    </span>
    <span class="summary-statistics__decision-item summary-statistics__decision-item--flagged">
      Flagged: {summaryStatistics.decisionsMade.flagged}
    </span>
    <span class="summary-statistics__decision-item summary-statistics__decision-item--verified">
      Verified: {summaryStatistics.decisionsMade.verified}
    </span>
  </div>

  <div class="summary-statistics__resources-consumed">
    <span class="summary-statistics__resource-item">
      Rack Units: {summaryStatistics.resourcesConsumed.rackUnits}
    </span>
    <span class="summary-statistics__resource-item">
      Power: {summaryStatistics.resourcesConsumed.powerKw} kW
    </span>
    <span class="summary-statistics__resource-item">
      Cooling: {summaryStatistics.resourcesConsumed.coolingTons} tons
    </span>
    <span class="summary-statistics__resource-item">
      Bandwidth: {summaryStatistics.resourcesConsumed.bandwidthMbps} Mbps
    </span>
  </div>
</div>

<style>
  .summary-statistics__stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .summary-statistics__stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .summary-statistics__stat-label {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
  }

  .summary-statistics__stat-value {
    font-family: var(--font-terminal);
    font-size: var(--text-lg);
    color: var(--color-document-white);
  }

  .summary-statistics__stat-value--positive {
    color: var(--color-safe);
  }

  .summary-statistics__stat-value--negative {
    color: var(--color-danger);
  }

  .summary-statistics__decisions-breakdown {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px dashed var(--color-phosphor-green-dark);
  }

  .summary-statistics__resources-consumed {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px dashed var(--color-phosphor-green-dark);
  }

  .summary-statistics__resource-item {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-phosphor-green-dim);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  .summary-statistics__decision-item {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }

  .summary-statistics__decision-item--approved {
    background: rgba(51, 204, 102, 0.15);
    color: var(--color-safe);
  }

  .summary-statistics__decision-item--denied {
    background: rgba(255, 85, 85, 0.15);
    color: var(--color-danger);
  }

  .summary-statistics__decision-item--flagged {
    background: rgba(255, 153, 0, 0.15);
    color: var(--color-flagged);
  }

  .summary-statistics__decision-item--verified {
    background: rgba(51, 153, 255, 0.15);
    color: var(--color-info);
  }
</style>
