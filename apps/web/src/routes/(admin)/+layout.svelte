<script lang="ts">
  import { onMount } from 'svelte';

  import { themeStore, getRouteDefaultTheme, STORAGE_KEY } from '$lib/stores/theme';
  import Drawer from '$lib/ui/components/Drawer.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingState from '$lib/ui/components/LoadingState.svelte';

  import type { Snippet } from 'svelte';

  import { navigating, page } from '$app/stores';

  interface Props {
    children?: Snippet;
  }

  const { children }: Props = $props();

  let isSidebarOpen = $state(false);

  const adminNavItems = [
    { href: '/admin', label: 'Dashboard', icon: '◉' },
    { href: '/admin/users', label: 'Users', icon: '◯' },
    { href: '/admin/campaigns', label: 'Campaigns', icon: '◎' },
    { href: '/admin/reports', label: 'Reports', icon: '◈' },
    { href: '/admin/audit', label: 'Audit', icon: '▣' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙' },
  ];

  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
  }

  function closeSidebar() {
    isSidebarOpen = false;
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
    } else if (!localStorage.getItem(STORAGE_KEY) && !systemPrefs.prefersContrast) {
      themeStore.setTheme(getRouteDefaultTheme('admin'));
    }
  });

  // eslint-disable-next-line prefer-const
  let currentPath = $derived($page.url.pathname);
</script>

<section class="surface surface-admin" data-surface="admin">
  <div class="shell-admin">
    <header class="shell-admin__header">
      <Button variant="ghost" ariaLabel="Toggle navigation menu" onclick={toggleSidebar}>☰</Button>
      <h1 class="shell-admin__title">Admin Console</h1>
      <div class="shell-admin__header-actions">
        <Button variant="ghost" size="sm">Logout</Button>
      </div>
    </header>

    <aside class="shell-admin__sidebar">
      <nav class="shell-admin__nav" aria-label="Admin navigation">
        {#each adminNavItems as item (item.href)}
          <a
            href={item.href}
            class="shell-admin__nav-item"
            class:shell-admin__nav-item--active={currentPath === item.href}
            onclick={closeSidebar}
          >
            <span class="shell-admin__nav-icon">{item.icon}</span>
            <span class="shell-admin__nav-label">{item.label}</span>
          </a>
        {/each}
      </nav>
    </aside>

    <main class="shell-admin__main">
      {#if $navigating}
        <div class="loading-boundary" role="status" aria-live="polite">
          <LoadingState
            variant="spinner"
            size="md"
            message="Loading dashboard..."
            label="Admin loading"
          />
        </div>
      {:else if children}
        {@render children()}
      {/if}
    </main>
  </div>

  <Drawer bind:open={isSidebarOpen} position="left" ariaLabel="Navigation Menu">
    <nav class="shell-admin__nav" aria-label="Admin navigation">
      {#each adminNavItems as item (item.href)}
        <a
          href={item.href}
          class="shell-admin__nav-item"
          class:shell-admin__nav-item--active={currentPath === item.href}
          onclick={closeSidebar}
        >
          <span class="shell-admin__nav-icon">{item.icon}</span>
          <span class="shell-admin__nav-label">{item.label}</span>
        </a>
      {/each}
    </nav>
  </Drawer>
</section>

<style>
  .surface-admin {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .shell-admin {
    display: grid;
    grid-template-columns: 240px 1fr;
    grid-template-rows: auto 1fr;
    min-height: 100vh;
    width: 100%;
  }

  .shell-admin__header {
    grid-column: 1 / -1;
    grid-row: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: var(--border-default);
    background-color: var(--color-surface);
  }

  .shell-admin__title {
    font-family: var(--font-ui);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .shell-admin__header-actions {
    display: flex;
    gap: var(--space-2);
  }

  .shell-admin__sidebar {
    grid-column: 1;
    grid-row: 2;
    padding: var(--space-4);
    border-right: var(--border-default);
    background-color: var(--color-bg);
    overflow-y: auto;
  }

  .shell-admin__nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .shell-admin__nav-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--radius-sm);
    transition:
      background-color 200ms ease-out,
      color 200ms ease-out;
  }

  .shell-admin__nav-item:hover {
    background-color: var(--color-bg-hover);
    color: var(--color-text);
  }

  .shell-admin__nav-item:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .shell-admin__nav-item--active {
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
    border-left: 2px solid var(--color-accent);
  }

  .shell-admin__nav-icon {
    font-size: var(--text-base);
    width: 20px;
    text-align: center;
  }

  .shell-admin__nav-label {
    flex: 1;
  }

  .shell-admin__main {
    grid-column: 2;
    grid-row: 2;
    padding: var(--space-4);
    overflow-y: auto;
  }

  .loading-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 200px;
    background-color: var(--color-surface);
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
  }

  @media (max-width: 767px) {
    .shell-admin {
      grid-template-columns: 1fr;
    }

    .shell-admin__sidebar {
      display: none;
    }

    .shell-admin__main {
      grid-column: 1;
      padding: var(--space-2);
    }

    .shell-admin__title {
      font-size: var(--text-base);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shell-admin__nav-item {
      transition: none;
    }
  }
</style>
