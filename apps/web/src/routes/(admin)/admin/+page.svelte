<script lang="ts">
  import { Panel, Button, Badge, Tabs } from '$lib/ui';
</script>

{#snippet tabOverview()}{/snippet}
{#snippet tabUsers()}{/snippet}
{#snippet tabSettings()}{/snippet}

<Panel variant="elevated" ariaLabel="Admin Hub">
  <h1>Admin Hub</h1>
  <p>Admin dashboard placeholder. Enterprise controls will be built here.</p>

  <div class="admin-badges">
    <Badge variant="info">Admin</Badge>
    <Badge variant="success">Active</Badge>
  </div>

  <Tabs
    tabs={[
      {
        id: 'overview',
        label: 'Overview',
        content: tabOverview,
      },
      {
        id: 'users',
        label: 'Users',
        content: tabUsers,
      },
      {
        id: 'settings',
        label: 'Settings',
        content: tabSettings,
      },
    ]}
    ariaLabel="Admin tabs"
  />

  <div class="admin-buttons">
    <Button>Manage Users</Button>
    <Button variant="secondary">System Settings</Button>
  </div>
</Panel>

<style>
  h1 {
    font-family: var(--font-admin);
    color: var(--admin-text-primary);
    font-size: var(--admin-text-xl);
    font-weight: 600;
    margin: 0 0 var(--space-3) 0;
  }

  p {
    font-family: var(--font-admin);
    color: var(--admin-text-secondary);
    margin: 0;
  }

  .admin-badges {
    margin-top: var(--space-4);
    display: flex;
    gap: var(--space-2);
  }

  .admin-buttons {
    margin-top: var(--space-4);
    display: flex;
    gap: var(--space-2);
  }
</style>
