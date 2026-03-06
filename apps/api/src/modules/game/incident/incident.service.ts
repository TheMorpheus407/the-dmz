import {
  type GeneratedAttack,
  mapAttackVectorToIncidentClassification,
  calculateIncidentSeverity,
  calculateConsequences,
  generatePostIncidentReview,
  getAvailableResponseActions,
  INCIDENT_TYPE_TO_DETECTION_SOURCES,
  type Incident,
  type IncidentClassification,
  type IncidentStatus,
  type DetectionSource,
  type IncidentConsequence,
  type PostIncidentReview,
  type IncidentResponseAction,
  type ResponseAction,
} from '@the-dmz/shared/game';

import { type DB } from '../../../shared/database/connection.js';

import * as incidentRepo from './incident.repo.js';

export interface CreateIncidentFromAttackParams {
  db: DB;
  sessionId: string;
  userId: string;
  tenantId: string;
  attack: GeneratedAttack;
  day: number;
  securityToolCoverage: number;
  detectionProbability: number;
}

export interface UpdateIncidentStatusParams {
  db: DB;
  incidentId: string;
  newStatus: IncidentStatus;
  day: number;
  notes?: string;
}

export interface AddResponseActionParams {
  db: DB;
  incidentId: string;
  actionType: ResponseAction;
  day: number;
  effectiveness?: number;
  notes?: string;
}

export const createIncidentFromAttack = async (
  params: CreateIncidentFromAttackParams,
): Promise<Incident> => {
  const {
    db,
    sessionId,
    userId,
    tenantId,
    attack,
    day,
    securityToolCoverage,
    detectionProbability,
  } = params;

  const classification = mapAttackVectorToIncidentClassification(attack.vector);
  const detectionSourcesForType = INCIDENT_TYPE_TO_DETECTION_SOURCES[classification];
  const detectionSource = detectionSourcesForType[
    Math.floor(Math.random() * detectionSourcesForType.length)
  ] as DetectionSource;

  const severity = calculateIncidentSeverity(
    attack.difficulty,
    detectionProbability,
    securityToolCoverage,
  );

  const now = new Date().toISOString();
  const initialTimeline = [
    {
      timestamp: now,
      day,
      action: 'incident_created',
      description: `Incident created from ${attack.vector} attack`,
      actor: 'system' as const,
    },
    {
      timestamp: now,
      day,
      action: 'detected',
      description: `Detected by ${detectionSource}`,
      actor: 'system' as const,
    },
  ];

  const created = await incidentRepo.createIncident(db, {
    sessionId,
    userId,
    tenantId,
    attackId: attack.attackId as never,
    day,
    detectionSource,
    classification: classification as never,
    severity,
    affectedAssets: [],
    evidence: {
      indicators: [],
      logs: [],
    },
    status: 'open',
    timeline: initialTimeline as never,
    responseActions: [] as never,
  });

  return {
    ...created,
    affectedAssets: created.affectedAssets ?? [],
  } as Incident;
};

export const getIncidentById = async (db: DB, incidentId: string): Promise<Incident | null> => {
  const incident = await incidentRepo.findIncidentById(db, incidentId);
  if (!incident) return null;
  return {
    ...incident,
    affectedAssets: incident.affectedAssets ?? [],
  } as Incident;
};

export const getIncidentsBySession = async (db: DB, sessionId: string): Promise<Incident[]> => {
  const incidents = await incidentRepo.findIncidentsBySessionId(db, sessionId);
  return incidents.map((i) => ({
    ...i,
    affectedAssets: i.affectedAssets ?? [],
  })) as Incident[];
};

export const getActiveIncidents = async (db: DB, sessionId: string): Promise<Incident[]> => {
  const incidents = await incidentRepo.findActiveIncidentsBySessionId(db, sessionId);
  return incidents.map((i) => ({
    ...i,
    affectedAssets: i.affectedAssets ?? [],
  })) as Incident[];
};

export const updateIncidentStatus = async (
  params: UpdateIncidentStatusParams,
): Promise<Incident | null> => {
  const { db, incidentId, newStatus, day, notes } = params;

  const incident = await incidentRepo.findIncidentById(db, incidentId);
  if (!incident) {
    return null;
  }

  const now = new Date().toISOString();
  const timelineEntry = {
    timestamp: now,
    day,
    action: `status_changed_to_${newStatus}`,
    description: notes || `Status changed to ${newStatus}`,
    actor: 'player' as const,
  };

  await incidentRepo.addIncidentTimelineEntry(db, incidentId, timelineEntry);

  const updateData: Partial<incidentRepo.NewIncident> = {
    status: newStatus as never,
  };

  if (newStatus === 'closed') {
    updateData.resolvedAt = new Date();
    updateData.resolutionDays = day - incident.day;
  }

  const updated = await incidentRepo.updateIncident(db, incidentId, updateData);
  return updated as Incident | null;
};

