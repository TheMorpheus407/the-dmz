<script lang="ts">
  import { onMount } from 'svelte';

  import { themeStore, getRouteDefaultTheme, STORAGE_KEY } from '$lib/stores/theme';
  import Button from '$lib/ui/components/Button.svelte';

  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  const { children }: Props = $props();

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
      themeStore.setTheme(getRouteDefaultTheme('public'));
    }
  });
</script>

<section class="surface surface-public" data-surface="public">
  <header class="shell-public__header">
    <div class="shell-public__header-content">
      <a href="/" class="shell-public__logo">The DMZ</a>
      <nav class="shell-public__nav" aria-label="Main navigation">
        <a href="/about" class="shell-public__nav-link">About</a>
        <a href="/docs" class="shell-public__nav-link">Docs</a>
        <Button variant="secondary" size="sm" onclick={() => (window.location.href = '/login')}>
          Sign In
        </Button>
      </nav>
    </div>
  </header>

  <main class="shell-public__main">
    <div class="shell-public__container">
      {#if children}
        {@render children()}
      {/if}
    </div>
  </main>

  <footer class="shell-public__footer">
    <div class="shell-public__footer-content">
      <p class="shell-public__footer-text">© 2026 The DMZ — Archive Gate System</p>
      <nav class="shell-public__footer-nav" aria-label="Footer navigation">
        <a href="/privacy" class="shell-public__footer-link">Privacy</a>
        <a href="/terms" class="shell-public__footer-link">Terms</a>
      </nav>
    </div>
  </footer>
</section>

<style>
  .surface-public {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .shell-public__header {
    padding: var(--space-3) var(--space-4);
    border-bottom: var(--border-default);
    background-color: var(--color-surface);
  }

  .shell-public__header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .shell-public__logo {
    font-family: var(--font-ui);
    font-size: var(--text-lg);
    font-weight: 700;
    color: var(--color-text);
    text-decoration: none;
  }

  .shell-public__nav {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .shell-public__nav-link {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color 200ms ease-out;
  }

  .shell-public__nav-link:hover {
    color: var(--color-text);
  }

  .shell-public__nav-link:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .shell-public__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .shell-public__container {
    width: 100%;
    max-width: 800px;
  }

  .shell-public__footer {
    padding: var(--space-4);
    border-top: var(--border-default);
    background-color: var(--color-surface);
  }

  .shell-public__footer-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .shell-public__footer-text {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin: 0;
  }

  .shell-public__footer-nav {
    display: flex;
    gap: var(--space-4);
  }

  .shell-public__footer-link {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color 200ms ease-out;
  }

  .shell-public__footer-link:hover {
    color: var(--color-text);
  }

  @media (max-width: 767px) {
    .shell-public__main {
      padding: var(--space-4);
    }

    .shell-public__nav {
      gap: var(--space-2);
    }

    .shell-public__footer-content {
      flex-direction: column;
      gap: var(--space-2);
      text-align: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shell-public__nav-link,
    .shell-public__footer-link {
      transition: none;
    }
  }
</style>
