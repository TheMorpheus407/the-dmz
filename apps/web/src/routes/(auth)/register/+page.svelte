<script lang="ts">
  import { Panel, Button } from '$lib/ui';
  import { sessionStore } from '$lib/stores/session';
  import { getErrorMessage } from '$lib/api/error-mapper';

  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let displayName = $state('');
  let error = $state<string | null>(null);
  let loading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = null;
    loading = true;

    const result = await sessionStore.register({ email, password, displayName });

    if (result.error) {
      error = getErrorMessage(result.error);
      loading = false;
      return;
    }

    await goto('/game', { replaceState: true });
  }

  function handleLogin() {
    void goto('/login');
  }
</script>

<Panel variant="outlined" ariaLabel="Register">
  <form onsubmit={handleSubmit}>
    <h1>Create Account</h1>
    <p class="subtitle">Join the game to start playing.</p>

    {#if error}
      <div class="error-message" role="alert">
        {error}
      </div>
    {/if}

    <div class="form-group">
      <label for="displayName">Display Name</label>
      <input
        type="text"
        id="displayName"
        name="displayName"
        bind:value={displayName}
        required
        minlength="2"
        maxlength="64"
        autocomplete="name"
        disabled={loading}
      />
    </div>

    <div class="form-group">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        name="email"
        bind:value={email}
        required
        autocomplete="email"
        disabled={loading}
      />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        name="password"
        bind:value={password}
        required
        minlength="12"
        maxlength="128"
        autocomplete="new-password"
        disabled={loading}
      />
      <span class="hint">Minimum 12 characters</span>
    </div>

    <div class="actions">
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>
      <Button variant="ghost" onclick={handleLogin} disabled={loading}>Back to Login</Button>
    </div>
  </form>
</Panel>

<style>
  h1 {
    font-family: var(--font-document);
    color: var(--color-text);
    font-size: var(--text-xl);
    font-weight: 600;
    margin: 0 0 var(--space-2) 0;
  }

  .subtitle {
    font-family: var(--font-document);
    color: var(--color-text-document);
    margin: 0 0 var(--space-4) 0;
  }

  .error-message {
    background-color: var(--color-danger-bg);
    color: var(--color-danger);
    border: var(--border-default);
    border-color: var(--color-danger);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--text-sm);
  }

  .form-group {
    margin-bottom: var(--space-3);
  }

  label {
    display: block;
    font-family: var(--font-ui);
    font-size: var(--text-sm);
    color: var(--color-text);
    margin-bottom: var(--space-1);
  }

  input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-ui);
    font-size: var(--text-base);
    background-color: var(--color-bg-primary);
    color: var(--color-text);
    border: var(--border-default);
    border-radius: var(--radius-sm);
    box-sizing: border-box;
  }

  input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .hint {
    display: block;
    font-family: var(--font-ui);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-top: var(--space-1);
  }

  .actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-4);
    flex-wrap: wrap;
  }
</style>
