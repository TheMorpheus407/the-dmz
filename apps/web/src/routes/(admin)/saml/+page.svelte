<script lang="ts">
  import { onMount } from 'svelte';

  import { Panel, Button, Badge, LoadingState, Modal } from '$lib/ui';
  import {
    getSAMLProviders,
    createSAMLProvider,
    updateSAMLProvider,
    deleteSAMLProvider,
    testSAMLConnection,
    type SAMLProviderConfig,
  } from '$lib/api/admin';

  let providers = $state<SAMLProviderConfig[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let testingId = $state<string | null>(null);
  let testResult = $state<{ success: boolean; message: string } | null>(null);

  let showCreateModal = $state(false);
  let showEditModal = $state(false);
  let showDeleteModal = $state(false);
  let selectedProvider = $state<SAMLProviderConfig | null>(null);

  let formName = $state('');
  let formMetadataUrl = $state('');
  let formIdpCertificate = $state('');
  let formSpPrivateKey = $state('');
  let formSpCertificate = $state('');
  let formSubmitting = $state(false);
  let formError = $state<string | null>(null);

  async function loadProviders() {
    loading = true;
    error = null;

    const result = await getSAMLProviders();

    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      providers = result.data;
    }
    loading = false;
  }

  onMount(() => {
    void loadProviders();
  });

  function openCreateModal() {
    formName = '';
    formMetadataUrl = '';
    formIdpCertificate = '';
    formSpPrivateKey = '';
    formSpCertificate = '';
    formError = null;
    showCreateModal = true;
  }

  function openEditModal(provider: SAMLProviderConfig) {
    selectedProvider = provider;
    formName = provider.name;
    formMetadataUrl = provider.metadataUrl;
    formIdpCertificate = provider.idpCertificate || '';
    formSpPrivateKey = '';
    formSpCertificate = provider.spCertificate || '';
    formError = null;
    showEditModal = true;
  }

  function openDeleteModal(provider: SAMLProviderConfig) {
    selectedProvider = provider;
    showDeleteModal = true;
  }

  async function handleCreate() {
    if (!formName || !formMetadataUrl) {
      formError = 'Name and Metadata URL are required';
      return;
    }

    formSubmitting = true;
    formError = null;

    const providerData: {
      name: string;
      metadataUrl: string;
      idpCertificate?: string;
      spPrivateKey?: string;
      spCertificate?: string;
    } = {
      name: formName,
      metadataUrl: formMetadataUrl,
    };

    if (formIdpCertificate) {
      providerData.idpCertificate = formIdpCertificate;
    }
    if (formSpPrivateKey) {
      providerData.spPrivateKey = formSpPrivateKey;
    }
    if (formSpCertificate) {
      providerData.spCertificate = formSpCertificate;
    }

    const result = await createSAMLProvider(providerData);

    formSubmitting = false;

    if (result.error) {
      formError = result.error.message;
    } else {
      showCreateModal = false;
      void loadProviders();
    }
  }

  async function handleUpdate() {
    if (!selectedProvider || !formName || !formMetadataUrl) {
      formError = 'Name and Metadata URL are required';
      return;
    }

    formSubmitting = true;
    formError = null;

    const result = await updateSAMLProvider(selectedProvider.id, {
      name: formName,
      metadataUrl: formMetadataUrl,
      idpCertificate: formIdpCertificate || null,
      spPrivateKey: formSpPrivateKey || null,
      spCertificate: formSpCertificate || null,
    });

    formSubmitting = false;

    if (result.error) {
      formError = result.error.message;
    } else {
      showEditModal = false;
      void loadProviders();
    }
  }

  async function handleDelete() {
    if (!selectedProvider) return;

    const result = await deleteSAMLProvider(selectedProvider.id);

    if (result.error) {
      error = result.error.message;
    } else {
      showDeleteModal = false;
      selectedProvider = null;
      void loadProviders();
    }
  }

  async function handleTestConnection(provider: SAMLProviderConfig) {
    testingId = provider.id;
    testResult = null;

    const result = await testSAMLConnection(provider.id);

    testingId = null;
    if (result.data) {
      testResult = result.data;
    }
  }
</script>

