import { randomBytes } from 'crypto';

import type { XapiVerb, XapiVersion } from './xapi-verbs.js';

export const XAPI_ACTIVITY_UNKNOWN = 'https://the-dmz.example.com/xapi/activities/unknown';

const EXTENSION_TENANT = 'https://the-dmz.example.com/xapi/extensions/tenant';
const EXTENSION_CAMPAIGN = 'https://the-dmz.example.com/xapi/extensions/campaign';
const EXTENSION_COMPETENCY_DOMAIN = 'https://the-dmz.example.com/xapi/extensions/competency-domain';
const EXTENSION_DIFFICULTY_LEVEL = 'https://the-dmz.example.com/xapi/extensions/difficulty-level';

export interface XapiActor {
  objectType: 'Agent';
  mbox: string;
  name: string;
}

export interface XapiActivity {
  objectType: 'Activity';
  id: string;
  definition?: {
    name?: Record<string, string>;
    description?: Record<string, string>;
    type?: string;
  };
}

export interface XapiResult {
  score?: {
    scaled?: number;
    raw?: number;
    min?: number;
    max?: number;
  };
  success?: boolean;
  completion?: boolean;
  duration?: string;
}

export interface XapiContext {
  registration?: string;
  contextActivities?: {
    parent?: XapiActivity[];
    grouping?: XapiActivity[];
    category?: XapiActivity[];
  };
  extensions?: Record<string, unknown>;
}

export interface XapiStatementTemplate {
  actor: XapiActor;
  verb: XapiVerb;
  object: XapiActivity;
  result?: XapiResult;
  context?: XapiContext;
  timestamp?: string;
}

export interface XapiStatementDoc extends XapiStatementTemplate {
  id: string;
  stored: string;
  authority?: XapiActor;
}

export function generateStatementId(): string {
  return randomBytes(16).toString('hex');
}

export function generateXapiStatement(
  actor: XapiActor,
  verb: XapiVerb,
  object: XapiActivity,
  options?: {
    result?: XapiResult;
    context?: XapiContext;
    version?: XapiVersion;
    timestamp?: Date;
  },
): XapiStatementDoc {
  const version = options?.version ?? '1.0.3';
  const timestamp = options?.timestamp ?? new Date();

  const statement: XapiStatementDoc = {
    id: generateStatementId(),
    actor,
    verb,
    object,
    stored: timestamp.toISOString(),
    timestamp: timestamp.toISOString(),
  };

  if (options?.result) {
    statement.result = options.result;
  }

  if (options?.context) {
    statement.context = options.context;
  }

  if (version === '2.0') {
    statement.authority = {
      objectType: 'Agent',
      mbox: 'mailto:system@the-dmz.example.com',
      name: 'The DMZ System',
    };
  }

  return statement;
}

export function buildActorFromUser(email: string, name: string): XapiActor {
  return {
    objectType: 'Agent',
    mbox: `mailto:${email}`,
    name,
  };
}

export function buildActivityFromGameContent(
  activityId: string,
  name: string,
  description?: string,
  activityType?: string,
): XapiActivity {
  const activity: XapiActivity = {
    objectType: 'Activity',
    id: `https://the-dmz.example.com/xapi/activities/${activityId}`,
  };

  if (name || description || activityType) {
    activity.definition = {};
    if (name) {
      activity.definition.name = { 'en-US': name };
    }
    if (description) {
      activity.definition.description = { 'en-US': description };
    }
    if (activityType) {
      activity.definition.type = activityType;
    }
  }

  return activity;
}

export function buildResultFromDecision(
  isCorrect: boolean,
  score?: number,
  durationSeconds?: number,
): XapiResult {
  const result: XapiResult = {
    success: isCorrect,
    completion: true,
  };

  if (score !== undefined) {
    result.score = {
      raw: score,
      min: 0,
      max: 100,
      scaled: score / 100,
    };
  }

  if (durationSeconds !== undefined) {
    result.duration = convertSecondsToIso8601(durationSeconds);
  }

  return result;
}

export function convertSecondsToIso8601(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let duration = 'PT';
  if (hours > 0) duration += `${hours}H`;
  if (minutes > 0) duration += `${minutes}M`;
  if (secs > 0 || duration === 'PT') duration += `${secs}S`;

  return duration;
}

export function buildContext(
  options: {
    tenantId?: string;
    sessionId?: string;
    campaignId?: string;
    campaignSessionId?: string;
    competencyDomain?: string;
    difficultyLevel?: string;
  } = {},
): XapiContext {
  const context: XapiContext = {
    extensions: {},
  };

  if (options.tenantId) {
    context.extensions![EXTENSION_TENANT] = options.tenantId;
  }
  if (options.campaignId) {
    context.extensions![EXTENSION_CAMPAIGN] = options.campaignId;
  }
  if (options.competencyDomain) {
    context.extensions![EXTENSION_COMPETENCY_DOMAIN] = options.competencyDomain;
  }
  if (options.difficultyLevel) {
    context.extensions![EXTENSION_DIFFICULTY_LEVEL] = options.difficultyLevel;
  }

  if (options.sessionId || options.campaignSessionId) {
    context.contextActivities = {};
    if (options.sessionId) {
      context.registration = options.sessionId;
    }
    if (options.campaignSessionId) {
      context.contextActivities.grouping = [
        {
          objectType: 'Activity',
          id: `https://the-dmz.example.com/xapi/activities/campaign-session/${options.campaignSessionId}`,
        },
      ];
    }
  }

  return context;
}

export function convertStatementToJson(statement: XapiStatementDoc): Record<string, unknown> {
  return {
    id: statement.id,
    actor: statement.actor,
    verb: statement.verb,
    object: statement.object,
    result: statement.result,
    context: statement.context,
    timestamp: statement.timestamp,
    stored: statement.stored,
    authority: statement.authority,
  };
}
