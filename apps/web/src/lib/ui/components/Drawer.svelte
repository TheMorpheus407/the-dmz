<script lang="ts">
  /* eslint-disable prefer-const */
  import { onMount } from 'svelte';

  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    position?: 'left' | 'right';
    ariaLabel?: string;
    onclose?: () => void;
    children: Snippet;
  }

  let {
    open = $bindable(false),
    position = 'right',
    ariaLabel = 'Drawer',
    onclose,
    children,
  }: Props = $props();

  let drawerRef: HTMLElement | undefined = $state();
  let previouslyFocused: HTMLElement | null = $state(null);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      close();
    }
  }

  function close() {
    if (previouslyFocused) {
      previouslyFocused.focus();
    }
    open = false;
    if (onclose) {
      onclose();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  function handleBackdropKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      close();
    }
  }

  $effect(() => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      if (drawerRef) {
        const firstFocusable = drawerRef.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        setTimeout(() => firstFocusable?.focus(), 0);
      }
    } else {
      document.body.style.overflow = '';
    }
  });

  onMount(() => {
    return () => {
      document.body.style.overflow = '';
    };
  });
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
  <div
    class="drawer-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeyDown}
    role="dialog"
    aria-modal="true"
    aria-label={ariaLabel}
    tabindex="-1"
  >
    <div bind:this={drawerRef} class="drawer drawer--{position}" role="document">
      <div class="drawer__header">
        <button type="button" class="drawer__close" aria-label="Close drawer" onclick={close}>
          ×
        </button>
      </div>
      <div class="drawer__content">
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background-color: var(--color-backdrop);
    z-index: 100;
    display: flex;
  }

  .drawer {
    background-color: var(--color-surface);
    border: var(--border-default);
    height: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-soft);
  }

  .drawer--right {
    margin-left: auto;
    width: 300px;
    max-width: 90vw;
    animation: slideInRight 200ms ease-out;
  }

  .drawer--left {
    margin-right: auto;
    width: 300px;
    max-width: 90vw;
    animation: slideInLeft 200ms ease-out;
  }

  .drawer__header {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-2);
    border-bottom: var(--border-default);
  }

  .drawer__close {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--text-xl);
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    line-height: 1;
    border-radius: var(--radius-sm);
    transition:
      color 200ms ease-out,
      background-color 200ms ease-out;
  }

  .drawer__close:hover {
    color: var(--color-text);
    background-color: var(--color-bg-hover);
  }

  .drawer__close:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .drawer__content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4);
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes slideInLeft {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .drawer--right,
    .drawer--left {
      animation: none;
    }
  }
</style>
