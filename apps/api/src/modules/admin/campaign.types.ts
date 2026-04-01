export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type CampaignType = 'onboarding' | 'quarterly' | 'annual' | 'event-driven';
export type RecurrencePattern = 'one-time' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type CampaignContentType = 'module' | 'assessment' | 'phishing_simulation';
export type EnrollmentStatus = 'not_started' | 'in_progress' | 'completed';

export interface Campaign {
  campaignId: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  campaignType: CampaignType;
  createdBy: string;
  startDate: Date | null;
  endDate: Date | null;
  timezone: string;
  recurrencePattern: RecurrencePattern;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignAudience {
  audienceId: string;
  campaignId: string;
  groupIds: string[];
  departments: string[];
  locations: string[];
  roles: string[];
  attributeFilters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignContent {
  contentId: string;
  campaignId: string;
  contentType: CampaignContentType;
  contentItemId: string;
  orderIndex: number;
  dueDays: number;
  isPrerequisite: boolean;
  createdAt: Date;
}

export interface CampaignEnrollment {
  enrollmentId: string;
  campaignId: string;
  userId: string;
  status: EnrollmentStatus;
  enrolledAt: Date;
  completedAt: Date | null;
  dueDate: Date | null;
  lastReminderAt: Date | null;
  reminderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignTemplate {
  templateId: string;
  tenantId: string;
  name: string;
  description: string | null;
  campaignType: CampaignType;
  audienceConfig: Record<string, unknown>;
  contentConfig: Record<string, unknown>;
  scheduleConfig: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignEscalation {
  escalationId: string;
  campaignId: string;
  reminderDays: number[];
  managerNotification: boolean;
  complianceAlert: boolean;
  complianceAlertThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignInput {
  name: string;
  description?: string | undefined;
  campaignType: CampaignType;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  timezone?: string | undefined;
  recurrencePattern?: RecurrencePattern | undefined;
  createdBy: string;
}

export interface CampaignUpdateInput {
  name?: string | undefined;
  description?: string | undefined;
  campaignType?: CampaignType | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  timezone?: string | undefined;
  recurrencePattern?: RecurrencePattern | undefined;
}

export interface CampaignAudienceInput {
  groupIds?: string[] | undefined;
  departments?: string[] | undefined;
  locations?: string[] | undefined;
  roles?: string[] | undefined;
  attributeFilters?: Record<string, unknown> | undefined;
}

export interface CampaignContentInput {
  contentType: CampaignContentType;
  contentItemId: string;
  orderIndex?: number | undefined;
  dueDays?: number | undefined;
  isPrerequisite?: boolean | undefined;
}

export interface CampaignEscalationInput {
  reminderDays?: number[] | undefined;
  managerNotification?: boolean | undefined;
  complianceAlert?: boolean | undefined;
  complianceAlertThreshold?: number | undefined;
}

export interface CampaignTemplateInput {
  name: string;
  description?: string;
  campaignType: CampaignType;
  audienceConfig: Record<string, unknown>;
  contentConfig: Record<string, unknown>;
  scheduleConfig: Record<string, unknown>;
}

export interface CampaignWithRelations extends Campaign {
  audience?: CampaignAudience | null;
  content?: CampaignContent[];
  escalations?: CampaignEscalation | null;
  enrollmentCount?: number;
  completedCount?: number;
}

export interface CampaignListQuery {
  status?: CampaignStatus | undefined;
  campaignType?: CampaignType | undefined;
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  search?: string | undefined;
}

export interface CampaignListResult {
  campaigns: CampaignWithRelations[];
  total: number;
}

export interface CampaignProgressMetrics {
  totalEnrolled: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  completionRate: number;
  averageTimeToComplete: number | null;
  byDepartment: { department: string; total: number; completed: number; rate: number }[];
  byRole: { role: string; total: number; completed: number; rate: number }[];
}
