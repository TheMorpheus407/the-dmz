import { describe, it, expect } from 'vitest';

import { GAME_EVENT_TYPES } from '@the-dmz/shared';

import {
  generateXapiStatement,
  generateStatementId,
  buildActorFromUser,
  buildActivityFromGameContent,
  buildResultFromDecision,
  buildContext,
  convertSecondsToIso8601,
  convertStatementToJson,
  XAPI_VERBS,
  DMZ_VERB_MAP,
  getVerbFromMapping,
  isCorrectDecisionVerb,
  isIncorrectDecisionVerb,
  buildStatementFromRow,
  buildStatusUpdate,
} from '../xapi.service.js';

import type { XapiStatement } from '../../../db/schema/lrs/index.js';

describe('xAPI Statement Generation', () => {
  describe('generateStatementId', () => {
    it('should generate a 32-character hex string', () => {
      const id = generateStatementId();
      expect(id).toHaveLength(32);
      expect(id).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateStatementId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('buildActorFromUser', () => {
    it('should create a valid xAPI actor from email and name', () => {
      const actor = buildActorFromUser('user@example.com', 'John Doe');

      expect(actor.objectType).toBe('Agent');
      expect(actor.mbox).toBe('mailto:user@example.com');
      expect(actor.name).toBe('John Doe');
    });
  });

  describe('buildActivityFromGameContent', () => {
    it('should create a valid xAPI activity', () => {
      const activity = buildActivityFromGameContent(
        'email-triage-001',
        'Email Triage Training',
        'Learn to identify phishing emails',
        'http://adlnet.gov/expapi/activities/course',
      );

      expect(activity.objectType).toBe('Activity');
      expect(activity.id).toBe('https://the-dmz.example.com/xapi/activities/email-triage-001');
      expect(activity.definition?.name?.['en-US']).toBe('Email Triage Training');
      expect(activity.definition?.description?.['en-US']).toBe('Learn to identify phishing emails');
      expect(activity.definition?.type).toBe('http://adlnet.gov/expapi/activities/course');
    });

    it('should handle minimal activity data', () => {
      const activity = buildActivityFromGameContent('activity-001', 'Test Activity');

      expect(activity.objectType).toBe('Activity');
      expect(activity.id).toBe('https://the-dmz.example.com/xapi/activities/activity-001');
      expect(activity.definition?.name?.['en-US']).toBe('Test Activity');
    });
  });

  describe('buildResultFromDecision', () => {
    it('should build result for correct decision', () => {
      const result = buildResultFromDecision(true, 95, 120);

      expect(result.success).toBe(true);
      expect(result.completion).toBe(true);
      expect(result.score?.raw).toBe(95);
      expect(result.score?.min).toBe(0);
      expect(result.score?.max).toBe(100);
      expect(result.score?.scaled).toBe(0.95);
      expect(result.duration).toBe('PT2M');
    });

    it('should build result for incorrect decision', () => {
      const result = buildResultFromDecision(false, 45);

      expect(result.success).toBe(false);
      expect(result.completion).toBe(true);
      expect(result.score?.raw).toBe(45);
    });

    it('should handle optional parameters', () => {
      const result = buildResultFromDecision(true);

      expect(result.success).toBe(true);
      expect(result.completion).toBe(true);
      expect(result.score).toBeUndefined();
      expect(result.duration).toBeUndefined();
    });
  });

  describe('convertSecondsToIso8601', () => {
    it('should convert seconds to ISO 8601 duration format', () => {
      expect(convertSecondsToIso8601(0)).toBe('PT0S');
      expect(convertSecondsToIso8601(30)).toBe('PT30S');
      expect(convertSecondsToIso8601(60)).toBe('PT1M');
      expect(convertSecondsToIso8601(90)).toBe('PT1M30S');
      expect(convertSecondsToIso8601(3600)).toBe('PT1H');
      expect(convertSecondsToIso8601(3661)).toBe('PT1H1M1S');
      expect(convertSecondsToIso8601(7325)).toBe('PT2H2M5S');
    });
  });

  describe('buildContext', () => {
    it('should build context with all extensions', () => {
      const context = buildContext({
        tenantId: 'tenant-123',
        sessionId: 'session-456',
        campaignId: 'campaign-789',
        campaignSessionId: 'campaign-session-001',
        competencyDomain: 'phishing-detection',
        difficultyLevel: 'hard',
      });

      expect(context.extensions).toEqual({
        'https://the-dmz.example.com/xapi/extensions/tenant': 'tenant-123',
        'https://the-dmz.example.com/xapi/extensions/campaign': 'campaign-789',
        'https://the-dmz.example.com/xapi/extensions/competency-domain': 'phishing-detection',
        'https://the-dmz.example.com/xapi/extensions/difficulty-level': 'hard',
      });
      expect(context.registration).toBe('session-456');
      expect(context.contextActivities?.grouping).toHaveLength(1);
    });

    it('should handle minimal context', () => {
      const context = buildContext();

      expect(context.extensions).toEqual({});
      expect(context.contextActivities).toBeUndefined();
    });
  });

  describe('generateXapiStatement', () => {
    it('should generate a complete xAPI statement', () => {
      const actor = buildActorFromUser('user@example.com', 'Test User');
      const verb = XAPI_VERBS.COMPLETED;
      const object = buildActivityFromGameContent('activity-001', 'Test Activity');
      const result = buildResultFromDecision(true, 100);
      const context = buildContext({ tenantId: 'tenant-123' });

      const statement = generateXapiStatement(actor, verb, object, {
        result,
        context,
        version: '1.0.3',
      });

      expect(statement.id).toBeDefined();
      expect(statement.actor).toEqual(actor);
      expect(statement.verb).toEqual(verb);
      expect(statement.object).toEqual(object);
      expect(statement.result).toEqual(result);
      expect(statement.context).toBeDefined();
      expect(statement.timestamp).toBeDefined();
      expect(statement.stored).toBeDefined();
    });

    it('should generate statement with default version 1.0.3', () => {
      const actor = buildActorFromUser('user@example.com', 'Test User');
      const verb = XAPI_VERBS.PASSED;
      const object = buildActivityFromGameContent('activity-001', 'Test Activity');

      const statement = generateXapiStatement(actor, verb, object);

      expect(statement.id).toBeDefined();
    });

    it('should include authority for version 2.0', () => {
      const actor = buildActorFromUser('user@example.com', 'Test User');
      const verb = XAPI_VERBS.LAUNCHED;
      const object = buildActivityFromGameContent('activity-001', 'Test Activity');

      const statement = generateXapiStatement(actor, verb, object, { version: '2.0' });

      expect(statement.authority).toBeDefined();
      expect(statement.authority?.mbox).toBe('mailto:system@the-dmz.example.com');
      expect(statement.authority?.name).toBe('The DMZ System');
    });

    it('should use provided timestamp', () => {
      const actor = buildActorFromUser('user@example.com', 'Test User');
      const verb = XAPI_VERBS.EXPERIENCED;
      const object = buildActivityFromGameContent('activity-001', 'Test Activity');
      const timestamp = new Date('2024-01-15T10:30:00Z');

      const statement = generateXapiStatement(actor, verb, object, { timestamp });

      expect(statement.timestamp).toBe('2024-01-15T10:30:00.000Z');
      expect(statement.stored).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('convertStatementToJson', () => {
    it('should convert statement to JSON-serializable object', () => {
      const actor = buildActorFromUser('user@example.com', 'Test User');
      const verb = XAPI_VERBS.COMPLETED;
      const object = buildActivityFromGameContent('activity-001', 'Test Activity');
      const result = buildResultFromDecision(true, 100);
      const context = buildContext({ tenantId: 'tenant-123' });

      const statement = generateXapiStatement(actor, verb, object, { result, context });
      const json = convertStatementToJson(statement);

      expect(json['id']).toBe(statement.id);
      expect(json['actor']).toEqual(statement.actor);
      expect(json['verb']).toEqual(statement.verb);
      expect(json['object']).toEqual(statement.object);
      expect(json['result']).toEqual(statement.result);
      expect(json['context']).toEqual(statement.context);
      expect(json['timestamp']).toBe(statement.timestamp);
    });
  });
});

describe('xAPI Verbs', () => {
  describe('XAPI_VERBS', () => {
    it('should contain all required verbs', () => {
      expect(XAPI_VERBS.COMPLETED).toBeDefined();
      expect(XAPI_VERBS.PASSED).toBeDefined();
      expect(XAPI_VERBS.EXPERIENCED).toBeDefined();
      expect(XAPI_VERBS.ANSWERED).toBeDefined();
      expect(XAPI_VERBS.ATTEMPTED).toBeDefined();
      expect(XAPI_VERBS.CORRECT).toBeDefined();
      expect(XAPI_VERBS.INCORRECT).toBeDefined();
      expect(XAPI_VERBS.LAUNCHED).toBeDefined();
      expect(XAPI_VERBS.INITIALIZED).toBeDefined();
      expect(XAPI_VERBS.TERMINATED).toBeDefined();
    });

    it('should have valid verb IDs', () => {
      const verbs = Object.values(XAPI_VERBS);
      verbs.forEach((verb) => {
        expect(verb.id).toMatch(/^https?:\/\//);
        expect(verb.display).toBeDefined();
        expect(Object.keys(verb.display).length).toBeGreaterThan(0);
      });
    });
  });

  describe('DMZ_VERB_MAP', () => {
    it('should map SESSION_STARTED to LAUNCHED', () => {
      expect(DMZ_VERB_MAP[GAME_EVENT_TYPES.SESSION_STARTED]).toBe('LAUNCHED');
    });

    it('should map SESSION_COMPLETED to COMPLETED', () => {
      expect(DMZ_VERB_MAP[GAME_EVENT_TYPES.SESSION_COMPLETED]).toBe('COMPLETED');
    });

    it('should map EMAIL_DECISION_SUBMITTED to ATTEMPTED', () => {
      expect(DMZ_VERB_MAP[GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED]).toBe('ATTEMPTED');
    });

    it('should map BREACH_RANSOM_REFUSED to INCORRECT', () => {
      expect(DMZ_VERB_MAP[GAME_EVENT_TYPES.BREACH_RANSOM_REFUSED]).toBe('INCORRECT');
    });

    it('should map some events to null', () => {
      expect(DMZ_VERB_MAP[GAME_EVENT_TYPES.CONSEQUENCES_APPLIED]).toBeNull();
      expect(DMZ_VERB_MAP[GAME_EVENT_TYPES.FUNDS_MODIFIED]).toBeNull();
    });
  });

  describe('getVerbFromMapping', () => {
    it('should return verb for mapped game event', () => {
      const verb = getVerbFromMapping(GAME_EVENT_TYPES.SESSION_STARTED);
      expect(verb).toEqual(XAPI_VERBS.LAUNCHED);
    });

    it('should return null for unmapped event', () => {
      const verb = getVerbFromMapping(GAME_EVENT_TYPES.CONSEQUENCES_APPLIED);
      expect(verb).toBeNull();
    });
  });

  describe('isCorrectDecisionVerb', () => {
    it('should return true for correct verbs', () => {
      expect(isCorrectDecisionVerb(XAPI_VERBS.CORRECT)).toBe(true);
      expect(isCorrectDecisionVerb(XAPI_VERBS.PASSED)).toBe(true);
    });

    it('should return false for incorrect verbs', () => {
      expect(isCorrectDecisionVerb(XAPI_VERBS.INCORRECT)).toBe(false);
      expect(isCorrectDecisionVerb(XAPI_VERBS.ATTEMPTED)).toBe(false);
    });
  });

  describe('isIncorrectDecisionVerb', () => {
    it('should return true for incorrect verbs', () => {
      expect(isIncorrectDecisionVerb(XAPI_VERBS.INCORRECT)).toBe(true);
    });

    it('should return false for correct verbs', () => {
      expect(isIncorrectDecisionVerb(XAPI_VERBS.CORRECT)).toBe(false);
      expect(isIncorrectDecisionVerb(XAPI_VERBS.PASSED)).toBe(false);
    });
  });
});

describe('xAPI Statement Structure', () => {
  describe('xAPI 1.0.3 Compliance', () => {
    it('should generate valid 1.0.3 statement structure', () => {
      const actor = buildActorFromUser('user@example.com', 'Test User');
      const verb = XAPI_VERBS.COMPLETED;
      const object = buildActivityFromGameContent('course-001', 'Phishing Detection');

      const statement = generateXapiStatement(actor, verb, object, { version: '1.0.3' });

      expect(statement.actor.objectType).toBe('Agent');
      expect(statement.actor.mbox).toMatch(/^mailto:/);
      expect(statement.verb.id).toBeDefined();
      expect(statement.verb.display).toBeDefined();
      expect(statement.object.objectType).toBe('Activity');
      expect(statement.object.id).toMatch(/^https?:\/\//);
      expect(statement.timestamp).toBeDefined();
      expect(statement.stored).toBeDefined();
    });
  });

  describe('xAPI 2.0 Compliance', () => {
    it('should include authority in 2.0 statements', () => {
      const actor = buildActorFromUser('user@example.com', 'Test User');
      const verb = XAPI_VERBS.LAUNCHED;
      const object = buildActivityFromGameContent('course-001', 'Phishing Detection');

      const statement = generateXapiStatement(actor, verb, object, { version: '2.0' });

      expect(statement.authority).toBeDefined();
      expect(statement.authority?.objectType).toBe('Agent');
    });
  });

  describe('Custom Extensions', () => {
    it('should include custom extensions in context', () => {
      const actor = buildActorFromUser('user@example.com', 'Test User');
      const verb = XAPI_VERBS.COMPLETED;
      const object = buildActivityFromGameContent('course-001', 'Phishing Detection');
      const context = buildContext({
        tenantId: 'tenant-123',
        campaignId: 'campaign-456',
        competencyDomain: 'email-security',
        difficultyLevel: 'medium',
      });

      const statement = generateXapiStatement(actor, verb, object, { context });

      expect(statement.context?.extensions).toBeDefined();
      expect(
        statement.context?.extensions?.['https://the-dmz.example.com/xapi/extensions/tenant'],
      ).toBe('tenant-123');
      expect(
        statement.context?.extensions?.['https://the-dmz.example.com/xapi/extensions/campaign'],
      ).toBe('campaign-456');
      expect(
        statement.context?.extensions?.[
          'https://the-dmz.example.com/xapi/extensions/competency-domain'
        ],
      ).toBe('email-security');
      expect(
        statement.context?.extensions?.[
          'https://the-dmz.example.com/xapi/extensions/difficulty-level'
        ],
      ).toBe('medium');
    });
  });
});

describe('Statement Emission Triggers', () => {
  it('should map session start events', () => {
    expect(getVerbFromMapping(GAME_EVENT_TYPES.SESSION_STARTED)?.id).toBe(
      'http://adlnet.gov/expapi/verbs/launched',
    );
  });

  it('should map session end events', () => {
    expect(getVerbFromMapping(GAME_EVENT_TYPES.SESSION_COMPLETED)?.id).toBe(
      'http://adlnet.gov/expapi/verbs/completed',
    );
  });

  it('should map email decision events', () => {
    expect(getVerbFromMapping(GAME_EVENT_TYPES.EMAIL_DECISION_SUBMITTED)?.id).toBe(
      'http://adlnet.gov/expapi/verbs/attempted',
    );
  });

  it('should map verification events', () => {
    expect(getVerbFromMapping(GAME_EVENT_TYPES.VERIFICATION_PACKET_GENERATED)?.id).toBe(
      'http://adlnet.gov/expapi/verbs/answered',
    );
  });

  it('should map incident events', () => {
    expect(getVerbFromMapping(GAME_EVENT_TYPES.INCIDENT_RESOLVED)?.id).toBe(
      'http://adlnet.gov/expapi/verbs/completed',
    );
  });

  it('should map facility upgrade events', () => {
    expect(getVerbFromMapping(GAME_EVENT_TYPES.FACILITY_TIER_UPGRADED)?.id).toBe(
      'http://adlnet.gov/expapi/verbs/passed',
    );
  });
});

describe('buildStatementFromRow', () => {
  const createMockRow = (overrides: Partial<XapiStatement> = {}): XapiStatement =>
    ({
      id: 'stmt-id-1',
      tenantId: 'tenant-1',
      statementId: 'stmt-uuid-1',
      statementVersion: '1.0.3',
      actorMbox: 'mailto:test@example.com',
      actorName: 'Test User',
      verbId: 'http://adlnet.gov/expapi/verbs/completed',
      verbDisplay: { 'en-US': 'completed' },
      objectId: 'https://the-dmz.example.com/xapi/activities/test',
      objectType: 'Activity',
      objectName: null,
      objectDescription: null,
      resultScore: null,
      resultSuccess: null,
      resultCompletion: null,
      resultDuration: null,
      contextTenant: null,
      contextSession: null,
      contextCampaign: null,
      contextCampaignSession: null,
      contextExtensions: null,
      storedAt: new Date('2024-01-15T10:30:00Z'),
      sentAt: null,
      lrsEndpoint: null,
      lrsStatus: 'pending',
      lrsError: null,
      retryCount: 0,
      archived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as XapiStatement;

  it('should build statement with required fields only', () => {
    const row = createMockRow();
    const result = buildStatementFromRow(row);

    expect(result.id).toBe('stmt-uuid-1');
    expect(result.actor).toEqual({
      objectType: 'Agent',
      mbox: 'mailto:test@example.com',
      name: 'Test User',
    });
    expect(result.verb).toEqual({
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'en-US': 'completed' },
    });
    expect(result.object).toEqual({
      objectType: 'Activity',
      id: 'https://the-dmz.example.com/xapi/activities/test',
    });
    expect(result.timestamp).toBe('2024-01-15T10:30:00.000Z');
    expect(result.stored).toBe('2024-01-15T10:30:00.000Z');
    expect(result.object.definition).toBeUndefined();
    expect(result.result).toBeUndefined();
  });

  it('should include object.definition.name when objectName is present', () => {
    const row = createMockRow({ objectName: 'Email Triage Training' });
    const result = buildStatementFromRow(row);

    expect(result.object.definition).toBeDefined();
    expect(result.object.definition?.name).toEqual({ 'en-US': 'Email Triage Training' });
  });

  it('should include object.definition.description when objectDescription is present', () => {
    const row = createMockRow({ objectDescription: 'Learn to identify phishing emails' });
    const result = buildStatementFromRow(row);

    expect(result.object.definition).toBeDefined();
    expect(result.object.definition?.description).toEqual({
      'en-US': 'Learn to identify phishing emails',
    });
  });

  it('should include object.definition with both name and description when both are present', () => {
    const row = createMockRow({
      objectName: 'Email Triage Training',
      objectDescription: 'Learn to identify phishing emails',
    });
    const result = buildStatementFromRow(row);

    expect(result.object.definition?.name).toEqual({ 'en-US': 'Email Triage Training' });
    expect(result.object.definition?.description).toEqual({
      'en-US': 'Learn to identify phishing emails',
    });
  });

  it('should include result.score when resultScore is present', () => {
    const row = createMockRow({ resultScore: 85 });
    const result = buildStatementFromRow(row);

    expect(result.result).toBeDefined();
    expect(result.result?.score).toEqual({
      raw: 85,
      min: 0,
      max: 100,
      scaled: 0.85,
    });
  });

  it('should include result.success when resultSuccess is present', () => {
    const row = createMockRow({ resultSuccess: true });
    const result = buildStatementFromRow(row);

    expect(result.result).toBeDefined();
    expect(result.result?.success).toBe(true);
  });

  it('should include result.completion when resultCompletion is present along with resultScore', () => {
    const row = createMockRow({ resultScore: 50, resultCompletion: true });
    const result = buildStatementFromRow(row);

    expect(result.result).toBeDefined();
    expect(result.result?.completion).toBe(true);
  });

  it('should include result.duration when resultDuration is present along with resultScore', () => {
    const row = createMockRow({ resultScore: 50, resultDuration: 120 });
    const result = buildStatementFromRow(row);

    expect(result.result).toBeDefined();
    expect(result.result?.duration).toBe('PT2M');
  });

  it('should include result object when resultScore or resultSuccess is non-null', () => {
    const rowWithScore = createMockRow({ resultScore: 50 });
    expect(buildStatementFromRow(rowWithScore).result).toBeDefined();

    const rowWithSuccess = createMockRow({ resultSuccess: false });
    expect(buildStatementFromRow(rowWithSuccess).result).toBeDefined();
  });

  it('should not include result object when only resultCompletion is set', () => {
    const row = createMockRow({ resultScore: null, resultSuccess: null, resultCompletion: true });
    const result = buildStatementFromRow(row);

    expect(result.result).toBeUndefined();
  });

  it('should not include result object when only resultDuration is set', () => {
    const row = createMockRow({ resultScore: null, resultSuccess: null, resultDuration: 60 });
    const result = buildStatementFromRow(row);

    expect(result.result).toBeUndefined();
  });

  it('should not include result object when resultScore and resultSuccess are null', () => {
    const row = createMockRow({
      resultScore: null,
      resultSuccess: null,
      resultCompletion: null,
      resultDuration: null,
    });
    const result = buildStatementFromRow(row);

    expect(result.result).toBeUndefined();
  });

  it('should calculate scaled score correctly', () => {
    const row = createMockRow({ resultScore: 0 });
    expect(buildStatementFromRow(row).result?.score?.scaled).toBe(0);

    const row100 = createMockRow({ resultScore: 100 });
    expect(buildStatementFromRow(row100).result?.score?.scaled).toBe(1);
  });
});

describe('buildStatusUpdate', () => {
  it('should return updatedAt, lrsStatus=sent, and sentAt when success is true', () => {
    const result = buildStatusUpdate({ success: true });

    expect(result['updatedAt']).toBeInstanceOf(Date);
    expect(result['lrsStatus']).toBe('sent');
    expect(result['sentAt']).toBeInstanceOf(Date);
    expect(result['lrsError']).toBeUndefined();
    expect(result['retryCount']).toBeUndefined();
  });

  it('should return updatedAt, lrsStatus=failed, lrsError, and retryCount when success is false', () => {
    const result = buildStatusUpdate({ success: false, error: 'Connection timeout' });

    expect(result['updatedAt']).toBeInstanceOf(Date);
    expect(result['lrsStatus']).toBe('failed');
    expect(result['lrsError']).toBe('Connection timeout');
    expect(result['retryCount']).toBeDefined();
  });

  it('should return updatedAt, lrsStatus=failed when success is false without error', () => {
    const result = buildStatusUpdate({ success: false });

    expect(result['updatedAt']).toBeInstanceOf(Date);
    expect(result['lrsStatus']).toBe('failed');
    expect(result['lrsError']).toBeUndefined();
  });
});
