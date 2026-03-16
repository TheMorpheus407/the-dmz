<script lang="ts">
  import { onMount, type Snippet } from 'svelte';

  import { themeStore, getRouteDefaultTheme, STORAGE_KEY } from '$lib/stores/theme';
  import { breadcrumbs } from '$lib/stores/breadcrumbs';
  import { ADMIN_NAV_ITEMS, isActiveAdminNavItem, type AdminNavItem } from '$lib/config/admin-nav';
  import Drawer from '$lib/ui/components/Drawer.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import LoadingState from '$lib/ui/components/LoadingState.svelte';

  import { navigating, page } from '$app/stores';

  interface Props {
    children?: Snippet;
  }

  const { children }: Props = $props();

  let isSidebarOpen = $state(false);
  let currentTheme = $state<'admin-light' | 'admin-dark'>('admin-light');

  function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
  }

  function closeSidebar() {
    isSidebarOpen = false;
  }

  function toggleTheme() {
    const newTheme = currentTheme === 'admin-light' ? 'admin-dark' : 'admin-light';
    themeStore.setTheme(newTheme);
    currentTheme = newTheme;
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

    const unsubscribe = themeStore.subscribe((state) => {
      if (state.name === 'admin-light' || state.name === 'admin-dark') {
        currentTheme = state.name;
      }
    });

    return unsubscribe;
  });

  const currentPath = $derived($page.url.pathname);

  function isActive(item: AdminNavItem): boolean {
    return isActiveAdminNavItem(item.href, currentPath);
  }
</script>

<section class="surface surface-admin" data-surface="admin">
  <div class="shell-admin">
    <header class="shell-admin__header">
      <Button variant="ghost" ariaLabel="Toggle navigation menu" onclick={toggleSidebar}>☰</Button>
      <h1 class="shell-admin__title">Admin Console</h1>
      <div class="shell-admin__header-actions">
        <Button
          variant="ghost"
          size="sm"
          ariaLabel={currentTheme === 'admin-light'
            ? 'Switch to dark mode'
            : 'Switch to light mode'}
          onclick={toggleTheme}
        >
          {currentTheme === 'admin-light' ? '🌙' : '☀️'}
        </Button>
        <Button variant="ghost" size="sm">Logout</Button>
      </div>
    </header>

    <aside class="shell-admin__sidebar">
      <nav class="shell-admin__nav" aria-label="Admin navigation">
        {#each ADMIN_NAV_ITEMS as item (item.href)}
          <a
            href={item.href}
            class="shell-admin__nav-item"
            class:shell-admin__nav-item--active={isActive(item)}
            onclick={closeSidebar}
          >
            <span class="shell-admin__nav-icon">{item.icon}</span>
            <span class="shell-admin__nav-label">{item.label}</span>
          </a>
        {/each}
      </nav>
    </aside>

    <main class="shell-admin__main">
      {#if $breadcrumbs.items.length > 0}
        <nav class="shell-admin__breadcrumbs" aria-label="Breadcrumb">
          <ol class="shell-admin__breadcrumbs-list">
            <li class="shell-admin__breadcrumbs-item">
              <a href="/admin" class="shell-admin__breadcrumbs-link">Admin</a>
            </li>
            {#each $breadcrumbs.items as crumb (crumb.href)}
              <li class="shell-admin__breadcrumbs-item">
                <span class="shell-admin__breadcrumbs-separator" aria-hidden="true">/</span>
                <a href={crumb.href} class="shell-admin__breadcrumbs-link">{crumb.label}</a>
              </li>
            {/each}
          </ol>
        </nav>
      {/if}
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
      {#each ADMIN_NAV_ITEMS as item (item.href)}
        <a
          href={item.href}
          class="shell-admin__nav-item"
          class:shell-admin__nav-item--active={isActive(item)}
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
    border-bottom: 1px solid var(--color-border);
    background-color: var(--color-surface);
  }

  .shell-admin__title {
    font-family: var(--font-admin);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .shell-admin__header-actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .shell-admin__sidebar {
    grid-column: 1;
    grid-row: 2;
    padding: var(--space-4);
    border-right: 1px solid var(--color-border);
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
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm, 0.875rem);
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

  .shell-admin__breadcrumbs {
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .shell-admin__breadcrumbs-list {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm, 0.875rem);
  }

  .shell-admin__breadcrumbs-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .shell-admin__breadcrumbs-separator {
    color: var(--color-text-muted);
  }

  .shell-admin__breadcrumbs-link {
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color 200ms ease-out;
  }

  .shell-admin__breadcrumbs-link:hover {
    color: var(--color-accent);
    text-decoration: underline;
  }

  .shell-admin__breadcrumbs-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
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
    font-family: var(--font-admin);
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
    .shell-admin__nav-item,
    .shell-admin__breadcrumbs-link {
      transition: none;
    }
  }
</style>
