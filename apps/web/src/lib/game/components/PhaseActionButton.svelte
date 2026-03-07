<script lang="ts">
  import { Button } from '$lib/ui';
  import {
    canSelectEmail,
    canOpenWorksheet,
    canRequestVerification,
    canMakeDecision,
    canViewResults,
    canContainThreat,
    canUpgradeFacility,
    canAdvanceDay,
    canRestart,
  } from '$lib/game/store/ui-store';

  import type { Snippet } from 'svelte';

  type ActionType =
    | 'selectEmail'
    | 'openWorksheet'
    | 'requestVerification'
    | 'makeDecision'
    | 'viewResults'
    | 'containThreat'
    | 'upgradeFacility'
    | 'advanceDay'
    | 'restart';

  interface Props {
    action: ActionType;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  }

  const {
    action,
    variant = 'primary',
    size = 'md',
    disabled = false,
    onclick = undefined,
    children,
  }: Props = $props();

  const isEnabled = $derived.by(() => {
    switch (action) {
      case 'selectEmail':
        return $canSelectEmail;
      case 'openWorksheet':
        return $canOpenWorksheet;
      case 'requestVerification':
        return $canRequestVerification;
      case 'makeDecision':
        return $canMakeDecision;
      case 'viewResults':
        return $canViewResults;
      case 'containThreat':
        return $canContainThreat;
      case 'upgradeFacility':
        return $canUpgradeFacility;
      case 'advanceDay':
        return $canAdvanceDay;
      case 'restart':
        return $canRestart;
      default:
        return false;
    }
  });

  const isDisabled = $derived(disabled || !isEnabled);

  const handleClick = $derived.by(() => {
    if (!isDisabled && onclick) {
      return onclick;
    }
    return undefined;
  });
</script>

{#if handleClick}
  <Button {variant} {size} disabled={isDisabled} onclick={handleClick}>
    {#if children}
      {@render children()}
    {/if}
  </Button>
{:else}
  <Button {variant} {size} disabled={isDisabled}>
    {#if children}
      {@render children()}
    {/if}
  </Button>
{/if}
