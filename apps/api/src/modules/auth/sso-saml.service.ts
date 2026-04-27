import * as crypto from 'crypto';

import { XMLParser, XMLBuilder } from 'fast-xml-parser';

import type {
  SSOProviderConfig,
  SSOIdentityClaim,
  SSOTrustFailureReason,
} from '@the-dmz/shared/auth';
import { ErrorCodes } from '@the-dmz/shared/constants';

import { SSOError, DEFAULT_ROLE_MAPPING } from './sso-shared.js';

import type {
  SAMLIdPMetadata,
  SAMLValidationResult,
  SSOProvider,
  RoleMappingRule,
} from './sso-shared.js';

const DEFAULT_ATTRIBUTE_MAPPING = {
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  groups: 'groups',
  department: 'department',
  title: 'title',
};

interface SAMLXMLEntityDescriptor {
  '@_entityID'?: string;
  IDPSSODescriptor?: SAMLXMLIDPSSODescriptor;
  Extensions?: {
    IDPAttribute?: {
      '@_Name'?: string;
    };
  };
}

interface SAMLXMLIDPSSODescriptor {
  '@_WantAssertionsSigned'?: string;
  '@_WantAuthnRequestsSigned'?: string;
  SingleSignOnService?: SAMLXMLSingleSignOnService | SAMLXMLSingleSignOnService[];
  KeyDescriptor?: SAMLXMLKeyDescriptor | SAMLXMLKeyDescriptor[];
  Extensions?: Record<string, unknown>;
}

interface SAMLXMLSingleSignOnService {
  '@_Location'?: string;
  '@_Binding'?: string;
}

interface SAMLXMLKeyDescriptor {
  '@_use'?: string;
  KeyInfo?: {
    X509Data?: {
      X509Certificate?: string | string[];
    };
  };
}

interface SAMLXMLResponse {
  '@_Destination'?: string;
  '@_ID'?: string;
  '@_IssueInstant'?: string;
  Issuer?: string | { '#text'?: string };
  Status?: {
    StatusCode?: {
      '@_Value'?: string;
    };
  };
  Signature?: SAMLXMLSignature;
  Assertion?: SAMLXMLAssertion;
  EncryptedAssertion?: unknown;
}

interface SAMLXMLSignature {
  SignedInfo?: {
    Reference?: {
      '@_URI'?: string;
    };
  };
  SignatureValue?: string;
}

interface SAMLXMLAssertion {
  '@_ID'?: string;
  Signature?: SAMLXMLSignature;
  Conditions?: {
    '@_NotBefore'?: string;
    '@_NotOnOrAfter'?: string;
  };
  Subject?: {
    NameID?: string | { '#text'?: string };
  };
  AttributeStatement?: {
    Attribute?: SAMLXMLAttribute | SAMLXMLAttribute[];
  };
}

interface SAMLXMLAttribute {
  '@_Name'?: string;
  AttributeValue?: unknown[];
}

interface SAMLXMLEncryptedAssertion {
  EncryptionMethod?: {
    '@_Algorithm'?: string;
  };
  KeyInfo?: {
    XencEncryptedKey?: {
      EncryptionMethod?: {
        '@_Algorithm'?: string;
      };
      CipherData?: {
        CipherValue?: string;
      };
    };
  };
  CipherData?: {
    CipherValue?: string;
  };
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
});

const idpMetadataCache: Map<string, { metadata: SAMLIdPMetadata; expiresAt: number }> = new Map();
const assertionIdCache: Map<string, number> = new Map();
const ASSERTION_ID_CACHE_TTL_MS = 5 * 60 * 1000;

