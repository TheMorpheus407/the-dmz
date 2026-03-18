<script lang="ts">
  import { onMount } from 'svelte';

  import { Button, Panel, Badge, LoadingState } from '$lib/ui';
  import {
    getOnboardingSteps,
    startOnboarding,
    saveOrgProfile,
    saveIdpConfig,
    testIdpConnection,
    generateScimToken,
    saveComplianceFrameworks,
    completeOnboarding,
    resetOnboarding,
    type OnboardingStatus,
    type OrgProfileData,
    type IdpConfigData,
    type RegulatoryRegion,
    type ComplianceCoordinatorContact,
    type IdpTestConnectionResult,
  } from '$lib/api/onboarding';

  type StepId = 'org_profile' | 'idp_config' | 'scim_token' | 'compliance' | 'review';

  interface Step {
    id: StepId;
    label: string;
    completed: boolean;
    disabled: boolean;
  }

  let onboardingStatus = $state<OnboardingStatus | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let testing = $state(false);
  let error = $state<string | null>(null);
  let currentStepId = $state<StepId>('org_profile');

  let orgProfile = $state<OrgProfileData>({
    name: '',
    domain: '',
    industry: '',
    companySize: '',
  });

  let idpConfig = $state<IdpConfigData>({
    type: 'saml',
    enabled: true,
    metadataUrl: '',
    entityId: '',
    ssoUrl: '',
    certificate: '',
    clientId: '',
    clientSecret: '',
    issuer: '',
    scopes: ['openid', 'profile', 'email'],
    authorizedDomains: [],
  });

  let scimTokenName = $state('SCIM Provisioning Token');
  let scimToken = $state('');
  let scimTokenGenerated = $state(false);

  let selectedFrameworks = $state<string[]>([]);
  let regulatoryRegion = $state<RegulatoryRegion | undefined>(undefined);
  let complianceCoordinator = $state<ComplianceCoordinatorContact | undefined>(undefined);

  let testResult = $state<IdpTestConnectionResult | null>(null);

  const steps: Step[] = [
    { id: 'org_profile', label: 'Organization Profile', completed: false, disabled: false },
    { id: 'idp_config', label: 'IdP Configuration', completed: false, disabled: false },
    { id: 'scim_token', label: 'SCIM Token', completed: false, disabled: false },
    { id: 'compliance', label: 'Compliance', completed: false, disabled: false },
    { id: 'review', label: 'Review & Complete', completed: false, disabled: false },
  ];

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Retail',
    'Manufacturing',
    'Education',
    'Government',
    'Non-profit',
    'Other',
  ];

  const companySizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];

  const frameworkOptions = [
    { id: 'gdpr', label: 'GDPR', description: 'EU General Data Protection Regulation' },
    {
      id: 'hipaa',
      label: 'HIPAA',
      description: 'US Healthcare Insurance Portability and Accountability Act',
    },
    {
      id: 'pci_dss',
      label: 'PCI-DSS',
      description: 'Payment Card Industry Data Security Standard',
    },
    { id: 'soc_2', label: 'SOC 2', description: 'Service Organization Control 2' },
    { id: 'iso_27001', label: 'ISO 27001', description: 'Information Security Management' },
    { id: 'nist_800_50', label: 'NIST CSF', description: 'US Cybersecurity Framework' },
    { id: 'nis2_article_20', label: 'NIS2', description: 'EU Critical Entities Resilience' },
    { id: 'dora_article_5', label: 'DORA', description: 'EU Digital Operational Resilience' },
  ];

  const regulatoryRegions: { value: RegulatoryRegion; label: string }[] = [
    { value: 'us_federal', label: 'US Federal' },
    { value: 'us_state_local', label: 'US State/Local' },
    { value: 'eu', label: 'European Union' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'canada', label: 'Canada' },
    { value: 'australia', label: 'Australia' },
    { value: 'japan', label: 'Japan' },
    { value: 'singapore', label: 'Singapore' },
    { value: 'other', label: 'Other' },
  ];

  function updateSteps(): void {
    const state = onboardingStatus?.state;
    if (!state) return;

    const completedSteps = state.completedSteps || [];
    const s = [...steps];
    s[0] = { ...s[0]!, completed: completedSteps.includes('org_profile') };
    s[1] = { ...s[1]!, completed: completedSteps.includes('idp_config') };
    s[2] = { ...s[2]!, completed: completedSteps.includes('scim_token') };
    s[3] = { ...s[3]!, completed: completedSteps.includes('compliance') };

    s[1] = { ...s[1], disabled: !completedSteps.includes('org_profile') };
    s[2] = { ...s[2], disabled: !completedSteps.includes('idp_config') };
    s[3] = { ...s[3], disabled: !completedSteps.includes('scim_token') };
    s[4] = { ...s[4]!, disabled: !completedSteps.includes('compliance') };

    steps.length = 0;
    steps.push(...s);

    if (state.currentStep === 'org_profile') currentStepId = 'org_profile';
    else if (state.currentStep === 'idp_config') currentStepId = 'idp_config';
    else if (state.currentStep === 'scim_token') currentStepId = 'scim_token';
    else if (state.currentStep === 'compliance') currentStepId = 'compliance';
    else if (state.currentStep === 'complete') currentStepId = 'review';

    if (state.orgProfile) {
      orgProfile = { ...state.orgProfile };
    }
    if (state.idpConfig) {
      idpConfig = { ...state.idpConfig };
    }
    if (state.complianceFrameworks) {
      selectedFrameworks = [...state.complianceFrameworks];
    }
    if (state.regulatoryRegion) {
      regulatoryRegion = state.regulatoryRegion;
    }
    if (state.complianceCoordinatorContact) {
      complianceCoordinator = { ...state.complianceCoordinatorContact };
    }
  }

  onMount(async () => {
    const result = await getOnboardingSteps();
    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      onboardingStatus = result.data;
      if (result.data.state.currentStep === 'not_started') {
        const startResult = await startOnboarding();
        if (startResult.error) {
          error = startResult.error.message;
        } else if (startResult.data) {
          onboardingStatus = startResult.data;
        }
      }
      updateSteps();
    }
    loading = false;
  });

  async function handleSaveOrgProfile(): Promise<void> {
    saving = true;
    error = null;
    const result = await saveOrgProfile(orgProfile);
    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      onboardingStatus = result.data;
      updateSteps();
      if (result.data.canProceed) {
        currentStepId = 'idp_config';
      }
    }
    saving = false;
  }

  async function handleTestConnection(): Promise<void> {
    testing = true;
    error = null;
    testResult = null;
    const result = await testIdpConnection(idpConfig);
    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      testResult = result.data;
    }
    testing = false;
  }

  async function handleSaveIdpConfig(): Promise<void> {
    saving = true;
    error = null;
    const result = await saveIdpConfig(idpConfig);
    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      onboardingStatus = result.data;
      updateSteps();
      if (result.data.canProceed) {
        currentStepId = 'scim_token';
      }
    }
    saving = false;
  }

  async function handleGenerateScimToken(): Promise<void> {
    saving = true;
    error = null;
    const result = await generateScimToken(scimTokenName);
    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      scimToken = result.data.token;
      scimTokenGenerated = true;
      const statusResult = await getOnboardingSteps();
      if (statusResult.data) {
        onboardingStatus = statusResult.data;
        updateSteps();
      }
    }
    saving = false;
  }

  async function handleCopyToken(): Promise<void> {
    await navigator.clipboard.writeText(scimToken);
  }

  async function handleSaveCompliance(): Promise<void> {
    saving = true;
    error = null;
    const result = await saveComplianceFrameworks({
      frameworks: selectedFrameworks,
      regulatoryRegion: regulatoryRegion ?? undefined,
      complianceCoordinatorContact:
        complianceCoordinator && (complianceCoordinator.name || complianceCoordinator.email)
          ? complianceCoordinator
          : undefined,
    });
    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      onboardingStatus = result.data;
      updateSteps();
      if (result.data.canProceed) {
        currentStepId = 'review';
      }
    }
    saving = false;
  }

  async function handleComplete(): Promise<void> {
    saving = true;
    error = null;
    const result = await completeOnboarding();
    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      onboardingStatus = result.data;
      updateSteps();
    }
    saving = false;
  }

  async function handleReset(): Promise<void> {
    saving = true;
    error = null;
    const result = await resetOnboarding();
    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      onboardingStatus = result.data;
      scimToken = '';
      scimTokenGenerated = false;
      selectedFrameworks = [];
      regulatoryRegion = undefined;
      complianceCoordinator = undefined;
      testResult = null;
      updateSteps();
    }
    saving = false;
  }

  function toggleFramework(frameworkId: string): void {
    if (selectedFrameworks.includes(frameworkId)) {
      selectedFrameworks = selectedFrameworks.filter((f) => f !== frameworkId);
    } else {
      selectedFrameworks = [...selectedFrameworks, frameworkId];
    }
  }

  function getStepIndex(stepId: StepId): number {
    return steps.findIndex((s) => s.id === stepId);
  }

  function canProceedToStep(stepId: StepId): boolean {
    const stepIndex = getStepIndex(stepId);
    if (stepIndex === 0) return true;
    const prevStep = steps[stepIndex - 1];
    return prevStep?.completed ?? false;
  }
