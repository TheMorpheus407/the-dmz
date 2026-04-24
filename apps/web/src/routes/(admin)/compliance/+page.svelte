<script lang="ts">
  import { onMount } from 'svelte';

  import { Panel, Badge, LoadingState, Button } from '$lib/ui';
  import {
    getComplianceSummary,
    calculateCompliance,
    type ComplianceDashboardData,
  } from '$lib/api/admin';
  import {
    REGULATORY_FRAMEWORKS,
    getFrameworkLabel,
    type RegulatoryFramework,
  } from '@the-dmz/shared';

  let dashboardData = $state<ComplianceDashboardData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let calculating = $state(false);

  onMount(async () => {
    await loadDashboard();
  });

  async function loadDashboard() {
    loading = true;
    error = null;
    const complianceSummaryResult = await getComplianceSummary();

    if (complianceSummaryResult.error) {
      error = complianceSummaryResult.error.message;
    } else if (complianceSummaryResult.data) {
      dashboardData = complianceSummaryResult.data;
    }

    loading = false;
  }

  async function handleCalculateAll() {
    calculating = true;
    error = null;
    const calculateComplianceResult = await calculateCompliance();

    if (calculateComplianceResult.error) {
      error = calculateComplianceResult.error.message;
    } else if (calculateComplianceResult.data) {
      dashboardData = calculateComplianceResult.data as ComplianceDashboardData;
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
</script>

<div class="compliance-dashboard">
  {#if loading}
    <div class="loading-container">
      <LoadingState
        variant="spinner"
        size="lg"
        message="Loading compliance data..."
        label="Loading compliance data"
      />
    </div>
  {:else if error}
    <div class="error-container">
      <Panel variant="highlight" ariaLabel="Error">
        <p class="error-message">Failed to load compliance data: {error}</p>
        <button type="button" class="retry-button" onclick={() => window.location.reload()}
          >Retry</button
        >
      </Panel>
    </div>
  {:else if dashboardData}
    <header class="dashboard-header">
      <div class="header-content">
        <h1>Compliance Dashboard</h1>
        <p class="dashboard-subtitle">Track regulatory framework compliance status</p>
      </div>
      <div class="header-actions">
        <Button variant="primary" onclick={handleCalculateAll} disabled={calculating}>
          {calculating ? 'Calculating...' : 'Calculate Compliance'}
        </Button>
      </div>
    </header>

    <div class="dashboard-grid">
      <section class="dashboard-section summary-cards" aria-label="Compliance Summary">
        <div class="summary-card compliant">
          <span class="summary-value">{dashboardData.compliantCount}</span>
          <span class="summary-label">Compliant</span>
        </div>
        <div class="summary-card in-progress">
          <span class="summary-value">{dashboardData.inProgressCount}</span>
          <span class="summary-label">In Progress</span>
        </div>
        <div class="summary-card non-compliant">
          <span class="summary-value">{dashboardData.nonCompliantCount}</span>
          <span class="summary-label">Non-Compliant</span>
        </div>
        <div class="summary-card not-started">
          <span class="summary-value">{dashboardData.notStartedCount}</span>
          <span class="summary-label">Not Started</span>
        </div>
      </section>

      <section class="dashboard-section frameworks" aria-label="Framework Status">
        <Panel variant="admin" ariaLabel="Regulatory Frameworks">
          <header class="section-header">
            <h2>Regulatory Frameworks</h2>
            <span class="framework-count">{dashboardData.totalFrameworks} frameworks</span>
          </header>

          {#if dashboardData.summaries.length === 0}
            <div class="empty-state">
              <p>No compliance data available</p>
              <p class="empty-hint">
                Click "Calculate Compliance" to generate compliance snapshots
              </p>
            </div>
          {:else}
            <div class="framework-list">
              {#each dashboardData.summaries as summary (summary.frameworkId)}
                <a
                  href="/admin/compliance/{summary.frameworkId}"
                  class="framework-card"
                  style="--status-color: {getStatusColor(summary.status)}"
                >
                  <div class="framework-info">
                    <span class="framework-name"
                      >{getFrameworkLabel(summary.frameworkId as RegulatoryFramework)}</span
                    >
                    <span class="framework-id">{summary.frameworkId}</span>
                  </div>
                  <div class="framework-stats">
                    <div class="completion-bar">
                      <div
                        class="completion-fill"
                        style="width: {summary.completionPercentage}%"
                      ></div>
                    </div>
                    <span class="completion-percentage"
                      >{summary.completionPercentage.toFixed(0)}%</span
                    >
                  </div>
                  <div class="framework-meta">
                    <Badge variant={getStatusBadgeVariant(summary.status)}>
                      {summary.status.replace('_', ' ')}
                    </Badge>
                    <span class="requirements-count">
                      {summary.requirementsCompleted}/{summary.requirementsCount} requirements
                    </span>
                  </div>
                </a>
              {/each}

              {#each REGULATORY_FRAMEWORKS.filter((f) => !dashboardData?.summaries.some((s) => s['frameworkId'] === f)) as frameworkId (frameworkId)}
                <div class="framework-card not-started">
                  <div class="framework-info">
                    <span class="framework-name">{getFrameworkLabel(frameworkId)}</span>
                    <span class="framework-id">{frameworkId}</span>
                  </div>
                  <div class="framework-stats">
                    <div class="completion-bar">
                      <div class="completion-fill" style="width: 0%"></div>
                    </div>
                    <span class="completion-percentage">0%</span>
                  </div>
                  <div class="framework-meta">
                    <Badge variant="default">Not Started</Badge>
                    <span class="requirements-count">0/0 requirements</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Panel>
      </section>

      <section class="dashboard-section historical" aria-label="Historical Trends">
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
  .compliance-dashboard {
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

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-6);
  }

  .header-content h1 {
    font-size: var(--admin-text-2xl);
    font-weight: 700;
    color: var(--admin-text-primary);
    margin: 0 0 var(--space-2) 0;
  }

  .dashboard-subtitle {
    font-size: var(--admin-text-base);
    color: var(--admin-text-secondary);
    margin: 0;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--space-4);
  }

  .dashboard-section {
    grid-column: span 12;
  }

  @media (min-width: 1024px) {
    .frameworks {
      grid-column: span 8;
    }

    .historical {
      grid-column: span 4;
    }
  }

  .summary-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .summary-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    text-align: center;
    border-left: 4px solid;
  }

  .summary-card.compliant {
    border-left-color: var(--color-success);
  }

  .summary-card.in-progress {
    border-left-color: var(--color-warning);
  }

  .summary-card.non-compliant {
    border-left-color: var(--color-error);
  }

  .summary-card.not-started {
    border-left-color: var(--color-text-secondary);
  }

  .summary-value {
    font-size: var(--admin-text-2xl);
    font-weight: 700;
    color: var(--admin-text-primary);
  }

  .summary-label {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
    margin-top: var(--space-1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
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

  .framework-count {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
  }

  .framework-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .framework-card {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: var(--space-4);
    align-items: center;
    padding: var(--space-4);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: inherit;
    transition:
      border-color 200ms ease-out,
      transform 200ms ease-out;
    border-left: 4px solid var(--status-color, var(--color-text-secondary));
  }

  .framework-card:hover {
    transform: translateY(-2px);
    border-left-color: var(--color-accent);
  }

  .framework-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .framework-name {
    font-size: var(--admin-text-base);
    font-weight: 600;
    color: var(--admin-text-primary);
  }

  .framework-id {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
    font-family: monospace;
  }

  .framework-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  .completion-bar {
    width: 100px;
    height: 6px;
    background-color: var(--color-bg-primary);
    border-radius: 3px;
    overflow: hidden;
  }

  .completion-fill {
    height: 100%;
    background-color: var(--status-color, var(--color-text-secondary));
    border-radius: 3px;
    transition: width 300ms ease-out;
  }

  .completion-percentage {
    font-size: var(--admin-text-sm);
    font-weight: 600;
    color: var(--admin-text-primary);
  }

  .framework-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  .requirements-count {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
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
    .framework-card,
    .completion-fill {
      transition: none;
    }
  }
</style>
