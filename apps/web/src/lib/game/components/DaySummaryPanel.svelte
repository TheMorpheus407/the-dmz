<script lang="ts">
  import { Panel, Button, Badge, Modal } from '$lib/ui';

  import {
    SummaryStatistics,
    NetChangesDisplay,
    NarrativeNotes,
    IncidentSummary,
    VerificationStats,
  } from './day-summary-panel';

  import type { DaySummaryData } from './day-summary';

  interface Props {
    data: DaySummaryData;
    onadvanceDay?: () => void;
  }

  const { data, onadvanceDay }: Props = $props();

  let showConfirmDialog = $state(false);
  let isTransitioning = $state(false);

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
        <SummaryStatistics summaryStatistics={data.summaryStatistics} />
      </section>

      <section class="day-summary__section">
        <h3 class="day-summary__section-title">Net Changes</h3>
        <NetChangesDisplay netChanges={data.netChanges} />
      </section>

      <section class="day-summary__section">
        <h3 class="day-summary__section-title">Narrative Notes</h3>
        <NarrativeNotes narrativeNotes={data.narrativeNotes} />
      </section>

      <section class="day-summary__section">
        <h3 class="day-summary__section-title">Incident Summary</h3>
        <IncidentSummary incidentSummary={data.incidentSummary} />
      </section>

      <section class="day-summary__section">
        <h3 class="day-summary__section-title">Verification Stats</h3>
        <VerificationStats verificationStats={data.verificationStats} />
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
