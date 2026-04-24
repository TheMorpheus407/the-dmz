<script lang="ts">
  import { onMount } from 'svelte';

  import { Panel, Button, Badge, LoadingState } from '$lib/ui';
  import {
    getUser,
    updateUser,
    deleteUser,
    getUserActivity,
    assignUserRole,
    revokeUserRole,
    type UserWithRoles,
    type UserActivity,
  } from '$lib/api/users';

  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  let user = $state<UserWithRoles | null>(null);
  let activity = $state<UserActivity | null>(null);
  let loading = $state(true);
  let activityLoading = $state(false);
  let error = $state<string | null>(null);
  let saving = $state(false);
  let isEditing = $state(false);
  let isAssigningRole = $state(false);
  let selectedRoleId = $state('');
  let editForm = $state({
    displayName: '',
    email: '',
    isActive: true,
  });

  const userId = $derived($page.params['id'] as string);

  const availableRoles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'tenant_admin', label: 'Tenant Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'trainer', label: 'Trainer' },
    { value: 'learner', label: 'Learner' },
  ];

  async function loadUser() {
    loading = true;
    error = null;

    const userResult = await getUser(userId);

    if (userResult.error) {
      error = userResult.error.message;
    } else if (userResult.data) {
      user = userResult.data;
      editForm = {
        displayName: userResult.data.displayName || '',
        email: userResult.data.email,
        isActive: userResult.data.isActive,
      };
    }
    loading = false;
  }

  async function loadActivity() {
    activityLoading = true;
    const userActivityResult = await getUserActivity(userId);
    if (userActivityResult.data) {
      activity = userActivityResult.data;
    }
    activityLoading = false;
  }

  function startEditing() {
    if (user) {
      editForm = {
        displayName: user.displayName || '',
        email: user.email,
        isActive: user.isActive,
      };
    }
    isEditing = true;
  }

  function cancelEditing() {
    isEditing = false;
    if (user) {
      editForm = {
        displayName: user.displayName || '',
        email: user.email,
        isActive: user.isActive,
      };
    }
  }

  async function saveChanges() {
    if (!user) return;

    saving = true;
    error = null;

    const updateData: { displayName?: string; email: string; isActive: boolean } = {
      email: editForm.email,
      isActive: editForm.isActive,
    };

    if (editForm.displayName !== '') {
      updateData.displayName = editForm.displayName;
    }

    const updateUserResult = await updateUser(user.userId, updateData);

    if (updateUserResult.error) {
      error = updateUserResult.error.message;
    } else if (updateUserResult.data) {
      user = updateUserResult.data;
      isEditing = false;
    }
    saving = false;
  }

  async function handleDeactivate() {
    if (!user || !confirm('Are you sure you want to deactivate this user?')) return;

    saving = true;
    error = null;

    const deactivateUserResult = await updateUser(user.userId, { isActive: false });

    if (deactivateUserResult.error) {
      error = deactivateUserResult.error.message;
    } else if (deactivateUserResult.data) {
      user = deactivateUserResult.data;
      editForm.isActive = false;
    }
    saving = false;
  }

  async function handleActivate() {
    if (!user) return;

    saving = true;
    error = null;

    const activateUserResult = await updateUser(user.userId, { isActive: true });

    if (activateUserResult.error) {
      error = activateUserResult.error.message;
    } else if (activateUserResult.data) {
      user = activateUserResult.data;
      editForm.isActive = true;
    }
    saving = false;
  }

  async function handleDelete() {
    if (
      !user ||
      !confirm('Are you sure you want to delete this user? This action cannot be undone.')
    ) {
      return;
    }

    saving = true;
    error = null;

    const deleteUserResult = await deleteUser(user.userId);

    if (deleteUserResult.error) {
      error = deleteUserResult.error.message;
    } else {
      void goto('/admin/users');
    }
    saving = false;
  }

  function openRoleAssignment() {
    selectedRoleId = '';
    isAssigningRole = true;
  }

  function closeRoleAssignment() {
    isAssigningRole = false;
    selectedRoleId = '';
  }

  async function handleAssignRole() {
    if (!user || !selectedRoleId) return;

    saving = true;
    error = null;

    const assignRoleResult = await assignUserRole(user.userId, { roleId: selectedRoleId });

    if (assignRoleResult.error) {
      error = assignRoleResult.error.message;
    } else {
      await loadUser();
      await loadActivity();
      closeRoleAssignment();
    }
    saving = false;
  }

  async function handleRevokeRole(roleId: string) {
    if (!user || !confirm('Are you sure you want to revoke this role?')) return;

    saving = true;
    error = null;

    const revokeRoleResult = await revokeUserRole(user.userId, roleId);

    if (revokeRoleResult.error) {
      error = revokeRoleResult.error.message;
    } else {
      await loadUser();
      await loadActivity();
    }
    saving = false;
  }

  onMount(() => {
    void loadUser();
    void loadActivity();
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
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatRoleDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
</script>

<div class="user-detail-page">
  <header class="user-detail-page__header">
    <div class="user-detail-page__title-section">
      <Button variant="ghost" onclick={() => goto('/admin/users')}>← Back to Users</Button>
      <h1>{user?.displayName || user?.email || 'User Details'}</h1>
      {#if user}
        <Badge variant={user.isActive ? 'success' : 'default'}>
          {user.isActive ? 'Active' : 'Inactive'}
        </Badge>
      {/if}
    </div>
    <div class="user-detail-page__actions">
      {#if !isEditing}
        <Button variant="secondary" onclick={startEditing}>Edit User</Button>
        {#if user?.isActive}
          <Button variant="secondary" onclick={handleDeactivate} disabled={saving}
            >Deactivate</Button
          >
        {:else}
          <Button variant="primary" onclick={handleActivate} disabled={saving}>Activate</Button>
        {/if}
        <Button variant="danger" onclick={handleDelete} disabled={saving}>Delete</Button>
      {/if}
    </div>
  </header>

  {#if loading}
    <div class="loading-container">
      <LoadingState
        variant="spinner"
        size="lg"
        message="Loading user..."
        label="Loading user data"
      />
    </div>
  {:else if error && !user}
    <Panel variant="highlight" ariaLabel="Error">
      <p class="error-message">{error}</p>
      <Button variant="secondary" onclick={loadUser}>Retry</Button>
    </Panel>
  {:else if user}
    {#if error}
      <Panel variant="highlight" ariaLabel="Warning">
        <p class="warning-message">{error}</p>
      </Panel>
    {/if}

    <div class="user-detail-grid">
      <Panel variant="admin" ariaLabel="User Profile">
        <header class="section-header">
          <h2>Profile</h2>
        </header>
        {#if isEditing}
          <form
            class="edit-form"
            onsubmit={(e) => {
              e.preventDefault();
              void saveChanges();
            }}
          >
            <div class="form-group">
              <label for="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                bind:value={editForm.displayName}
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" type="email" bind:value={editForm.email} class="form-input" />
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" bind:checked={editForm.isActive} />
                Active
              </label>
            </div>
            <div class="form-actions">
              <Button variant="ghost" onclick={cancelEditing} disabled={saving}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        {:else}
          <dl class="info-list">
            <div class="info-item">
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div class="info-item">
              <dt>Display Name</dt>
              <dd>{user.displayName || '-'}</dd>
            </div>
            <div class="info-item">
              <dt>Role</dt>
              <dd>
                <Badge variant={getRoleBadgeVariant(user.role)}>
                  {user.role.replace('_', ' ')}
                </Badge>
              </dd>
            </div>
            <div class="info-item">
              <dt>Status</dt>
              <dd>
                <Badge variant={user.isActive ? 'success' : 'default'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
            <div class="info-item">
              <dt>Created</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div class="info-item">
              <dt>Last Updated</dt>
              <dd>{formatDate(user.updatedAt)}</dd>
            </div>
          </dl>
        {/if}
      </Panel>

      <Panel variant="admin" ariaLabel="Role Assignments">
        <header class="section-header">
          <h2>Role Assignments</h2>
          <Button variant="secondary" size="sm" onclick={openRoleAssignment}>Add Role</Button>
        </header>
        {#if isAssigningRole}
          <div class="role-assignment-form">
            <select class="role-select" bind:value={selectedRoleId}>
              <option value="">Select a role...</option>
              {#each availableRoles as role (role.value)}
                <option value={role.value}>{role.label}</option>
              {/each}
            </select>
            <div class="role-assignment-actions">
              <Button variant="ghost" size="sm" onclick={closeRoleAssignment}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onclick={handleAssignRole}
                disabled={!selectedRoleId || saving}
              >
                {saving ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </div>
        {/if}
        {#if user.roleAssignments.length === 0}
          <p class="empty-message">No role assignments</p>
        {:else}
          <ul class="role-list">
            {#each user.roleAssignments as assignment (assignment.roleId)}
              <li class="role-item">
                <div class="role-info">
                  <span class="role-name">{assignment.roleName}</span>
                  <span class="role-date">
                    Assigned: {formatRoleDate(assignment.assignedAt)}
                  </span>
                  {#if assignment.expiresAt}
                    <span class="role-expires">
                      Expires: {formatRoleDate(assignment.expiresAt)}
                    </span>
                  {/if}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => handleRevokeRole(assignment.roleId)}
                  disabled={saving}
                >
                  Revoke
                </Button>
              </li>
            {/each}
          </ul>
        {/if}
      </Panel>

      <Panel variant="admin" ariaLabel="Activity Summary">
        <header class="section-header">
          <h2>Activity Summary</h2>
        </header>
        {#if activityLoading}
          <LoadingState variant="spinner" size="sm" message="Loading activity..." />
        {:else if activity && activity.recentActivity.length > 0}
          <ul class="activity-list">
            {#each activity.recentActivity.slice(0, 10) as item (item.timestamp)}
              <li class="activity-item">
                <span class="activity-action">{item.action}</span>
                {#if item.resourceType}
                  <span class="activity-resource">({item.resourceType})</span>
                {/if}
                <span class="activity-time">{formatDate(item.timestamp)}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="empty-message">No recent activity</p>
        {/if}
      </Panel>

      <Panel variant="admin" ariaLabel="Login History">
        <header class="section-header">
          <h2>Login History</h2>
        </header>
        {#if activityLoading}
          <LoadingState variant="spinner" size="sm" message="Loading login history..." />
        {:else if activity && activity.loginHistory.length > 0}
          <ul class="login-list">
            {#each activity.loginHistory as session (session.id)}
              <li class="login-item">
                <div class="login-info">
                  <span class="login-ip">{session.ipAddress || 'Unknown IP'}</span>
                  <span class="login-time">{formatDate(session.createdAt)}</span>
                </div>
                <span class="login-agent">{session.userAgent || 'Unknown device'}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="empty-message">No login history</p>
        {/if}
      </Panel>
    </div>
  {/if}
</div>

<style>
  .user-detail-page {
    font-family: var(--font-admin);
    color: var(--color-text);
  }

  .user-detail-page__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .user-detail-page__title-section {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .user-detail-page__title-section h1 {
    font-size: var(--admin-text-xl);
    font-weight: 600;
    margin: 0;
    color: var(--admin-text-primary);
  }

  .user-detail-page__actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
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

  .warning-message {
    color: var(--color-warning);
  }

  .user-detail-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }

  @media (min-width: 768px) {
    .user-detail-grid {
      grid-template-columns: 1fr 1fr;
    }

    .user-detail-grid > :first-child {
      grid-column: 1 / -1;
    }
  }

  .section-header {
    margin-bottom: var(--space-4);
    display: flex;
    justify-content: space-between;
    align-items: center;
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

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-group label {
    font-size: var(--admin-text-sm);
    font-weight: 500;
    color: var(--admin-text-secondary);
  }

  .form-input {
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
  }

  .form-input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-2);
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
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .role-item:last-child {
    border-bottom: none;
  }

  .role-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .role-name {
    font-weight: 500;
    color: var(--admin-text-primary);
  }

  .role-date,
  .role-expires {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
  }

  .role-assignment-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
    background-color: var(--color-bg-tertiary);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-3);
  }

  .role-select {
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
    cursor: pointer;
  }

  .role-assignment-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .activity-list,
  .login-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .activity-item,
  .login-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .activity-item:last-child,
  .login-item:last-child {
    border-bottom: none;
  }

  .activity-action {
    font-weight: 500;
    color: var(--admin-text-primary);
  }

  .activity-resource {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
  }

  .activity-time,
  .login-time {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
  }

  .login-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .login-ip {
    font-weight: 500;
    color: var(--admin-text-primary);
  }

  .login-agent {
    font-size: var(--admin-text-xs);
    color: var(--admin-text-secondary);
  }

  .empty-message {
    color: var(--admin-text-secondary);
    text-align: center;
    padding: var(--space-4);
  }

  @media (prefers-reduced-motion: reduce) {
    .form-input {
      transition: none;
    }
  }
</style>
