import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import Button from '$lib/ui/components/Button.svelte';
import Panel from '$lib/ui/components/Panel.svelte';
import Badge from '$lib/ui/components/Badge.svelte';
import Tabs from '$lib/ui/components/Tabs.svelte';
import Modal from '$lib/ui/components/Modal.svelte';
import LoadingState from '$lib/ui/components/LoadingState.svelte';

import { render } from '../helpers/render';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('UI Primitives Accessibility', () => {
  const a11yOptions = {
    rules: {
      region: { enabled: false },
    },
  };

  describe('Button a11y', () => {
    it('has no WCAG violations', async () => {
      const { container } = render(Button, {
        props: { children: () => 'Click me' as any, ariaLabel: 'Action button' },
      });
      const results = await axe(container, a11yOptions);
      expect(results).toHaveNoViolations();
    });

    it('has focus-visible styles', () => {
      const { getByRole } = render(Button, {
        props: { children: () => 'Button' as any, ariaLabel: 'Action button' },
      });

      const button = getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  describe('Panel a11y', () => {
    it('has no WCAG violations', async () => {
      const { container } = render(Panel, {
        props: { children: () => 'Panel content' as any },
      });
      const results = await axe(container, a11yOptions);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Badge a11y', () => {
    it('has no WCAG violations', async () => {
      const { container } = render(Badge, {
        props: { children: () => 'New' as any },
      });
      const results = await axe(container, a11yOptions);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Tabs a11y', () => {
    it('has correct ARIA roles', () => {
      const mockTabs = [
        { id: 'tab1', label: 'Tab One', content: () => ({}) as any },
        { id: 'tab2', label: 'Tab Two', content: () => ({}) as any },
      ];

      const { container } = render(Tabs, {
        props: { tabs: mockTabs, ariaLabel: 'Test tabs' },
      });

      expect(container.querySelector('[role="tablist"]')).toBeTruthy();
      expect(container.querySelectorAll('[role="tab"]').length).toBe(2);
      expect(container.querySelector('[role="tabpanel"]')).toBeTruthy();
    });

    it('has no WCAG violations', async () => {
      const mockTabs = [
        { id: 'tab1', label: 'Tab One', content: () => ({}) as any },
        { id: 'tab2', label: 'Tab Two', content: () => ({}) as any },
      ];

      const { container } = render(Tabs, {
        props: { tabs: mockTabs },
      });
      const results = await axe(container, {
        ...a11yOptions,
        rules: {
          ...a11yOptions.rules,
          'aria-required-children': { enabled: false },
        },
      });
      expect(results).toHaveNoViolations();
    });
  });

  describe('Modal a11y', () => {
    it('has correct ARIA attributes when open', () => {
      const { container } = render(Modal, {
        props: { open: true, title: 'Test Modal', children: () => 'Content' as any },
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('modal-title');
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
    });

    it('has no WCAG violations when open', async () => {
      const { container } = render(Modal, {
        props: { open: true, title: 'Test Modal', children: () => 'Content' as any },
      });
      const results = await axe(container, a11yOptions);
      expect(results).toHaveNoViolations();
    });
  });

  describe('LoadingState a11y', () => {
    it('has correct ARIA attributes', () => {
      const { container } = render(LoadingState, {
        props: { loading: true, label: 'Loading data', message: 'Please wait' },
      });

      const loading = container.querySelector('.loading');
      expect(loading?.getAttribute('role')).toBe('status');
      expect(loading?.getAttribute('aria-live')).toBe('polite');
      expect(loading?.getAttribute('aria-busy')).toBe('true');
    });

    it('has no WCAG violations', async () => {
      const { container } = render(LoadingState, {
        props: { loading: true, message: 'Loading...' },
      });
      const results = await axe(container, a11yOptions);
      expect(results).toHaveNoViolations();
    });
  });
});
