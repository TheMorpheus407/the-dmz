export type SanitizeValueOptions = {
  skipHtmlFields?: readonly string[];
  enforcePrototypePollution?: boolean;
};

type TraversalContext = {
  path: string[];
  skipHtmlFields: Set<string>;
  enforcePrototypePollution: boolean;
};

const FORBIDDEN_PROTOTYPE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const NOSQL_OPERATOR_KEY_PREFIX = '$';
const NULL_BYTE_PATTERN = /\0/g;
const ENCODED_LT_PATTERN = /&(lt|#0*60|#x0*3c);/gi;
const ENCODED_GT_PATTERN = /&(gt|#0*62|#x0*3e);/gi;
const ENCODED_ANGLE_PATTERN = /&(lt|gt|#0*60|#0*62|#x0*3c|#x0*3e);/i;
const SCRIPT_TAG_PATTERN = /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi;
const HTML_TAG_PATTERN = /<\/?[a-z][\w:-]*(?:\s[^<>]*)?>/gi;
const HTML_LIKE_PATTERN = /<\/?\s*[a-z][^>]*>/i;
const EVENT_HANDLER_ATTRIBUTE_PATTERN = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URI_ATTRIBUTE_PATTERN =
  /\s+(?:href|src|xlink:href|formaction)\s*=\s*(?:(['"])\s*javascript:[\s\S]*?\1|javascript:[^\s>]+)/gi;
const JAVASCRIPT_URI_PREFIX_PATTERN = /^\s*javascript\s*:/i;

export class PrototypePollutionError extends Error {
  public readonly field: string;

  constructor(field: string) {
    super('Prototype pollution attempt detected');
    this.name = 'PrototypePollutionError';
    this.field = field;
  }
}

const normalizeSkipHtmlField = (field: string): string =>
  field
    .split('.')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join('.');

const buildSkipHtmlFieldSet = (skipHtmlFields?: readonly string[]): Set<string> => {
  const normalized = new Set<string>();
  for (const field of skipHtmlFields ?? []) {
    const value = normalizeSkipHtmlField(field);
    if (value.length > 0) {
      normalized.add(value);
    }
  }
  return normalized;
};

const shouldSkipHtmlSanitization = (
  path: readonly string[],
  skipHtmlFields: ReadonlySet<string>,
): boolean => {
  if (path.length === 0 || skipHtmlFields.size === 0) {
    return false;
  }

  const fullPath = path.join('.');
  if (skipHtmlFields.has(fullPath)) {
    return true;
  }

  const leafKey = path[path.length - 1];
  return leafKey !== undefined && skipHtmlFields.has(leafKey);
};

const decodeAngleBracketEntities = (value: string): string =>
  value.replace(ENCODED_LT_PATTERN, '<').replace(ENCODED_GT_PATTERN, '>');

const shouldProcessHtmlLikeString = (value: string): boolean =>
  ENCODED_ANGLE_PATTERN.test(value) || HTML_LIKE_PATTERN.test(value);

const sanitizeHtmlLikeString = (value: string): string => {
  const decoded = decodeAngleBracketEntities(value);
  if (!HTML_LIKE_PATTERN.test(decoded)) {
    return decoded;
  }

  return decoded
    .replace(SCRIPT_TAG_PATTERN, '')
    .replace(JAVASCRIPT_URI_ATTRIBUTE_PATTERN, '')
    .replace(EVENT_HANDLER_ATTRIBUTE_PATTERN, '')
    .replace(HTML_TAG_PATTERN, '');
};

const sanitizeStringValue = (value: string, shouldSkipHtml: boolean): string => {
  const normalized = value.replace(NULL_BYTE_PATTERN, '').trim();
  if (shouldSkipHtml) {
    return normalized;
  }

  const strippedJavascriptUri = normalized.replace(JAVASCRIPT_URI_PREFIX_PATTERN, '').trim();
  if (!shouldProcessHtmlLikeString(strippedJavascriptUri)) {
    return strippedJavascriptUri;
  }

  return sanitizeHtmlLikeString(strippedJavascriptUri).trim();
};

const isObjectValue = (value: unknown): value is object =>
  value !== null && typeof value === 'object';

const getPrototype = (value: object): object | null =>
  Object.getPrototypeOf(value) as object | null;

const isSafeObjectPrototype = (prototype: object | null): boolean => {
  if (prototype === null || prototype === Object.prototype) {
    return true;
  }

  const parentPrototype = getPrototype(prototype);
  if (parentPrototype !== null) {
    return false;
  }

  return (
    Object.getOwnPropertyNames(prototype).length === 0 &&
    Object.getOwnPropertySymbols(prototype).length === 0
  );
};

const isSanitizableObject = (value: unknown): value is Record<string, unknown> => {
  if (!isObjectValue(value) || Array.isArray(value)) {
    return false;
  }

  return isSafeObjectPrototype(getPrototype(value));
};

const createObjectClone = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.create(getPrototype(value)) as Record<string, unknown>;

const buildFieldPath = (path: readonly string[]): string => path.join('.');
const buildPrototypeFieldPath = (path: readonly string[]): string =>
  path.length === 0 ? '__proto__' : `${path.join('.')}.__proto__`;

const hasSuspiciousPrototype = (value: object): boolean => {
  const prototype = getPrototype(value);
  if (prototype === null || isSafeObjectPrototype(prototype)) {
    return false;
  }

  const prototypeParent = getPrototype(prototype);
  if (prototypeParent !== Object.prototype && prototypeParent !== null) {
    return false;
  }

  return (prototype as { constructor?: unknown }).constructor === Object;
};

const sanitizeRecursively = (value: unknown, context: TraversalContext): unknown => {
  if (typeof value === 'string') {
    const skipHtml = shouldSkipHtmlSanitization(context.path, context.skipHtmlFields);
    return sanitizeStringValue(value, skipHtml);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeRecursively(entry, context));
  }

  if (isObjectValue(value) && hasSuspiciousPrototype(value)) {
    if (context.enforcePrototypePollution) {
      throw new PrototypePollutionError(buildPrototypeFieldPath(context.path));
    }

    return value;
  }

  if (isSanitizableObject(value)) {
    const sanitizedObject = createObjectClone(value);

    for (const [key, nestedValue] of Object.entries(value)) {
      if (FORBIDDEN_PROTOTYPE_KEYS.has(key)) {
        if (context.enforcePrototypePollution) {
          throw new PrototypePollutionError(buildFieldPath([...context.path, key]));
        }

        continue;
      }

      if (key.startsWith(NOSQL_OPERATOR_KEY_PREFIX)) {
        continue;
      }

      sanitizedObject[key] = sanitizeRecursively(nestedValue, {
        ...context,
        path: [...context.path, key],
      });
    }

    return sanitizedObject;
  }

  return value;
};

export const sanitizeValue = <T>(value: T, options: SanitizeValueOptions = {}): T =>
  sanitizeRecursively(value, {
    path: [],
    skipHtmlFields: buildSkipHtmlFieldSet(options.skipHtmlFields),
    enforcePrototypePollution: options.enforcePrototypePollution ?? true,
  }) as T;
