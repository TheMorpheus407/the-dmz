<script lang="ts">
  import { onMount } from 'svelte';

  import { Panel, Button, Badge, LoadingState } from '$lib/ui';
  import { listUsers, type User } from '$lib/api/users';

  import { goto } from '$app/navigation';

  let users = $state<User[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let total = $state(0);
  let page = $state(1);
  const limit = $state(20);
  let totalPages = $state(1);
  let search = $state('');
  let roleFilter = $state('');
  let statusFilter = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');
  let sortBy = $state<'displayName' | 'email' | 'role' | 'createdAt' | 'lastActive'>('createdAt');
  let sortOrder = $state<'asc' | 'desc'>('desc');

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'tenant_admin', label: 'Tenant Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'trainer', label: 'Trainer' },
    { value: 'learner', label: 'Learner' },
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ];

  async function loadUsers() {
    loading = true;
    error = null;

    const params: {
      page: number;
      limit: number;
      search?: string;
      role?: string;
      isActive?: boolean;
      sortBy?: 'displayName' | 'email' | 'role' | 'createdAt' | 'lastActive';
      sortOrder?: 'asc' | 'desc';
      createdAfter?: string;
      createdBefore?: string;
    } = {
      page,
      limit,
      sortBy,
      sortOrder,
    };

    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    if (statusFilter) params.isActive = statusFilter === 'true';
    if (dateFrom) params.createdAfter = new Date(dateFrom).toISOString();
    if (dateTo) params.createdBefore = new Date(dateTo).toISOString();

    const result = await listUsers(params);

    if (result.error) {
      error = result.error.message;
    } else if (result.data) {
      users = result.data.users;
      total = result.data.total;
      totalPages = result.data.totalPages;
    }
    loading = false;
  }

  function handleSearch() {
    page = 1;
    void loadUsers();
  }

  function handleFilterChange() {
    page = 1;
    void loadUsers();
  }

  function handleSort(column: 'displayName' | 'email' | 'role' | 'createdAt' | 'lastActive') {
    if (sortBy === column) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortOrder = 'asc';
    }
    page = 1;
    void loadUsers();
  }

  function goToPage(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      page = newPage;
      void loadUsers();
    }
  }

  function viewUserDetails(userId: string) {
    void goto(`/admin/users/${userId}`);
  }

  onMount(() => {
    void loadUsers();
  });

  function getRoleBadgeVariant(
    role: string,
  ): 'info' | 'success' | 'warning' | 'danger' | 'default' {
    switch (role) {
      case 'super_admin':
        return 'danger';
      case 'tenant_admin':
        return 'warning';
      case 'manager':
        return 'info';
      case 'trainer':
        return 'success';
      case 'learner':
      default:
        return 'default';
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
</script>

<div class="users-page">
  <header class="users-page__header">
    <div class="users-page__title-section">
      <h1>User Management</h1>
      <span class="users-page__count">{total} total users</span>
    </div>
    <Button variant="primary" onclick={() => goto('/admin/users/new')}>Add User</Button>
  </header>

  <Panel variant="admin" ariaLabel="Filters">
    <div class="filters">
      <div class="filters__search">
        <input
          type="text"
          class="filters__search-input"
          placeholder="Search by name or email..."
          bind:value={search}
          onkeydown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="secondary" size="sm" onclick={handleSearch}>Search</Button>
      </div>
      <div class="filters__select-group">
        <select class="filters__select" bind:value={roleFilter} onchange={handleFilterChange}>
          {#each roleOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <select class="filters__select" bind:value={statusFilter} onchange={handleFilterChange}>
          {#each statusOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        <input
          type="date"
          class="filters__date-input"
          bind:value={dateFrom}
          onchange={handleFilterChange}
          aria-label="Created after"
        />
        <input
          type="date"
          class="filters__date-input"
          bind:value={dateTo}
          onchange={handleFilterChange}
          aria-label="Created before"
        />
      </div>
    </div>
  </Panel>

  {#if loading}
    <div class="loading-container">
      <LoadingState
        variant="spinner"
        size="lg"
        message="Loading users..."
        label="Loading user data"
      />
    </div>
  {:else if error}
    <Panel variant="highlight" ariaLabel="Error">
      <p class="error-message">{error}</p>
      <Button variant="secondary" onclick={loadUsers}>Retry</Button>
    </Panel>
  {:else}
    <Panel variant="admin" ariaLabel="User List">
      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th class="sortable" onclick={() => handleSort('displayName')}>
                Name
                {#if sortBy === 'displayName'}
                  <span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                {/if}
              </th>
              <th class="sortable" onclick={() => handleSort('email')}>
                Email
                {#if sortBy === 'email'}
                  <span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                {/if}
              </th>
              <th class="sortable" onclick={() => handleSort('role')}>
                Role
                {#if sortBy === 'role'}
                  <span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                {/if}
              </th>
              <th>Status</th>
              <th class="sortable" onclick={() => handleSort('createdAt')}>
                Created
                {#if sortBy === 'createdAt'}
                  <span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                {/if}
              </th>
              <th class="sortable" onclick={() => handleSort('lastActive')}>
                Last Active
                {#if sortBy === 'lastActive'}
                  <span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                {/if}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#if users.length === 0}
              <tr>
                <td colspan="7" class="empty-message">No users found</td>
              </tr>
            {:else}
              {#each users as user (user.userId)}
                <tr>
                  <td class="user-name">{user.displayName || '-'}</td>
                  <td>{user.email}</td>
                  <td>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={user.isActive ? 'success' : 'default'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>{user.lastActive ? formatDate(user.lastActive) : '-'}</td>
                  <td>
                    <Button variant="ghost" size="sm" onclick={() => viewUserDetails(user.userId)}>
                      View
                    </Button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      {#if totalPages > 1}
        <nav class="pagination" aria-label="User pagination">
          <button
            type="button"
            class="pagination__button"
            onclick={() => goToPage(1)}
            disabled={page === 1}
          >
            ««
          </button>
          <button
            type="button"
            class="pagination__button"
            onclick={() => goToPage(page - 1)}
            disabled={page === 1}
          >
            «
          </button>
          <span class="pagination__info">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            class="pagination__button"
            onclick={() => goToPage(page + 1)}
            disabled={page === totalPages}
          >
            »
          </button>
          <button
            type="button"
            class="pagination__button"
            onclick={() => goToPage(totalPages)}
            disabled={page === totalPages}
          >
            »»
          </button>
        </nav>
      {/if}
    </Panel>
  {/if}
</div>

<style>
  .users-page {
    font-family: var(--font-admin);
    color: var(--color-text);
  }

  .users-page__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .users-page__title-section {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .users-page__title-section h1 {
    font-size: var(--admin-text-xl);
    font-weight: 600;
    margin: 0;
    color: var(--admin-text-primary);
  }

  .users-page__count {
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
  }

  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
  }

  .error-message {
    color: var(--color-error);
    margin-bottom: var(--space-3);
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    align-items: center;
  }

  .filters__search {
    display: flex;
    gap: var(--space-2);
    flex: 1;
    min-width: 250px;
  }

  .filters__search-input {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
  }

  .filters__search-input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .filters__select-group {
    display: flex;
    gap: var(--space-2);
  }

  .filters__select {
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
  }

  .filters__select:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .filters__date-input {
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
  }

  .filters__date-input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .users-table-container {
    overflow-x: auto;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--admin-text-sm);
  }

  .users-table th {
    text-align: left;
    padding: var(--space-3) var(--space-4);
    font-weight: 600;
    color: var(--admin-text-secondary);
    border-bottom: 2px solid var(--color-border);
    background-color: var(--color-bg-tertiary);
  }

  .users-table th.sortable {
    cursor: pointer;
    user-select: none;
    transition: background-color 150ms ease;
  }

  .users-table th.sortable:hover {
    background-color: var(--color-bg-hover);
  }

  .sort-indicator {
    margin-left: var(--space-1);
    color: var(--color-accent);
  }

  .users-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .users-table tr:hover {
    background-color: var(--color-bg-hover);
  }

  .user-name {
    font-weight: 500;
  }

  .empty-message {
    text-align: center;
    color: var(--admin-text-secondary);
    padding: var(--space-6) !important;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-4);
    padding: var(--space-2);
  }

  .pagination__button {
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm);
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      opacity 150ms ease;
  }

  .pagination__button:hover:not(:disabled) {
    background-color: var(--color-bg-hover);
  }

  .pagination__button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pagination__button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .pagination__info {
    padding: 0 var(--space-3);
    font-size: var(--admin-text-sm);
    color: var(--admin-text-secondary);
  }

  @media (prefers-reduced-motion: reduce) {
    .filters__search-input,
    .pagination__button {
      transition: none;
    }
  }
</style>
