<script lang="ts">
  import type { DaySummaryData } from '../day-summary';

  interface Props {
    incidentSummary: DaySummaryData['incidentSummary'];
  }

  const { incidentSummary }: Props = $props();
</script>

<div class="incident-summary">
  <div class="incident-summary__incident-grid">
    <div class="incident-summary__incident-stat">
      <span class="incident-summary__incident-label">Detected</span>
      <span class="incident-summary__incident-value">{incidentSummary.detected}</span>
    </div>
    <div class="incident-summary__incident-stat">
      <span class="incident-summary__incident-label">Resolved</span>
      <span class="incident-summary__incident-value">{incidentSummary.resolved}</span>
    </div>
  </div>
  <div class="incident-summary__severity-breakdown">
    <span class="incident-summary__severity incident-summary__severity--critical">
      Critical: {incidentSummary.severityBreakdown.critical}
    </span>
    <span class="incident-summary__severity incident-summary__severity--high">
      High: {incidentSummary.severityBreakdown.high}
    </span>
    <span class="incident-summary__severity incident-summary__severity--medium">
      Medium: {incidentSummary.severityBreakdown.medium}
    </span>
    <span class="incident-summary__severity incident-summary__severity--low">
      Low: {incidentSummary.severityBreakdown.low}
    </span>
  </div>
</div>

<style>
  .incident-summary__incident-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .incident-summary__incident-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-secondary);
  }

  .incident-summary__incident-label {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
  }

  .incident-summary__incident-value {
    font-family: var(--font-terminal);
    font-size: var(--text-xl);
    color: var(--color-document-white);
  }

  .incident-summary__severity-breakdown {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .incident-summary__severity {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }

  .incident-summary__severity--critical {
    background: rgba(255, 51, 51, 0.2);
    color: var(--color-critical);
  }

  .incident-summary__severity--high {
    background: rgba(255, 102, 0, 0.2);
    color: var(--color-warning);
  }

  .incident-summary__severity--medium {
    background: rgba(255, 204, 0, 0.2);
    color: var(--color-warning);
  }

  .incident-summary__severity--low {
    background: rgba(51, 204, 102, 0.2);
    color: var(--color-safe);
  }
</style>
