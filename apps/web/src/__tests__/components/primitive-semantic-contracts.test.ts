import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import Tabs from '$lib/ui/components/Tabs.svelte';
import Modal from '$lib/ui/components/Modal.svelte';
import LoadingState from '$lib/ui/components/LoadingState.svelte';
import { SEMANTIC_CONTRACTS } from '$lib/ui/primitive-contract';

import { render } from '../helpers/render';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockTabContent = () => 'Content' as any;

describe('Semantic Contract: Tabs', () => {
  it('should have required ARIA roles', () => {
    const mockTabs = [
      { id: 'tab1', label: 'Tab One', content: mockTabContent },
      { id: 'tab2', label: 'Tab Two', content: mockTabContent },
      { id: 'tab3', label: 'Tab Three', content: mockTabContent },
    ];

    const { container } = render(Tabs, {
      props: { tabs: mockTabs, ariaLabel: 'Test tabs' },
    });

    expect(container.querySelector('[role="tablist"]')).toBeTruthy();
    expect(container.querySelectorAll('[role="tab"]').length).toBe(3);
    expect(container.querySelector('[role="tabpanel"]')).toBeTruthy();
  });

  it('should support keyboard navigation', () => {
    const mockTabs = [
      { id: 'tab1', label: 'Tab One', content: mockTabContent },
      { id: 'tab2', label: 'Tab Two', content: mockTabContent },
    ];

    const { container } = render(Tabs, {
      props: { tabs: mockTabs, ariaLabel: 'Test tabs' },
    });

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);

    const firstTab = tabs[0] as HTMLElement;
    firstTab.focus();
    expect(document.activeElement).toBe(firstTab);
  });

  it('should have tabpanel with proper ID linking', () => {
    const mockTabs = [{ id: 'tab1', label: 'Tab One', content: mockTabContent }];

    const { container } = render(Tabs, {
      props: { tabs: mockTabs, ariaLabel: 'Test tabs' },
    });

    const tab = container.querySelector('[role="tab"]');
    const tabpanel = container.querySelector('[role="tabpanel"]');

    expect(tabpanel?.id).toBeDefined();
    expect(tab?.getAttribute('aria-controls')).toBe(tabpanel?.id);
  });

  it('should have proper aria-selected on active tab', () => {
    const mockTabs = [
      { id: 'tab1', label: 'Tab One', content: mockTabContent },
      { id: 'tab2', label: 'Tab Two', content: mockTabContent },
    ];

    const { container } = render(Tabs, {
      props: { tabs: mockTabs, ariaLabel: 'Test tabs' },
    });

    const tabs = container.querySelectorAll('[role="tab"]');
    const firstTab = tabs[0] as HTMLElement;
    expect(firstTab.getAttribute('aria-selected')).toBe('true');
  });

  it('should have no accessibility violations', async () => {
    const mockTabs = [
      { id: 'tab1', label: 'Tab One', content: mockTabContent },
      { id: 'tab2', label: 'Tab Two', content: mockTabContent },
    ];

    const { container } = render(Tabs, {
      props: { tabs: mockTabs, ariaLabel: 'Test tabs' },
    });

    const results = await axe(container, {
      rules: {
        'aria-required-children': { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });
});

describe('Semantic Contract: Modal', () => {
  it('should have dialog role when open', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Test Modal', children: mockTabContent },
    });

    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('should have aria-labelledby referencing title', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Test Modal', children: mockTabContent },
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('modal-title');
  });

  it('should have aria-modal set to true', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Test Modal', children: mockTabContent },
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
  });

  it('should not render when closed', () => {
    const { container } = render(Modal, {
      props: { open: false, title: 'Test Modal', children: mockTabContent },
    });

    expect(container.querySelector('[role="dialog"]')).toBeFalsy();
  });

  it('should have close button or mechanism', () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Test Modal', children: mockTabContent },
    });

    const closeButton = container.querySelector('[aria-label="Close modal"]');
    expect(closeButton || container.querySelector('button')).toBeTruthy();
  });

  it('should have no accessibility violations when open', async () => {
    const { container } = render(Modal, {
      props: { open: true, title: 'Test Modal', children: mockTabContent },
    });

    const results = await axe(container, {
      rules: {
        region: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });
});

describe('Semantic Contract: LoadingState', () => {
  it('should have status role when loading', () => {
    const { container } = render(LoadingState, {
      props: { loading: true, label: 'Loading data', message: 'Please wait' },
    });

    const loading = container.querySelector('.loading');
    expect(loading?.getAttribute('role')).toBe('status');
  });

  it('should have aria-live set to polite', () => {
    const { container } = render(LoadingState, {
      props: { loading: true, label: 'Loading data', message: 'Please wait' },
    });

    const loading = container.querySelector('.loading');
    expect(loading?.getAttribute('aria-live')).toBe('polite');
  });

  it('should have aria-busy set to true when loading', () => {
    const { container } = render(LoadingState, {
      props: { loading: true, label: 'Loading data', message: 'Please wait' },
    });

    const loading = container.querySelector('.loading');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
  });

  it('should have accessible label', () => {
    const { container } = render(LoadingState, {
      props: { loading: true, label: 'Loading data', message: 'Please wait' },
    });

    const loading = container.querySelector('.loading');
    expect(loading?.getAttribute('aria-label')).toBe('Loading data');
  });

  it('should not have aria-busy when not loading', () => {
    const { container } = render(LoadingState, {
      props: { loading: false, label: 'Loading data', message: 'Please wait' },
    });

    const loading = container.querySelector('.loading');
    expect(loading?.getAttribute('aria-busy')).toBeFalsy();
  });

  it('should have no accessibility violations when loading', async () => {
    const { container } = render(LoadingState, {
      props: { loading: true, message: 'Loading...' },
    });

    const results = await axe(container, {
      rules: {
        region: { enabled: false },
      },
    });
    expect(results).toHaveNoViolations();
  });
});

describe('Semantic Contract: Contract Integrity', () => {
  it('should have complete Tabs contract', () => {
    const contract = SEMANTIC_CONTRACTS.Tabs;
    expect(contract.roles).toContain('tablist');
    expect(contract.roles).toContain('tab');
    expect(contract.roles).toContain('tabpanel');
  });

  it('should have complete Modal contract', () => {
    const contract = SEMANTIC_CONTRACTS.Modal;
    expect(contract.roles).toContain('dialog');
    expect(contract.attributes).toContain('aria-labelledby');
    expect(contract.attributes).toContain('aria-modal');
  });

  it('should have complete LoadingState contract', () => {
    const contract = SEMANTIC_CONTRACTS.LoadingState;
    expect(contract.roles).toContain('status');
    expect(contract.attributes).toContain('aria-live');
    expect(contract.attributes).toContain('aria-busy');
  });
});
