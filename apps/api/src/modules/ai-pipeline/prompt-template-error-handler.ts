import { conflict } from '../../shared/middleware/error-handler.js';

import { isRecord } from './prompt-template-validator.js';

const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';
const PROMPT_TEMPLATE_NAME_VERSION_CONSTRAINT = 'ai_prompt_templates_name_version_idx';

export const isPromptTemplateUniqueViolation = (
  error: unknown,
): error is Record<string, unknown> => {
  if (!isRecord(error)) {
    return false;
  }

  const code = isRecord(error) ? error['code'] : undefined;
  const constraintName = isRecord(error) ? error['constraint_name'] : undefined;
  const constraint = isRecord(error) ? error['constraint'] : undefined;

  if (typeof code !== 'string' || code !== POSTGRES_UNIQUE_VIOLATION_CODE) {
    return false;
  }

  const constraintValue = constraintName ?? constraint;
  return (
    constraintValue === undefined || constraintValue === PROMPT_TEMPLATE_NAME_VERSION_CONSTRAINT
  );
};

export const throwPromptTemplateConflict = (
  tenantId: string,
  details: {
    promptTemplateId?: string;
    name?: string;
    version?: string;
  },
): never => {
  throw conflict('A prompt template with this name and version already exists', {
    resource: 'prompt_template',
    tenantId,
    conflictFields: ['name', 'version'],
    ...(details.promptTemplateId ? { promptTemplateId: details.promptTemplateId } : {}),
    ...(details.name ? { name: details.name } : {}),
    ...(details.version ? { version: details.version } : {}),
  });
};

export const rethrowPromptTemplateWriteError = (
  error: unknown,
  tenantId: string,
  details: {
    promptTemplateId?: string;
    name?: string;
    version?: string;
  },
): never => {
  if (isPromptTemplateUniqueViolation(error)) {
    throwPromptTemplateConflict(tenantId, details);
  }

  throw error;
};
