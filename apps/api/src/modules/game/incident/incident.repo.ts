import { eq, and, sql, desc } from 'drizzle-orm';

import { type DB } from '../../../shared/database/connection.js';
import { incidents, type Incident, type NewIncident } from '../../../db/schema/game/index.js';

import type { IncidentStatus } from '../../../db/schema/game/incidents.schema.js';

export type { Incident, NewIncident };

export const createIncident = async (db: DB, data: NewIncident): Promise<Incident> => {
  const [created] = await db.insert(incidents).values(data).returning();

  if (!created) {
    throw new Error('Failed to create incident');
  }

  return created;
};

export const findIncidentById = async (db: DB, incidentId: string): Promise<Incident | null> => {
  const incident = await db.query.incidents.findFirst({
    where: eq(incidents.incidentId, incidentId),
  });

  return incident || null;
};

export const findIncidentsBySessionId = async (db: DB, sessionId: string): Promise<Incident[]> => {
  const results = await db.query.incidents.findMany({
    where: eq(incidents.sessionId, sessionId),
    orderBy: [desc(incidents.createdAt)],
  });

  return results;
};

export const findIncidentsBySessionAndStatus = async (
  db: DB,
  sessionId: string,
  status: IncidentStatus,
): Promise<Incident[]> => {
  const results = await db.query.incidents.findMany({
    where: and(eq(incidents.sessionId, sessionId), eq(incidents.status, status)),
    orderBy: [desc(incidents.createdAt)],
  });

  return results;
};

export const findActiveIncidentsBySessionId = async (
  db: DB,
  sessionId: string,
): Promise<Incident[]> => {
  const openStatuses: IncidentStatus[] = ['open', 'investigating', 'contained'];
  const results: Incident[] = [];

  for (const status of openStatuses) {
    const incidentsList = await findIncidentsBySessionAndStatus(db, sessionId, status);
    results.push(...incidentsList);
  }

  return results;
};

export const updateIncident = async (
  db: DB,
  incidentId: string,
  data: Partial<NewIncident>,
): Promise<Incident | null> => {
  const [updated] = await db
    .update(incidents)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(incidents.incidentId, incidentId))
    .returning();

  return updated || null;
};

export const addIncidentTimelineEntry = async (
  db: DB,
  incidentId: string,
  entry: {
    timestamp: string;
    day: number;
    action: string;
    description: string;
    actor: 'system' | 'player';
  },
): Promise<Incident | null> => {
  const incident = await findIncidentById(db, incidentId);
  if (!incident) {
    return null;
  }

  const currentTimeline = (incident.timeline as Array<typeof entry>) || [];
  const updatedTimeline = [...currentTimeline, entry];

  return updateIncident(db, incidentId, {
    timeline: updatedTimeline as never,
  });
};

export const addIncidentResponseAction = async (
  db: DB,
  incidentId: string,
  action: {
    actionId: string;
    actionType: string;
    timestamp: string;
    day: number;
    effectiveness: number;
    notes?: string | undefined;
  },
): Promise<Incident | null> => {
  const incident = await findIncidentById(db, incidentId);
  if (!incident) {
    return null;
  }

  const currentActions = (incident.responseActions as Array<typeof action>) || [];
  const updatedActions = [...currentActions, action];

  return updateIncident(db, incidentId, {
    responseActions: updatedActions as never,
  });
};

export const deleteIncident = async (db: DB, incidentId: string): Promise<boolean> => {
  const deleted = await db
    .delete(incidents)
    .where(eq(incidents.incidentId, incidentId))
    .returning({ incidentId: incidents.incidentId });

  return deleted.length > 0;
};

export const countIncidentsBySession = async (db: DB, sessionId: string): Promise<number> => {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(incidents)
    .where(eq(incidents.sessionId, sessionId));

  return result[0]?.count ?? 0;
};

export const countIncidentsBySessionAndStatus = async (
  db: DB,
  sessionId: string,
  status: IncidentStatus,
): Promise<number> => {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(incidents)
    .where(and(eq(incidents.sessionId, sessionId), eq(incidents.status, status)));

  return result[0]?.count ?? 0;
};
