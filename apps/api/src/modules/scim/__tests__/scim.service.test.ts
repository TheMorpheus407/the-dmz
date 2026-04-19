import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SCIMError, SCIM_ERRORS } from '../scim.service.js';

import type { AppConfig } from '../../../config.js';

const mockConfig = {
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
} as unknown as AppConfig;

const mockTenantId = 'test-tenant-id';
const mockUserId = 'test-user-id';
const mockGroupId = 'test-group-id';
const mockUser = {
  userId: mockUserId,
  email: 'test@example.com',
  displayName: 'Test User',
  tenantId: mockTenantId,
  role: 'member' as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockGroup = {
  id: mockGroupId,
  scimId: mockGroupId,
  displayName: 'Test Group',
  tenantId: mockTenantId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SCIMError', () => {
  describe('error structure', () => {
    it('creates error with correct code, message, and statusCode', () => {
      const error = new SCIMError(SCIM_ERRORS.USER_NOT_FOUND, 'User not found', 404);

      expect(error.code).toBe(SCIM_ERRORS.USER_NOT_FOUND);
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('SCIMError');
    });

    it('serializes to JSON correctly', () => {
      const error = new SCIMError(SCIM_ERRORS.INVALID_FILTER, 'Invalid filter syntax', 400);
      const json = error.toJSON();

      expect(json).toEqual({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: '400',
        scimType: SCIM_ERRORS.INVALID_FILTER,
        detail: 'Invalid filter syntax',
      });
    });

    it('supports all SCIM_ERRORS codes', () => {
      const errorCodes = [
        SCIM_ERRORS.INVALID_REQUEST,
        SCIM_ERRORS.USER_NOT_FOUND,
        SCIM_ERRORS.USER_ALREADY_EXISTS,
        SCIM_ERRORS.GROUP_NOT_FOUND,
        SCIM_ERRORS.GROUP_ALREADY_EXISTS,
        SCIM_ERRORS.INVALID_FILTER,
        SCIM_ERRORS.TENANT_MISMATCH,
        SCIM_ERRORS.IDEMPOTENCY_KEY_CONFLICT,
        SCIM_ERRORS.INVALID_TOKEN,
        SCIM_ERRORS.INSUFFICIENT_SCOPE,
      ];

      for (const code of errorCodes) {
        const error = new SCIMError(code, 'Test message', 400);
        expect(error.code).toBe(code);
      }
    });
  });
});

vi.mock('../../../shared/database/connection.js', () => ({
  getDatabaseClient: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}));

