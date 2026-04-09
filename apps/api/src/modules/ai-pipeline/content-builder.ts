import {
  type FallbackEmailRequest,
  type FallbackEmailTemplate,
  normalizeFaction,
} from './fallback-template-selector.js';

import type { GeneratablePromptTemplateCategory } from './ai-pipeline.types.js';

import { isRecord } from '../../shared/utils/type-guards.js';

const factionDomainMap: Record<string, string> = {
  'Sovereign Compact': 'compact',
  'Nexion Industries': 'nexion',
  Librarians: 'librarians',
  Hacktivists: 'hacktivists',
  'Criminal Networks': 'networks',
};

const fallbackTimestamp = '2063-09-14T14:22:00Z';
const bodyUrlRegex = /https?:\/\/[^\s)"'<>]+/gi;
const defaultFallbackJustification = 'Review the request details carefully.';
const defaultFallbackCallToAction =
  'Use your standard verification process before approving this request.';

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const readBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

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

const splitTemplateParagraphs = (body: string): string[] =>
  body
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(' '),
    )
    .filter((paragraph) => paragraph.length > 0);

const looksLikeGreeting = (paragraph?: string): boolean =>
  !!paragraph &&
  (/^(dear|hi|hello|greetings|gatekeeper|director|team)\b/i.test(paragraph) ||
    /,$/.test(paragraph));

const looksLikeSignature = (paragraph?: string): boolean =>
  !!paragraph &&
  (paragraph.length <= 120 ||
    /(?:regards|thanks|desk|office|team|coordinator|liaison|records|security|support)\b/i.test(
      paragraph,
    ));

const readSignalEntries = (metadata: Record<string, unknown>): Array<Record<string, unknown>> =>
  Array.isArray(metadata['signals'])
    ? metadata['signals'].filter((entry): entry is Record<string, unknown> => isRecord(entry))
    : [];

const readAttachmentEntries = (
  metadata: Record<string, unknown>,
): Array<Record<string, unknown>> =>
  Array.isArray(metadata['attachments'])
    ? metadata['attachments'].filter((entry): entry is Record<string, unknown> => isRecord(entry))
    : [];

const readLinkEntries = (metadata: Record<string, unknown>): Array<Record<string, unknown>> =>
  Array.isArray(metadata['links'])
    ? metadata['links'].filter((entry): entry is Record<string, unknown> => isRecord(entry))
    : [];

const normalizeAttachmentType = (filename?: string): string => {
  const match = filename?.match(/\.([A-Za-z0-9]+)$/);

  return match?.[1]?.toLowerCase() ?? 'file';
};

export const buildStructuredFallbackFromTemplate = (
  template: FallbackEmailTemplate,
  request: FallbackEmailRequest,
): Record<string, unknown> => {
  const metadata = isRecord(template.metadata) ? template.metadata : {};
  const factionName = normalizeFaction(template.faction ?? request.faction);
  const factionDomain = factionDomainMap[factionName];
  const paragraphs = splitTemplateParagraphs(template.body);
  const greeting = looksLikeGreeting(paragraphs[0]) ? paragraphs.shift() : undefined;
  const signature =
    paragraphs.length > 1 && looksLikeSignature(paragraphs.at(-1)) ? paragraphs.pop() : undefined;
  const resolvedAttackType =
    request.category === 'email_legitimate'
      ? undefined
      : (pickFirstString(template.attackType, request.attackType) ?? 'email_phishing');
  const resolvedDifficulty = pickFirstNumber(template.difficulty, request.difficulty) ?? 2;
  const resolvedThreatLevel = pickFirstString(template.threatLevel, request.threatLevel) ?? 'LOW';
  const resolvedSeason = pickFirstNumber(template.season, request.season);
  const resolvedChapter = pickFirstNumber(template.chapter, request.chapter);
  const summary = paragraphs[0] ?? template.subject;
  const justification = paragraphs[1] ?? defaultFallbackJustification;
  const callToAction = paragraphs[2] ?? defaultFallbackCallToAction;

  const metadataLinks = readLinkEntries(metadata).flatMap((entry) => {
    const url = readString(entry['url']);
    if (!url) {
      return [];
    }

    return [
      {
        label: readString(entry['label']) ?? 'Referenced link',
        url,
        is_suspicious: readBoolean(entry['is_suspicious']) ?? request.category === 'email_phishing',
      },
    ];
  });
  const bodyLinks = Array.from(template.body.matchAll(bodyUrlRegex)).map((match, index) => ({
    label: `Referenced link ${index + 1}`,
    url: match[0],
    is_suspicious: request.category === 'email_phishing',
  }));
  const seenLinkUrls = new Set<string>();
  const links = [...metadataLinks, ...bodyLinks].filter((entry) => {
    if (seenLinkUrls.has(entry.url)) {
      return false;
    }
    seenLinkUrls.add(entry.url);
    return true;
  });

  const attachments = readAttachmentEntries(metadata).flatMap((entry) => {
    const name = readString(entry['name']);
    if (!name) {
      return [];
    }

    return [
      {
        name,
        type: readString(entry['type']) ?? normalizeAttachmentType(name),
        is_suspicious: readBoolean(entry['is_suspicious']) ?? request.category === 'email_phishing',
      },
    ];
  });

  const signals = readSignalEntries(metadata).flatMap((entry) => {
    const type = readString(entry['type']);
    const explanation = readString(entry['explanation']) ?? readString(entry['description']);

    if (!type || !explanation) {
      return [];
    }

    return [
      {
        type,
        location: readString(entry['location']) ?? 'body.summary',
        explanation,
      },
    ];
  });

  const fromEmail = template.fromEmail ?? `liaison@${factionDomain}.invalid`;
  const replyTo = template.replyTo ?? fromEmail;

  return {
    content_type: 'email',
    headers: {
      from: fromEmail,
      to: 'intake@archive.invalid',
      subject: template.subject,
      date: fallbackTimestamp,
      message_id: `<fallback-${template.id}@archive.invalid>`,
      reply_to: replyTo,
      spf: request.category === 'email_legitimate' ? 'pass' : 'fail',
      dkim: request.category === 'email_legitimate' ? 'pass' : 'neutral',
      dmarc: request.category === 'email_legitimate' ? 'pass' : 'fail',
    },
    body: {
      greeting: greeting ?? 'Gatekeeper,',
      summary,
      justification,
      call_to_action: callToAction,
      signature: signature ?? template.fromName ?? `Records Desk, ${factionName}`,
    },
    links,
    attachments,
    signals,
    safety_flags: ['ok'],
    faction: factionName,
    difficulty: resolvedDifficulty,
    threat_level: resolvedThreatLevel,
    ...(resolvedAttackType ? { attack_type: resolvedAttackType } : {}),
    ...(resolvedSeason !== undefined ? { season: resolvedSeason } : {}),
    ...(resolvedChapter !== undefined ? { chapter: resolvedChapter } : {}),
  };
};

