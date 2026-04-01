export type SimulationStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
export type SimulationOutcome = 'clicked' | 'reported' | 'ignored' | 'pending';

export interface PhishingSimulation {
  simulationId: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: SimulationStatus;
  templateId: string | null;
  difficultyTier: number;
  urgencyLevel: UrgencyLevel;
  senderName: string | null;
  senderEmail: string | null;
  replyTo: string | null;
  subject: string;
  body: string;
  includeAttachment: boolean;
  attachmentName: string | null;
  trackingEnabled: boolean;
  teachableMomentId: string | null;
  scheduledStartDate: Date | null;
  scheduledEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  timezone: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhishingSimulationInput {
  name: string;
  description?: string | undefined;
  templateId?: string | undefined;
  difficultyTier?: number | undefined;
  urgencyLevel?: UrgencyLevel | undefined;
  senderName?: string | undefined;
  senderEmail?: string | undefined;
  replyTo?: string | undefined;
  subject: string;
  body: string;
  includeAttachment?: boolean | undefined;
  attachmentName?: string | undefined;
  trackingEnabled?: boolean | undefined;
  teachableMomentId?: string | undefined;
  scheduledStartDate?: Date | undefined;
  scheduledEndDate?: Date | undefined;
  timezone?: string | undefined;
  createdBy: string;
}

export interface PhishingSimulationUpdateInput {
  name?: string | undefined;
  description?: string | undefined;
  templateId?: string | undefined;
  difficultyTier?: number | undefined;
  urgencyLevel?: UrgencyLevel | undefined;
  senderName?: string | undefined;
  senderEmail?: string | undefined;
  replyTo?: string | undefined;
  subject?: string | undefined;
  body?: string | undefined;
  includeAttachment?: boolean | undefined;
  attachmentName?: string | undefined;
  trackingEnabled?: boolean | undefined;
  teachableMomentId?: string | undefined;
  scheduledStartDate?: Date | undefined;
  scheduledEndDate?: Date | undefined;
  timezone?: string | undefined;
}

export interface SimulationAudienceInput {
  groupIds?: string[] | undefined;
  departments?: string[] | undefined;
  locations?: string[] | undefined;
  roles?: string[] | undefined;
  attributeFilters?: Record<string, unknown> | undefined;
}

export interface PhishingSimulationAudience {
  audienceId: string;
  simulationId: string;
  groupIds: string[];
  departments: string[];
  locations: string[];
  roles: string[];
  attributeFilters: Record<string, unknown>;
  targetUserCount: number | null;
  enrolledUserCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhishingSimulationResult {
  resultId: string;
  simulationId: string;
  userId: string;
  emailDelivered: boolean;
  emailOpened: boolean;
  linkClicked: boolean;
  clickedAt: Date | null;
  timeToClickSeconds: number | null;
  reported: boolean;
  reportedAt: Date | null;
  timeToReportSeconds: number | null;
  attachmentOpened: boolean;
  attachmentOpenedAt: Date | null;
  simulationOutcome: SimulationOutcome | null;
  teachableMomentViewed: boolean;
  teachableMomentViewedAt: Date | null;
  enrolledInMicroTraining: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimulationResultInput {
  userId: string;
  simulationId: string;
}

export interface PhishingSimulationTemplate {
  templateId: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  difficultyTier: number;
  urgencyLevel: UrgencyLevel;
  senderName: string | null;
  senderEmail: string | null;
  replyTo: string | null;
  subject: string;
  body: string;
  mergeTags: string[];
  includeAttachment: boolean;
  attachmentName: string | null;
  indicatorHints: string[];
  teachableMomentConfig: Record<string, unknown>;
  isActive: boolean;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PhishingSimulationTemplateInput {
  name: string;
  description?: string | undefined;
  category?: string | undefined;
  difficultyTier?: number | undefined;
  urgencyLevel?: UrgencyLevel | undefined;
  senderName?: string | undefined;
  senderEmail?: string | undefined;
  replyTo?: string | undefined;
  subject: string;
  body: string;
  mergeTags?: string[] | undefined;
  includeAttachment?: boolean | undefined;
  attachmentName?: string | undefined;
  indicatorHints?: string[] | undefined;
  teachableMomentConfig?: Record<string, unknown> | undefined;
}

export interface TeachableMoment {
  momentId: string;
  tenantId: string;
  name: string;
  title: string;
  description: string;
  indicatorType: string | null;
  educationalContent: string;
  whatToDoInstead: string;
  microTrainingCourseId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeachableMomentInput {
  name: string;
  title: string;
  description: string;
  indicatorType?: string | undefined;
  educationalContent: string;
  whatToDoInstead: string;
  microTrainingCourseId?: string | undefined;
}

export interface SimulationResultsSummary {
  totalTargeted: number;
  emailDelivered: number;
  emailOpened: number;
  linkClicked: number;
  clickRate: number;
  reported: number;
  reportRate: number;
  attachmentOpened: number;
  teachableMomentViewed: number;
  microTrainingEnrolled: number;
  byDepartment: {
    department: string;
    total: number;
    clicked: number;
    reported: number;
    clickRate: number;
    reportRate: number;
  }[];
  byRole: {
    role: string;
    total: number;
    clicked: number;
    reported: number;
    clickRate: number;
    reportRate: number;
  }[];
  timeToClickDistribution: { bucket: string; count: number }[];
  repeatFailures: string[];
}
