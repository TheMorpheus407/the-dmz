<script lang="ts">
  import type { DaySummaryData } from '../day-summary';

  interface Props {
    narrativeNotes: DaySummaryData['narrativeNotes'];
  }

  const { narrativeNotes }: Props = $props();
</script>

<div class="narrative-notes">
  {#if narrativeNotes.keyEvents.length > 0}
    <div class="narrative-notes__notes-block">
      <h4 class="narrative-notes__notes-subtitle">Key Events</h4>
      <ul class="narrative-notes__notes-list">
        {#each narrativeNotes.keyEvents as event (event)}
          <li>{event}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if narrativeNotes.notableDecisions.length > 0}
    <div class="narrative-notes__notes-block">
      <h4 class="narrative-notes__notes-subtitle">Notable Decisions</h4>
      <ul class="narrative-notes__notes-list">
        {#each narrativeNotes.notableDecisions as decision (decision)}
          <li>{decision}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if narrativeNotes.coachingTips.length > 0}
    <div class="narrative-notes__notes-block narrative-notes__notes-block--tips">
      <h4 class="narrative-notes__notes-subtitle">Morpheus Coaching</h4>
      <ul class="narrative-notes__notes-list narrative-notes__notes-list--tips">
        {#each narrativeNotes.coachingTips as tip (tip)}
          <li>{tip}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if narrativeNotes.factionUpdates.length > 0}
    <div class="narrative-notes__notes-block">
      <h4 class="narrative-notes__notes-subtitle">Faction Relations</h4>
      <ul class="narrative-notes__notes-list">
        {#each narrativeNotes.factionUpdates as update (update.faction)}
          <li>
            <strong>{update.faction}</strong>: {update.change}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  .narrative-notes__notes-block {
    margin-bottom: var(--space-3);
  }

  .narrative-notes__notes-block--tips {
    background: rgba(255, 176, 0, 0.1);
    border-left: 3px solid var(--color-amber);
    padding: var(--space-2);
  }

  .narrative-notes__notes-subtitle {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-phosphor-green-dim);
    text-transform: uppercase;
    margin: 0 0 var(--space-2) 0;
  }

  .narrative-notes__notes-list {
    margin: 0;
    padding-left: var(--space-4);
    font-family: var(--font-document);
    font-size: var(--text-sm);
    color: var(--color-document-white);
  }

  .narrative-notes__notes-list li {
    margin-bottom: var(--space-1);
  }

  .narrative-notes__notes-list--tips {
    color: var(--color-amber);
  }
</style>
