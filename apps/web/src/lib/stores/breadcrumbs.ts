import { writable, get } from 'svelte/store';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface BreadcrumbsState {
  items: BreadcrumbItem[];
}

const initialState: BreadcrumbsState = {
  items: [],
};

function createBreadcrumbsStore() {
  const { subscribe, set, update } = writable<BreadcrumbsState>(initialState);

  return {
    subscribe,

    setBreadcrumbs(items: BreadcrumbItem[]): void {
      set({ items });
    },

    addBreadcrumb(item: BreadcrumbItem): void {
      update((state) => ({
        items: [...state.items, item],
      }));
    },

    clearBreadcrumbs(): void {
      set({ items: [] });
    },

    getBreadcrumbs(): BreadcrumbItem[] {
      return get({ subscribe }).items;
    },
  };
}

export const breadcrumbs = createBreadcrumbsStore();

export function setBreadcrumbs(items: BreadcrumbItem[]): void {
  breadcrumbs.setBreadcrumbs(items);
}

export function addBreadcrumb(item: BreadcrumbItem): void {
  breadcrumbs.addBreadcrumb(item);
}

export function clearBreadcrumbs(): void {
  breadcrumbs.clearBreadcrumbs();
}
