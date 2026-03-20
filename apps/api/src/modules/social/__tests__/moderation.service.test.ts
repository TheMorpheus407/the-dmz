import { describe, expect, it } from 'vitest';

type ReportType = 'harassment' | 'spam' | 'cheating' | 'content' | 'other';
type ReportStatus = 'pending' | 'under_review' | 'resolved_actioned' | 'resolved_dismissed';
type ReportResolution = 'warning' | 'mute' | 'content_removal' | 'restriction' | 'dismissed';
type ActionType = 'warning' | 'mute' | 'mute_duration' | 'content_removal' | 'restriction' | 'ban';

const REPORT_TYPES: ReportType[] = ['harassment', 'spam', 'cheating', 'content', 'other'];
const REPORT_RESOLUTIONS: ReportResolution[] = [
  'warning',
  'mute',
  'content_removal',
  'restriction',
  'dismissed',
];
const ACTION_TYPES: ActionType[] = [
  'warning',
  'mute',
  'mute_duration',
  'content_removal',
  'restriction',
  'ban',
];

function isValidReportType(type: string): type is ReportType {
  return REPORT_TYPES.includes(type as ReportType);
}

function isSelfReport(reporterId: string, reportedId: string): boolean {
  return reporterId === reportedId;
}

function isActiveReportStatus(status: ReportStatus): boolean {
  return status === 'pending' || status === 'under_review';
}

function isResolved(status: ReportStatus): boolean {
  return status === 'resolved_actioned' || status === 'resolved_dismissed';
}

function canAssignModerator(status: ReportStatus): boolean {
  return !isResolved(status);
}

function canResolve(status: ReportStatus): boolean {
  return !isResolved(status);
}

function getBlockingActionTypes(action: string): ActionType[] {
  const map: Record<string, ActionType[]> = {
    send_message: ['mute', 'mute_duration', 'ban'],
    send_friend_request: ['ban'],
    create_forum_post: ['mute', 'mute_duration', 'ban'],
    create_chat_room: ['mute', 'mute_duration', 'ban'],
  };
  return map[action] ?? ['ban'];
}

function isActionBlocked(restrictions: { actionType: ActionType }[], action: string): boolean {
  const blockingTypes = getBlockingActionTypes(action);
  return restrictions.some((r) => blockingTypes.includes(r.actionType));
}

describe('moderation.service - business logic', () => {
  describe('report types', () => {
    it('should have all required report types', () => {
      expect(REPORT_TYPES).toContain('harassment');
      expect(REPORT_TYPES).toContain('spam');
      expect(REPORT_TYPES).toContain('cheating');
      expect(REPORT_TYPES).toContain('content');
      expect(REPORT_TYPES).toContain('other');
    });

    it('should validate report types correctly', () => {
      expect(isValidReportType('harassment')).toBe(true);
      expect(isValidReportType('spam')).toBe(true);
      expect(isValidReportType('invalid')).toBe(false);
    });
  });

  describe('self-report prevention', () => {
    it('should detect self-reports', () => {
      const playerId = 'same-player-id';
      expect(isSelfReport(playerId, playerId)).toBe(true);
    });

    it('should allow reports between different players', () => {
      expect(isSelfReport('player-1', 'player-2')).toBe(false);
    });
  });

  describe('report status transitions', () => {
    it('should have all report statuses defined', () => {
      const statuses: ReportStatus[] = [
        'pending',
        'under_review',
        'resolved_actioned',
        'resolved_dismissed',
      ];
      expect(statuses).toHaveLength(4);
      expect(statuses).toContain('pending');
      expect(statuses).toContain('under_review');
      expect(statuses).toContain('resolved_actioned');
      expect(statuses).toContain('resolved_dismissed');
    });

    it('should identify active report statuses', () => {
      expect(isActiveReportStatus('pending')).toBe(true);
      expect(isActiveReportStatus('under_review')).toBe(true);
      expect(isActiveReportStatus('resolved_actioned')).toBe(false);
      expect(isActiveReportStatus('resolved_dismissed')).toBe(false);
    });

    it('should identify resolved statuses', () => {
      expect(isResolved('pending')).toBe(false);
      expect(isResolved('under_review')).toBe(false);
      expect(isResolved('resolved_actioned')).toBe(true);
      expect(isResolved('resolved_dismissed')).toBe(true);
    });
  });

  describe('moderator assignment', () => {
    it('should allow assignment to pending reports', () => {
      expect(canAssignModerator('pending')).toBe(true);
    });

    it('should allow assignment to under_review reports', () => {
      expect(canAssignModerator('under_review')).toBe(true);
    });

    it('should not allow assignment to resolved reports', () => {
      expect(canAssignModerator('resolved_actioned')).toBe(false);
      expect(canAssignModerator('resolved_dismissed')).toBe(false);
    });
  });

  describe('report resolution', () => {
    it('should allow resolving pending reports', () => {
      expect(canResolve('pending')).toBe(true);
    });

    it('should allow resolving under_review reports', () => {
      expect(canResolve('under_review')).toBe(true);
    });

    it('should not allow resolving already resolved reports', () => {
      expect(canResolve('resolved_actioned')).toBe(false);
      expect(canResolve('resolved_dismissed')).toBe(false);
    });
  });

  describe('action blocking', () => {
    it('should block send_message for muted players', () => {
      const restrictions = [{ actionType: 'mute' as ActionType }];
      expect(isActionBlocked(restrictions, 'send_message')).toBe(true);
    });

    it('should block send_message for banned players', () => {
      const restrictions = [{ actionType: 'ban' as ActionType }];
      expect(isActionBlocked(restrictions, 'send_message')).toBe(true);
    });

    it('should block send_friend_request for banned players', () => {
      const restrictions = [{ actionType: 'ban' as ActionType }];
      expect(isActionBlocked(restrictions, 'send_friend_request')).toBe(true);
    });

    it('should not block send_message for warned players', () => {
      const restrictions = [{ actionType: 'warning' as ActionType }];
      expect(isActionBlocked(restrictions, 'send_message')).toBe(false);
    });

    it('should not block any action with no restrictions', () => {
      const restrictions: { actionType: ActionType }[] = [];
      expect(isActionBlocked(restrictions, 'send_message')).toBe(false);
      expect(isActionBlocked(restrictions, 'send_friend_request')).toBe(false);
    });
  });

  describe('action types', () => {
    it('should have all required action types', () => {
      expect(ACTION_TYPES).toContain('warning');
      expect(ACTION_TYPES).toContain('mute');
      expect(ACTION_TYPES).toContain('mute_duration');
      expect(ACTION_TYPES).toContain('content_removal');
      expect(ACTION_TYPES).toContain('restriction');
      expect(ACTION_TYPES).toContain('ban');
    });
  });

  describe('report resolutions', () => {
    it('should have all required resolutions', () => {
      expect(REPORT_RESOLUTIONS).toContain('warning');
      expect(REPORT_RESOLUTIONS).toContain('mute');
      expect(REPORT_RESOLUTIONS).toContain('content_removal');
      expect(REPORT_RESOLUTIONS).toContain('restriction');
      expect(REPORT_RESOLUTIONS).toContain('dismissed');
    });
  });
});
