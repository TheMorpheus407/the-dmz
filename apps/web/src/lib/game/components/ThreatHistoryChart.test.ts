import { describe, expect, it } from 'vitest';

import ThreatHistoryChart from '$lib/game/components/ThreatHistoryChart.svelte';
import type { ThreatHistoryDay } from '$lib/game/components/threat-monitor';

import { render } from '../../../__tests__/helpers/render';

function createMockHistory(extraDays: ThreatHistoryDay[] = []): ThreatHistoryDay[] {
  const defaults: ThreatHistoryDay[] = [
    { day: 8, label: '8', threatLevel: 'LOW', hasBreach: false },
    { day: 9, label: '9', threatLevel: 'LOW', hasBreach: true },
    { day: 10, label: '10', threatLevel: 'GUARDED', hasBreach: false },
    { day: 11, label: '11', threatLevel: 'GUARDED', hasBreach: false },
    { day: 12, label: '12', threatLevel: 'ELEVATED', hasBreach: false },
    { day: 13, label: '13', threatLevel: 'ELEVATED', hasBreach: false },
    { day: 14, label: '14', threatLevel: 'ELEVATED', hasBreach: false },
  ];
  return [...defaults, ...extraDays];
}

describe('ThreatHistoryChart', () => {
  it('renders history section title', () => {
    const { container } = render(ThreatHistoryChart, {
      props: { history: createMockHistory() },
    });

    expect(container.textContent).toContain('THREAT HISTORY');
    expect(container.textContent).toContain('last 7 days');
  });

  it('renders day labels', () => {
    const { container } = render(ThreatHistoryChart, {
      props: { history: createMockHistory() },
    });

    expect(container.textContent).toContain('8');
    expect(container.textContent).toContain('14');
  });

  it('renders correct number of bars', () => {
    const { container } = render(ThreatHistoryChart, {
      props: { history: createMockHistory() },
    });

    const bars = container.querySelectorAll('.threat-history-chart__bar');
    expect(bars.length).toBe(7);
  });

  it('displays breach markers when hasBreach is true', () => {
    const { container } = render(ThreatHistoryChart, {
      props: { history: createMockHistory() },
    });

    const breachMarkers = container.querySelectorAll('.threat-history-chart__breach-marker');
    expect(breachMarkers.length).toBe(1);
  });

  it('does not display breach markers when hasBreach is false', () => {
    const historyWithoutBreach: ThreatHistoryDay[] = [
      { day: 8, label: '8', threatLevel: 'LOW', hasBreach: false },
      { day: 9, label: '9', threatLevel: 'LOW', hasBreach: false },
    ];

    const { container } = render(ThreatHistoryChart, {
      props: { history: historyWithoutBreach },
    });

    const breachMarkers = container.querySelectorAll('.threat-history-chart__breach-marker');
    expect(breachMarkers.length).toBe(0);
  });

  it('renders legend items', () => {
    const { container } = render(ThreatHistoryChart, {
      props: { history: createMockHistory() },
    });

    expect(container.textContent).toContain('L=Low, G=Guarded, E=Elev., H=High, S=Severe');
    expect(container.textContent).toContain('✕ = breach');
  });

  it('handles null threatLevel', () => {
    const historyWithNull: ThreatHistoryDay[] = [
      { day: 8, label: '8', threatLevel: null, hasBreach: false },
    ];

    const { container } = render(ThreatHistoryChart, {
      props: { history: historyWithNull },
    });

    const bars = container.querySelectorAll('.threat-history-chart__bar');
    expect(bars.length).toBe(1);
  });

  it('has proper ARIA role on chart', () => {
    const { container } = render(ThreatHistoryChart, {
      props: { history: createMockHistory() },
    });

    const chart = container.querySelector('[role="img"]');
    expect(chart).toBeTruthy();
    expect(chart?.getAttribute('aria-label')).toBe('7-day threat history chart');
  });

  it('renders bars for each history entry', () => {
    const { container } = render(ThreatHistoryChart, {
      props: { history: createMockHistory() },
    });

    const barContainers = container.querySelectorAll('.threat-history-chart__bar-container');
    expect(barContainers.length).toBe(7);
  });

  it('handles empty history array', () => {
    const { container } = render(ThreatHistoryChart, {
      props: { history: [] },
    });

    const bars = container.querySelectorAll('.threat-history-chart__bar');
    expect(bars.length).toBe(0);
  });
});
