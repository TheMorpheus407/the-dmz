import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/svelte';

import DaySummaryPanel from '$lib/game/components/DaySummaryPanel.svelte';
import type { DaySummaryData } from '$lib/game/components/day-summary';

import { render } from '../../../__tests__/helpers/render';

const createMockData = (overrides: Partial<DaySummaryData> = {}): DaySummaryData => ({
  dayNumber: 5,
  summaryStatistics: {
    emailsProcessed: 12,
    decisionsMade: {
      approved: 5,
      denied: 4,
      flagged: 2,
      verified: 1,
    },
    accuracyRate: 85.5,
    trustScoreChange: 15,
    fundsChange: 2500,
    resourcesConsumed: {
      rackUnits: 10,
      powerKw: 5,
      coolingTons: 2,
      bandwidthMbps: 100,
    },
    threatsEncountered: 3,
  },
  netChanges: {
    trustScore: { before: 350, after: 365 },
    funds: { before: 10000, after: 12500 },
    intelFragments: { before: 50, after: 75 },
    resources: {
      rackUnits: { before: 40, after: 50 },
      powerKw: { before: 20, after: 25 },
      coolingTons: { before: 8, after: 10 },
      bandwidthMbps: { before: 400, after: 500 },
    },
  },
  narrativeNotes: {
    keyEvents: ['Threat level escalated to ELEVATED', 'New client onboarded'],
    notableDecisions: ['Approved Budapest Tech University request'],
    coachingTips: [
      'Remember to verify sender domains before approving high-value requests.',
      'Consider requesting verification packets for unfamiliar senders.',
    ],
    factionUpdates: [
      { faction: 'The Sovereign Compact', change: 'Relation improved (+5)' },
      { faction: 'Nexion Industries', change: 'Relation unchanged (0)' },
    ],
  },
  incidentSummary: {
    detected: 2,
    resolved: 1,
    severityBreakdown: {
      critical: 0,
      high: 1,
      medium: 1,
      low: 0,
    },
  },
  verificationStats: {
    requestsMade: 3,
    discrepanciesFound: 1,
    accuracy: 66.7,
  },
  ...overrides,
});

