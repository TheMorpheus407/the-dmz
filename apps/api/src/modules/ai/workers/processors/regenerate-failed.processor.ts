import type { Job } from 'bullmq';
import type { RegenerateFailedJobData } from '../queues.js';

export interface RegenerateFailedProcessorResult {
  success: boolean;
  regenerated: number;
  failed: number;
  errors: string[];
}

export type RegenerateFailedProcessor = (
  job: Job<RegenerateFailedJobData>,
) => Promise<RegenerateFailedProcessorResult>;

export function createRegenerateFailedProcessor(
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
  removeFailedEmailFn?: (tenantId: string, emailId: string) => Promise<void>,
): RegenerateFailedProcessor {
  return async (job: Job<RegenerateFailedJobData>): Promise<RegenerateFailedProcessorResult> => {
    const { tenantId, failedEmailIds, difficulty } = job.data;

    const errors: string[] = [];
    let regenerated = 0;
    let failed = 0;

    for (const emailId of failedEmailIds) {
      try {
        const newResult = await generateEmailFn({
          tenantId,
          difficulty: difficulty ?? 2,
          metadata: {
            originalEmailId: emailId,
            regenerated: true,
          },
        });

        const intent: 'legitimate' | 'malicious' | 'ambiguous' = 'malicious';

        await addToPoolFn({
          tenantId,
          emailId: newResult.emailId,
          templateId: newResult.templateId,
          difficulty: difficulty ?? 2,
          quality: newResult.quality,
          intent,
        });

        if (removeFailedEmailFn) {
          try {
            await removeFailedEmailFn(tenantId, emailId);
          } catch {
            // Log but don't fail the job
          }
        }

        regenerated++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Email ${emailId}: ${errorMessage}`);
        failed++;
      }
    }

    return {
      success: failed === 0,
      regenerated,
      failed,
      errors,
    };
  };
}
