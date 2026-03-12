import { describe, expect, it, vi } from 'vitest';

import ContextMenu from '$lib/ui/components/ContextMenu.svelte';
import type { ContextMenuState } from '$lib/ui/components/context-menu-types';

import { render } from '../helpers/render';

describe('ContextMenu', () => {
  const createState = (overrides: Partial<ContextMenuState> = {}): ContextMenuState => ({
    isOpen: false,
    position: { x: 0, y: 0 },
    sections: [{ items: [] }],
    ...overrides,
  });

  it('renders nothing when isOpen is false', () => {
    const state = createState({ isOpen: false });
    const { container } = render(ContextMenu, {
      props: { contextState: state },
    });

    const backdrop = container.querySelector('.context-menu-backdrop');
    expect(backdrop).toBeNull();
  });

  it('renders menu when isOpen is true', () => {
    const state = createState({
      isOpen: true,
      position: { x: 100, y: 100 },
      sections: [{ items: [{ id: 'test', label: 'Test Item' }] }],
    });
    const { container } = render(ContextMenu, {
      props: { contextState: state },
    });

    const backdrop = container.querySelector('.context-menu-backdrop');
    const menu = container.querySelector('.context-menu');
    expect(backdrop).toBeTruthy();
    expect(menu).toBeTruthy();
  });

  it('renders menu items', () => {
    const state = createState({
      isOpen: true,
      position: { x: 100, y: 100 },
      sections: [
        {
          items: [
            { id: 'copy', label: 'Copy Selection', shortcut: 'Ctrl+C' },
            { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
          ],
        },
      ],
    });
    const { container } = render(ContextMenu, {
      props: { contextState: state },
    });

    const items = container.querySelectorAll('.context-menu__item');
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toContain('Copy Selection');
    expect(items[1]?.textContent).toContain('Paste');
  });

  it('renders shortcuts', () => {
    const state = createState({
      isOpen: true,
      position: { x: 100, y: 100 },
      sections: [
        {
          items: [{ id: 'copy', label: 'Copy Selection', shortcut: 'Ctrl+C' }],
        },
      ],
    });
    const { container } = render(ContextMenu, {
      props: { contextState: state },
    });

    const shortcut = container.querySelector('.context-menu__item-shortcut');
    expect(shortcut?.textContent).toBe('Ctrl+C');
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const state = createState({
      isOpen: true,
      position: { x: 100, y: 100 },
      sections: [{ items: [{ id: 'test', label: 'Test' }] }],
    });
    const { container } = render(ContextMenu, {
      props: { contextState: state, onClose },
    });

    const backdrop = container.querySelector('.context-menu-backdrop');
    backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSelect when item is clicked', () => {
    const onSelect = vi.fn();
    const state = createState({
      isOpen: true,
      position: { x: 100, y: 100 },
      sections: [
        {
          items: [
            { id: 'copy', label: 'Copy Selection', shortcut: 'Ctrl+C' },
            { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
          ],
        },
      ],
    });
    const { container } = render(ContextMenu, {
      props: { contextState: state, onSelect },
    });

    const items = container.querySelectorAll('.context-menu__item');
    (items[0] as HTMLButtonElement)?.click();

    expect(onSelect).toHaveBeenCalledWith('copy');
  });

  it('does not call onSelect when disabled item is clicked', () => {
    const onSelect = vi.fn();
    const state = createState({
      isOpen: true,
      position: { x: 100, y: 100 },
      sections: [
        {
          items: [{ id: 'copy', label: 'Copy Selection', disabled: true }],
        },
      ],
    });
    const { container } = render(ContextMenu, {
      props: { contextState: state, onSelect },
    });

    const item = container.querySelector('.context-menu__item');
    (item as HTMLButtonElement)?.click();

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('renders dividers after items with dividerAfter', () => {
    const state = createState({
      isOpen: true,
      position: { x: 100, y: 100 },
      sections: [
        {
          items: [
            { id: 'item1', label: 'Item 1', dividerAfter: true },
            { id: 'item2', label: 'Item 2' },
          ],
        },
      ],
    });
    const { container } = render(ContextMenu, {
      props: { contextState: state },
    });

    const divider = container.querySelector('.context-menu__divider');
    expect(divider).toBeTruthy();
  });

  it('renders highlight color indicators', () => {
    const state = createState({
      isOpen: true,
      position: { x: 100, y: 100 },
      sections: [
        {
          items: [
            { id: 'highlight-green', label: 'Highlight Green', color: 'green' },
            { id: 'highlight-amber', label: 'Highlight Amber', color: 'amber' },
            { id: 'highlight-red', label: 'Highlight Red', color: 'red' },
          ],
        },
      ],
    });
    const { container } = render(ContextMenu, {
      props: { contextState: state },
    });

    const greenItem = container.querySelector('.context-menu__item--highlight-green');
    const amberItem = container.querySelector('.context-menu__item--highlight-amber');
    const redItem = container.querySelector('.context-menu__item--highlight-red');

    expect(greenItem).toBeTruthy();
    expect(amberItem).toBeTruthy();
    expect(redItem).toBeTruthy();
  });

  it('positions menu at specified coordinates', () => {
    const state = createState({
      isOpen: true,
      position: { x: 250, y: 150 },
      sections: [{ items: [{ id: 'test', label: 'Test' }] }],
    });
    const { container } = render(ContextMenu, {
      props: { contextState: state },
    });

    const menu = container.querySelector('.context-menu') as HTMLElement;
    expect(menu.style.left).toBe('250px');
    expect(menu.style.top).toBe('150px');
  });

  it('has proper accessibility attributes', () => {
    const state = createState({
      isOpen: true,
      position: { x: 100, y: 100 },
      sections: [{ items: [{ id: 'test', label: 'Test' }] }],
    });
    const { container } = render(ContextMenu, {
      props: { contextState: state },
    });

    const menu = container.querySelector('.context-menu');
    expect(menu?.getAttribute('role')).toBe('menu');
    expect(menu?.getAttribute('aria-label')).toBe('Context menu');

    const item = container.querySelector('.context-menu__item');
    expect(item?.getAttribute('role')).toBe('menuitem');
  });
});
