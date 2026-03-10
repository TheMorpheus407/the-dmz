import { and, desc, eq, ilike } from 'drizzle-orm';

import { aiGenerationLog } from '../../shared/database/schema/index.js';
import { promptTemplates, type PromptTemplate } from '../../db/schema/ai/prompt-templates.js';

import type {
  PromptTemplateFilters,
  PromptTemplateInput,
  PromptTemplateSelectionContext,
  PromptTemplateUpdate,
} from './ai-pipeline.types.js';
import type { DB } from '../../shared/database/connection.js';

const normalizeString = (value?: string | null): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
};

const hasContextualSelection = (selector: PromptTemplateSelectionContext): boolean =>
  selector.attackType !== undefined ||
  selector.threatLevel !== undefined ||
  selector.difficulty !== undefined ||
  selector.season !== undefined ||
  selector.chapter !== undefined;

const scoreContextString = (
  templateValue: string | null,
  requestValue: string | undefined,
  exactMatchWeight: number,
): number => {
  const normalizedTemplate = normalizeString(templateValue);
  const normalizedRequest = normalizeString(requestValue);
  if (!normalizedTemplate || !normalizedRequest) {
    return 0;
  }

  return normalizedTemplate === normalizedRequest ? exactMatchWeight : 0;
};

const scoreDifficulty = (
  templateValue: number | null,
  requestValue: number | undefined,
): number => {
  if (templateValue == null || requestValue == null) {
    return 0;
  }

  const distance = Math.abs(templateValue - requestValue);
  return Math.max(0, 20 - distance * 6);
};

const scoreNumericContext = (
  templateValue: number | null,
  requestValue: number | undefined,
  exactMatchWeight: number,
): number => {
  if (templateValue == null || requestValue == null) {
    return 0;
  }

  return templateValue === requestValue ? exactMatchWeight : 0;
};

const matchesRequestedStringContext = (
  templateValue: string | null,
  requestValue: string | undefined,
): boolean => {
  const normalizedTemplate = normalizeString(templateValue);
  const normalizedRequest = normalizeString(requestValue);
  return !normalizedTemplate || !normalizedRequest || normalizedTemplate === normalizedRequest;
};

const matchesRequestedNumericContext = (
  templateValue: number | null,
  requestValue: number | undefined,
): boolean => templateValue == null || requestValue == null || templateValue === requestValue;

const matchesRequestedContext = (
  template: PromptTemplate,
  selector: PromptTemplateSelectionContext,
): boolean =>
  matchesRequestedStringContext(template.attackType, selector.attackType) &&
  matchesRequestedStringContext(template.threatLevel, selector.threatLevel) &&
  matchesRequestedNumericContext(template.season, selector.season) &&
  matchesRequestedNumericContext(template.chapter, selector.chapter);

const countMatchedSelectors = (
  template: PromptTemplate,
  selector: PromptTemplateSelectionContext,
): number => {
  let matchedSelectors = 0;

  if (
    normalizeString(template.attackType) &&
    normalizeString(template.attackType) === normalizeString(selector.attackType)
  ) {
    matchedSelectors += 1;
  }
  if (
    normalizeString(template.threatLevel) &&
    normalizeString(template.threatLevel) === normalizeString(selector.threatLevel)
  ) {
    matchedSelectors += 1;
  }
  if (
    template.difficulty != null &&
    selector.difficulty != null &&
    template.difficulty === selector.difficulty
  ) {
    matchedSelectors += 1;
  }
  if (template.season != null && selector.season != null && template.season === selector.season) {
    matchedSelectors += 1;
  }
  if (
    template.chapter != null &&
    selector.chapter != null &&
    template.chapter === selector.chapter
  ) {
    matchedSelectors += 1;
  }

  return matchedSelectors;
};

const countExtraSelectors = (
  template: PromptTemplate,
  selector: PromptTemplateSelectionContext,
): number =>
  [
    [template.attackType, selector.attackType],
    [template.threatLevel, selector.threatLevel],
    [template.difficulty, selector.difficulty],
    [template.season, selector.season],
    [template.chapter, selector.chapter],
  ].filter(([templateValue, requestValue]) => templateValue != null && requestValue == null).length;

export const selectBestPromptTemplate = (
  candidates: PromptTemplate[],
  selector: PromptTemplateSelectionContext,
): PromptTemplate | undefined => {
  if (selector.templateId) {
    return candidates[0];
  }

  if (selector.templateName && !hasContextualSelection(selector)) {
    return candidates[0];
  }

  const ranked = candidates
    .map((template) => {
      if (!matchesRequestedContext(template, selector)) {
        return undefined;
      }

      const stringScore =
        scoreContextString(template.attackType, selector.attackType, 100) +
        scoreContextString(template.threatLevel, selector.threatLevel, 60);
      const numericScore =
        scoreNumericContext(template.season, selector.season, 30) +
        scoreNumericContext(template.chapter, selector.chapter, 15) +
        scoreDifficulty(template.difficulty, selector.difficulty);

      return {
        template,
        score: stringScore + numericScore,
        matchedSelectors: countMatchedSelectors(template, selector),
        extraSelectors: countExtraSelectors(template, selector),
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        template: PromptTemplate;
        score: number;
        matchedSelectors: number;
        extraSelectors: number;
      } => entry !== undefined,
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.matchedSelectors !== left.matchedSelectors) {
        return right.matchedSelectors - left.matchedSelectors;
      }

      if (left.extraSelectors !== right.extraSelectors) {
        return left.extraSelectors - right.extraSelectors;
      }

      return right.template.updatedAt.getTime() - left.template.updatedAt.getTime();
    });

  return ranked[0]?.template;
};

