import {
  promptTemplateCategories,
  type PromptTemplateCategory,
} from './prompt-template-category.js';

import type { AppConfig } from '../../config.js';
import type { PromptTemplate } from '../../db/schema/ai/prompt-templates.js';
import type { EventBus } from '../../shared/events/event-types.js';

export const fictionalFactions = [
  'Sovereign Compact',
  'Nexion Industries',
  'Librarians',
  'Hacktivists',
  'Criminal Networks',
] as const;

export const generatablePromptTemplateCategories = [
  'email_phishing',
  'email_legitimate',
  'intel_brief',
  'scenario_variation',
] as const;

export const semanticVersionPattern = '^[0-9]+\\.[0-9]+\\.[0-9]+$';
export const semanticVersionRegex = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export type GeneratablePromptTemplateCategory =
  (typeof generatablePromptTemplateCategories)[number];
export { promptTemplateCategories, type PromptTemplateCategory };

export interface AiPipelineLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface PromptTemplateFilters {
  category?: PromptTemplateCategory;
  name?: string;
  version?: string;
  isActive?: boolean;
  attackType?: string;
  threatLevel?: string;
  difficulty?: number;
  season?: number;
  chapter?: number;
}

export interface PromptTemplateInput {
  name: string;
  category: PromptTemplateCategory;
  description?: string | null;
  attackType?: string | null;
  threatLevel?: string | null;
  difficulty?: number | null;
  season?: number | null;
  chapter?: number | null;
  systemPrompt: string;
  userTemplate: string;
  outputSchema: Record<string, unknown>;
  version: string;
  tokenBudget?: number;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface PromptTemplateUpdate {
  name?: string;
  category?: PromptTemplateCategory;
  description?: string | null;
  attackType?: string | null;
  threatLevel?: string | null;
  difficulty?: number | null;
  season?: number | null;
  chapter?: number | null;
  systemPrompt?: string;
  userTemplate?: string;
  outputSchema?: Record<string, unknown>;
  version?: string;
  tokenBudget?: number;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface PromptAssembly {
  systemPrompt: string;
  userPrompt: string;
  promptHash: string;
}

export type ClaudeTask = 'generation' | 'classification';
export type ClaudeModelAlias = 'sonnet' | 'haiku' | 'opus';

export interface ClaudeCompletionRequest {
  task: ClaudeTask;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  temperature?: number;
  model?: string;
  requestId?: string;
}

export interface UsageMetrics {
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
}

export interface ClaudeCompletionResult extends UsageMetrics {
  text: string;
  model: string;
}

export interface ClaudeClient {
  complete: (request: ClaudeCompletionRequest) => Promise<ClaudeCompletionResult>;
}

export interface SafetyFinding {
  code: string;
  message: string;
  path?: string;
}

export interface SafetyValidationResult {
  ok: boolean;
  flags: string[];
  findings: SafetyFinding[];
}

export interface QualityScoreBreakdown {
  plausibility: number;
  signalClarity: number;
  variety: number;
  pedagogicalValue: number;
  narrativeAlignment: number;
}

export interface QualityScoreResult {
  score: number;
  breakdown: QualityScoreBreakdown;
}

export interface DifficultyClassificationResult {
  difficulty: number;
  source: 'model' | 'heuristic';
  rationale: string;
  usage?: UsageMetrics;
}

export interface ContentGenerationRequest {
  category: GeneratablePromptTemplateCategory;
  templateId?: string;
  templateName?: string;
  contentName?: string;
  threatLevel?: string;
  difficulty?: number;
  faction?: string;
  attackType?: string;
  season?: number;
  chapter?: number;
  language?: string;
  locale?: string;
  context?: Record<string, unknown>;
  isEnterprise?: boolean;
}

export interface PromptTemplateSelectionContext {
  templateId?: string;
  templateName?: string;
  category: GeneratablePromptTemplateCategory;
  attackType?: string;
  threatLevel?: string;
  difficulty?: number;
  season?: number;
  chapter?: number;
}

export type StoredContentKind = 'email' | 'document' | 'scenario' | 'localized';

export interface StoredContentReference {
  kind: StoredContentKind;
  id: string;
}

export type GenerationFailureCategory =
  | 'template_unavailable'
  | 'provider_unavailable'
  | 'provider_error'
  | 'invalid_output'
  | 'safety_rejection';

export interface GeneratedContentResult {
  requestId: string;
  templateId: string;
  templateVersion: string;
  model: string;
  fallbackApplied: boolean;
  failureCategory?: GenerationFailureCategory;
  promptHash: string;
  content: Record<string, unknown>;
  quality: QualityScoreResult;
  difficulty: DifficultyClassificationResult;
  safety: SafetyValidationResult;
  reviewStatus: HumanReviewStatus;
  storedContent: StoredContentReference;
  usage: UsageMetrics;
}

export interface PromptTemplateRepository {
  list: (tenantId: string, filters?: PromptTemplateFilters) => Promise<PromptTemplate[]>;
  getById: (tenantId: string, id: string) => Promise<PromptTemplate | undefined>;
  getActiveForGeneration: (
    tenantId: string,
    selector: PromptTemplateSelectionContext,
  ) => Promise<PromptTemplate | undefined>;
  create: (tenantId: string, input: PromptTemplateInput) => Promise<PromptTemplate>;
  update: (
    tenantId: string,
    id: string,
    input: PromptTemplateUpdate,
  ) => Promise<PromptTemplate | undefined>;
  delete: (tenantId: string, id: string) => Promise<boolean>;
  recordGenerationLog: (entry: {
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
  }) => Promise<void>;
}

export interface ContentGateway {
  createEmailTemplate: (
    tenantId: string,
    input: {
      name: string;
      subject: string;
      body: string;
      fromName?: string | null;
      fromEmail?: string | null;
      replyTo?: string | null;
      contentType: string;
      difficulty: number;
      faction?: string | null;
      attackType?: string | null;
      threatLevel: string;
      season?: number | null;
      chapter?: number | null;
      language?: string;
      locale?: string;
      metadata?: Record<string, unknown>;
      isAiGenerated?: boolean;
      isActive?: boolean;
    },
  ) => Promise<{ id: string }>;
  listEmailTemplates: (
    tenantId: string,
    filters: {
      contentType?: string;
      difficulty?: number;
      faction?: string;
      attackType?: string;
      threatLevel?: string;
      season?: number;
      chapter?: number;
      isActive?: boolean;
    },
  ) => Promise<
    Array<{
      id: string;
      name: string;
      subject: string;
      body: string;
      fromName?: string | null;
      fromEmail?: string | null;
      replyTo?: string | null;
      contentType?: string;
      difficulty?: number;
      faction?: string | null;
      attackType?: string | null;
      threatLevel?: string;
      season?: number | null;
      chapter?: number | null;
      isAiGenerated?: boolean;
      metadata?: Record<string, unknown>;
    }>
  >;
  listFallbackEmailTemplates: (
    tenantId: string,
    filters: {
      contentType?: string;
      difficulty?: number;
      faction?: string;
      attackType?: string;
      threatLevel?: string;
      season?: number;
      chapter?: number;
      isActive?: boolean;
    },
  ) => Promise<
    Array<{
      id: string;
      name: string;
      subject: string;
      body: string;
      fromName?: string | null;
      fromEmail?: string | null;
      replyTo?: string | null;
      contentType?: string;
      difficulty?: number;
      faction?: string | null;
      attackType?: string | null;
      threatLevel?: string;
      season?: number | null;
      chapter?: number | null;
      isAiGenerated?: boolean;
      metadata?: Record<string, unknown>;
    }>
  >;
  createDocumentTemplate: (
    tenantId: string,
    input: {
      name: string;
      documentType: string;
      title: string;
      content: string;
      difficulty?: number | null;
      faction?: string | null;
      season?: number | null;
      chapter?: number | null;
      language?: string;
      locale?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    },
  ) => Promise<{ id: string }>;
  createScenario: (
    tenantId: string,
    input: {
      name: string;
      description?: string | null;
      difficulty: number;
      faction?: string | null;
      season?: number | null;
      chapter?: number | null;
      language?: string;
      locale?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    },
  ) => Promise<{ id: string }>;
}

export interface AiPipelineService {
  listPromptTemplates: (
    tenantId: string,
    filters?: PromptTemplateFilters,
  ) => Promise<PromptTemplate[]>;
  getPromptTemplate: (tenantId: string, id: string) => Promise<PromptTemplate | undefined>;
  createPromptTemplate: (tenantId: string, input: PromptTemplateInput) => Promise<PromptTemplate>;
  updatePromptTemplate: (
    tenantId: string,
    id: string,
    input: PromptTemplateUpdate,
  ) => Promise<PromptTemplate | undefined>;
  deletePromptTemplate: (tenantId: string, id: string) => Promise<boolean>;
  generateContent: (
    tenantId: string,
    userId: string,
    request: ContentGenerationRequest,
  ) => Promise<GeneratedContentResult>;
  generateEmail: (
    tenantId: string,
    userId: string,
    request: Omit<ContentGenerationRequest, 'category'> & {
      category: Extract<GeneratablePromptTemplateCategory, 'email_phishing' | 'email_legitimate'>;
    },
  ) => Promise<GeneratedContentResult>;
  generateIntelBrief: (
    tenantId: string,
    userId: string,
    request: Omit<ContentGenerationRequest, 'category'>,
  ) => Promise<GeneratedContentResult>;
  generateScenarioVariation: (
    tenantId: string,
    userId: string,
    request: Omit<ContentGenerationRequest, 'category'>,
  ) => Promise<GeneratedContentResult>;
}

export interface CreateAiPipelineServiceOptions {
  config: AppConfig;
  eventBus: EventBus;
  logger?: AiPipelineLogger;
  promptTemplateRepository?: PromptTemplateRepository;
  contentGateway?: ContentGateway;
  claudeClient?: ClaudeClient;
  now?: () => Date;
  generateId?: () => string;
  emailPoolLowThreshold?: number;
}

export type HumanReviewTrigger =
  | 'NEW_TEMPLATE_VERSION'
  | 'LOW_CONFIDENCE'
  | 'ENTERPRISE_CAMPAIGN'
  | 'EDGE_CASE_PATTERN';

export interface HumanReviewStatus {
  requiresReview: boolean;
  triggers: HumanReviewTrigger[];
  confidenceScore?: number;
  edgeCasePatterns?: string[];
}

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;
export const DEFAULT_QUALITY_SCORE_THRESHOLD = 0.4;

export const EDGE_CASE_PATTERNS = [
  { pattern: /urgent\s+(?:action|response|attention|request)/i, description: 'Urgency language' },
  {
    pattern: /immediately\s+(?:complete|verify|submit|process)/i,
    description: 'Immediate action language',
  },
  {
    pattern: /suspended?\s+(?:account|access|privilege)/i,
    description: 'Account suspension threat',
  },
  { pattern: /verify\s+(?:your\s+)?identity/i, description: 'Identity verification request' },
  { pattern: /click\s+(?:here|below|the\s+link)/i, description: 'Click directive' },
  { pattern: /password\s+reset/i, description: 'Password reset mention' },
  { pattern: /bank\s+(?:account|transfer|wire)/i, description: 'Financial transaction reference' },
  { pattern: /social\s+security/i, description: 'SSN/PII reference' },
  { pattern: /gift\s+card/i, description: 'Gift card request' },
  { pattern: /wire\s+transfer/i, description: 'Wire transfer request' },
] as const;

export type EdgeCasePattern = (typeof EDGE_CASE_PATTERNS)[number];

export interface SafetyCheckResult {
  ok: boolean;
  flags: string[];
  findings: SafetyFinding[];
  reviewStatus: HumanReviewStatus;
}
