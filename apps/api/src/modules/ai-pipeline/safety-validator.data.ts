export const RESERVED_TLDS = ['.example', '.invalid', '.test'] as const;

export const BRAND_BLOCKLIST = [
  'google',
  'microsoft',
  'amazon',
  'apple',
  'meta',
  'facebook',
  'instagram',
  'whatsapp',
  'linkedin',
  'youtube',
  'paypal',
  'github',
  'fedex',
  'dhl',
  'netflix',
  'openai',
] as const;

export const PERSON_BLOCKLIST = [
  'elon musk',
  'bill gates',
  'tim cook',
  'satya nadella',
  'mark zuckerberg',
  'sundar pichai',
] as const;

export const ENTITY_ALLOWLIST = new Set([
  'sovereign compact',
  'nexion industries',
  'librarians',
  'hacktivists',
  'criminal networks',
  'morpheus',
  'sysop-7',
  'kade morrow',
  'alina reyes',
  'dr alina reyes',
  'voss imani',
  'relay wardens',
  'grey freight couriers',
  'nidhogg',
]);

export const GENERIC_TITLE_CASE_WORDS = new Set([
  'access',
  'accounts',
  'alert',
  'archive',
  'assessment',
  'audit',
  'brief',
  'call',
  'change',
  'compact',
  'conditions',
  'coordinator',
  'credential',
  'credentials',
  'customer',
  'delayed',
  'deliverables',
  'desk',
  'director',
  'gatekeeper',
  'greeting',
  'guidance',
  'incident',
  'indicators',
  'intake',
  'intelligence',
  'justification',
  'ledger',
  'liaison',
  'maintenance',
  'message',
  'networks',
  'notice',
  'office',
  'packet',
  'portal',
  'posture',
  'records',
  'relay',
  'report',
  'request',
  'required',
  'response',
  'review',
  'scenario',
  'security',
  'shift',
  'signals',
  'summary',
  'support',
  'team',
  'telemetry',
  'threat',
  'triggers',
  'update',
  'verification',
]);

export const COMMON_SENTENCE_WORDS = new Set([
  'a',
  'an',
  'and',
  'before',
  'best',
  'call',
  'complete',
  'coordinate',
  'dear',
  'failure',
  'for',
  'greetings',
  'hello',
  'hi',
  'if',
  'immediate',
  'maintain',
  'open',
  'please',
  'priority',
  'regards',
  'review',
  'send',
  'thanks',
  'the',
  'to',
  'urgent',
  'use',
  'we',
  'your',
]);

export const ORGANIZATION_CONTEXT_WORDS = [
  'account',
  'accounts',
  'admin',
  'billing',
  'cloud',
  'compliance',
  'finance',
  'helpdesk',
  'hr',
  'it',
  'legal',
  'license',
  'login',
  'mail',
  'payroll',
  'portal',
  'security',
  'services',
  'software',
  'subscription',
  'support',
  'systems',
  'team',
  'vendor',
  'workspace',
] as const;

export const ORGANIZATION_SUFFIXES = new Set([
  'bank',
  'corp',
  'corporation',
  'group',
  'holdings',
  'inc',
  'industries',
  'labs',
  'llc',
  'logistics',
  'ltd',
  'networks',
  'partners',
  'services',
  'software',
  'solutions',
  'systems',
  'technologies',
  'university',
]);

export const PERSON_CONTEXT_REGEX =
  /\b(?:contact|coordinate with|reply to|reach out to|speak with|escalate to|cc|from)\s+$/i;

export const HONORIFIC_NAME_REGEX =
  /\b(?:Mr|Mrs|Ms|Mx|Dr|Prof)\.?\s+([A-Z][a-z]+(?:[A-Z][a-z]+)*(?:\s+[A-Z][a-z]+(?:[A-Z][a-z]+)*){1,2})\b/g;

export const ENTITY_SEQUENCE_REGEX =
  /\b(?:[A-Z][a-z]+(?:[A-Z][a-z]+)*|[A-Z]{2,}(?:-[A-Z0-9]+)*)(?:\s+(?:[A-Z][a-z]+(?:[A-Z][a-z]+)*|[A-Z]{2,}(?:-[A-Z0-9]+)*)){0,3}\b/g;

export const ACTIONABLE_PATTERNS = [
  /powershell\s+-enc/i,
  /curl\s+https?:\/\/\S+\s*\|\s*(?:bash|sh)/i,
  /invoke-webrequest/i,
  /chmod\s+\+x/i,
  /rundll32/i,
  /mshta/i,
  /certutil\s+-decode/i,
] as const;

export const EXECUTABLE_ATTACHMENT_TYPES = new Set([
  'exe',
  'msi',
  'dll',
  'ps1',
  'bat',
  'cmd',
  'js',
  'vbs',
  'scr',
]);

export const PHONE_REGEX = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3}[\s.-]?\d{3,4}/;

export const IP_TOKEN_REGEX = /[A-Fa-f0-9:.[\]%]+/g;

export const URL_REGEX =
  /(?<![@/])(?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{2,5})?(?:\/[^\s)"'<>]*)?/gi;

export const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export const FILE_EXTENSION_TLDS = new Set([
  'csv',
  'doc',
  'docx',
  'eml',
  'html',
  'json',
  'msg',
  'pdf',
  'ppt',
  'pptx',
  'rtf',
  'txt',
  'xls',
  'xlsx',
  'xml',
  'zip',
]);

export const CONTENT_FIELD_REFERENCE_REGEX =
  /^(?:attachments|body|headers|links|metadata|signals)\.[a-z_]+(?:\.[a-z_]+)*$/i;
