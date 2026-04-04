import { describe, expect, it } from 'vitest';

import ThreatIndicator from '$lib/game/components/ThreatIndicator.svelte';

import { render } from '../../../__tests__/helpers/render';

type ThreatLevel = 1 | 2 | 3 | 4 | 5;

describe('ThreatIndicator', () => {
  it('renders level 1 with MINIMAL label', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 1 },
    });

    expect(container.textContent).toContain('MINIMAL');
    expect(container.querySelector('.threat-indicator--1')).toBeTruthy();
  });

  it('renders level 2 with LOW label', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 2 },
    });

    expect(container.textContent).toContain('LOW');
  });

  it('renders level 3 with ELEVATED label', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 3 },
    });

    expect(container.textContent).toContain('ELEVATED');
  });

  it('renders level 4 with HIGH label', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 4 },
    });

    expect(container.textContent).toContain('HIGH');
  });

  it('renders level 5 with SEVERE label', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 5 },
    });

    expect(container.textContent).toContain('SEVERE');
  });

  it('applies correct color class for each level', () => {
    for (let level: ThreatLevel = 1; level <= 5; level++) {
      const { container } = render(ThreatIndicator, {
        props: { level: level as ThreatLevel },
      });

      const fill = container.querySelector('.threat-indicator__fill');
      const dot = container.querySelector('.threat-indicator__dot');
      const badge = container.querySelector('.threat-indicator__badge');

      const hasColorClass =
        fill?.classList.contains(`threat-indicator--${level}`) ||
        dot?.classList.contains(`threat-indicator--${level}`) ||
        badge?.classList.contains(`threat-indicator--${level}`);

      expect(hasColorClass).toBe(true);
    }
  });

  it('renders full variant by default', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 1 },
    });

    expect(container.querySelector('.threat-indicator--full')).toBeTruthy();
    expect(container.querySelector('.threat-indicator__bar')).toBeTruthy();
  });

  it('renders compact variant', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 1, variant: 'compact' },
    });

    expect(container.querySelector('.threat-indicator--compact')).toBeTruthy();
    expect(container.querySelector('.threat-indicator__dot')).toBeTruthy();
  });

  it('renders badge variant', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 1, variant: 'badge' },
    });

    expect(container.querySelector('.threat-indicator--badge')).toBeTruthy();
    expect(container.querySelector('.threat-indicator__badge')).toBeTruthy();
  });

  it('hides label when showLabel is false', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 1, showLabel: false },
    });

    expect(container.textContent).not.toContain('MINIMAL');
  });

  it('shows label when showLabel is true (default)', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 1, showLabel: true },
    });

    expect(container.textContent).toContain('MINIMAL');
  });

  it('applies animation class to SEVERE level by default', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 5 },
    });

    const indicator = container.querySelector('.threat-indicator');
    expect(indicator?.classList.contains('threat-indicator--severe')).toBe(true);
    expect(indicator?.classList.contains('threat-indicator--animated')).toBe(true);
  });

  it('disables animation when animated is false', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 5, animated: false },
    });

    const indicator = container.querySelector('.threat-indicator');
    expect(indicator?.classList.contains('threat-indicator--animated')).toBe(false);
  });

  it('adds no-animation class to fill when animated is false', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 3, animated: false },
    });

    const fill = container.querySelector('.threat-indicator__fill');
    expect(fill?.classList.contains('threat-indicator__fill--no-animation')).toBe(true);
  });

  it('has correct bar width percentage for each level', () => {
    const levels: ThreatLevel[] = [1, 2, 3, 4, 5];
    const expectedWidths = ['20%', '40%', '60%', '80%', '100%'];

    levels.forEach((level, index) => {
      const { container } = render(ThreatIndicator, {
        props: { level, variant: 'full' },
      });

      const fill = container.querySelector('.threat-indicator__fill');
      expect(fill?.getAttribute('style')).toContain(`width: ${expectedWidths[index]}`);
    });
  });

  it('renders icon for each level', () => {
    for (let level: ThreatLevel = 1; level <= 5; level++) {
      const { container } = render(ThreatIndicator, {
        props: { level: level as ThreatLevel },
      });

      expect(container.querySelector('.threat-indicator__icon')).toBeTruthy();
    }
  });

  it('has proper ARIA attributes', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 3 },
    });

    const indicator = container.querySelector('.threat-indicator');
    expect(indicator?.getAttribute('role')).toBe('status');
    expect(indicator?.getAttribute('aria-label')).toBe('Threat level ELEVATED');
  });

  it('compact variant does not render bar', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 1, variant: 'compact' },
    });

    expect(container.querySelector('.threat-indicator__bar')).toBeFalsy();
  });

  it('badge variant does not render bar', () => {
    const { container } = render(ThreatIndicator, {
      props: { level: 1, variant: 'badge' },
    });

    expect(container.querySelector('.threat-indicator__bar')).toBeFalsy();
  });
});
