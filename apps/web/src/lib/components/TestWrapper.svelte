<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
  }

  // eslint-disable-next-line prefer-const
  let { children }: Props = $props();
</script>

<div class="surface surface-game" data-surface="game">
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
    </div>
  </div>

  <nav class="shell-game__mobile-nav" aria-label="Panel navigation">
    <button type="button" class="shell-game__mobile-tab" aria-selected="false" role="tab">
      Inbox
    </button>
    <button type="button" class="shell-game__mobile-tab" aria-selected="false" role="tab">
      Document
    </button>
    <button type="button" class="shell-game__mobile-tab" aria-selected="false" role="tab">
      Status
    </button>
  </nav>
</div>
