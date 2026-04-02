import { z } from 'zod';

export const campaignStatusEnum = z.enum(['draft', 'active', 'paused', 'completed']);
export const campaignTypeEnum = z.enum(['onboarding', 'quarterly', 'annual', 'event-driven']);
export const recurrencePatternEnum = z.enum([
  'one-time',
  'weekly',
  'monthly',
  'quarterly',
  'annual',
]);
export const contentTypeEnum = z.enum(['module', 'assessment', 'phishing_simulation']);
export const enrollmentStatusEnum = z.enum(['not_started', 'in_progress', 'completed']);

export const campaignCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  campaignType: campaignTypeEnum,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().max(50).optional(),
  recurrencePattern: recurrencePatternEnum.optional(),
});

export const campaignUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  campaignType: campaignTypeEnum.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().max(50).optional(),
  recurrencePattern: recurrencePatternEnum.optional(),
});

export const campaignStatusUpdateSchema = z.object({
  status: campaignStatusEnum,
});

export const campaignAudienceSchema = z.object({
  groupIds: z.array(z.string().uuid()).optional(),
  departments: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  attributeFilters: z.record(z.unknown()).optional(),
});

export const campaignContentSchema = z.object({
  contentType: contentTypeEnum,
  contentItemId: z.string().uuid(),
  orderIndex: z.number().int().optional(),
  dueDays: z.number().int().optional(),
  isPrerequisite: z.boolean().optional(),
});

export const campaignEscalationSchema = z.object({
  reminderDays: z.array(z.number().int()).optional(),
  managerNotification: z.boolean().optional(),
  complianceAlert: z.boolean().optional(),
  complianceAlertThreshold: z.number().int().optional(),
});

export const campaignListQuerySchema = z.object({
  status: campaignStatusEnum.optional(),
  campaignType: campaignTypeEnum.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const enrollUsersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(500),
});

export const enrollmentStatusUpdateSchema = z.object({
  status: enrollmentStatusEnum,
});

export const campaignIdParamJsonSchema = {
  type: 'object' as const,
  properties: {
    campaignId: { type: 'string' as const, format: 'uuid' },
  },
  required: ['campaignId'] as const,
};

export const contentIdParamJsonSchema = {
  type: 'object' as const,
  properties: {
    campaignId: { type: 'string' as const, format: 'uuid' },
    contentId: { type: 'string' as const, format: 'uuid' },
  },
  required: ['campaignId', 'contentId'] as const,
};

export const templateIdParamJsonSchema = {
  type: 'object' as const,
  properties: {
    templateId: { type: 'string' as const, format: 'uuid' },
  },
  required: ['templateId'] as const,
};

export const enrollmentIdParamJsonSchema = {
  type: 'object' as const,
  properties: {
    enrollmentId: { type: 'string' as const, format: 'uuid' },
  },
  required: ['enrollmentId'] as const,
};

export const userIdParamJsonSchema = {
  type: 'object' as const,
  properties: {
    userId: { type: 'string' as const, format: 'uuid' },
  },
  required: ['userId'] as const,
};

export const campaignCreateBodyJsonSchema = {
  type: 'object' as const,
  required: ['name', 'campaignType'],
  properties: {
    name: { type: 'string' as const, minLength: 1, maxLength: 255 },
    description: { type: 'string' as const },
    campaignType: {
      type: 'string' as const,
      enum: ['onboarding', 'quarterly', 'annual', 'event-driven'] as const,
    },
    startDate: { type: 'string' as const, format: 'date-time' as const },
    endDate: { type: 'string' as const, format: 'date-time' as const },
    timezone: { type: 'string' as const, maxLength: 50 },
    recurrencePattern: {
      type: 'string' as const,
      enum: ['one-time', 'weekly', 'monthly', 'quarterly', 'annual'] as const,
    },
  },
} as const;

export const campaignUpdateBodyJsonSchema = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const, minLength: 1, maxLength: 255 },
    description: { type: 'string' as const },
    campaignType: {
      type: 'string' as const,
      enum: ['onboarding', 'quarterly', 'annual', 'event-driven'] as const,
    },
    startDate: { type: 'string' as const, format: 'date-time' as const },
    endDate: { type: 'string' as const, format: 'date-time' as const },
    timezone: { type: 'string' as const, maxLength: 50 },
    recurrencePattern: {
      type: 'string' as const,
      enum: ['one-time', 'weekly', 'monthly', 'quarterly', 'annual'] as const,
    },
  },
} as const;

