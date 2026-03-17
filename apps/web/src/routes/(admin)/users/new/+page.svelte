<script lang="ts">
  import { Panel, Button } from '$lib/ui';
  import { createUser } from '$lib/api/users';

  import { goto } from '$app/navigation';

  let saving = $state(false);
  let error = $state<string | null>(null);
  let success = $state(false);

  const form = $state({
    email: '',
    displayName: '',
    role: 'learner',
  });

  const roleOptions = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'tenant_admin', label: 'Tenant Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'trainer', label: 'Trainer' },
    { value: 'learner', label: 'Learner' },
  ];

  async function handleSubmit(e: Event) {
    e.preventDefault();
    saving = true;
    error = null;

    const result = await createUser({
      email: form.email,
      displayName: form.displayName,
      role: form.role,
    });

    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      success = true;
      setTimeout(() => {
        void goto(`/admin/users/${result.data?.userId}`);
      }, 1500);
    }

    saving = false;
  }

  function cancel() {
    void goto('/admin/users');
  }
</script>

<div class="new-user-page">
  <header class="new-user-page__header">
    <Button variant="ghost" onclick={cancel}>← Back to Users</Button>
    <h1>Create New User</h1>
  </header>

  {#if success}
    <Panel variant="admin" ariaLabel="Success">
      <div class="success-message">
        <p>User created successfully! Redirecting to user details...</p>
      </div>
    </Panel>
  {:else}
    <Panel variant="admin" ariaLabel="Create User Form">
      {#if error}
        <div class="error-message">
          <p>{error}</p>
        </div>
      {/if}

      <form class="create-user-form" onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="email">Email Address *</label>
          <input
            id="email"
            type="email"
            bind:value={form.email}
            class="form-input"
            required
            placeholder="user@example.com"
          />
        </div>

        <div class="form-group">
          <label for="displayName">Display Name *</label>
          <input
            id="displayName"
            type="text"
            bind:value={form.displayName}
            class="form-input"
            required
            placeholder="Enter display name"
          />
        </div>

        <div class="form-group">
          <label for="role">Initial Role *</label>
          <select id="role" bind:value={form.role} class="form-select">
            {#each roleOptions as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="form-actions">
          <Button variant="ghost" type="button" onclick={cancel} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </form>
    </Panel>
  {/if}
</div>

<style>
  .new-user-page {
    font-family: var(--font-admin);
    color: var(--color-text);
    max-width: 600px;
  }

  .new-user-page__header {
    margin-bottom: var(--space-4);
  }

  .new-user-page__header h1 {
    font-size: var(--admin-text-xl);
    font-weight: 600;
    margin: var(--space-3) 0 0 0;
    color: var(--admin-text-primary);
  }

  .error-message {
    padding: var(--space-3);
    background-color: var(--color-error-bg);
    color: var(--color-error);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-4);
  }

  .success-message {
    padding: var(--space-3);
    background-color: var(--color-success-bg);
    color: var(--color-success);
    border-radius: var(--radius-sm);
    text-align: center;
  }

  .create-user-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-group label {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    color: var(--admin-text-secondary);
  }

  .form-input,
  .form-select {
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
  }

  .form-input:focus,
  .form-select:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  @media (prefers-reduced-motion: reduce) {
    .form-input,
    .form-select {
      transition: none;
    }
  }
</style>