export const composeEmailBody = (content: Record<string, unknown>): string => {
  const body = isRecord(content['body']) ? content['body'] : {};
  const sections = [
    body['greeting'],
    body['summary'],
    body['justification'],
    body['call_to_action'],
    body['signature'],
  ];

  return sections
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('\n\n');
};

export const composeDocumentBody = (
  category: Extract<GeneratablePromptTemplateCategory, 'intel_brief' | 'scenario_variation'>,
  content: Record<string, unknown>,
): string => {
  if (category === 'intel_brief') {
    const executiveSummary =
      readString(content['executive_summary']) ?? 'Intelligence summary unavailable.';
    const observedIndicators = readStringArray(content['observed_indicators']);
    const expectedTactics = readStringArray(content['expected_adversary_tactics']);
    const recommendedPosture =
      readString(content['recommended_posture']) ?? 'Maintain current posture.';

    return [
      executiveSummary,
      observedIndicators.length > 0
        ? `Observed indicators:\n- ${observedIndicators.join('\n- ')}`
        : undefined,
      expectedTactics.length > 0
        ? `Expected adversary tactics:\n- ${expectedTactics.join('\n- ')}`
        : undefined,
      `Recommended posture:\n${recommendedPosture}`,
    ]
      .filter((section): section is string => typeof section === 'string' && section.length > 0)
      .join('\n\n');
  }

  const summary = readString(content['summary']) ?? 'Scenario variation summary unavailable.';
  const triggerConditions = readStringArray(content['trigger_conditions']);
  const requiredDeliverables = readStringArray(content['required_deliverables']);
  const followUpTriggers = readStringArray(content['follow_up_triggers']);

  return [
    summary,
    triggerConditions.length > 0
      ? `Trigger conditions:\n- ${triggerConditions.join('\n- ')}`
      : undefined,
    requiredDeliverables.length > 0
      ? `Required deliverables:\n- ${requiredDeliverables.join('\n- ')}`
      : undefined,
    followUpTriggers.length > 0
      ? `Follow-up triggers:\n- ${followUpTriggers.join('\n- ')}`
      : undefined,
  ]
    .filter((section): section is string => typeof section === 'string' && section.length > 0)
    .join('\n\n');
};

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];

export const deriveDocumentTitle = (
  request: { contentName?: string | null },
  fallbackName: string,
  content: Record<string, unknown>,
): string =>
  request.contentName ??
  readString(content['title']) ??
  readString(content['name']) ??
  readString(content['executive_summary'])?.slice(0, 120) ??
  fallbackName;

