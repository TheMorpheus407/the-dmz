import {
  GAME_EVENT_TYPES,
  type Incident,
  type IncidentStatus,
  type ResponseAction,
  type IncidentClassification,
  type DetectionSource,
} from '@the-dmz/shared/game';

import { type DB } from '../../../shared/database/connection.js';
import * as eventStoreRepo from '../event-store/event-store.repo.js';

export interface IncidentCreatedEventData {
  incidentId: string;
  sessionId: string;
  attackId?: string;
  classification: IncidentClassification;
  severity: number;
  detectionSource: DetectionSource;
  day: number;
}

export interface IncidentStatusChangedEventData {
  incidentId: string;
  sessionId: string;
  previousStatus: IncidentStatus;
  newStatus: IncidentStatus;
  day: number;
  notes?: string;
}

export interface IncidentResponseActionEventData {
  incidentId: string;
  sessionId: string;
  actionType: ResponseAction;
  effectiveness: number;
  day: number;
  notes?: string;
}

export interface IncidentClosedEventData {
  incidentId: string;
  sessionId: string;
  outcome: string;
  rootCause?: string;
  lessonsLearned?: string;
  resolutionDays: number;
  day: number;
}

export const emitIncidentCreated = async (
  db: DB,
  data: IncidentCreatedEventData,
): Promise<void> => {
  await eventStoreRepo.appendEvent(db, {
    sessionId: data.sessionId,
    userId: '',
    tenantId: '',
    eventType: GAME_EVENT_TYPES.INCIDENT_CREATED,
    eventData: data as never,
    eventVersion: 1,
    clientTime: new Date(),
  });
};

export const emitIncidentStatusChanged = async (
  db: DB,
  data: IncidentStatusChangedEventData,
): Promise<void> => {
  let eventType:
    | typeof GAME_EVENT_TYPES.INCIDENT_STATUS_CHANGED
    | typeof GAME_EVENT_TYPES.INCIDENT_CONTAINED
    | typeof GAME_EVENT_TYPES.INCIDENT_ERADICATED
    | typeof GAME_EVENT_TYPES.INCIDENT_RECOVERED
    | typeof GAME_EVENT_TYPES.INCIDENT_CLOSED = GAME_EVENT_TYPES.INCIDENT_STATUS_CHANGED;

  switch (data.newStatus) {
    case 'contained':
      eventType = GAME_EVENT_TYPES.INCIDENT_CONTAINED;
      break;
    case 'eradicated':
      eventType = GAME_EVENT_TYPES.INCIDENT_ERADICATED;
      break;
    case 'recovered':
      eventType = GAME_EVENT_TYPES.INCIDENT_RECOVERED;
      break;
    case 'closed':
      eventType = GAME_EVENT_TYPES.INCIDENT_CLOSED;
      break;
  }

  await eventStoreRepo.appendEvent(db, {
    sessionId: data.sessionId,
    userId: '',
    tenantId: '',
    eventType,
    eventData: data as never,
    eventVersion: 1,
    clientTime: new Date(),
  });
};

export const emitIncidentResponseAction = async (
  db: DB,
  data: IncidentResponseActionEventData,
): Promise<void> => {
  await eventStoreRepo.appendEvent(db, {
    sessionId: data.sessionId,
    userId: '',
    tenantId: '',
    eventType: GAME_EVENT_TYPES.INCIDENT_RESPONSE_ACTION,
    eventData: data as never,
    eventVersion: 1,
    clientTime: new Date(),
  });
};

export const emitIncidentClosed = async (db: DB, data: IncidentClosedEventData): Promise<void> => {
  await eventStoreRepo.appendEvent(db, {
    sessionId: data.sessionId,
    userId: '',
    tenantId: '',
    eventType: GAME_EVENT_TYPES.INCIDENT_CLOSED,
    eventData: data as never,
    eventVersion: 1,
    clientTime: new Date(),
  });
};

export const emitIncidentResolved = async (
  db: DB,
  incident: Incident,
  outcome: string,
  resolutionDays: number,
): Promise<void> => {
  await eventStoreRepo.appendEvent(db, {
    sessionId: incident.sessionId,
    userId: '',
    tenantId: '',
    eventType: GAME_EVENT_TYPES.INCIDENT_RESOLVED,
    eventData: {
      incidentId: incident.incidentId,
      sessionId: incident.sessionId,
      classification: incident.classification,
      severity: incident.severity,
      outcome,
      resolutionDays,
    } as never,
    eventVersion: 1,
    clientTime: new Date(),
  });
};
