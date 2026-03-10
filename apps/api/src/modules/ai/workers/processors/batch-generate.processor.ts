import type { Job } from 'bullmq';
import type { BatchGenerateJobData } from '../queues.js';

export interface BatchGenerateProcessorResult {
  success: boolean;
  generated: number;
  failed: number;
  errors: string[];
}

export type BatchGenerateProcessor = (
  job: Job<BatchGenerateJobData>,
) => Promise<BatchGenerateProcessorResult>;

export function createBatchGenerateProcessor(
  generateEmailFn: (options: {
    tenantId: string;
    difficulty: number;
    faction?: string;
    attackType?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<{
    emailId: string;
    templateId: string;
    quality: number;
  }>,
  addToPoolFn: (options: {
    tenantId: string;
    emailId: string;
    templateId: string;
    difficulty: number;
    quality: number;
    intent: 'legitimate' | 'malicious' | 'ambiguous';
    faction?: string;
    attackType?: string;
  }) => Promise<void>,
  getPoolHealthFn: (tenantId: string) => Promise<Map<number, { needsRefill: boolean }>>,
): BatchGenerateProcessor {
  return async (job: Job<BatchGenerateJobData>): Promise<BatchGenerateProcessorResult> => {
    const { tenantId, difficulties, countPerDifficulty, faction, attackTypes } = job.data;

    const errors: string[] = [];
    let generated = 0;
    let failed = 0;

    const poolHealth = await getPoolHealthFn(tenantId);
    const difficultiesToGenerate = difficulties.filter((difficulty: number) => {
      const health = poolHealth.get(difficulty);
      return health?.needsRefill ?? true;
    });

    if (difficultiesToGenerate.length === 0) {
      return {
        success: true,
        generated: 0,
        failed: 0,
        errors: [],
      };
    }

    for (const difficulty of difficultiesToGenerate) {
      const targetCount = Math.min(
        countPerDifficulty,
        Math.max(0, poolHealth.get(difficulty)?.needsRefill ? 20 : 0),
      );

      for (let i = 0; i < targetCount; i++) {
        const attackTypeIndex = attackTypes
          ? Math.floor(Math.random() * attackTypes.length)
          : undefined;
        const attackType =
          attackTypeIndex !== undefined && attackTypes ? attackTypes[attackTypeIndex] : undefined;

        try {
          const result = await generateEmailFn({
            tenantId,
            difficulty,
            ...(faction ? { faction } : {}),
            ...(attackType ? { attackType } : {}),
          });

          const intent: 'legitimate' | 'malicious' | 'ambiguous' = 'malicious';

          await addToPoolFn({
            tenantId,
            emailId: result.emailId,
            templateId: result.templateId,
            difficulty,
            quality: result.quality,
            intent,
            ...(faction ? { faction } : {}),
            ...(attackType ? { attackType } : {}),
          });

          generated++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Difficulty ${difficulty}: ${errorMessage}`);
          failed++;
        }
      }
    }

    return {
      success: failed === 0,
      generated,
      failed,
      errors,
    };
  };
}
