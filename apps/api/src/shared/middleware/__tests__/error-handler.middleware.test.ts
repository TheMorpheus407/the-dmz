import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ZodError } from 'zod';

import { ErrorCodes } from '../error-codes.js';
import { AppError } from '../app-error.js';
import { createErrorHandler } from '../error-handler.middleware.js';

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

const { mockCaptureException } = vi.hoisted(() => ({
  mockCaptureException: vi.fn(),
}));

vi.mock('@sentry/node', () => ({
  default: { captureException: mockCaptureException },
  captureException: mockCaptureException,
}));

const createMockRequest = (overrides: Partial<FastifyRequest> = {}): FastifyRequest => {
  const request = {
    id: 'test-request-id',
    method: 'GET',
    url: '/test',
    log: {
      error: vi.fn(),
      warn: vi.fn(),
    },
    tenantContext: undefined,
    ...overrides,
  } as unknown as FastifyRequest;
  return request;
};

const createMockReply = (): FastifyReply => {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
  return reply;
};

describe('error-handler.middleware', () => {
  let mockRequest: FastifyRequest;
  let mockReply: FastifyReply;
  let errorHandler: (
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCaptureException.mockReset();
    errorHandler = createErrorHandler();
    mockRequest = createMockRequest();
    mockReply = createMockReply();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AppError handling', () => {
    it('should extract statusCode, code, message, and details from AppError', async () => {
      const appError = new AppError({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Custom validation message',
        statusCode: 400,
        details: { field: 'email', issue: 'invalid format' },
      });

      await errorHandler(appError, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_FAILED',
          message: 'Custom validation message',
          details: { field: 'email', issue: 'invalid format' },
          requestId: 'test-request-id',
        }),
      });
    });

    it('should use default message from AppError when not overridden', async () => {
      const appError = new AppError({
        code: ErrorCodes.NOT_FOUND,
        message: 'Resource not found',
        statusCode: 404,
      });

      await errorHandler(appError, mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Resource not found',
          details: {},
        }),
      });
    });
  });

  describe('ZodError handling', () => {
    it('should handle ZodError with 400 status and VALIDATION_FAILED code', async () => {
      const zodError = new ZodError([
        { path: ['email'], message: 'Invalid email', code: 'invalid_string' },
        { path: ['age'], message: 'Must be a number', code: 'invalid_type' },
      ]);

      await errorHandler(zodError, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          details: {
            issues: expect.arrayContaining([
              expect.objectContaining({ path: ['email'], message: 'Invalid email' }),
              expect.objectContaining({ path: ['age'], message: 'Must be a number' }),
            ]),
          },
          requestId: 'test-request-id',
        }),
      });
    });
  });

  describe('Fastify validation error handling', () => {
    it('should handle error with validation array', async () => {
      const fastifyError = {
        message: 'Invalid request',
        statusCode: 400,
        validation: [{ field: 'name', message: 'required' }],
      } as unknown as FastifyError;

      await errorHandler(fastifyError, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          details: { issues: [{ field: 'name', message: 'required' }] },
        }),
      });
    });

    it('should handle error with validation array containing multiple issues', async () => {
      const fastifyError = {
        message: 'Invalid request',
        statusCode: 400,
        validation: [
          { field: 'email', message: 'invalid format' },
          { field: 'password', message: 'too short' },
        ],
      } as unknown as FastifyError;

      await errorHandler(fastifyError, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      const sendCall = mockReply.send.mock.calls[0][0];
      expect(sendCall.error.details.issues).toHaveLength(2);
    });
  });

  describe('Invalid JSON body error handling', () => {
    it('should handle FST_ERR_CTP_INVALID_JSON_BODY with 400 status', async () => {
      const invalidJsonError = {
        code: 'FST_ERR_CTP_INVALID_JSON_BODY',
        message: 'Unexpected token }',
        statusCode: 400,
      } as unknown as FastifyError;

      await errorHandler(invalidJsonError, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          details: { reason: 'Unexpected token }' },
        }),
      });
    });

    it('should NOT treat FST_ERR_CTP_INVALID_JSON_BODY as validation error when statusCode is not 400', async () => {
      const invalidJsonErrorWith500 = {
        code: 'FST_ERR_CTP_INVALID_JSON_BODY',
        message: 'Unexpected token }',
        statusCode: 500,
      } as unknown as FastifyError;

      await errorHandler(invalidJsonErrorWith500, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal Server Error',
        }),
      });
    });
  });

  describe('404 handling', () => {
    it('should handle 404 status with NOT_FOUND code', async () => {
      const notFoundError = {
        statusCode: 404,
        message: 'Not Found',
      } as unknown as FastifyError;

      await errorHandler(notFoundError, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Route not found',
          details: {},
        }),
      });
    });
  });

  describe('5xx error handling', () => {
    it('should log error for 5xx status codes', async () => {
      const serverError = {
        statusCode: 500,
        message: 'Internal Server Error',
      } as unknown as FastifyError;

      await errorHandler(serverError, mockRequest, mockReply);

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: serverError,
          requestId: 'test-request-id',
          code: 'INTERNAL_SERVER_ERROR',
        }),
        'request failed',
      );
    });

    it('should include tenant context in error log when available', async () => {
      const serverError = {
        statusCode: 500,
        message: 'Internal Server Error',
      } as unknown as FastifyError;

      mockRequest = createMockRequest({
        tenantContext: { tenantId: 'tenant-123', userId: 'user-456' },
      });

      await errorHandler(serverError, mockRequest, mockReply);

      expect(mockRequest.log.error).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          userId: 'user-456',
        }),
        'request failed',
      );
    });
  });

  describe('4xx error handling', () => {
    it('should log warning for 4xx status codes', async () => {
      const clientError = {
        statusCode: 400,
        message: 'Bad Request',
      } as unknown as FastifyError;

      await errorHandler(clientError, mockRequest, mockReply);

      expect(mockRequest.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          err: clientError,
          requestId: 'test-request-id',
          code: 'INTERNAL_SERVER_ERROR',
        }),
        'request error',
      );
    });

    it('should continue without throwing for 4xx errors (Sentry not called for client errors)', async () => {
      const clientError = {
        statusCode: 400,
        message: 'Bad Request',
      } as unknown as FastifyError;

      await expect(errorHandler(clientError, mockRequest, mockReply)).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should use ?? 500 fallback when error has no statusCode property', async () => {
      const errorWithoutStatusCode = { message: 'something' } as unknown as FastifyError;

      await errorHandler(errorWithoutStatusCode, mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal Server Error',
        }),
      });
    });
  });

  describe('normalizeDetails', () => {
    it('should return empty object when details is undefined', async () => {
      const errorWithoutDetails = {
        statusCode: 500,
        message: 'Error',
      } as unknown as FastifyError;

      await errorHandler(errorWithoutDetails, mockRequest, mockReply);

      const sendCall = mockReply.send.mock.calls[0][0];
      expect(sendCall.error.details).toEqual({});
    });

    it('should preserve details when error has details', async () => {
      const appError = new AppError({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Validation failed',
        statusCode: 400,
        details: { specific: 'details' },
      });

      await errorHandler(appError, mockRequest, mockReply);

      const sendCall = mockReply.send.mock.calls[0][0];
      expect(sendCall.error.details).toEqual({ specific: 'details' });
    });
  });

  describe('error response envelope', () => {
    it('should always include requestId in response', async () => {
      const error = {
        statusCode: 404,
        message: 'Not Found',
      } as unknown as FastifyError;

      await errorHandler(error, mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            requestId: 'test-request-id',
          }),
        }),
      );
    });

    it('should use custom request ID from header', async () => {
      mockRequest = createMockRequest({ id: 'custom-request-id' });

      const error = {
        statusCode: 404,
        message: 'Not Found',
      } as unknown as FastifyError;

      await errorHandler(error, mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            requestId: 'custom-request-id',
          }),
        }),
      );
    });
  });
});
