<script lang="ts">
  import { comparisonStore } from '$lib/game/store/document-comparison-store';
  import type { DocumentType } from '@the-dmz/shared';

  import type { Snippet } from 'svelte';

  interface DraggableDocumentProps {
    documentId: string;
    documentType: DocumentType;
    title: string;
    children?: Snippet;
  }

  const { documentId, documentType, title, children }: DraggableDocumentProps = $props();

  let isDragging = $state(false);

  function handleDragStart(e: DragEvent) {
    if (!e.dataTransfer) return;

    isDragging = true;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        documentId,
        documentType,
        title,
      }),
    );

    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = title;
    ghost.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      padding: 8px 12px;
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-phosphor-green);
      border-radius: 4px;
      font-family: var(--font-terminal);
      font-size: 12px;
      color: var(--color-phosphor-green);
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);

    setTimeout(() => {
      document.body.removeChild(ghost);
    }, 0);

    comparisonStore.setPrimaryDocument({
      documentId,
      documentType,
      title,
    });
  }

  function handleDragEnd() {
    isDragging = false;
  }

  function handleClick() {
    comparisonStore.startComparison({
      documentId,
      documentType,
      title,
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }
</script>

<div
  class="draggable-document"
  class:draggable-document--dragging={isDragging}
  draggable="true"
  role="button"
  tabindex="0"
  aria-label="Drag {title} for comparison"
  aria-grabbed={isDragging}
  ondragstart={handleDragStart}
  ondragend={handleDragEnd}
  onclick={handleClick}
  onkeydown={handleKeyDown}
>
  {#if children}
    {@render children()}
  {:else}
    <span class="draggable-document__title">{title}</span>
  {/if}
</div>

<style>
  .draggable-document {
    cursor: grab;
    user-select: none;
    transition:
      opacity 150ms ease,
      transform 150ms ease;
  }

  .draggable-document:active {
    cursor: grabbing;
  }

  .draggable-document:focus-visible {
    outline: 2px solid var(--color-phosphor-green);
    outline-offset: 2px;
  }

  .draggable-document--dragging {
    opacity: 0.5;
  }

  .draggable-document__title {
    font-family: var(--font-terminal);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  :global(.drag-ghost) {
    animation: drag-pulse 0.5s ease-in-out infinite;
  }

  @keyframes drag-pulse {
    0%,
    100% {
      box-shadow: 0 0 4px var(--color-phosphor-green);
    }
    50% {
      box-shadow: 0 0 8px var(--color-phosphor-green);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .draggable-document {
      transition: none;
    }

    :global(.drag-ghost) {
      animation: none;
    }
  }
</style>
