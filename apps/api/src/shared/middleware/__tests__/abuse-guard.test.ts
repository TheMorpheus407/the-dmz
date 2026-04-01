import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthAbuseCategory } from '@the-dmz/shared/contracts';

import * as abuseCounterModule from '../../services/abuse-counter.service.js';
import * as authAbusePolicyModule from '../../policies/auth-abuse-policy.js';
import {
  createAbuseGuard,
  incrementAbuseCounter,
  resetAbuseCounters,
  type AbuseCheckOptions,
} from '../abuse-guard.js';

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AppConfig } from '../../config.js';

vi.mock('../../services/abuse-counter.service.js');
vi.mock('../../policies/auth-abuse-policy.js');

const mockGetAbuseCounterService = vi.mocked(abuseCounterModule.getAbuseCounterService);
const mockGetClientIp = vi.mocked(authAbusePolicyModule.getClientIp);
const mockEvaluateAbuseResult = vi.mocked(authAbusePolicyModule.evaluateAbuseResult);
const mockSetAbuseHeaders = vi.mocked(authAbusePolicyModule.setAbuseHeaders);

describe('abuse-guard middleware', () => {
  const mockConfig = {
    redisUrl: 'redis://localhost:6379',
  } as unknown as AppConfig;

  const mockRequest = {
    preAuthTenantContext: { tenantId: 'test-tenant-id' },
    body: { email: 'test@example.com' },
    server: { config: mockConfig },
  } as unknown as FastifyRequest;

  const mockReply = {
    header: vi.fn(),
  } as unknown as FastifyReply;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue('192.168.1.1');
    mockEvaluateAbuseResult.mockImplementation(() => {});
    mockSetAbuseHeaders.mockImplementation(() => {});
  });

  describe('createAbuseGuard', () => {
    it('creates a preHandler hook that sets abuseCheckOptions on request', async () => {
      const mockCheckAbuseLevel = vi.fn().mockResolvedValue({
        level: 'NORMAL',
        failureCount: 0,
        windowExpiresAt: new Date(),
      });
      mockGetAbuseCounterService.mockReturnValue({
        checkAbuseLevel: mockCheckAbuseLevel,
      } as unknown as abuseCounterModule.AuthAbuseCounterService);

      const hook = createAbuseGuard(AuthAbuseCategory.LOGIN, { emailField: 'email' });
      await hook(mockRequest, mockReply);

      expect(mockRequest.abuseCheckOptions).toBeDefined();
      expect(mockRequest.abuseCheckOptions?.tenantId).toBe('test-tenant-id');
      expect(mockRequest.abuseCheckOptions?.email).toBe('test@example.com');
      expect(mockRequest.abuseCheckOptions?.ip).toBe('192.168.1.1');
      expect(mockRequest.abuseCheckOptions?.category).toBe(AuthAbuseCategory.LOGIN);
    });

    it('calls checkAbuseLevel with correct options', async () => {
      const mockCheckAbuseLevel = vi.fn().mockResolvedValue({
        level: 'NORMAL',
        failureCount: 0,
        windowExpiresAt: new Date(),
      });
      mockGetAbuseCounterService.mockReturnValue({
        checkAbuseLevel: mockCheckAbuseLevel,
      } as unknown as abuseCounterModule.AuthAbuseCounterService);

      const hook = createAbuseGuard(AuthAbuseCategory.REGISTER, { emailField: 'email' });
      await hook(mockRequest, mockReply);

      expect(mockCheckAbuseLevel).toHaveBeenCalledWith({
        tenantId: 'test-tenant-id',
        email: 'test@example.com',
        ip: '192.168.1.1',
        category: AuthAbuseCategory.REGISTER,
      });
    });

    it('calls evaluateAbuseResult and setAbuseHeaders after check', async () => {
      const mockAbuseResult = {
        level: 'NORMAL',
        failureCount: 0,
        windowExpiresAt: new Date(),
      };
      const mockCheckAbuseLevel = vi.fn().mockResolvedValue(mockAbuseResult);
      mockGetAbuseCounterService.mockReturnValue({
        checkAbuseLevel: mockCheckAbuseLevel,
      } as unknown as abuseCounterModule.AuthAbuseCounterService);

      const hook = createAbuseGuard(AuthAbuseCategory.LOGIN);
      await hook(mockRequest, mockReply);

      expect(mockEvaluateAbuseResult).toHaveBeenCalledWith(mockAbuseResult);
      expect(mockSetAbuseHeaders).toHaveBeenCalledWith(mockReply, mockAbuseResult);
    });

    it('omits tenantId if preAuthTenantContext is missing', async () => {
      const mockCheckAbuseLevel = vi.fn().mockResolvedValue({
        level: 'NORMAL',
        failureCount: 0,
        windowExpiresAt: new Date(),
      });
      mockGetAbuseCounterService.mockReturnValue({
        checkAbuseLevel: mockCheckAbuseLevel,
      } as unknown as abuseCounterModule.AuthAbuseCounterService);

      const requestWithoutTenant = {
        ...mockRequest,
        preAuthTenantContext: undefined,
      } as unknown as FastifyRequest;

      const hook = createAbuseGuard(AuthAbuseCategory.LOGIN);
      await hook(requestWithoutTenant, mockReply);

      expect(requestWithoutTenant.abuseCheckOptions?.tenantId).toBeUndefined();
      expect(mockCheckAbuseLevel).toHaveBeenCalledWith({
        category: 'login',
        ip: '192.168.1.1',
      });
    });

    it('omits email if emailField is not specified', async () => {
      const mockCheckAbuseLevel = vi.fn().mockResolvedValue({
        level: 'NORMAL',
        failureCount: 0,
        windowExpiresAt: new Date(),
      });
      mockGetAbuseCounterService.mockReturnValue({
        checkAbuseLevel: mockCheckAbuseLevel,
      } as unknown as abuseCounterModule.AuthAbuseCounterService);

      const hook = createAbuseGuard(AuthAbuseCategory.LOGIN);
      await hook(mockRequest, mockReply);

      expect(mockRequest.abuseCheckOptions?.email).toBeUndefined();
    });

    it('does not extract email when body is missing', async () => {
      const mockCheckAbuseLevel = vi.fn().mockResolvedValue({
        level: 'NORMAL',
        failureCount: 0,
        windowExpiresAt: new Date(),
      });
      mockGetAbuseCounterService.mockReturnValue({
        checkAbuseLevel: mockCheckAbuseLevel,
      } as unknown as abuseCounterModule.AuthAbuseCounterService);

      const requestWithoutBody = {
        ...mockRequest,
        body: undefined,
      } as unknown as FastifyRequest;

      const hook = createAbuseGuard(AuthAbuseCategory.LOGIN, { emailField: 'email' });
      await hook(requestWithoutBody, mockReply);

      expect(mockRequest.abuseCheckOptions?.email).toBeUndefined();
    });
  });

  describe('incrementAbuseCounter', () => {
    it('does nothing when abuseCheckOptions is not set on request', async () => {
      const requestWithoutOptions = {
        ...mockRequest,
        abuseCheckOptions: undefined,
      } as unknown as FastifyRequest;

      await incrementAbuseCounter(requestWithoutOptions, mockConfig);

      expect(mockGetAbuseCounterService).not.toHaveBeenCalled();
    });

    it('does nothing when condition returns false', async () => {
      mockRequest.abuseCheckOptions = {
        tenantId: 'test-tenant-id',
        category: AuthAbuseCategory.LOGIN,
      };

      const condition = vi.fn().mockReturnValue(false);

      await incrementAbuseCounter(mockRequest, mockConfig, condition);

      expect(condition).toHaveBeenCalledWith(mockRequest);
      expect(mockGetAbuseCounterService).not.toHaveBeenCalled();
    });

    it('calls incrementAndEvaluate when condition returns true', async () => {
      mockRequest.abuseCheckOptions = {
        tenantId: 'test-tenant-id',
        category: AuthAbuseCategory.LOGIN,
      };

      const mockIncrementAndEvaluate = vi.fn().mockResolvedValue({
        level: 'NORMAL',
        failureCount: 1,
        windowExpiresAt: new Date(),
      });
      mockGetAbuseCounterService.mockReturnValue({
        incrementAndEvaluate: mockIncrementAndEvaluate,
      } as unknown as abuseCounterModule.AuthAbuseCounterService);

      const condition = vi.fn().mockReturnValue(true);

      await incrementAbuseCounter(mockRequest, mockConfig, condition);

      expect(condition).toHaveBeenCalledWith(mockRequest);
      expect(mockIncrementAndEvaluate).toHaveBeenCalledWith(mockRequest.abuseCheckOptions);
    });

    it('calls evaluateAbuseResult after incrementing', async () => {
      mockRequest.abuseCheckOptions = {
        tenantId: 'test-tenant-id',
        category: AuthAbuseCategory.LOGIN,
      };

      const mockAbuseResult = {
        level: 'NORMAL',
        failureCount: 1,
        windowExpiresAt: new Date(),
      };
      const mockIncrementAndEvaluate = vi.fn().mockResolvedValue(mockAbuseResult);
      mockGetAbuseCounterService.mockReturnValue({
        incrementAndEvaluate: mockIncrementAndEvaluate,
      } as unknown as abuseCounterModule.AuthAbuseCounterService);

      await incrementAbuseCounter(mockRequest, mockConfig, () => true);

      expect(mockEvaluateAbuseResult).toHaveBeenCalledWith(mockAbuseResult);
    });

    it('uses default condition that always returns true', async () => {
      mockRequest.abuseCheckOptions = {
        tenantId: 'test-tenant-id',
        category: AuthAbuseCategory.LOGIN,
      };

      const mockIncrementAndEvaluate = vi.fn().mockResolvedValue({
        level: 'NORMAL',
        failureCount: 1,
        windowExpiresAt: new Date(),
      });
      mockGetAbuseCounterService.mockReturnValue({
        incrementAndEvaluate: mockIncrementAndEvaluate,
      } as unknown as abuseCounterModule.AuthAbuseCounterService);

      await incrementAbuseCounter(mockRequest, mockConfig);

      expect(mockIncrementAndEvaluate).toHaveBeenCalled();
    });
  });

  describe('resetAbuseCounters', () => {
    it('does nothing when abuseCheckOptions is not set', async () => {
      const requestWithoutOptions = {
        ...mockRequest,
        abuseCheckOptions: undefined,
      } as unknown as FastifyRequest;

      await resetAbuseCounters(requestWithoutOptions, mockConfig);

      expect(mockGetAbuseCounterService).not.toHaveBeenCalled();
    });

    it('calls resetCounters when abuseCheckOptions is set', async () => {
      mockRequest.abuseCheckOptions = {
        tenantId: 'test-tenant-id',
        email: 'test@example.com',
        category: AuthAbuseCategory.LOGIN,
      };

      const mockResetCounters = vi.fn().mockResolvedValue(undefined);
      mockGetAbuseCounterService.mockReturnValue({
        resetCounters: mockResetCounters,
      } as unknown as abuseCounterModule.AuthAbuseCounterService);

      await resetAbuseCounters(mockRequest, mockConfig);

      expect(mockResetCounters).toHaveBeenCalledWith(mockRequest.abuseCheckOptions);
    });
  });
});
