export { SSOError } from './sso-shared.js';
export { encryptClientSecret, decryptClientSecret } from './sso-shared.js';
export type {
  SSOProvider,
  SAMLConfig,
  SAMLAttributeMapping,
  RoleMappingRule,
  SAMLIdPMetadata,
  SAMLValidationResult,
  SSOStateStore,
  SSOStateData,
  SSOAccountLinkingResult,
} from './sso-shared.js';
export {
  DEFAULT_ROLE_MAPPING,
  DEFAULT_SESSION_TIMEOUT,
  REMEMBER_ME_TIMEOUT,
} from './sso-shared.js';

export {
  validateSAMLAssertion,
  fetchAndParseIdPMetadata,
  validateSAMLResponse,
  mapGroupsToRole,
  buildSAMLAuthnRequest,
  generateSPMetadata,
  getSAMLProviderConfig,
  clearIdPMetadataCache,
} from './sso-saml.service.js';

export type { OIDCIdPMetadata } from './sso-oidc.service.js';
export type {
  OIDCTokenResponse,
  OIDCTokens,
  RefreshedTokens,
  OIDCUserInfoResponse,
  JWKS,
  DecodedJWT,
  OIDCProviderConfigInput,
} from './sso-oidc.service.js';
export {
  fetchAndParseOIDCDiscovery,
  clearOIDCMetadataCache,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchOIDCUserInfo,
  fetchTransitiveGroupMemberships,
  fetchJWKS,
  decodeJWT,
  verifyOIDCJWT,
  validateOIDCIdToken,
  validateOIDCProviderTrust,
  buildOIDCAuthorizationUrl,
  generateState,
  generateNonce,
  generatePKCECodeVerifier,
  generatePKCECodeChallenge,
  buildOIDCLogoutUrl,
  getOIDCProviderConfig,
} from './sso-oidc.service.js';

export type { CreateSAMLProviderInput, UpdateSAMLProviderInput } from './sso-provider.service.js';
export {
  createSAMLProvider,
  updateSAMLProvider,
  deleteSAMLProvider,
  testSAMLProviderConnection,
} from './sso-provider.service.js';
export type { CreateOIDCProviderInput, UpdateOIDCProviderInput } from './sso-provider.service.js';
export {
  createOIDCProvider,
  updateOIDCProvider,
  deleteOIDCProvider,
  testOIDCProviderConnection,
  getSSOProvider,
  getSSOProviderById,
  getActiveSSOProviders,
} from './sso-provider.service.js';

export type { CreateSSOUserInput, NotifyJITUserCreatedOptions } from './sso-user.service.js';
export {
  findUserBySSOIdentity,
  findUserByEmail,
  linkUserToSSOIdentity,
  createSSOUser,
  notifyJITUserCreated,
  resolveSSOAccountLinking,
} from './sso-user.service.js';

export {
  storeOIDCState,
  getOIDCState,
  deleteOIDCState,
  createSAMLLoginSession,
} from './sso-session.service.js';
