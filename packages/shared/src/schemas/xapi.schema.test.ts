import { describe, it, expect } from 'vitest';

import {
  xapiStatementInputSchema,
  xapiActorInputSchema,
  xapiVerbInputSchema,
  xapiObjectInputSchema,
  xapiResultInputSchema,
  xapiContextInputSchema,
  xapiExtensionsSchema,
  xapiArchiveInputSchema,
  lrsConfigInputSchema,
  lrsConfigUpdateSchema,
} from './xapi.schema.js';

describe('xapiExtensionsSchema', () => {
  it('should accept empty extensions', () => {
    const result = xapiExtensionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept valid extensions with small payload', () => {
    const result = xapiExtensionsSchema.safeParse({
      'https://example.com/ext1': 'value1',
      'https://example.com/ext2': 42,
    });
    expect(result.success).toBe(true);
  });

  it('should reject extensions exceeding 10KB', () => {
    const largeValue = 'x'.repeat(11 * 1024);
    const result = xapiExtensionsSchema.safeParse({
      'https://example.com/large': largeValue,
    });
    expect(result.success).toBe(false);
  });

  it('should accept extensions at exactly 10KB boundary', () => {
    const maxSize = 10 * 1024;
    const data = JSON.stringify({ 'https://example.com/test': 'x'.repeat(maxSize - 50) });
    const result = xapiExtensionsSchema.safeParse(JSON.parse(data));
    expect(result.success).toBe(true);
  });
});

