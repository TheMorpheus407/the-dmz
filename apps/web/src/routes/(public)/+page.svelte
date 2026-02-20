<script lang="ts">
  import { Panel, Button, Badge } from '$lib/ui';
</script>

<Panel ariaLabel="Archive Gate">
  <h1>Archive Gate</h1>
  <p>Public landing placeholder. Marketing and legal content will live here.</p>

  <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2);">
    <Badge>Public</Badge>
  </div>

  <div style="margin-top: var(--space-4);">
    <Button>Learn More</Button>
    <Button variant="secondary">View Documentation</Button>
  </div>
</Panel>

<style>
  h1 {
    font-family: var(--font-document);
    color: var(--color-text);
    font-size: var(--text-xl);
    font-weight: 600;
    margin: 0 0 var(--space-3) 0;
  }

  p {
    font-family: var(--font-document);
    color: var(--color-text-document);
    margin: 0;
  }
</style>
