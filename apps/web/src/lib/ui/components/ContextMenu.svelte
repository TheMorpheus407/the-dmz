<script lang="ts">
  import type { ContextMenuState, MenuItem } from './context-menu-types';

  interface Props {
    contextState: ContextMenuState;
    onSelect?: (itemId: string) => void;
    onClose?: () => void;
  }

  let { contextState, onSelect, onClose }: Props = $props();

  let focusedIndex = $state(-1);
  let menuRef = $state<HTMLDivElement | null>(null);
  let menuItems = $derived(contextState.sections.flatMap((s) => s.items));

  function handleKeyDown(event: KeyboardEvent) {
    if (!contextState.isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusedIndex = Math.min(focusedIndex + 1, menuItems.length - 1);
        scrollToFocused();
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusedIndex = Math.max(focusedIndex - 1, 0);
        scrollToFocused();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && menuItems[focusedIndex] && !menuItems[focusedIndex]?.disabled) {
          handleSelect(menuItems[focusedIndex]!.id);
        }
        break;
      case 'Escape':
        event.preventDefault();
        handleClose();
        break;
      case 'Tab':
        event.preventDefault();
        handleClose();
        break;
    }
  }

  function scrollToFocused() {
    if (!menuRef || focusedIndex < 0) return;
    const focusedElement = menuRef.querySelector(`[data-index="${focusedIndex}"]`);
    focusedElement?.scrollIntoView({ block: 'nearest' });
  }

  function handleSelect(itemId: string) {
    onSelect?.(itemId);
  }

  function handleClose() {
    focusedIndex = -1;
    onClose?.();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleItemClick(item: MenuItem) {
    if (!item.disabled) {
      handleSelect(item.id);
    }
  }

  function handleItemMouseEnter(index: number) {
    focusedIndex = index;
  }

  export function focusMenu() {
    focusedIndex = 0;
    setTimeout(() => {
      menuRef?.focus();
      scrollToFocused();
    }, 0);
  }

  $effect(() => {
    if (contextState.isOpen && focusedIndex === -1) {
      focusedIndex = 0;
    }
    if (!contextState.isOpen) {
      focusedIndex = -1;
    }
  });
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if contextState.isOpen}
  <div
    class="context-menu-backdrop"
    role="presentation"
    onclick={handleBackdropClick}
    oncontextmenu={(e) => {
      e.preventDefault();
      handleClose();
    }}
  >
    <div
      bind:this={menuRef}
      class="context-menu"
      role="menu"
      aria-label="Context menu"
      style="left: {contextState.position.x}px; top: {contextState.position.y}px;"
      tabindex="-1"
    >
      {#each contextState.sections as section, sectionIndex (sectionIndex)}
        {#each section.items as item, itemIndex (sectionIndex + '-' + itemIndex + '-' + item.id)}
          {@const globalIndex = menuItems.indexOf(item)}
          <button
            type="button"
            class="context-menu__item"
            class:context-menu__item--disabled={item.disabled}
            class:context-menu__item--focused={focusedIndex === globalIndex}
            class:context-menu__item--highlight-green={item.color === 'green'}
            class:context-menu__item--highlight-amber={item.color === 'amber'}
            class:context-menu__item--highlight-red={item.color === 'red'}
            role="menuitem"
            data-index={globalIndex}
            disabled={item.disabled}
            onclick={() => handleItemClick(item)}
            onmouseenter={() => handleItemMouseEnter(globalIndex)}
          >
            <span class="context-menu__item-label">{item.label}</span>
            {#if item.shortcut}
              <span class="context-menu__item-shortcut">{item.shortcut}</span>
            {/if}
          </button>
          {#if item.dividerAfter}
            <div class="context-menu__divider" role="separator"></div>
          {/if}
        {/each}
      {/each}
    </div>
  </div>
{/if}

<style>
  .context-menu-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
  }

  .context-menu {
    position: absolute;
    min-width: 200px;
    max-width: 300px;
    background-color: var(--color-bg-primary, #0a0a0a);
    border: 1px solid var(--color-phosphor-green-dark, #1a3d1a);
    border-radius: var(--radius-sm, 4px);
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.5),
      0 0 10px rgba(0, 255, 65, 0.1);
    padding: var(--space-1, 4px) 0;
    font-family: var(--font-terminal, 'Courier New', monospace);
    font-size: var(--text-sm, 13px);
    z-index: 1001;
    animation: context-menu-appear 0.1s ease-out;
  }

  @keyframes context-menu-appear {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .context-menu {
      animation: none;
    }
  }

  .context-menu__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-2, 8px) var(--space-3, 12px);
    background: transparent;
    border: none;
    color: var(--color-phosphor-green, #00ff41);
    font-family: inherit;
    font-size: inherit;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .context-menu__item:hover,
  .context-menu__item--focused {
    background-color: var(--color-bg-hover, rgba(0, 255, 65, 0.1));
    outline: none;
  }

  .context-menu__item--focused {
    box-shadow: inset 0 0 0 1px var(--color-phosphor-green, #00ff41);
  }

  .context-menu__item--disabled {
    color: var(--color-text-muted, #666);
    cursor: not-allowed;
    opacity: 0.5;
  }

  .context-menu__item--disabled:hover,
  .context-menu__item--disabled:focus {
    background-color: transparent;
    box-shadow: none;
  }

  .context-menu__item--highlight-green .context-menu__item-label::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: var(--color-safe, #00ff41);
    border-radius: 50%;
    margin-right: var(--space-2, 8px);
  }

  .context-menu__item--highlight-amber .context-menu__item-label::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: var(--color-warning, #ffaa00);
    border-radius: 50%;
    margin-right: var(--space-2, 8px);
  }

  .context-menu__item--highlight-red .context-menu__item-label::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: var(--color-danger, #ff3333);
    border-radius: 50%;
    margin-right: var(--space-2, 8px);
  }

  .context-menu__item-label {
    flex: 1;
  }

  .context-menu__item-shortcut {
    color: var(--color-text-muted, #666);
    font-size: var(--text-xs, 11px);
    margin-left: var(--space-4, 16px);
  }

  .context-menu__divider {
    height: 1px;
    background-color: var(--color-phosphor-green-dark, #1a3d1a);
    margin: var(--space-1, 4px) var(--space-2, 8px);
  }
</style>
