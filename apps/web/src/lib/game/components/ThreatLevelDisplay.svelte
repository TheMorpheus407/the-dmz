<script lang="ts">
  import {
    THREAT_TIER_METADATA,
    THREAT_TIER_RANKS,
    type ThreatTier,
  } from '@the-dmz/shared/constants';

  interface Props {
    threatLevel: ThreatTier;
    threatLevelSince: string;
    threatLevelSinceDay: number;
  }

  const { threatLevel, threatLevelSince, threatLevelSinceDay }: Props = $props();

  const threatData = $derived(THREAT_TIER_METADATA[threatLevel] || THREAT_TIER_METADATA.LOW);
  const threatLevelNumeric = $derived(THREAT_TIER_RANKS[threatLevel] || 1);

  const shieldIcons: Record<ThreatTier, string> = {
    LOW: '🛡',
    GUARDED: '🛡',
    ELEVATED: '🛡',
    HIGH: '⚠',
    SEVERE: '✕',
  };

  const shieldStates: Record<ThreatTier, string> = {
    LOW: 'pristine',
    GUARDED: 'pristine',
    ELEVATED: 'damaged',
    HIGH: 'cracked',
    SEVERE: 'broken',
  };

  const shieldIcon = $derived(shieldIcons[threatLevel] || '🛡');
  const shieldState = $derived(shieldStates[threatLevel] || 'pristine');

  function getThreatColor(level: ThreatTier): string {
    const colors: Record<ThreatTier, string> = {
      LOW: 'var(--color-threat-1)',
      GUARDED: 'var(--color-threat-2)',
      ELEVATED: 'var(--color-threat-3)',
      HIGH: 'var(--color-threat-4)',
      SEVERE: 'var(--color-threat-5)',
    };
    return colors[level] || colors.LOW;
  }
</script>

<div class="threat-level-display">
  <h3 id="current-threat-heading" class="threat-level-display__section-title">
    CURRENT THREAT LEVEL
  </h3>
  <div class="threat-level-display__threat-level">
    <div class="threat-level-display__level-bar">
      {#each Array(5) as _, i (i)}
        <div
          class="threat-level-display__level-segment"
          class:threat-level-display__level-segment--filled={i < threatLevelNumeric}
          class:threat-level-display__level-segment--active={i < threatLevelNumeric}
          style="--segment-color: {i < threatLevelNumeric
            ? getThreatColor(threatLevel)
            : 'var(--color-bg-tertiary)'}"
        ></div>
      {/each}
    </div>
    <span class="threat-level-display__level-label" style="color: {getThreatColor(threatLevel)}">
      {threatData.label} ({threatLevelNumeric}/5)
    </span>
  </div>
  <div class="threat-level-display__shield-info">
    <span
      class="threat-level-display__shield-icon"
      class:threat-level-display__shield-icon--severe={threatLevel === 'SEVERE'}
    >
      {shieldIcon}
    </span>
    <span class="threat-level-display__shield-state">
      Shield: {shieldState.toUpperCase()}
    </span>
  </div>
  <div class="threat-level-display__since">
    Since: Day {threatLevelSinceDay}, {threatLevelSince}
  </div>
</div>

<style>
  .threat-level-display {
    margin-bottom: var(--space-4);
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-sm);
  }

  .threat-level-display__section-title {
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.05em;
    margin: 0 0 var(--space-2) 0;
    color: var(--color-text-secondary);
  }

  .threat-level-display__threat-level {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .threat-level-display__level-bar {
    display: flex;
    gap: 2px;
    flex: 1;
    max-width: 200px;
  }

  .threat-level-display__level-segment {
    height: 12px;
    flex: 1;
    background-color: var(--color-bg-tertiary);
    border-radius: 2px;
    transition: background-color 300ms ease-out;
  }

  .threat-level-display__level-segment--filled {
    background-color: var(--segment-color);
  }

  .threat-level-display__level-label {
    font-size: var(--text-sm);
    font-weight: 600;
  }

  .threat-level-display__shield-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .threat-level-display__shield-icon {
    font-size: var(--text-xl);
  }

  .threat-level-display__shield-icon--severe {
    animation: shield-pulse 0.8s ease-in-out infinite;
  }

  @keyframes shield-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .threat-level-display__shield-state {
    font-size: var(--text-sm);
  }

  .threat-level-display__since {
    font-size: var(--text-sm);
    color: var(--color-text-secondary);
  }

  @media (max-width: 768px) {
    .threat-level-display__level-bar {
      max-width: 150px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .threat-level-display__level-segment {
      transition: none;
    }

    .threat-level-display__shield-icon--severe {
      animation: none;
    }
  }
</style>