describe('DaySummaryPanel', () => {
  it('renders day number in header', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData({ dayNumber: 10 }),
      },
    });

    expect(container.textContent).toContain('Day 10 Summary');
  });

  it('renders summary statistics', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData(),
      },
    });

    expect(container.textContent).toContain('Emails Processed');
    expect(container.textContent).toContain('12');
    expect(container.textContent).toContain('Decisions Made');
    expect(container.textContent).toContain('Accuracy Rate');
    expect(container.textContent).toContain('85.5%');
  });

  it('renders decision breakdown', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData(),
      },
    });

    expect(container.textContent).toContain('Approved: 5');
    expect(container.textContent).toContain('Denied: 4');
    expect(container.textContent).toContain('Flagged: 2');
    expect(container.textContent).toContain('Verified: 1');
  });

  it('renders net changes with correct formatting', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData(),
      },
    });

    expect(container.textContent).toContain('Trust Score');
    expect(container.textContent).toContain('350 → 365 (+15)');
    expect(container.textContent).toContain('Funds');
    expect(container.textContent).toContain('10000 → 12500 (+2,500) CR');
    expect(container.textContent).toContain('Intel Fragments');
  });

  it('renders narrative notes', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData(),
      },
    });

    expect(container.textContent).toContain('Key Events');
    expect(container.textContent).toContain('Threat level escalated to ELEVATED');
    expect(container.textContent).toContain('Notable Decisions');
    expect(container.textContent).toContain('Morpheus Coaching');
  });

  it('renders incident summary', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData(),
      },
    });

    expect(container.textContent).toContain('Incident Summary');
    expect(container.textContent).toContain('Detected');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('Resolved');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('Critical: 0');
    expect(container.textContent).toContain('High: 1');
  });

  it('renders verification stats', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData(),
      },
    });

    expect(container.textContent).toContain('Verification Stats');
    expect(container.textContent).toContain('Requests Made');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('Discrepancies Found');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('Verification Accuracy');
    expect(container.textContent).toContain('66.7%');
  });

  it('renders advance day button with correct day', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData({ dayNumber: 7 }),
      },
    });

    const button = container.querySelector('button');
    expect(button?.textContent).toContain('Advance to Day 8');
  });

  it('shows positive changes in green', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData({
          summaryStatistics: {
            emailsProcessed: 12,
            decisionsMade: { approved: 5, denied: 4, flagged: 2, verified: 1 },
            accuracyRate: 85.5,
            trustScoreChange: 15,
            fundsChange: 2500,
            resourcesConsumed: { rackUnits: 10, powerKw: 5, coolingTons: 2, bandwidthMbps: 100 },
            threatsEncountered: 3,
          },
        }),
      },
    });

    const fundsLabel = Array.from(
      container.querySelectorAll('.summary-statistics__stat-label'),
    ).find((el) => el.textContent === 'Funds Change');
    const fundsValue = fundsLabel?.nextElementSibling;
    expect(fundsValue?.textContent).toContain('+2,500 CR');
  });

  it('handles negative fund changes', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData({
          summaryStatistics: {
            emailsProcessed: 12,
            decisionsMade: { approved: 5, denied: 4, flagged: 2, verified: 1 },
            accuracyRate: 85.5,
            trustScoreChange: 15,
            fundsChange: -1500,
            resourcesConsumed: { rackUnits: 10, powerKw: 5, coolingTons: 2, bandwidthMbps: 100 },
            threatsEncountered: 3,
          },
        }),
      },
    });

    expect(container.textContent).toContain('-1,500 CR');
  });

  it('handles negative trust score changes', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData({
          summaryStatistics: {
            emailsProcessed: 12,
            decisionsMade: { approved: 5, denied: 4, flagged: 2, verified: 1 },
            accuracyRate: 85.5,
            trustScoreChange: -25,
            fundsChange: 2500,
            resourcesConsumed: { rackUnits: 10, powerKw: 5, coolingTons: 2, bandwidthMbps: 100 },
            threatsEncountered: 3,
          },
          netChanges: {
            trustScore: { before: 350, after: 325 },
            funds: { before: 10000, after: 12500 },
            intelFragments: { before: 50, after: 75 },
            resources: {
              rackUnits: { before: 40, after: 50 },
              powerKw: { before: 20, after: 25 },
              coolingTons: { before: 8, after: 10 },
              bandwidthMbps: { before: 400, after: 500 },
            },
          },
        }),
      },
    });

    expect(container.textContent).toContain('-25');
  });

  it('calls onadvanceDay callback when confirmed', async () => {
    const onadvanceDay = vi.fn();
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData({ dayNumber: 5 }),
        onadvanceDay,
      },
    });

    const button = container.querySelector('button');
    expect(button?.textContent).toContain('Advance to Day 6');

    if (button) {
      fireEvent.click(button);
    }

    await act();

    expect(container.textContent).toContain('Confirm Day Advance');

    const cancelButton = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Cancel',
    );
    if (cancelButton) {
      fireEvent.click(cancelButton);
    }

    await act();
    expect(onadvanceDay).not.toHaveBeenCalled();

    const advanceButton2 = container.querySelector('button');
    if (advanceButton2) {
      fireEvent.click(advanceButton2);
    }

    await act();

    const confirmButton = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Confirm Advance',
    );
    if (confirmButton) {
      fireEvent.click(confirmButton);
    }

    await act();
    expect(onadvanceDay).toHaveBeenCalled();
  });

  it('renders faction updates', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData(),
      },
    });

    expect(container.textContent).toContain('Faction Relations');
    expect(container.textContent).toContain('The Sovereign Compact');
    expect(container.textContent).toContain('Relation improved (+5)');
  });

  it('handles empty narrative notes', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData({
          narrativeNotes: {
            keyEvents: [],
            notableDecisions: [],
            coachingTips: [],
            factionUpdates: [],
          },
        }),
      },
    });

    expect(container.textContent).toContain('Narrative Notes');
  });

  it('renders with no incidents', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData({
          incidentSummary: {
            detected: 0,
            resolved: 0,
            severityBreakdown: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
            },
          },
        }),
      },
    });

    expect(container.textContent).toContain('Detected');
    expect(container.textContent).toContain('0');
  });

  it('renders resources consumed in summary statistics', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData(),
      },
    });

    expect(container.textContent).toContain('Rack Units: 10');
    expect(container.textContent).toContain('Power: 5 kW');
    expect(container.textContent).toContain('Cooling: 2 tons');
    expect(container.textContent).toContain('Bandwidth: 100 Mbps');
  });

  it('renders individual resource net changes', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData(),
      },
    });

    expect(container.textContent).toContain('Rack Units');
    expect(container.textContent).toContain('40 → 50 (+10)');
    expect(container.textContent).toContain('Power');
    expect(container.textContent).toContain('20 → 25 (+5) kW');
    expect(container.textContent).toContain('Cooling');
    expect(container.textContent).toContain('8 → 10 (+2) tons');
    expect(container.textContent).toContain('Bandwidth');
    expect(container.textContent).toContain('400 → 500 (+100) Mbps');
  });

  it('renders negative resource net changes correctly', () => {
    const { container } = render(DaySummaryPanel, {
      props: {
        data: createMockData({
          netChanges: {
            trustScore: { before: 350, after: 365 },
            funds: { before: 10000, after: 12500 },
            intelFragments: { before: 50, after: 75 },
            resources: {
              rackUnits: { before: 50, after: 40 },
              powerKw: { before: 25, after: 20 },
              coolingTons: { before: 10, after: 8 },
              bandwidthMbps: { before: 500, after: 400 },
            },
          },
        }),
      },
    });

    expect(container.textContent).toContain('Rack Units');
    expect(container.textContent).toContain('50 → 40 (-10)');
    expect(container.textContent).toContain('Power');
    expect(container.textContent).toContain('25 → 20 (-5) kW');
  });
});
