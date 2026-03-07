<script lang="ts">
  import { Panel, Button, Badge, Modal } from '$lib/ui';

  import type { DaySummaryData } from './day-summary';

  interface Props {
    data: DaySummaryData;
    onadvanceDay?: () => void;
  }

  const { data, onadvanceDay }: Props = $props();

  let showConfirmDialog = $state(false);
  let isTransitioning = $state(false);

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

  function handleAdvanceClick() {
    showConfirmDialog = true;
  }

  async function confirmAdvance() {
    showConfirmDialog = false;
    isTransitioning = true;
    await new Promise((resolve) => setTimeout(resolve, 800));
    isTransitioning = false;
    onadvanceDay?.();
  }

  function cancelAdvance() {
    showConfirmDialog = false;
  }

  const decisionTotal =
    data.summaryStatistics.decisionsMade.approved +
    data.summaryStatistics.decisionsMade.denied +
    data.summaryStatistics.decisionsMade.flagged +
    data.summaryStatistics.decisionsMade.verified;
</script>

<div class="day-summary" class:day-summary--transitioning={isTransitioning}>
  <Panel variant="elevated" ariaLabel="Day Summary">
    <header class="day-summary__header">
      <h2 class="day-summary__title">Day {data.dayNumber} Summary</h2>
      <Badge variant="info">End of Day</Badge>
    </header>

    <div class="day-summary__content">
      <section class="day-summary__section">
        <h3 class="day-summary__section-title">Summary Statistics</h3>
        <div class="day-summary__stats-grid">
          <div class="day-summary__stat">
            <span class="day-summary__stat-label">Emails Processed</span>
            <span class="day-summary__stat-value">{data.summaryStatistics.emailsProcessed}</span>
          </div>
          <div class="day-summary__stat">
            <span class="day-summary__stat-label">Decisions Made</span>
            <span class="day-summary__stat-value">{decisionTotal}</span>
          </div>
          <div class="day-summary__stat">
            <span class="day-summary__stat-label">Accuracy Rate</span>
            <span class="day-summary__stat-value"
              >{data.summaryStatistics.accuracyRate.toFixed(1)}%</span
            >
          </div>
          <div class="day-summary__stat">
            <span class="day-summary__stat-label">Trust Score Change</span>
            <span
              class="day-summary__stat-value"
              class:day-summary__stat-value--positive={data.summaryStatistics.trustScoreChange >= 0}
              class:day-summary__stat-value--negative={data.summaryStatistics.trustScoreChange < 0}
            >
              {formatDelta(data.summaryStatistics.trustScoreChange)}
            </span>
          </div>
          <div class="day-summary__stat">
            <span class="day-summary__stat-label">Funds Change</span>
            <span
              class="day-summary__stat-value"
              class:day-summary__stat-value--positive={data.summaryStatistics.fundsChange >= 0}
              class:day-summary__stat-value--negative={data.summaryStatistics.fundsChange < 0}
            >
              {formatDelta(data.summaryStatistics.fundsChange)} CR
            </span>
          </div>
          <div class="day-summary__stat">
            <span class="day-summary__stat-label">Threats Encountered</span>
            <span class="day-summary__stat-value">{data.summaryStatistics.threatsEncountered}</span>
          </div>
        </div>

        <div class="day-summary__decisions-breakdown">
          <span class="day-summary__decision-item day-summary__decision-item--approved">
            Approved: {data.summaryStatistics.decisionsMade.approved}
          </span>
          <span class="day-summary__decision-item day-summary__decision-item--denied">
            Denied: {data.summaryStatistics.decisionsMade.denied}
          </span>
          <span class="day-summary__decision-item day-summary__decision-item--flagged">
            Flagged: {data.summaryStatistics.decisionsMade.flagged}
          </span>
          <span class="day-summary__decision-item day-summary__decision-item--verified">
            Verified: {data.summaryStatistics.decisionsMade.verified}
          </span>
        </div>

        <div class="day-summary__resources-consumed">
          <span class="day-summary__resource-item">
            Rack Units: {data.summaryStatistics.resourcesConsumed.rackUnits}
          </span>
          <span class="day-summary__resource-item">
            Power: {data.summaryStatistics.resourcesConsumed.powerKw} kW
          </span>
          <span class="day-summary__resource-item">
            Cooling: {data.summaryStatistics.resourcesConsumed.coolingTons} tons
          </span>
          <span class="day-summary__resource-item">
            Bandwidth: {data.summaryStatistics.resourcesConsumed.bandwidthMbps} Mbps
          </span>
        </div>
      </section>

      <section class="day-summary__section">
        <h3 class="day-summary__section-title">Net Changes</h3>
        <div class="day-summary__changes-grid">
          <div class="day-summary__change">
            <span class="day-summary__change-label">Trust Score</span>
            <span
              class="day-summary__change-value"
              class:day-summary__change-value--positive={formatChange(
                data.netChanges.trustScore.before,
                data.netChanges.trustScore.after,
              ).isPositive}
              class:day-summary__change-value--negative={!formatChange(
                data.netChanges.trustScore.before,
                data.netChanges.trustScore.after,
              ).isPositive}
            >
              {formatChange(data.netChanges.trustScore.before, data.netChanges.trustScore.after)
                .text}
            </span>
          </div>
          <div class="day-summary__change">
            <span class="day-summary__change-label">Funds</span>
            <span
              class="day-summary__change-value"
              class:day-summary__change-value--positive={formatChange(
                data.netChanges.funds.before,
                data.netChanges.funds.after,
              ).isPositive}
              class:day-summary__change-value--negative={!formatChange(
                data.netChanges.funds.before,
                data.netChanges.funds.after,
              ).isPositive}
            >
              {formatChange(data.netChanges.funds.before, data.netChanges.funds.after).text} CR
            </span>
          </div>
          <div class="day-summary__change">
            <span class="day-summary__change-label">Intel Fragments</span>
            <span
              class="day-summary__change-value"
              class:day-summary__change-value--positive={formatChange(
                data.netChanges.intelFragments.before,
                data.netChanges.intelFragments.after,
              ).isPositive}
              class:day-summary__change-value--negative={!formatChange(
                data.netChanges.intelFragments.before,
                data.netChanges.intelFragments.after,
              ).isPositive}
            >
              {formatChange(
                data.netChanges.intelFragments.before,
                data.netChanges.intelFragments.after,
              ).text}
            </span>
          </div>
          <div class="day-summary__change">
            <span class="day-summary__change-label">Rack Units</span>
            <span
              class="day-summary__change-value"
              class:day-summary__change-value--positive={formatChange(
                data.netChanges.resources.rackUnits.before,
                data.netChanges.resources.rackUnits.after,
              ).isPositive}
              class:day-summary__change-value--negative={!formatChange(
                data.netChanges.resources.rackUnits.before,
                data.netChanges.resources.rackUnits.after,
              ).isPositive}
            >
              {formatChange(
                data.netChanges.resources.rackUnits.before,
                data.netChanges.resources.rackUnits.after,
              ).text}
            </span>
          </div>
          <div class="day-summary__change">
            <span class="day-summary__change-label">Power</span>
            <span
              class="day-summary__change-value"
              class:day-summary__change-value--positive={formatChange(
                data.netChanges.resources.powerKw.before,
                data.netChanges.resources.powerKw.after,
              ).isPositive}
              class:day-summary__change-value--negative={!formatChange(
                data.netChanges.resources.powerKw.before,
                data.netChanges.resources.powerKw.after,
              ).isPositive}
            >
              {formatChange(
                data.netChanges.resources.powerKw.before,
                data.netChanges.resources.powerKw.after,
              ).text} kW
            </span>
          </div>
          <div class="day-summary__change">
            <span class="day-summary__change-label">Cooling</span>
            <span
              class="day-summary__change-value"
              class:day-summary__change-value--positive={formatChange(
                data.netChanges.resources.coolingTons.before,
                data.netChanges.resources.coolingTons.after,
              ).isPositive}
              class:day-summary__change-value--negative={!formatChange(
                data.netChanges.resources.coolingTons.before,
                data.netChanges.resources.coolingTons.after,
              ).isPositive}
            >
              {formatChange(
                data.netChanges.resources.coolingTons.before,
                data.netChanges.resources.coolingTons.after,
              ).text} tons
            </span>
          </div>
          <div class="day-summary__change">
            <span class="day-summary__change-label">Bandwidth</span>
            <span
              class="day-summary__change-value"
              class:day-summary__change-value--positive={formatChange(
                data.netChanges.resources.bandwidthMbps.before,
                data.netChanges.resources.bandwidthMbps.after,
              ).isPositive}
              class:day-summary__change-value--negative={!formatChange(
                data.netChanges.resources.bandwidthMbps.before,
                data.netChanges.resources.bandwidthMbps.after,
              ).isPositive}
            >
              {formatChange(
                data.netChanges.resources.bandwidthMbps.before,
                data.netChanges.resources.bandwidthMbps.after,
              ).text} Mbps
            </span>
          </div>
        </div>
      </section>

      <section class="day-summary__section">
        <h3 class="day-summary__section-title">Narrative Notes</h3>
        {#if data.narrativeNotes.keyEvents.length > 0}
          <div class="day-summary__notes-block">
            <h4 class="day-summary__notes-subtitle">Key Events</h4>
            <ul class="day-summary__notes-list">
              {#each data.narrativeNotes.keyEvents as event (event)}
                <li>{event}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if data.narrativeNotes.notableDecisions.length > 0}
          <div class="day-summary__notes-block">
            <h4 class="day-summary__notes-subtitle">Notable Decisions</h4>
            <ul class="day-summary__notes-list">
              {#each data.narrativeNotes.notableDecisions as decision (decision)}
                <li>{decision}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if data.narrativeNotes.coachingTips.length > 0}
          <div class="day-summary__notes-block day-summary__notes-block--tips">
            <h4 class="day-summary__notes-subtitle">Morpheus Coaching</h4>
            <ul class="day-summary__notes-list day-summary__notes-list--tips">
              {#each data.narrativeNotes.coachingTips as tip (tip)}
                <li>{tip}</li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if data.narrativeNotes.factionUpdates.length > 0}
          <div class="day-summary__notes-block">
            <h4 class="day-summary__notes-subtitle">Faction Relations</h4>
            <ul class="day-summary__notes-list">
              {#each data.narrativeNotes.factionUpdates as update (update.faction)}
                <li>
                  <strong>{update.faction}</strong>: {update.change}
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </section>

      <section class="day-summary__section">
        <h3 class="day-summary__section-title">Incident Summary</h3>
        <div class="day-summary__incident-grid">
          <div class="day-summary__incident-stat">
            <span class="day-summary__incident-label">Detected</span>
            <span class="day-summary__incident-value">{data.incidentSummary.detected}</span>
          </div>
          <div class="day-summary__incident-stat">
            <span class="day-summary__incident-label">Resolved</span>
            <span class="day-summary__incident-value">{data.incidentSummary.resolved}</span>
          </div>
        </div>
        <div class="day-summary__severity-breakdown">
          <span class="day-summary__severity day-summary__severity--critical">
            Critical: {data.incidentSummary.severityBreakdown.critical}
          </span>
          <span class="day-summary__severity day-summary__severity--high">
            High: {data.incidentSummary.severityBreakdown.high}
          </span>
          <span class="day-summary__severity day-summary__severity--medium">
            Medium: {data.incidentSummary.severityBreakdown.medium}
          </span>
          <span class="day-summary__severity day-summary__severity--low">
            Low: {data.incidentSummary.severityBreakdown.low}
          </span>
        </div>
      </section>

      <section class="day-summary__section">
        <h3 class="day-summary__section-title">Verification Stats</h3>
        <div class="day-summary__verification-grid">
          <div class="day-summary__verification-stat">
            <span class="day-summary__verification-label">Requests Made</span>
            <span class="day-summary__verification-value"
              >{data.verificationStats.requestsMade}</span
            >
          </div>
          <div class="day-summary__verification-stat">
            <span class="day-summary__verification-label">Discrepancies Found</span>
            <span class="day-summary__verification-value"
              >{data.verificationStats.discrepanciesFound}</span
            >
          </div>
          <div class="day-summary__verification-stat">
            <span class="day-summary__verification-label">Verification Accuracy</span>
            <span class="day-summary__verification-value"
              >{data.verificationStats.accuracy.toFixed(1)}%</span
            >
          </div>
        </div>
      </section>
    </div>

    <footer class="day-summary__footer">
      <Button variant="primary" size="lg" onclick={handleAdvanceClick}>
        {isTransitioning ? 'Advancing...' : 'Advance to Day ' + (data.dayNumber + 1)}
      </Button>
    </footer>
  </Panel>
</div>

<Modal bind:open={showConfirmDialog} title="Confirm Day Advance" size="sm" onclose={cancelAdvance}>
  <p>Are you sure you want to advance to Day {data.dayNumber + 1}?</p>
  <p class="day-summary__confirm-note">
    This will initialize the next day's operations. Any pending items will be carried over with
    penalties.
  </p>
  {#snippet footer()}
    <Button variant="secondary" onclick={cancelAdvance}>Cancel</Button>
    <Button variant="primary" onclick={confirmAdvance}>Confirm Advance</Button>
  {/snippet}
</Modal>

<style>
  .day-summary {
    max-width: 900px;
    margin: 0 auto;
  }

  .day-summary--transitioning {
    opacity: 0.5;
    pointer-events: none;
  }

  .day-summary__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-phosphor-green-dark);
  }

  .day-summary__title {
    font-family: var(--font-terminal);
    font-size: var(--text-lg);
    color: var(--color-amber);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0;
  }

  .day-summary__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .day-summary__section {
    background: var(--color-bg-tertiary);
    border: 1px solid var(--color-phosphor-green-dark);
    padding: var(--space-3);
  }

  .day-summary__section-title {
    font-family: var(--font-terminal);
    font-size: var(--text-md);
    color: var(--color-phosphor-green);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 var(--space-3) 0;
  }

  .day-summary__stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .day-summary__stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .day-summary__stat-label {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
  }

  .day-summary__stat-value {
    font-family: var(--font-terminal);
    font-size: var(--text-lg);
    color: var(--color-document-white);
  }

  .day-summary__stat-value--positive {
    color: var(--color-safe);
  }

  .day-summary__stat-value--negative {
    color: var(--color-danger);
  }

  .day-summary__decisions-breakdown {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px dashed var(--color-phosphor-green-dark);
  }

  .day-summary__resources-consumed {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    padding-top: var(--space-2);
    border-top: 1px dashed var(--color-phosphor-green-dark);
  }

  .day-summary__resource-item {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-phosphor-green-dim);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  .day-summary__decision-item {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }

  .day-summary__decision-item--approved {
    background: rgba(51, 204, 102, 0.15);
    color: var(--color-safe);
  }

  .day-summary__decision-item--denied {
    background: rgba(255, 85, 85, 0.15);
    color: var(--color-danger);
  }

  .day-summary__decision-item--flagged {
    background: rgba(255, 153, 0, 0.15);
    color: var(--color-flagged);
  }

  .day-summary__decision-item--verified {
    background: rgba(51, 153, 255, 0.15);
    color: var(--color-info);
  }

  .day-summary__changes-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .day-summary__change {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-secondary);
  }

  .day-summary__change-label {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
  }

  .day-summary__change-value {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-document-white);
  }

  .day-summary__change-value--positive {
    color: var(--color-safe);
  }

  .day-summary__change-value--negative {
    color: var(--color-danger);
  }

  .day-summary__notes-block {
    margin-bottom: var(--space-3);
  }

  .day-summary__notes-block--tips {
    background: rgba(255, 176, 0, 0.1);
    border-left: 3px solid var(--color-amber);
    padding: var(--space-2);
  }

  .day-summary__notes-subtitle {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
    margin: 0 0 var(--space-2) 0;
  }

  .day-summary__notes-list {
    margin: 0;
    padding-left: var(--space-4);
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-document-white);
  }

  .day-summary__notes-list li {
    margin-bottom: var(--space-1);
  }

  .day-summary__notes-list--tips {
    color: var(--color-amber);
  }

  .day-summary__incident-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .day-summary__incident-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-secondary);
  }

  .day-summary__incident-label {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
  }

  .day-summary__incident-value {
    font-family: var(--font-terminal);
    font-size: var(--text-xl);
    color: var(--color-document-white);
  }

  .day-summary__severity-breakdown {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .day-summary__severity {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }

  .day-summary__severity--critical {
    background: rgba(255, 51, 51, 0.2);
    color: var(--color-critical);
  }

  .day-summary__severity--high {
    background: rgba(255, 102, 0, 0.2);
    color: var(--color-warning);
  }

  .day-summary__severity--medium {
    background: rgba(255, 204, 0, 0.2);
    color: var(--color-warning);
  }

  .day-summary__severity--low {
    background: rgba(51, 204, 102, 0.2);
    color: var(--color-safe);
  }

  .day-summary__verification-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .day-summary__verification-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2);
    background: var(--color-bg-secondary);
  }

  .day-summary__verification-label {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
    text-align: center;
  }

  .day-summary__verification-value {
    font-family: var(--font-terminal);
    font-size: var(--text-lg);
    color: var(--color-document-white);
  }

  .day-summary__footer {
    margin-top: var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-phosphor-green-dark);
    display: flex;
    justify-content: center;
  }

  .day-summary__confirm-note {
    font-size: var(--text-sm);
    color: var(--color-document-muted);
    margin-top: var(--space-2);
  }
</style>
