import { describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/svelte';

import SecurityToolsGrid from '$lib/game/components/SecurityToolsGrid.svelte';
import type { SecurityTool } from '$lib/game/components/threat-monitor';

import { render } from '../../../__tests__/helpers/render';

function createMockTools(extraTools: SecurityTool[] = []): SecurityTool[] {
  const defaults: SecurityTool[] = [
    {
      id: 'firewall-1',
      name: 'Firewall',
      status: 'ACTIVE',
      icon: '🛡',
      dailyMetrics: {
        blockingCount: 142,
      },
    },
    {
      id: 'ids-1',
      name: 'IDS',
      status: 'ACTIVE',
      icon: '◉',
      dailyMetrics: {
        alerts: 7,
      },
    },
    {
      id: 'email-filter-1',
      name: 'Email Filter',
      status: 'ACTIVE',
      icon: '✉',
      dailyMetrics: {
        flagged: 4,
      },
    },
    {
      id: 'siem-1',
      name: 'SIEM',
      status: 'NOT_INSTALLED',
      icon: '⬡',
      dailyMetrics: {},
      cost: 3000,
    },
    {
      id: 'waf-1',
      name: 'WAF',
      status: 'NOT_INSTALLED',
      icon: '🛡',
      dailyMetrics: {},
      cost: 2500,
    },
  ];
  return [...defaults, ...extraTools];
}

describe('SecurityToolsGrid', () => {
  it('renders security tools section title', () => {
    const { container } = render(SecurityToolsGrid, {
      props: { tools: createMockTools() },
    });

    expect(container.textContent).toContain('SECURITY TOOL STATUS');
  });

  it('renders tool names', () => {
    const { container } = render(SecurityToolsGrid, {
      props: { tools: createMockTools() },
    });

    expect(container.textContent).toContain('Firewall');
    expect(container.textContent).toContain('IDS');
    expect(container.textContent).toContain('Email Filter');
  });

  it('renders tool icons', () => {
    const { container } = render(SecurityToolsGrid, {
      props: { tools: createMockTools() },
    });

    expect(container.textContent).toContain('🛡');
    expect(container.textContent).toContain('◉');
    expect(container.textContent).toContain('✉');
  });

  it('shows NOT_INSTALLED status for missing tools', () => {
    const { container } = render(SecurityToolsGrid, {
      props: { tools: createMockTools() },
    });

    expect(container.textContent).toContain('NOT_INSTALLED');
    expect(container.textContent).toContain('SIEM');
    expect(container.textContent).toContain('WAF');
  });

  it('calls onPurchaseTool when clicking buy button', async () => {
    const onPurchaseTool = vi.fn();
    const { container } = render(SecurityToolsGrid, {
      props: {
        tools: createMockTools(),
        onPurchaseTool,
      },
    });

    const buyButtons = container.querySelectorAll('button');
    const buyButton = Array.from(buyButtons).find((btn) => btn.textContent?.includes('BUY:'));

    if (buyButton) {
      buyButton.click();
    }

    await act();

    expect(onPurchaseTool).toHaveBeenCalledWith('siem-1');
  });

  it('displays blocking metrics for active firewall', () => {
    const { container } = render(SecurityToolsGrid, {
      props: { tools: createMockTools() },
    });

    expect(container.textContent).toContain('Blocking: 142 today');
  });

  it('displays alerts metrics for active IDS', () => {
    const { container } = render(SecurityToolsGrid, {
      props: { tools: createMockTools() },
    });

    expect(container.textContent).toContain('Alerts: 7 today');
  });

  it('displays flagged metrics for active email filter', () => {
    const { container } = render(SecurityToolsGrid, {
      props: { tools: createMockTools() },
    });

    expect(container.textContent).toContain('Flagged: 4 today');
  });

  it('shows focused style when focusedToolIndex matches', () => {
    const { container } = render(SecurityToolsGrid, {
      props: {
        tools: createMockTools(),
        focusedToolIndex: 0,
      },
    });

    const focusedItem = container.querySelector('.security-tools-grid__tool-item--focused');
    expect(focusedItem).toBeTruthy();
  });

  it('does not show focused style for negative index', () => {
    const { container } = render(SecurityToolsGrid, {
      props: {
        tools: createMockTools(),
        focusedToolIndex: -1,
      },
    });

    const focusedItem = container.querySelector('.security-tools-grid__tool-item--focused');
    expect(focusedItem).toBeNull();
  });

  it('renders buy buttons with correct cost formatting', () => {
    const { container } = render(SecurityToolsGrid, {
      props: { tools: createMockTools() },
    });

    expect(container.textContent).toContain('BUY: 3,000 CR');
    expect(container.textContent).toContain('BUY: 2,500 CR');
  });

  it('renders correct number of tool items', () => {
    const { container } = render(SecurityToolsGrid, {
      props: { tools: createMockTools() },
    });

    const toolItems = container.querySelectorAll('.security-tools-grid__tool-item');
    expect(toolItems.length).toBe(5);
  });

  it('handles empty tools array', () => {
    const { container } = render(SecurityToolsGrid, {
      props: { tools: [] },
    });

    const toolItems = container.querySelectorAll('.security-tools-grid__tool-item');
    expect(toolItems.length).toBe(0);
  });
});
