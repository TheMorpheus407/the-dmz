import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn(),
}));

import { getDatabaseClient } from '../../../shared/database/connection.js';
import { ComplianceRepository } from '../compliance.repository.js';

import type { DatabaseClient } from '../../../shared/database/connection.js';
import type { AppConfig } from '../../config.js';

describe('ComplianceRepository', () => {
  let mockDb: DatabaseClient;
  let repository: ComplianceRepository;

  const createMockDb = (): DatabaseClient => {
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
      onConflictDoNothing: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    } as unknown as DatabaseClient;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    vi.mocked(getDatabaseClient).mockReturnValue(mockDb);
    repository = new ComplianceRepository(mockDb);
  });

  describe('create', () => {
    it('creates repository instance with database client', () => {
      const mockConfig = { DATABASE_URL: 'postgresql://test' } as AppConfig;
      const repo = ComplianceRepository.create(mockConfig);

      expect(getDatabaseClient).toHaveBeenCalledWith(mockConfig);
      expect(repo).toBeInstanceOf(ComplianceRepository);
    });

    it('throws TypeError when config is undefined', () => {
      expect(() => ComplianceRepository.create(undefined)).toThrow(TypeError);
    });
  });

  describe('findSnapshots', () => {
    it('returns snapshots for tenant ordered by frameworkId desc', async () => {
      const mockSnapshots = [
        {
          id: 'snap-1',
          tenantId: 'tenant-1',
          frameworkId: 'nist_800_50',
          status: 'compliant',
          completionPercentage: 100,
          lastAssessedAt: new Date(),
          nextAssessmentDue: new Date(),
          requirements: {},
          metadata: {},
          snapshotDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.orderBy = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue(mockSnapshots);

      const result = await repository.findSnapshots('tenant-1');

      expect(result).toEqual(mockSnapshots);
      expect(mockDb.from).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it('returns empty array when no snapshots exist', async () => {
      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.orderBy = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([]);

      const result = await repository.findSnapshots('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('findSnapshotByFramework', () => {
    it('returns snapshot for specific tenant and framework', async () => {
      const mockSnapshot = {
        id: 'snap-1',
        tenantId: 'tenant-1',
        frameworkId: 'nist_800_50',
        status: 'compliant',
        completionPercentage: 100,
        lastAssessedAt: new Date(),
        nextAssessmentDue: new Date(),
        requirements: {},
        metadata: {},
        snapshotDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.limit = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([mockSnapshot]);

      const result = await repository.findSnapshotByFramework('tenant-1', 'nist_800_50');

      expect(result).toEqual(mockSnapshot);
    });

    it('returns undefined when snapshot not found', async () => {
      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.limit = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([]);

      const result = await repository.findSnapshotByFramework('tenant-1', 'nist_800_50');

      expect(result).toBeUndefined();
    });
  });

  describe('findRequirements', () => {
    it('returns requirements for tenant and framework', async () => {
      const mockRequirements = [
        {
          id: 'req-1',
          tenantId: 'tenant-1',
          frameworkId: 'nist_800_50',
          requirementId: 'nist-1',
          requirementName: 'Security Awareness Training',
          description: 'Test description',
          category: 'Training',
          isRequired: 1,
          minCompetencyScore: 70,
          requiredTrainingModules: [],
          status: 'not_started',
          completionPercentage: 0,
          lastAssessedAt: null,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue(mockRequirements);

      const result = await repository.findRequirements('tenant-1', 'nist_800_50');

      expect(result).toEqual(mockRequirements);
    });

    it('returns empty array when no requirements exist', async () => {
      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([]);

      const result = await repository.findRequirements('tenant-1', 'nist_800_50');

      expect(result).toEqual([]);
    });
  });

  describe('upsertSnapshot', () => {
    it('inserts new snapshot and returns it', async () => {
      const mockSnapshot = {
        id: 'snap-new',
        tenantId: 'tenant-1',
        frameworkId: 'nist_800_50',
        status: 'compliant',
        completionPercentage: 100,
        lastAssessedAt: new Date(),
        nextAssessmentDue: new Date(),
        requirements: { total: 3, completed: 3 },
        metadata: {},
        snapshotDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert = vi.fn().mockReturnThis();
      mockDb.values = vi.fn().mockReturnThis();
      mockDb.onConflictDoUpdate = vi.fn().mockReturnThis();
      mockDb.set = vi.fn().mockReturnThis();
      mockDb.returning = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([mockSnapshot]);

      const result = await repository.upsertSnapshot({
        tenantId: 'tenant-1',
        frameworkId: 'nist_800_50',
        status: 'compliant',
        completionPercentage: 100,
        lastAssessedAt: new Date(),
        nextAssessmentDue: new Date(),
        requirements: { total: 3, completed: 3 },
        metadata: {},
        snapshotDate: new Date(),
      });

      expect(result).toEqual(mockSnapshot);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });

    it('updates existing snapshot on conflict', async () => {
      const mockSnapshot = {
        id: 'snap-existing',
        tenantId: 'tenant-1',
        frameworkId: 'nist_800_50',
        status: 'in_progress',
        completionPercentage: 50,
        lastAssessedAt: new Date(),
        nextAssessmentDue: new Date(),
        requirements: { total: 3, completed: 1 },
        metadata: {},
        snapshotDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.insert = vi.fn().mockReturnThis();
      mockDb.values = vi.fn().mockReturnThis();
      mockDb.onConflictDoUpdate = vi.fn().mockReturnThis();
      mockDb.set = vi.fn().mockReturnThis();
      mockDb.returning = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([mockSnapshot]);

      const result = await repository.upsertSnapshot({
        tenantId: 'tenant-1',
        frameworkId: 'nist_800_50',
        status: 'in_progress',
        completionPercentage: 50,
        lastAssessedAt: new Date(),
        nextAssessmentDue: new Date(),
        requirements: { total: 3, completed: 1 },
        metadata: {},
        snapshotDate: new Date(),
      });

      expect(result).toEqual(mockSnapshot);
      expect(mockDb.onConflictDoUpdate).toHaveBeenCalled();
    });

    it('throws error when insert/update fails', async () => {
      mockDb.insert = vi.fn().mockReturnThis();
      mockDb.values = vi.fn().mockReturnThis();
      mockDb.onConflictDoUpdate = vi.fn().mockReturnThis();
      mockDb.set = vi.fn().mockReturnThis();
      mockDb.returning = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([]);

      await expect(
        repository.upsertSnapshot({
          tenantId: 'tenant-1',
          frameworkId: 'nist_800_50',
          status: 'compliant',
          completionPercentage: 100,
          lastAssessedAt: new Date(),
          nextAssessmentDue: new Date(),
          requirements: {},
          metadata: {},
          snapshotDate: new Date(),
        }),
      ).rejects.toThrow('Failed to create or update compliance snapshot');
    });
  });

  describe('updateRequirements', () => {
    it('updates requirement status and completion percentage', async () => {
      mockDb.update = vi.fn().mockReturnThis();
      mockDb.set = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue(undefined);

      await repository.updateRequirements('req-1', 'compliant', 100, new Date());

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({
        status: 'compliant',
        completionPercentage: 100,
        lastAssessedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('insertRequirements', () => {
    it('inserts default requirements for a framework', async () => {
      const defaultRequirements = [
        {
          requirementId: 'nist-1',
          requirementName: 'Security Awareness Training',
          description: 'Test description',
          category: 'Training',
          minCompetencyScore: 70,
        },
      ];

      mockDb.insert = vi.fn().mockReturnThis();
      mockDb.values = vi.fn().mockReturnThis();
      mockDb.onConflictDoNothing = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue(undefined);

      await repository.insertRequirements('tenant-1', 'nist_800_50', defaultRequirements);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith([
        {
          tenantId: 'tenant-1',
          frameworkId: 'nist_800_50',
          requirementId: 'nist-1',
          requirementName: 'Security Awareness Training',
          description: 'Test description',
          category: 'Training',
          isRequired: 1,
          minCompetencyScore: 70,
          requiredTrainingModules: [],
          status: 'not_started',
          completionPercentage: 0,
          metadata: {},
        },
      ]);
      expect(mockDb.onConflictDoNothing).toHaveBeenCalled();
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('does nothing when defaultRequirements is empty', async () => {
      mockDb.insert = vi.fn().mockReturnThis();
      mockDb.values = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue(undefined);

      await repository.insertRequirements('tenant-1', 'nist_800_50', []);

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('countRequirements', () => {
    it('returns total count of requirements for tenant and framework', async () => {
      mockDb.select = vi.fn().mockReturnThis();
      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([{ id: 'req-1' }, { id: 'req-2' }]);

      const result = await repository.countRequirements('tenant-1', 'nist_800_50');

      expect(result).toBe(2);
    });

    it('returns 0 when no requirements exist', async () => {
      mockDb.select = vi.fn().mockReturnThis();
      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([]);

      const result = await repository.countRequirements('tenant-1', 'nist_800_50');

      expect(result).toBe(0);
    });
  });

  describe('countCompliantRequirements', () => {
    it('returns count of compliant requirements for tenant and framework', async () => {
      mockDb.select = vi.fn().mockReturnThis();
      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([{ id: 'req-1' }]);

      const result = await repository.countCompliantRequirements('tenant-1', 'nist_800_50');

      expect(result).toBe(1);
    });

    it('returns 0 when no compliant requirements exist', async () => {
      mockDb.select = vi.fn().mockReturnThis();
      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.execute = vi.fn().mockResolvedValue([]);

      const result = await repository.countCompliantRequirements('tenant-1', 'nist_800_50');

      expect(result).toBe(0);
    });
  });
});
