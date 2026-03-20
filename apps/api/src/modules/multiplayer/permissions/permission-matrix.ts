import { DAY_PHASES, type DayPhase } from '@the-dmz/shared/game';

export const COOP_PERMISSION_ROLES = [
  'triage_lead',
  'verification_lead',
  'perimeter_warden',
  'intake_analyst',
  'threat_hunter',
  'systems_keeper',
  'crypto_warden',
  'comms_officer',
] as const;

export type CoopPermissionRole = (typeof COOP_PERMISSION_ROLES)[number];

export const PERMISSION_MATRIX_VERSION = 1;

export type PermissionValue = true | 'Authority' | false;

export interface RolePhasePermissions {
  [action: string]: PermissionValue;
}

export interface RolePermissions {
  [phase: string]: readonly string[];
}

export interface PermissionMatrixConfig {
  version: number;
  roles: {
    [role: string]: RolePermissions;
  };
  authorityRole: string;
}

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrixConfig = {
  version: PERMISSION_MATRIX_VERSION,
  roles: {
    triage_lead: {
      [DAY_PHASES.PHASE_EMAIL_INTAKE]: [
        'view.inbox',
        'email.mark_indicator',
        'email.propose_decision',
        'verification.request',
      ],
      [DAY_PHASES.PHASE_TRIAGE]: [
        'view.inbox',
        'email.mark_indicator',
        'email.propose_decision',
        'verification.request',
      ],
      [DAY_PHASES.PHASE_VERIFICATION]: [],
      [DAY_PHASES.PHASE_DECISION]: ['action.confirm', 'action.override'],
      [DAY_PHASES.PHASE_CONSEQUENCES]: [],
      [DAY_PHASES.PHASE_THREAT_PROCESSING]: [],
      [DAY_PHASES.PHASE_INCIDENT_RESPONSE]: ['incident.execute_response'],
      [DAY_PHASES.PHASE_RANSOM]: [],
      [DAY_PHASES.PHASE_RECOVERY]: [],
      [DAY_PHASES.PHASE_RESOURCE_MANAGEMENT]: [],
      [DAY_PHASES.PHASE_UPGRADE]: [],
      [DAY_PHASES.PHASE_DAY_START]: [],
      [DAY_PHASES.PHASE_DAY_END]: [],
    },
    verification_lead: {
      [DAY_PHASES.PHASE_EMAIL_INTAKE]: [],
      [DAY_PHASES.PHASE_TRIAGE]: [],
      [DAY_PHASES.PHASE_VERIFICATION]: [
        'view.verification_packet',
        'verification.mark_inconsistency',
        'verification.propose_decision',
      ],
      [DAY_PHASES.PHASE_DECISION]: ['action.confirm', 'action.override'],
      [DAY_PHASES.PHASE_CONSEQUENCES]: [],
      [DAY_PHASES.PHASE_THREAT_PROCESSING]: [],
      [DAY_PHASES.PHASE_INCIDENT_RESPONSE]: ['incident.execute_response'],
      [DAY_PHASES.PHASE_RANSOM]: [],
      [DAY_PHASES.PHASE_RECOVERY]: [],
      [DAY_PHASES.PHASE_RESOURCE_MANAGEMENT]: [],
      [DAY_PHASES.PHASE_UPGRADE]: [],
      [DAY_PHASES.PHASE_DAY_START]: [],
      [DAY_PHASES.PHASE_DAY_END]: [],
    },
  },
  authorityRole: 'triage_lead',
};

export function getRolePermissionsForPhase(
  matrix: PermissionMatrixConfig,
  role: string,
  phase: DayPhase,
): readonly string[] {
  const rolePermissions = matrix.roles[role];
  if (!rolePermissions) {
    return [];
  }
  return rolePermissions[phase] ?? [];
}

export function isActionPermitted(
  matrix: PermissionMatrixConfig,
  role: string,
  phase: DayPhase,
  action: string,
): PermissionValue {
  if (action === 'action.confirm' || action === 'action.override') {
    const permissions = getRolePermissionsForPhase(matrix, role, phase);
    if (permissions.includes(action)) {
      return 'Authority';
    }
    return false;
  }

  const permissions = getRolePermissionsForPhase(matrix, role, phase);

  if (permissions.includes(action)) {
    return true;
  }

  return false;
}

export function getRolesForPhase(matrix: PermissionMatrixConfig, phase: DayPhase): string[] {
  const roles: string[] = [];
  for (const [role, rolePermissions] of Object.entries(matrix.roles)) {
    if (rolePermissions[phase] && rolePermissions[phase].length > 0) {
      roles.push(role);
    }
  }
  return roles;
}

export function mergePermissionMatrix(
  base: PermissionMatrixConfig,
  override: Partial<PermissionMatrixConfig>,
): PermissionMatrixConfig {
  return {
    version: override.version ?? base.version,
    authorityRole: override.authorityRole ?? base.authorityRole,
    roles: {
      ...base.roles,
      ...override.roles,
    },
  };
}

export function validatePermissionMatrix(config: unknown): config is PermissionMatrixConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const matrix = config as PermissionMatrixConfig;

  if (typeof matrix.version !== 'number') {
    return false;
  }

  if (!matrix.roles || typeof matrix.roles !== 'object') {
    return false;
  }

  if (typeof matrix.authorityRole !== 'string') {
    return false;
  }

  return true;
}

export function createDefaultRoleConfig(): PermissionMatrixConfig {
  return { ...DEFAULT_PERMISSION_MATRIX };
}
