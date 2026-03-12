<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  import {
    ransomLockoutStore,
    isRansomLockoutActive,
    ransomPhase,
    canPay,
    canAttemptRecovery,
    countdownTime,
    type RansomLockoutPhase,
  } from '$lib/game/store/ransom-lockout-store';
  import { triggerGlitch, triggerFlicker } from '$lib/effects/crt-effects';

  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let previousPhase: RansomLockoutPhase | null = null;

  const phaseClass = $derived(() => {
    const phase = $ransomPhase;
    const classes: string[] = [];
    if (phase === 'countdown_warning') classes.push('ransom-lockout--warning');
    if (phase === 'imminent') classes.push('ransom-lockout--imminent');
    if (phase === 'expired') classes.push('ransom-lockout--expired');
    return classes.join(' ');
  });

  const timerAriaLive = $derived(() => {
    const phase = $ransomPhase;
    return phase === 'imminent' ? 'assertive' : 'polite';
  });

  const isExpired = $derived(() => {
    const phase = $ransomPhase;
    return phase === 'expired';
  });

  $effect(() => {
    const currentPhase = $ransomPhase;
    if (currentPhase && currentPhase !== previousPhase) {
      if (previousPhase !== null) {
        triggerGlitch();
        triggerFlicker();
      }
      previousPhase = currentPhase;
    }
  });

  onMount(() => {
    countdownInterval = setInterval(() => {
      ransomLockoutStore.updateCountdown();
    }, 1000);
  });

  onDestroy(() => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
  });

  function formatCountdown(time: { hours: number; minutes: number; seconds: number }): string {
    const { hours, minutes, seconds } = time;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function handlePay() {
    ransomLockoutStore.payRansom();
  }

  function handleRefuse() {
    ransomLockoutStore.refuseRansom();
  }

  function handleAttemptRecovery() {
    ransomLockoutStore.attemptRecovery();
  }

  function getPhaseUrgencyClass(phase: RansomLockoutPhase): string {
    switch (phase) {
      case 'imminent':
        return 'ransom-lockout__timer--imminent';
      case 'countdown_warning':
        return 'ransom-lockout__timer--warning';
      default:
        return '';
    }
  }
</script>

{#if $isRansomLockoutActive}
  <div class="ransom-lockout {phaseClass()}" role="alert" aria-live="assertive">
    <div class="ransom-lockout__overlay"></div>

    <div class="ransom-lockout__content">
      <header class="ransom-lockout__header">
        <div class="ransom-lockout__header-meta">
          <span class="ransom-lockout__origin">ORIGIN: UNKNOWN</span>
          <span class="ransom-lockout__encryption">ENCRYPTION: AES-512-GCM</span>
          <span class="ransom-lockout__keys">KEYS: 1 OF 1</span>
        </div>
      </header>

      <div class="ransom-lockout__title">
        <pre class="ransom-lockout__ascii">██████╗ ███████╗███████╗██╗     ██╗███╗   ██╗███████╗
██╔══██╗██╔════╝██╔════╝██║     ██║████╗  ██║██╔════╝
██████╔╝█████╗  █████╗  ██║     ██║██╔██╗ ██║█████╗  
██╔══██╗██╔══╝  ██╔══╝  ██║     ██║██║╚██╗██║██╔══╝  
██║  ██║███████╗███████╗███████╗██║██║ ╚████║███████╗
╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝</pre>
      </div>

      <div class="ransom-lockout__message">
        <p class="ransom-lockout__message-primary">YOUR SYSTEMS HAVE BEEN COMPROMISED.</p>
        <p class="ransom-lockout__message-secondary">
          All operations are suspended. All data access is locked.
        </p>
      </div>

      <div class="ransom-lockout__ransom">
        <div class="ransom-lockout__ransom-amount">
          <span class="ransom-lockout__ransom-label">RANSOM DEMAND:</span>
          <span class="ransom-lockout__ransom-value"
            >{$ransomLockoutStore.ransomAmount?.toLocaleString() ?? 0} CR</span
          >
        </div>

        {#if $countdownTime}
          <div
            class="ransom-lockout__timer {getPhaseUrgencyClass($ransomPhase)}"
            role="timer"
            aria-live={timerAriaLive()}
          >
            <span class="ransom-lockout__timer-label">DEADLINE:</span>
            <span class="ransom-lockout__timer-value">
              {#if isExpired()}
                EXPIRED
              {:else}
                {formatCountdown($countdownTime)}
              {/if}
            </span>
          </div>
        {/if}
      </div>

      <div class="ransom-lockout__actions">
        <button
          type="button"
          class="ransom-lockout__button ransom-lockout__button--pay"
          disabled={!$canPay || $ransomLockoutStore.hasPaid}
          onclick={handlePay}
          aria-label={$canPay
            ? `Pay ${$ransomLockoutStore.ransomAmount} credits ransom`
            : 'Insufficient funds to pay ransom'}
        >
          {#if $ransomLockoutStore.hasPaid}
            PAID
          {:else}
            PAY RANSOM
          {/if}
        </button>

        <button
          type="button"
          class="ransom-lockout__button ransom-lockout__button--recovery"
          disabled={!$canAttemptRecovery}
          onclick={handleAttemptRecovery}
          aria-label="Attempt to recover systems without paying"
        >
          {#if $ransomLockoutStore.hasAttemptedRecovery}
            RECOVERY IN PROGRESS
          {:else}
            ATTEMPT RECOVERY
          {/if}
        </button>

        <button
          type="button"
          class="ransom-lockout__button ransom-lockout__button--refuse"
          disabled={$ransomLockoutStore.hasRefused}
          onclick={handleRefuse}
          aria-label="Refuse to pay ransom"
        >
          {#if $ransomLockoutStore.hasRefused}
            REFUSED
          {:else}
            REFUSE
          {/if}
        </button>
      </div>

      {#if $ransomLockoutStore.hasPaid}
        <div class="ransom-lockout__status ransom-lockout__status--success">
          <p>Payment processed. Recovery sequence initiated.</p>
          <p class="ransom-lockout__status-detail">System recovery in progress...</p>
        </div>
      {:else if $ransomLockoutStore.hasRefused}
        <div class="ransom-lockout__status ransom-lockout__status--danger">
          <p>Threat escalation accelerated.</p>
          <p class="ransom-lockout__status-detail">All data will be permanently deleted.</p>
        </div>
      {/if}

      <div class="ransom-lockout__funds">
        <span class="ransom-lockout__funds-label">Available funds:</span>
        <span class="ransom-lockout__funds-value"
          >{$ransomLockoutStore.currentFunds.toLocaleString()} CR</span
        >
      </div>

      <footer class="ransom-lockout__footer">
        <div class="ransom-lockout__incident">
          <p class="ransom-lockout__incident-label">Entry point:</p>
          <p class="ransom-lockout__incident-value">{$ransomLockoutStore.entryPoint}</p>
        </div>
        <div class="ransom-lockout__incident">
          <p class="ransom-lockout__incident-label">Attack vector:</p>
          <p class="ransom-lockout__incident-value">{$ransomLockoutStore.attackVector}</p>
        </div>
        {#if $ransomLockoutStore.redFlagsMissed.length > 0}
          <div class="ransom-lockout__incident">
            <p class="ransom-lockout__incident-label">Red flags missed:</p>
            <p class="ransom-lockout__incident-value">
              {$ransomLockoutStore.redFlagsMissed.join(', ')}
            </p>
          </div>
        {/if}
      </footer>
    </div>
  </div>
{/if}

<style>
  .ransom-lockout {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a0000;
    color: #ffffff;
    font-family: var(--font-terminal);
    overflow: auto;
    animation: ransom-appear 0.5s ease-out;
  }

  @keyframes ransom-appear {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  .ransom-lockout__overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 0%,
      rgba(139, 0, 0, 0.3) 70%,
      rgba(139, 0, 0, 0.6) 100%
    );
    pointer-events: none;
  }

  .ransom-lockout__content {
    position: relative;
    z-index: 1;
    max-width: 800px;
    width: 100%;
    padding: var(--space-6);
    text-align: center;
  }

  .ransom-lockout__header {
    margin-bottom: var(--space-6);
    padding: var(--space-3);
    border: 1px solid #ff3333;
    background: rgba(255, 0, 0, 0.1);
  }

  .ransom-lockout__header-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: #ff6666;
    letter-spacing: 0.1em;
  }

  .ransom-lockout__title {
    margin-bottom: var(--space-6);
  }

  .ransom-lockout__ascii {
    font-family: var(--font-terminal);
    font-size: clamp(0.5rem, 2vw, 1rem);
    line-height: 1.2;
    color: #ff3333;
    text-shadow: 0 0 10px rgba(255, 0, 0, 0.8);
    margin: 0;
    white-space: pre;
  }

  .ransom-lockout__message {
    margin-bottom: var(--space-6);
  }

  .ransom-lockout__message-primary {
    font-size: var(--text-xl);
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 var(--space-2) 0;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  }

  .ransom-lockout__message-secondary {
    font-size: var(--text-base);
    color: #ff9999;
    margin: 0;
  }

  .ransom-lockout__ransom {
    margin-bottom: var(--space-6);
    padding: var(--space-4);
    border: 2px solid #ff3333;
    background: rgba(255, 0, 0, 0.15);
  }

  .ransom-lockout__ransom-amount {
    margin-bottom: var(--space-4);
  }

  .ransom-lockout__ransom-label {
    display: block;
    font-size: var(--text-sm);
    color: #ff6666;
    margin-bottom: var(--space-1);
  }

  .ransom-lockout__ransom-value {
    font-size: var(--text-2xl);
    font-weight: 700;
    color: #ffffff;
    text-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
  }

  .ransom-lockout__timer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .ransom-lockout__timer-label {
    font-size: var(--text-sm);
    color: #ff6666;
  }

  .ransom-lockout__timer-value {
    font-size: var(--text-3xl);
    font-weight: 800;
    color: #ffffff;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.1em;
  }

  .ransom-lockout__timer--warning .ransom-lockout__timer-value {
    color: #ff6600;
    animation: timer-pulse-warning 1s ease-in-out infinite;
  }

  .ransom-lockout__timer--imminent .ransom-lockout__timer-value {
    color: #ff0000;
    animation: timer-pulse-danger 0.5s ease-in-out infinite;
  }

  @keyframes timer-pulse-warning {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.05);
    }
  }

  @keyframes timer-pulse-danger {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.1);
    }
  }

  .ransom-lockout__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .ransom-lockout__button {
    font-family: var(--font-terminal);
    font-size: var(--text-base);
    font-weight: 600;
    padding: var(--space-3) var(--space-6);
    border: 2px solid;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ransom-lockout__button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ransom-lockout__button--pay {
    border-color: #33ff33;
    color: #33ff33;
  }

  .ransom-lockout__button--pay:not(:disabled):hover {
    background: rgba(51, 255, 51, 0.2);
    box-shadow: 0 0 15px rgba(51, 255, 51, 0.5);
  }

  .ransom-lockout__button--recovery {
    border-color: #3399ff;
    color: #3399ff;
  }

  .ransom-lockout__button--recovery:not(:disabled):hover {
    background: rgba(51, 153, 255, 0.2);
    box-shadow: 0 0 15px rgba(51, 153, 255, 0.5);
  }

  .ransom-lockout__button--refuse {
    border-color: #ff3333;
    color: #ff3333;
  }

  .ransom-lockout__button--refuse:not(:disabled):hover {
    background: rgba(255, 51, 51, 0.2);
    box-shadow: 0 0 15px rgba(255, 51, 51, 0.5);
  }

  .ransom-lockout__funds {
    margin-bottom: var(--space-6);
    font-size: var(--text-sm);
    color: #ff9999;
  }

  .ransom-lockout__funds-value {
    color: #ffffff;
    font-weight: 600;
  }

  .ransom-lockout__status {
    padding: var(--space-4);
    margin-bottom: var(--space-4);
    border: 1px solid;
  }

  .ransom-lockout__status--success {
    border-color: #33ff33;
    background: rgba(51, 255, 51, 0.1);
    color: #33ff33;
  }

  .ransom-lockout__status--danger {
    border-color: #ff3333;
    background: rgba(255, 0, 0, 0.2);
    color: #ff3333;
  }

  .ransom-lockout__status-detail {
    font-size: var(--text-sm);
    margin: var(--space-2) 0 0 0;
    opacity: 0.8;
  }

  .ransom-lockout__footer {
    text-align: left;
    padding: var(--space-4);
    border-top: 1px solid #660000;
    background: rgba(0, 0, 0, 0.3);
  }

  .ransom-lockout__incident {
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
  }

  .ransom-lockout__incident:last-child {
    margin-bottom: 0;
  }

  .ransom-lockout__incident-label {
    color: #ff6666;
    margin: 0 0 var(--space-1) 0;
  }

  .ransom-lockout__incident-value {
    color: #cccccc;
    margin: 0;
    font-family: var(--font-document);
  }

  /* Red tint CRT effect */
  .ransom-lockout {
    --scanline-opacity: 0.08;
    --noise-opacity: 0.08;
  }

  .ransom-lockout::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9998;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 1px,
      rgba(255, 0, 0, 0.03) 1px,
      rgba(255, 0, 0, 0.03) 2px
    );
    animation: scanline-drift 8s linear infinite;
  }

  /* Screen shake for imminent phase */
  .ransom-lockout--imminent {
    animation:
      ransom-appear 0.5s ease-out,
      screen-shake 0.1s ease-in-out infinite;
  }

  @keyframes screen-shake {
    0%,
    100% {
      transform: translate(0, 0);
    }
    25% {
      transform: translate(-2px, 1px);
    }
    50% {
      transform: translate(1px, -2px);
    }
    75% {
      transform: translate(-1px, -1px);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .ransom-lockout {
      animation: none;
    }

    .ransom-lockout::before {
      animation: none;
    }

    .ransom-lockout--imminent {
      animation: none;
    }

    .ransom-lockout__timer--warning .ransom-lockout__timer-value,
    .ransom-lockout__timer--imminent .ransom-lockout__timer-value {
      animation: none;
    }

    .ransom-lockout__button:not(:disabled):hover {
      background: transparent;
      box-shadow: none;
    }
  }
</style>