export const buildHandcraftedFallback = (
  category: GeneratablePromptTemplateCategory,
  request: {
    faction?: string | null;
    attackType?: string | null;
    difficulty?: number | null;
    threatLevel?: string | null;
    season?: number | null;
    chapter?: number | null;
    contentName?: string | null;
  },
): Record<string, unknown> => {
  const factionName = normalizeFaction(request.faction ?? undefined);
  const factionDomain = factionDomainMap[factionName];
  const attackType =
    category === 'email_legitimate' ? request.attackType : (request.attackType ?? 'email_phishing');
  const difficulty = request.difficulty ?? 2;
  const threatLevel = request.threatLevel ?? 'LOW';

  if (category === 'email_legitimate') {
    return {
      content_type: 'email',
      headers: {
        from: `records-desk@${factionDomain}.test`,
        to: 'intake@archive.invalid',
        subject: 'Archive Access Verification Packet',
        date: '2063-09-14T14:22:00Z',
        message_id: '<fallback-legit@archive.test>',
        reply_to: `records-desk@${factionDomain}.test`,
        spf: 'pass',
        dkim: 'pass',
        dmarc: 'pass',
      },
      body: {
        greeting: 'Gatekeeper,',
        summary: 'Please review the attached verification packet for a standard access renewal.',
        justification:
          'The request references the quarterly archive rotation already listed in the verification packet.',
        call_to_action: 'Cross-check the packet against your intake ledger before approval.',
        signature: `Records Desk, ${factionName}`,
      },
      links: [
        {
          label: 'Verification Ledger',
          url: 'https://verification.archive.test/ledger',
          is_suspicious: false,
        },
      ],
      attachments: [{ name: 'verification_packet.pdf', type: 'pdf', is_suspicious: false }],
      signals: [
        {
          type: 'verification_hint',
          location: 'body.call_to_action',
          explanation: 'The request includes a clear offline verification step.',
        },
      ],
      safety_flags: ['ok'],
      faction: factionName,
      difficulty,
      threat_level: threatLevel,
      ...(attackType ? { attack_type: attackType } : {}),
      ...(request.season !== undefined ? { season: request.season } : {}),
      ...(request.chapter !== undefined ? { chapter: request.chapter } : {}),
    };
  }

  if (category === 'intel_brief') {
    return {
      content_type: 'intel_brief',
      executive_summary:
        'Threat telemetry suggests a focused access-manipulation wave against archive intake procedures.',
      observed_indicators: [
        'Increased use of urgency language in access requests',
        'Credential refresh narratives tied to routine maintenance',
        'Sender identities leaning on trusted internal sounding roles',
      ],
      expected_adversary_tactics: [attackType, 'credential_harvesting'],
      recommended_posture:
        'Require offline verification for any request that introduces urgency or unexpected identity changes.',
      safety_flags: ['ok'],
    };
  }

  if (category === 'scenario_variation') {
    return {
      content_type: 'scenario_variation',
      name: request.contentName ?? 'Archive relay sync anomaly',
      summary:
        'A staggered campaign attempts to blend routine archive relay maintenance with escalating credential abuse.',
      trigger_conditions: [
        `Threat level remains at ${threatLevel}`,
        'Player processes a suspicious maintenance-themed access request',
      ],
      required_deliverables: ['email_wave', 'intel_brief'],
      follow_up_triggers: ['verification_requested', 'delayed_response'],
      safety_flags: ['ok'],
    };
  }

  return {
    content_type: 'email',
    headers: {
      from: `liaison@${factionDomain}.invalid`,
      to: 'intake@archive.invalid',
      subject: 'Immediate Credential Refresh Required',
      date: '2063-09-14T14:22:00Z',
      message_id: `<fallback-phishing@${factionDomain}.invalid>`,
      reply_to: `liaison@${factionDomain}.invalid`,
      spf: 'fail',
      dkim: 'neutral',
      dmarc: 'fail',
    },
    body: {
      greeting: 'Director,',
      summary: 'A priority credential refresh is required to maintain archive access.',
      justification:
        'Signal-loss mitigation rotated our access relay, so your current access token must be updated.',
      call_to_action:
        'Open the verification portal now and complete the credential sync before shift change.',
      signature: `Liaison Desk, ${factionName} Relay`,
    },
    links: [
      {
        label: 'Credential Sync Portal',
        url: `https://verify.${factionDomain}.invalid/portal`,
        is_suspicious: true,
      },
    ],
    attachments: [{ name: 'relay_notice.pdf', type: 'pdf', is_suspicious: false }],
    signals: [
      {
        type: 'domain_mismatch',
        location: 'headers.from',
        explanation: 'The sender uses an unexpected domain for the claimed organization.',
      },
      {
        type: 'urgency',
        location: 'body.call_to_action',
        explanation: 'The message pressures the player to act immediately.',
      },
    ],
    safety_flags: ['ok'],
    faction: factionName,
    attack_type: attackType,
    difficulty,
    threat_level: threatLevel,
    ...(request.season !== undefined ? { season: request.season } : {}),
    ...(request.chapter !== undefined ? { chapter: request.chapter } : {}),
  };
};

export const sanitizeEmailContentForCategory = (
  category: FallbackEmailCategory | GeneratablePromptTemplateCategory,
  content: Record<string, unknown>,
): Record<string, unknown> => {
  if (category !== 'email_legitimate') {
    return content;
  }

  const { attack_type: _attackType, attackType: _attackTypeCamel, ...sanitized } = content;
  return sanitized;
};

export type FallbackEmailCategory = 'email_phishing' | 'email_legitimate';
