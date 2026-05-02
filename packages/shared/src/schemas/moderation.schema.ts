import { z } from 'zod';

export const reportTypeSchema = z.enum(['harassment', 'spam', 'cheating', 'content', 'other']);
export type ReportType = z.infer<typeof reportTypeSchema>;

export const reportStatusSchema = z.enum([
  'pending',
  'under_review',
  'resolved_actioned',
  'resolved_dismissed',
]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const reportResolutionSchema = z.enum([
  'warning',
  'mute',
  'content_removal',
  'restriction',
  'dismissed',
]);
export type ReportResolution = z.infer<typeof reportResolutionSchema>;
