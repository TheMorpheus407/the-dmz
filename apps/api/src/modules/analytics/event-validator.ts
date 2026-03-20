import { validateEventEnvelope } from '@the-dmz/shared';

export interface ValidatedAnalyticsEvent {
  valid: boolean;
  eventId: string;
  eventName: string;
  userId: string;
  tenantId: string;
  sessionId: string | undefined;
  correlationId: string;
  timestamp: string;
  source: string;
  eventVersion: number;
  eventProperties: Record<string, unknown>;
  deviceInfo: Record<string, unknown> | undefined;
  geoInfo: Record<string, unknown> | undefined;
  errors: Array<{ path: string; message: string }>;
  partyId: string | undefined;
  coopRole: string | undefined;
}

const REQUIRED_FIELDS = ['event_id', 'event_name', 'user_id', 'tenant_id', 'timestamp'];

function getFieldAsString(obj: Record<string, unknown>, field: string): string {
  const value = obj[field];
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function getFieldAsNumber(obj: Record<string, unknown>, field: string): number {
  const value = obj[field];
  if (value === undefined || value === null) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value) || 0;
  }
  return 0;
}

export function validateIncomingEvent(input: unknown): ValidatedAnalyticsEvent {
  const validation = validateEventEnvelope(input);

  if (!validation.valid) {
    return {
      valid: false,
      eventId: '',
      eventName: '',
      userId: '',
      tenantId: '',
      correlationId: '',
      timestamp: '',
      source: '',
      eventVersion: 1,
      eventProperties: {},
      sessionId: undefined,
      deviceInfo: undefined,
      geoInfo: undefined,
      errors: validation.errors,
      partyId: undefined,
      coopRole: undefined,
    };
  }

  const event = input as Record<string, unknown>;

  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = event[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    return {
      valid: false,
      eventId: getFieldAsString(event, 'event_id'),
      eventName: getFieldAsString(event, 'event_name'),
      userId: getFieldAsString(event, 'user_id'),
      tenantId: getFieldAsString(event, 'tenant_id'),
      correlationId: getFieldAsString(event, 'correlation_id'),
      timestamp: getFieldAsString(event, 'timestamp'),
      source: getFieldAsString(event, 'source'),
      eventVersion: getFieldAsNumber(event, 'event_version') || 1,
      eventProperties: (event['payload'] as Record<string, unknown>) || {},
      sessionId: undefined,
      deviceInfo: undefined,
      geoInfo: undefined,
      errors: missingFields.map((field) => ({
        path: field,
        message: `Required field missing: ${field}`,
      })),
      partyId: undefined,
      coopRole: undefined,
    };
  }

  const deviceInfoValue = event['device_info'] as Record<string, unknown> | undefined;
  const geoInfoValue = event['geo_info'] as Record<string, unknown> | undefined;
  const sessionIdRaw = event['session_id'];
  let sessionIdValue: string | undefined;
  if (sessionIdRaw !== undefined && sessionIdRaw !== null) {
    if (typeof sessionIdRaw === 'string') {
      sessionIdValue = sessionIdRaw;
    } else if (typeof sessionIdRaw === 'number' || typeof sessionIdRaw === 'boolean') {
      sessionIdValue = String(sessionIdRaw);
    }
  }

  const partyIdRaw = event['party_id'];
  let partyIdValue: string | undefined;
  if (partyIdRaw !== undefined && partyIdRaw !== null) {
    if (typeof partyIdRaw === 'string') {
      partyIdValue = partyIdRaw;
    } else if (typeof partyIdRaw === 'number' || typeof partyIdRaw === 'boolean') {
      partyIdValue = String(partyIdRaw);
    }
  }

  const coopRoleValue = event['coop_role'] as string | undefined;

  return {
    valid: true,
    eventId: getFieldAsString(event, 'event_id'),
    eventName: getFieldAsString(event, 'event_name'),
    userId: getFieldAsString(event, 'user_id'),
    tenantId: getFieldAsString(event, 'tenant_id'),
    sessionId: sessionIdValue,
    correlationId: getFieldAsString(event, 'correlation_id'),
    timestamp: getFieldAsString(event, 'timestamp'),
    source: getFieldAsString(event, 'source'),
    eventVersion: getFieldAsNumber(event, 'event_version') || 1,
    eventProperties: (event['payload'] as Record<string, unknown>) || {},
    deviceInfo: deviceInfoValue,
    geoInfo: geoInfoValue,
    errors: [],
    partyId: partyIdValue,
    coopRole: coopRoleValue,
  };
}

export function isDuplicateEventError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    const messageField = errorObj['message'];
    if (messageField === undefined || messageField === null) {
      return false;
    }
    const message = typeof messageField === 'string' ? messageField.toLowerCase() : '';
    return message.includes('duplicate') || message.includes('unique constraint');
  }
  return false;
}
