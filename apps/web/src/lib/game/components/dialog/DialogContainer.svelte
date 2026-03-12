<script lang="ts">
  import {
    isDialogActive,
    dialogCurrentNodeId,
    dialogPlayerResources,
    dialogHistory,
    uiStore,
  } from '$lib/game/store/ui-store';
  import type { DialogTree, DialogChoice, GameEffect } from '@the-dmz/shared/types';
  import { triggerMorpheusGlitch } from '$lib/effects/crt-effects';

  import CharacterPortrait from './CharacterPortrait.svelte';
  import DialogText from './DialogText.svelte';
  import ChoicePanel from './ChoicePanel.svelte';

  interface Props {
    dialogTree?: DialogTree;
    onEffect?: (effect: GameEffect) => void;
    onDialogComplete?: (dialogId: string, totalNodesVisited: number) => void;
    onClose?: () => void;
  }

  const { dialogTree, onEffect, onDialogComplete, onClose }: Props = $props();

  const currentNode = $derived(
    dialogTree && $dialogCurrentNodeId ? dialogTree.nodes[$dialogCurrentNodeId] : undefined,
  );

  const speakerName = $derived(
    currentNode?.speaker === 'morpheus'
      ? 'MORPHEUS'
      : currentNode?.speaker === 'sysop7'
        ? 'SYSOP-7'
        : (currentNode?.factionId ?? ''),
  );

  const isMorpheus = $derived(currentNode?.speaker === 'morpheus');
  const hasChoices = $derived(!!currentNode?.choices && currentNode.choices.length > 0);
  const isDialogComplete = $derived(currentNode !== undefined && !hasChoices && !currentNode?.next);

  let previousNodeId = $state<string | null>(null);
  let nodesVisited = $state(0);

  $effect(() => {
    if (currentNode && currentNode.id !== previousNodeId) {
      nodesVisited += 1;
      if (isMorpheus) {
        triggerMorpheusGlitch();
      }
      previousNodeId = currentNode.id;
    }
  });

  $effect(() => {
    if (isDialogComplete && $isDialogActive && dialogTree?.id) {
      const dialogId = dialogTree.id;
      setTimeout(() => {
        onDialogComplete?.(dialogId, nodesVisited);
      }, 100);
    }
  });

  function handleTextComplete() {
    if (!hasChoices && currentNode?.next) {
      uiStore.advanceDialogNode(currentNode.next);
    }
  }

  function handleChoiceSelect(choice: DialogChoice) {
    if (currentNode) {
      uiStore.recordDialogChoice(currentNode.speaker, choice.text, choice.id);

      if (currentNode.effects) {
        for (const effect of currentNode.effects) {
          onEffect?.(effect);
        }
      }

      if (choice.nextNodeId) {
        uiStore.advanceDialogNode(choice.nextNodeId);
      }
    }
  }

  function handleClose() {
    uiStore.endDialog();
    onClose?.();
  }

  function handleBackdropKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClose();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if $isDialogActive && currentNode}
  <div class="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <div
      class="dialog-overlay__backdrop"
      role="button"
      tabindex="0"
      onclick={handleClose}
      onkeydown={handleBackdropKeyDown}
      aria-label="Close dialog"
    ></div>
    <div class="dialog-container" class:dialog-container--morpheus={isMorpheus}>
      <header class="dialog-container__header">
        <span id="dialog-title" class="dialog-container__title"
          >:: DIALOG :: {dialogTree?.name ?? 'Conversation'}</span
        >
        <button
          type="button"
          class="dialog-container__close"
          onclick={handleClose}
          aria-label="Close dialog"
        >
          ×
        </button>
      </header>

      <div class="dialog-container__body">
        <aside class="dialog-container__portrait">
          <CharacterPortrait speaker={currentNode.speaker} factionId={currentNode.factionId} />
        </aside>

        <main class="dialog-container__content">
          <div class="dialog-container__speaker-name">
            {speakerName}
          </div>

          <DialogText
            text={currentNode.text}
            speed={isMorpheus ? 35 : 45}
            onComplete={handleTextComplete}
          />

          {#if hasChoices}
            <div class="dialog-container__choices">
              <ChoicePanel
                choices={currentNode.choices ?? []}
                requirements={{
                  trustScore: $dialogPlayerResources.trust,
                  credits: $dialogPlayerResources.credits,
                  flags: $dialogPlayerResources.flags,
                }}
                onSelect={handleChoiceSelect}
              />
            </div>
          {/if}
        </main>
      </div>

      <footer class="dialog-container__footer">
        <span class="dialog-container__hint">Press [ESC] to close</span>
        {#if $dialogHistory.length > 0}
          <span class="dialog-container__history-count"
            >History: {$dialogHistory.length} entries</span
          >
        {/if}
      </footer>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4, 1rem);
  }

  .dialog-overlay__backdrop {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(4px);
  }

  .dialog-container {
    position: relative;
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    background-color: var(--color-bg-secondary, #141a22);
    border: 2px solid var(--color-phosphor-green-dark, #334433);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: var(--font-terminal, monospace);
    color: var(--color-document-white, #e0e0e0);
  }

  .dialog-container--morpheus {
    border-color: var(--color-phosphor-green, #33ff33);
    box-shadow:
      0 0 20px rgba(51, 255, 51, 0.2),
      inset 0 0 30px rgba(51, 255, 51, 0.05);
  }

  .dialog-container__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    border-bottom: 1px solid var(--color-phosphor-green-dark, #334433);
    background-color: var(--color-bg-tertiary, #1e2832);
  }

  .dialog-container__title {
    font-size: var(--text-sm, 0.875rem);
    color: var(--color-amber, #ffb000);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .dialog-container__close {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-phosphor-green-dim, #88aa88);
    cursor: pointer;
    padding: 0;
    line-height: 1;
    transition: color 150ms ease;
  }

  .dialog-container__close:hover {
    color: var(--color-phosphor-green, #33ff33);
  }

  .dialog-container__body {
    flex: 1;
    display: flex;
    gap: var(--space-3, 0.75rem);
    padding: var(--space-3, 0.75rem);
    overflow-y: auto;
  }

  .dialog-container__portrait {
    flex-shrink: 0;
  }

  .dialog-container__content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 0.75rem);
    min-width: 0;
  }

  .dialog-container__speaker-name {
    font-size: var(--text-sm, 0.875rem);
    color: var(--color-phosphor-green, #33ff33);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding-bottom: var(--space-1, 0.25rem);
    border-bottom: 1px solid var(--color-phosphor-green-dark, #334433);
  }

  .dialog-container__choices {
    margin-top: auto;
  }

  .dialog-container__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    border-top: 1px solid var(--color-phosphor-green-dark, #334433);
    background-color: var(--color-bg-tertiary, #1e2832);
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-phosphor-green-dim, #88aa88);
  }

  .dialog-container__hint {
    font-style: italic;
  }

  .dialog-container__history-count {
    color: var(--color-document-muted, #b0b0b0);
  }

  @media (max-width: 640px) {
    .dialog-container__body {
      flex-direction: column;
    }

    .dialog-container__portrait {
      display: none;
    }
  }
</style>
