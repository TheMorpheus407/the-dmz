<script lang="ts">
  import { Panel, Button, ErrorPanel } from '$lib/ui';
  import { sessionStore } from '$lib/stores/session';
  import type { CategorizedApiError } from '$lib/api/types';

  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let error = $state<CategorizedApiError | null>(null);
  let loading = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = null;
    loading = true;

    const result = await sessionStore.login({ email, password });

    if (result.error) {
      error = result.error;
      loading = false;
      return;
    }

    await goto('/game', { replaceState: true });
  }

  function handleRegister() {
    void goto('/register');
  }

  function handleRetry() {
    error = null;
    void handleSubmit(new Event('submit'));
  }

  function handleDismissError() {
    error = null;
  }
</script>

<Panel variant="outlined" ariaLabel="Login">
  <form onsubmit={handleSubmit}>
    <h1>Access Portal</h1>
    <p class="subtitle">Enter your credentials to access the game.</p>

    {#if error}
      <div class="error-container">
        {#if error.retryable}
          <ErrorPanel {error} surface="auth" onRetry={handleRetry} onDismiss={handleDismissError} />
        {:else}
          <ErrorPanel {error} surface="auth" onDismiss={handleDismissError} />
        {/if}
      </div>
    {/if}

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
        autocomplete="current-password"
        disabled={loading}
      />
    </div>

    <div class="actions">
      <Button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
      <Button variant="ghost" onclick={handleRegister} disabled={loading}>Create Account</Button>
    </div>
  </form>
</Panel>

<style>
  h1 {
    font-family: var(--font-document);
    color: var(--color-text);
    font-size: var(--text-xl);
    font-weight: 600;
    margin: var(--space-2) 0;
  }

  .subtitle {
    font-family: var(--font-document);
    color: var(--color-text-document);
    margin: 0 0 var(--space-4) 0;
  }

  .error-container {
    margin-bottom: var(--space-3);
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

  .actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-4);
    flex-wrap: wrap;
  }
</style>
