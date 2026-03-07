<script lang="ts">
  import { Button } from '$lib/ui';

  interface GameOverData {
    finalScore: number;
    daysSurvived: number;
    totalEmailsProcessed: number;
    decisionsMade: {
      approved: number;
      denied: number;
      flagged: number;
    };
    reputationScore: number;
  }

  interface Props {
    data?: GameOverData | null;
    onRestart?: () => void;
    onViewStats?: () => void;
  }

  const { data = null, onRestart = () => {}, onViewStats = () => {} }: Props = $props();
</script>

<div class="game-over">
  <div class="game-over__header">
    <h2 class="game-over__title">TERMINAL DISCONNECTED</h2>
    <p class="game-over__subtitle">Operations have ceased</p>
  </div>

  {#if data}
    <div class="game-over__stats">
      <div class="stat">
        <span class="stat__label">Days Survived</span>
        <span class="stat__value">{data.daysSurvived}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Final Score</span>
        <span class="stat__value">{data.finalScore}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Emails Processed</span>
        <span class="stat__value">{data.totalEmailsProcessed}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Reputation</span>
        <span class="stat__value">{data.reputationScore}</span>
      </div>
    </div>

    <div class="game-over__decisions">
      <h3>Decision Summary</h3>
      <div class="decision-breakdown">
        <span class="decision decision--approved">Approved: {data.decisionsMade.approved}</span>
        <span class="decision decision--denied">Denied: {data.decisionsMade.denied}</span>
        <span class="decision decision--flagged">Flagged: {data.decisionsMade.flagged}</span>
      </div>
    </div>
  {:else}
    <div class="game-over__placeholder">
      <p>No game data available</p>
    </div>
  {/if}

  <div class="game-over__actions">
    <Button variant="primary" onclick={onRestart}>
      <span class="icon">↻</span>
      Restart Operations
    </Button>
    <Button variant="secondary" onclick={onViewStats}>
      <span class="icon">◉</span>
      View Full Stats
    </Button>
  </div>
</div>

<style>
  .game-over {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: var(--space-6);
    background-color: var(--color-bg-primary);
    font-family: var(--font-terminal);
  }

  .game-over__header {
    text-align: center;
    margin-bottom: var(--space-6);
  }

  .game-over__title {
    font-size: var(--text-2xl);
    color: var(--color-danger);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin: 0;
    animation: blink 1s infinite;
  }

  .game-over__subtitle {
    color: var(--color-document-white);
    font-family: var(--font-document);
    margin: var(--space-2) 0 0 0;
  }

  .game-over__stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
    width: 100%;
    max-width: 400px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
  }

  .stat__label {
    font-size: var(--text-xs);
    color: var(--color-document-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat__value {
    font-size: var(--text-xl);
    color: var(--color-amber);
    margin-top: var(--space-1);
  }

  .game-over__decisions {
    margin-bottom: var(--space-6);
    text-align: center;
    width: 100%;
    max-width: 400px;
  }

  .game-over__decisions h3 {
    font-size: var(--text-base);
    color: var(--color-amber);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 var(--space-3) 0;
  }

  .decision-breakdown {
    display: flex;
    justify-content: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .decision {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
  }

  .decision--approved {
    background-color: rgba(var(--color-success-rgb), 0.2);
    color: var(--color-success);
  }

  .decision--denied {
    background-color: rgba(var(--color-danger-rgb), 0.2);
    color: var(--color-danger);
  }

  .decision--flagged {
    background-color: rgba(var(--color-warning-rgb), 0.2);
    color: var(--color-warning);
  }

  .game-over__placeholder {
    margin-bottom: var(--space-6);
    color: var(--color-document-muted);
    font-family: var(--font-document);
  }

  .game-over__actions {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
    justify-content: center;
  }

  .icon {
    margin-right: var(--space-1);
  }

  @keyframes blink {
    0%,
    50%,
    100% {
      opacity: 1;
    }
    25%,
    75% {
      opacity: 0.5;
    }
  }
</style>
