<script lang="ts">
  import { onMount } from 'svelte';

  interface RansomNoteData {
    noteId: string;
    demandedAmount: string;
    currency: string;
    deadline: string;
    paymentAddress: string;
    entryPoint: string;
    attackVector: string;
    missedIndicators: string[];
    affectedSystems: string[];
    message: string;
  }

  interface Props {
    data: RansomNoteData;
    highlightedFieldId?: string | null;
    onFieldClick?: (documentId: string, field: string) => void;
    onPayRansom?: () => void;
    onAttemptRecovery?: () => void;
  }

  const {
    data,
    highlightedFieldId = null,
    onFieldClick,
    onPayRansom,
    onAttemptRecovery,
  }: Props = $props();

  function isFieldHighlighted(fieldId: string): boolean {
    return highlightedFieldId === fieldId;
  }

  function handleFieldClick(fieldId: string) {
    onFieldClick?.(`ransom-${data.noteId}`, fieldId);
  }

  let timeRemaining = $state('');
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  function updateCountdown() {
    const deadline = new Date(data.deadline).getTime();
    const now = Date.now();
    const diff = Math.max(0, deadline - now);

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    timeRemaining = `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (diff === 0 && countdownInterval) {
      clearInterval(countdownInterval);
    }
  }

  onMount(() => {
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  });
</script>

<div class="ransom-note" role="alert" aria-labelledby="ransom-title">
  <div class="ransom-note__header">
    <h1 id="ransom-title" class="ransom-note__title">SYSTEMS COMPROMISED</h1>
  </div>

  <div class="ransom-note__content">
    <div class="ransom-note__message">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html data.message}
    </div>

    <div class="ransom-note__demand">
      <span class="ransom-note__demand-label">RANSOM DEMAND:</span>
      <span class="ransom-note__demand-amount">{data.demandedAmount} {data.currency}</span>
    </div>

    <div class="ransom-note__countdown">
      <span class="ransom-note__countdown-label">TIME REMAINING:</span>
      <span class="ransom-note__countdown-value">{timeRemaining}</span>
    </div>

    <div class="ransom-note__payment">
      <span class="ransom-note__payment-label">PAYMENT ADDRESS:</span>
      <code class="ransom-note__payment-address">{data.paymentAddress}</code>
    </div>
  </div>

  <div class="ransom-note__actions">
    <button
      type="button"
      class="ransom-note__button ransom-note__button--pay"
      onclick={() => onPayRansom?.()}
    >
      PAY RANSOM
    </button>
    <button
      type="button"
      class="ransom-note__button ransom-note__button--recover"
      onclick={() => onAttemptRecovery?.()}
    >
      ATTEMPT RECOVERY
    </button>
  </div>

  <div class="ransom-note__forensics">
    <h2 class="ransom-note__section-title">INCIDENT ANALYSIS</h2>

    <div class="ransom-note__field">
      <span class="ransom-note__field-label">Entry Point:</span>
      <span class="ransom-note__field-value">{data.entryPoint}</span>
    </div>

    <div class="ransom-note__field">
      <span class="ransom-note__field-label">Attack Vector:</span>
      <span class="ransom-note__field-value">{data.attackVector}</span>
    </div>

    {#if data.affectedSystems.length > 0}
      <button
        type="button"
        class="ransom-note__field"
        class:ransom-note__field--highlighted={isFieldHighlighted('affected-systems')}
        onclick={() => handleFieldClick('affected-systems')}
      >
        <span class="ransom-note__field-label">Affected Systems:</span>
        <span class="ransom-note__field-value">{data.affectedSystems.join(', ')}</span>
      </button>
    {/if}

    {#if data.missedIndicators.length > 0}
      <div
        class="ransom-note__missed"
        class:ransom-note__missed--highlighted={isFieldHighlighted('missed-indicators')}
      >
        <button
          type="button"
          class="ransom-note__missed-label"
          onclick={() => handleFieldClick('missed-indicators')}
        >
          MISSED INDICATORS:
        </button>
        <ul class="ransom-note__missed-list">
          {#each data.missedIndicators as indicator (indicator)}
            <li class="ransom-note__missed-item">{indicator}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>

<style>
  .ransom-note {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
    background: #1a0000;
    border: 2px solid var(--color-danger);
    border-radius: var(--radius-md);
    font-family: var(--font-terminal);
    color: #ffffff;
    min-height: 100%;
  }

  .ransom-note__header {
    text-align: center;
    padding: var(--space-4);
    border-bottom: 2px solid var(--color-danger);
  }

  .ransom-note__title {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-danger);
    margin: 0;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    text-shadow: 0 0 10px var(--color-danger);
  }

  .ransom-note__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
    background: rgba(255, 0, 0, 0.1);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm);
  }

  .ransom-note__message {
    font-size: var(--text-lg);
    line-height: 1.8;
    text-align: center;
    color: #ffffff;
    font-family: var(--font-document);
  }

  .ransom-note__demand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-danger);
    border-radius: var(--radius-sm);
  }

  .ransom-note__demand-label {
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.1em;
    color: #000000;
  }

  .ransom-note__demand-amount {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: #000000;
  }

  .ransom-note__countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm);
  }

  .ransom-note__countdown-label {
    font-size: var(--text-xs);
    color: var(--color-danger);
    letter-spacing: 0.1em;
  }

  .ransom-note__countdown-value {
    font-size: var(--text-3xl);
    font-weight: 700;
    color: var(--color-danger);
    font-family: var(--font-terminal);
    letter-spacing: 0.2em;
  }

  .ransom-note__payment {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    align-items: center;
  }

  .ransom-note__payment-label {
    font-size: var(--text-xs);
    color: var(--color-danger);
    letter-spacing: 0.1em;
  }

  .ransom-note__payment-address {
    padding: var(--space-2) var(--space-3);
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-danger);
    word-break: break-all;
    font-family: var(--font-terminal);
  }

  .ransom-note__actions {
    display: flex;
    justify-content: center;
    gap: var(--space-4);
  }

  .ransom-note__button {
    padding: var(--space-3) var(--space-6);
    border: 2px solid;
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    font-size: var(--text-md);
    font-weight: 700;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition:
      transform 150ms ease,
      box-shadow 150ms ease;
  }

  .ransom-note__button:hover {
    transform: scale(1.05);
  }

  .ransom-note__button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .ransom-note__button--pay {
    background: var(--color-danger);
    border-color: var(--color-danger);
    color: #000000;
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
  }

  .ransom-note__button--recover {
    background: transparent;
    border-color: var(--color-warning);
    color: var(--color-warning);
  }

  .ransom-note__forensics {
    padding: var(--space-3);
    background: rgba(0, 0, 0, 0.3);
    border-radius: var(--radius-sm);
  }

  .ransom-note__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-danger);
    margin: 0 0 var(--space-3) 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 1px solid var(--color-danger);
    padding-bottom: var(--space-2);
  }

  .ransom-note__field {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    padding: var(--space-1);
    cursor: pointer;
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    width: 100%;
    text-align: left;
  }

  .ransom-note__field--highlighted {
    border-color: var(--color-warning);
    box-shadow: 0 0 8px var(--color-warning);
  }

  .ransom-note__field-label {
    color: var(--color-danger);
    font-weight: 600;
    min-width: 120px;
    flex-shrink: 0;
  }

  .ransom-note__field-value {
    color: #ffffff;
    font-family: var(--font-document);
  }

  .ransom-note__missed {
    margin-top: var(--space-3);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
  }

  .ransom-note__missed--highlighted {
    border-color: var(--color-warning);
    box-shadow: 0 0 8px var(--color-warning);
  }

  .ransom-note__missed-label {
    display: block;
    color: var(--color-warning);
    font-weight: 600;
    font-size: var(--text-xs);
    margin-bottom: var(--space-2);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
  }

  .ransom-note__missed-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .ransom-note__missed-item {
    padding: var(--space-1) var(--space-2);
    background: rgba(255, 204, 0, 0.1);
    border-left: 2px solid var(--color-warning);
    font-size: var(--text-xs);
    color: var(--color-warning);
  }
</style>
