export const createLtiPlatformSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    platformUrl: { type: 'string', maxLength: 2048 },
    clientId: { type: 'string', minLength: 1, maxLength: 255 },
    deploymentId: { type: 'string', maxLength: 255 },
    publicKeysetUrl: { type: 'string', maxLength: 2048 },
    authTokenUrl: { type: 'string', maxLength: 2048 },
    authLoginUrl: { type: 'string', maxLength: 2048 },
    toolUrl: { type: 'string', maxLength: 2048 },
  },
  required: ['name', 'platformUrl', 'clientId', 'publicKeysetUrl', 'authTokenUrl', 'authLoginUrl'],
};

export const updateLtiPlatformSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    platformUrl: { type: 'string', maxLength: 2048 },
    clientId: { type: 'string', minLength: 1, maxLength: 255 },
    deploymentId: { type: 'string', maxLength: 255 },
    publicKeysetUrl: { type: 'string', maxLength: 2048 },
    authTokenUrl: { type: 'string', maxLength: 2048 },
    authLoginUrl: { type: 'string', maxLength: 2048 },
    toolUrl: { type: 'string', maxLength: 2048 },
    isActive: { type: 'boolean' },
  },
};

export const ltiPlatformResponseSchema = {
  type: 'object',
  properties: {
    platformId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    platformUrl: { type: 'string' },
    clientId: { type: 'string' },
    deploymentId: { type: 'string', nullable: true },
    publicKeysetUrl: { type: 'string' },
    authTokenUrl: { type: 'string' },
    authLoginUrl: { type: 'string' },
    jwks: { type: 'object' },
    toolUrl: { type: 'string', nullable: true },
    isActive: { type: 'boolean' },
    lastValidationStatus: { type: 'string', nullable: true },
    lastValidatedAt: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'platformId',
    'tenantId',
    'name',
    'platformUrl',
    'clientId',
    'deploymentId',
    'publicKeysetUrl',
    'authTokenUrl',
    'authLoginUrl',
    'jwks',
    'toolUrl',
    'isActive',
    'lastValidationStatus',
    'lastValidatedAt',
    'createdAt',
    'updatedAt',
  ],
};

export const ltiPlatformListResponseSchema = {
  type: 'array',
  items: ltiPlatformResponseSchema,
};

export const createLtiLineItemSchema = {
  type: 'object',
  properties: {
    platformId: { type: 'string', format: 'uuid' },
    resourceLinkId: { type: 'string', maxLength: 255 },
    label: { type: 'string', minLength: 1, maxLength: 255 },
    scoreMaximum: { type: 'integer', minimum: 1, maximum: 1000 },
    resourceId: { type: 'string', maxLength: 255 },
    tag: { type: 'string', maxLength: 255 },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
  },
  required: ['platformId', 'label'],
};

export const updateLtiLineItemSchema = {
  type: 'object',
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 255 },
    scoreMaximum: { type: 'integer', minimum: 1, maximum: 1000 },
    resourceId: { type: 'string', maxLength: 255 },
    tag: { type: 'string', maxLength: 255 },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
  },
};

export const ltiLineItemResponseSchema = {
  type: 'object',
  properties: {
    lineItemId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    platformId: { type: 'string', format: 'uuid' },
    resourceLinkId: { type: 'string', nullable: true },
    label: { type: 'string' },
    scoreMaximum: { type: 'number' },
    resourceId: { type: 'string', nullable: true },
    tag: { type: 'string', nullable: true },
    startDate: { type: 'string', format: 'date-time', nullable: true },
    endDate: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'lineItemId',
    'tenantId',
    'platformId',
    'resourceLinkId',
    'label',
    'scoreMaximum',
    'resourceId',
    'tag',
    'startDate',
    'endDate',
    'createdAt',
    'updatedAt',
  ],
};

export const ltiLineItemListResponseSchema = {
  type: 'array',
  items: ltiLineItemResponseSchema,
};

export const createLtiDeepLinkContentSchema = {
  type: 'object',
  properties: {
    platformId: { type: 'string', format: 'uuid' },
    contentType: { type: 'string', minLength: 1, maxLength: 50 },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    url: { type: 'string', maxLength: 2048, format: 'uri' },
    lineItemId: { type: 'string', format: 'uuid' },
    customParams: { type: 'object' },
    available: { type: 'boolean' },
  },
  required: ['platformId', 'contentType', 'title'],
};

export const updateLtiDeepLinkContentSchema = {
  type: 'object',
  properties: {
    contentType: { type: 'string', minLength: 1, maxLength: 50 },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    url: { type: 'string', maxLength: 2048, format: 'uri' },
    lineItemId: { type: 'string', format: 'uuid' },
    customParams: { type: 'object' },
    available: { type: 'boolean' },
  },
};

export const ltiDeepLinkContentResponseSchema = {
  type: 'object',
  properties: {
    contentId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    platformId: { type: 'string', format: 'uuid' },
    contentType: { type: 'string' },
    title: { type: 'string' },
    url: { type: 'string', nullable: true },
    lineItemId: { type: 'string', format: 'uuid', nullable: true },
    customParams: { type: 'object' },
    available: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'contentId',
    'tenantId',
    'platformId',
    'contentType',
    'title',
    'url',
    'lineItemId',
    'customParams',
    'available',
    'createdAt',
    'updatedAt',
  ],
};

export const ltiDeepLinkContentListResponseSchema = {
  type: 'array',
  items: ltiDeepLinkContentResponseSchema,
};

export const createLtiScoreSchema = {
  type: 'object',
  properties: {
    lineItemId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', minLength: 1, maxLength: 255 },
    scoreGiven: { type: 'number', minimum: 0 },
    scoreMaximum: { type: 'integer', minimum: 1, maximum: 1000 },
    activityProgress: { type: 'string' },
    gradingProgress: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
  },
  required: ['lineItemId', 'userId'],
};

export const ltiScoreResponseSchema = {
  type: 'object',
  properties: {
    scoreId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    lineItemId: { type: 'string', format: 'uuid' },
    userId: { type: 'string' },
    scoreGiven: { type: 'string', nullable: true },
    scoreMaximum: { type: 'number' },
    activityProgress: { type: 'string' },
    gradingProgress: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'scoreId',
    'tenantId',
    'lineItemId',
    'userId',
    'scoreGiven',
    'scoreMaximum',
    'activityProgress',
    'gradingProgress',
    'timestamp',
    'createdAt',
  ],
};

export const ltiScoreListResponseSchema = {
  type: 'array',
  items: ltiScoreResponseSchema,
};

export const ltiSessionResponseSchema = {
  type: 'object',
  properties: {
    sessionId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    platformId: { type: 'string', format: 'uuid' },
    userId: { type: 'string', nullable: true },
    resourceLinkId: { type: 'string', nullable: true },
    contextId: { type: 'string', nullable: true },
    roles: { type: 'array', items: { type: 'object' } },
    launchId: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
  required: [
    'sessionId',
    'tenantId',
    'platformId',
    'userId',
    'resourceLinkId',
    'contextId',
    'roles',
    'launchId',
    'createdAt',
  ],
};

export const ltiSessionListResponseSchema = {
  type: 'array',
  items: ltiSessionResponseSchema,
};
