<script lang="ts">
  import { Panel, Button, Badge } from '$lib/ui';
</script>

<Panel variant="outlined" ariaLabel="Access Portal">
  <h1>Access Portal</h1>
  <p>Authentication placeholder. Login and SSO flows will be implemented here.</p>

  <div style="margin-top: var(--space-4); display: flex; gap: var(--space-2);">
    <Badge variant="warning">Authentication Required</Badge>
  </div>

  <div style="margin-top: var(--space-4);">
    <Button>Login</Button>
    <Button variant="ghost">Forgot Password?</Button>
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
