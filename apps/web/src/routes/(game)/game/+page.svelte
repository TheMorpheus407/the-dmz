<script lang="ts">
  import { Panel, Button, Badge, Tabs, LoadingState } from '$lib/ui';
</script>

{#snippet tabDashboard()}{/snippet}
{#snippet tabInbox()}{/snippet}
{#snippet tabStatus()}{/snippet}

<Panel variant="elevated" ariaLabel="Operations Console">
  <h1>Operations Console</h1>
  <p>Game terminal placeholder. The event-sourced client shell will render here.</p>

  <div class="game-badges">
    <Badge variant="info">System Online</Badge>
    <Badge variant="success">Ready</Badge>
  </div>

  <Tabs
    tabs={[
      {
        id: 'dashboard',
        label: 'Dashboard',
        content: tabDashboard,
      },
      {
        id: 'inbox',
        label: 'Inbox',
        content: tabInbox,
      },
      {
        id: 'status',
        label: 'Status',
        content: tabStatus,
      },
    ]}
    ariaLabel="Game tabs"
  />

  <div class="game-buttons">
    <Button>Start Operations</Button>
    <Button variant="secondary">View Logs</Button>
  </div>

  <LoadingState message="Initializing terminal..." />
</Panel>

<style>
  h1 {
    font-family: var(--font-terminal);
    color: var(--color-amber);
    font-size: var(--text-xl);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 var(--space-3) 0;
  }

  p {
    font-family: var(--font-document);
    color: var(--color-document-white);
    margin: 0;
  }

  .game-badges {
    margin-top: var(--space-4);
    display: flex;
    gap: var(--space-2);
  }

  .game-buttons {
    margin-top: var(--space-4);
    display: flex;
    gap: var(--space-2);
  }
</style>
