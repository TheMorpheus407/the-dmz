import { eq, and, isNull } from 'drizzle-orm';

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  moderationBlocklist,
  type BlocklistPatternType,
  type BlocklistSeverity,
  type BlocklistCategory,
  type ModerationBlocklist,
} from '../../db/schema/social/index.js';

import type { AppConfig } from '../../config.js';

export interface ContentCheckInput {
  content: string;
  context?: 'chat' | 'forum_post' | 'profile_bio' | 'display_name';
}

export interface ContentViolation {
  pattern: string;
  patternType: BlocklistPatternType;
  severity: BlocklistSeverity;
  category: BlocklistCategory;
}

export interface ContentCheckResult {
  allowed: boolean;
  violations: ContentViolation[];
  highestSeverity: BlocklistSeverity | null;
}

interface CompiledPattern {
  pattern: string;
  regex: RegExp | null;
  patternType: BlocklistPatternType;
  severity: BlocklistSeverity;
  category: BlocklistCategory;
}

const SEVERITY_ORDER: Record<BlocklistSeverity, number> = {
  flag: 1,
  block: 2,
  mute: 3,
};

let patternCache: CompiledPattern[] = [];
let lastCacheLoad = 0;
const CACHE_TTL_MS = 60_000;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePattern(pattern: string, patternType: BlocklistPatternType): RegExp | null {
  try {
    switch (patternType) {
      case 'exact':
        return new RegExp(`^${escapeRegex(pattern)}$`, 'i');
      case 'contains':
        return new RegExp(escapeRegex(pattern), 'i');
      case 'regex':
        return new RegExp(pattern, 'i');
      default:
        return null;
    }
  } catch {
    return null;
  }
}

async function loadActiveBlocklist(
  config: AppConfig,
  tenantId: string | null,
): Promise<CompiledPattern[]> {
  const now = Date.now();
  if (now - lastCacheLoad < CACHE_TTL_MS && patternCache.length > 0) {
    return patternCache;
  }

  const db = getDatabaseClient(config);

  const globalPatterns = await db.query.moderationBlocklist.findMany({
    where: and(eq(moderationBlocklist.isActive, 'true'), isNull(moderationBlocklist.tenantId)),
  });

  const tenantPatterns =
    tenantId !== null
      ? await db.query.moderationBlocklist.findMany({
          where: and(
            eq(moderationBlocklist.isActive, 'true'),
            eq(moderationBlocklist.tenantId, tenantId),
          ),
        })
      : [];

  const allPatterns = [...tenantPatterns, ...globalPatterns];

  const compiled: CompiledPattern[] = allPatterns.map((p) => ({
    pattern: p.pattern,
    regex: compilePattern(p.pattern, p.patternType as BlocklistPatternType),
    patternType: p.patternType as BlocklistPatternType,
    severity: p.severity as BlocklistSeverity,
    category: p.category as BlocklistCategory,
  }));

  patternCache = compiled;
  lastCacheLoad = now;

  return compiled;
}

export function clearPatternCache(): void {
  patternCache = [];
  lastCacheLoad = 0;
}

export async function checkContent(
  config: AppConfig,
  tenantId: string | null,
  input: ContentCheckInput,
): Promise<ContentCheckResult> {
  const patterns = await loadActiveBlocklist(config, tenantId);

  if (patterns.length === 0) {
    return {
      allowed: true,
      violations: [],
      highestSeverity: null,
    };
  }

  const violations: ContentViolation[] = [];
  let highestSeverity: BlocklistSeverity | null = null;

  for (const compiled of patterns) {
    if (compiled.regex === null) {
      continue;
    }

    if (compiled.regex.test(input.content)) {
      violations.push({
        pattern: compiled.pattern,
        patternType: compiled.patternType,
        severity: compiled.severity,
        category: compiled.category,
      });

      if (
        highestSeverity === null ||
        SEVERITY_ORDER[compiled.severity] > SEVERITY_ORDER[highestSeverity]
      ) {
        highestSeverity = compiled.severity;
      }

      if (compiled.severity === 'block' || compiled.severity === 'mute') {
        break;
      }
    }
  }

  const allowed = highestSeverity === null || highestSeverity === 'flag';

  return {
    allowed,
    violations,
    highestSeverity,
  };
}

export async function addBlocklistPattern(
  config: AppConfig,
  tenantId: string | null,
  moderatorId: string,
  input: {
    pattern: string;
    patternType: BlocklistPatternType;
    severity: BlocklistSeverity;
    category: BlocklistCategory;
  },
): Promise<ModerationBlocklist> {
  const db = getDatabaseClient(config);

  const [result] = await db
    .insert(moderationBlocklist)
    .values({
      tenantId: tenantId ?? null,
      pattern: input.pattern,
      patternType: input.patternType,
      severity: input.severity,
      category: input.category,
      isActive: 'true',
      createdBy: moderatorId,
    })
    .returning();

  clearPatternCache();

  return result!;
}

export async function removeBlocklistPattern(
  config: AppConfig,
  patternId: string,
): Promise<boolean> {
  const db = getDatabaseClient(config);

  const [deleted] = await db
    .delete(moderationBlocklist)
    .where(eq(moderationBlocklist.id, patternId))
    .returning();

  if (deleted) {
    clearPatternCache();
    return true;
  }

  return false;
}

export async function getBlocklistPatterns(
  config: AppConfig,
  tenantId: string | null,
): Promise<ModerationBlocklist[]> {
  const db = getDatabaseClient(config);

  if (tenantId === null) {
    return db.query.moderationBlocklist.findMany({
      where: isNull(moderationBlocklist.tenantId),
    });
  }

  return db.query.moderationBlocklist.findMany({
    where: eq(moderationBlocklist.tenantId, tenantId),
  });
}