describe('xapiActorInputSchema', () => {
  it('should accept actor with valid mbox email', () => {
    const result = xapiActorInputSchema.safeParse({
      mbox: 'mailto:user@example.com',
      name: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('should reject actor with mbox missing mailto prefix', () => {
    const result = xapiActorInputSchema.safeParse({
      mbox: 'user@example.com',
      name: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('should reject actor with invalid email format', () => {
    const result = xapiActorInputSchema.safeParse({
      mbox: 'not-an-email',
      name: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('should reject actor without any identifier', () => {
    const result = xapiActorInputSchema.safeParse({
      name: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('should accept actor with mbox_sha1sum', () => {
    const result = xapiActorInputSchema.safeParse({
      mbox_sha1sum: 'abc123def456',
    });
    expect(result.success).toBe(true);
  });

  it('should accept actor with openid URL', () => {
    const result = xapiActorInputSchema.safeParse({
      openid: 'https://example.com/users/123',
    });
    expect(result.success).toBe(true);
  });

  it('should accept actor with account', () => {
    const result = xapiActorInputSchema.safeParse({
      account: {
        homePage: 'https://example.com',
        name: 'user123',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject actor with account missing homePage', () => {
    const result = xapiActorInputSchema.safeParse({
      account: {
        name: 'user123',
      },
    });
    expect(result.success).toBe(false);
  });

  it('should reject actor with invalid openid URL', () => {
    const result = xapiActorInputSchema.safeParse({
      openid: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('xapiVerbInputSchema', () => {
  it('should accept valid verb with URL id', () => {
    const result = xapiVerbInputSchema.safeParse({
      id: 'http://adlnet.gov/expapi/verbs/experienced',
      display: { 'en-US': 'experienced' },
    });
    expect(result.success).toBe(true);
  });

  it('should reject verb with invalid URL id', () => {
    const result = xapiVerbInputSchema.safeParse({
      id: 'not-a-url',
      display: { 'en-US': 'experienced' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject verb with id exceeding 512 characters', () => {
    const result = xapiVerbInputSchema.safeParse({
      id: 'http://example.com/' + 'a'.repeat(500),
    });
    expect(result.success).toBe(false);
  });

  it('should accept verb without display', () => {
    const result = xapiVerbInputSchema.safeParse({
      id: 'http://adlnet.gov/expapi/verbs/experienced',
    });
    expect(result.success).toBe(true);
  });
});

describe('xapiObjectInputSchema', () => {
  it('should accept valid object with URL id', () => {
    const result = xapiObjectInputSchema.safeParse({
      id: 'https://example.com/activities/123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject object with invalid URL id', () => {
    const result = xapiObjectInputSchema.safeParse({
      id: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('should accept object with definition', () => {
    const result = xapiObjectInputSchema.safeParse({
      id: 'https://example.com/activities/123',
      definition: {
        name: { 'en-US': 'Test Activity' },
        description: { 'en-US': 'A test activity' },
        type: 'http://adlnet.gov/expapi/activities/course',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should default objectType to Activity', () => {
    const result = xapiObjectInputSchema.safeParse({
      id: 'https://example.com/activities/123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.objectType).toBe('Activity');
    }
  });
});

describe('xapiResultInputSchema', () => {
  it('should accept valid result', () => {
    const result = xapiResultInputSchema.safeParse({
      score: { raw: 85, min: 0, max: 100, scaled: 0.85 },
      success: true,
      completion: true,
      duration: 'PT1H30M',
    });
    expect(result.success).toBe(true);
  });

  it('should accept result without optional fields', () => {
    const result = xapiResultInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept result with only success', () => {
    const result = xapiResultInputSchema.safeParse({
      success: true,
    });
    expect(result.success).toBe(true);
  });

  it('should reject result with invalid duration format', () => {
    const result = xapiResultInputSchema.safeParse({
      duration: 'PTX',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid ISO 8601 duration formats', () => {
    const durations = ['PT30S', 'PT1M', 'PT1H', 'PT1H30M', 'PT1H30M30S', 'PT30.5S'];
    for (const duration of durations) {
      const result = xapiResultInputSchema.safeParse({ duration });
      expect(result.success).toBe(true);
    }
  });

  it('should accept score with scaled value between -1 and 1', () => {
    const result = xapiResultInputSchema.safeParse({
      score: { scaled: 0.5 },
    });
    expect(result.success).toBe(true);
  });

  it('should reject score with scaled value outside -1 to 1 range', () => {
    const result = xapiResultInputSchema.safeParse({
      score: { scaled: 1.5 },
    });
    expect(result.success).toBe(false);
  });
});

describe('xapiContextInputSchema', () => {
  it('should accept valid context with extensions', () => {
    const result = xapiContextInputSchema.safeParse({
      registration: '550e8400-e29b-41d4-a716-446655440000',
      extensions: {
        'https://example.com/ext1': 'value1',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject context with invalid registration UUID', () => {
    const result = xapiContextInputSchema.safeParse({
      registration: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should accept context with contextActivities', () => {
    const result = xapiContextInputSchema.safeParse({
      contextActivities: {
        parent: [{ id: 'https://example.com/activities/parent' }],
        grouping: [{ id: 'https://example.com/activities/group' }],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('xapiStatementInputSchema', () => {
  it('should accept valid minimal statement', () => {
    const result = xapiStatementInputSchema.safeParse({
      verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
      object: { id: 'https://example.com/activities/123' },
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid complete statement', () => {
    const result = xapiStatementInputSchema.safeParse({
      actor: { mbox: 'mailto:user@example.com', name: 'Test User' },
      verb: {
        id: 'http://adlnet.gov/expapi/verbs/experienced',
        display: { 'en-US': 'experienced' },
      },
      object: {
        id: 'https://example.com/activities/123',
        definition: { name: { 'en-US': 'Test Activity' } },
      },
      result: {
        score: { raw: 85, min: 0, max: 100 },
        success: true,
        completion: true,
        duration: 'PT30M',
      },
      context: {
        registration: '550e8400-e29b-41d4-a716-446655440000',
        extensions: { 'https://example.com/ext1': 'value1' },
      },
      version: '1.0.3',
      timestamp: '2024-01-15T10:30:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject statement with missing verb', () => {
    const result = xapiStatementInputSchema.safeParse({
      object: { id: 'https://example.com/activities/123' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject statement with missing object', () => {
    const result = xapiStatementInputSchema.safeParse({
      verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject statement with invalid timestamp', () => {
    const result = xapiStatementInputSchema.safeParse({
      verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
      object: { id: 'https://example.com/activities/123' },
      timestamp: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('should reject statement with invalid version', () => {
    const result = xapiStatementInputSchema.safeParse({
      verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
      object: { id: 'https://example.com/activities/123' },
      version: '1.0.0',
    });
    expect(result.success).toBe(false);
  });

  it('should default version to 1.0.3', () => {
    const result = xapiStatementInputSchema.safeParse({
      verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
      object: { id: 'https://example.com/activities/123' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe('1.0.3');
    }
  });

  it('should accept version 2.0', () => {
    const result = xapiStatementInputSchema.safeParse({
      verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
      object: { id: 'https://example.com/activities/123' },
      version: '2.0',
    });
    expect(result.success).toBe(true);
  });
});

describe('xapiArchiveInputSchema', () => {
  it('should accept valid datetime', () => {
    const result = xapiArchiveInputSchema.safeParse({
      beforeDate: '2024-01-15T10:30:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid datetime format', () => {
    const result = xapiArchiveInputSchema.safeParse({
      beforeDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('should reject extra fields', () => {
    const result = xapiArchiveInputSchema.safeParse({
      beforeDate: '2024-01-15T10:30:00Z',
      extraField: 'value',
    });
    expect(result.success).toBe(false);
  });
});

describe('lrsConfigInputSchema', () => {
  it('should accept valid LRS config', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid endpoint URL', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'not-a-url',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
    });
    expect(result.success).toBe(false);
  });

  it('should reject authSecret shorter than 8 characters', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should reject name exceeding 255 characters', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'a'.repeat(256),
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative batchSize', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
      batchSize: -1,
    });
    expect(result.success).toBe(false);
  });

  it('should reject batchSize exceeding 1000', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
      batchSize: 1001,
    });
    expect(result.success).toBe(false);
  });

  it('should reject retryMaxAttempts less than 1', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
      retryMaxAttempts: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject retryMaxAttempts exceeding 10', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
      retryMaxAttempts: 11,
    });
    expect(result.success).toBe(false);
  });

  it('should reject retryBaseDelayMs exceeding 60000', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
      retryBaseDelayMs: 60001,
    });
    expect(result.success).toBe(false);
  });

  it('should default enabled to true', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true);
    }
  });

  it('should default batchingEnabled to true', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.batchingEnabled).toBe(true);
    }
  });

  it('should default batchSize to 10', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.batchSize).toBe(10);
    }
  });

  it('should accept valid version enum', () => {
    const result = lrsConfigInputSchema.safeParse({
      name: 'Test LRS',
      endpoint: 'https://lrs.example.com/',
      authKeyId: 'key123',
      authSecret: 'secretpassword',
      version: '2.0',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe('2.0');
    }
  });
});

describe('lrsConfigUpdateSchema', () => {
  it('should accept empty object for partial update', () => {
    const result = lrsConfigUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept partial update with only name', () => {
    const result = lrsConfigUpdateSchema.safeParse({
      name: 'Updated LRS Name',
    });
    expect(result.success).toBe(true);
  });

  it('should accept partial update with only endpoint', () => {
    const result = lrsConfigUpdateSchema.safeParse({
      endpoint: 'https://new-lrs.example.com/',
    });
    expect(result.success).toBe(true);
  });

  it('should accept update with new authSecret', () => {
    const result = lrsConfigUpdateSchema.safeParse({
      authSecret: 'newlongersecret',
    });
    expect(result.success).toBe(true);
  });

  it('should reject authSecret shorter than 8 characters', () => {
    const result = lrsConfigUpdateSchema.safeParse({
      authSecret: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid endpoint URL', () => {
    const result = lrsConfigUpdateSchema.safeParse({
      endpoint: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});
