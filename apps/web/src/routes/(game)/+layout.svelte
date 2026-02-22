<script lang="ts">
  import { onMount } from 'svelte';

  import { themeStore, getRouteDefaultTheme, STORAGE_KEY } from '$lib/stores/theme';
  import Drawer from '$lib/ui/components/Drawer.svelte';
  import Button from '$lib/ui/components/Button.svelte';

  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  const { children }: Props = $props();

  type PanelId = 'inbox' | 'document' | 'status';
  let activePanel: PanelId = $state('document');
  let isStatusDrawerOpen = $state(false);

  function setActivePanel(panel: PanelId) {
    activePanel = panel;
  }

  function toggleStatusDrawer() {
    isStatusDrawerOpen = !isStatusDrawerOpen;
  }

  onMount(() => {
    themeStore.init();

    const systemPrefs = themeStore.getSystemPreferences();

    if (systemPrefs.prefersReducedMotion) {
      themeStore.setEffects({
        scanlines: false,
        curvature: false,
        glow: false,
        noise: false,
        vignette: false,
      });
    } else if (!localStorage.getItem(STORAGE_KEY)) {
      themeStore.setTheme(getRouteDefaultTheme('game'));
    }
  });
</script>

<section class="surface surface-game" data-surface="game">
  <div class="shell-game">
    <div class="shell-game__panel--inbox shell-game__panel--active">
      <div class="shell-game__placeholder">
        <span class="shell-game__placeholder-label">Inbox</span>
      </div>
    </div>

    <div class="shell-game__panel--document shell-game__panel--active">
      {#if children}
        {@render children()}
      {:else}
        <div class="shell-game__placeholder">
          <span class="shell-game__placeholder-label">Document</span>
        </div>
      {/if}
    </div>

    <div class="shell-game__panel--status">
      <div class="shell-game__placeholder">
        <span class="shell-game__placeholder-label">Status</span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        class="shell-game__drawer-toggle"
        onclick={toggleStatusDrawer}
        ariaLabel="Toggle status panel"
      >
        {isStatusDrawerOpen ? 'Close' : 'Status'}
      </Button>
    </div>
  </div>

  <Drawer bind:open={isStatusDrawerOpen} ariaLabel="Status Panel">
    <div class="shell-game__placeholder">
      <span class="shell-game__placeholder-label">Status</span>
    </div>
  </Drawer>

  <nav class="shell-game__mobile-nav" aria-label="Panel navigation">
    <button
      type="button"
      class="shell-game__mobile-tab"
      class:shell-game__mobile-tab--active={activePanel === 'inbox'}
      aria-selected={activePanel === 'inbox'}
      role="tab"
      onclick={() => setActivePanel('inbox')}
    >
      Inbox
    </button>
    <button
      type="button"
      class="shell-game__mobile-tab"
      class:shell-game__mobile-tab--active={activePanel === 'document'}
      aria-selected={activePanel === 'document'}
      role="tab"
      onclick={() => setActivePanel('document')}
    >
      Document
    </button>
    <button
      type="button"
      class="shell-game__mobile-tab"
      class:shell-game__mobile-tab--active={activePanel === 'status'}
      aria-selected={activePanel === 'status'}
      role="tab"
      onclick={() => setActivePanel('status')}
    >
      Status
    </button>
  </nav>
</section>

<style>
  .surface-game {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .shell-game {
    display: grid;
    grid-template-columns: 280px 1fr 300px;
    grid-template-rows: 1fr;
    gap: var(--space-4);
    height: 100vh;
    width: 100%;
    padding: var(--space-4);
    box-sizing: border-box;
  }

  .shell-game__panel--inbox {
    grid-column: 1;
    grid-row: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .shell-game__panel--document {
    grid-column: 2;
    grid-row: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .shell-game__panel--status {
    grid-column: 3;
    grid-row: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .shell-game__drawer-toggle {
    position: absolute;
    bottom: var(--space-2);
    right: var(--space-2);
  }

  .shell-game__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background-color: var(--color-bg-secondary);
    border: var(--border-default);
    border-radius: var(--radius-md);
  }

  .shell-game__placeholder-label {
    font-family: var(--font-ui);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .shell-game__mobile-nav {
    display: none;
  }

  .shell-game__mobile-tab {
    flex: 1;
    padding: var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    background: var(--color-bg-secondary);
    border: none;
    border-top: 2px solid transparent;
    cursor: pointer;
    transition:
      color 200ms ease-out,
      border-color 200ms ease-out;
  }

  .shell-game__mobile-tab:hover {
    color: var(--color-text);
  }

  .shell-game__mobile-tab:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .shell-game__mobile-tab--active {
    color: var(--color-text);
    border-top-color: var(--color-accent);
  }

  @media (min-width: var(--bp-tablet)) and (max-width: 1023px) {
    .shell-game {
      grid-template-columns: 240px 1fr;
    }

    .shell-game__panel--inbox {
      grid-column: 1;
    }

    .shell-game__panel--document {
      grid-column: 2;
    }

    .shell-game__panel--status {
      display: none;
    }
  }

  @media (max-width: 767px) {
    .shell-game {
      display: flex;
      flex-direction: column;
      grid-template-columns: 1fr;
      padding: var(--space-2);
      height: auto;
      min-height: calc(100vh - 60px);
    }

    .shell-game__panel--inbox,
    .shell-game__panel--document,
    .shell-game__panel--status {
      display: none;
      flex: 1;
      overflow: auto;
    }

    .shell-game__panel--inbox.shell-game__panel--active,
    .shell-game__panel--document.shell-game__panel--active,
    .shell-game__panel--status.shell-game__panel--active {
      display: flex;
    }

    .shell-game__drawer-toggle {
      display: none;
    }

    .shell-game__mobile-nav {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--color-surface);
      border-top: var(--border-default);
      z-index: 50;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shell-game__mobile-tab,
    .shell-game__panel--inbox,
    .shell-game__panel--document,
    .shell-game__panel--status {
      transition: none;
    }
  }
</style>
