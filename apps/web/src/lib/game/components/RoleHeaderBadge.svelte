<script lang="ts">
  import type { CoopRole } from '@the-dmz/shared/schemas';

  interface Props {
    role: CoopRole;
    isAuthority?: boolean;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }

  const { role, isAuthority = false, showLabel = true, size = 'md' }: Props = $props();

  const roleLabels: Record<CoopRole, string> = {
    triage_lead: 'TRIAGE LEAD',
    verification_lead: 'VERIFICATION LEAD',
  };

  const variant = $derived(role === 'triage_lead' ? 'triage' : 'verification');
  const sizeClass = $derived(`role-badge--${size}`);
</script>

<span
  class="role-badge {variant} {sizeClass}"
  class:role-badge--authority={isAuthority}
  role="status"
  aria-label="{roleLabels[role]} role{isAuthority ? ', has authority' : ''}"
>
  <span class="role-badge__indicator" aria-hidden="true"></span>
  {#if showLabel}
    <span class="role-badge__label">{roleLabels[role]}</span>
  {/if}
  {#if isAuthority}
    <span class="role-badge__authority-icon" aria-label="(authority)">*</span>
  {/if}
</span>

<style>
  .role-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-terminal);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: var(--radius-sm);
    border: 1px solid;
  }

  .role-badge--sm {
    padding: var(--space-0) var(--space-2);
    font-size: var(--text-xs);
  }

  .role-badge--md {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
  }

  .role-badge--lg {
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-md);
  }

  .role-badge--triage {
    background-color: color-mix(in srgb, var(--color-safe) 15%, transparent);
    border-color: var(--color-safe);
    color: var(--color-safe);
  }

  .role-badge--verification {
    background-color: color-mix(in srgb, var(--color-amber) 15%, transparent);
    border-color: var(--color-amber);
    color: var(--color-amber);
  }

  .role-badge__indicator {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    background-color: currentColor;
  }

  .role-badge--authority {
    animation: pulse-outline 2s ease-in-out infinite;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-amber) 30%, transparent);
  }

  .role-badge__authority-icon {
    font-size: 0.9em;
    font-weight: 700;
    margin-left: var(--space-1);
  }

  @keyframes pulse-outline {
    0%,
    100% {
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-amber) 30%, transparent);
    }
    50% {
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-amber) 50%, transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .role-badge--authority {
      animation: none;
    }
  }
</style>
