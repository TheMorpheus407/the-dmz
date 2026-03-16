<script lang="ts">
  type SortDirection = 'asc' | 'desc' | null;

  interface TableColumn<T> {
    key: keyof T | string;
    label: string;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
  }

  interface TableSort<T> {
    key: keyof T | string;
    direction: SortDirection;
  }

  interface Props<T> {
    columns: TableColumn<T>[];
    data: T[];
    sortable?: boolean;
    filterable?: boolean;
    paginated?: boolean;
    pageSize?: number;
    filterPlaceholder?: string;
    emptyMessage?: string;
    ariaLabel?: string;
    onSort?: (sort: TableSort<T> | null) => void;
  }

  const {
    columns,
    data,
    sortable = false,
    filterable = false,
    paginated = false,
    pageSize = 10,
    filterPlaceholder = 'Filter...',
    emptyMessage = 'No data available',
    ariaLabel,
    onSort,
  }: Props<Record<string, unknown>> = $props();

  let sort = $state<TableSort<Record<string, unknown>> | null>(null);
  let filter = $state('');
  let currentPage = $state(1);

  const filteredData = $derived.by(() => {
    if (!filter) return data;
    const lowerFilter = filter.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const value = row[col.key];
        if (value === undefined || value === null) return false;
        const stringValue = toFilterString(value);
        return stringValue.toLowerCase().includes(lowerFilter);
      }),
    );
  });

  function toFilterString(value: unknown): string {
    if (value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value as string | number | boolean);
  }

  const sortedData = $derived.by(() => {
    if (!sort || !sortable) return filteredData;
    const currentSort = sort;
    return [...filteredData].sort((a, b) => {
      const aVal = a[currentSort.key];
      const bVal = b[currentSort.key];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      const aStr = toFilterString(aVal);
      const bStr = toFilterString(bVal);
      const comparison = aStr < bStr ? -1 : 1;
      return currentSort.direction === 'asc' ? comparison : -comparison;
    });
  });

  const paginatedData = $derived.by(() => {
    if (!paginated) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  });

  const totalPages = $derived(paginated ? Math.ceil(sortedData.length / pageSize) : 1);

  function handleSort(key: string) {
    if (!sortable) return;
    let direction: SortDirection = 'asc';
    if (sort && sort.key === key) {
      if (sort.direction === 'asc') direction = 'desc';
      else if (sort.direction === 'desc') direction = null;
    }
    sort = direction ? { key, direction } : null;
    currentPage = 1;
    onSort?.(sort);
  }

  function handleFilterChange(event: Event) {
    const target = event.target as HTMLInputElement;
    filter = target.value;
    currentPage = 1;
  }

  function goToPage(page: number) {
    currentPage = Math.max(1, Math.min(page, totalPages));
  }

  function getCellValue(row: Record<string, unknown>, key: string): unknown {
    return row[key];
  }
</script>

