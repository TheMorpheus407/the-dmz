import { describe, expect, it } from 'vitest';

const {
  buildActorFromUser,
  buildActivityFromGameContent,
  buildResultFromDecision,
  generateXapiStatement,
  convertStatementToJson,
  XAPI_VERBS,
  getVerbFromMapping,
  convertSecondsToIso8601,
  buildContext,
} = await import('../xapi.service.js');

describe('xAPI Statement Generation Unit Tests', () => {
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

  import { GAME_EVENT_TYPES } from '@the-dmz/shared';

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
});
