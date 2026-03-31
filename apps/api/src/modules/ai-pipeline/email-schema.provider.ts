import * as AjvFormatsModule from 'ajv-formats';
import * as AjvModule from 'ajv';

import type { AnySchemaObject, ValidateFunction } from 'ajv';
import type { FormatsPlugin } from 'ajv-formats';

const AjvConstructor = AjvModule.default as unknown as typeof AjvModule.Ajv;
const addFormats = AjvFormatsModule.default as unknown as FormatsPlugin;

const ajv = new AjvConstructor({
  allErrors: true,
  allowUnionTypes: true,
  strict: false,
  validateFormats: true,
});

const validatorCache = new Map<string, ValidateFunction>();

addFormats(ajv);

export const getAjvInstance = (): typeof ajv => ajv;

export const getSchemaValidator = (schema: Record<string, unknown>): ValidateFunction => {
  const cacheKey = JSON.stringify(schema);
  const cachedValidator = validatorCache.get(cacheKey);
  if (cachedValidator) {
    return cachedValidator;
  }

  const validator = ajv.compile(schema as AnySchemaObject);
  validatorCache.set(cacheKey, validator);

  return validator;
};
