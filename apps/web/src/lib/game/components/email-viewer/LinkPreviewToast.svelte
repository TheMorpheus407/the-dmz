<script lang="ts">
  interface Props {
    display: string;
    target: string;
  }

  const { display, target }: Props = $props();
</script>

<div class="link-preview-toast" role="status" aria-live="polite">
  <span class="link-preview-toast__label">Link Preview:</span>
  <span class="link-preview-toast__display">{display}</span>
  <span class="link-preview-toast__target">→ {target}</span>
</div>

<style>
  .link-preview-toast {
    position: sticky;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background-color: var(--color-bg-primary);
    border-top: 1px solid var(--color-phosphor-green-dark);
    font-size: var(--text-xs);
  }

  .link-preview-toast__label {
    color: var(--color-amber);
  }

  .link-preview-toast__display {
    color: var(--color-text-document);
  }

  .link-preview-toast__target {
    color: var(--color-text-muted);
  }
</style>
