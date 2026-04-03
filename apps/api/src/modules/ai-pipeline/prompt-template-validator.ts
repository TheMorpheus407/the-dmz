import { badRequest } from '../../shared/middleware/error-handler.js';

import { assertCategoryOutputSchema } from './output-parser.service.js';

import type { PromptTemplateInput, PromptTemplateUpdate } from './ai-pipeline.types.js';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const hasConfiguredOutputSchema = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).length > 0;

const assertSemanticVersion = (version: string): void => {
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)) {
    throw badRequest('Prompt template version must use semantic versioning (major.minor.patch)', {
      field: 'version',
    });
  }
};

export const validatePromptTemplateInput = (
  input: PromptTemplateInput | PromptTemplateUpdate,
  options: { requireOutputSchema: boolean },
  category?: PromptTemplateInput['category'],
): void => {
  if (input.version !== undefined) {
    assertSemanticVersion(input.version);
  }

  if (options.requireOutputSchema && input.outputSchema === undefined) {
    throw badRequest(
      'Prompt template outputSchema is required and must define at least one schema rule',
      { field: 'outputSchema' },
    );
  }

  if (input.outputSchema !== undefined) {
    if (!category) {
      throw badRequest('Prompt template category is required when validating outputSchema', {
        field: 'category',
      });
    }

    if (!hasConfiguredOutputSchema(input.outputSchema)) {
      throw badRequest('Prompt template outputSchema must define at least one schema rule', {
        field: 'outputSchema',
      });
    }

    try {
      assertCategoryOutputSchema(category, input.outputSchema);
    } catch (error) {
      throw badRequest(
        error instanceof Error ? error.message : 'Prompt template outputSchema is invalid',
        { field: 'outputSchema' },
      );
    }
  }
};

export const toPromptTemplateConflictDetails = (details: {
  promptTemplateId?: string | undefined;
  name?: string | undefined;
  version?: string | undefined;
}): {
  promptTemplateId?: string;
  name?: string;
  version?: string;
} => ({
  ...(details.promptTemplateId !== undefined ? { promptTemplateId: details.promptTemplateId } : {}),
  ...(details.name !== undefined ? { name: details.name } : {}),
  ...(details.version !== undefined ? { version: details.version } : {}),
});
