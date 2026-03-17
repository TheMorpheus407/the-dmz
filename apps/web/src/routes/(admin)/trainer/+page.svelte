<script lang="ts">
  import { onMount } from 'svelte';

  import { Panel, Badge, LoadingState } from '$lib/ui';
  import {
    getTrainerDashboard,
    getTrainerErrors,
    getTrainerLearners,
    type TrainerDashboardData,
    type ErrorPattern,
    type LearnerSummary,
  } from '$lib/api/admin';
  import { COMPETENCY_DOMAIN_LABELS } from '@the-dmz/shared';

  let dashboardData = $state<TrainerDashboardData | null>(null);
  let errorPatterns = $state<ErrorPattern[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedDomain = $state<string | null>(null);
  let learners = $state<LearnerSummary[]>([]);
  let learnersLoading = $state(false);

  onMount(async () => {
    const [dashboardResult, errorsResult] = await Promise.all([
      getTrainerDashboard(),
      getTrainerErrors(),
    ]);

    if (dashboardResult.error) {
      error = dashboardResult.error.message;
    } else if (dashboardResult.data) {
      dashboardData = dashboardResult.data;
    }

    if (errorsResult.error && !error) {
      error = errorsResult.error.message;
    } else if (errorsResult.data) {
      errorPatterns = errorsResult.data;
    }

    loading = false;
  });

  function getScoreColor(score: number): string {
    if (score >= 90) return 'var(--color-success)';
    if (score >= 70) return 'var(--color-info)';
    if (score >= 40) return 'var(--color-warning)';
    return 'var(--color-error)';
  }

  function getScoreLabel(score: number): string {
    if (score >= 90) return 'Mastery';
    if (score >= 70) return 'Consistent';
    if (score >= 40) return 'Operational';
    return 'Foundational';
  }

  function getDomainLabel(domain: string): string {
    return COMPETENCY_DOMAIN_LABELS[domain as keyof typeof COMPETENCY_DOMAIN_LABELS] || domain;
  }

  async function handleDomainSelect(domain: string | null) {
    if (domain === selectedDomain) {
      selectedDomain = null;
      learners = [];
      return;
    }

    selectedDomain = domain;
    if (domain) {
      learnersLoading = true;
      const result = await getTrainerLearners(domain, 70);
      if (result.error) {
        error = result.error.message;
        learners = [];
      } else if (result.data) {
        learners = result.data;
      }
      learnersLoading = false;
    } else {
      learners = [];
    }
  }

  function exportToCSV(data: LearnerSummary[], filename: string) {
    const headers = ['Email', 'Display Name', 'Score', 'Trend', 'Last Activity'];
    const rows = data.map((learner) => [
      learner.email,
      learner.displayName,
      learner.score.toString(),
      learner.trend,
      learner.lastActivity,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function handleExportLearners() {
    if (learners.length > 0 && selectedDomain) {
      exportToCSV(
        learners,
        `learners-${selectedDomain}-${new Date().toISOString().split('T')[0]}.csv`,
      );
    }
  }
</script>

<div class="trainer-dashboard">
  {#if loading}
    <div class="loading-container">
      <LoadingState
        variant="spinner"
        size="lg"
        message="Loading trainer dashboard..."
        label="Loading trainer dashboard"
      />
    </div>
  {:else if error}
    <div class="error-container">
      <Panel variant="highlight" ariaLabel="Error">
        <p class="error-message">Failed to load dashboard: {error}</p>
        <button type="button" class="retry-button" onclick={() => window.location.reload()}
          >Retry</button
        >
      </Panel>
    </div>
  {:else if dashboardData}
    <header class="dashboard-header">
      <h1>Trainer Dashboard</h1>
      <p class="dashboard-subtitle">Monitor training progress and identify areas for improvement</p>
    </header>

    <div class="dashboard-grid">
      <section class="dashboard-section summary-cards" aria-label="Summary">
        <div class="summary-card">
          <span class="summary-value">{dashboardData.totalLearners}</span>
          <span class="summary-label">Total Learners</span>
        </div>
        <div class="summary-card">
          <span class="summary-value" style="color: {getScoreColor(dashboardData.averageScore)}">
            {dashboardData.averageScore}
          </span>
          <span class="summary-label">Average Score</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{dashboardData.competencies.length}</span>
          <span class="summary-label">Competency Domains</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{errorPatterns.length}</span>
          <span class="summary-label">Error Patterns</span>
        </div>
      </section>

      <section class="dashboard-section competencies" aria-label="Competency Distribution">
        <Panel variant="admin" ariaLabel="Competency Distribution">
          <header class="section-header">
            <h2>Competency Distribution</h2>
          </header>
          <div class="competency-grid">
            {#each dashboardData.competencies as competency (competency.domain)}
              <button
                type="button"
                class="competency-card"
                class:selected={selectedDomain === competency.domain}
                onclick={() => handleDomainSelect(competency.domain)}
              >
                <div class="competency-header">
                  <span class="competency-domain">{getDomainLabel(competency.domain)}</span>
                  <Badge
                    variant={competency.averageScore >= 70
                      ? 'success'
                      : competency.averageScore >= 40
                        ? 'warning'
                        : 'danger'}
                  >
                    {getScoreLabel(competency.averageScore)}
                  </Badge>
                </div>
                <div
                  class="competency-score"
                  style="color: {getScoreColor(competency.averageScore)}"
                >
                  {competency.averageScore}
                </div>
                <div class="competency-meta">
                  <span>{competency.learnerCount} learners</span>
                </div>
                <div class="competency-distribution">
                  <div class="distribution-bar">
                    <div
                      class="distribution-segment foundational"
                      style="width: {competency.learnerCount > 0
                        ? (competency.distribution.foundational / competency.learnerCount) * 100
                        : 0}%"
                      title="Foundational: {competency.distribution.foundational}"
                    ></div>
                    <div
                      class="distribution-segment operational"
                      style="width: {competency.learnerCount > 0
                        ? (competency.distribution.operational / competency.learnerCount) * 100
                        : 0}%"
                      title="Operational: {competency.distribution.operational}"
                    ></div>
                    <div
                      class="distribution-segment consistent"
                      style="width: {competency.learnerCount > 0
                        ? (competency.distribution.consistent / competency.learnerCount) * 100
                        : 0}%"
                      title="Consistent: {competency.distribution.consistent}"
                    ></div>
                    <div
                      class="distribution-segment mastery"
                      style="width: {competency.learnerCount > 0
                        ? (competency.distribution.mastery / competency.learnerCount) * 100
                        : 0}%"
                      title="Mastery: {competency.distribution.mastery}"
                    ></div>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </Panel>
      </section>

      {#if selectedDomain && learners.length > 0}
        <section class="dashboard-section learner-drilldown" aria-label="Learner Drill-down">
          <Panel variant="admin" ariaLabel="Learners needing improvement">
            <header class="section-header">
              <h2>Learners: {getDomainLabel(selectedDomain)}</h2>
              <div class="drilldown-actions">
                {#if learners.length > 0}
                  <button type="button" class="export-button" onclick={handleExportLearners}
                    >Export CSV</button
                  >
                {/if}
                <button type="button" class="close-button" onclick={() => handleDomainSelect(null)}
                  >Close</button
                >
              </div>
            </header>
            {#if learnersLoading}
              <LoadingState variant="spinner" size="md" message="Loading learners..." />
            {:else}
              <div class="learner-list">
                {#each learners as learner (learner.userId)}
                  <div class="learner-item">
                    <div class="learner-info">
                      <span class="learner-name">{learner.displayName}</span>
                      <span class="learner-email">{learner.email}</span>
                    </div>
                    <div class="learner-stats">
                      <span class="learner-score" style="color: {getScoreColor(learner.score)}">
                        {learner.score}
                      </span>
                      <Badge
                        variant={learner.trend === 'improving'
                          ? 'success'
                          : learner.trend === 'declining'
                            ? 'danger'
                            : 'warning'}
                      >
                        {learner.trend}
                      </Badge>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </Panel>
        </section>
      {/if}

      <section class="dashboard-section error-patterns" aria-label="Error Patterns">
        <Panel variant="admin" ariaLabel="Common Error Patterns">
          <header class="section-header">
            <h2>Common Error Patterns</h2>
          </header>
          {#if errorPatterns.length > 0}
            <div class="error-list">
              {#each errorPatterns as pattern (pattern.pattern)}
                <div class="error-item">
                  <div class="error-info">
                    <span class="error-pattern">{pattern.pattern}</span>
                    <span class="error-domain">{getDomainLabel(pattern.domain)}</span>
                  </div>
                  <div class="error-count">
                    <span class="count-value">{pattern.count}</span>
                    <span class="count-label">occurrences</span>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <p>No error patterns recorded yet</p>
            </div>
          {/if}
        </Panel>
      </section>

      <section class="dashboard-section campaigns" aria-label="Campaigns">
        <Panel variant="admin" ariaLabel="Training Campaigns">
          <header class="section-header">
            <h2>Campaign Completion</h2>
          </header>
          {#if dashboardData.campaigns.length > 0}
            <div class="campaign-list">
              {#each dashboardData.campaigns as campaign (campaign.campaignId)}
                <div class="campaign-item">
                  <div class="campaign-info">
                    <span class="campaign-name">{campaign.campaignName}</span>
                    <span class="campaign-progress">
                      {campaign.completed}/{campaign.totalLearners} completed
                    </span>
                  </div>
                  <div class="campaign-rate">
                    <span class="rate-value">{campaign.completionRate}%</span>
                    <div class="rate-bar">
                      <div class="rate-fill" style="width: {campaign.completionRate}%"></div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <p>No campaigns configured</p>
              <p class="empty-hint">Campaigns will appear here once they are created</p>
            </div>
          {/if}
        </Panel>
      </section>
    </div>
  {/if}
</div>

<style>
  .trainer-dashboard {
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
    margin-bottom: var(--space-6);
  }

  .dashboard-header h1 {
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
    .competencies {
      grid-column: span 8;
    }

    .error-patterns {
      grid-column: span 4;
    }

    .campaigns {
      grid-column: span 12;
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

  .competency-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-3);
  }

  .competency-card {
    display: flex;
    flex-direction: column;
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      border-color 200ms ease-out,
      transform 200ms ease-out;
    text-align: left;
  }

  .competency-card:hover {
    border-color: var(--color-accent);
    transform: translateY(-2px);
  }

  .competency-card.selected {
    border-color: var(--color-accent);
    background-color: var(--color-bg-tertiary);
  }

  .competency-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .competency-domain {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    color: var(--admin-text-primary);
  }

  .competency-score {
    font-size: var(--admin-text-3xl);
    font-weight: 700;
    line-height: 1;
  }

  .competency-meta {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
    margin-top: var(--space-2);
  }

  .competency-distribution {
    margin-top: var(--space-3);
  }

  .distribution-bar {
    display: flex;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    background-color: var(--color-bg-primary);
  }

  .distribution-segment {
    height: 100%;
  }

  .distribution-segment.foundational {
    background-color: var(--color-error);
  }

  .distribution-segment.operational {
    background-color: var(--color-warning);
  }

  .distribution-segment.consistent {
    background-color: var(--color-info);
  }

  .distribution-segment.mastery {
    background-color: var(--color-success);
  }

  .learner-drilldown {
    grid-column: span 12;
  }

  .close-button {
    padding: var(--space-1) var(--space-3);
    background-color: transparent;
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--admin-text-sm);
  }

  .close-button:hover {
    background-color: var(--color-bg-secondary);
  }

  .drilldown-actions {
    display: flex;
    gap: var(--space-2);
  }

  .export-button {
    padding: var(--space-1) var(--space-3);
    background-color: var(--color-accent);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--admin-text-sm);
  }

  .export-button:hover {
    opacity: 0.9;
  }

  .learner-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .learner-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
  }

  .learner-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .learner-name {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    color: var(--admin-text-primary);
  }

  .learner-email {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
  }

  .learner-stats {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .learner-score {
    font-size: var(--admin-text-lg);
    font-weight: 700;
  }

  .error-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .error-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
  }

  .error-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .error-pattern {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    color: var(--admin-text-primary);
  }

  .error-domain {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
  }

  .error-count {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .count-value {
    font-size: var(--admin-text-lg);
    font-weight: 700;
    color: var(--color-error);
  }

  .count-label {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
  }

  .campaign-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .campaign-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
  }

  .campaign-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .campaign-name {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    color: var(--admin-text-primary);
  }

  .campaign-progress {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
  }

  .campaign-rate {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  .rate-value {
    font-size: var(--admin-text-lg);
    font-weight: 700;
    color: var(--admin-text-primary);
  }

  .rate-bar {
    width: 100px;
    height: 6px;
    background-color: var(--color-bg-primary);
    border-radius: 3px;
    overflow: hidden;
  }

  .rate-fill {
    height: 100%;
    background-color: var(--color-success);
    border-radius: 3px;
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
    .competency-card,
    .distribution-segment {
      transition: none;
    }
  }
</style>
