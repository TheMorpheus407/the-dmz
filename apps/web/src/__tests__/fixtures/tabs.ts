import type { Snippet } from 'svelte';

export const mockTabContent = (() => {}) as Snippet;

type Tab = {
  id: string;
  label: string;
  content: Snippet;
};

export const mockTabs: Tab[] = [
  { id: 'tab1', label: 'Tab One', content: mockTabContent },
  { id: 'tab2', label: 'Tab Two', content: mockTabContent },
  { id: 'tab3', label: 'Tab Three', content: mockTabContent },
];

export const mockTwoTabs: Tab[] = [
  { id: 'tab1', label: 'Tab One', content: mockTabContent },
  { id: 'tab2', label: 'Tab Two', content: mockTabContent },
];

type CreateMockTabsOptions = {
  count?: number;
  prefix?: string;
};

export function createMockTabs(options: CreateMockTabsOptions = {}): Tab[] {
  const count = options.count ?? 3;
  const prefix = options.prefix ?? 'Tab';
  const prefixLower = prefix.toLowerCase();
  const prefixCapitalized = prefix.charAt(0).toUpperCase() + prefix.slice(1);

  return Array.from({ length: count }, (_, i) => ({
    id: `${prefixLower}${i + 1}`,
    label: `${prefixCapitalized} ${i + 1}`,
    content: mockTabContent,
  }));
}
