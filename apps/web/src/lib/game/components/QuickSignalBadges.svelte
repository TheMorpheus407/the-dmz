<script context="module" lang="ts">
  export type QuickSignalType = 'ready' | 'waiting' | 'approved' | 'denied' | 'verify' | 'help';
</script>

<script lang="ts">
  import { browser } from '$app/environment';

  interface QuickSignal {
    id: string;
    type: QuickSignalType;
    senderId: string;
    senderName: string;
    timestamp: number;
  }

  interface Props {
    playerId: string;
    onSignal?: (type: QuickSignalType) => void;
    receivedSignals?: QuickSignal[];
    disabled?: boolean;
  }

  const { playerId, onSignal, receivedSignals = [], disabled = false }: Props = $props();

  const SIGNAL_COOLDOWN_MS = 5000;
  const SIGNAL_LIFETIME_MS = 10000;

  let lastSignalTime = $state(0);
  let cooldownRemaining = $state(0);
  let activeSignals = $state<QuickSignal[]>([]);
  let cooldownInterval: NodeJS.Timeout | null = null;

  const signalConfig: Record<QuickSignalType, { label: string; icon: string; color: string }> = {
    ready: { label: 'READY', icon: '[OK]', color: 'var(--color-safe)' },
    waiting: { label: 'WAIT', icon: '...', color: 'var(--color-warning)' },
    approved: { label: 'LGTM', icon: '[OK]', color: 'var(--color-safe)' },
    denied: { label: 'NO', icon: '[X]', color: 'var(--color-danger)' },
    verify: { label: 'VERIFY', icon: '?', color: 'var(--color-info)' },
    help: { label: 'HELP', icon: '!', color: 'var(--color-flagged)' },
  };

  const canSendSignal = $derived(() => {
    if (disabled) return false;
    const now = Date.now();
    return now - lastSignalTime >= SIGNAL_COOLDOWN_MS;
  });

  const cooldownSeconds = $derived(Math.ceil(cooldownRemaining / 1000));

  function startCooldown() {
    lastSignalTime = Date.now();
    cooldownRemaining = SIGNAL_COOLDOWN_MS;

    if (cooldownInterval) {
      clearInterval(cooldownInterval);
    }

    cooldownInterval = setInterval(() => {
      const elapsed = Date.now() - lastSignalTime;
      cooldownRemaining = Math.max(0, SIGNAL_COOLDOWN_MS - elapsed);

      if (cooldownRemaining <= 0 && cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
      }
    }, 100);
  }

  function sendSignal(type: QuickSignalType) {
    if (!canSendSignal()) return;

    startCooldown();
    onSignal?.(type);
  }

  function addReceivedSignal(signal: QuickSignal) {
    activeSignals = [...activeSignals, signal];

    setTimeout(() => {
      activeSignals = activeSignals.filter((s) => s.id !== signal.id);
    }, SIGNAL_LIFETIME_MS);
  }

  function handleKeydown(event: KeyboardEvent, type: QuickSignalType) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      sendSignal(type);
    }
  }

  $effect(() => {
    if (browser && receivedSignals.length > 0) {
      receivedSignals.forEach(addReceivedSignal);
    }
  });
</script>

<div class="quick-signals" role="toolbar" aria-label="Quick signals">
  <div class="quick-signals__badges" aria-label="Available signals">
    {#each Object.entries(signalConfig) as [type, config] (type)}
      {@const signalType = type as QuickSignalType}
      <button
        type="button"
        class="quick-signal-btn quick-signal-btn--{signalType}"
        class:quick-signal-btn--cooldown={!canSendSignal()}
        disabled={disabled || !canSendSignal()}
        onclick={() => sendSignal(signalType)}
        onkeydown={(e) => handleKeydown(e, signalType)}
        aria-label="{config.label}{!canSendSignal() ? ` (cooldown ${cooldownSeconds}s)` : ''}"
        title={config.label}
      >
        <span class="quick-signal-btn__icon" aria-hidden="true">{config.icon}</span>
        {#if !canSendSignal()}
          <span class="quick-signal-btn__cooldown" aria-live="polite">{cooldownSeconds}s</span>
        {/if}
      </button>
    {/each}
  </div>

  {#if activeSignals.length > 0}
    <div class="quick-signals__received" aria-live="polite" aria-label="Received signals">
      {#each activeSignals as signal (signal.id)}
        {@const config = signalConfig[signal.type]}
        <div
          class="received-signal received-signal--{signal.type}"
          role="status"
          aria-label="Signal from {signal.senderName}: {config.label}"
        >
          <span class="received-signal__icon" aria-hidden="true">{config.icon}</span>
          <span class="received-signal__label">{config.label}</span>
          {#if signal.senderId !== playerId}
            <span class="received-signal__sender">{signal.senderName}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .quick-signals {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .quick-signals__badges {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .quick-signal-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    padding: var(--space-1) var(--space-2);
    background-color: var(--color-bg-tertiary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    transition: all 150ms ease;
    position: relative;
  }

  .quick-signal-btn:hover:not(:disabled) {
    background-color: var(--color-bg-hover);
    border-color: var(--color-text-muted);
  }

  .quick-signal-btn:focus-visible {
    outline: 2px solid var(--color-amber);
    outline-offset: 2px;
  }

  .quick-signal-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .quick-signal-btn--ready:hover:not(:disabled) {
    border-color: var(--color-safe);
    color: var(--color-safe);
  }

  .quick-signal-btn--waiting:hover:not(:disabled) {
    border-color: var(--color-warning);
    color: var(--color-warning);
  }

  .quick-signal-btn--approved:hover:not(:disabled) {
    border-color: var(--color-safe);
    color: var(--color-safe);
  }

  .quick-signal-btn--denied:hover:not(:disabled) {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }

  .quick-signal-btn--verify:hover:not(:disabled) {
    border-color: var(--color-info);
    color: var(--color-info);
  }

  .quick-signal-btn--help:hover:not(:disabled) {
    border-color: var(--color-flagged);
    color: var(--color-flagged);
  }

  .quick-signal-btn__icon {
    font-size: var(--text-sm);
    line-height: 1;
  }

  .quick-signal-btn__cooldown {
    position: absolute;
    top: -4px;
    right: -4px;
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-danger);
    border-radius: var(--radius-full);
    padding: 0 var(--space-1);
    font-size: 9px;
    color: var(--color-danger);
  }

  .quick-signals__received {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  .received-signal {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    animation: signal-appear 200ms ease-out;
  }

  .received-signal--ready,
  .received-signal--approved {
    background-color: color-mix(in srgb, var(--color-safe) 15%, transparent);
    border: 1px solid var(--color-safe);
    color: var(--color-safe);
  }

  .received-signal--waiting {
    background-color: color-mix(in srgb, var(--color-warning) 15%, transparent);
    border: 1px solid var(--color-warning);
    color: var(--color-warning);
  }

  .received-signal--denied {
    background-color: color-mix(in srgb, var(--color-danger) 15%, transparent);
    border: 1px solid var(--color-danger);
    color: var(--color-danger);
  }

  .received-signal--verify {
    background-color: color-mix(in srgb, var(--color-info) 15%, transparent);
    border: 1px solid var(--color-info);
    color: var(--color-info);
  }

  .received-signal--help {
    background-color: color-mix(in srgb, var(--color-flagged) 15%, transparent);
    border: 1px solid var(--color-flagged);
    color: var(--color-flagged);
  }

  .received-signal__sender {
    opacity: 0.8;
    font-style: italic;
  }

  @keyframes signal-appear {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .received-signal {
      animation: none;
    }
  }
</style>