<div class="saml-page">
  <header class="page-header">
    <div class="page-header__content">
      <h1 class="page-header__title">SAML Single Sign-On</h1>
      <p class="page-header__description">
        Configure SAML 2.0 identity providers for enterprise SSO with Okta, Entra ID, and Ping
        Identity
      </p>
    </div>
    <Button onclick={openCreateModal}>Add SAML Provider</Button>
  </header>

  {#if loading}
    <div class="loading-container">
      <LoadingState
        variant="spinner"
        size="lg"
        message="Loading SAML providers..."
        label="Loading SAML configuration"
      />
    </div>
  {:else if error}
    <div class="error-container">
      <Panel variant="highlight" ariaLabel="Error">
        <p class="error-message">{error}</p>
        <Button onclick={loadProviders}>Retry</Button>
      </Panel>
    </div>
  {:else if providers.length === 0}
    <div class="empty-state">
      <Panel variant="admin" ariaLabel="No SAML Providers">
        <div class="empty-state__content">
          <div class="empty-state__icon">🔐</div>
          <h2 class="empty-state__title">No SAML Providers Configured</h2>
          <p class="empty-state__description">
            Add your first SAML identity provider to enable single sign-on for your organization
          </p>
          <Button onclick={openCreateModal}>Add SAML Provider</Button>
        </div>
      </Panel>
    </div>
  {:else}
    <div class="providers-grid">
      {#each providers as provider (provider.id)}
        <Panel variant="admin" ariaLabel={`SAML Provider: ${provider.name}`}>
          <header class="provider-header">
            <div class="provider-info">
              <h3 class="provider-name">{provider.name}</h3>
              <Badge variant={provider.isActive ? 'success' : 'warning'}>
                {provider.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </header>

          <dl class="provider-details">
            <div class="detail-item">
              <dt>Metadata URL</dt>
              <dd class="detail-value detail-value--truncate">{provider.metadataUrl}</dd>
            </div>
            <div class="detail-item">
              <dt>IdP Certificate</dt>
              <dd>{provider.idpCertificate ? 'Configured' : 'Not set'}</dd>
            </div>
            <div class="detail-item">
              <dt>SP Certificate</dt>
              <dd>{provider.spCertificate ? 'Configured' : 'Not set'}</dd>
            </div>
            <div class="detail-item">
              <dt>Created</dt>
              <dd>{new Date(provider.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>

          <div class="provider-actions">
            <Button
              variant="secondary"
              size="sm"
              onclick={() => handleTestConnection(provider)}
              disabled={testingId === provider.id}
            >
              {testingId === provider.id ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button variant="ghost" size="sm" onclick={() => openEditModal(provider)}>Edit</Button>
            <Button variant="danger" size="sm" onclick={() => openDeleteModal(provider)}
              >Delete</Button
            >
          </div>

          {#if testResult && testingId === null}
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
</div>

<Modal
  bind:open={showCreateModal}
  title="Add SAML Provider"
  onclose={() => (showCreateModal = false)}
>
  <form
    class="provider-form"
    onsubmit={(e) => {
      e.preventDefault();
      void handleCreate();
    }}
  >
    <div class="form-group">
      <label class="form-label" for="providerName">Provider Name *</label>
      <input
        id="providerName"
        type="text"
        class="form-input"
        placeholder="e.g., Okta, Entra ID"
        bind:value={formName}
        required
      />
    </div>
    <div class="form-group">
      <label class="form-label" for="metadataUrl">Metadata URL *</label>
      <input
        id="metadataUrl"
        type="url"
        class="form-input"
        placeholder="https://your-idp.example.com/metadata"
        bind:value={formMetadataUrl}
        required
      />
    </div>
    <div class="form-group">
      <label class="form-label" for="idpCert">IdP Certificate (PEM)</label>
      <textarea
        id="idpCert"
        class="form-textarea"
        placeholder="-----BEGIN CERTIFICATE-----..."
        bind:value={formIdpCertificate}
        rows="4"
      ></textarea>
    </div>
    <div class="form-group">
      <label class="form-label" for="spPrivateKey">SP Private Key (PEM)</label>
      <textarea
        id="spPrivateKey"
        class="form-textarea"
        placeholder="-----BEGIN PRIVATE KEY-----..."
        bind:value={formSpPrivateKey}
        rows="4"
      ></textarea>
    </div>
    <div class="form-group">
      <label class="form-label" for="spCert">SP Certificate (PEM)</label>
      <textarea
        id="spCert"
        class="form-textarea"
        placeholder="-----BEGIN CERTIFICATE-----..."
        bind:value={formSpCertificate}
        rows="4"
      ></textarea>
    </div>
    {#if formError}
      <p class="form-error">{formError}</p>
    {/if}
    <div class="form-actions">
      <Button variant="ghost" onclick={() => (showCreateModal = false)}>Cancel</Button>
      <Button type="submit" disabled={formSubmitting}>
        {formSubmitting ? 'Creating...' : 'Create Provider'}
      </Button>
    </div>
  </form>
</Modal>

<Modal bind:open={showEditModal} title="Edit SAML Provider" onclose={() => (showEditModal = false)}>
  <form
    class="provider-form"
    onsubmit={(e) => {
      e.preventDefault();
      void handleUpdate();
    }}
  >
    <div class="form-group">
      <label class="form-label" for="editProviderName">Provider Name *</label>
      <input id="editProviderName" type="text" class="form-input" bind:value={formName} required />
    </div>
    <div class="form-group">
      <label class="form-label" for="editMetadataUrl">Metadata URL *</label>
      <input
        id="editMetadataUrl"
        type="url"
        class="form-input"
        bind:value={formMetadataUrl}
        required
      />
    </div>
    <div class="form-group">
      <label class="form-label" for="editIdpCert">IdP Certificate (PEM)</label>
      <textarea
        id="editIdpCert"
        class="form-textarea"
        placeholder="-----BEGIN CERTIFICATE-----..."
        bind:value={formIdpCertificate}
        rows="4"
      ></textarea>
    </div>
    <div class="form-group">
      <label class="form-label" for="editSpPrivateKey"
        >SP Private Key (PEM, leave empty to keep current)</label
      >
      <textarea
        id="editSpPrivateKey"
        class="form-textarea"
        placeholder="-----BEGIN PRIVATE KEY-----..."
        bind:value={formSpPrivateKey}
        rows="4"
      ></textarea>
    </div>
    <div class="form-group">
      <label class="form-label" for="editSpCert">SP Certificate (PEM)</label>
      <textarea
        id="editSpCert"
        class="form-textarea"
        placeholder="-----BEGIN CERTIFICATE-----..."
        bind:value={formSpCertificate}
        rows="4"
      ></textarea>
    </div>
    {#if formError}
      <p class="form-error">{formError}</p>
    {/if}
    <div class="form-actions">
      <Button variant="ghost" onclick={() => (showEditModal = false)}>Cancel</Button>
      <Button type="submit" disabled={formSubmitting}>
        {formSubmitting ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  </form>
</Modal>

<Modal
  bind:open={showDeleteModal}
  title="Delete SAML Provider"
  onclose={() => (showDeleteModal = false)}
>
  <div class="delete-confirmation">
    <p>Are you sure you want to delete the SAML provider "{selectedProvider?.name}"?</p>
    <p class="delete-warning">
      This action cannot be undone. Users will no longer be able to log in via this provider.
    </p>
    <div class="form-actions">
      <Button variant="ghost" onclick={() => (showDeleteModal = false)}>Cancel</Button>
      <Button variant="danger" onclick={handleDelete}>Delete Provider</Button>
    </div>
  </div>
</Modal>

<style>
  .saml-page {
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

  .providers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
    gap: var(--space-4);
  }

  .provider-header {
    margin-bottom: var(--space-4);
  }

  .provider-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .provider-name {
    font-size: var(--admin-text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--admin-text-primary);
  }

  .provider-details {
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

  .detail-value--truncate {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .provider-actions {
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

  .provider-form {
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

  .form-textarea {
    font-family: var(--font-mono);
    font-size: var(--admin-text-sm);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface);
    color: var(--color-text);
    resize: vertical;
  }

  .form-textarea:focus {
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

  .delete-confirmation {
    text-align: center;
  }

  .delete-confirmation p {
    margin: 0 0 var(--space-3) 0;
    color: var(--admin-text-primary);
  }

  .delete-warning {
    color: var(--admin-text-secondary);
    font-size: var(--admin-text-sm);
  }
</style>
