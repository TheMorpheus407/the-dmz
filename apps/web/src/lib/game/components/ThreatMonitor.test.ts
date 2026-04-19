import { describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/svelte';

import ThreatMonitor from '$lib/game/components/ThreatMonitor.svelte';
import type { ThreatMonitorData } from '$lib/game/components/threat-monitor';

import { render } from '../../../__tests__/helpers/render';

const createMockData = (overrides: Partial<ThreatMonitorData> = {}): ThreatMonitorData => ({
  currentThreatLevel: 'ELEVATED',
  threatLevelSince: '14:00 CEST',
  threatLevelSinceDay: 12,
  activeThreats: [
    {
      id: 'threat-1',
      name: 'PHISHING CAMPAIGN',
      type: '.edu domain spoofing',
      description: 'Phishing emails targeting employees with spoofed .edu domains.',
      detectedAt: '2024-01-14T10:00:00Z',
      detectedDay: 13,
      status: 'ACTIVE',
      metrics: {
        intercepted: 3,
        missed: 0,
      },
    },
    {
      id: 'threat-2',
      name: 'RECON ACTIVITY',
      type: 'Port scanning from unknown IPs',
      description: 'Ongoing reconnaissance activity from multiple unknown IP addresses.',
      detectedAt: '2024-01-14T08:00:00Z',
      detectedDay: 14,
      status: 'MONITORING',
      metrics: {
        blocked: 47,
        alerts: 2,
      },
    },
  ],
  securityTools: [
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
  ],
  threatHistory: [
    { day: 8, label: '8', threatLevel: 'LOW', hasBreach: false },
    { day: 9, label: '9', threatLevel: 'LOW', hasBreach: true },
    { day: 10, label: '10', threatLevel: 'GUARDED', hasBreach: false },
    { day: 11, label: '11', threatLevel: 'GUARDED', hasBreach: false },
    { day: 12, label: '12', threatLevel: 'ELEVATED', hasBreach: false },
    { day: 13, label: '13', threatLevel: 'ELEVATED', hasBreach: false },
    { day: 14, label: '14', threatLevel: 'ELEVATED', hasBreach: false },
  ],
  ...overrides,
});

describe('ThreatMonitor', () => {
  it('renders threat monitor title', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('THREAT MONITOR');
  });

  it('renders current threat level section', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('CURRENT THREAT LEVEL');
    expect(container.textContent).toContain('ELEVATED');
  });

  it('displays threat level with numeric value', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData({ currentThreatLevel: 'HIGH' }) },
    });

    expect(container.textContent).toContain('HIGH');
    expect(container.textContent).toContain('4/5');
  });

  it('renders shield icon and state', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData({ currentThreatLevel: 'ELEVATED' }) },
    });

    expect(container.textContent).toContain('Shield: DAMAGED');
  });

  it('renders since timestamp', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('Since: Day 12, 14:00 CEST');
  });

  it('renders active threats section', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('ACTIVE THREATS');
    expect(container.textContent).toContain('PHISHING CAMPAIGN');
    expect(container.textContent).toContain('RECON ACTIVITY');
  });

  it('renders threat status badges', async () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    const threatHeaders = container.querySelectorAll(
      '.threat-monitor__threat-header',
    ) as NodeListOf<HTMLButtonElement>;
    expect(threatHeaders.length).toBe(2);

    threatHeaders[0]?.click();
    await act();

    const details = container.querySelector('.threat-monitor__threat-details');
    expect(details?.textContent).toContain('ACTIVE');

    threatHeaders[1]?.click();
    await act();

    const allDetails = container.querySelectorAll('.threat-monitor__threat-details');
    expect(allDetails[1]?.textContent).toContain('MONITORING');
  });

  it('expands threat details on click', async () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    const threatHeader = container.querySelector(
      '.threat-monitor__threat-header',
    ) as HTMLButtonElement | null;
    expect(threatHeader).toBeTruthy();

    if (threatHeader) {
      threatHeader.click();
    }

    await act();

    const details = container.querySelector('.threat-monitor__threat-details');
    expect(details).toBeTruthy();
  });

  it('renders security tools section', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('SECURITY TOOL STATUS');
    expect(container.textContent).toContain('Firewall');
    expect(container.textContent).toContain('IDS');
    expect(container.textContent).toContain('Email Filter');
  });

  it('shows NOT INSTALLED status for missing tools', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('NOT_INSTALLED');
    expect(container.textContent).toContain('SIEM');
    expect(container.textContent).toContain('WAF');
  });

  it('renders threat history section', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    expect(container.textContent).toContain('THREAT HISTORY');
    expect(container.textContent).toContain('last 7 days');
  });

  it('displays breach markers in history', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    const breachMarkers = container.querySelectorAll('.threat-monitor__breach-marker');
    expect(breachMarkers.length).toBe(1);
  });

  it('renders empty state when no active threats', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData({ activeThreats: [] }) },
    });

    expect(container.textContent).toContain('No active threats detected');
  });

  it('handles LOW threat level correctly', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData({ currentThreatLevel: 'LOW' }) },
    });

    expect(container.textContent).toContain('LOW');
    expect(container.textContent).toContain('Shield: PRISTINE');
  });

  it('handles SEVERE threat level correctly', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData({ currentThreatLevel: 'SEVERE' }) },
    });

    expect(container.textContent).toContain('SEVERE');
    expect(container.textContent).toContain('Shield: BROKEN');

    const severeIcon = container.querySelector('.threat-monitor__shield-icon--severe');
    expect(severeIcon).toBeTruthy();
  });

  it('has proper ARIA attributes', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    const region = container.querySelector('[role="application"]');
    expect(region).toBeTruthy();
    expect(region?.getAttribute('aria-label')).toBe('Threat Monitor');
  });

  it('calls onViewThreatDetails when clicking view details', async () => {
    const onViewThreatDetails = vi.fn();
    const { container } = render(ThreatMonitor, {
      props: {
        data: createMockData(),
        onViewThreatDetails,
      },
    });

    const threatHeader = container.querySelector(
      '.threat-monitor__threat-header',
    ) as HTMLButtonElement | null;
    if (threatHeader) {
      threatHeader.click();
    }

    await act();

    const details = container.querySelector('.threat-monitor__threat-details');
    expect(details).toBeTruthy();

    const viewDetailsBtn = details?.querySelector('button');
    if (viewDetailsBtn) {
      viewDetailsBtn.click();
    }

    await act();

    expect(onViewThreatDetails).toHaveBeenCalledWith('threat-1');
  });

  it('calls onPurchaseTool when clicking buy button', async () => {
    const onPurchaseTool = vi.fn();
    const { container } = render(ThreatMonitor, {
      props: {
        data: createMockData(),
        onPurchaseTool,
      },
    });

    const buyButtons = container.querySelectorAll('button');
    const buyButton = Array.from(buyButtons).find((btn) => btn.textContent?.includes('BUY:'));

    if (buyButton) {
      buyButton.click();
    }

    await act();

    expect(onPurchaseTool).toHaveBeenCalled();
  });

  it('is keyboard navigable', () => {
    const { container } = render(ThreatMonitor, {
      props: { data: createMockData() },
    });

    const region = container.querySelector('.threat-monitor');
    expect(region?.getAttribute('tabindex')).toBe('0');
  });
});