describe('SCIM service error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getScimUser', () => {
    it('throws SCIMError(USER_NOT_FOUND) when user does not exist', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { getScimUser } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      await expect(getScimUser(mockConfig, mockTenantId, 'non-existent-id')).rejects.toThrow(
        SCIMError,
      );

      try {
        await getScimUser(mockConfig, mockTenantId, 'non-existent-id');
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.USER_NOT_FOUND);
        expect((error as SCIMError).statusCode).toBe(404);
      }
    });

    it('returns user when user exists', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { getScimUser } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      const result = await getScimUser(mockConfig, mockTenantId, mockUserId);
      expect(result.id).toBe(mockUserId);
    });
  });

  describe('createScimUser', () => {
    it('throws SCIMError(TENANT_MISMATCH) when user email exists in different tenant', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { createScimUser } = await import('../scim.service.js');

      const differentTenantUser = {
        ...mockUser,
        tenantId: 'different-tenant-id',
      };

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([differentTenantUser]),
          }),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      const userData = {
        userName: 'test@example.com',
        displayName: 'Test User',
      };

      await expect(createScimUser(mockConfig, mockTenantId, userData)).rejects.toThrow(SCIMError);

      try {
        await createScimUser(mockConfig, mockTenantId, userData);
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.TENANT_MISMATCH);
        expect((error as SCIMError).statusCode).toBe(409);
      }
    });

    it('throws SCIMError(USER_ALREADY_EXISTS) when user email already exists', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { createScimUser } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      const userData = {
        userName: 'test@example.com',
        displayName: 'Test User',
      };

      await expect(createScimUser(mockConfig, mockTenantId, userData)).rejects.toThrow(SCIMError);

      try {
        await createScimUser(mockConfig, mockTenantId, userData);
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.USER_ALREADY_EXISTS);
        expect((error as SCIMError).statusCode).toBe(409);
      }
    });

    it('throws SCIMError(INVALID_REQUEST) when setting admin-protected field', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { createScimUser } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      const userData = {
        userName: 'new@example.com',
        displayName: 'New User',
        role: 'admin',
      } as unknown as Parameters<typeof createScimUser>[2];

      await expect(createScimUser(mockConfig, mockTenantId, userData)).rejects.toThrow(SCIMError);

      try {
        await createScimUser(mockConfig, mockTenantId, userData);
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.INVALID_REQUEST);
        expect((error as SCIMError).statusCode).toBe(400);
      }
    });

    it('throws SCIMError(INVALID_REQUEST) when user creation fails', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { createScimUser } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      const userData = {
        userName: 'new@example.com',
        displayName: 'New User',
      };

      await expect(createScimUser(mockConfig, mockTenantId, userData)).rejects.toThrow(SCIMError);

      try {
        await createScimUser(mockConfig, mockTenantId, userData);
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.INVALID_REQUEST);
        expect((error as SCIMError).statusCode).toBe(500);
      }
    });
  });

  describe('deleteScimUser', () => {
    it('throws SCIMError(USER_NOT_FOUND) when user does not exist', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { deleteScimUser } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      await expect(deleteScimUser(mockConfig, mockTenantId, 'non-existent-id')).rejects.toThrow(
        SCIMError,
      );

      try {
        await deleteScimUser(mockConfig, mockTenantId, 'non-existent-id');
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.USER_NOT_FOUND);
        expect((error as SCIMError).statusCode).toBe(404);
      }
    });
  });

  describe('getScimGroup', () => {
    it('throws SCIMError(GROUP_NOT_FOUND) when group does not exist', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { getScimGroup } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      await expect(getScimGroup(mockConfig, mockTenantId, 'non-existent-id')).rejects.toThrow(
        SCIMError,
      );

      try {
        await getScimGroup(mockConfig, mockTenantId, 'non-existent-id');
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.GROUP_NOT_FOUND);
        expect((error as SCIMError).statusCode).toBe(404);
      }
    });
  });

  describe('createScimGroup', () => {
    it('throws SCIMError(GROUP_ALREADY_EXISTS) when group displayName already exists', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { createScimGroup } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockGroup]),
          }),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      const groupData = {
        displayName: 'Test Group',
      };

      await expect(createScimGroup(mockConfig, mockTenantId, groupData)).rejects.toThrow(SCIMError);

      try {
        await createScimGroup(mockConfig, mockTenantId, groupData);
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.GROUP_ALREADY_EXISTS);
        expect((error as SCIMError).statusCode).toBe(409);
      }
    });

    it('throws SCIMError(INVALID_REQUEST) when group creation fails', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { createScimGroup } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      const groupData = {
        displayName: 'New Group',
      };

      await expect(createScimGroup(mockConfig, mockTenantId, groupData)).rejects.toThrow(SCIMError);

      try {
        await createScimGroup(mockConfig, mockTenantId, groupData);
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.INVALID_REQUEST);
        expect((error as SCIMError).statusCode).toBe(500);
      }
    });
  });

  describe('updateScimGroup', () => {
    it('throws SCIMError(GROUP_NOT_FOUND) when group does not exist', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { updateScimGroup } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([]),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      await expect(
        updateScimGroup(mockConfig, mockTenantId, 'non-existent-id', { displayName: 'Updated' }),
      ).rejects.toThrow(SCIMError);

      try {
        await updateScimGroup(mockConfig, mockTenantId, 'non-existent-id', {
          displayName: 'Updated',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.GROUP_NOT_FOUND);
        expect((error as SCIMError).statusCode).toBe(404);
      }
    });
  });

  describe('deleteScimGroup', () => {
    it('throws SCIMError(GROUP_NOT_FOUND) when group does not exist', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { deleteScimGroup } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([]),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      await expect(deleteScimGroup(mockConfig, mockTenantId, 'non-existent-id')).rejects.toThrow(
        SCIMError,
      );

      try {
        await deleteScimGroup(mockConfig, mockTenantId, 'non-existent-id');
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.GROUP_NOT_FOUND);
        expect((error as SCIMError).statusCode).toBe(404);
      }
    });
  });

  describe('validateFilter', () => {
    it('throws SCIMError(INVALID_FILTER) for invalid filter syntax', async () => {
      const { getDatabaseClient } = await import('../../../shared/database/connection.js');
      const { listScimUsers } = await import('../scim.service.js');

      vi.mocked(getDatabaseClient).mockReturnValue({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof getDatabaseClient>);

      await expect(
        listScimUsers(mockConfig, mockTenantId, { filter: 'invalid-filter-syntax' }),
      ).rejects.toThrow(SCIMError);

      try {
        await listScimUsers(mockConfig, mockTenantId, { filter: 'invalid-filter-syntax' });
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.INVALID_FILTER);
        expect((error as SCIMError).statusCode).toBe(400);
      }
    });
  });
});

