export {
  DEFAULT_PERMISSION_MATRIX,
  COOP_PERMISSION_ROLES,
  PERMISSION_MATRIX_VERSION,
  createDefaultRoleConfig,
  getRolePermissionsForPhase,
  isActionPermitted,
  getRolesForPhase,
  mergePermissionMatrix,
  validatePermissionMatrix,
  type PermissionMatrixConfig,
  type PermissionValue,
  type RolePermissions,
  type RolePhasePermissions,
} from './permission-matrix.js';

export {
  PermissionDeniedError,
  checkPermission,
  createPermissionDeniedEvent,
  mapGameActionToPermissionAction,
  mapPhaseToPermissionPhase,
  type PermissionCheckParams,
} from './permission.enforcer.js';

export {
  getSessionRoleConfig,
  setSessionRoleConfig,
  overrideSessionRoleConfig,
  getRolePermissionsForSession,
  type RoleConfigResult,
  type RoleConfigOverrideInput,
} from './role-config.service.js';