const decryptEncryptedAssertion = (
  encryptedAssertion: SAMLXMLEncryptedAssertion,
  spPrivateKey: string,
): SAMLXMLAssertion | null => {
  try {
    const encryptedData = encryptedAssertion.CipherData?.CipherValue;
    if (!encryptedData) {
      return null;
    }

    const encryptedKey = encryptedAssertion.KeyInfo?.XencEncryptedKey;
    let decryptionKey: crypto.KeyObject;

    if (spPrivateKey) {
      const privateKeyBody = spPrivateKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
        .replace(/-----END RSA PRIVATE KEY-----/, '')
        .replace(/\s/g, '');

      const keyBuffer = Buffer.from(privateKeyBody, 'base64');
      decryptionKey = crypto.createPrivateKey({
        key: keyBuffer,
        type: 'pkcs8',
      });
    } else {
      return null;
    }

    const encryptedKeyCipher = encryptedKey?.CipherData?.CipherValue;
    if (encryptedKeyCipher) {
      const decryptedKey = crypto.privateDecrypt(
        {
          key: decryptionKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(encryptedKeyCipher, 'base64'),
      );

      const algorithm = encryptedAssertion.EncryptionMethod?.['@_Algorithm'];
      if (algorithm !== 'http://www.w3.org/2009/xmlenc11#aes256-gcm') {
        return null;
      }

      const iv = Buffer.from(encryptedData.slice(0, 12), 'base64');
      const authTag = Buffer.from(encryptedData.slice(encryptedData.length - 24), 'base64');
      const cipherText = Buffer.from(encryptedData.slice(12, encryptedData.length - 24), 'base64');

      const aesDecipher = crypto.createDecipheriv('aes-256-gcm', decryptedKey, iv, {
        authTagLength: 16,
      });

      const decrypted = Buffer.concat([aesDecipher.update(cipherText), aesDecipher.final()]);
      aesDecipher.setAuthTag(authTag);

      const decryptedXml = decrypted.toString('utf-8');
      const decryptedParsed = xmlParser.parse(decryptedXml) as { Assertion?: SAMLXMLAssertion };

      return decryptedParsed.Assertion ?? null;
    }

    return null;
  } catch {
    return null;
  }
};

const validateXMLSignature = (xml: string, signature: string, certificate: string): boolean => {
  try {
    const sigLines = certificate.split('\n');
    const certBody = sigLines
      .filter(
        (line) =>
          !line.includes('-----BEGIN CERTIFICATE-----') &&
          !line.includes('-----END CERTIFICATE-----'),
      )
      .join('');
    const certBuffer = Buffer.from(certBody, 'base64');

    const xmlWithoutSignature = xml.replace(/<ds:Signature[\s\S]*?<\/ds:Signature>/g, '');

    const cryptoSign = crypto.createVerify('RSA-SHA256');
    cryptoSign.update(xmlWithoutSignature);
    cryptoSign.update('\n');

    return cryptoSign.verify(certBuffer, signature, 'base64');
  } catch {
    return false;
  }
};

const checkAndCacheAssertionId = (assertionId: string): boolean => {
  const now = Date.now();
  const existing = assertionIdCache.get(assertionId);
  if (existing && now - existing < ASSERTION_ID_CACHE_TTL_MS) {
    return false;
  }
  assertionIdCache.set(assertionId, now);

  for (const [id, timestamp] of assertionIdCache.entries()) {
    if (now - timestamp > ASSERTION_ID_CACHE_TTL_MS) {
      assertionIdCache.delete(id);
    }
  }

  return true;
};

export const validateSAMLAssertion = async (
  providerConfig: SSOProviderConfig,
  assertion: Record<string, unknown>,
): Promise<{
  valid: boolean;
  failureReason?: SSOTrustFailureReason;
  claims?: SSOIdentityClaim;
}> => {
  if (providerConfig.type !== 'saml') {
    return {
      valid: false,
      failureReason: 'configuration_error',
    };
  }

  const subject = assertion['subject'] as string | undefined;
  const email = assertion['email'] as string | undefined;
  const nameId = assertion['nameId'] as string | undefined;
  const attributes = assertion['attributes'] as Record<string, unknown> | undefined;

  if (!subject && !nameId) {
    return {
      valid: false,
      failureReason: 'missing_required_claim',
    };
  }

  const claims: SSOIdentityClaim = {
    subject: subject || nameId || '',
    email: email,
    displayName: attributes?.['displayName'] as string | undefined,
    groups: attributes?.['groups'] as string[] | undefined,
    department: attributes?.['department'] as string | undefined,
    title: attributes?.['title'] as string | undefined,
    manager: attributes?.['manager'] as string | undefined,
  };

  return {
    valid: true,
    claims,
  };
};

export const fetchAndParseIdPMetadata = async (
  metadataUrl: string,
  cacheDurationMs: number = 3600000,
): Promise<SAMLIdPMetadata> => {
  const cached = idpMetadataCache.get(metadataUrl);
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
        message: `Failed to fetch IdP metadata: HTTP ${response.status}`,
        code: ErrorCodes.SSO_METADATA_FETCH_FAILED,
        statusCode: 502,
      });
    }

    const xml = await response.text();
    const parsed = xmlParser.parse(xml) as { EntityDescriptor?: SAMLXMLEntityDescriptor };

    const entityDescriptor = parsed.EntityDescriptor;
    if (!entityDescriptor) {
      throw new SSOError({
        message: 'Invalid SAML metadata: missing EntityDescriptor',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const idpSSODescriptor = entityDescriptor.IDPSSODescriptor;
    if (!idpSSODescriptor) {
      throw new SSOError({
        message: 'Invalid SAML metadata: missing IDPSSODescriptor',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const singleSignOnServices = Array.isArray(idpSSODescriptor.SingleSignOnService)
      ? idpSSODescriptor.SingleSignOnService
      : [idpSSODescriptor.SingleSignOnService].filter(Boolean);

    const ssoUrl = singleSignOnServices[0]?.['@_Location'];
    if (!ssoUrl) {
      throw new SSOError({
        message: 'Invalid SAML metadata: missing SSO URL',
        code: ErrorCodes.SSO_METADATA_INVALID,
        statusCode: 400,
      });
    }

    const certificates: string[] = [];
    const keyDescriptors = idpSSODescriptor.KeyDescriptor
      ? Array.isArray(idpSSODescriptor.KeyDescriptor)
        ? idpSSODescriptor.KeyDescriptor
        : [idpSSODescriptor.KeyDescriptor]
      : [];

    for (const keyDesc of keyDescriptors) {
      if (keyDesc?.KeyInfo?.X509Data?.X509Certificate) {
        const cert = keyDesc.KeyInfo.X509Data.X509Certificate;
        const certValue = Array.isArray(cert) ? cert[0] : cert;
        if (certValue) {
          certificates.push(certValue.replace(/\s/g, ''));
        }
      }
    }

    const issuer =
      entityDescriptor['@_entityID'] || entityDescriptor.Extensions?.IDPAttribute?.['@_Name'] || '';

    const wantAssertionsSigned =
      idpSSODescriptor['@_WantAssertionsSigned']?.toLowerCase() === 'true';
    const wantMessagesSigned =
      idpSSODescriptor['@_WantAuthnRequestsSigned']?.toLowerCase() === 'true';

    const metadata: SAMLIdPMetadata = {
      issuer,
      entityId: issuer,
      ssoUrl,
      certificates,
      wantAssertionsSigned,
      wantMessagesSigned,
    };

    idpMetadataCache.set(metadataUrl, {
      metadata,
      expiresAt: Date.now() + cacheDurationMs,
    });

    return metadata;
  } catch (error) {
    if (error instanceof SSOError) {
      throw error;
    }
    throw new SSOError({
      message: `Failed to parse IdP metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      code: ErrorCodes.SSO_METADATA_FETCH_FAILED,
      statusCode: 502,
    });
  }
};

const validateResponseSignature = (
  decodedResponse: string,
  response: SAMLXMLResponse,
  idpMetadata: SAMLIdPMetadata,
): SAMLValidationResult => {
  const responseSignature = response.Signature;
  const assertionSignature = response.Assertion?.Signature;

  if (!responseSignature && !assertionSignature && idpMetadata.certificates.length > 0) {
    return { valid: false, failureReason: 'invalid_assertion' };
  }

  if (!responseSignature && !assertionSignature) {
    return { valid: true };
  }

  if (idpMetadata.certificates.length === 0) {
    return { valid: true };
  }

  const sig = responseSignature || assertionSignature;
  const signatureValue = sig?.SignatureValue;

  if (!signatureValue) {
    return { valid: false, failureReason: 'invalid_assertion' };
  }

  const isSignatureValid = validateXMLSignature(
    decodedResponse,
    signatureValue,
    idpMetadata.certificates[0] ?? '',
  );

  if (!isSignatureValid) {
    return { valid: false, failureReason: 'invalid_assertion' };
  }

  return { valid: true };
};

const validateIssuerAndDestination = (
  response: SAMLXMLResponse,
  idpMetadata: SAMLIdPMetadata,
  expectedDestination: string,
): SAMLValidationResult => {
  const issuer =
    typeof response.Issuer === 'object'
      ? (response.Issuer['#text'] ?? response.Issuer)
      : response.Issuer;

  if (issuer !== idpMetadata.issuer && issuer !== idpMetadata.entityId) {
    return { valid: false, failureReason: 'issuer_mismatch' };
  }

  const destination = response['@_Destination'];
  if (destination && destination !== expectedDestination) {
    return { valid: false, failureReason: 'configuration_error' };
  }

  return { valid: true };
};

const validateResponseTimestamps = (response: SAMLXMLResponse): SAMLValidationResult => {
  const issueInstant = response['@_IssueInstant'];
  if (!issueInstant) {
    return { valid: true };
  }

  const issuedAt = new Date(issueInstant).getTime();
  const now = Date.now();
  const clockSkewMs = 300000;

  if (Math.abs(now - issuedAt) > clockSkewMs) {
    return { valid: false, failureReason: 'token_expired' };
  }

  return { valid: true };
};

const validateStatusCode = (response: SAMLXMLResponse): SAMLValidationResult => {
  const statusCode = response.Status?.StatusCode?.['@_Value'];
  if (statusCode && !statusCode.includes('Success')) {
    return { valid: false, failureReason: 'invalid_assertion' };
  }
  return { valid: true };
};

const getActiveAssertion = (
  response: SAMLXMLResponse,
  provider: SSOProvider,
): { assertion: SAMLXMLAssertion | null; failureReason?: SSOTrustFailureReason } => {
  const assertion = response.Assertion;

  if (assertion) {
    return { assertion };
  }

  const encryptedAssertion = response.EncryptedAssertion as SAMLXMLEncryptedAssertion | undefined;
  if (!encryptedAssertion) {
    return { assertion: null, failureReason: 'invalid_assertion' };
  }

  if (!provider.spPrivateKey) {
    return { assertion: null, failureReason: 'configuration_error' };
  }

  const decryptedAssertion = decryptEncryptedAssertion(encryptedAssertion, provider.spPrivateKey);
  if (!decryptedAssertion) {
    return { assertion: null, failureReason: 'invalid_assertion' };
  }

  return { assertion: decryptedAssertion };
};

const checkAssertionReplay = (assertionId: string | undefined): SAMLValidationResult => {
  if (!assertionId) {
    return { valid: true };
  }

  const isNewAssertion = checkAndCacheAssertionId(assertionId);
  if (!isNewAssertion) {
    return { valid: false, failureReason: 'invalid_assertion' };
  }

  return { valid: true };
};

const validateAssertionConditions = (assertion: SAMLXMLAssertion): SAMLValidationResult => {
  const notBefore = assertion.Conditions?.['@_NotBefore'];
  const notOnOrAfter = assertion.Conditions?.['@_NotOnOrAfter'];

  if (!notBefore && !notOnOrAfter) {
    return { valid: true };
  }

  const now = new Date().getTime();

  if (notBefore) {
    const notBeforeMs = new Date(notBefore).getTime();
    if (now < notBeforeMs) {
      return { valid: false, failureReason: 'token_early' };
    }
  }

  if (notOnOrAfter) {
    const notOnOrAfterMs = new Date(notOnOrAfter).getTime();
    if (now >= notOnOrAfterMs) {
      return { valid: false, failureReason: 'token_expired' };
    }
  }

  return { valid: true };
};

const extractSubject = (assertion: SAMLXMLAssertion): { subject: string | null } => {
  const nameId = assertion.Subject?.NameID;
  const subjectValue = typeof nameId === 'object' ? (nameId['#text'] ?? nameId) : nameId;
  return { subject: subjectValue ?? null };
};

const extractSAMLAttributes = (assertion: SAMLXMLAssertion): Record<string, unknown> => {
  const attributes: Record<string, unknown> = {};
  const attrStatements = assertion.AttributeStatement?.Attribute;

  if (!attrStatements) {
    return attributes;
  }

  const attrs = Array.isArray(attrStatements) ? attrStatements : [attrStatements];
  for (const attr of attrs) {
    const name = attr['@_Name'];
    const values = attr.AttributeValue;
    if (name && values) {
      const value = Array.isArray(values)
        ? values.map((v: unknown) => (v as { '#text'?: string })['#text'] || v)
        : (values as { '#text'?: string })['#text'] || values;
      attributes[name] = Array.isArray(value) && value.length === 1 ? value[0] : value;
    }
  }

  return attributes;
};

const mapAttributesToClaims = (
  attributes: Record<string, unknown>,
  subjectValue: string,
): SSOIdentityClaim => {
  const attributeMapping = DEFAULT_ATTRIBUTE_MAPPING;

  const emailRaw =
    (attributes[attributeMapping.email] as string | undefined) ||
    (attributes['email'] as string | undefined) ||
    (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] as
      | string
      | undefined);

  const firstName =
    (attributes[attributeMapping.firstName] as string | undefined) ||
    (attributes['firstName'] as string | undefined) ||
    (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] as
      | string
      | undefined);

  const lastName =
    (attributes[attributeMapping.lastName] as string | undefined) ||
    (attributes['lastName'] as string | undefined) ||
    (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] as
      | string
      | undefined);

  const groups: string[] = [];
  const groupsAttr =
    attributes[attributeMapping.groups] ||
    attributes['groups'] ||
    attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'];
  if (groupsAttr) {
    const groupsArray = Array.isArray(groupsAttr) ? groupsAttr : [groupsAttr];
    for (const g of groupsArray) {
      if (typeof g === 'string') {
        groups.push(g);
      }
    }
  }

  const department =
    (attributes[attributeMapping.department] as string | undefined) ||
    (attributes['department'] as string | undefined) ||
    (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department'] as
      | string
      | undefined);

  const title =
    (attributes[attributeMapping.title] as string | undefined) ||
    (attributes['title'] as string | undefined) ||
    (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/jobtitle'] as
      | string
      | undefined);

  const manager =
    (attributes['manager'] as string | undefined) ||
    (attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/manager'] as
      | string
      | undefined);

  const emailValue: string | undefined = emailRaw ? String(emailRaw).toLowerCase() : undefined;

  const displayNameValue =
    firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || undefined;

  return {
    subject: subjectValue,
    email: emailValue,
    displayName: displayNameValue,
    groups: groups.length > 0 ? groups : undefined,
    department: department,
    title: title,
    manager: manager,
  };
};

export const validateSAMLResponse = async (
  samlResponse: string,
  provider: SSOProvider,
  expectedDestination: string,
  _correlationId?: string,
): Promise<SAMLValidationResult> => {
  try {
    const metadataUrl = provider.metadataUrl;
    if (!metadataUrl) {
      return { valid: false, failureReason: 'configuration_error' };
    }

    const idpMetadata = await fetchAndParseIdPMetadata(metadataUrl);

    const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8');

    const parsed = xmlParser.parse(decodedResponse) as { Response?: SAMLXMLResponse };
    const response = parsed.Response;

    if (!response) {
      return { valid: false, failureReason: 'invalid_assertion' };
    }

    const signatureResult = validateResponseSignature(decodedResponse, response, idpMetadata);
    if (!signatureResult.valid) {
      return signatureResult;
    }

    const issuerDestResult = validateIssuerAndDestination(
      response,
      idpMetadata,
      expectedDestination,
    );
    if (!issuerDestResult.valid) {
      return issuerDestResult;
    }

    const timestampResult = validateResponseTimestamps(response);
    if (!timestampResult.valid) {
      return timestampResult;
    }

    const statusResult = validateStatusCode(response);
    if (!statusResult.valid) {
      return statusResult;
    }

    const { assertion: activeAssertion, failureReason } = getActiveAssertion(response, provider);
    if (!activeAssertion) {
      return { valid: false, failureReason: failureReason ?? 'invalid_assertion' };
    }

    const assertionId = activeAssertion['@_ID'];

    const replayResult = checkAssertionReplay(assertionId);
    if (!replayResult.valid) {
      return replayResult;
    }

    const conditionsResult = validateAssertionConditions(activeAssertion);
    if (!conditionsResult.valid) {
      return conditionsResult;
    }

    const { subject } = extractSubject(activeAssertion);
    if (!subject) {
      return { valid: false, failureReason: 'missing_required_claim' };
    }

    const attributes = extractSAMLAttributes(activeAssertion);

    const claims = mapAttributesToClaims(attributes, subject);

    return {
      valid: true,
      claims,
      sessionIndex: assertionId ?? '',
    };
  } catch {
    return { valid: false, failureReason: 'invalid_assertion' };
  }
};

export const mapGroupsToRole = (
  groups: string[],
  roleMappingRules: RoleMappingRule[] = DEFAULT_ROLE_MAPPING,
  defaultRole: string = 'learner',
  allowedRoles: string[] = ['super_admin', 'tenant_admin', 'manager', 'trainer', 'learner'],
  transitiveGroups: string[] = [],
): string => {
  const allGroups = [...new Set([...groups, ...transitiveGroups])];

  for (const rule of roleMappingRules) {
    if (allGroups.includes(rule.idpGroup)) {
      if (allowedRoles.includes(rule.rbRole)) {
        return rule.rbRole;
      }
    }
  }

  return allowedRoles.includes(defaultRole) ? defaultRole : 'learner';
};

export const buildSAMLAuthnRequest = (
  provider: SSOProvider,
  acsUrl: string,
  tenantId: string,
  relayState?: string,
): string => {
  const spEntityId = `https://dmz.thearchive.game/sp/${tenantId}`;
  const requestId = `_${crypto.randomUUID()}`;

  const authnRequest = {
    'samlp:AuthnRequest': {
      '@_ID': requestId,
      '@_Version': '2.0',
      '@_IssueInstant': new Date().toISOString(),
      '@_AssertionConsumerServiceURL': acsUrl,
      '@_ProtocolBinding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
      Issuer: {
        '@_Format': 'urn:oasis:names:tc:SAML:2.0:nameid-format:entity',
        '#text': spEntityId,
      },
      NameIDPolicy: {
        '@_Format': 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        '@_AllowCreate': 'true',
      },
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });

  let xml = builder.build(authnRequest);
  xml = xml.replace(
    '<samlp:',
    '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">',
  );
  xml = xml.replace('</samlp:', '</samlp:');

  const encoded = Buffer.from(xml).toString('base64');

  const params = new URLSearchParams({
    SAMLRequest: encoded,
  });

  if (relayState) {
    params.append('RelayState', relayState);
  }

  const idpSsoUrl = provider.metadataUrl ? '?' : '';
  return `${provider.metadataUrl || ''}${idpSsoUrl}${params.toString()}`;
};

export const generateSPMetadata = (
  tenantId: string,
  acsUrl: string,
  sloUrl: string,
  spCertificate?: string,
): string => {
  const entityId = `https://dmz.thearchive.game/sp/${tenantId}`;

  const metadata: Record<string, unknown> = {
    'md:EntityDescriptor': {
      '@_entityID': entityId,
      '@_xmlns:md': 'urn:oasis:names:tc:SAML:2.0:metadata',
      'md:SPSSODescriptor': {
        '@_AuthnRequestsSigned': spCertificate ? 'true' : 'false',
        '@_WantAssertionsSigned': 'true',
        '@_protocolSupportEnumeration': 'urn:oasis:names:tc:SAML:2.0:protocol',
        'md:AssertionConsumerService': {
          '@_Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
          '@_Location': acsUrl,
          '@_index': '0',
          '@_isDefault': 'true',
        },
      },
    },
  };

  if (sloUrl) {
    (metadata['md:EntityDescriptor'] as Record<string, unknown>)['md:SPSSODescriptor'] = {
      ...((metadata['md:EntityDescriptor'] as Record<string, unknown>)[
        'md:SPSSODescriptor'
      ] as Record<string, unknown>),
      'md:SingleLogoutService': {
        '@_Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
        '@_Location': sloUrl,
      },
    };
  }

  if (spCertificate) {
    const spDesc = metadata['md:EntityDescriptor'] as Record<string, unknown>;
    const spSsoDesc = spDesc['md:SPSSODescriptor'] as Record<string, unknown>;
    spSsoDesc['md:KeyDescriptor'] = {
      '@_use': 'signing',
      'ds:KeyInfo': {
        '@_xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
        'ds:X509Data': {
          'ds:X509Certificate': spCertificate,
        },
      },
    };
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
  });

  return builder.build(metadata);
};

export const getSAMLProviderConfig = (
  provider: SSOProvider,
  tenantId: string,
): {
  type: 'saml';
  issuer: string;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  signatureAlgorithm: string;
  wantAssertionsSigned: boolean;
  wantMessagesSigned: boolean;
  allowedClockSkewSeconds: number;
} => {
  return {
    type: 'saml',
    issuer: provider.metadataUrl || '',
    entityId: `https://dmz.thearchive.game/sp/${tenantId}`,
    ssoUrl: provider.metadataUrl || '',
    certificate: provider.idpCertificate || '',
    signatureAlgorithm: 'RSA-SHA256',
    wantAssertionsSigned: true,
    wantMessagesSigned: false,
    allowedClockSkewSeconds: 60,
  };
};

export const clearIdPMetadataCache = (metadataUrl?: string): void => {
  if (metadataUrl) {
    idpMetadataCache.delete(metadataUrl);
  } else {
    idpMetadataCache.clear();
  }
};