describe('SCIMError edge cases', () => {
  it('handles quote injection in filter', async () => {
    const { getDatabaseClient } = await import('../../../shared/database/connection.js');
    const { listScimUsers } = await import('../scim.service.js');

    vi.mocked(getDatabaseClient).mockReturnValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as ReturnType<typeof getDatabaseClient>);

    const invalidFilters = [
      'userName eq "test" extra"',
      'userName sw "test" junk"',
      'email eq "test@domain.com" extra"',
    ];

    for (const filter of invalidFilters) {
      await expect(listScimUsers(mockConfig, mockTenantId, { filter })).rejects.toThrow(SCIMError);

      try {
        await listScimUsers(mockConfig, mockTenantId, { filter });
      } catch (error) {
        expect(error).toBeInstanceOf(SCIMError);
        expect((error as SCIMError).code).toBe(SCIM_ERRORS.INVALID_FILTER);
      }
    }
  });

  it('handles updateScimUser with USER_NOT_FOUND', async () => {
    const { getDatabaseClient } = await import('../../../shared/database/connection.js');
    const { updateScimUser } = await import('../scim.service.js');

    vi.mocked(getDatabaseClient).mockReturnValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    } as unknown as ReturnType<typeof getDatabaseClient>);

    await expect(
      updateScimUser(mockConfig, mockTenantId, 'non-existent-id', { displayName: 'Updated' }),
    ).rejects.toThrow(SCIMError);

    try {
      await updateScimUser(mockConfig, mockTenantId, 'non-existent-id', { displayName: 'Updated' });
    } catch (error) {
      expect(error).toBeInstanceOf(SCIMError);
      expect((error as SCIMError).code).toBe(SCIM_ERRORS.USER_NOT_FOUND);
      expect((error as SCIMError).statusCode).toBe(404);
    }
  });

  it('handles reactivateScimUser with USER_NOT_FOUND', async () => {
    const { getDatabaseClient } = await import('../../../shared/database/connection.js');
    const { reactivateScimUser } = await import('../scim.service.js');

    vi.mocked(getDatabaseClient).mockReturnValue({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    } as unknown as ReturnType<typeof getDatabaseClient>);

    await expect(reactivateScimUser(mockConfig, mockTenantId, 'non-existent-id')).rejects.toThrow(
      SCIMError,
    );

    try {
      await reactivateScimUser(mockConfig, mockTenantId, 'non-existent-id');
    } catch (error) {
      expect(error).toBeInstanceOf(SCIMError);
      expect((error as SCIMError).code).toBe(SCIM_ERRORS.USER_NOT_FOUND);
      expect((error as SCIMError).statusCode).toBe(404);
    }
  });
});
