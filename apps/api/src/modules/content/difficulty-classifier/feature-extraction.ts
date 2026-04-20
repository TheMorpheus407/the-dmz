export interface RawEmail {
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface EmailFeatures {
  indicatorCount: number;
  wordCount: number;
  hasSpoofedHeaders: boolean;
  impersonationQuality: number;
  hasVerificationHooks: boolean;
  emotionalManipulationLevel: number;
  grammarComplexity: number;
}

const PHISHING_INDICATORS = [
  'urgent',
  'immediately',
  'verify',
  'suspended',
  'account',
  'password',
  'confirm',
  'update',
  'click here',
  'login',
  'security',
  'alert',
  'unauthorized',
  'breach',
  'compromised',
  'suspicious',
  'action required',
  'unusual activity',
  'locked',
  'unlock',
  'expire',
  'deadline',
  '24 hours',
  '48 hours',
  'immediately',
  'urgent',
  'act now',
  'limited time',
  'last chance',
  'final notice',
];

const VERIFICATION_HOOKS = [
  'verify your identity',
  'check your settings',
  'security settings',
  'two-factor',
  '2fa',
  'mfa',
  'multi-factor',
  'contact us directly',
  'call us at',
  'official website',
  'help center',
  'support portal',
];

const EMOTIONAL_MANIPULATION_TERMS = [
  'urgent',
  'immediately',
  'warning',
  'danger',
  'threat',
  'suspended',
  'terminated',
  'deleted',
  'lost',
  'forever',
  'regret',
  'miss out',
  'exclusive',
  'limited',
  'once in a lifetime',
  "won't last",
  'hurry',
  'final',
  'last chance',
  'act now',
  "don't miss",
  'time running out',
  'breaking',
  'shocking',
  'scandal',
  'exposed',
  'leaked',
];

function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

function calculateIndicatorDensity(text: string, wordCount: number): number {
  if (wordCount === 0) return 0;

  const lowerText = text.toLowerCase();
  let indicatorCount = 0;

  for (const indicator of PHISHING_INDICATORS) {
    const regex = new RegExp(indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      indicatorCount += matches.length;
    }
  }

  return (indicatorCount / wordCount) * 100;
}

function hasSpoofedHeaders(headers?: Record<string, string>): boolean {
  if (!headers) return false;

  const fromHeader = headers['from'] || headers['From'];
  const replyToHeader = headers['reply-to'] || headers['Reply-To'];

  if (fromHeader && replyToHeader) {
    if (!replyToHeader.includes(fromHeader.split('@')[1] || '')) {
      return true;
    }
  }

  if (fromHeader && headers['return-path']) {
    const fromDomain = fromHeader.split('@')[1];
    const returnPathDomain = headers['return-path'].split('@')[1];
    if (fromDomain && returnPathDomain && fromDomain !== returnPathDomain) {
      return true;
    }
  }

  return false;
}

function assessImpersonationQuality(
  fromName?: string,
  fromEmail?: string,
  subject?: string,
): number {
  let score = 0;
  const indicators: string[] = [];

  if (fromEmail) {
    const emailDomain = fromEmail.split('@')[1]?.toLowerCase();

    const commonBrands = [
      'microsoft',
      'google',
      'apple',
      'amazon',
      'paypal',
      'netflix',
      'facebook',
      'twitter',
      'instagram',
      'linkedin',
      'bank',
      'security',
      'support',
      'help',
      'noreply',
      'no-reply',
    ];

    if (emailDomain) {
      for (const brand of commonBrands) {
        if (emailDomain.includes(brand)) {
          indicators.push('brand_domain');
          break;
        }
      }
    }

    const suspiciousPatterns = [
      'secure-',
      'verify-',
      'login-',
      'account-',
      'support-',
      '-update',
      '-verify',
      '-secure',
      '-login',
    ];

    for (const pattern of suspiciousPatterns) {
      if (emailDomain?.includes(pattern)) {
        indicators.push('suspicious_subdomain');
        break;
      }
    }
  }

  if (subject) {
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('urgent') || subjectLower.includes('immediate')) {
      indicators.push('urgent_subject');
    }
    if (subjectLower.includes('account') || subjectLower.includes('password')) {
      indicators.push('sensitive_subject');
    }
  }

  if (fromName) {
    const nameLower = fromName.toLowerCase();
    const genericNames = ['support', 'admin', 'security', 'team', 'help'];
    for (const generic of genericNames) {
      if (nameLower === generic || nameLower.includes(generic)) {
        indicators.push('generic_sender');
        break;
      }
    }
  }

  score = Math.min(indicators.length * 0.2, 1.0);

  return Math.round(score * 100) / 100;
}

function hasVerificationHooks(text: string): boolean {
  const lowerText = text.toLowerCase();

  for (const hook of VERIFICATION_HOOKS) {
    if (lowerText.includes(hook.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function assessEmotionalManipulation(body: string): number {
  const lowerBody = body.toLowerCase();
  let matchCount = 0;

  for (const term of EMOTIONAL_MANIPULATION_TERMS) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = lowerBody.match(regex);
    if (matches) {
      matchCount += matches.length;
    }
  }

  const wordCount = countWords(body);
  if (wordCount === 0) return 0;

  const density = (matchCount / wordCount) * 100;

  const score = Math.min(density / 5, 1.0);

  return Math.round(score * 100) / 100;
}

function assessGrammarComplexity(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const avgWordsPerSentence = words.length / sentences.length;

  let longWords = 0;
  for (const word of words) {
    if (word.length > 8) {
      longWords++;
    }
  }

  const lexicalDiversity = new Set(words.map((w) => w.toLowerCase())).size / words.length;

  const complexityScore =
    (avgWordsPerSentence / 30) * 0.3 + (longWords / words.length) * 0.4 + lexicalDiversity * 0.3;

  return Math.round(Math.min(complexityScore, 1) * 100) / 100;
}

export function extractFeatures(email: RawEmail): EmailFeatures {
  const fullText = `${email.subject} ${email.body}`;
  const wordCount = countWords(fullText);

  const indicatorCount = Math.round(calculateIndicatorDensity(fullText, wordCount) * 100) / 100;
  const impersonationQuality = assessImpersonationQuality(
    email.fromName,
    email.fromEmail,
    email.subject,
  );
  const emotionalManipulationLevel = assessEmotionalManipulation(email.body);
  const grammarComplexity = assessGrammarComplexity(email.body);

  return {
    indicatorCount,
    wordCount,
    hasSpoofedHeaders: hasSpoofedHeaders(email.headers),
    impersonationQuality,
    hasVerificationHooks: hasVerificationHooks(fullText),
    emotionalManipulationLevel,
    grammarComplexity,
  };
}

export const DIFFICULTY_TIER_NAMES: Record<number, string> = {
  1: 'LOW',
  2: 'GUARDED',
  3: 'ELEVATED',
  4: 'HIGH',
  5: 'SEVERE',
};

export const DIFFICULTY_TIER_DESCRIPTIONS: Record<number, string> = {
  1: 'Obvious phishing, clear indicators',
  2: 'Minor red flags, some spoofing',
  3: 'Subtle indicators, good impersonation',
  4: 'Sophisticated attacks, minimal clues',
  5: 'Near-perfect impersonation, APT-level',
};
