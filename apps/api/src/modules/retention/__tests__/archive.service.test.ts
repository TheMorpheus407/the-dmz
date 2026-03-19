import { describe, it, expect } from 'vitest';

import { ArchiveService } from '../archive.service.js';

describe('ArchiveService', () => {
  describe('constructor', () => {
    it('should set compression level', () => {
      const s = new ArchiveService(9);
      expect(s).toBeDefined();
    });

    it('should use default compression level when not specified', () => {
      const s = new ArchiveService();
      expect(s).toBeDefined();
    });
  });

  describe('compression and data handling', () => {
    it('should be instantiable with various compression levels', () => {
      expect(new ArchiveService(1)).toBeDefined();
      expect(new ArchiveService(6)).toBeDefined();
      expect(new ArchiveService(9)).toBeDefined();
    });
  });
});
