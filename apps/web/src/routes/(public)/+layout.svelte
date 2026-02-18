<script lang="ts">
  import { onMount } from 'svelte';

  import { themeStore, getRouteDefaultTheme, STORAGE_KEY } from '$lib/stores/theme';

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
  {@render children?.()}
</section>

<style>
  .surface-public {
    min-height: 100vh;
    display: grid;
    align-items: center;
    justify-items: center;
    padding: var(--space-4);
  }
</style>
