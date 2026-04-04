import { createHash } from 'crypto';

import { XMLBuilder } from 'fast-xml-parser';
import { sql } from 'drizzle-orm';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

import { getDatabaseClient } from '../../shared/database/connection.js';
import {
  scormPackages,
  scormRegistrations,
  type ScormPackage,
  type ScormRegistration,
} from '../../db/schema/lrs/index.js';

import type { AppConfig } from '../../config.js';

export type ScormVersion = '1.2' | '2004_3rd' | '2004_4th';

export interface CreateScormPackageInput {
  title: string;
  description?: string | undefined;
  version: ScormVersion;
  masteringScore?: number | undefined;
  contentId: string;
  metadata?: Record<string, unknown>;
}

export interface ScormPackageMetadata {
  title: string;
  description?: string | undefined;
  version: ScormVersion;
  masteringScore?: number;
  credit: 'credit' | 'no-credit';
  launchUrl: string;
  organizationId: string;
  resourceId: string;
}

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  ',
});

export function generateManifest12(metadata: ScormPackageMetadata): string {
  const manifest = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    manifest: {
      '@_identifier': metadata.organizationId,
      '@_version': '1.0',
      metadata: {
        schema: 'ADL SCORM',
        schema_version: '1.2',
      },
      organizations: {
        '@_default': metadata.organizationId,
        organization: {
          '@_identifier': metadata.organizationId,
          title: metadata.title,
          item: {
            '@_identifier': metadata.resourceId,
            '@_identifierref': metadata.resourceId,
            title: metadata.title,
          },
        },
      },
      resources: {
        resource: [
          {
            '@_identifier': metadata.resourceId,
            '@_type': 'webcontent',
            '@_adlcp:scormtype': 'sco',
            '@_href': metadata.launchUrl,
            dependency: {
              '@_identifierref': `${metadata.resourceId}_assets`,
            },
          },
          {
            '@_identifier': `${metadata.resourceId}_assets`,
            '@_type': 'webcontent',
            '@_adlcp:scormtype': 'asset',
          },
        ],
      },
    },
  };

  return xmlBuilder.build(manifest);
}

export function generateManifest2004(metadata: ScormPackageMetadata): string {
  const is2004 = metadata.version.startsWith('2004');
  const sequencingXmlns = is2004 ? { '@_xmlns:imsss': 'http://www.imsglobal.org/xsd/imsss' } : {};

  const manifest = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    manifest: {
      '@_identifier': metadata.organizationId,
      '@_version': '1.3',
      metadata: {
        schema: 'ADL SCORM',
        schema_version: metadata.version === '2004_3rd' ? '2004 3rd Edition' : '2004 4th Edition',
        ...sequencingXmlns,
      },
      organizations: {
        '@_default': metadata.organizationId,
        organization: {
          '@_identifier': metadata.organizationId,
          title: metadata.title,
          item: {
            '@_identifier': metadata.resourceId,
            '@_identifierref': metadata.resourceId,
            title: metadata.title,
            ...(is2004 && {
              item: {
                '@_identifier': `${metadata.resourceId}_sco`,
                title: metadata.title,
              },
            }),
          },
          ...(is2004 && {
            sequencing: {
              controlMode: { choice: true, flow: true },
              sequencingRules: {},
            },
          }),
        },
      },
      resources: {
        resource: {
          '@_identifier': metadata.resourceId,
          '@_type': 'webcontent',
          '@_scormType': 'sco',
          '@_href': metadata.launchUrl,
          file: { '@_href': metadata.launchUrl },
        },
      },
    },
  };

  return xmlBuilder.build(manifest);
}