export const campaignStatusUpdateBodyJsonSchema = {
  type: 'object' as const,
  required: ['status'],
  properties: {
    status: { type: 'string' as const, enum: ['draft', 'active', 'paused', 'completed'] as const },
  },
} as const;

export const campaignAudienceBodyJsonSchema = {
  type: 'object' as const,
  properties: {
    groupIds: { type: 'array' as const, items: { type: 'string' as const, format: 'uuid' } },
    departments: { type: 'array' as const, items: { type: 'string' as const } },
    locations: { type: 'array' as const, items: { type: 'string' as const } },
    roles: { type: 'array' as const, items: { type: 'string' as const } },
    attributeFilters: { type: 'object' as const },
  },
} as const;

export const campaignContentBodyJsonSchema = {
  type: 'object' as const,
  required: ['contentType', 'contentItemId'],
  properties: {
    contentType: {
      type: 'string' as const,
      enum: ['module', 'assessment', 'phishing_simulation'] as const,
    },
    contentItemId: { type: 'string' as const, format: 'uuid' },
    orderIndex: { type: 'number' as const },
    dueDays: { type: 'number' as const },
    isPrerequisite: { type: 'boolean' as const },
  },
} as const;

export const campaignEscalationBodyJsonSchema = {
  type: 'object' as const,
  properties: {
    reminderDays: { type: 'array' as const, items: { type: 'number' as const } },
    managerNotification: { type: 'boolean' as const },
    complianceAlert: { type: 'boolean' as const },
    complianceAlertThreshold: { type: 'number' as const },
  },
} as const;

export const campaignListQueryJsonSchema = {
  type: 'object' as const,
  properties: {
    status: { type: 'string' as const, enum: ['draft', 'active', 'paused', 'completed'] as const },
    campaignType: {
      type: 'string' as const,
      enum: ['onboarding', 'quarterly', 'annual', 'event-driven'] as const,
    },
    dateFrom: { type: 'string' as const, format: 'date-time' as const },
    dateTo: { type: 'string' as const, format: 'date-time' as const },
    search: { type: 'string' as const },
    limit: { type: 'number' as const, minimum: 1, maximum: 100 },
    offset: { type: 'number' as const, minimum: 0 },
  },
} as const;

export const enrollUsersBodyJsonSchema = {
  type: 'object' as const,
  required: ['userIds'],
  properties: {
    userIds: {
      type: 'array' as const,
      items: { type: 'string' as const, format: 'uuid' },
      minItems: 1,
      maxItems: 500,
    },
  },
} as const;

export const enrollmentStatusUpdateBodyJsonSchema = {
  type: 'object' as const,
  required: ['status'],
  properties: {
    status: {
      type: 'string' as const,
      enum: ['not_started', 'in_progress', 'completed'] as const,
    },
  },
} as const;

export const saveTemplateBodyJsonSchema = {
  type: 'object' as const,
  required: ['name'],
  properties: {
    name: { type: 'string' as const, minLength: 1, maxLength: 255 },
    description: { type: 'string' as const },
  },
} as const;

export const createFromTemplateBodyJsonSchema = {
  type: 'object' as const,
  required: ['templateId', 'name'],
  properties: {
    templateId: { type: 'string' as const, format: 'uuid' },
    name: { type: 'string' as const, minLength: 1, maxLength: 255 },
  },
} as const;

export const campaignResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        campaignId: { type: 'string' as const, format: 'uuid' },
        name: { type: 'string' as const },
        description: { type: 'string' as const, nullable: true },
        status: { type: 'string' as const },
        campaignType: { type: 'string' as const },
        startDate: { type: 'string' as const, nullable: true },
        endDate: { type: 'string' as const, nullable: true },
        timezone: { type: 'string' as const, nullable: true },
        recurrencePattern: { type: 'string' as const, nullable: true },
        enrollmentCount: { type: 'number' as const },
        completedCount: { type: 'number' as const },
        createdAt: { type: 'string' as const },
        updatedAt: { type: 'string' as const },
      },
      required: ['campaignId', 'name', 'status', 'campaignType', 'createdAt', 'updatedAt'],
    },
  },
  required: ['success', 'data'],
} as const;

