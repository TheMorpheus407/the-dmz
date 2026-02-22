<script lang="ts">
  import { onMount } from 'svelte';

  import { themeStore, getRouteDefaultTheme, STORAGE_KEY } from '$lib/stores/theme';
  import LoadingState from '$lib/ui/components/LoadingState.svelte';

  import type { Snippet } from 'svelte';

  import { navigating } from '$app/stores';

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
      themeStore.setTheme(getRouteDefaultTheme('auth'));
    }
  });
</script>

<section class="surface surface-auth" data-surface="auth">
  <div class="shell-auth">
    <div class="shell-auth__container">
      <header class="shell-auth__header">
        <h1 class="shell-auth__title">The DMZ</h1>
        <p class="shell-auth__subtitle">Archive Gate System</p>
      </header>
      <div class="shell-auth__content">
        {#if $navigating}
          <div class="loading-boundary" role="status" aria-live="polite">
            <LoadingState
              variant="spinner"
              size="sm"
              message="Authenticating..."
              label="Authentication loading"
            />
          </div>
        {:else if children}
          {@render children()}
        {/if}
      </div>
      <footer class="shell-auth__footer">
        <p class="shell-auth__footer-text">Secure access terminal</p>
      </footer>
    </div>
  </div>
</section>

<style>
  .surface-auth {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 0;
  }

  .shell-auth {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    width: 100%;
    padding: var(--space-4);
    box-sizing: border-box;
    background: linear-gradient(180deg, var(--color-bg) 0%, var(--color-surface) 100%);
  }

  .shell-auth__container {
    width: 100%;
    max-width: 420px;
  }

  .shell-auth__header {
    text-align: center;
    margin-bottom: var(--space-6);
  }

  .shell-auth__title {
    font-family: var(--font-ui);
    font-size: var(--text-2xl);
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 var(--space-1) 0;
  }

  .shell-auth__subtitle {
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  .shell-auth__content {
    background-color: var(--color-surface);
    border: var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-6);
    min-height: 200px;
  }

  .loading-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 120px;
    padding: var(--space-6);
    font-family: var(--font-ui);
  }

  .shell-auth__footer {
    text-align: center;
    margin-top: var(--space-4);
  }

  .shell-auth__footer-text {
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin: 0;
  }

  @media (min-width: var(--bp-tablet)) {
    .shell-auth__container {
      max-width: 480px;
    }

    .shell-auth__title {
      font-size: var(--text-3xl);
    }

    .shell-auth__content {
      padding: var(--space-8);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .shell-auth {
      background: var(--color-bg);
    }
  }
</style>
