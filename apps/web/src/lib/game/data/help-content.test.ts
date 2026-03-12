import { describe, it, expect } from 'vitest';

import {
  HELP_TOPICS,
  HELP_CATEGORIES,
  getHelpForTopic,
  getTopicsByCategory,
  getHelpIndex,
  type HelpCategory,
} from '$lib/game/data/help-content';

describe('help-content', () => {
  describe('HELP_CATEGORIES', () => {
    it('should have all required categories', () => {
      const categoryIds = HELP_CATEGORIES.map((c) => c.id);
      expect(categoryIds).toContain('general');
      expect(categoryIds).toContain('email');
      expect(categoryIds).toContain('facility');
      expect(categoryIds).toContain('upgrades');
      expect(categoryIds).toContain('threats');
      expect(categoryIds).toContain('shortcuts');
    });

    it('should have descriptions for all categories', () => {
      for (const category of HELP_CATEGORIES) {
        expect(category.description).toBeTruthy();
        expect(category.description.length).toBeGreaterThan(10);
      }
    });
  });

  describe('HELP_TOPICS', () => {
    it('should have intro topic', () => {
      const intro = getHelpForTopic('intro');
      expect(intro).toBeDefined();
      expect(intro?.name).toBe('intro');
    });

    it('should have topics for all categories', () => {
      const categories: HelpCategory[] = [
        'general',
        'email',
        'facility',
        'upgrades',
        'threats',
        'shortcuts',
      ];
      for (const category of categories) {
        const topics = getTopicsByCategory(category);
        expect(topics.length).toBeGreaterThan(0);
      }
    });

    it('should have in-world voice in content', () => {
      for (const topic of HELP_TOPICS) {
        expect(topic.content.length).toBeGreaterThan(50);
      }
    });
  });

  describe('getHelpForTopic', () => {
    it('should return topic by exact id', () => {
      const topic = getHelpForTopic('email');
      expect(topic).toBeDefined();
      expect(topic?.id).toBe('email');
    });

    it('should return topic case insensitively', () => {
      const topic = getHelpForTopic('EMAIL');
      expect(topic).toBeDefined();
      expect(topic?.id).toBe('email');
    });

    it('should return undefined for unknown topic', () => {
      const topic = getHelpForTopic('nonexistent');
      expect(topic).toBeUndefined();
    });
  });

  describe('getTopicsByCategory', () => {
    it('should return topics for general category', () => {
      const topics = getTopicsByCategory('general');
      expect(topics.length).toBeGreaterThan(0);
      expect(topics.every((t) => t.category === 'general')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const topics = getTopicsByCategory('unknown' as HelpCategory);
      expect(topics).toEqual([]);
    });
  });

  describe('getHelpIndex', () => {
    it('should return index content', () => {
      const index = getHelpIndex();
      expect(index).toContain('MATRICES GmbH OPERATOR MANUAL');
      expect(index).toContain('help <topic>');
    });

    it('should list all categories', () => {
      const index = getHelpIndex();
      expect(index).toContain('GENERAL');
      expect(index).toContain('EMAIL');
      expect(index).toContain('FACILITY');
      expect(index).toContain('UPGRADES');
      expect(index).toContain('THREATS');
      expect(index).toContain('SHORTCUTS');
    });
  });
});
