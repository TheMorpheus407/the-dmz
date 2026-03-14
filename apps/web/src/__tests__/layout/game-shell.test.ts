import { describe, expect, it } from 'vitest';

import TestWrapper from '$lib/components/TestWrapper.svelte';

import { render } from '../helpers/render';

describe('Game Shell Layout', () => {
  it('renders game shell with surface attribute', () => {
    const { container } = render(TestWrapper, {});

    const surface = container.querySelector('[data-surface="game"]');
    expect(surface).toBeTruthy();
  });

  it('has shell-game grid class', () => {
    const { container } = render(TestWrapper, {});

    const shell = container.querySelector('.shell-game');
    expect(shell).toBeTruthy();
  });

  it('has three panel placeholders on desktop', () => {
    const { container } = render(TestWrapper, {});

    const inbox = container.querySelector('.shell-game__panel--inbox');
    const document = container.querySelector('.shell-game__panel--document');
    const status = container.querySelector('.shell-game__panel--status');

    expect(inbox).toBeTruthy();
    expect(document).toBeTruthy();
    expect(status).toBeTruthy();
  });

  it('has mobile navigation', () => {
    const { container } = render(TestWrapper, {});

    const mobileNav = container.querySelector('.shell-game__mobile-nav');
    expect(mobileNav).toBeTruthy();
  });

  it('has tab buttons for mobile navigation', () => {
    const { container } = render(TestWrapper, {});

    const tabs = container.querySelectorAll('.shell-game__mobile-tab');
    expect(tabs.length).toBe(4);
  });

  it('has four mobile tabs: Inbox, Email, Facility, Settings', () => {
    const { container } = render(TestWrapper, {});

    const tabs = container.querySelectorAll('.shell-game__mobile-tab');
    expect(tabs[0]?.textContent).toBe('Inbox');
    expect(tabs[1]?.textContent).toBe('Email');
    expect(tabs[2]?.textContent).toBe('Facility');
    expect(tabs[3]?.textContent).toBe('Settings');
  });

  it('has tablet drawer toggle button', () => {
    const { container } = render(TestWrapper, {});

    const tabletDrawerToggle = container.querySelector('.shell-game__tablet-drawer-toggle');
    expect(tabletDrawerToggle).toBeTruthy();
  });

  it('has desktop drawer toggle for status panel', () => {
    const { container } = render(TestWrapper, {});

    const drawerToggle = container.querySelector('.shell-game__drawer-toggle');
    expect(drawerToggle).toBeTruthy();
  });

  it('has action bar with approve and deny buttons', () => {
    const { container } = render(TestWrapper, {});

    const actionBar = container.querySelector('.shell-game__action-bar');
    expect(actionBar).toBeTruthy();

    const buttons = actionBar?.querySelectorAll('button');
    expect(buttons?.length).toBeGreaterThanOrEqual(4);
  });
});
