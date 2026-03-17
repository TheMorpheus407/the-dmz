<script lang="ts">
  import { onMount } from 'svelte';

  import { Panel, Button, Badge, LoadingState } from '$lib/ui';
  import { getDashboard, type DashboardData } from '$lib/api/admin';

  let dashboardData = $state<DashboardData | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    const result = await getDashboard();
    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      dashboardData = result.data;
    }
    loading = false;
  });

  function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  }

  function getTierLabel(tier: string): string {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  }
</script>

<div class="dashboard">
  {#if loading}
    <div class="loading-container">
      <LoadingState
        variant="spinner"
        size="lg"
        message="Loading dashboard..."
        label="Loading admin dashboard"
      />
    </div>
  {:else if error}
    <div class="error-container">
      <Panel variant="highlight" ariaLabel="Error">
        <p class="error-message">Failed to load dashboard: {error}</p>
        <Button onclick={() => window.location.reload()}>Retry</Button>
      </Panel>
    </div>
  {:else if dashboardData}
    <div class="dashboard-grid">
      <section class="dashboard-section tenant-info" aria-label="Tenant Information">
        <Panel variant="admin" ariaLabel="Tenant Information">
          <header class="section-header">
            <h2>Tenant Information</h2>
            <Badge variant={getStatusVariant(dashboardData.tenantInfo.status)}>
              {dashboardData.tenantInfo.status}
            </Badge>
          </header>
          <dl class="info-list">
            <div class="info-item">
              <dt>Name</dt>
              <dd>{dashboardData.tenantInfo.name}</dd>
            </div>
            <div class="info-item">
              <dt>Slug</dt>
              <dd>{dashboardData.tenantInfo.slug}</dd>
            </div>
            {#if dashboardData.tenantInfo.domain}
              <div class="info-item">
                <dt>Domain</dt>
                <dd>{dashboardData.tenantInfo.domain}</dd>
              </div>
            {/if}
            <div class="info-item">
              <dt>Plan</dt>
              <dd><Badge variant="info">{getTierLabel(dashboardData.tenantInfo.tier)}</Badge></dd>
            </div>
            <div class="info-item">
              <dt>Data Region</dt>
              <dd>{dashboardData.tenantInfo.dataRegion.toUpperCase()}</dd>
            </div>
            <div class="info-item">
              <dt>Created</dt>
              <dd>{new Date(dashboardData.tenantInfo.createdAt).toLocaleDateString()}</dd>
            </div>
            <div class="info-item info-item--flags">
              <dt>Features</dt>
              <dd class="feature-flags">
                {#if dashboardData.tenantInfo.featureFlags.trainingCampaigns}
                  <Badge variant="success">Campaigns</Badge>
                {/if}
                {#if dashboardData.tenantInfo.featureFlags.advancedAnalytics}
                  <Badge variant="info">Analytics</Badge>
                {/if}
                {#if dashboardData.tenantInfo.featureFlags.customBranding}
                  <Badge variant="warning">Branding</Badge>
                {/if}
                {#if dashboardData.tenantInfo.featureFlags.apiAccess}
                  <Badge variant="info">API</Badge>
                {/if}
                {#if dashboardData.tenantInfo.featureFlags.ssoEnabled}
                  <Badge variant="success">SSO</Badge>
                {/if}
                {#if !dashboardData.tenantInfo.featureFlags.trainingCampaigns && !dashboardData.tenantInfo.featureFlags.advancedAnalytics && !dashboardData.tenantInfo.featureFlags.customBranding && !dashboardData.tenantInfo.featureFlags.apiAccess && !dashboardData.tenantInfo.featureFlags.ssoEnabled}
                  <span class="no-features">None</span>
                {/if}
              </dd>
            </div>
          </dl>
        </Panel>
      </section>

      <section class="dashboard-section active-users" aria-label="Active Users">
        <Panel variant="admin" ariaLabel="Active Users">
          <header class="section-header">
            <h2>Active Users</h2>
          </header>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-value">{dashboardData.activeUsers.activeSessionCount}</span>
              <span class="metric-label">Active Sessions</span>
            </div>
            <div class="metric-card">
              <span class="metric-value">{dashboardData.activeUsers.usersOnlineLast15Min}</span>
              <span class="metric-label">Online (15 min)</span>
            </div>
            <div class="metric-card">
              <span class="metric-value">{dashboardData.activeUsers.dailyActiveUsers}</span>
              <span class="metric-label">Daily Active</span>
            </div>
            <div class="metric-card">
              <span class="metric-value">{dashboardData.activeUsers.weeklyActiveUsers}</span>
              <span class="metric-label">Weekly Active</span>
            </div>
          </div>
          {#if dashboardData.activeUsers.userGrowthTrend.length > 0}
            <div class="trend-section">
              <h3>User Growth (30 days)</h3>
              <div class="trend-chart">
                {#each dashboardData.activeUsers.userGrowthTrend as trend (trend.date)}
                  <div class="trend-bar-container" title="{trend.date}: {trend.count} new sessions">
                    <div
                      class="trend-bar"
                      style="height: {Math.min(
                        100,
                        (trend.count /
                          Math.max(
                            ...dashboardData.activeUsers.userGrowthTrend.map((t) => t.count),
                          )) *
                          100,
                      )}%"
                    ></div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </Panel>
      </section>

      <section class="dashboard-section user-metrics" aria-label="User Metrics">
        <Panel variant="admin" ariaLabel="User Metrics">
          <header class="section-header">
            <h2>User Metrics</h2>
          </header>
          <div class="metrics-grid">
            <div class="metric-card metric-card--large">
              <span class="metric-value">{dashboardData.metrics.totalUsers}</span>
              <span class="metric-label">Total Users</span>
            </div>
            <div class="metric-card metric-card--large">
              <span class="metric-value">{dashboardData.metrics.recentAdminActionsCount}</span>
              <span class="metric-label">Actions (24h)</span>
            </div>
          </div>
          {#if dashboardData.metrics.usersByRole.length > 0}
            <div class="role-breakdown">
              <h3>Users by Role</h3>
              <ul class="role-list">
                {#each dashboardData.metrics.usersByRole as roleGroup (roleGroup.role)}
                  <li class="role-item">
                    <span class="role-name">{roleGroup.role}</span>
                    <span class="role-count">{roleGroup.count}</span>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </Panel>
      </section>

      <section class="dashboard-section quick-actions" aria-label="Quick Actions">
        <Panel variant="admin" ariaLabel="Quick Actions">
          <header class="section-header">
            <h2>Quick Actions</h2>
          </header>
          <nav class="quick-actions-grid" aria-label="Quick action links">
            <a href="/admin/users" class="quick-action">
              <span class="quick-action-icon">◯</span>
              <span class="quick-action-label">Manage Users</span>
            </a>
            <a href="/admin/campaigns" class="quick-action">
              <span class="quick-action-icon">◎</span>
              <span class="quick-action-label">Campaigns</span>
            </a>
            <a href="/admin/settings" class="quick-action">
              <span class="quick-action-icon">⚙</span>
              <span class="quick-action-label">Settings</span>
            </a>
            <a href="/admin/reports" class="quick-action">
              <span class="quick-action-icon">◧</span>
              <span class="quick-action-label">Audit Log</span>
            </a>
          </nav>
        </Panel>
      </section>
    </div>
  {/if}
</div>

<style>
  .dashboard {
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

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--space-4);
  }

  .dashboard-section {
    grid-column: span 12;
  }

  @media (min-width: 1024px) {
    .tenant-info {
      grid-column: span 4;
    }

    .active-users {
      grid-column: span 8;
    }

    .user-metrics {
      grid-column: span 8;
    }

    .quick-actions {
      grid-column: span 4;
    }
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    .tenant-info {
      grid-column: span 6;
    }

    .active-users {
      grid-column: span 6;
    }

    .user-metrics {
      grid-column: span 6;
    }

    .quick-actions {
      grid-column: span 6;
    }
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

  .info-list {
    display: grid;
    gap: var(--space-3);
    margin: 0;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-item dt {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
    font-weight: 500;
  }

  .info-item dd {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-primary);
    margin: 0;
    text-align: right;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }

  .metric-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    text-align: center;
  }

  .metric-card--large {
    grid-column: span 1;
  }

  .metric-value {
    font-size: var(--admin-text-2xl);
    font-weight: 700;
    color: var(--admin-text-primary);
    line-height: 1.2;
  }

  .metric-label {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
    margin-top: var(--space-1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .trend-section {
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .trend-section h3 {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    margin: 0 0 var(--space-3) 0;
    color: var(--admin-text-secondary);
  }

  .trend-chart {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 60px;
  }

  .trend-bar-container {
    flex: 1;
    height: 100%;
    display: flex;
    align-items: flex-end;
  }

  .trend-bar {
    width: 100%;
    background-color: var(--color-accent);
    min-height: 2px;
    border-radius: 2px 2px 0 0;
    transition: height 300ms ease-out;
  }

  .role-breakdown {
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .role-breakdown h3 {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    margin: 0 0 var(--space-3) 0;
    color: var(--admin-text-secondary);
  }

  .role-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .role-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) 0;
  }

  .role-name {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-primary);
    text-transform: capitalize;
  }

  .role-count {
    font-size: var(--admin-text-sm);
    font-weight: 600;
    color: var(--admin-text-secondary);
  }

  .quick-actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }

  .quick-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    background-color: var(--color-bg-secondary);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition:
      background-color 200ms ease-out,
      transform 200ms ease-out;
  }

  .quick-action:hover {
    background-color: var(--color-bg-tertiary);
    transform: translateY(-2px);
  }

  .quick-action:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .quick-action-icon {
    font-size: var(--admin-text-xl);
    margin-bottom: var(--space-2);
  }

  .quick-action-label {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-primary);
    text-align: center;
  }

  @media (prefers-reduced-motion: reduce) {
    .trend-bar,
    .quick-action {
      transition: none;
    }
  }
</style>
