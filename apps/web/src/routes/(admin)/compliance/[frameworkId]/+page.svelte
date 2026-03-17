<script lang="ts">
  import { onMount } from 'svelte';

  import { Panel, Badge, LoadingState, Button } from '$lib/ui';
  import { getComplianceDetail, calculateCompliance, type ComplianceDetail } from '$lib/api/admin';
  import {
    getFrameworkLabel,
    getFrameworkDescription,
    type RegulatoryFramework,
  } from '@the-dmz/shared';

  import { page } from '$app/stores';

  const frameworkId = $derived($page.params['frameworkId'] ?? '');
  let detail = $state<ComplianceDetail | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let calculating = $state(false);

  onMount(async () => {
    if (!frameworkId) {
      error = 'Framework ID is required';
      loading = false;
      return;
    }
    await loadDetail();
  });

  async function loadDetail() {
    loading = true;
    error = null;
    const result = await getComplianceDetail(frameworkId);

    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      detail = result.data;
    }

    loading = false;
  }

  async function handleCalculate() {
    calculating = true;
    error = null;
    const result = await calculateCompliance(frameworkId);

    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      detail = result.data as ComplianceDetail;
    }

    calculating = false;
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'compliant':
        return 'var(--color-success)';
      case 'in_progress':
        return 'var(--color-warning)';
      case 'non_compliant':
        return 'var(--color-error)';
      default:
        return 'var(--color-text-secondary)';
    }
  }

  function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'default' {
    switch (status) {
      case 'compliant':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'non_compliant':
        return 'danger';
      default:
        return 'default';
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  }
</script>

<div class="compliance-detail">
  {#if loading}
    <div class="loading-container">
      <LoadingState
        variant="spinner"
        size="lg"
        message="Loading compliance details..."
        label="Loading compliance details"
      />
    </div>
  {:else if error}
    <div class="error-container">
      <Panel variant="highlight" ariaLabel="Error">
        <p class="error-message">Failed to load compliance details: {error}</p>
        <button type="button" class="retry-button" onclick={() => window.location.reload()}
          >Retry</button
        >
      </Panel>
    </div>
  {:else if detail}
    <header class="detail-header">
      <div class="header-content">
        <a href="/admin/compliance" class="back-link">&larr; Back to Compliance</a>
        <h1>{getFrameworkLabel(frameworkId as RegulatoryFramework)}</h1>
        <p class="framework-description">
          {getFrameworkDescription(frameworkId as RegulatoryFramework)}
        </p>
      </div>
      <div class="header-actions">
        <Button variant="primary" onclick={handleCalculate} disabled={calculating}>
          {calculating ? 'Calculating...' : 'Recalculate'}
        </Button>
      </div>
    </header>

    <div class="detail-grid">
      <section class="detail-section status-card" aria-label="Compliance Status">
        <Panel variant="admin" ariaLabel="Compliance Status">
          <div class="status-overview">
            <div class="status-circle" style="--status-color: {getStatusColor(detail.status)}">
              <span class="status-percentage">{detail.completionPercentage.toFixed(0)}%</span>
            </div>
            <div class="status-info">
              <Badge variant={getStatusBadgeVariant(detail.status)}>
                {detail.status.replace('_', ' ')}
              </Badge>
              <span class="requirements-summary">
                {detail.requirementsCompleted}/{detail.requirementsCount} requirements met
              </span>
            </div>
          </div>

          <div class="status-details">
            <div class="detail-row">
              <span class="detail-label">Last Assessed</span>
              <span class="detail-value">{formatDate(detail.lastAssessedAt)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Next Assessment Due</span>
              <span class="detail-value">{formatDate(detail.nextAssessmentDue)}</span>
            </div>
          </div>
        </Panel>
      </section>

      <section class="detail-section requirements" aria-label="Requirements">
        <Panel variant="admin" ariaLabel="Framework Requirements">
          <header class="section-header">
            <h2>Requirements</h2>
            <span class="requirement-count">{detail.requirements.length} total</span>
          </header>

          {#if detail.requirements.length === 0}
            <div class="empty-state">
              <p>No requirements defined</p>
              <p class="empty-hint">
                Requirements will be initialized when you calculate compliance
              </p>
            </div>
          {:else}
            <div class="requirements-list">
              {#each detail.requirements as requirement (requirement.id)}
                <div
                  class="requirement-card"
                  style="--status-color: {getStatusColor(requirement.status)}"
                >
                  <div class="requirement-info">
                    <span class="requirement-name">{requirement.requirementName}</span>
                    {#if requirement.description}
                      <span class="requirement-description">{requirement.description}</span>
                    {/if}
                    <div class="requirement-meta">
                      {#if requirement.category}
                        <span class="requirement-category">{requirement.category}</span>
                      {/if}
                      <span class="min-score">Min score: {requirement.minCompetencyScore}%</span>
                    </div>
                  </div>
                  <div class="requirement-status">
                    <div class="completion-bar">
                      <div
                        class="completion-fill"
                        style="width: {requirement.completionPercentage}%"
                      ></div>
                    </div>
                    <span class="completion-percentage"
                      >{requirement.completionPercentage.toFixed(0)}%</span
                    >
                  </div>
                  <Badge variant={getStatusBadgeVariant(requirement.status)}>
                    {requirement.status.replace('_', ' ')}
                  </Badge>
                </div>
              {/each}
            </div>
          {/if}
        </Panel>
      </section>

      <section class="detail-section historical" aria-label="Historical Trends">
        <Panel variant="admin" ariaLabel="Historical Trends">
          <header class="section-header">
            <h2>Historical Trends</h2>
          </header>
          <div class="trend-options">
            <button type="button" class="trend-button">Last 30 Days</button>
            <button type="button" class="trend-button">Last 90 Days</button>
            <button type="button" class="trend-button active">Last 365 Days</button>
          </div>
          <div class="empty-state">
            <p>Historical trend data will be available after multiple compliance calculations</p>
          </div>
        </Panel>
      </section>
    </div>
  {/if}
</div>

<style>
  .compliance-detail {
    font-family: var(--font-admin);
    color: var(--color-text);
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

  .retry-button {
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-accent);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-6);
  }

  .back-link {
    display: inline-block;
    color: var(--color-accent);
    text-decoration: none;
    font-size: var(--admin-text-sm);
    margin-bottom: var(--space-2);
  }

  .back-link:hover {
    text-decoration: underline;
  }

  .header-content h1 {
    font-size: var(--admin-text-2xl);
    font-weight: 700;
    color: var(--admin-text-primary);
    margin: 0 0 var(--space-2) 0;
  }

  .framework-description {
    font-size: var(--admin-text-base);
    color: var(--admin-text-secondary);
    margin: 0;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--space-4);
  }

  .detail-section {
    grid-column: span 12;
  }

  @media (min-width: 1024px) {
    .status-card {
      grid-column: span 4;
    }

    .requirements {
      grid-column: span 8;
    }

    .historical {
      grid-column: span 12;
    }
  }

  .status-overview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .status-circle {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: conic-gradient(
      var(--status-color) calc(var(--percentage, 0) * 1%),
      var(--color-bg-secondary) 0
    );
    border: 8px solid var(--color-bg-secondary);
    position: relative;
  }

  .status-circle::before {
    content: '';
    position: absolute;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: var(--color-bg-primary);
  }

  .status-percentage {
    position: relative;
    font-size: var(--admin-text-2xl);
    font-weight: 700;
    color: var(--admin-text-primary);
  }

  .status-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .requirements-summary {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
  }

  .status-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .detail-label {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
  }

  .detail-value {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    color: var(--admin-text-primary);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .section-header h2 {
    font-size: var(--admin-text-lg);
    font-weight: 600;
    margin: 0;
    color: var(--admin-text-primary);
  }

  .requirement-count {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
  }

  .requirements-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .requirement-card {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: var(--space-4);
    align-items: center;
    padding: var(--space-4);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--status-color, var(--color-text-secondary));
  }

  .requirement-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .requirement-name {
    font-size: var(--admin-text-base);
    font-weight: 600;
    color: var(--admin-text-primary);
  }

  .requirement-description {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
  }

  .requirement-meta {
    display: flex;
    gap: var(--space-3);
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
  }

  .requirement-category {
    background-color: var(--color-bg-tertiary);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }

  .requirement-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  .completion-bar {
    width: 80px;
    height: 6px;
    background-color: var(--color-bg-primary);
    border-radius: 3px;
    overflow: hidden;
  }

  .completion-fill {
    height: 100%;
    background-color: var(--status-color, var(--color-text-secondary));
    border-radius: 3px;
  }

  .completion-percentage {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    color: var(--admin-text-primary);
  }

  .trend-options {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .trend-button {
    padding: var(--space-1) var(--space-3);
    background-color: transparent;
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--admin-text-sm);
  }

  .trend-button.active {
    background-color: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
  }

  .trend-button:hover:not(.active) {
    background-color: var(--color-bg-secondary);
  }

  .empty-state {
    text-align: center;
    padding: var(--space-6);
    color: var(--admin-text-secondary);
  }

  .empty-hint {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
    margin-top: var(--space-2);
  }

  @media (prefers-reduced-motion: reduce) {
    .requirement-card,
    .completion-fill {
      transition: none;
    }
  }
</style>
