import { z } from 'zod';

export const threatLevelSchema = z.enum(['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE']);

export type ThreatLevel = z.infer<typeof threatLevelSchema>;

export const factionSchema = z.enum([
  'Sovereign Compact',
  'Nexion Industries',
  'Librarians',
  'Hacktivists',
  'Criminal Networks',
]);

export type Faction = z.infer<typeof factionSchema>;

export const documentTypeSchema = z.enum([
  'EMAIL',
  'PAW',
  'VERIFICATION_PACKET',
  'THREAT_ASSESSMENT',
  'INCIDENT_LOG',
  'DATA_SALVAGE_CONTRACT',
  'STORAGE_LEASE',
  'UPGRADE_PROPOSAL',
  'BLACKLIST_NOTICE',
  'WHITELIST_EXCEPTION',
  'FACILITY_REPORT',
  'INTELLIGENCE_BRIEF',
  'RANSOM_NOTE',
]);

export type DocumentType = z.infer<typeof documentTypeSchema>;

export const emailTemplateSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    name: z.string().max(255),
    subject: z.string().max(500),
    body: z.string(),
    fromName: z.string().max(255).optional(),
    fromEmail: z.string().max(255).optional(),
    replyTo: z.string().max(255).optional(),
    contentType: z.string().max(50),
    difficulty: z.number().int().min(1).max(5),
    faction: factionSchema.optional(),
    attackType: z.string().max(100).optional(),
    threatLevel: threatLevelSchema,
    season: z.number().int().positive().optional(),
    chapter: z.number().int().positive().optional(),
    language: z.string().max(10).default('en'),
    locale: z.string().max(10).default('en-US'),
    metadata: z.record(z.unknown()).default({}),
    isAiGenerated: z.boolean().default(false),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type EmailTemplate = z.infer<typeof emailTemplateSchema>;