</script>

<div class="onboarding-wizard">
  <header class="wizard-header">
    <h1>Enterprise Onboarding Wizard</h1>
    <p>Complete the following steps to configure your organization for enterprise features.</p>
  </header>

  {#if loading}
    <div class="loading-container">
      <LoadingState
        variant="spinner"
        size="lg"
        message="Loading onboarding status..."
        label="Loading onboarding wizard"
      />
    </div>
  {:else if error && !onboardingStatus}
    <div class="error-container">
      <Panel variant="highlight" ariaLabel="Error">
        <p class="error-message">Failed to load onboarding: {error}</p>
        <Button onclick={() => window.location.reload()}>Retry</Button>
      </Panel>
    </div>
  {:else if onboardingStatus}
    <nav class="stepper" aria-label="Onboarding progress">
      <ol class="stepper__list">
        {#each steps as step, index (step.id)}
          <li
            class="stepper__item"
            class:stepper__item--completed={step.completed}
            class:stepper__item--current={currentStepId === step.id}
            class:stepper__item--disabled={step.disabled}
          >
            <button
              type="button"
              class="stepper__button"
              disabled={step.disabled}
              onclick={() => {
                if (canProceedToStep(step.id)) {
                  currentStepId = step.id;
                }
              }}
              aria-current={currentStepId === step.id ? 'step' : undefined}
            >
              <span class="stepper__indicator">
                {#if step.completed}
                  <span class="stepper__check">✓</span>
                {:else}
                  {index + 1}
                {/if}
              </span>
              <span class="stepper__label">{step.label}</span>
            </button>
            {#if index < steps.length - 1}
              <div
                class="stepper__connector"
                class:stepper__connector--completed={step.completed}
              ></div>
            {/if}
          </li>
        {/each}
      </ol>
    </nav>

    <div class="wizard-content">
      {#if error}
        <div class="error-banner">
          <Panel variant="highlight" ariaLabel="Error">
            <p>{error}</p>
            <Button variant="ghost" onclick={() => (error = null)}>Dismiss</Button>
          </Panel>
        </div>
      {/if}

      {#if currentStepId === 'org_profile'}
        <section class="step-content" aria-labelledby="org-profile-heading">
          <Panel variant="admin" ariaLabel="Organization Profile">
            <h2 id="org-profile-heading">Organization Profile</h2>
            <p class="step-description">Provide basic information about your organization.</p>

            <form
              onsubmit={(e) => {
                e.preventDefault();
                void handleSaveOrgProfile();
              }}
            >
              <div class="form-grid">
                <div class="form-field">
                  <label for="org-name">Organization Name *</label>
                  <input
                    type="text"
                    id="org-name"
                    bind:value={orgProfile.name}
                    required
                    minlength="1"
                    maxlength="255"
                  />
                </div>

                <div class="form-field">
                  <label for="org-domain">Domain *</label>
                  <input
                    type="text"
                    id="org-domain"
                    bind:value={orgProfile.domain}
                    required
                    placeholder="example.com"
                  />
                </div>

                <div class="form-field">
                  <label for="org-industry">Industry *</label>
                  <select id="org-industry" bind:value={orgProfile.industry} required>
                    <option value="">Select industry...</option>
                    {#each industries as industry (industry)}
                      <option value={industry}>{industry}</option>
                    {/each}
                  </select>
                </div>

                <div class="form-field">
                  <label for="org-size">Company Size *</label>
                  <select id="org-size" bind:value={orgProfile.companySize} required>
                    <option value="">Select size...</option>
                    {#each companySizes as size (size)}
                      <option value={size}>{size} employees</option>
                    {/each}
                  </select>
                </div>
              </div>

              <div class="form-actions">
                <Button type="submit" variant="admin" disabled={saving}>
                  {saving ? 'Saving...' : 'Save & Continue'}
                </Button>
              </div>
            </form>
          </Panel>
        </section>
      {:else if currentStepId === 'idp_config'}
        <section class="step-content" aria-labelledby="idp-config-heading">
          <Panel variant="admin" ariaLabel="Identity Provider Configuration">
            <h2 id="idp-config-heading">Identity Provider Configuration</h2>
            <p class="step-description">
              Configure your Identity Provider (IdP) for Single Sign-On (SSO).
            </p>

            <form
              onsubmit={(e) => {
                e.preventDefault();
                void handleSaveIdpConfig();
              }}
            >
              <div class="form-field">
                <label for="idp-type">SSO Type *</label>
                <select id="idp-type" bind:value={idpConfig.type} required>
                  <option value="saml">SAML 2.0</option>
                  <option value="oidc">OpenID Connect (OIDC)</option>
                </select>
              </div>

              {#if idpConfig.type === 'saml'}
                <div class="form-grid">
                  <div class="form-field">
                    <label for="idp-entity-id">Entity ID *</label>
                    <input
                      type="text"
                      id="idp-entity-id"
                      bind:value={idpConfig.entityId}
                      placeholder="https://idp.example.com/..."
                    />
                  </div>

                  <div class="form-field">
                    <label for="idp-sso-url">SSO URL *</label>
                    <input
                      type="url"
                      id="idp-sso-url"
                      bind:value={idpConfig.ssoUrl}
                      placeholder="https://idp.example.com/sso/saml"
                    />
                  </div>

                  <div class="form-field form-field--full">
                    <label for="idp-certificate">Certificate (PEM)</label>
                    <textarea
                      id="idp-certificate"
                      bind:value={idpConfig.certificate}
                      rows="4"
                      placeholder="-----BEGIN CERTIFICATE-----"
                    ></textarea>
                  </div>

                  <div class="form-field form-field--full">
                    <label for="idp-metadata-url">Metadata URL (optional)</label>
                    <input
                      type="url"
                      id="idp-metadata-url"
                      bind:value={idpConfig.metadataUrl}
                      placeholder="https://idp.example.com/metadata.xml"
                    />
                  </div>
                </div>
              {:else}
                <div class="form-grid">
                  <div class="form-field">
                    <label for="oidc-client-id">Client ID *</label>
                    <input type="text" id="oidc-client-id" bind:value={idpConfig.clientId} />
                  </div>

                  <div class="form-field">
                    <label for="oidc-client-secret">Client Secret</label>
                    <input
                      type="password"
                      id="oidc-client-secret"
                      bind:value={idpConfig.clientSecret}
                    />
                  </div>

                  <div class="form-field">
                    <label for="oidc-issuer">Issuer *</label>
                    <input
                      type="text"
                      id="oidc-issuer"
                      bind:value={idpConfig.issuer}
                      placeholder="https://idp.example.com"
                    />
                  </div>

                  <div class="form-field">
                    <label for="oidc-scopes">Scopes</label>
                    <input
                      type="text"
                      id="oidc-scopes"
                      value={idpConfig.scopes?.join(', ') || ''}
                      onchange={(e) => {
                        idpConfig.scopes = e.currentTarget.value.split(',').map((s) => s.trim());
                      }}
                      placeholder="openid, profile, email"
                    />
                  </div>
                </div>
              {/if}

              <div class="form-field">
                <label for="idp-authorized-domains">Authorized Domains (comma-separated)</label>
                <input
                  type="text"
                  id="idp-authorized-domains"
                  value={idpConfig.authorizedDomains?.join(', ') || ''}
                  onchange={(e) => {
                    idpConfig.authorizedDomains = e.currentTarget.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s);
                  }}
                  placeholder="example.com, subdomain.example.com"
                />
              </div>

              {#if testResult}
                <div class="test-result" class:test-result--success={testResult.success}>
                  <h4>Connection Test Result</h4>
                  <p>{testResult.message}</p>
                  <div class="diagnostics">
                    <div class="diagnostic-item">
                      <span>Metadata Valid:</span>
                      <Badge variant={testResult.diagnostics.metadataValid ? 'success' : 'danger'}>
                        {testResult.diagnostics.metadataValid ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div class="diagnostic-item">
                      <span>Entity ID Valid:</span>
                      <Badge variant={testResult.diagnostics.entityIdValid ? 'success' : 'danger'}>
                        {testResult.diagnostics.entityIdValid ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div class="diagnostic-item">
                      <span>SSO URL Reachable:</span>
                      <Badge
                        variant={testResult.diagnostics.ssoUrlReachable ? 'success' : 'danger'}
                      >
                        {testResult.diagnostics.ssoUrlReachable ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div class="diagnostic-item">
                      <span>Certificate Valid:</span>
                      <Badge
                        variant={testResult.diagnostics.certificateValid ? 'success' : 'danger'}
                      >
                        {testResult.diagnostics.certificateValid ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                  {#if testResult.diagnostics.errors.length > 0}
                    <div class="errors">
                      <h5>Errors:</h5>
                      <ul>
                        {#each testResult.diagnostics.errors as err (err)}
                          <li>{err}</li>
                        {/each}
                      </ul>
                    </div>
                  {/if}
                </div>
              {/if}

              <div class="form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={testing}
                  onclick={() => void handleTestConnection()}
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button type="submit" variant="admin" disabled={saving}>
                  {saving ? 'Saving...' : 'Save & Continue'}
                </Button>
              </div>
            </form>
          </Panel>
        </section>
      {:else if currentStepId === 'scim_token'}
        <section class="step-content" aria-labelledby="scim-token-heading">
          <Panel variant="admin" ariaLabel="SCIM Token">
            <h2 id="scim-token-heading">SCIM Token Management</h2>
            <p class="step-description">
              Generate a SCIM bearer token for user provisioning from your IdP.
            </p>

            {#if !scimTokenGenerated}
              <form
                onsubmit={(e) => {
                  e.preventDefault();
                  void handleGenerateScimToken();
                }}
              >
                <div class="form-field">
                  <label for="scim-token-name">Token Name *</label>
                  <input
                    type="text"
                    id="scim-token-name"
                    bind:value={scimTokenName}
                    required
                    placeholder="SCIM Provisioning Token"
                  />
                </div>

                <div class="form-actions">
                  <Button type="submit" variant="admin" disabled={saving}>
                    {saving ? 'Generating...' : 'Generate Token'}
                  </Button>
                </div>
              </form>
            {:else}
              <div class="token-display">
                <h4>SCIM Bearer Token</h4>
                <div class="token-value">
                  <code>{scimToken}</code>
                  <Button variant="ghost" onclick={handleCopyToken}>Copy</Button>
                </div>
                <p class="token-warning">
                  Make sure to copy and store this token securely. It will not be shown again.
                </p>
                <p class="token-instructions">
                  Use this token in your IdP/SCIM client to provision users. The token should be
                  sent as a Bearer token in the Authorization header:
                </p>
                <pre>Authorization: Bearer {scimToken.substring(0, 20)}...</pre>
              </div>

              <div class="form-actions">
                <Button variant="admin" onclick={() => (currentStepId = 'compliance')}>
                  Continue to Compliance
                </Button>
              </div>
            {/if}
          </Panel>
        </section>
      {:else if currentStepId === 'compliance'}
        <section class="step-content" aria-labelledby="compliance-heading">
          <Panel variant="admin" ariaLabel="Compliance Frameworks">
            <h2 id="compliance-heading">Compliance Framework Selection</h2>
            <p class="step-description">
              Select the compliance frameworks that apply to your organization.
            </p>

            <form
              onsubmit={(e) => {
                e.preventDefault();
                void handleSaveCompliance();
              }}
            >
              <div class="frameworks-grid">
                {#each frameworkOptions as framework (framework.id)}
                  <label class="framework-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedFrameworks.includes(framework.id)}
                      onchange={() => toggleFramework(framework.id)}
                    />
                    <span class="framework-label">
                      <strong>{framework.label}</strong>
                      <span>{framework.description}</span>
                    </span>
                  </label>
                {/each}
              </div>

              <div class="form-field">
                <label for="regulatory-region">Primary Regulatory Region</label>
                <select id="regulatory-region" bind:value={regulatoryRegion}>
                  <option value={undefined}>Select region...</option>
                  {#each regulatoryRegions as region (region.value)}
                    <option value={region.value}>{region.label}</option>
                  {/each}
                </select>
              </div>

              <fieldset class="coordinator-fieldset">
                <legend>Compliance Coordinator (Optional)</legend>
                <div class="form-grid">
                  <div class="form-field">
                    <label for="coordinator-name">Name</label>
                    <input
                      type="text"
                      id="coordinator-name"
                      value={complianceCoordinator?.name ?? ''}
                      oninput={(e) => {
                        complianceCoordinator = complianceCoordinator || {
                          name: '',
                          email: '',
                        };
                        complianceCoordinator.name = e.currentTarget.value;
                      }}
                    />
                  </div>

                  <div class="form-field">
                    <label for="coordinator-email">Email</label>
                    <input
                      type="email"
                      id="coordinator-email"
                      value={complianceCoordinator?.email ?? ''}
                      oninput={(e) => {
                        complianceCoordinator = complianceCoordinator || {
                          name: '',
                          email: '',
                        };
                        complianceCoordinator.email = e.currentTarget.value;
                      }}
                    />
                  </div>

                  <div class="form-field">
                    <label for="coordinator-phone">Phone</label>
                    <input
                      type="tel"
                      id="coordinator-phone"
                      value={complianceCoordinator?.phone ?? ''}
                      oninput={(e) => {
                        complianceCoordinator = complianceCoordinator || {
                          name: '',
                          email: '',
                        };
                        complianceCoordinator.phone = e.currentTarget.value;
                      }}
                    />
                  </div>
                </div>
              </fieldset>

              <div class="form-actions">
                <Button type="submit" variant="admin" disabled={saving}>
                  {saving ? 'Saving...' : 'Save & Continue'}
                </Button>
              </div>
            </form>
          </Panel>
        </section>
      {:else if currentStepId === 'review'}
        <section class="step-content" aria-labelledby="review-heading">
          <Panel variant="admin" ariaLabel="Review & Complete">
            <h2 id="review-heading">Review & Complete</h2>
            <p class="step-description">Review your onboarding configuration before completing.</p>

            <div class="review-sections">
              <div class="review-section">
                <h3>Organization Profile</h3>
                <dl class="review-list">
                  <div class="review-item">
                    <dt>Name</dt>
                    <dd>{orgProfile.name}</dd>
                  </div>
                  <div class="review-item">
                    <dt>Domain</dt>
                    <dd>{orgProfile.domain}</dd>
                  </div>
                  <div class="review-item">
                    <dt>Industry</dt>
                    <dd>{orgProfile.industry}</dd>
                  </div>
                  <div class="review-item">
                    <dt>Company Size</dt>
                    <dd>{orgProfile.companySize} employees</dd>
                  </div>
                </dl>
              </div>

              <div class="review-section">
                <h3>IdP Configuration</h3>
                <dl class="review-list">
                  <div class="review-item">
                    <dt>Type</dt>
                    <dd>{idpConfig.type.toUpperCase()}</dd>
                  </div>
                  {#if idpConfig.type === 'saml'}
                    <div class="review-item">
                      <dt>Entity ID</dt>
                      <dd>{idpConfig.entityId || 'Not set'}</dd>
                    </div>
                    <div class="review-item">
                      <dt>SSO URL</dt>
                      <dd>{idpConfig.ssoUrl || 'Not set'}</dd>
                    </div>
                  {:else}
                    <div class="review-item">
                      <dt>Client ID</dt>
                      <dd>{idpConfig.clientId || 'Not set'}</dd>
                    </div>
                    <div class="review-item">
                      <dt>Issuer</dt>
                      <dd>{idpConfig.issuer || 'Not set'}</dd>
                    </div>
                  {/if}
                </dl>
              </div>

              <div class="review-section">
                <h3>SCIM Token</h3>
                <p class="review-item">
                  {#if scimTokenGenerated}
                    <Badge variant="success">Generated</Badge>
                  {:else}
                    <Badge variant="warning">Not Generated</Badge>
                  {/if}
                </p>
              </div>

              <div class="review-section">
                <h3>Compliance Frameworks</h3>
                {#if selectedFrameworks.length > 0}
                  <div class="review-frameworks">
                    {#each selectedFrameworks as fw (fw)}
                      <Badge variant="info">{fw}</Badge>
                    {/each}
                  </div>
                {:else}
                  <p>No frameworks selected</p>
                {/if}
                {#if regulatoryRegion}
                  <p class="review-item">
                    <strong>Regulatory Region:</strong>
                    {regulatoryRegion}
                  </p>
                {/if}
                {#if complianceCoordinator}
                  <p class="review-item">
                    <strong>Coordinator:</strong>
                    {complianceCoordinator.name}
                    ({complianceCoordinator.email})
                  </p>
                {/if}
              </div>
            </div>

            <div class="form-actions">
              <Button variant="secondary" onclick={() => (currentStepId = 'compliance')}>
                Back
              </Button>
              <Button variant="admin" disabled={saving} onclick={handleComplete}>
                {saving ? 'Completing...' : 'Complete Onboarding'}
              </Button>
            </div>
          </Panel>
        </section>
      {/if}

      {#if onboardingStatus?.state.currentStep === 'complete'}
        <div class="completion-banner">
          <Panel variant="highlight" ariaLabel="Onboarding Complete">
            <h2>Onboarding Complete!</h2>
            <p>
              Your organization has been successfully configured for enterprise features. You can
              now manage users, configure SSO, and monitor compliance.
            </p>
            <div class="form-actions">
              <Button variant="admin" onclick={() => (window.location.href = '/admin')}>
                Go to Admin Dashboard
              </Button>
              <Button variant="secondary" onclick={handleReset}>Reset Onboarding</Button>
            </div>
          </Panel>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .onboarding-wizard {
    font-family: var(--font-admin);
    color: var(--admin-text-primary);
    max-width: 900px;
    margin: 0 auto;
    padding: var(--space-4);
  }

  .wizard-header {
    margin-bottom: var(--space-6);
  }

  .wizard-header h1 {
    font-size: var(--admin-text-2xl);
    margin: 0 0 var(--space-2) 0;
  }

  .wizard-header p {
    color: var(--admin-text-secondary);
    margin: 0;
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

  .stepper {
    margin-bottom: var(--space-6);
  }

  .stepper__list {
    display: flex;
    list-style: none;
    padding: 0;
    margin: 0;
    align-items: center;
  }

  .stepper__item {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .stepper__item:last-child {
    flex: 0;
  }

  .stepper__button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--admin-text-secondary);
    transition: color 200ms ease-out;
  }

  .stepper__button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .stepper__button:not(:disabled):hover {
    color: var(--admin-text-primary);
  }

  .stepper__indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: var(--color-bg-secondary);
    border: 2px solid var(--color-border);
    font-weight: 600;
    font-size: var(--admin-text-sm);
  }

  .stepper__item--completed .stepper__indicator {
    background-color: var(--color-success);
    border-color: var(--color-success);
    color: white;
  }

  .stepper__item--current .stepper__indicator {
    background-color: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
  }

  .stepper__check {
    font-size: var(--admin-text-sm);
  }

  .stepper__label {
    font-size: var(--admin-text-xs);
    text-align: center;
    max-width: 80px;
  }

  .stepper__connector {
    flex: 1;
    height: 2px;
    background-color: var(--color-border);
    margin: 0 var(--space-2);
  }

  .stepper__connector--completed {
    background-color: var(--color-success);
  }

  .wizard-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .error-banner {
    margin-bottom: var(--space-4);
  }

  .step-content h2 {
    font-size: var(--admin-text-xl);
    margin: 0 0 var(--space-2) 0;
  }

  .step-description {
    color: var(--admin-text-secondary);
    margin: 0 0 var(--space-4) 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
  }

  .form-field--full {
    grid-column: span 2;
  }

  .form-field label {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    color: var(--admin-text-secondary);
  }

  .form-field input,
  .form-field select,
  .form-field textarea {
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm);
    background-color: var(--color-bg);
    color: var(--admin-text-primary);
  }

  .form-field input:focus,
  .form-field select:focus,
  .form-field textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
  }

  .form-field textarea {
    resize: vertical;
    min-height: 100px;
  }

  .form-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: flex-end;
    margin-top: var(--space-4);
  }

  .test-result {
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
    background-color: var(--color-bg-secondary);
  }

  .test-result--success {
    border-color: var(--color-success);
    background-color: rgba(16, 185, 129, 0.1);
  }

  .test-result h4 {
    margin: 0 0 var(--space-2) 0;
  }

  .test-result p {
    margin: 0 0 var(--space-3) 0;
  }

  .diagnostics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }

  .diagnostic-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .diagnostic-item span {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
  }

  .errors {
    margin-top: var(--space-3);
    color: var(--color-error);
  }

  .errors h5 {
    margin: 0 0 var(--space-1) 0;
    font-size: var(--admin-text-sm);
  }

  .errors ul {
    margin: 0;
    padding-left: var(--space-4);
    font-size: var(--admin-text-sm);
  }

  .token-display {
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-secondary);
    margin-bottom: var(--space-4);
  }

  .token-display h4 {
    margin: 0 0 var(--space-3) 0;
  }

  .token-value {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-3);
  }

  .token-value code {
    flex: 1;
    font-family: monospace;
    font-size: var(--admin-text-sm);
    word-break: break-all;
  }

  .token-warning {
    color: var(--color-warning);
    font-size: var(--admin-text-sm);
    margin: 0 0 var(--space-3) 0;
  }

  .token-instructions {
    font-size: var(--admin-text-sm);
    margin: 0 0 var(--space-2) 0;
  }

  .token-display pre {
    padding: var(--space-3);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-size: var(--admin-text-xs);
    overflow-x: auto;
  }

  .frameworks-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .framework-checkbox {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: border-color 200ms ease-out;
  }

  .framework-checkbox:hover {
    border-color: var(--color-accent);
  }

  .framework-checkbox input {
    margin-top: var(--space-1);
  }

  .framework-label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .framework-label strong {
    font-size: var(--admin-text-sm);
  }

  .framework-label span {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
  }

  .coordinator-fieldset {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    margin-top: var(--space-4);
  }

  .coordinator-fieldset legend {
    font-weight: 500;
    padding: 0 var(--space-2);
  }

  .review-sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .review-section {
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background-color: var(--color-bg-secondary);
  }

  .review-section h3 {
    font-size: var(--admin-text-lg);
    margin: 0 0 var(--space-3) 0;
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  .review-list {
    display: grid;
    gap: var(--space-2);
    margin: 0;
  }

  .review-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .review-item dt {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
  }

  .review-item dd {
    font-size: var(--admin-text-sm);
    margin: 0;
  }

  .review-frameworks {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .completion-banner {
    margin-top: var(--space-6);
  }

  .completion-banner h2 {
    margin: 0 0 var(--space-2) 0;
    color: var(--color-success);
  }

  .completion-banner p {
    margin: 0 0 var(--space-4) 0;
  }

  @media (max-width: 768px) {
    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-field--full {
      grid-column: span 1;
    }

    .stepper__label {
      display: none;
    }

    .frameworks-grid {
      grid-template-columns: 1fr;
    }

    .diagnostics {
      grid-template-columns: 1fr;
    }
  }
</style>
