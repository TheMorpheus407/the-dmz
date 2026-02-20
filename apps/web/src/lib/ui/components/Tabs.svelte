<script lang="ts">
  /* eslint-disable prefer-const */
  import type { Snippet } from 'svelte';

  interface Tab {
    id: string;
    label: string;
    content: Snippet;
    disabled?: boolean;
  }

  interface Props {
    tabs: Tab[];
    activeTab?: string;
    ariaLabel?: string;
    ontabchange?: (tabId: string) => void;
  }

  let { tabs, activeTab = $bindable(tabs[0]?.id ?? ''), ariaLabel, ontabchange }: Props = $props();

  let tabRefs: HTMLButtonElement[] = $state([]);

  function handleKeyDown(e: KeyboardEvent, index: number) {
    let newIndex = index;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = getPrevEnabledTab(index);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = getNextEnabledTab(index);
        break;
      case 'Home':
        e.preventDefault();
        newIndex = getFirstEnabledTab();
        break;
      case 'End':
        e.preventDefault();
        newIndex = getLastEnabledTab();
        break;
      default:
        return;
    }

    if (newIndex !== index) {
      activateTab(newIndex);
    }
  }

  function getPrevEnabledTab(currentIndex: number): number {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!tabs[i]?.disabled) return i;
    }
    return currentIndex;
  }

  function getNextEnabledTab(currentIndex: number): number {
    for (let i = currentIndex + 1; i < tabs.length; i++) {
      if (!tabs[i]?.disabled) return i;
    }
    return currentIndex;
  }

  function getFirstEnabledTab(): number {
    for (let i = 0; i < tabs.length; i++) {
      if (!tabs[i]?.disabled) return i;
    }
    return 0;
  }

  function getLastEnabledTab(): number {
    for (let i = tabs.length - 1; i >= 0; i--) {
      if (!tabs[i]?.disabled) return i;
    }
    return tabs.length - 1;
  }

  function activateTab(index: number) {
    const tab = tabs[index];
    if (tab && !tab.disabled) {
      activeTab = tab.id;
      tabRefs[index]?.focus();
      ontabchange?.(tab.id);
    }
  }

  function handleTabClick(tabId: string) {
    activeTab = tabId;
    ontabchange?.(tabId);
  }

  let activeTabData = $derived(tabs.find((t) => t.id === activeTab));
</script>

<div class="tabs" role="tablist" aria-label={ariaLabel}>
  <div class="tabs__list">
    {#each tabs as tab, index (tab.id)}
      <button
        type="button"
        bind:this={tabRefs[index]}
        class="tabs__tab"
        class:tabs__tab--active={tab.id === activeTab}
        class:tabs__tab--disabled={tab.disabled}
        role="tab"
        id={`tab-${tab.id}`}
        aria-selected={tab.id === activeTab}
        aria-controls={`panel-${tab.id}`}
        tabindex={tab.id === activeTab ? 0 : -1}
        disabled={tab.disabled}
        onclick={() => handleTabClick(tab.id)}
        onkeydown={(e) => handleKeyDown(e, index)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if activeTabData}
    <div
      class="tabs__panel"
      role="tabpanel"
      id={`panel-${activeTabData.id}`}
      aria-labelledby={`tab-${activeTabData.id}`}
    >
      {@render activeTabData.content()}
    </div>
  {/if}
</div>

<style>
  .tabs {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .tabs__list {
    display: flex;
    gap: var(--space-1);
    border-bottom: var(--border-default);
    padding-bottom: var(--space-1);
  }

  .tabs__tab {
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition:
      color 200ms ease-out,
      border-color 200ms ease-out;
  }

  .tabs__tab:hover:not(:disabled) {
    color: var(--color-text);
  }

  .tabs__tab:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .tabs__tab--active {
    color: var(--color-text);
    border-bottom-color: var(--color-accent);
  }

  .tabs__tab--disabled,
  .tabs__tab:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tabs__panel {
    padding: var(--space-3) 0;
  }
</style>
