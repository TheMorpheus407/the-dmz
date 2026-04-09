import { composeEmailBody, composeDocumentBody, deriveDocumentTitle } from './content-builder.js';

import type {
  ContentGateway,
  ContentGenerationRequest,
  GeneratedContentResult,
  StoredContentReference,
  UsageMetrics,
} from './ai-pipeline.types.js';

import { isRecord } from '../../shared/utils/type-guards.js';

type ResolvedRequestContext = Pick<
  ContentGenerationRequest,
  | 'faction'
  | 'attackType'
  | 'threatLevel'
  | 'difficulty'
  | 'season'
  | 'chapter'
  | 'language'
  | 'locale'
>;

export interface StorageOptions {
  tenantId: string;
  requestId: string;
  templateName: string;
  request: ContentGenerationRequest;
  resolvedContext: ResolvedRequestContext;
  content: Record<string, unknown>;
  quality: GeneratedContentResult['quality'];
  difficulty: GeneratedContentResult['difficulty'];
  safety: GeneratedContentResult['safety'];
  model: string;
  fallbackApplied: boolean;
  usage: UsageMetrics;
}

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const mailboxAddressRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const toTitleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const sanitizeMailboxDisplayName = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const normalized = trimmed.replace(/^["']/g, '').replace(/["']$/g, '').replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
};

const parseMailboxHeader = (
  value: unknown,
): {
  address: string | null;
  displayName: string | null;
} => {
  const raw = readString(value);
  if (!raw) {
    return {
      address: null,
      displayName: null,
    };
  }

  const angleMatch = raw.match(/^(.*)<\s*([^<>\s]+@[^<>\s]+)\s*>$/);
  const matchedAddress = angleMatch?.[2];
  if (matchedAddress) {
    return {
      address: matchedAddress.trim(),
      displayName: sanitizeMailboxDisplayName(angleMatch[1]),
    };
  }

  const addressMatch = raw.match(mailboxAddressRegex);
  if (addressMatch?.[0]) {
    return {
      address: addressMatch[0],
      displayName: null,
    };
  }

  return {
    address: null,
    displayName: sanitizeMailboxDisplayName(raw),
  };
};

const deriveSenderNameFromSignature = (content: Record<string, unknown>): string | null => {
  const body = isRecord(content['body']) ? content['body'] : {};
  const signature = readString(body['signature']);
  if (!signature) {
    return null;
  }

  const [primaryLine] = signature.split('\n');
  const candidate = primaryLine?.split(',')[0]?.trim();
  return candidate && candidate.length > 0 ? candidate : null;
};

const deriveSenderNameFromAddress = (address: string | null): string | null => {
  const localPart = address?.split('@')[0]?.trim();
  if (!localPart) {
    return null;
  }

  const normalized = localPart.replace(/[._-]+/g, ' ').trim();
  return normalized.length > 0 ? toTitleCase(normalized) : null;
};

const pickFirstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const stringValue = readString(value);
    if (stringValue) {
      return stringValue;
    }
  }

  return undefined;
};

const pickFirstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const numericValue = readNumber(value);
    if (numericValue !== undefined) {
      return numericValue;
    }
  }

  return undefined;
};