export const emailTemplateListQuerySchema = z
  .object({
    contentType: z.string().optional(),
    difficulty: z.number().int().min(1).max(5).optional(),
    faction: factionSchema.optional(),
    threatLevel: threatLevelSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type EmailTemplateListQuery = z.infer<typeof emailTemplateListQuerySchema>;

export const createEmailTemplateBodySchema = z
  .object({
    name: z.string().max(255),
    subject: z.string().max(500),
    body: z.string(),
    fromName: z.string().max(255).optional(),
    fromEmail: z.string().max(255).optional(),
    replyTo: z.string().max(255).optional(),
    contentType: z.string().max(50),
    difficulty: z.number().int().min(1).max(5),
    faction: factionSchema.optional(),
    attackType: z.string().max(100).optional(),
    threatLevel: threatLevelSchema,
    season: z.number().int().positive().optional(),
    chapter: z.number().int().positive().optional(),
    language: z.string().max(10).default('en'),
    locale: z.string().max(10).default('en-US'),
    metadata: z.record(z.unknown()).optional(),
    isAiGenerated: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type CreateEmailTemplateBody = z.infer<typeof createEmailTemplateBodySchema>;

export const scenarioSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    name: z.string().max(255),
    description: z.string().optional(),
    difficulty: z.number().int().min(1).max(5),
    faction: factionSchema.optional(),
    season: z.number().int().positive().optional(),
    chapter: z.number().int().positive().optional(),
    language: z.string().max(10).default('en'),
    locale: z.string().max(10).default('en-US'),
    metadata: z.record(z.unknown()).default({}),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type Scenario = z.infer<typeof scenarioSchema>;

export const scenarioBeatSchema = z
  .object({
    id: z.string().uuid(),
    scenarioId: z.string().uuid(),
    tenantId: z.string().uuid(),
    beatIndex: z.number().int().min(0),
    dayOffset: z.number().int().min(0),
    name: z.string().max(255),
    description: z.string().optional(),
    emailTemplateId: z.string().uuid().optional(),
    documentType: documentTypeSchema.optional(),
    attackType: z.string().max(100).optional(),
    threatLevel: threatLevelSchema.optional(),
    requiredIndicators: z.array(z.unknown()).default([]),
    optionalIndicators: z.array(z.unknown()).default([]),
    metadata: z.record(z.unknown()).default({}),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type ScenarioBeat = z.infer<typeof scenarioBeatSchema>;

export const scenarioWithBeatsSchema = z
  .object({
    scenario: scenarioSchema,
    beats: z.array(scenarioBeatSchema),
  })
  .strict();

export type ScenarioWithBeats = z.infer<typeof scenarioWithBeatsSchema>;

export const scenarioListQuerySchema = z
  .object({
    difficulty: z.number().int().min(1).max(5).optional(),
    faction: factionSchema.optional(),
    season: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type ScenarioListQuery = z.infer<typeof scenarioListQuerySchema>;

export const documentTemplateSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    name: z.string().max(255),
    documentType: documentTypeSchema,
    title: z.string().max(500),
    content: z.string(),
    difficulty: z.number().int().min(1).max(5).optional(),
    faction: factionSchema.optional(),
    season: z.number().int().positive().optional(),
    chapter: z.number().int().positive().optional(),
    language: z.string().max(10).default('en'),
    locale: z.string().max(10).default('en-US'),
    metadata: z.record(z.unknown()).default({}),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type DocumentTemplate = z.infer<typeof documentTemplateSchema>;

export const documentTemplateListQuerySchema = z
  .object({
    documentType: documentTypeSchema.optional(),
    faction: factionSchema.optional(),
    locale: z.string().max(10).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type DocumentTemplateListQuery = z.infer<typeof documentTemplateListQuerySchema>;

export const localizedContentSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    contentKey: z.string().max(255),
    contentType: z.string().max(50),
    language: z.string().max(10).default('en'),
    locale: z.string().max(10).default('en-US'),
    content: z.string(),
    metadata: z.record(z.unknown()).default({}),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export type LocalizedContent = z.infer<typeof localizedContentSchema>;

export const aiGenerationLogSchema = z
  .object({
    id: z.string().uuid(),
    tenantId: z.string().uuid(),
    requestId: z.string().max(255),
    promptHash: z.string().max(64),
    model: z.string().max(100),
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    contentType: z.string().max(50),
    status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'VALIDATED', 'REJECTED']),
    errorMessage: z.string().optional(),
    generationParams: z.record(z.unknown()).default({}),
    createdAt: z.string().datetime(),
  })
  .strict();

export type AiGenerationLog = z.infer<typeof aiGenerationLogSchema>;

export const emailTemplateListResponseSchema = z
  .object({
    data: z.array(emailTemplateSchema),
  })
  .strict();

export type EmailTemplateListResponse = z.infer<typeof emailTemplateListResponseSchema>;

export const emailTemplateResponseSchema = z
  .object({
    data: emailTemplateSchema,
  })
  .strict();

export type EmailTemplateResponse = z.infer<typeof emailTemplateResponseSchema>;

export const scenarioListResponseSchema = z
  .object({
    data: z.array(scenarioSchema),
  })
  .strict();

export type ScenarioListResponse = z.infer<typeof scenarioListResponseSchema>;

export const scenarioResponseSchema = z
  .object({
    data: scenarioWithBeatsSchema,
  })
  .strict();

export type ScenarioResponse = z.infer<typeof scenarioResponseSchema>;

export const documentTemplateListResponseSchema = z
  .object({
    data: z.array(documentTemplateSchema),
  })
  .strict();

export type DocumentTemplateListResponse = z.infer<typeof documentTemplateListResponseSchema>;

export const documentTemplateResponseSchema = z
  .object({
    data: documentTemplateSchema,
  })
  .strict();

export type DocumentTemplateResponse = z.infer<typeof documentTemplateResponseSchema>;

export const localizedContentResponseSchema = z
  .object({
    data: localizedContentSchema,
  })
  .strict();

export type LocalizedContentResponse = z.infer<typeof localizedContentResponseSchema>;