export const listPromptTemplates = async (
  db: DB,
  tenantId: string,
  filters?: PromptTemplateFilters,
): Promise<PromptTemplate[]> => {
  const conditions = [eq(promptTemplates.tenantId, tenantId)];

  if (filters?.category) {
    conditions.push(eq(promptTemplates.category, filters.category));
  }
  if (filters?.version) {
    conditions.push(eq(promptTemplates.version, filters.version));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(promptTemplates.isActive, filters.isActive));
  }
  if (filters?.attackType) {
    conditions.push(eq(promptTemplates.attackType, filters.attackType));
  }
  if (filters?.threatLevel) {
    conditions.push(eq(promptTemplates.threatLevel, filters.threatLevel));
  }
  if (filters?.difficulty !== undefined) {
    conditions.push(eq(promptTemplates.difficulty, filters.difficulty));
  }
  if (filters?.season !== undefined) {
    conditions.push(eq(promptTemplates.season, filters.season));
  }
  if (filters?.chapter !== undefined) {
    conditions.push(eq(promptTemplates.chapter, filters.chapter));
  }
  if (filters?.name) {
    conditions.push(ilike(promptTemplates.name, `%${filters.name}%`));
  }

  return db
    .select()
    .from(promptTemplates)
    .where(and(...conditions))
    .orderBy(desc(promptTemplates.updatedAt));
};

export const findPromptTemplateById = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<PromptTemplate | undefined> => {
  const [template] = await db
    .select()
    .from(promptTemplates)
    .where(and(eq(promptTemplates.tenantId, tenantId), eq(promptTemplates.id, id)));

  return template;
};

export const findActivePromptTemplate = async (
  db: DB,
  tenantId: string,
  selector: PromptTemplateSelectionContext,
): Promise<PromptTemplate | undefined> => {
  const conditions = [
    eq(promptTemplates.tenantId, tenantId),
    eq(promptTemplates.isActive, true),
    eq(promptTemplates.category, selector.category),
  ];

  if (selector.templateId) {
    conditions.push(eq(promptTemplates.id, selector.templateId));
  }
  if (selector.templateName) {
    conditions.push(eq(promptTemplates.name, selector.templateName));
  }

  const candidates = await db
    .select()
    .from(promptTemplates)
    .where(and(...conditions))
    .orderBy(desc(promptTemplates.updatedAt));

  return selectBestPromptTemplate(candidates, selector);
};

export const createPromptTemplate = async (
  db: DB,
  tenantId: string,
  input: PromptTemplateInput,
): Promise<PromptTemplate> => {
  const [created] = await db
    .insert(promptTemplates)
    .values({
      tenantId,
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      attackType: input.attackType ?? null,
      threatLevel: input.threatLevel ?? null,
      difficulty: input.difficulty ?? null,
      season: input.season ?? null,
      chapter: input.chapter ?? null,
      systemPrompt: input.systemPrompt,
      userTemplate: input.userTemplate,
      outputSchema: input.outputSchema,
      version: input.version,
      tokenBudget: input.tokenBudget ?? 1200,
      metadata: input.metadata ?? {},
      isActive: input.isActive ?? true,
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create prompt template');
  }

  return created;
};

export const updatePromptTemplate = async (
  db: DB,
  tenantId: string,
  id: string,
  input: PromptTemplateUpdate,
): Promise<PromptTemplate | undefined> => {
  const [updated] = await db
    .update(promptTemplates)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.attackType !== undefined ? { attackType: input.attackType } : {}),
      ...(input.threatLevel !== undefined ? { threatLevel: input.threatLevel } : {}),
      ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
      ...(input.season !== undefined ? { season: input.season } : {}),
      ...(input.chapter !== undefined ? { chapter: input.chapter } : {}),
      ...(input.systemPrompt !== undefined ? { systemPrompt: input.systemPrompt } : {}),
      ...(input.userTemplate !== undefined ? { userTemplate: input.userTemplate } : {}),
      ...(input.outputSchema !== undefined ? { outputSchema: input.outputSchema } : {}),
      ...(input.version !== undefined ? { version: input.version } : {}),
      ...(input.tokenBudget !== undefined ? { tokenBudget: input.tokenBudget } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(promptTemplates.tenantId, tenantId), eq(promptTemplates.id, id)))
    .returning();

  return updated;
};

export const deletePromptTemplate = async (
  db: DB,
  tenantId: string,
  id: string,
): Promise<boolean> => {
  const deleted = await db
    .delete(promptTemplates)
    .where(and(eq(promptTemplates.tenantId, tenantId), eq(promptTemplates.id, id)))
    .returning({ id: promptTemplates.id });

  return deleted.length > 0;
};

export const createAiGenerationLogEntry = async (
  db: DB,
  entry: {
    tenantId: string;
    requestId: string;
    promptHash: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    contentType: string;
    status: 'SUCCESS' | 'FAILED' | 'REJECTED';
    errorMessage?: string;
    generationParams?: Record<string, unknown>;
  },
): Promise<void> => {
  const values = {
    tenantId: entry.tenantId,
    requestId: entry.requestId,
    promptHash: entry.promptHash,
    model: entry.model,
    contentType: entry.contentType,
    status: entry.status,
    errorMessage: entry.errorMessage ?? null,
    generationParams: entry.generationParams ?? {},
    ...(entry.inputTokens !== undefined ? { inputTokens: entry.inputTokens } : {}),
    ...(entry.outputTokens !== undefined ? { outputTokens: entry.outputTokens } : {}),
  };

  await db.insert(aiGenerationLog).values(values);
};
