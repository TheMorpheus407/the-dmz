import { z } from 'zod';

import { factionSchema, type Faction } from '../schemas/content.schema.js';

export { factionSchema };
export type { Faction };

export const dialogSpeakerSchema = z.enum(['morpheus', 'sysop7', 'faction']);

export type DialogSpeaker = z.infer<typeof dialogSpeakerSchema>;

export const dialogChoiceRequirementSchema = z.object({
  trustScore: z.number().int().min(0).optional(),
  credits: z.number().int().min(0).optional(),
  flags: z.array(z.string()).optional(),
});

export type DialogChoiceRequirement = z.infer<typeof dialogChoiceRequirementSchema>;

export const dialogChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  nextNodeId: z.string(),
  requirements: dialogChoiceRequirementSchema.optional(),
});

export type DialogChoice = z.infer<typeof dialogChoiceSchema>;

export const gameEffectSchema = z.object({
  type: z.enum(['flag', 'trust', 'credits', 'threat', 'event']),
  value: z.union([z.string(), z.number(), z.boolean()]),
  target: z.string().optional(),
});

export type GameEffect = z.infer<typeof gameEffectSchema>;

export const dialogNodeSchema = z.object({
  id: z.string(),
  speaker: dialogSpeakerSchema,
  factionId: factionSchema.optional(),
  text: z.string(),
  choices: z.array(dialogChoiceSchema).optional(),
  effects: z.array(gameEffectSchema).optional(),
  next: z.string().optional(),
});

export type DialogNode = z.infer<typeof dialogNodeSchema>;

export const dialogTreeSchema = z.object({
  id: z.string(),
  name: z.string(),
  startNodeId: z.string(),
  nodes: z.record(z.string(), dialogNodeSchema),
});

export type DialogTree = z.infer<typeof dialogTreeSchema>;

export const dialogHistoryEntrySchema = z.object({
  dialogId: z.string(),
  nodeId: z.string(),
  speaker: dialogSpeakerSchema,
  text: z.string(),
  choiceId: z.string().optional(),
  timestamp: z.string(),
});

export type DialogHistoryEntry = z.infer<typeof dialogHistoryEntrySchema>;
