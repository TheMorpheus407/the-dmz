import type { Job } from 'bullmq';
import type { GenerateEmailJobData } from '../queues.js';

export interface GenerateEmailProcessorResult {
  success: boolean;
  emailId?: string;
  templateId?: string;
  quality?: number;
  difficulty?: number;
  error?: string;
}

export type GenerateEmailProcessor = (
  job: Job<GenerateEmailJobData>,
) => Promise<GenerateEmailProcessorResult>;

export function createGenerateEmailProcessor(
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
): GenerateEmailProcessor {
  return async (job: Job<GenerateEmailJobData>): Promise<GenerateEmailProcessorResult> => {
    const { tenantId, difficulty, faction, attackType, metadata } = job.data;

    try {
      const result = await generateEmailFn({
        tenantId,
        difficulty,
        ...(faction ? { faction } : {}),
        ...(attackType ? { attackType } : {}),
        ...(metadata ? { metadata } : {}),
      });

      const metadataIntent = metadata?.['intent'];
      const intent: 'legitimate' | 'malicious' | 'ambiguous' =
        metadataIntent === 'legitimate'
          ? 'legitimate'
          : metadataIntent === 'ambiguous'
            ? 'ambiguous'
            : 'malicious';

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

      return {
        success: true,
        emailId: result.emailId,
        templateId: result.templateId,
        quality: result.quality,
        difficulty,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        difficulty,
        error: errorMessage,
      };
    }
  };
}