export const campaignListResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        campaigns: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              campaignId: { type: 'string' as const, format: 'uuid' },
              name: { type: 'string' as const },
              description: { type: 'string' as const, nullable: true },
              status: { type: 'string' as const },
              campaignType: { type: 'string' as const },
              startDate: { type: 'string' as const, nullable: true },
              endDate: { type: 'string' as const, nullable: true },
              timezone: { type: 'string' as const, nullable: true },
              recurrencePattern: { type: 'string' as const, nullable: true },
              enrollmentCount: { type: 'number' as const },
              completedCount: { type: 'number' as const },
              createdAt: { type: 'string' as const },
              updatedAt: { type: 'string' as const },
            },
            required: ['campaignId', 'name', 'status', 'campaignType', 'createdAt', 'updatedAt'],
          },
        },
        total: { type: 'number' as const },
      },
      required: ['campaigns', 'total'],
    },
  },
  required: ['success', 'data'],
} as const;

export const campaignDetailResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        campaignId: { type: 'string' as const, format: 'uuid' },
        name: { type: 'string' as const },
        description: { type: 'string' as const, nullable: true },
        status: { type: 'string' as const },
        campaignType: { type: 'string' as const },
        startDate: { type: 'string' as const, nullable: true },
        endDate: { type: 'string' as const, nullable: true },
        timezone: { type: 'string' as const, nullable: true },
        recurrencePattern: { type: 'string' as const, nullable: true },
        createdBy: { type: 'string' as const, nullable: true },
        audience: {
          type: 'object' as const,
          nullable: true,
          properties: {
            audienceId: { type: 'string' as const, format: 'uuid' },
            groupIds: { type: 'array' as const, items: { type: 'string' as const } },
            departments: { type: 'array' as const, items: { type: 'string' as const } },
            locations: { type: 'array' as const, items: { type: 'string' as const } },
            roles: { type: 'array' as const, items: { type: 'string' as const } },
            attributeFilters: { type: 'object' as const, nullable: true },
          },
        },
        content: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              contentId: { type: 'string' as const, format: 'uuid' },
              contentType: { type: 'string' as const },
              contentItemId: { type: 'string' as const, format: 'uuid' },
              orderIndex: { type: 'number' as const, nullable: true },
              dueDays: { type: 'number' as const, nullable: true },
              isPrerequisite: { type: 'boolean' as const, nullable: true },
            },
          },
        },
        escalations: {
          type: 'object' as const,
          nullable: true,
          properties: {
            escalationId: { type: 'string' as const, format: 'uuid' },
            reminderDays: { type: 'array' as const, items: { type: 'number' as const } },
            managerNotification: { type: 'boolean' as const },
            complianceAlert: { type: 'boolean' as const },
            complianceAlertThreshold: { type: 'number' as const, nullable: true },
          },
        },
        enrollmentCount: { type: 'number' as const },
        completedCount: { type: 'number' as const },
        createdAt: { type: 'string' as const },
        updatedAt: { type: 'string' as const },
      },
      required: ['campaignId', 'name', 'status', 'campaignType', 'createdAt', 'updatedAt'],
    },
  },
  required: ['success', 'data'],
} as const;

export const audienceResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        audienceId: { type: 'string' as const, format: 'uuid' },
        groupIds: { type: 'array' as const, items: { type: 'string' as const } },
        departments: { type: 'array' as const, items: { type: 'string' as const } },
        locations: { type: 'array' as const, items: { type: 'string' as const } },
        roles: { type: 'array' as const, items: { type: 'string' as const } },
        attributeFilters: { type: 'object' as const, nullable: true },
        createdAt: { type: 'string' as const },
        updatedAt: { type: 'string' as const },
      },
      required: ['audienceId', 'createdAt', 'updatedAt'],
    },
  },
  required: ['success', 'data'],
} as const;

