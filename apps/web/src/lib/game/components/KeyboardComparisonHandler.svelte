<script lang="ts">
  import { onDestroy } from 'svelte';

  import {
    comparisonStore,
    keyboardSelectionTarget,
  } from '$lib/game/store/document-comparison-store';
  import type { DocumentType } from '@the-dmz/shared';

  interface DocumentOption {
    documentId: string;
    documentType: DocumentType;
    title: string;
  }

  interface KeyboardComparisonHandlerProps {
    availableDocuments?: DocumentOption[];
    onSelectDocument?: (documentId: string) => void;
  }

  const { availableDocuments = [], onSelectDocument }: KeyboardComparisonHandlerProps = $props();

  let isActive = $state(false);
  let selectedIndex = $state(0);

  const currentMode = $derived($keyboardSelectionTarget);

  const unsub = comparisonStore.subscribe((state) => {
    isActive = state.isKeyboardMode;
  });

  onDestroy(() => {
    unsub();
  });

  function handleKeyDown(e: KeyboardEvent) {
    if (!isActive) return;

    switch (e.key) {
      case 'ArrowDown':
      case 'j':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, availableDocuments.length - 1);
        break;
      case 'ArrowUp':
      case 'k':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        break;
      case 'Enter':
        e.preventDefault();
        handleSelect();
        break;
      case 'Escape':
        e.preventDefault();
        handleCancel();
        break;
      case 'Tab':
        e.preventDefault();
        handleToggleTarget();
        break;
    }
  }

  function handleSelect() {
    const doc = availableDocuments[selectedIndex];
    if (!doc) return;

    const target = currentMode;

    if (target === 'primary') {
      comparisonStore.setPrimaryDocument({
        documentId: doc.documentId,
        documentType: doc.documentType,
        title: doc.title,
      });
      comparisonStore.setKeyboardSelectionTarget('secondary');
      selectedIndex = 0;
    } else if (target === 'secondary') {
      comparisonStore.setSecondaryDocument({
        documentId: doc.documentId,
        documentType: doc.documentType,
        title: doc.title,
      });
      comparisonStore.confirmKeyboardSelection();
    }

    onSelectDocument?.(doc.documentId);
  }

  function handleCancel() {
    comparisonStore.exitKeyboardMode();
    selectedIndex = 0;
  }

  function handleToggleTarget() {
    if (currentMode === 'primary') {
      comparisonStore.setKeyboardSelectionTarget('secondary');
    } else {
      comparisonStore.setKeyboardSelectionTarget('primary');
    }
    selectedIndex = 0;
  }

  export function startComparison() {
    comparisonStore.enterKeyboardMode();
    selectedIndex = 0;
  }

  export function closeComparison() {
    comparisonStore.closeComparison();
    selectedIndex = 0;
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isActive}
  <div
    class="keyboard-comparison-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Keyboard comparison mode"
  >
    <div class="keyboard-comparison-overlay__backdrop"></div>
    <div class="keyboard-comparison-overlay__content">
      <div class="keyboard-comparison-overlay__header">
        <h2 class="keyboard-comparison-overlay__title">
          {currentMode === 'primary' ? 'Select Primary Document' : 'Select Comparison Document'}
        </h2>
        <p class="keyboard-comparison-overlay__hint">
          Use arrow keys to navigate, Enter to select, Tab to switch target, Esc to cancel
        </p>
      </div>

      <div class="keyboard-comparison-overlay__list" role="listbox" aria-label="Documents">
        {#each availableDocuments as doc, index (doc.documentId)}
          <button
            type="button"
            class="keyboard-comparison-overlay__item"
            class:keyboard-comparison-overlay__item--selected={index === selectedIndex}
            role="option"
            aria-selected={index === selectedIndex}
            onclick={() => {
              selectedIndex = index;
              handleSelect();
            }}
          >
            <span class="keyboard-comparison-overlay__item-title">{doc.title}</span>
            <span class="keyboard-comparison-overlay__item-type">{doc.documentType}</span>
          </button>
        {/each}
      </div>

      <div class="keyboard-comparison-overlay__footer">
        <button type="button" class="keyboard-comparison-overlay__cancel" onclick={handleCancel}>
          Cancel (Esc)
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .keyboard-comparison-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .keyboard-comparison-overlay__backdrop {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.7);
  }

  .keyboard-comparison-overlay__content {
    position: relative;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    background-color: var(--color-bg-secondary);
    border: 2px solid var(--color-phosphor-green);
    border-radius: var(--radius-md);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .keyboard-comparison-overlay__header {
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-phosphor-green-dark);
  }

  .keyboard-comparison-overlay__title {
    font-family: var(--font-terminal);
    font-size: var(--text-lg);
    color: var(--color-phosphor-green);
    margin: 0 0 var(--space-2) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .keyboard-comparison-overlay__hint {
    font-family: var(--font-terminal);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin: 0;
  }

  .keyboard-comparison-overlay__list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .keyboard-comparison-overlay__item {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    background-color: var(--color-bg-primary);
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
    text-align: left;
    margin-bottom: var(--space-1);
    transition:
      background-color 150ms ease,
      border-color 150ms ease;
  }

  .keyboard-comparison-overlay__item:hover,
  .keyboard-comparison-overlay__item--selected {
    background-color: var(--color-bg-tertiary);
    border-color: var(--color-phosphor-green);
  }

  .keyboard-comparison-overlay__item:focus-visible {
    outline: 2px solid var(--color-phosphor-green);
    outline-offset: 2px;
  }

  .keyboard-comparison-overlay__item-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .keyboard-comparison-overlay__item-type {
    font-size: var(--text-xs);
    color: var(--color-amber);
    margin-left: var(--space-2);
  }

  .keyboard-comparison-overlay__footer {
    padding: var(--space-3);
    border-top: 1px solid var(--color-phosphor-green-dark);
    display: flex;
    justify-content: flex-end;
  }

  .keyboard-comparison-overlay__cancel {
    padding: var(--space-2) var(--space-4);
    background-color: transparent;
    border: 1px solid var(--color-phosphor-green-dark);
    border-radius: var(--radius-sm);
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 150ms ease;
  }

  .keyboard-comparison-overlay__cancel:hover {
    border-color: var(--color-phosphor-green);
    color: var(--color-phosphor-green);
  }

  .keyboard-comparison-overlay__cancel:focus-visible {
    outline: 2px solid var(--color-phosphor-green);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .keyboard-comparison-overlay__item,
    .keyboard-comparison-overlay__cancel {
      transition: none;
    }
  }
</style>
