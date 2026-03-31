import { describe, expect, it } from 'vitest';

import { getAjvInstance, getSchemaValidator } from '../email-schema.provider.js';

describe('email-schema.provider', () => {
  describe('getAjvInstance', () => {
    it('returns the AJV singleton instance', () => {
      const ajv1 = getAjvInstance();
      const ajv2 = getAjvInstance();

      expect(ajv1).toBe(ajv2);
    });
  });

  describe('getSchemaValidator', () => {
    it('compiles and returns a validator for a schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const validator = getSchemaValidator(schema);

      expect(validator).toBeDefined();
      expect(typeof validator).toBe('function');
    });

    it('caches validators for the same schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      };

      const validator1 = getSchemaValidator(schema);
      const validator2 = getSchemaValidator(schema);

      expect(validator1).toBe(validator2);
    });

    it('validates objects against the schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
        additionalProperties: false,
      };

      const validator = getSchemaValidator(schema);

      expect(validator({ name: 'test' })).toBe(true);
      expect(validator({ name: 'test', age: 25 })).toBe(true);
      expect(validator({})).toBe(false);
      expect(validator({ name: 123 })).toBe(false);
    });
  });
});
