export const ErrorEnvelopeSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object' },
        requestId: { type: 'string' },
      },
      required: ['code', 'message', 'details'],
    },
  },
  required: ['success', 'error'],
} as const;

export const ErrorCodeEnum = [
  'INTERNAL_SERVER_ERROR',
  'VALIDATION_FAILED',
  'INVALID_INPUT',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMIT_EXCEEDED',
  'SERVICE_UNAVAILABLE',
  'AUTH_UNAUTHORIZED',
  'AUTH_FORBIDDEN',
  'AUTH_INSUFFICIENT_PERMS',
  'AUTH_SESSION_EXPIRED',
  'AUTH_INVALID_TOKEN',
  'TENANT_CONTEXT_MISSING',
  'TENANT_CONTEXT_INVALID',
  'TENANT_NOT_FOUND',
  'TENANT_INACTIVE',
  'RESOURCE_NOT_FOUND',
] as const;

export const errorResponseSchemas = {
  BadRequest: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', const: 'VALIDATION_FAILED' },
          message: { type: 'string' },
          details: { type: 'object' },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  Unauthorized: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            enum: ['AUTH_UNAUTHORIZED', 'AUTH_SESSION_EXPIRED', 'AUTH_INVALID_TOKEN'],
          },
          message: { type: 'string' },
          details: { type: 'object' },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  Forbidden: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            enum: ['AUTH_FORBIDDEN', 'AUTH_INSUFFICIENT_PERMS', 'TENANT_INACTIVE'],
          },
          message: { type: 'string' },
          details: { type: 'object' },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  TenantInactive: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', const: 'TENANT_INACTIVE' },
          message: { type: 'string' },
          details: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              tenantStatus: { type: 'string' },
            },
          },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  NotFound: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', enum: ['NOT_FOUND', 'RESOURCE_NOT_FOUND', 'TENANT_NOT_FOUND'] },
          message: { type: 'string' },
          details: { type: 'object' },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  Conflict: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', const: 'CONFLICT' },
          message: { type: 'string' },
          details: { type: 'object' },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  RateLimitExceeded: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', const: 'RATE_LIMIT_EXCEEDED' },
          message: { type: 'string' },
          details: {
            type: 'object',
            properties: {
              retryAfterSeconds: { type: 'integer' },
            },
          },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  AbuseCooldown: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', const: 'AUTH_ABUSE_COOLDOWN' },
          message: { type: 'string' },
          details: {
            type: 'object',
            properties: {
              abuseLevel: { type: 'string', const: 'cooldown' },
              failureCount: { type: 'integer' },
              windowExpiresAt: { type: 'string' },
              retryAfterSeconds: { type: 'integer' },
            },
            required: ['abuseLevel', 'failureCount', 'windowExpiresAt'],
          },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  AbuseLocked: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', const: 'AUTH_ABUSE_LOCKED' },
          message: { type: 'string' },
          details: {
            type: 'object',
            properties: {
              abuseLevel: { type: 'string', const: 'locked' },
              failureCount: { type: 'integer' },
              windowExpiresAt: { type: 'string' },
            },
            required: ['abuseLevel', 'failureCount', 'windowExpiresAt'],
          },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  AbuseChallengeRequired: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', const: 'AUTH_ABUSE_CHALLENGE_REQUIRED' },
          message: { type: 'string' },
          details: {
            type: 'object',
            properties: {
              abuseLevel: { type: 'string', const: 'challenge_required' },
              failureCount: { type: 'integer' },
              windowExpiresAt: { type: 'string' },
            },
            required: ['abuseLevel', 'failureCount', 'windowExpiresAt'],
          },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  AbuseIpBlocked: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', const: 'AUTH_ABUSE_IP_BLOCKED' },
          message: { type: 'string' },
          details: {
            type: 'object',
            properties: {
              abuseLevel: { type: 'string', const: 'ip_blocked' },
              failureCount: { type: 'integer' },
              windowExpiresAt: { type: 'string' },
            },
            required: ['abuseLevel', 'failureCount', 'windowExpiresAt'],
          },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  InternalServerError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', const: 'INTERNAL_SERVER_ERROR' },
          message: { type: 'string' },
          details: { type: 'object' },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },

  ServiceUnavailable: {
    type: 'object',
    properties: {
      success: { type: 'boolean', const: false },
      error: {
        type: 'object',
        properties: {
          code: { type: 'string', const: 'SERVICE_UNAVAILABLE' },
          message: { type: 'string' },
          details: { type: 'object' },
          requestId: { type: 'string' },
        },
        required: ['code', 'message', 'details'],
      },
    },
    required: ['success', 'error'],
  },
} as const;

export const standardErrorResponses = {
  400: {
    description: 'Bad Request - Validation failed or invalid input',
    content: {
      'application/json': {
        schema: errorResponseSchemas.BadRequest,
      },
    },
  },
  401: {
    description: 'Unauthorized - Authentication required',
    content: {
      'application/json': {
        schema: errorResponseSchemas.Unauthorized,
      },
    },
  },
  403: {
    description: 'Forbidden - Access denied',
    content: {
      'application/json': {
        schema: errorResponseSchemas.Forbidden,
      },
    },
  },
  404: {
    description: 'Not Found - Resource not found',
    content: {
      'application/json': {
        schema: errorResponseSchemas.NotFound,
      },
    },
  },
  409: {
    description: 'Conflict - Resource conflict',
    content: {
      'application/json': {
        schema: errorResponseSchemas.Conflict,
      },
    },
  },
  429: {
    description: 'Too Many Requests - Rate limit exceeded',
    content: {
      'application/json': {
        schema: errorResponseSchemas.RateLimitExceeded,
      },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: errorResponseSchemas.InternalServerError,
      },
    },
  },
  503: {
    description: 'Service Unavailable',
    content: {
      'application/json': {
        schema: errorResponseSchemas.ServiceUnavailable,
      },
    },
  },
};
