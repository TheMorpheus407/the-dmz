<script lang="ts">
  import '../app.css';

  import { onMount } from 'svelte';

  import { sessionStore } from '$lib/stores/session';

  import type { Snippet } from 'svelte';

  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  interface Props {
    children?: Snippet;
  }

  const { children }: Props = $props();

  let initialized = $state(false);

  onMount(async () => {
    if (browser) {
      await sessionStore.bootstrap();
      initialized = true;
    }
  });

  $effect(() => {
    if (!browser || !initialized) return;

    const unsubscribe = page.subscribe(($page) => {
      const route = $page.url.pathname;
      const currentSession = sessionStore.get();

      if (route.startsWith('/login') || route.startsWith('/register')) {
        if (currentSession.status === 'authenticated') {
          void goto('/game', { replaceState: true });
        }
      }

      if (route.startsWith('/game')) {
        if (currentSession.status === 'anonymous' || currentSession.status === 'expired') {
          void goto('/login', { replaceState: true });
        }
      }

      if (route.startsWith('/admin')) {
        if (currentSession.status === 'anonymous' || currentSession.status === 'expired') {
          void goto('/login', { replaceState: true });
        }
        if (
          currentSession.status === 'authenticated' &&
          currentSession.user &&
          currentSession.user.role !== 'admin'
        ) {
          void goto('/game', { replaceState: true });
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/consistent-return
    return () => {
      unsubscribe();
    };
  });
</script>

<svelte:head>
  <title>The DMZ: Archive Gate</title>
</svelte:head>

{#if children}
  {@render children()}
{/if}
