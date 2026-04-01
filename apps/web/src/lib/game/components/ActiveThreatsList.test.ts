import { describe, expect, it, vi } from 'vitest';

import ActiveThreatsList from '$lib/game/components/ActiveThreatsList.svelte';
import type { ActiveThreat } from '$lib/game/components/threat-monitor';

import { render } from '../../../__tests__/helpers/render';

function createMockThreats(extraThreats: ActiveThreat[] = []): ActiveThreat[] {
  const defaults: ActiveThreat[] = [
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
  ];
  return [...defaults, ...extraThreats];
}

describe('ActiveThreatsList', () => {
  it('renders active threats section title', () => {
    const { container } = render(ActiveThreatsList, {
      props: { threats: createMockThreats() },
    });

    expect(container.textContent).toContain('ACTIVE THREATS');
  });

  it('renders threat names', () => {
    const { container } = render(ActiveThreatsList, {
      props: { threats: createMockThreats() },
    });

    expect(container.textContent).toContain('PHISHING CAMPAIGN');
    expect(container.textContent).toContain('RECON ACTIVITY');
  });

  it('renders threat types', () => {
    const { container } = render(ActiveThreatsList, {
      props: { threats: createMockThreats() },
    });

    expect(container.textContent).toContain('.edu domain spoofing');
    expect(container.textContent).toContain('Port scanning from unknown IPs');
  });

  it('renders empty state when no threats', () => {
    const { container } = render(ActiveThreatsList, {
      props: { threats: [] },
    });

    expect(container.textContent).toContain('No active threats detected');
  });

  it('expands threat details on click', async () => {
    const { container } = render(ActiveThreatsList, {
      props: { threats: createMockThreats() },
    });

    const threatHeader = container.querySelector(
      '.active-threats-list__threat-header',
    ) as HTMLButtonElement | null;
    expect(threatHeader).toBeTruthy();

    if (threatHeader) {
      threatHeader.click();
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const details = container.querySelector('.active-threats-list__threat-details');
    expect(details).toBeTruthy();
  });

  it('calls onViewThreatDetails when clicking view details', async () => {
    const onViewThreatDetails = vi.fn();
    const { container } = render(ActiveThreatsList, {
      props: {
        threats: createMockThreats(),
        onViewThreatDetails,
      },
    });

    const threatHeader = container.querySelector(
      '.active-threats-list__threat-header',
    ) as HTMLButtonElement | null;
    if (threatHeader) {
      threatHeader.click();
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const details = container.querySelector('.active-threats-list__threat-details');
    expect(details).toBeTruthy();

    const viewDetailsBtn = details?.querySelector('button');
    if (viewDetailsBtn) {
      viewDetailsBtn.click();
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onViewThreatDetails).toHaveBeenCalledWith('threat-1');
  });

  it('displays threat status badges', async () => {
    const { container } = render(ActiveThreatsList, {
      props: { threats: createMockThreats() },
    });

    const threatHeaders = container.querySelectorAll(
      '.active-threats-list__threat-header',
    ) as NodeListOf<HTMLButtonElement>;
    expect(threatHeaders.length).toBe(2);

    threatHeaders[0]?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const details = container.querySelector('.active-threats-list__threat-details');
    expect(details?.textContent).toContain('ACTIVE');

    threatHeaders[1]?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const allDetails = container.querySelectorAll('.active-threats-list__threat-details');
    expect(allDetails[1]?.textContent).toContain('MONITORING');
  });

  it('shows focused style when focusedIndex matches', () => {
    const { container } = render(ActiveThreatsList, {
      props: {
        threats: createMockThreats(),
        focusedIndex: 0,
      },
    });

    const focusedItem = container.querySelector('.active-threats-list__threat-item--focused');
    expect(focusedItem).toBeTruthy();
  });

  it('displays threat metrics when expanded', async () => {
    const { container } = render(ActiveThreatsList, {
      props: { threats: createMockThreats() },
    });

    const threatHeader = container.querySelector(
      '.active-threats-list__threat-header',
    ) as HTMLButtonElement | null;
    if (threatHeader) {
      threatHeader.click();
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const details = container.querySelector('.active-threats-list__threat-details');
    expect(details?.textContent).toContain('Emails intercepted: 3');
    expect(details?.textContent).toContain('Emails missed: 0');
  });

  it('renders multiple threats independently', async () => {
    const { container } = render(ActiveThreatsList, {
      props: { threats: createMockThreats() },
    });

    const threatHeaders = container.querySelectorAll(
      '.active-threats-list__threat-header',
    ) as NodeListOf<HTMLButtonElement>;

    threatHeaders[0]?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const details0 = container.querySelector('.active-threats-list__threat-details');
    expect(details0).toBeTruthy();

    threatHeaders[1]?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const allDetails = container.querySelectorAll('.active-threats-list__threat-details');
    expect(allDetails.length).toBe(2);
  });

  it('displays detected day in details', async () => {
    const { container } = render(ActiveThreatsList, {
      props: { threats: createMockThreats() },
    });

    const threatHeader = container.querySelector(
      '.active-threats-list__threat-header',
    ) as HTMLButtonElement | null;
    if (threatHeader) {
      threatHeader.click();
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const details = container.querySelector('.active-threats-list__threat-details');
    expect(details?.textContent).toContain('Detected: Day 13');
  });
});
