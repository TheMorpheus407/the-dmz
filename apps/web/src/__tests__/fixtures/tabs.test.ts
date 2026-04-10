import { describe, expect, it } from 'vitest';

describe('Tabs Fixture', () => {
  describe('mockTabContent', () => {
    it('should be exported as a Snippet type', async () => {
      const { mockTabContent } = await import('../fixtures/tabs');
      expect(typeof mockTabContent).toBe('function');
    });
  });

  describe('mockTabs', () => {
    it('should be an array of 3 tabs', async () => {
      const { mockTabs } = await import('../fixtures/tabs');
      expect(mockTabs).toHaveLength(3);
    });

    it('should have tabs with correct structure', async () => {
      const { mockTabs } = await import('../fixtures/tabs');
      expect(mockTabs[0]).toHaveProperty('id');
      expect(mockTabs[0]).toHaveProperty('label');
      expect(mockTabs[0]).toHaveProperty('content');
      expect(typeof mockTabs[0]!.content).toBe('function');
    });

    it('should have tabs with consistent IDs', async () => {
      const { mockTabs } = await import('../fixtures/tabs');
      const ids = mockTabs.map((tab) => tab.id);
      expect(ids).toEqual(['tab1', 'tab2', 'tab3']);
    });

    it('should have tabs with readable labels', async () => {
      const { mockTabs } = await import('../fixtures/tabs');
      const labels = mockTabs.map((tab) => tab.label);
      expect(labels).toEqual(['Tab One', 'Tab Two', 'Tab Three']);
    });
  });

  describe('mockTwoTabs', () => {
    it('should be an array of 2 tabs', async () => {
      const { mockTwoTabs } = await import('../fixtures/tabs');
      expect(mockTwoTabs).toHaveLength(2);
    });

    it('should have tabs with correct structure', async () => {
      const { mockTwoTabs } = await import('../fixtures/tabs');
      expect(mockTwoTabs[0]).toHaveProperty('id');
      expect(mockTwoTabs[0]).toHaveProperty('label');
      expect(mockTwoTabs[0]).toHaveProperty('content');
      expect(typeof mockTwoTabs[0]!.content).toBe('function');
    });

    it('should have tabs with consistent IDs', async () => {
      const { mockTwoTabs } = await import('../fixtures/tabs');
      const ids = mockTwoTabs.map((tab) => tab.id);
      expect(ids).toEqual(['tab1', 'tab2']);
    });
  });

  describe('createMockTabs', () => {
    it('should be a function', async () => {
      const { createMockTabs } = await import('../fixtures/tabs');
      expect(typeof createMockTabs).toBe('function');
    });

    it('should create a single tab with correct structure', async () => {
      const { createMockTabs } = await import('../fixtures/tabs');
      const tabs = createMockTabs({ count: 1 });
      expect(tabs).toHaveLength(1);
      expect(tabs[0]).toHaveProperty('id');
      expect(tabs[0]).toHaveProperty('label');
      expect(tabs[0]).toHaveProperty('content');
    });

    it('should create multiple tabs with correct count', async () => {
      const { createMockTabs } = await import('../fixtures/tabs');
      const tabs = createMockTabs({ count: 5 });
      expect(tabs).toHaveLength(5);
    });

    it('should create tabs with incrementing IDs', async () => {
      const { createMockTabs } = await import('../fixtures/tabs');
      const tabs = createMockTabs({ count: 3 });
      expect(tabs.map((t) => t.id)).toEqual(['tab1', 'tab2', 'tab3']);
    });

    it('should create tabs with incrementing labels', async () => {
      const { createMockTabs } = await import('../fixtures/tabs');
      const tabs = createMockTabs({ count: 3 });
      expect(tabs.map((t) => t.label)).toEqual(['Tab 1', 'Tab 2', 'Tab 3']);
    });

    it('should use custom prefix when provided', async () => {
      const { createMockTabs } = await import('../fixtures/tabs');
      const tabs = createMockTabs({ count: 2, prefix: 'custom' });
      expect(tabs.map((t) => t.id)).toEqual(['custom1', 'custom2']);
      expect(tabs.map((t) => t.label)).toEqual(['Custom 1', 'Custom 2']);
    });

    it('should create tabs with valid snippet content', async () => {
      const { createMockTabs } = await import('../fixtures/tabs');
      const tabs = createMockTabs({ count: 2 });
      expect(typeof tabs[0]!.content).toBe('function');
      expect(typeof tabs[1]!.content).toBe('function');
    });
  });
});
