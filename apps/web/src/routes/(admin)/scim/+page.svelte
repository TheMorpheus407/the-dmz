<script lang="ts">
  import { onMount } from 'svelte';

  import { Panel, Button, Badge, LoadingState, Modal } from '$lib/ui';
  import {
    getSCIMTokens,
    createSCIMToken,
    revokeSCIMToken,
    rotateSCIMToken,
    testSCIMConnection,
    testSCIMProvisioning,
    getSCIMSyncStatus,
    getSCIMGroupMappings,
    updateSCIMGroupRole,
    type SCIMTokenConfig,
    type SCIMTokenWithSecret,
    type SCIMSyncStatus,
    type SCIMGroupMappingsResponse,
  } from '$lib/api/admin';

  let tokens = $state<SCIMTokenConfig[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let syncStatus = $state<SCIMSyncStatus | null>(null);
  let groupMappings = $state<SCIMGroupMappingsResponse | null>(null);
  let testingId = $state<string | null>(null);
  let provisioningTestId = $state<string | null>(null);
  let testResult = $state<{ success: boolean; message: string } | null>(null);

  let showCreateModal = $state(false);
  let showTokenModal = $state(false);
  let createdToken = $state<SCIMTokenWithSecret | null>(null);
  let selectedToken = $state<SCIMTokenConfig | null>(null);

  let showRevokeModal = $state(false);
  let showRotateModal = $state(false);

  let formName = $state('');
  let formExpiresInDays = $state<number | undefined>(undefined);
  let formSubmitting = $state(false);
  let formError = $state<string | null>(null);

  let showRoleMappingModal = $state(false);
  let roleMappingGroupId = $state<string | null>(null);
  let roleMappingRoleId = $state<string | null>(null);

  async function loadTokens() {
    loading = true;
    error = null;

    const result = await getSCIMTokens();

    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      tokens = result.data;
    }
    loading = false;
  }

  async function loadSyncStatus() {
    const result = await getSCIMSyncStatus();

    if (result.data) {
      syncStatus = result.data;
    }
  }

  async function loadGroupMappings() {
    const result = await getSCIMGroupMappings();

    if (result.data) {
      groupMappings = result.data;
    }
  }

  onMount(() => {
    void loadTokens();
    void loadSyncStatus();
    void loadGroupMappings();
  });

  function openCreateModal() {
    formName = '';
    formExpiresInDays = undefined;
    formError = null;
    showCreateModal = true;
  }

  function openTokenModal(token: SCIMTokenWithSecret) {
    createdToken = token;
    showTokenModal = true;
  }

  function openRevokeModal(token: SCIMTokenConfig) {
    selectedToken = token;
    showRevokeModal = true;
  }

  async function handleCreate() {
    if (!formName) {
      formError = 'Name is required';
      return;
    }

    formSubmitting = true;
    formError = null;

    const request: { name: string; expiresInDays?: number } = {
      name: formName,
    };

    if (formExpiresInDays !== undefined) {
      request.expiresInDays = formExpiresInDays;
    }

    const result = await createSCIMToken(request);

    formSubmitting = false;

    if (result.error) {
      formError = result.error.message;
    } else if (result.data) {
      showCreateModal = false;
      openTokenModal(result.data);
      void loadTokens();
    }
  }

  async function handleRevoke() {
    if (!selectedToken) return;

    const result = await revokeSCIMToken(selectedToken.id);

    if (result.error) {
      error = result.error.message;
    } else {
      selectedToken = null;
      showRevokeModal = false;
      void loadTokens();
    }
  }

  async function handleTestConnection(token: SCIMTokenConfig) {
    testingId = token.id;
    testResult = null;

    const result = await testSCIMConnection(token.id);

    testingId = null;
    if (result.data) {
      testResult = result.data;
    }
  }

  async function handleProvisioningTest(token: SCIMTokenConfig) {
    provisioningTestId = token.id;
    testResult = null;

    const result = await testSCIMProvisioning(token.id);

    provisioningTestId = null;
    if (result.data) {
      testResult = result.data;
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  }

  function isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  function openRotateModal(token: SCIMTokenConfig) {
    selectedToken = token;
    showRotateModal = true;
  }

  async function handleRotate() {
    if (!selectedToken) return;

    const result = await rotateSCIMToken(selectedToken.id);

    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      showRotateModal = false;
      openTokenModal(result.data);
      void loadTokens();
    }
  }

  function openRoleMappingModal(groupId: string, currentRoleId: string | null) {
    roleMappingGroupId = groupId;
    roleMappingRoleId = currentRoleId;
    showRoleMappingModal = true;
  }

  async function handleRoleMappingSave() {
    if (!roleMappingGroupId) return;

    const result = await updateSCIMGroupRole(roleMappingGroupId, roleMappingRoleId);

    if (result.error) {
      error = result.error.message;
    } else {
      showRoleMappingModal = false;
      void loadGroupMappings();
    }
  }