export const contentResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        contentId: { type: 'string' as const, format: 'uuid' },
        contentType: { type: 'string' as const },
        contentItemId: { type: 'string' as const, format: 'uuid' },
        orderIndex: { type: 'number' as const, nullable: true },
        dueDays: { type: 'number' as const, nullable: true },
        isPrerequisite: { type: 'boolean' as const, nullable: true },
        createdAt: { type: 'string' as const },
      },
      required: ['contentId', 'contentType', 'contentItemId', 'createdAt'],
    },
  },
  required: ['success', 'data'],
} as const;

export const escalationResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        escalationId: { type: 'string' as const, format: 'uuid' },
        reminderDays: { type: 'array' as const, items: { type: 'number' as const } },
        managerNotification: { type: 'boolean' as const },
        complianceAlert: { type: 'boolean' as const },
        complianceAlertThreshold: { type: 'number' as const, nullable: true },
        createdAt: { type: 'string' as const },
        updatedAt: { type: 'string' as const },
      },
      required: ['escalationId', 'createdAt', 'updatedAt'],
    },
  },
  required: ['success', 'data'],
} as const;

export const progressResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        totalEnrolled: { type: 'number' as const },
        notStarted: { type: 'number' as const },
        inProgress: { type: 'number' as const },
        completed: { type: 'number' as const },
        completionRate: { type: 'number' as const },
        averageTimeToComplete: { type: 'number' as const, nullable: true },
        byDepartment: { type: 'object' as const },
        byRole: { type: 'object' as const },
      },
      required: ['totalEnrolled', 'notStarted', 'inProgress', 'completed', 'completionRate'],
    },
  },
  required: ['success', 'data'],
} as const;

export const enrollmentResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        enrolled: { type: 'number' as const },
        enrollments: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              enrollmentId: { type: 'string' as const, format: 'uuid' },
              userId: { type: 'string' as const, format: 'uuid' },
              status: { type: 'string' as const },
              enrolledAt: { type: 'string' as const },
              dueDate: { type: 'string' as const, nullable: true },
            },
          },
        },
      },
      required: ['enrolled', 'enrollments'],
    },
  },
  required: ['success', 'data'],
} as const;

export const eligibleUsersResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        eligibleUsers: { type: 'number' as const },
        userIds: { type: 'array' as const, items: { type: 'string' as const } },
      },
      required: ['eligibleUsers', 'userIds'],
    },
  },
  required: ['success', 'data'],
} as const;

export const throttleCheckResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        canEnroll: { type: 'boolean' as const },
        maxPerWeek: { type: 'number' as const },
      },
      required: ['canEnroll', 'maxPerWeek'],
    },
  },
  required: ['success', 'data'],
} as const;

export const enrollmentStatusResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        enrollmentId: { type: 'string' as const, format: 'uuid' },
        status: { type: 'string' as const },
        completedAt: { type: 'string' as const, nullable: true },
        updatedAt: { type: 'string' as const },
      },
      required: ['enrollmentId', 'status', 'updatedAt'],
    },
  },
  required: ['success', 'data'],
} as const;

export const templateListResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        templates: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              templateId: { type: 'string' as const, format: 'uuid' },
              name: { type: 'string' as const },
              description: { type: 'string' as const, nullable: true },
              campaignType: { type: 'string' as const },
              createdAt: { type: 'string' as const },
              updatedAt: { type: 'string' as const },
            },
          },
        },
      },
      required: ['templates'],
    },
  },
  required: ['success', 'data'],
} as const;

export const templateResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        templateId: { type: 'string' as const, format: 'uuid' },
        name: { type: 'string' as const },
        description: { type: 'string' as const, nullable: true },
        campaignType: { type: 'string' as const },
        createdAt: { type: 'string' as const },
      },
      required: ['templateId', 'name', 'campaignType', 'createdAt'],
    },
  },
  required: ['success', 'data'],
} as const;

export const messageResponseJsonSchema = {
  type: 'object' as const,
  properties: {
    success: { type: 'boolean' as const },
    data: {
      type: 'object' as const,
      properties: {
        message: { type: 'string' as const },
      },
      required: ['message'],
    },
  },
  required: ['success', 'data'],
} as const;