<div class="admin-table">
  {#if filterable}
    <div class="admin-table__filter">
      <input
        type="text"
        class="admin-table__filter-input"
        placeholder={filterPlaceholder}
        value={filter}
        oninput={handleFilterChange}
        aria-label={filterPlaceholder}
      />
    </div>
  {/if}

  <div class="admin-table__container">
    <table class="admin-table__table" aria-label={ariaLabel}>
      <thead class="admin-table__header">
        <tr>
          {#each columns as column (column.key)}
            <th
              class="admin-table__header-cell"
              class:admin-table__header-cell--sortable={sortable && column.sortable}
              class:admin-table__header-cell--sorted={sort?.key === column.key}
              style:width={column.width}
              style:text-align={column.align || 'left'}
              aria-sort={sort?.key === column.key
                ? sort.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'}
            >
              {#if sortable && column.sortable}
                <button
                  class="admin-table__sort-button"
                  onclick={() => handleSort(String(column.key))}
                  type="button"
                >
                  <span class="admin-table__header-label">{column.label}</span>
                  <span class="admin-table__sort-icon" aria-hidden="true">
                    {#if sort?.key === column.key}
                      {sort.direction === 'asc' ? '↑' : '↓'}
                    {:else}
                      ↕
                    {/if}
                  </span>
                </button>
              {:else}
                <span class="admin-table__header-label">{column.label}</span>
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody class="admin-table__body">
        {#if paginatedData.length === 0}
          <tr>
            <td class="admin-table__empty" colspan={columns.length}>
              {emptyMessage}
            </td>
          </tr>
        {:else}
          {#each paginatedData as row, rowIndex (rowIndex)}
            <tr class="admin-table__row">
              {#each columns as column (column.key)}
                <td class="admin-table__cell" style:text-align={column.align || 'left'}>
                  <slot name="cell" {row} {column} value={getCellValue(row, String(column.key))}>
                    {getCellValue(row, String(column.key))}
                  </slot>
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  {#if paginated && totalPages > 1}
    <nav class="admin-table__pagination" aria-label="Table pagination">
      <button
        type="button"
        class="admin-table__pagination-button"
        onclick={() => goToPage(1)}
        disabled={currentPage === 1}
        aria-label="First page"
      >
        ««
      </button>
      <button
        type="button"
        class="admin-table__pagination-button"
        onclick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        «
      </button>
      <span class="admin-table__pagination-info">
        Page {currentPage} of {totalPages}
      </span>
      <button
        type="button"
        class="admin-table__pagination-button"
        onclick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        »
      </button>
      <button
        type="button"
        class="admin-table__pagination-button"
        onclick={() => goToPage(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="Last page"
      >
        »»
      </button>
    </nav>
  {/if}
</div>

<style>
  .admin-table {
    font-family: var(--font-admin);
    width: 100%;
  }

  .admin-table__filter {
    margin-bottom: var(--space-3);
  }

  .admin-table__filter-input {
    width: 100%;
    max-width: 300px;
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm, 0.875rem);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
  }

  .admin-table__filter-input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .admin-table__filter-input::placeholder {
    color: var(--color-text-muted);
  }

  .admin-table__container {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .admin-table__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--admin-text-sm, 0.875rem);
  }

  .admin-table__header {
    background-color: var(--color-bg-tertiary);
    border-bottom: 2px solid var(--color-border);
  }

  .admin-table__header-cell {
    padding: var(--space-3) var(--space-4);
    font-weight: 600;
    color: var(--color-text);
    text-align: left;
  }

  .admin-table__header-cell--sortable {
    cursor: pointer;
    user-select: none;
  }

  .admin-table__header-cell--sortable:hover {
    background-color: var(--color-bg-hover);
  }

  .admin-table__header-cell--sorted {
    color: var(--color-accent);
  }

  .admin-table__sort-button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    color: inherit;
    padding: 0;
  }

  .admin-table__sort-button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .admin-table__header-label {
    flex: 1;
    text-align: inherit;
  }

  .admin-table__sort-icon {
    font-size: var(--admin-text-xs, 0.75rem);
    color: var(--color-text-muted);
  }

  .admin-table__header-cell--sorted .admin-table__sort-icon {
    color: var(--color-accent);
  }

  .admin-table__body {
    background-color: var(--color-bg);
  }

  .admin-table__row {
    border-bottom: 1px solid var(--color-border);
    transition: background-color 150ms ease;
  }

  .admin-table__row:last-child {
    border-bottom: none;
  }

  .admin-table__row:hover {
    background-color: var(--color-bg-hover);
  }

  .admin-table__cell {
    padding: var(--space-3) var(--space-4);
    color: var(--color-text);
  }

  .admin-table__empty {
    padding: var(--space-6);
    text-align: center;
    color: var(--color-text-muted);
  }

  .admin-table__pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    margin-top: var(--space-4);
    padding: var(--space-2);
  }

  .admin-table__pagination-button {
    padding: var(--space-1) var(--space-2);
    font-family: var(--font-admin);
    font-size: var(--admin-text-sm, 0.875rem);
    background-color: var(--color-bg-tertiary);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background-color 150ms ease,
      opacity 150ms ease;
  }

  .admin-table__pagination-button:hover:not(:disabled) {
    background-color: var(--color-bg-hover);
  }

  .admin-table__pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .admin-table__pagination-button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .admin-table__pagination-info {
    padding: 0 var(--space-3);
    font-size: var(--admin-text-sm, 0.875rem);
    color: var(--color-text-muted);
  }

  @media (prefers-reduced-motion: reduce) {
    .admin-table__row,
    .admin-table__filter-input,
    .admin-table__pagination-button {
      transition: none;
    }
  }
</style>
