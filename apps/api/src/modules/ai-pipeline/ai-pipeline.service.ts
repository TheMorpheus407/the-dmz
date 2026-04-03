import { badRequest } from '../../shared/middleware/error-handler.js';

import {
  createAiPipelineOrchestrator,
  createDefaultPromptRepository,
} from './ai-pipeline-orchestrator.js';
import { createClaudeClient } from './claude-client.service.js';
import {
  type AiPipelineService,
  type CreateAiPipelineServiceOptions,
} from './ai-pipeline.types.js';
import { isPromptTemplateCategory } from './prompt-template-category.js';
import {
  validatePromptTemplateInput,
  toPromptTemplateConflictDetails,
  hasConfiguredOutputSchema,
} from './prompt-template-validator.js';
import { rethrowPromptTemplateWriteError } from './prompt-template-error-handler.js';

export const createAiPipelineService = (
  options: CreateAiPipelineServiceOptions,
): AiPipelineService => {
  const promptRepository =
    options.promptTemplateRepository ?? createDefaultPromptRepository(options.config);
  const claudeClient =
    options.claudeClient ??
    createClaudeClient({
      config: options.config,
      logger: options.logger ?? {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

  const orchestrator = createAiPipelineOrchestrator({
    ...options,
    promptTemplateRepository: promptRepository,
    claudeClient,
  });

  const generateContent = orchestrator.generateContent;

  return {
    listPromptTemplates: (tenantId, filters) => promptRepository.list(tenantId, filters),
    getPromptTemplate: (tenantId, id) => promptRepository.getById(tenantId, id),
    createPromptTemplate: (tenantId, input) => {
      validatePromptTemplateInput(input, { requireOutputSchema: true }, input.category);
      return promptRepository.create(tenantId, input).catch((error: unknown) =>
        rethrowPromptTemplateWriteError(
          error,
          tenantId,
          toPromptTemplateConflictDetails({
            name: input.name,
            version: input.version,
          }),
        ),
      );
    },
    updatePromptTemplate: async (tenantId, id, input) => {
      const shouldValidateSchema = input.outputSchema !== undefined || input.category !== undefined;
      const existingTemplate = shouldValidateSchema
        ? await promptRepository.getById(tenantId, id)
        : undefined;
      const validationCategory =
        input.category ??
        (isPromptTemplateCategory(existingTemplate?.category)
          ? existingTemplate.category
          : undefined);
      const existingOutputSchema =
        existingTemplate !== undefined && hasConfiguredOutputSchema(existingTemplate.outputSchema)
          ? existingTemplate.outputSchema
          : undefined;

      if (
        shouldValidateSchema &&
        existingTemplate !== undefined &&
        validationCategory === undefined
      ) {
        throw badRequest('Prompt template category must be a supported AI pipeline category', {
          field: 'category',
        });
      }

      if (input.outputSchema !== undefined && validationCategory === undefined) {
        return promptRepository.update(tenantId, id, input);
      }

      if (
        shouldValidateSchema &&
        existingTemplate !== undefined &&
        input.outputSchema === undefined &&
        existingOutputSchema === undefined
      ) {
        throw badRequest('Prompt template outputSchema must define at least one schema rule', {
          field: 'outputSchema',
        });
      }

      const validationInput =
        shouldValidateSchema && validationCategory !== undefined
          ? {
              ...input,
              ...(input.outputSchema !== undefined
                ? { outputSchema: input.outputSchema }
                : existingOutputSchema !== undefined
                  ? { outputSchema: existingOutputSchema }
                  : {}),
            }
          : input;

      validatePromptTemplateInput(
        validationInput,
        { requireOutputSchema: false },
        validationCategory,
      );
      try {
        return await promptRepository.update(tenantId, id, input);
      } catch (error) {
        return rethrowPromptTemplateWriteError(
          error,
          tenantId,
          toPromptTemplateConflictDetails({
            promptTemplateId: id,
            name: input.name,
            version: input.version,
          }),
        );
      }
    },
    deletePromptTemplate: (tenantId, id) => promptRepository.delete(tenantId, id),
    generateContent,
    generateEmail: (tenantId, userId, request) => generateContent(tenantId, userId, request),
    generateIntelBrief: (tenantId, userId, request) =>
      generateContent(tenantId, userId, {
        ...request,
        category: 'intel_brief',
      }),
    generateScenarioVariation: (tenantId, userId, request) =>
      generateContent(tenantId, userId, {
        ...request,
        category: 'scenario_variation',
      }),
  };
};