const readContentString = (
  content: Record<string, unknown>,
  ...keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = readString(content[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
};

const readContentNumber = (
  content: Record<string, unknown>,
  ...keys: string[]
): number | undefined => {
  for (const key of keys) {
    const value = readNumber(content[key]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

export { parseMailboxHeader, deriveSenderNameFromSignature, deriveSenderNameFromAddress };

const extractEmailSenderInfo = (
  content: Record<string, unknown>,
): {
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
} => {
  const headers = isRecord(content['headers']) ? content['headers'] : {};
  const sender = parseMailboxHeader(headers['from']);
  const replyToMailbox = parseMailboxHeader(headers['reply_to']);
  const fromEmail = sender.address;
  const fromName =
    sender.displayName ??
    deriveSenderNameFromSignature(content) ??
    deriveSenderNameFromAddress(sender.address);
  const replyTo = replyToMailbox.address ?? readString(headers['reply_to']) ?? null;
  return { fromEmail, fromName, replyTo };
};

const resolveEmailMetadata = (
  content: Record<string, unknown>,
  request: ContentGenerationRequest,
  resolvedContext: ResolvedRequestContext,
  fallbackApplied: boolean,
) => {
  const preferredString = (...values: [unknown, ...unknown[]]): string | undefined =>
    fallbackApplied
      ? pickFirstString(...values)
      : pickFirstString(values[1], values[0], ...values.slice(2));
  const preferredNumeric = (...values: [unknown, ...unknown[]]): number | undefined =>
    fallbackApplied
      ? pickFirstNumber(...values)
      : pickFirstNumber(values[1], values[0], ...values.slice(2));

  return {
    faction:
      preferredString(
        readContentString(content, 'faction'),
        request.faction,
        resolvedContext.faction,
      ) ?? null,
    attackType:
      request.category === 'email_legitimate'
        ? null
        : (preferredString(
            readContentString(content, 'attack_type', 'attackType'),
            request.attackType,
            resolvedContext.attackType,
          ) ?? null),
    threatLevel:
      preferredString(
        readContentString(content, 'threat_level', 'threatLevel'),
        request.threatLevel,
        resolvedContext.threatLevel,
      ) ?? 'LOW',
    season:
      preferredNumeric(
        readContentNumber(content, 'season'),
        request.season,
        resolvedContext.season,
      ) ?? null,
    chapter:
      preferredNumeric(
        readContentNumber(content, 'chapter'),
        request.chapter,
        resolvedContext.chapter,
      ) ?? null,
  };
};

const buildEmailStoragePayload = (
  opts: StorageOptions,
  senderInfo: { fromEmail: string | null; fromName: string | null; replyTo: string | null },
  metadata: {
    faction: string | null;
    attackType: string | null;
    threatLevel: string;
    season: number | null;
    chapter: number | null;
  },
) => {
  const {
    requestId,
    templateName,
    request,
    resolvedContext,
    content,
    quality,
    difficulty,
    safety,
    model,
    fallbackApplied,
    usage,
  } = opts;
  const headers = isRecord(content['headers']) ? content['headers'] : {};
  const subject = readString(headers['subject']) ?? 'Generated AI content';
  return {
    name: request.contentName ?? `${templateName} generated ${requestId}`,
    subject,
    body: composeEmailBody(content),
    fromName: senderInfo.fromName,
    fromEmail: senderInfo.fromEmail,
    replyTo: senderInfo.replyTo,
    contentType: request.category,
    difficulty: difficulty.difficulty,
    faction: metadata.faction,
    attackType: metadata.attackType,
    threatLevel: metadata.threatLevel,
    season: metadata.season,
    chapter: metadata.chapter,
    language: resolvedContext.language ?? 'en',
    locale: resolvedContext.locale ?? 'en-US',
    metadata: {
      generatedContent: content,
      quality,
      difficulty,
      safety,
      requestId,
      fallbackApplied,
      model,
      usage,
    },
    isAiGenerated: !fallbackApplied,
    isActive: true,
  };
};

export const createContentStorageOrchestrator = (contentGateway: ContentGateway) => {
  const storeEmailContent = async (opts: StorageOptions): Promise<StoredContentReference> => {
    const { tenantId, request, resolvedContext, content, fallbackApplied } = opts;
    const senderInfo = extractEmailSenderInfo(content);
    const emailMetadata = resolveEmailMetadata(content, request, resolvedContext, fallbackApplied);
    const payload = buildEmailStoragePayload(opts, senderInfo, emailMetadata);
    const storedRecord = await contentGateway.createEmailTemplate(tenantId, payload);
    return { kind: 'email', id: storedRecord.id };
  };

  const storeIntelBriefContent = async (opts: StorageOptions): Promise<StoredContentReference> => {
    const { tenantId, templateName, request, resolvedContext, content } = opts;
    const { quality, difficulty, safety, requestId, model, fallbackApplied, usage } = opts;
    const storedRecord = await contentGateway.createDocumentTemplate(tenantId, {
      name: request.contentName ?? `${templateName} intelligence brief`,
      documentType: 'INTELLIGENCE_BRIEF',
      title: deriveDocumentTitle(request, `${templateName} intelligence brief`, content),
      content: composeDocumentBody('intel_brief', content),
      difficulty: difficulty.difficulty,
      faction: request.faction ?? resolvedContext.faction ?? null,
      season: request.season ?? resolvedContext.season ?? null,
      chapter: request.chapter ?? resolvedContext.chapter ?? null,
      language: resolvedContext.language ?? 'en',
      locale: resolvedContext.locale ?? 'en-US',
      metadata: {
        generatedContent: content,
        quality,
        difficulty,
        safety,
        requestId,
        fallbackApplied,
        model,
        usage,
      },
      isActive: true,
    });
    return { kind: 'document', id: storedRecord.id };
  };

  const storeScenarioContent = async (opts: StorageOptions): Promise<StoredContentReference> => {
    const { tenantId, templateName, request, resolvedContext, content } = opts;
    const { quality, difficulty, safety, requestId, model, fallbackApplied, usage } = opts;
    const storedRecord = await contentGateway.createScenario(tenantId, {
      name:
        request.contentName ??
        deriveDocumentTitle(request, `${templateName} scenario variation`, content),
      description: readContentString(content, 'summary') ?? 'Generated scenario variation',
      difficulty: difficulty.difficulty,
      faction: request.faction ?? resolvedContext.faction ?? null,
      season: request.season ?? resolvedContext.season ?? null,
      chapter: request.chapter ?? resolvedContext.chapter ?? null,
      language: resolvedContext.language ?? 'en',
      locale: resolvedContext.locale ?? 'en-US',
      metadata: {
        generatedContent: content,
        quality,
        difficulty,
        safety,
        requestId,
        fallbackApplied,
        model,
        usage,
      },
      isActive: true,
    });
    return { kind: 'scenario', id: storedRecord.id };
  };

  const storeGeneratedContent = async (opts: StorageOptions): Promise<StoredContentReference> => {
    const { request } = opts;
    if (request.category === 'email_phishing' || request.category === 'email_legitimate') {
      return storeEmailContent(opts);
    }
    if (request.category === 'intel_brief') {
      return storeIntelBriefContent(opts);
    }
    return storeScenarioContent(opts);
  };

  return {
    storeGeneratedContent,
  };
};

export type ContentStorageOrchestrator = ReturnType<typeof createContentStorageOrchestrator>;
