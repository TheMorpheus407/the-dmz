<script lang="ts">
  import type { DialogChoice, DialogChoiceRequirement } from '@the-dmz/shared/types';

  interface Props {
    choices: DialogChoice[];
    requirements?: DialogChoiceRequirement;
    onSelect: (choice: DialogChoice) => void;
    disabled?: boolean;
  }

  const { choices, requirements, onSelect, disabled = false }: Props = $props();

  function checkRequirements(req: DialogChoiceRequirement | undefined): boolean {
    if (!req) return true;

    if (req.trustScore !== undefined && req.trustScore > (requirements?.trustScore ?? 0)) {
      return false;
    }
    if (req.credits !== undefined && req.credits > (requirements?.credits ?? 0)) {
      return false;
    }
    if (req.flags && req.flags.length > 0) {
      const hasAllFlags = req.flags.every((flag: string) => requirements?.flags?.includes(flag));
      if (!hasAllFlags) return false;
    }
    return true;
  }

  function handleKeyDown(event: KeyboardEvent, choice: DialogChoice) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!disabled && checkRequirements(choice.requirements)) {
        onSelect(choice);
      }
    }
    if (event.key >= '1' && event.key <= String(choices.length)) {
      const choiceIndex = parseInt(event.key) - 1;
      const selectedChoice = choices[choiceIndex];
      if (selectedChoice && !disabled && checkRequirements(selectedChoice.requirements)) {
        onSelect(selectedChoice);
      }
    }
  }

  function getRequirementReason(req: DialogChoiceRequirement | undefined): string | null {
    if (!req) return null;

    if (req.trustScore !== undefined && req.trustScore > (requirements?.trustScore ?? 0)) {
      return `Requires trust score: ${req.trustScore}+`;
    }
    if (req.credits !== undefined && req.credits > (requirements?.credits ?? 0)) {
      return `Requires ${req.credits} credits`;
    }
    if (req.flags && req.flags.length > 0) {
      const missingFlags = req.flags.filter((f: string) => !requirements?.flags?.includes(f));
      if (missingFlags.length > 0) {
        return `Requires: ${missingFlags.join(', ')}`;
      }
    }
    return null;
  }
</script>

<div class="choice-panel" class:choice-panel--disabled={disabled}>
  <ul class="choice-panel__list">
    {#each choices as choice, index (choice.id)}
      {@const isAvailable = checkRequirements(choice.requirements)}
      {@const reason = getRequirementReason(choice.requirements)}
      <li class="choice-panel__item" class:choice-panel__item--unavailable={!isAvailable}>
        <button
          type="button"
          class="choice-panel__button"
          disabled={disabled || !isAvailable}
          onclick={() => isAvailable && onSelect(choice)}
          onkeydown={(e) => handleKeyDown(e, choice)}
        >
          <span class="choice-panel__number">[{index + 1}]</span>
          <span class="choice-panel__text">{choice.text}</span>
        </button>
        {#if !isAvailable && reason}
          <span class="choice-panel__reason">{reason}</span>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .choice-panel {
    padding: var(--space-2, 0.5rem);
    background: var(--color-bg-secondary, #141a22);
    border: 1px solid var(--color-phosphor-green-dark, #334433);
    border-radius: 4px;
  }

  .choice-panel--disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .choice-panel__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 0.5rem);
  }

  .choice-panel__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1, 0.25rem);
  }

  .choice-panel__button {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-2, 0.5rem);
    background: var(--color-bg-tertiary, #1e2832);
    border: 1px solid var(--color-phosphor-green-dark, #334433);
    border-radius: 4px;
    cursor: pointer;
    text-align: left;
    font-family: var(--font-terminal, monospace);
    font-size: var(--text-sm, 0.875rem);
    color: var(--color-document-white, #e0e0e0);
    transition: all 150ms ease;
    width: 100%;
  }

  .choice-panel__button:hover:not(:disabled) {
    border-color: var(--color-phosphor-green, #33ff33);
    background: var(--color-bg-hover, #253040);
  }

  .choice-panel__button:focus {
    outline: none;
    border-color: var(--color-phosphor-green, #33ff33);
  }

  .choice-panel__button:disabled {
    cursor: not-allowed;
  }

  .choice-panel__item--unavailable .choice-panel__button {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .choice-panel__number {
    color: var(--color-amber, #ffb000);
    font-weight: 600;
    flex-shrink: 0;
  }

  .choice-panel__text {
    flex: 1;
    line-height: 1.4;
  }

  .choice-panel__reason {
    font-family: var(--font-terminal, monospace);
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-danger, #ff5555);
    padding-left: var(--space-6, 1.5rem);
  }
</style>
