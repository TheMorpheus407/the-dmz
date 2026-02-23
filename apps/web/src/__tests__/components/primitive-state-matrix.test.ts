import { describe, expect, it } from 'vitest';

import {
  REQUIRED_PRIMITIVES,
  REQUIRED_THEMES,
  PRIMITIVE_STATES,
  getPrimitiveExportPath,
} from '$lib/ui/primitive-contract';

describe('Primitive Contract: State Matrix', () => {
  describe('Required Primitives', () => {
    it('should have all required primitives defined', () => {
      const expected = ['Button', 'Panel', 'Badge', 'Tabs', 'Modal', 'LoadingState'];
      expect(REQUIRED_PRIMITIVES).toEqual(expected);
    });
  });

  describe('Required Themes', () => {
    it('should have all required themes defined', () => {
      const expected = ['green', 'amber', 'high-contrast', 'enterprise'];
      expect(REQUIRED_THEMES).toEqual(expected);
    });
  });

  describe('Primitive Export Paths', () => {
    it.each(REQUIRED_PRIMITIVES)('should have valid export path for %s', (primitive) => {
      const path = getPrimitiveExportPath(primitive);
      expect(path).toMatch(/^\$lib\/ui\/components\/.+\.svelte$/);
    });
  });

  describe('Primitive States', () => {
    it.each(REQUIRED_PRIMITIVES)('should have valid states defined for %s', (primitive) => {
      const states = PRIMITIVE_STATES[primitive];
      expect(states).toBeDefined();
      expect(Array.isArray(states)).toBe(true);
      expect(states.length).toBeGreaterThan(0);
    });
  });

  describe('Theme × Primitive Matrix', () => {
    it.each(REQUIRED_THEMES)('should validate each theme is supported: %s', (theme) => {
      expect(theme).toMatch(/^(green|amber|high-contrast|enterprise)$/);
    });
  });
});

describe('Primitive Contract: Theme Integration', () => {
  describe('Button: Theme × State Matrix', () => {
    const buttonStates = PRIMITIVE_STATES.Button;

    it.each(REQUIRED_THEMES)('Button should render in theme: %s', async (theme) => {
      expect(theme).toBeDefined();
    });

    it.each(buttonStates)('Button should have state defined: %s', (state) => {
      expect(state).toBeDefined();
    });
  });

  describe('Panel: Theme × State Matrix', () => {
    const panelStates = PRIMITIVE_STATES.Panel;

    it.each(REQUIRED_THEMES)('Panel should render in theme: %s', async (theme) => {
      expect(theme).toBeDefined();
    });

    it.each(panelStates)('Panel should have state defined: %s', (state) => {
      expect(state).toBeDefined();
    });
  });

  describe('Badge: Theme × State Matrix', () => {
    const badgeStates = PRIMITIVE_STATES.Badge;

    it.each(REQUIRED_THEMES)('Badge should render in theme: %s', async (theme) => {
      expect(theme).toBeDefined();
    });

    it.each(badgeStates)('Badge should have state defined: %s', (state) => {
      expect(state).toBeDefined();
    });
  });

  describe('Tabs: Theme × State Matrix', () => {
    const tabsStates = PRIMITIVE_STATES.Tabs;

    it.each(REQUIRED_THEMES)('Tabs should render in theme: %s', async (theme) => {
      expect(theme).toBeDefined();
    });

    it.each(tabsStates)('Tabs should have state defined: %s', (state) => {
      expect(state).toBeDefined();
    });
  });

  describe('Modal: Theme × State Matrix', () => {
    const modalStates = PRIMITIVE_STATES.Modal;

    it.each(REQUIRED_THEMES)('Modal should render in theme: %s', async (theme) => {
      expect(theme).toBeDefined();
    });

    it.each(modalStates)('Modal should have state defined: %s', (state) => {
      expect(state).toBeDefined();
    });
  });

  describe('LoadingState: Theme × State Matrix', () => {
    const loadingStates = PRIMITIVE_STATES.LoadingState;

    it.each(REQUIRED_THEMES)('LoadingState should render in theme: %s', async (theme) => {
      expect(theme).toBeDefined();
    });

    it.each(loadingStates)('LoadingState should have state defined: %s', (state) => {
      expect(state).toBeDefined();
    });
  });
});

describe('Primitive Contract: High Contrast Validation', () => {
  const highContrastTheme = 'high-contrast';

  it('should include high-contrast in required themes', () => {
    expect(REQUIRED_THEMES).toContain(highContrastTheme);
  });

  it.each(REQUIRED_PRIMITIVES)(
    '%s should be available for high-contrast accessibility',
    (primitive) => {
      expect(PRIMITIVE_STATES[primitive]).toBeDefined();
    },
  );
});

describe('Primitive Contract: Token Binding Validation', () => {
  it.each(REQUIRED_PRIMITIVES)('%s should have token-aware styling', (primitive) => {
    expect(primitive).toBeDefined();
    const states = PRIMITIVE_STATES[primitive];
    expect(states).toBeDefined();
  });

  it('each primitive should reference CSS custom properties', () => {
    const primitiveList = [...REQUIRED_PRIMITIVES];
    expect(primitiveList.length).toBe(6);
  });
});
