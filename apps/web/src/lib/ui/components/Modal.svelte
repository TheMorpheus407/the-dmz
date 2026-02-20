<script lang="ts">
  /* eslint-disable prefer-const */
  import { onMount, tick } from 'svelte';

  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    title: string;
    size?: 'sm' | 'md' | 'lg';
    closeOnEscape?: boolean;
    closeOnOverlayClick?: boolean;
    ariaDescribedBy?: string;
    onclose?: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let {
    open = $bindable(false),
    title,
    size = 'md',
    closeOnEscape = true,
    closeOnOverlayClick = true,
    ariaDescribedBy,
    onclose,
    children,
    footer,
  }: Props = $props();

  let dialogRef: HTMLDivElement | null = $state(null);
  let previousActiveElement: HTMLElement | null = $state(null);
  let hasInitialized = $state(false);

  function handleClose() {
    open = false;
    onclose?.();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && closeOnEscape) {
      e.preventDefault();
      handleClose();
    }

    if (e.key === 'Tab') {
      handleTabKey(e);
    }
  }

  function handleTabKey(e: KeyboardEvent) {
    if (!dialogRef) return;

    const focusableElements = dialogRef.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  }

  function handleOverlayClick(e: MouseEvent) {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      handleClose();
    }
  }

  onMount(() => {
    hasInitialized = true;
    if (open && !previousActiveElement) {
      previousActiveElement = document.activeElement as HTMLElement;
      void focusDialog();
    }
  });

  $effect(() => {
    if (!hasInitialized) return;

    if (open) {
      if (!previousActiveElement) {
        previousActiveElement = document.activeElement as HTMLElement;
      }
      void tick().then(focusDialog);
    } else if (previousActiveElement) {
      previousActiveElement.focus();
      previousActiveElement = null;
    }
  });

  async function focusDialog() {
    await tick();
    const focusable = dialogRef?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    (focusable as HTMLElement)?.focus();
  }
</script>

{#if open}
  <div
    class="modal-overlay"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="modal-title"
    aria-describedby={ariaDescribedBy}
    bind:this={dialogRef}
    onclick={handleOverlayClick}
    onkeydown={handleKeyDown}
  >
    <div class="modal modal--{size}">
      <header class="modal__header">
        <h2 id="modal-title" class="modal__title">{title}</h2>
        <button type="button" class="modal__close" aria-label="Close modal" onclick={handleClose}>
          ×
        </button>
      </header>

      <div class="modal__content">
        {@render children()}
      </div>

      {#if footer}
        <footer class="modal__footer">
          {@render footer()}
        </footer>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-backdrop);
    z-index: 100;
  }

  .modal {
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-soft);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal--sm {
    width: 90%;
    max-width: 400px;
  }

  .modal--md {
    width: 90%;
    max-width: 600px;
  }

  .modal--lg {
    width: 90%;
    max-width: 900px;
  }

  .modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: var(--border-default);
  }

  .modal__title {
    font-family: var(--font-ui);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .modal__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-size: var(--text-xl);
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition:
      color 200ms ease-out,
      background-color 200ms ease-out;
  }

  .modal__close:hover {
    color: var(--color-text);
    background-color: var(--color-bg-hover);
  }

  .modal__close:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .modal__content {
    padding: var(--space-4);
    overflow-y: auto;
    color: var(--color-text-document);
  }

  .modal__footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: var(--space-4);
    border-top: var(--border-default);
  }
</style>