</script>

<div class="scim-page">
  <header class="page-header">
    <div class="page-header__content">
      <h1 class="page-header__title">SCIM 2.0 Provisioning</h1>
      <p class="page-header__description">
        Configure SCIM 2.0 identity provisioning for Okta, Microsoft Entra ID, and Ping Identity
      </p>
    </div>
    <Button onclick={openCreateModal}>Generate Token</Button>
  </header>

  {#if syncStatus}
    <Panel variant="admin" ariaLabel="Sync Status">
      <div class="sync-status">
        <div class="sync-status__item">
          <span class="sync-status__label">Last Sync</span>
          <span class="sync-status__value">{formatDate(syncStatus.lastSync)}</span>
        </div>
        <div class="sync-status__item">
          <span class="sync-status__label">Status</span>
          <Badge variant={syncStatus.status === 'completed' ? 'success' : 'warning'}>
            {syncStatus.status}
          </Badge>
        </div>
        <div class="sync-status__item">
          <span class="sync-status__label">Users Created</span>
          <span class="sync-status__value">{syncStatus.stats.usersCreated}</span>
        </div>
        <div class="sync-status__item">
          <span class="sync-status__label">Users Updated</span>
          <span class="sync-status__value">{syncStatus.stats.usersUpdated}</span>
        </div>
        <div class="sync-status__item">
          <span class="sync-status__label">Users Deleted</span>
          <span class="sync-status__value">{syncStatus.stats.usersDeleted}</span>
        </div>
      </div>
    </Panel>
  {/if}

  {#if loading}
    <div class="loading-container">
      <LoadingState
        variant="spinner"
        size="lg"
        message="Loading SCIM tokens..."
        label="Loading SCIM configuration"
      />
    </div>
  {:else if error}
    <div class="error-container">
      <Panel variant="highlight" ariaLabel="Error">
        <p class="error-message">{error}</p>
        <Button onclick={loadTokens}>Retry</Button>
      </Panel>
    </div>
  {:else if tokens.length === 0}
    <div class="empty-state">
      <Panel variant="admin" ariaLabel="No SCIM Tokens">
        <div class="empty-state__content">
          <div class="empty-state__icon">🔑</div>
          <h2 class="empty-state__title">No SCIM Tokens Configured</h2>
          <p class="empty-state__description">
            Generate a SCIM token to enable automated user and group provisioning from your identity
            provider
          </p>
          <Button onclick={openCreateModal}>Generate Token</Button>
        </div>
      </Panel>
    </div>
  {:else}
    <div class="tokens-grid">
      {#each tokens as token (token.id)}
        <Panel variant="admin" ariaLabel={`SCIM Token: ${token.name}`}>
          <header class="token-header">
            <div class="token-info">
              <h3 class="token-name">{token.name}</h3>
              <Badge
                variant={token.isRevoked
                  ? 'danger'
                  : isExpired(token.expiresAt)
                    ? 'warning'
                    : 'success'}
              >
                {token.isRevoked ? 'Revoked' : isExpired(token.expiresAt) ? 'Expired' : 'Active'}
              </Badge>
            </div>
          </header>

          <dl class="token-details">
            <div class="detail-item">
              <dt>Scopes</dt>
              <dd>{token.scopes.join(', ')}</dd>
            </div>
            <div class="detail-item">
              <dt>Expires</dt>
              <dd>{formatDate(token.expiresAt)}</dd>
            </div>
            <div class="detail-item">
              <dt>Last Used</dt>
              <dd>{formatDate(token.lastUsedAt)}</dd>
            </div>
            <div class="detail-item">
              <dt>Created</dt>
              <dd>{formatDate(token.createdAt)}</dd>
            </div>
          </dl>

          <div class="token-actions">
            <Button
              variant="secondary"
              size="sm"
              onclick={() => handleTestConnection(token)}
              disabled={testingId === token.id || token.isRevoked}
            >
              {testingId === token.id ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onclick={() => handleProvisioningTest(token)}
              disabled={provisioningTestId === token.id || token.isRevoked}
            >
              {provisioningTestId === token.id ? 'Testing...' : 'Test Provisioning'}
            </Button>
            {#if !token.isRevoked}
              <Button variant="secondary" size="sm" onclick={() => openRotateModal(token)}
                >Rotate</Button
              >
              <Button variant="danger" size="sm" onclick={() => openRevokeModal(token)}
                >Revoke</Button
              >
            {/if}
          </div>

          {#if testResult && testingId === null && provisioningTestId === null}
            <div
              class="test-result"
              class:test-result--success={testResult.success}
              class:test-result--error={!testResult.success}
            >
              {testResult.message}
            </div>
          {/if}
        </Panel>
      {/each}
    </div>
  {/if}

  {#if groupMappings && groupMappings.groups.length > 0}
    <Panel variant="admin" ariaLabel="Group to Role Mappings">
      <div class="group-mappings">
        <h2 class="section-title">Group to Role Mappings</h2>
        <p class="section-description">
          Map SCIM groups to platform roles to automatically assign roles to users based on their
          group membership.
        </p>
        <div class="group-mappings__table">
          <table>
            <thead>
              <tr>
                <th>SCIM Group</th>
                <th>Members</th>
                <th>Platform Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each groupMappings.groups as group (group.id)}
                <tr>
                  <td>{group.displayName}</td>
                  <td>{group.membersCount}</td>
                  <td>{group.roleName ?? 'Not mapped'}</td>
                  <td>
                    <Button
                      variant="secondary"
                      size="sm"
                      onclick={() => openRoleMappingModal(group.id, group.roleId)}
                    >
                      {group.roleId ? 'Edit Mapping' : 'Add Mapping'}
                    </Button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  {/if}
</div>

<Modal
  bind:open={showCreateModal}
  title="Generate SCIM Token"
  onclose={() => (showCreateModal = false)}
>
  <form
    class="token-form"
    onsubmit={(e) => {
      e.preventDefault();
      void handleCreate();
    }}
  >
    <div class="form-group">
      <label class="form-label" for="tokenName">Token Name *</label>
      <input
        id="tokenName"
        type="text"
        class="form-input"
        placeholder="e.g., Okta Production"
        bind:value={formName}
        required
      />
    </div>
    <div class="form-group">
      <label class="form-label" for="expiresInDays">Expires In (days)</label>
      <input
        id="expiresInDays"
        type="number"
        class="form-input"
        placeholder="Leave empty for no expiration"
        bind:value={formExpiresInDays}
        min="1"
      />
    </div>
    {#if formError}
      <p class="form-error">{formError}</p>
    {/if}
    <div class="form-actions">
      <Button variant="ghost" onclick={() => (showCreateModal = false)}>Cancel</Button>
      <Button type="submit" disabled={formSubmitting}>
        {formSubmitting ? 'Generating...' : 'Generate Token'}
      </Button>
    </div>
  </form>
</Modal>

<Modal
  bind:open={showTokenModal}
  title="SCIM Token Created"
  onclose={() => (showTokenModal = false)}
>
  <div class="token-created">
    <p class="token-warning">
      Copy this token now. You won't be able to see it again after closing this dialog.
    </p>
    <div class="token-display">
      <code>{createdToken?.token}</code>
    </div>
    <div class="form-actions">
      <Button variant="ghost" onclick={() => (showTokenModal = false)}>Close</Button>
    </div>
  </div>
</Modal>

<Modal
  bind:open={showRevokeModal}
  title="Revoke SCIM Token"
  onclose={() => (showRevokeModal = false)}
>
  <div class="revoke-confirmation">
    <p>Are you sure you want to revoke the token "{selectedToken?.name}"?</p>
    <p class="revoke-warning">
      This action cannot be undone. Applications using this token will no longer be able to
      provision users.
    </p>
    <div class="form-actions">
      <Button variant="ghost" onclick={() => (selectedToken = null)}>Cancel</Button>
      <Button variant="danger" onclick={handleRevoke}>Revoke Token</Button>
    </div>
  </div>
</Modal>

<Modal
  bind:open={showRotateModal}
  title="Rotate SCIM Token"
  onclose={() => (showRotateModal = false)}
>
  <div class="rotate-confirmation">
    <p>Are you sure you want to rotate the token "{selectedToken?.name}"?</p>
    <p class="rotate-warning">
      This will revoke the current token and generate a new one. Applications using the current
      token will need to be updated.
    </p>
    <div class="form-actions">
      <Button variant="ghost" onclick={() => (showRotateModal = false)}>Cancel</Button>
      <Button onclick={handleRotate}>Rotate Token</Button>
    </div>
  </div>
</Modal>

<Modal
  bind:open={showRoleMappingModal}
  title="Map SCIM Group to Role"
  onclose={() => (showRoleMappingModal = false)}
>
  <div class="role-mapping-form">
    <p>Select a platform role to assign to members of this SCIM group.</p>
    <div class="form-group">
      <label class="form-label" for="roleSelect">Platform Role</label>
      <select id="roleSelect" class="form-select" bind:value={roleMappingRoleId}>
        <option value={null}>-- Select a role --</option>
        {#if groupMappings}
          {#each groupMappings.roles as role (role.id)}
            <option value={role.id}>{role.name}</option>
          {/each}
        {/if}
      </select>
    </div>
    <div class="form-actions">
      <Button variant="ghost" onclick={() => (showRoleMappingModal = false)}>Cancel</Button>
      <Button onclick={handleRoleMappingSave}>Save Mapping</Button>
    </div>
  </div>
</Modal>

<style>
  .scim-page {
    font-family: var(--font-admin);
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-6);
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .page-header__title {
    font-size: var(--admin-text-2xl);
    font-weight: 600;
    color: var(--admin-text-primary);
    margin: 0 0 var(--space-2) 0;
  }

  .page-header__description {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
    margin: 0;
    max-width: 600px;
  }

  .loading-container,
  .error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
  }

  .error-message {
    color: var(--color-error);
    margin-bottom: var(--space-3);
  }

  .sync-status {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-4);
  }

  .sync-status__item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .sync-status__label {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
  }

  .sync-status__value {
    font-size: var(--admin-text-lg);
    font-weight: 600;
    color: var(--admin-text-primary);
  }

  .empty-state__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-8) var(--space-4);
  }

  .empty-state__icon {
    font-size: 48px;
    margin-bottom: var(--space-4);
  }

  .empty-state__title {
    font-size: var(--admin-text-lg);
    font-weight: 600;
    margin: 0 0 var(--space-2) 0;
    color: var(--admin-text-primary);
  }

  .empty-state__description {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
    margin: 0 0 var(--space-4) 0;
  }

  .tokens-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: var(--space-4);
  }

  .token-header {
    margin-bottom: var(--space-4);
  }

  .token-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .token-name {
    font-size: var(--admin-text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--admin-text-primary);
  }

  .token-details {
    display: grid;
    gap: var(--space-3);
    margin: 0 0 var(--space-4) 0;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .detail-item:last-child {
    border-bottom: none;
  }

  .detail-item dt {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
    font-weight: 500;
  }

  .detail-item dd {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-primary);
    margin: 0;
    text-align: right;
  }

  .token-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .test-result {
    margin-top: var(--space-3);
    padding: var(--space-3);
    border-radius: var(--radius-sm);
    font-size: var(--admin-text-sm);
  }

  .test-result--success {
    background-color: rgba(34, 197, 94, 0.1);
    color: #16a34a;
  }

  .test-result--error {
    background-color: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  }

  .token-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-label {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    color: var(--admin-text-secondary);
  }

  .form-input {
    font-size: var(--admin-text-sm);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
    color: var(--color-text);
    width: 100%;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .form-error {
    color: var(--color-error);
    font-size: var(--admin-text-sm);
    margin: 0;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .token-created {
    text-align: center;
  }

  .token-warning {
    color: var(--color-warning);
    font-size: var(--admin-text-sm);
    margin: 0 0 var(--space-4) 0;
  }

  .token-display {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--space-3);
    margin-bottom: var(--space-4);
    overflow-x: auto;
  }

  .token-display code {
    font-family: var(--font-mono);
    font-size: var(--admin-text-sm);
    word-break: break-all;
  }

  .revoke-confirmation {
    text-align: center;
  }

  .revoke-confirmation p {
    margin: 0 0 var(--space-3) 0;
    color: var(--admin-text-primary);
  }

  .revoke-warning {
    color: var(--admin-text-secondary);
    font-size: var(--admin-text-sm);
  }

  .rotate-confirmation {
    text-align: center;
  }

  .rotate-confirmation p {
    margin: 0 0 var(--space-3) 0;
    color: var(--admin-text-primary);
  }

  .rotate-warning {
    color: var(--admin-text-secondary);
    font-size: var(--admin-text-sm);
  }

  .role-mapping-form {
    text-align: center;
  }

  .role-mapping-form p {
    margin: 0 0 var(--space-4) 0;
    color: var(--admin-text-secondary);
    font-size: var(--admin-text-sm);
  }

  .form-select {
    font-size: var(--admin-text-sm);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
    color: var(--color-text);
    width: 100%;
  }

  .form-select:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .section-title {
    font-size: var(--admin-text-lg);
    font-weight: 600;
    margin: 0 0 var(--space-2) 0;
    color: var(--admin-text-primary);
  }

  .section-description {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
    margin: 0 0 var(--space-4) 0;
  }

  .group-mappings {
    margin-top: var(--space-4);
  }

  .group-mappings__table {
    overflow-x: auto;
  }

  .group-mappings__table table {
    width: 100%;
    border-collapse: collapse;
  }

  .group-mappings__table th,
  .group-mappings__table td {
    text-align: left;
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .group-mappings__table th {
    font-size: var(--admin-text-sm);
    font-weight: 600;
    color: var(--admin-text-secondary);
    background-color: var(--color-surface);
  }

  .group-mappings__table td {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-primary);
  }

  .group-mappings__table tr:last-child td {
    border-bottom: none;
  }
</style>
