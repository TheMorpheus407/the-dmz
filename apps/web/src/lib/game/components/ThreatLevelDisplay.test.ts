import { describe, expect, it } from 'vitest';

import ThreatLevelDisplay from '$lib/game/components/ThreatLevelDisplay.svelte';

import { render } from '../../../__tests__/helpers/render';

describe('ThreatLevelDisplay', () => {
  it('renders threat level section title', () => {
    const { container } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'ELEVATED',
        threatLevelSince: '14:00 CEST',
        threatLevelSinceDay: 12,
      },
    });

    expect(container.textContent).toContain('CURRENT THREAT LEVEL');
  });

  it('displays threat level label', () => {
    const { container } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'ELEVATED',
        threatLevelSince: '14:00 CEST',
        threatLevelSinceDay: 12,
      },
    });

    expect(container.textContent).toContain('ELEVATED');
    expect(container.textContent).toContain('3/5');
  });

  it('displays numeric threat level for different tiers', () => {
    const { container: lowContainer } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'LOW',
        threatLevelSince: '10:00 CEST',
        threatLevelSinceDay: 1,
      },
    });
    expect(lowContainer.textContent).toContain('LOW');
    expect(lowContainer.textContent).toContain('1/5');

    const { container: highContainer } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'HIGH',
        threatLevelSince: '08:00 CEST',
        threatLevelSinceDay: 5,
      },
    });
    expect(highContainer.textContent).toContain('HIGH');
    expect(highContainer.textContent).toContain('4/5');
  });

  it('displays shield icon and state for ELEVATED', () => {
    const { container } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'ELEVATED',
        threatLevelSince: '14:00 CEST',
        threatLevelSinceDay: 12,
      },
    });

    expect(container.textContent).toContain('Shield: DAMAGED');
  });

  it('displays shield state PRISTINE for LOW', () => {
    const { container } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'LOW',
        threatLevelSince: '10:00 CEST',
        threatLevelSinceDay: 1,
      },
    });

    expect(container.textContent).toContain('Shield: PRISTINE');
  });

  it('displays shield state BROKEN for SEVERE', () => {
    const { container } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'SEVERE',
        threatLevelSince: '20:00 CEST',
        threatLevelSinceDay: 15,
      },
    });

    expect(container.textContent).toContain('Shield: BROKEN');
  });

  it('has severe animation class for SEVERE level', () => {
    const { container } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'SEVERE',
        threatLevelSince: '20:00 CEST',
        threatLevelSinceDay: 15,
      },
    });

    const shieldIcon = container.querySelector('.threat-level-display__shield-icon--severe');
    expect(shieldIcon).toBeTruthy();
  });

  it('displays since timestamp', () => {
    const { container } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'ELEVATED',
        threatLevelSince: '14:00 CEST',
        threatLevelSinceDay: 12,
      },
    });

    expect(container.textContent).toContain('Since: Day 12, 14:00 CEST');
  });

  it('renders five level segments', () => {
    const { container } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'HIGH',
        threatLevelSince: '08:00 CEST',
        threatLevelSinceDay: 5,
      },
    });

    const segments = container.querySelectorAll('.threat-level-display__level-segment');
    expect(segments.length).toBe(5);
  });

  it('renders filled segments based on threat level', () => {
    const { container } = render(ThreatLevelDisplay, {
      props: {
        threatLevel: 'GUARDED',
        threatLevelSince: '10:00 CEST',
        threatLevelSinceDay: 3,
      },
    });

    const filledSegments = container.querySelectorAll(
      '.threat-level-display__level-segment--filled',
    );
    expect(filledSegments.length).toBe(2);
  });
});
