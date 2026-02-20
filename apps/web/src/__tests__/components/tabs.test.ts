import { describe, expect, it } from 'vitest';

import Tabs from '$lib/ui/components/Tabs.svelte';

import { render } from '../helpers/render';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('Tabs', () => {
  const mockTabs = [
    { id: 'tab1', label: 'Tab One', content: () => ({}) as any },
    { id: 'tab2', label: 'Tab Two', content: () => ({}) as any },
    { id: 'tab3', label: 'Tab Three', content: () => ({}) as any },
  ];

  it('renders all tab labels', () => {
    const { getByText } = render(Tabs, {
      props: { tabs: mockTabs },
    });

    expect(getByText('Tab One')).toBeTruthy();
    expect(getByText('Tab Two')).toBeTruthy();
    expect(getByText('Tab Three')).toBeTruthy();
  });

  it('renders tablist with role', () => {
    const { container } = render(Tabs, {
      props: { tabs: mockTabs, ariaLabel: 'Test tabs' },
    });

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
    expect(tablist?.getAttribute('aria-label')).toBe('Test tabs');
  });

  it('sets first tab as active by default', () => {
    const { container } = render(Tabs, {
      props: { tabs: mockTabs, activeTab: 'tab1' },
    });

    const firstTab = container.querySelector('[role="tab"]:nth-child(1)');
    expect(firstTab?.getAttribute('aria-selected')).toBe('true');
  });

  it('renders tab panels with correct ARIA', () => {
    const { container } = render(Tabs, {
      props: { tabs: mockTabs, activeTab: 'tab1' },
    });

    expect(container.querySelector('[role="tabpanel"]')).toBeTruthy();
    const panel = container.querySelector('[role="tabpanel"]');
    expect(panel?.getAttribute('aria-labelledby')).toBe('tab-tab1');
  });

  it('has tab elements with proper ARIA attributes', () => {
    const { container } = render(Tabs, {
      props: { tabs: mockTabs, activeTab: 'tab1' },
    });

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(3);

    const firstTab = tabs[0];
    expect(firstTab?.getAttribute('aria-controls')).toBe('panel-tab1');
    expect(firstTab?.getAttribute('tabindex')).toBe('0');
  });
});