export function generateScormApiWrapper(version: ScormVersion): string {
  if (version === '1.2') {
    return `
// SCORM 1.2 API Wrapper
let API = null;

function findAPI(targetWindow) {
  let attempts = 0;
  while ((!targetWindow.API) && (targetWindow.parent) && (targetWindow.parent !== targetWindow) && (attempts < 10)) {
    attempts++;
    targetWindow = targetWindow.parent;
  }
  return targetWindow.API;
}

function getAPI() {
  if (API == null) {
    API = findAPI(window);
    if (API == null && window.opener != null) {
      API = findAPI(window.opener);
    }
  }
  return API;
}

function LMSInitialize() {
  const api = getAPI();
  if (api == null) {
    return "false";
  }
  return api.LMSInitialize("");
}

function LMSFinish() {
  const api = getAPI();
  if (api == null) {
    return "false";
  }
  return api.LMSFinish("");
}

function LMSGetValue(cmiElement) {
  const api = getAPI();
  if (api == null) {
    return "";
  }
  return api.LMSGetValue(cmiElement);
}

function LMSSetValue(cmiElement, elementValue) {
  const api = getAPI();
  if (api == null) {
    return "false";
  }
  return api.LMSSetValue(cmiElement, elementValue);
}

function LMSCommit() {
  const api = getAPI();
  if (api == null) {
    return "false";
  }
  return api.LMSCommit("");
}

function LMSGetLastError() {
  const api = getAPI();
  if (api == null) {
    return "0";
  }
  return api.LMSGetLastError();
}

function LMSGetErrorString(scormErrorCode) {
  const api = getAPI();
  if (api == null) {
    return "No API";
  }
  return api.LMSGetErrorString(scormErrorCode);
}

function LMSGetDiagnostic(scormErrorCode) {
  const api = getAPI();
  if (api == null) {
    return "No API";
  }
  return api.LMSGetDiagnostic(scormErrorCode);
}

// Completion tracking
function setCompletionStatus(completionStatus) {
  LMSSetValue("cmi.core.lesson_status", completionStatus);
  LMSCommit();
}

function setScore(scoreValue) {
  LMSSetValue("cmi.core.score.raw", scoreValue);
  LMSSetValue("cmi.core.score.min", "0");
  LMSSetValue("cmi.core.score.max", "100");
  LMSCommit();
}

function saveSuspendData(suspendData) {
  LMSSetValue("cmi.suspend_data", suspendData);
  LMSCommit();
}

function getSuspendData() {
  return LMSGetValue("cmi.suspend_data");
}
`;
  }

  return `
// SCORM 2004 API Wrapper
let API_1484_11 = null;

function findAPI(targetWindow) {
  let attempts = 0;
  while ((!targetWindow.API_1484_11) && (targetWindow.parent) && (targetWindow.parent !== targetWindow) && (attempts < 10)) {
    attempts++;
    targetWindow = targetWindow.parent;
  }
  return targetWindow.API_1484_11;
}

function getAPI() {
  if (API_1484_11 == null) {
    API_1484_11 = findAPI(window);
    if (API_1484_11 == null && window.opener != null) {
      API_1484_11 = findAPI(window.opener);
    }
  }
  return API_1484_11;
}

function Initialize() {
  const api = getAPI();
  if (api == null) {
    return "false";
  }
  return api.Initialize("");
}

function Terminate() {
  const api = getAPI();
  if (api == null) {
    return "false";
  }
  return api.Terminate("");
}

function GetValue(cmiElement) {
  const api = getAPI();
  if (api == null) {
    return "";
  }
  return api.GetValue(cmiElement);
}

function SetValue(cmiElement, elementValue) {
  const api = getAPI();
  if (api == null) {
    return "false";
  }
  return api.SetValue(cmiElement, elementValue);
}

function Commit() {
  const api = getAPI();
  if (api == null) {
    return "false";
  }
  return api.Commit("");
}

function GetLastError() {
  const api = getAPI();
  if (api == null) {
    return "0";
  }
  return api.GetLastError();
}

function GetErrorString(scormErrorCode) {
  const api = getAPI();
  if (api == null) {
    return "No API";
  }
  return api.GetErrorString(scormErrorCode);
}

function GetDiagnostic(scormErrorCode) {
  const api = getAPI();
  if (api == null) {
    return "No API";
  }
  return api.GetDiagnostic(scormErrorCode);
}

// Aliases for compatibility
const LMSInitialize = Initialize;
const LMSFinish = Terminate;
const LMSGetValue = GetValue;
const LMSSetValue = SetValue;
const LMSCommit = Commit;
const LMSGetLastError = GetLastError;
const LMSGetErrorString = GetErrorString;
const LMSGetDiagnostic = GetDiagnostic;

// SCORM 2004 specific
function setCompletionStatus(completionStatus) {
  SetValue("cmi.completion_status", completionStatus);
  Commit();
}

function setSuccessStatus(successStatus) {
  SetValue("cmi.success_status", successStatus);
  Commit();
}

function setScore(scoreValue) {
  SetValue("cmi.score.raw", scoreValue);
  SetValue("cmi.score.min", "0");
  SetValue("cmi.score.max", "100");
  Commit();
}

function setProgressMeasure(progressMeasure) {
  SetValue("cmi.progress_measure", progressMeasure);
  Commit();
}

function saveSuspendData(suspendData) {
  SetValue("cmi.suspend_data", suspendData);
  Commit();
}

function getSuspendData() {
  return GetValue("cmi.suspend_data");
}
`;
}

