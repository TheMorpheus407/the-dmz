import * as crypto from 'crypto';

import type {
  SSOProviderConfig,
  SSOIdentityClaim,
  SSOTrustFailureReason,
} from '@the-dmz/shared/auth';
import { ErrorCodes } from '@the-dmz/shared/constants';

import { SSOError, decryptClientSecret } from './sso-shared.js';

import type { SSOProvider } from './sso-shared.js';

export interface OIDCIdPMetadata {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  endSessionEndpoint?: string;
  introspectionEndpoint?: string;
  revocationEndpoint?: string;
  scopesSupported?: string[];
  responseTypesSupported?: string[];
  responseModesSupported?: string[];
  tokenEndpointAuthMethodsSupported?: string[];
  grantTypesSupported?: string[];
}

const oidcMetadataCache: Map<string, { metadata: OIDCIdPMetadata; expiresAt: number }> = new Map();

export const fetchAndParseOIDCDiscovery = async (
  metadataUrl: string,
  cacheDurationMs: number = 3600000,
): Promise<OIDCIdPMetadata> => {
  const cached = oidcMetadataCache.get(metadataUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.metadata;
  }

  try {
    const response = await fetch(metadataUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new SSOError({
        message: `Failed to fetch OIDC Discovery metadata: HTTP ${response.status}`,
        code: ErrorCodes.SSO_METADATA_FETCH_FAILED,
        statusCode: 502,
      });
    }

    const discovery = (await response.json()) as Record<string, unknown>;

    const issuer = discovery['issuer'] as string | undefined;
    if (!issuer) {
      throw new SSOError({
        message: 'Invalid OIDC Discovery metadata: missing issuer',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const authorizationEndpoint = discovery['authorization_endpoint'] as string | undefined;
    if (!authorizationEndpoint) {
      throw new SSOError({
        message: 'Invalid OIDC Discovery metadata: missing authorization_endpoint',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const tokenEndpoint = discovery['token_endpoint'] as string | undefined;
    if (!tokenEndpoint) {
      throw new SSOError({
        message: 'Invalid OIDC Discovery metadata: missing token_endpoint',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const userinfoEndpoint = discovery['userinfo_endpoint'] as string | undefined;
    const jwksUri = discovery['jwks_uri'] as string | undefined;
    const endSessionEndpoint = discovery['end_session_endpoint'] as string | undefined;
    const introspectionEndpoint = discovery['introspection_endpoint'] as string | undefined;
    const revocationEndpoint = discovery['revocation_endpoint'] as string | undefined;
    const scopesSupported = discovery['scopes_supported'] as string[] | undefined;
    const responseTypesSupported = discovery['response_types_supported'] as string[] | undefined;
    const responseModesSupported = discovery['response_modes_supported'] as string[] | undefined;
    const tokenEndpointAuthMethodsSupported = discovery['token_endpoint_auth_methods_supported'] as
      | string[]
      | undefined;
    const grantTypesSupported = discovery['grant_types_supported'] as string[] | undefined;

    const metadata: OIDCIdPMetadata = {
      issuer,
      authorizationEndpoint,
      tokenEndpoint,
      ...(userinfoEndpoint && { userinfoEndpoint }),
      ...(jwksUri && { jwksUri }),
      ...(endSessionEndpoint && { endSessionEndpoint }),
      ...(introspectionEndpoint && { introspectionEndpoint }),
      ...(revocationEndpoint && { revocationEndpoint }),
      ...(scopesSupported && { scopesSupported }),
      ...(responseTypesSupported && { responseTypesSupported }),
      ...(responseModesSupported && { responseModesSupported }),
      ...(tokenEndpointAuthMethodsSupported && { tokenEndpointAuthMethodsSupported }),
      ...(grantTypesSupported && { grantTypesSupported }),
    };

    oidcMetadataCache.set(metadataUrl, {
      metadata,
      expiresAt: Date.now() + cacheDurationMs,
    });

    return metadata;
  } catch (error) {
    if (error instanceof SSOError) {
      throw error;
    }
    throw new SSOError({
      message: `Failed to parse OIDC Discovery metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: ErrorCodes.SSO_METADATA_FETCH_FAILED,
      statusCode: 502,
    });
  }
};

export const clearOIDCMetadataCache = (metadataUrl?: string): void => {
  if (metadataUrl) {
    oidcMetadataCache.delete(metadataUrl);
  } else {
    oidcMetadataCache.clear();
  }
};

export interface OIDCTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface OIDCTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

export const exchangeCodeForTokens = async (
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<OIDCTokens> => {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = 'Token exchange failed';
    try {
      const errorJson = JSON.parse(errorBody) as { error_description?: string; error?: string };
      errorMessage = errorJson.error_description || errorJson.error || errorMessage;
    } catch {
      errorMessage = errorBody || errorMessage;
    }

    throw new SSOError({
      message: `Token exchange failed: ${errorMessage}`,
      code: ErrorCodes.SSO_TOKEN_EXCHANGE_FAILED,
      statusCode: 400,
    });
  }

  const tokenData = (await response.json()) as OIDCTokenResponse;

  const idToken = tokenData.id_token;
  const refreshToken = tokenData.refresh_token;
  const scope = tokenData.scope;

  const tokens: OIDCTokens = {
    accessToken: tokenData.access_token,
    tokenType: tokenData.token_type,
    expiresIn: tokenData.expires_in,
    ...(idToken && { idToken }),
    ...(refreshToken && { refreshToken }),
    ...(scope && { scope }),
  };

  return tokens;
};

export interface RefreshedTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn: number;
}

export const refreshAccessToken = async (
  tokenEndpoint: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<RefreshedTokens> => {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = 'Token refresh failed';
    try {
      const errorJson = JSON.parse(errorBody) as { error_description?: string; error?: string };
      errorMessage = errorJson.error_description || errorJson.error || errorMessage;
    } catch {
      errorMessage = errorBody || errorMessage;
    }

    throw new SSOError({
      message: `Token refresh failed: ${errorMessage}`,
      code: ErrorCodes.SSO_TOKEN_INVALID,
      statusCode: 401,
    });
  }

  const tokenData = (await response.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope?: string;
  };

  const result: RefreshedTokens = {
    accessToken: tokenData.access_token,
    expiresIn: tokenData.expires_in,
  };

  if (tokenData.id_token) {
    result.idToken = tokenData.id_token;
  }

  if (tokenData.refresh_token) {
    result.refreshToken = tokenData.refresh_token;
  }

  return result;
};

export interface OIDCUserInfoResponse {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  profile?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  [key: string]: unknown;
}

export const fetchOIDCUserInfo = async (
  userinfoEndpoint: string,
  accessToken: string,
): Promise<OIDCUserInfoResponse> => {
  const response = await fetch(userinfoEndpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new SSOError({
      message: `UserInfo request failed: HTTP ${response.status}`,
      code: ErrorCodes.SSO_USERINFO_FAILED,
      statusCode: 400,
    });
  }

  return (await response.json()) as OIDCUserInfoResponse;
};

export const fetchTransitiveGroupMemberships = async (
  accessToken: string,
  userId: string,
): Promise<string[]> => {
  const graphApiUrl = 'https://graph.microsoft.com/v1.0';

  try {
    const response = await fetch(
      `${graphApiUrl}/users/${userId}/transitiveMemberOf?$select=displayName&$top=999`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      value?: Array<{ displayName?: string; '@odata.type'?: string }>;
    };

    const groups: string[] = [];
    if (data.value) {
      for (const member of data.value) {
        if (member['@odata.type'] === '#microsoft.graph.group' && member.displayName) {
          groups.push(member.displayName);
        }
      }
    }

    return groups;
  } catch {
    return [];
  }
};

interface JWKSKey {
  kty: string;
  use?: string;
  kid?: string;
  alg?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
}

export interface JWKS {
  keys: JWKSKey[];
}

const jwksCache: Map<string, { jwks: JWKS; expiresAt: number }> = new Map();

export const fetchJWKS = async (
  jwksUri: string,
  cacheDurationMs: number = 3600000,
): Promise<JWKS> => {
  const cached = jwksCache.get(jwksUri);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.jwks;
  }

  const response = await fetch(jwksUri, {
    method: 'GET',
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new SSOError({
      message: `Failed to fetch JWKS: HTTP ${response.status}`,
      code: ErrorCodes.SSO_JWKS_FETCH_FAILED,
      statusCode: 502,
    });
  }

  const jwks = (await response.json()) as JWKS;

  jwksCache.set(jwksUri, {
    jwks,
    expiresAt: Date.now() + cacheDurationMs,
  });

  return jwks;
};

const base64UrlDecode = (str: string): string => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
};

export interface DecodedJWT {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: { header: string; payload: string; signature: string };
}

export const decodeJWT = (token: string): DecodedJWT => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new SSOError({
      message: 'Invalid JWT format',
      code: ErrorCodes.SSO_TOKEN_INVALID,
      statusCode: 400,
    });
  }

  const header = JSON.parse(base64UrlDecode(parts[0]!)) as Record<string, unknown>;
  const payload = JSON.parse(base64UrlDecode(parts[1]!)) as Record<string, unknown>;
  const signature = parts[2]!;

  return {
    header,
    payload,
    signature,
    raw: {
      header: parts[0]!,
      payload: parts[1]!,
      signature,
    },
  };
};

const createPublicKeyFromJWK = (jwk: JWKSKey): crypto.KeyObject => {
  if (jwk.kty === 'RSA') {
    const jwkJson = {
      kty: 'RSA',
      n: jwk.n,
      e: jwk.e,
    };

    return crypto.createPublicKey({
      key: JSON.stringify(jwkJson),
      format: 'jwk',
    });
  }

  if (jwk.kty === 'EC') {
    const jwkJson = {
      kty: 'EC',
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
    };

    return crypto.createPublicKey({
      key: JSON.stringify(jwkJson),
      format: 'jwk',
    });
  }

  throw new SSOError({
    message: `Unsupported JWK key type: ${jwk.kty}`,
    code: ErrorCodes.SSO_TOKEN_INVALID,
    statusCode: 400,
  });
};

const verifyJWSSignature = (
  jwk: JWKSKey,
  signature: string,
  signingInput: string,
  algorithm: string,
): boolean => {
  try {
    const publicKey = createPublicKeyFromJWK(jwk);

    const signatureBuffer = Buffer.from(signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    const algorithmMap: Record<string, string> = {
      RS256: 'RSA-SHA256',
      RS384: 'RSA-SHA384',
      RS512: 'RSA-SHA512',
      ES256: 'ECDSA-SHA256',
      ES384: 'ECDSA-SHA384',
      ES512: 'ECDSA-SHA512',
      PS256: 'RSA-SHA256',
      PS384: 'RSA-SHA384',
      PS512: 'RSA-SHA512',
    };

    const cryptoAlg = algorithmMap[algorithm];
    if (!cryptoAlg) {
      throw new SSOError({
        message: `Unsupported algorithm: ${algorithm}`,
        code: ErrorCodes.SSO_TOKEN_INVALID,
        statusCode: 400,
      });
    }

    const verifier = crypto.createVerify(cryptoAlg);
    verifier.update(signingInput);
    verifier.end();

    return verifier.verify(publicKey, signatureBuffer);
  } catch {
    return false;
  }
};

export const verifyOIDCJWT = async (
  token: string,
  jwks: JWKS,
  expectedAlg: string,
  expectedIssuer: string,
  expectedAudience: string,
): Promise<DecodedJWT> => {
  const decoded = decodeJWT(token);

  const headerAlg = decoded.header['alg'] as string | undefined;
  if (headerAlg !== expectedAlg) {
    throw new SSOError({
      message: `JWT algorithm mismatch: expected ${expectedAlg}, got ${headerAlg}`,
      code: ErrorCodes.SSO_TOKEN_INVALID,
      statusCode: 400,
    });
  }

  const kid = decoded.header['kid'] as string | undefined;

  let key: JWKSKey | undefined;
  if (kid) {
    key = jwks.keys.find((k) => k.kid === kid);
  } else {
    key = jwks.keys.find((k) => k.alg === expectedAlg || k.use === 'sig');
  }

  if (!key) {
    throw new SSOError({
      message: 'No matching key found in JWKS',
      code: ErrorCodes.SSO_TOKEN_INVALID,
      statusCode: 400,
    });
  }

  const signingInput = `${decoded.raw.header}.${decoded.raw.payload}`;

  const isSignatureValid = verifyJWSSignature(
    key,
    decoded.raw.signature,
    signingInput,
    expectedAlg,
  );
  if (!isSignatureValid) {
    throw new SSOError({
      message: 'Invalid JWT signature',
      code: ErrorCodes.SSO_INVALID_SIGNATURE,
      statusCode: 400,
    });
  }

  const payload = decoded.payload;
  const iss = payload['iss'] as string | undefined;
  const aud = payload['aud'] as string | string[] | undefined;
  const exp = payload['exp'] as number | undefined;
  const iat = payload['iat'] as number | undefined;

  if (iss !== expectedIssuer) {
    throw new SSOError({
      message: `Issuer mismatch: expected ${expectedIssuer}, got ${iss}`,
      code: ErrorCodes.SSO_ISSUER_MISMATCH,
      statusCode: 400,
    });
  }

  const audValue = Array.isArray(aud) ? aud[0] : aud;
  if (audValue !== expectedAudience) {
    throw new SSOError({
      message: `Audience mismatch: expected ${expectedAudience}, got ${audValue}`,
      code: ErrorCodes.SSO_AUDIENCE_MISMATCH,
      statusCode: 400,
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (exp && exp < now) {
    throw new SSOError({
      message: 'Token expired',
      code: ErrorCodes.SSO_TOKEN_EXPIRED,
      statusCode: 400,
    });
  }

  if (iat && iat > now + 60) {
    throw new SSOError({
      message: 'Token issued in the future',
      code: ErrorCodes.SSO_TOKEN_EARLY,
      statusCode: 400,
    });
  }

  return decoded;
};

export const validateOIDCIdToken = async (
  idToken: string,
  jwksUri: string,
  issuer: string,
  clientId: string,
  expectedNonce?: string,
  _allowedClockSkewSeconds: number = 60,
): Promise<{
  valid: boolean;
  claims?: Record<string, unknown>;
  failureReason?: string;
}> => {
  try {
    const jwks = await fetchJWKS(jwksUri);

    const decoded = await verifyOIDCJWT(idToken, jwks, 'RS256', issuer, clientId);

    const payload = decoded.payload;

    if (expectedNonce) {
      const nonce = payload['nonce'] as string | undefined;
      if (nonce !== expectedNonce) {
        return {
          valid: false,
          failureReason: 'nonce_mismatch',
        };
      }
    }

    return {
      valid: true,
      claims: payload,
    };
  } catch (error) {
    if (error instanceof SSOError) {
      return {
        valid: false,
        failureReason: error.failureReason || error.code,
      };
    }
    return {
      valid: false,
      failureReason: 'invalid_token',
    };
  }
};

export const validateOIDCProviderTrust = async (
  providerConfig: SSOProviderConfig,
  idTokenClaims: Record<string, unknown>,
  expectedNonce?: string,
): Promise<{
  valid: boolean;
  failureReason?: SSOTrustFailureReason;
  claims?: SSOIdentityClaim;
}> => {
  if (providerConfig.type !== 'oidc') {
    return {
      valid: false,
      failureReason: 'configuration_error',
    };
  }

  const issuer = idTokenClaims['iss'] as string | undefined;
  const subject = idTokenClaims['sub'] as string | undefined;
  const audience = idTokenClaims['aud'] as string | string[] | undefined;
  const exp = idTokenClaims['exp'] as number | undefined;
  const iat = idTokenClaims['iat'] as number | undefined;
  const nonce = idTokenClaims['nonce'] as string | undefined;
  const email = idTokenClaims['email'] as string | undefined;
  const name = idTokenClaims['name'] as string | undefined;
  const groups = idTokenClaims['groups'] as string[] | undefined;
  const department = idTokenClaims['department'] as string | undefined;
  const title = idTokenClaims['title'] as string | undefined;
  const manager = idTokenClaims['manager'] as string | undefined;

  if (!subject) {
    return {
      valid: false,
      failureReason: 'missing_required_claim',
    };
  }

  if (issuer !== providerConfig.issuer) {
    return {
      valid: false,
      failureReason: 'issuer_mismatch',
    };
  }

  const audienceValue = Array.isArray(audience) ? audience[0] : audience;
  if (audienceValue !== providerConfig.clientId) {
    return {
      valid: false,
      failureReason: 'audience_mismatch',
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const clockSkew = providerConfig.allowedClockSkewSeconds;

  if (exp && exp < now - clockSkew) {
    return {
      valid: false,
      failureReason: 'token_expired',
    };
  }

  if (iat && iat > now + clockSkew) {
    return {
      valid: false,
      failureReason: 'token_early',
    };
  }

  if (expectedNonce && nonce !== expectedNonce) {
    return {
      valid: false,
      failureReason: 'nonce_mismatch',
    };
  }

  const claims: SSOIdentityClaim = {
    subject,
    email: email,
    displayName: name,
    groups: groups,
    department: department,
    title: title,
    manager: manager,
  };

  return {
    valid: true,
    claims,
  };
};

export const buildOIDCAuthorizationUrl = async (
  providerConfig: SSOProviderConfig,
  clientId: string,
  redirectUri: string,
  state: string,
  nonce: string,
  pkceCodeVerifier?: string,
): Promise<string> => {
  if (providerConfig.type !== 'oidc') {
    throw new SSOError({
      message: 'Invalid provider type',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 500,
    });
  }

  const params = new URLSearchParams({
    response_type: providerConfig.responseType,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: providerConfig.scopes.join(' '),
    state,
    nonce,
  });

  if (providerConfig.responseMode) {
    params.set('response_mode', providerConfig.responseMode);
  }

  if (pkceCodeVerifier) {
    const codeChallenge = await generatePKCECodeChallenge(pkceCodeVerifier);
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  return `${providerConfig.authorizationEndpoint}?${params.toString()}`;
};

export const generateState = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
};

export const generateNonce = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
};

export const generatePKCECodeVerifier = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
};

export const generatePKCECodeChallenge = async (codeVerifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const buildOIDCLogoutUrl = (
  endSessionEndpoint: string,
  idTokenHint: string,
  postLogoutRedirectUri?: string,
  state?: string,
): string => {
  const params = new URLSearchParams({
    id_token_hint: idTokenHint,
  });

  if (postLogoutRedirectUri) {
    params.append('post_logout_redirect_uri', postLogoutRedirectUri);
  }

  if (state) {
    params.append('state', state);
  }

  return `${endSessionEndpoint}?${params.toString()}`;
};

export interface OIDCProviderConfigInput {
  metadataUrl: string;
  clientId: string;
  clientSecret: string;
}

export const getOIDCProviderConfig = async (
  provider: SSOProvider,
): Promise<{
  metadata: OIDCIdPMetadata;
  clientId: string;
  clientSecret: string;
}> => {
  if (!provider.metadataUrl) {
    throw new SSOError({
      message: 'OIDC provider metadata URL not configured',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 400,
    });
  }

  if (!provider.clientId || !provider.clientSecretEncrypted) {
    throw new SSOError({
      message: 'OIDC client credentials not configured',
      code: ErrorCodes.SSO_CONFIGURATION_ERROR,
      statusCode: 400,
    });
  }

  const metadata = await fetchAndParseOIDCDiscovery(provider.metadataUrl);

  const decryptedClientSecret = decryptClientSecret(provider.clientSecretEncrypted);

  return {
    metadata,
    clientId: provider.clientId,
    clientSecret: decryptedClientSecret,
  };
};