export const addResponseAction = async (
  params: AddResponseActionParams,
): Promise<Incident | null> => {
  const { db, incidentId, actionType, day, effectiveness = 0.8, notes } = params;

  const incident = await incidentRepo.findIncidentById(db, incidentId);
  if (!incident) {
    return null;
  }

  const now = new Date().toISOString();
  const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const responseAction: IncidentResponseAction = {
    actionId,
    actionType,
    timestamp: now,
    day,
    effectiveness,
    notes,
  };

  await incidentRepo.addIncidentResponseAction(db, incidentId, responseAction);

  const timelineEntry = {
    timestamp: now,
    day,
    action: 'response_action',
    description: `Player took action: ${actionType}`,
    actor: 'player' as const,
  };

  await incidentRepo.addIncidentTimelineEntry(db, incidentId, timelineEntry);

  const updated = await incidentRepo.findIncidentById(db, incidentId);
  return updated as Incident | null;
};

export const resolveIncident = async (
  db: DB,
  incidentId: string,
  outcome: string,
  rootCause?: string,
  lessonsLearned?: string,
): Promise<Incident | null> => {
  const incident = await incidentRepo.findIncidentById(db, incidentId);
  if (!incident) {
    return null;
  }

  const day = incident.day;

  const updateData: Partial<incidentRepo.NewIncident> = {
    status: 'closed',
    outcome,
    resolvedAt: new Date(),
    resolutionDays: day - incident.day,
  };

  if (rootCause) {
    updateData.rootCause = rootCause;
  }

  if (lessonsLearned) {
    updateData.lessonsLearned = lessonsLearned;
  }

  const updated = await incidentRepo.updateIncident(db, incidentId, updateData);

  const now = new Date().toISOString();
  const timelineEntry = {
    timestamp: now,
    day,
    action: 'incident_resolved',
    description: `Incident resolved: ${outcome}`,
    actor: 'system' as const,
  };

  await incidentRepo.addIncidentTimelineEntry(db, incidentId, timelineEntry);

  return updated as Incident | null;
};

export const getPostIncidentReview = async (
  db: DB,
  incidentId: string,
): Promise<PostIncidentReview | null> => {
  const incident = await incidentRepo.findIncidentById(db, incidentId);
  if (!incident) {
    return null;
  }

  return generatePostIncidentReview(incident as unknown as Incident);
};

export const getAvailableActions = (classification: IncidentClassification): ResponseAction[] => {
  return getAvailableResponseActions(classification);
};

export const calculateIncidentImpact = (incident: Incident): IncidentConsequence => {
  return calculateConsequences(
    incident.severity,
    incident.responseActions,
    incident.classification,
  );
};

export const getIncidentStats = async (
  db: DB,
  sessionId: string,
): Promise<{
  total: number;
  open: number;
  investigating: number;
  contained: number;
  eradicated: number;
  recovered: number;
  closed: number;
  avgResolutionDays: number;
}> => {
  const total = await incidentRepo.countIncidentsBySession(db, sessionId);
  const open = await incidentRepo.countIncidentsBySessionAndStatus(db, sessionId, 'open');
  const investigating = await incidentRepo.countIncidentsBySessionAndStatus(
    db,
    sessionId,
    'investigating',
  );
  const contained = await incidentRepo.countIncidentsBySessionAndStatus(db, sessionId, 'contained');
  const eradicated = await incidentRepo.countIncidentsBySessionAndStatus(
    db,
    sessionId,
    'eradicated',
  );
  const recovered = await incidentRepo.countIncidentsBySessionAndStatus(db, sessionId, 'recovered');
  const closed = await incidentRepo.countIncidentsBySessionAndStatus(db, sessionId, 'closed');

  const incidents = await incidentRepo.findIncidentsBySessionId(db, sessionId);
  const resolvedIncidents = incidents.filter((i) => i.resolutionDays !== null);
  const avgResolutionDays =
    resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.resolutionDays || 0), 0) /
        resolvedIncidents.length
      : 0;

  return {
    total,
    open,
    investigating,
    contained,
    eradicated,
    recovered,
    closed,
    avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
  };
};