export function generateLaunchHtml(metadata: ScormPackageMetadata): string {
  const is2004 = metadata.version.startsWith('2004');
  const safeTitle = escapeHtml(metadata.title);
  const safeDescription = escapeHtml(metadata.description || 'Training content');
  const safeLaunchUrl = escapeHtml(metadata.launchUrl);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <script src="scorm-api.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #1a1a2e;
      color: #eee;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    h1 {
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 15px 30px;
      background: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 10px;
      cursor: pointer;
    }
    .button:hover {
      background: #45a049;
    }
    .status {
      margin-top: 20px;
      padding: 10px;
      background: #333;
      border-radius: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${safeTitle}</h1>
    <p>${safeDescription}</p>
    <div>
      <a href="${safeLaunchUrl}" class="button" onclick="startCourse(); return false;">Start Course</a>
    </div>
    <div class="status" id="status">Ready to begin</div>
    <script>
      let initialized = false;

      function startCourse() {
        const result = ${is2004 ? 'Initialize()' : 'LMSInitialize()'};
        if (result === "true" || result === true) {
          initialized = true;
          document.getElementById('status').textContent = 'Course initialized';
          window.location.href = '${safeLaunchUrl}';
        } else {
          document.getElementById('status').textContent = 'Error initializing course';
        }
      }

      window.onbeforeunload = function() {
        if (initialized) {
          ${is2004 ? 'Terminate()' : 'LMSFinish()'};
        }
      };
    </script>
  </div>
</body>
</html>`;
}

function calculateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function createScormPackage(
  config: AppConfig,
  tenantId: string,
  input: CreateScormPackageInput,
): Promise<ScormPackage> {
  const db = getDatabaseClient(config);

  const orgId = `org_${tenantId}_${Date.now()}`;
  const resourceId = `res_${input.contentId}`;

  const metadata: ScormPackageMetadata = {
    title: input.title,
    description: input.description,
    version: input.version,
    masteringScore: input.masteringScore ?? 80,
    credit: 'credit',
    launchUrl: 'launch.html',
    organizationId: orgId,
    resourceId,
  };

  const manifest =
    input.version === '1.2' ? generateManifest12(metadata) : generateManifest2004(metadata);

  const apiWrapper = generateScormApiWrapper(input.version);
  const launchHtml = generateLaunchHtml(metadata);

  const packageContent = Buffer.concat([
    Buffer.from(manifest, 'utf-8'),
    Buffer.from('\n', 'utf-8'),
    Buffer.from(apiWrapper, 'utf-8'),
    Buffer.from('\n', 'utf-8'),
    Buffer.from(launchHtml, 'utf-8'),
  ]);

  const checksum = calculateChecksum(packageContent);
  const objectKey = `scorm/${tenantId}/${Date.now()}_${input.contentId}.zip`;

  const [pkg] = await db
    .insert(scormPackages)
    .values({
      tenantId,
      title: input.title,
      description: input.description ?? null,
      version: input.version,
      objectKey,
      checksumSha256: checksum,
      masteringScore: input.masteringScore ?? 80,
      metadata: {
        ...input.metadata,
        manifest,
        apiWrapper,
        launchHtml,
      },
    })
    .returning();

  return pkg!;
}

export async function listScormPackages(
  config: AppConfig,
  tenantId: string,
): Promise<ScormPackage[]> {
  const db = getDatabaseClient(config);

  return db
    .select()
    .from(scormPackages)
    .where(sql`${scormPackages.tenantId} = ${tenantId}`)
    .orderBy(sql`${scormPackages.createdAt} desc`);
}

export async function getScormPackage(
  config: AppConfig,
  packageId: string,
  tenantId: string,
): Promise<ScormPackage | undefined> {
  const db = getDatabaseClient(config);

  const [pkg] = await db
    .select()
    .from(scormPackages)
    .where(sql`${scormPackages.id} = ${packageId} AND ${scormPackages.tenantId} = ${tenantId}`)
    .limit(1);

  return pkg;
}

export async function deleteScormPackage(
  config: AppConfig,
  packageId: string,
  tenantId: string,
): Promise<boolean> {
  const db = getDatabaseClient(config);

  const result = await db
    .delete(scormPackages)
    .where(sql`${scormPackages.id} = ${packageId} AND ${scormPackages.tenantId} = ${tenantId}`)
    .returning({ id: scormPackages.id });

  return result.length > 0;
}

export async function createScormRegistration(
  config: AppConfig,
  packageId: string,
  userId: string,
): Promise<ScormRegistration> {
  const db = getDatabaseClient(config);

  const pkg = await getScormPackage(config, packageId, '');
  if (!pkg) {
    throw new Error('Package not found');
  }

  const regId = `reg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const [registration] = await db
    .insert(scormRegistrations)
    .values({
      packageId,
      tenantId: pkg.tenantId,
      userId,
      regId,
      status: 'in_progress',
    })
    .returning();

  return registration!;
}

export async function updateScormRegistration(
  config: AppConfig,
  registrationId: string,
  tenantId: string,
  updates: {
    status?: string | undefined;
    score?: number | undefined;
    suspendData?: string | undefined;
    completionStatus?: string | undefined;
    successStatus?: string | undefined;
    totalTime?: number | undefined;
  },
): Promise<ScormRegistration | undefined> {
  const db = getDatabaseClient(config);

  const setValues: Record<string, unknown> = {};
  if (updates.status !== undefined) setValues['status'] = updates.status;
  if (updates.score !== undefined) setValues['score'] = updates.score;
  if (updates.suspendData !== undefined) setValues['suspendData'] = updates.suspendData;
  if (updates.completionStatus !== undefined)
    setValues['completionStatus'] = updates.completionStatus;
  if (updates.successStatus !== undefined) setValues['successStatus'] = updates.successStatus;
  if (updates.totalTime !== undefined) setValues['totalTime'] = updates.totalTime;
  setValues['updatedAt'] = new Date();

  const [updated] = await db
    .update(scormRegistrations)
    .set(setValues)
    .where(
      sql`${scormRegistrations.id} = ${registrationId} AND ${scormRegistrations.tenantId} = ${tenantId}`,
    )
    .returning();

  return updated ?? undefined;
}

export async function getScormRegistration(
  config: AppConfig,
  registrationId: string,
  tenantId: string,
): Promise<ScormRegistration | undefined> {
  const db = getDatabaseClient(config);

  const [registration] = await db
    .select()
    .from(scormRegistrations)
    .where(
      sql`${scormRegistrations.id} = ${registrationId} AND ${scormRegistrations.tenantId} = ${tenantId}`,
    )
    .limit(1);

  return registration;
}

export async function listScormRegistrations(
  config: AppConfig,
  packageId: string,
  tenantId: string,
): Promise<ScormRegistration[]> {
  const db = getDatabaseClient(config);

  return db
    .select()
    .from(scormRegistrations)
    .where(
      sql`${scormRegistrations.packageId} = ${packageId} AND ${scormRegistrations.tenantId} = ${tenantId}`,
    )
    .orderBy(sql`${scormRegistrations.createdAt} desc`);
}
