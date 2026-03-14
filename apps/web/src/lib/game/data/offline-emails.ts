import type {
  EmailInstance,
  EmailDifficulty,
  EmailIntent,
  EmailTechnique,
  GameThreatTier,
} from '@the-dmz/shared/game';

export interface OfflineEmail extends EmailInstance {
  offlineReady: boolean;
  narrativeSafe: boolean;
}

const FACTIONS = [
  'sovereign_compact',
  'nexion_industries',
  'librarians',
  'collective',
  'syndicate',
] as const;

function createSender(name: string, domain: string, role: string, org: string) {
  return {
    displayName: name,
    emailAddress: `${name.toLowerCase().replace(' ', '.')}@${domain}`,
    domain,
    jobRole: role,
    organization: org,
    relationshipHistory: Math.floor(Math.random() * 10) - 5,
  };
}

function createHeaders(subject: string) {
  return {
    messageId: `<${Date.now()}-${Math.random().toString(36).substr(2, 9)}@internal.matrix>`,
    returnPath: `bounce@internal.matrix`,
    received: ['from internal.matrix by mx.matrix with SMTP'],
    spfResult: 'pass' as const,
    dkimResult: 'pass' as const,
    dmarcResult: 'pass' as const,
    originalDate: new Date().toISOString(),
    subject,
  };
}

export const OFFLINE_EMAILS: OfflineEmail[] = [
  // Difficulty 1 - Easy (10 emails) - Obvious red flags
  {
    emailId: 'offline-001',
    sessionId: 'offline-session',
    dayNumber: 1,
    difficulty: 1 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'phishing',
    threatTier: 'low',
    faction: FACTIONS[4],
    sender: createSender(
      'IT Support',
      'support@company-secure.net',
      'IT Administrator',
      'TechHelp Inc',
    ),
    headers: createHeaders('URGENT: Your account will be suspended'),
    body: {
      preview: 'Your account will be suspended in 24 hours. Click here to verify...',
      fullBody: `Dear User,

Your account will be suspended in 24 hours unless you verify your credentials immediately.

Click the link below to verify your account:
http://company-secure.net/verify

If you do not verify, your account will be permanently deleted.

Best regards,
IT Support Team`,
      embeddedLinks: [
        {
          displayText: 'http://company-secure.net/verify',
          actualUrl: 'http://bad-site.ru/steal',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'IT Support',
      applicantRole: 'Administrator',
      organization: 'TechHelp Inc',
      requestedAssets: ['Account Access', 'Email Access'],
      requestedServices: ['Credential Verification'],
      justification: 'Account security update',
      urgency: 'critical',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Domain does not match official company domain',
        severity: 1,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'urgency_cue',
        location: 'body',
        description: 'Creates false urgency with threat of account suspension',
        severity: 1,
        isVisible: true,
      },
      {
        indicatorId: 'i3',
        type: 'suspicious_link',
        location: 'link',
        description: 'Link destination differs from displayed text',
        severity: 1,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 95,
      explanation: 'Classic phishing email with mismatched domain and suspicious link',
      consequences: {
        approved: { trustImpact: -30, fundsImpact: -500, factionImpact: -10, threatImpact: 20 },
        denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: -5 },
        flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -100, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-002',
    sessionId: 'offline-session',
    dayNumber: 1,
    difficulty: 1 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'low',
    faction: FACTIONS[2],
    sender: createSender(
      'Dr. Sarah Chen',
      'library.nexus.edu',
      'Head Librarian',
      'The Nexus Archives',
    ),
    headers: createHeaders('Research Database Access Request'),
    body: {
      preview: 'Requesting access to the historical research database for the upcoming quarter...',
      fullBody: `Dear Facility Administrator,

I am Dr. Sarah Chen, Head Librarian at The Nexus Archives. I am writing to request continued access to your research database for the upcoming quarter.

Our team has been using your data storage services for three years and we would like to renew our contract.

Please find the details below:
- Organization: The Nexus Archives
- Contact: dr.chen@library.nexus.edu
- Storage Required: 500GB
- Duration: 3 months

Thank you for your consideration.

Best regards,
Dr. Sarah Chen
Head Librarian
The Nexus Archives`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'access_request_form.pdf',
        fileType: 'application/pdf',
        fileSize: 245000,
        hash: 'abc123',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Dr. Sarah Chen',
      applicantRole: 'Head Librarian',
      organization: 'The Nexus Archives',
      requestedAssets: ['Research Database'],
      requestedServices: ['Data Storage', 'Database Access'],
      justification: 'Academic research continuation',
      urgency: 'low',
      value: 500,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 5,
      explanation: 'Legitimate request from known academic institution with proper documentation',
      consequences: {
        approved: { trustImpact: 10, fundsImpact: 500, factionImpact: 15, threatImpact: 0 },
        denied: { trustImpact: -10, fundsImpact: -500, factionImpact: -15, threatImpact: 0 },
        flagged: { trustImpact: 0, fundsImpact: -50, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -100, factionImpact: -5, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-003',
    sessionId: 'offline-session',
    dayNumber: 1,
    difficulty: 1 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'credential_harvesting',
    threatTier: 'low',
    faction: FACTIONS[4],
    sender: createSender('HR Department', 'hr@company-portal.com', 'HR Manager', 'Global Corp'),
    headers: createHeaders('Action Required: Update Your Benefits Information'),
    body: {
      preview: 'Please update your benefits information before the deadline...',
      fullBody: `Dear Employee,

This is a reminder that you need to update your benefits information in our system.

Please click the link below to update your details:
http://company-portal.com/benefits-update

You must complete this by end of week or your benefits will be suspended.

HR Department
Global Corp`,
      embeddedLinks: [
        {
          displayText: 'http://company-portal.com/benefits-update',
          actualUrl: 'http://phishing.ru/login',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'HR Department',
      applicantRole: 'HR Manager',
      organization: 'Global Corp',
      requestedAssets: ['Personal Information', 'Benefits Data'],
      requestedServices: ['Benefits Portal Access'],
      justification: 'Annual benefits update',
      urgency: 'high',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Domain not recognized as internal',
        severity: 1,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'urgency_cue',
        location: 'body',
        description: 'Artificial urgency with deadline threat',
        severity: 1,
        isVisible: true,
      },
      {
        indicatorId: 'i3',
        type: 'suspicious_link',
        location: 'link',
        description: 'Link leads to external suspicious site',
        severity: 1,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 90,
      explanation: 'Credential harvesting attempt with fake HR portal',
      consequences: {
        approved: { trustImpact: -25, fundsImpact: -300, factionImpact: -5, threatImpact: 15 },
        denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: -5 },
        flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -50, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-004',
    sessionId: 'offline-session',
    dayNumber: 1,
    difficulty: 1 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'low',
    faction: FACTIONS[0],
    sender: createSender(
      'Admin Office',
      'admin@sovereign.gov',
      'Administrative Officer',
      'The Sovereign Compact',
    ),
    headers: createHeaders('Quarterly Compliance Report Submission'),
    body: {
      preview: 'Please submit your quarterly compliance documentation by the deadline...',
      fullBody: `Dear Data Center Administrator,

This is a formal notification regarding the upcoming quarterly compliance report submission deadline.

Please ensure all required documentation is submitted through the official portal at:
https://compliance.sovereign.gov/submit

Deadline: End of current quarter
Required Documents:
- Security audit logs
- Access control records
- Incident reports

If you have questions, please contact your assigned compliance officer.

Regards,
Administrative Office
The Sovereign Compact`,
      embeddedLinks: [
        {
          displayText: 'https://compliance.sovereign.gov/submit',
          actualUrl: 'https://compliance.sovereign.gov/submit',
          isSuspicious: false,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Administrative Office',
      applicantRole: 'Administrative Officer',
      organization: 'The Sovereign Compact',
      requestedAssets: ['Compliance Documents'],
      requestedServices: ['Document Submission'],
      justification: 'Quarterly compliance requirement',
      urgency: 'medium',
      value: 200,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 10,
      explanation: 'Official government communication with proper domain and procedure',
      consequences: {
        approved: { trustImpact: 15, fundsImpact: 200, factionImpact: 20, threatImpact: 0 },
        denied: { trustImpact: -15, fundsImpact: -200, factionImpact: -20, threatImpact: 0 },
        flagged: { trustImpact: -5, fundsImpact: -50, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -10, fundsImpact: -100, factionImpact: -10, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-005',
    sessionId: 'offline-session',
    dayNumber: 1,
    difficulty: 1 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'malware_delivery',
    threatTier: 'low',
    faction: FACTIONS[4],
    sender: createSender(
      'Shipping Notification',
      'delivery@package-track.io',
      'Shipping Coordinator',
      'FastShip Logistics',
    ),
    headers: createHeaders('Your Package Has Arrived - Click to View'),
    body: {
      preview: 'Your package is waiting for delivery. View details now...',
      fullBody: `Dear Customer,

Your package has arrived at our facility and is ready for delivery.

Track your package here:
http://package-track.io/view?id=1827361

Package Details:
- Tracking Number: FS-1827361-UM
- Status: Awaiting Pickup
- Location: Distribution Center

Please confirm receipt within 48 hours.

FastShip Logistics`,
      embeddedLinks: [
        {
          displayText: 'http://package-track.io/view?id=1827361',
          actualUrl: 'http://malware-site.ru/payload.exe',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'FastShip Logistics',
      applicantRole: 'Shipping Coordinator',
      organization: 'FastShip Logistics',
      requestedAssets: ['Computer Access'],
      requestedServices: ['Package Tracking'],
      justification: 'Delivery notification',
      urgency: 'medium',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Unfamiliar shipping domain',
        severity: 1,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'suspicious_link',
        location: 'link',
        description: 'Link leads to executable file',
        severity: 1,
        isVisible: true,
      },
      {
        indicatorId: 'i3',
        type: 'sender_display_mismatch',
        location: 'sender',
        description: 'Generic sender name not matching known carriers',
        severity: 1,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 85,
      explanation: 'Malware delivery attempt disguised as shipping notification',
      consequences: {
        approved: { trustImpact: -20, fundsImpact: -400, factionImpact: -5, threatImpact: 25 },
        denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: -5 },
        flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -50, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-006',
    sessionId: 'offline-session',
    dayNumber: 1,
    difficulty: 1 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'low',
    faction: FACTIONS[1],
    sender: createSender(
      'Marcus Webb',
      'marcus.webb@nexion.com',
      'Account Manager',
      'Nexion Industries',
    ),
    headers: createHeaders('Partnership Renewal Discussion'),
    body: {
      preview: 'Following up on our partnership discussion from last week...',
      fullBody: `Dear Partner,

I hope this message finds you well. I'm reaching out following our discussion at the last industry summit.

Nexion Industries would like to renew and expand our partnership arrangement. We're proposing:
- Extended data storage capacity (additional 2PB)
- Priority bandwidth allocation
- Dedicated support channel

I've attached our proposal document for your review. Would you be available for a call next week to discuss?

Best regards,
Marcus Webb
Account Manager
Nexion Industries`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'nership_proposal_2026.pdf',
        fileType: 'application/pdf',
        fileSize: 1250000,
        hash: 'def456',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Marcus Webb',
      applicantRole: 'Account Manager',
      organization: 'Nexion Industries',
      requestedAssets: ['Extended Storage', 'Bandwidth'],
      requestedServices: ['Partnership Renewal'],
      justification: 'Business partnership expansion',
      urgency: 'medium',
      value: 5000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 15,
      explanation: 'Legitimate business proposal from known corporate partner',
      consequences: {
        approved: { trustImpact: 20, fundsImpact: 5000, factionImpact: 25, threatImpact: 0 },
        denied: { trustImpact: -20, fundsImpact: -5000, factionImpact: -25, threatImpact: 0 },
        flagged: { trustImpact: -5, fundsImpact: -200, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -10, fundsImpact: -500, factionImpact: -10, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-007',
    sessionId: 'offline-session',
    dayNumber: 1,
    difficulty: 1 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'pretexting',
    threatTier: 'low',
    faction: FACTIONS[4],
    sender: createSender(
      'Executive Assistant',
      'exec-assist@company-mail.net',
      'Executive Assistant',
      'International Holdings',
    ),
    headers: createHeaders('Urgent: CEO needs gift cards for client meeting'),
    body: {
      preview: 'The CEO needs gift cards immediately for an important client meeting...',
      fullBody: `Hi,

I need your help with something urgent. The CEO is in a meeting with an important client and needs gift cards immediately.

Can you purchase 10 x $100 gift cards and send me the codes? The CEO will reimburse you.

This is time-sensitive - please reply ASAP.

Thanks,
Sarah
Executive Assistant to CEO`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Sarah',
      applicantRole: 'Executive Assistant',
      organization: 'International Holdings',
      requestedAssets: ['Gift Card Codes', 'Funds'],
      requestedServices: ['Financial Transfer'],
      justification: 'Client meeting emergency',
      urgency: 'critical',
      value: 1000,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'authority_claim',
        location: 'sender',
        description: 'Claims authority without proper verification',
        severity: 1,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'urgency_cue',
        location: 'body',
        description: 'Extreme urgency with request for secrecy',
        severity: 1,
        isVisible: true,
      },
      {
        indicatorId: 'i3',
        type: 'request_anomaly',
        location: 'body',
        description: 'Unusual request for gift cards from unknown sender',
        severity: 1,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 95,
      explanation: 'Classic CEO fraud / business email compromise attempt',
      consequences: {
        approved: { trustImpact: -30, fundsImpact: -1000, factionImpact: -10, threatImpact: 10 },
        denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: -5 },
        flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -100, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-008',
    sessionId: 'offline-session',
    dayNumber: 1,
    difficulty: 1 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'low',
    faction: FACTIONS[3],
    sender: createSender(
      'Alex Rivera',
      'alex@thecollective.net',
      'Community Organizer',
      'The Collective',
    ),
    headers: createHeaders('Data Center Tour Request for Community Group'),
    body: {
      preview: 'Our community group would like to schedule a tour of your facility...',
      fullBody: `Hello,

Our community group, The Collective, is organizing an educational tour of local data centers to learn about digital infrastructure.

We have 15 participants interested in learning about:
- How data centers operate
- Energy efficiency measures
- Career opportunities in tech

Would it be possible to schedule a tour for next month? We're happy to sign NDAs and follow all security protocols.

Best,
Alex Rivera
Community Organizer
The Collective`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Alex Rivera',
      applicantRole: 'Community Organizer',
      organization: 'The Collective',
      requestedAssets: ['Facility Tour'],
      requestedServices: ['Community Outreach'],
      justification: 'Educational community event',
      urgency: 'low',
      value: 100,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 20,
      explanation: 'Legitimate community outreach request with appropriate justification',
      consequences: {
        approved: { trustImpact: 10, fundsImpact: 100, factionImpact: 15, threatImpact: 0 },
        denied: { trustImpact: -5, fundsImpact: -100, factionImpact: -10, threatImpact: 0 },
        flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -3, fundsImpact: -20, factionImpact: -5, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-009',
    sessionId: 'offline-session',
    dayNumber: 1,
    difficulty: 1 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'phishing',
    threatTier: 'low',
    faction: FACTIONS[4],
    sender: createSender(
      'IT Security',
      'security@password-reset-verify.com',
      'Security Officer',
      'SecureAuth Corp',
    ),
    headers: createHeaders('Security Alert: Suspicious Login Detected'),
    body: {
      preview: 'We detected a suspicious login to your account. Verify immediately...',
      fullBody: `Security Alert,

We detected a suspicious login to your account from:
IP: 192.168.1.105
Location: Unknown
Device: Unknown

If this wasn't you, please verify your identity immediately:
http://password-reset-verify.com/secure

Failure to verify within 24 hours will result in account suspension.

IT Security Team
SecureAuth Corp`,
      embeddedLinks: [
        {
          displayText: 'http://password-reset-verify.com/secure',
          actualUrl: 'http://fake-security.ru/reset',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'IT Security',
      applicantRole: 'Security Officer',
      organization: 'SecureAuth Corp',
      requestedAssets: ['Account Access'],
      requestedServices: ['Security Verification'],
      justification: 'Account security alert',
      urgency: 'critical',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Suspicious domain not matching internal systems',
        severity: 1,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'urgency_cue',
        location: 'body',
        description: 'Creates panic with account suspension threat',
        severity: 1,
        isVisible: true,
      },
      {
        indicatorId: 'i3',
        type: 'suspicious_link',
        location: 'link',
        description: 'Link leads to external phishing site',
        severity: 1,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 92,
      explanation: 'Phishing email impersonating IT security',
      consequences: {
        approved: { trustImpact: -25, fundsImpact: -300, factionImpact: -5, threatImpact: 20 },
        denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: -5 },
        flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -50, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-010',
    sessionId: 'offline-session',
    dayNumber: 1,
    difficulty: 1 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'low',
    faction: FACTIONS[0],
    sender: createSender(
      'Emergency Response Unit',
      'eru@sovereign.gov',
      'Emergency Coordinator',
      'The Sovereign Compact',
    ),
    headers: createHeaders('Critical Infrastructure Emergency Protocol Activation'),
    body: {
      preview: 'Activation of Emergency Protocol Delta-7 for critical infrastructure...',
      fullBody: `URGENT - CRITICAL INFRASTRUCTURE NOTICE

This is an official communication from the Emergency Response Unit of The Sovereign Compact.

We are activating Emergency Protocol Delta-7 for all critical data infrastructure operators in Sector 7.

Required Actions:
1. Confirm receipt of this message
2. Enable emergency power protocols
3. Restrict non-essential network access
4. Prepare for potential evacuation

This is not a drill. Further instructions will follow.

Emergency Response Unit
The Sovereign Compact
Contact: emergency@sovereign.gov`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Emergency Response Unit',
      applicantRole: 'Emergency Coordinator',
      organization: 'The Sovereign Compact',
      requestedAssets: ['All Systems'],
      requestedServices: ['Emergency Response'],
      justification: 'Critical infrastructure emergency',
      urgency: 'critical',
      value: 10000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 5,
      explanation: 'Official government emergency communication with proper protocol',
      consequences: {
        approved: { trustImpact: 25, fundsImpact: 10000, factionImpact: 30, threatImpact: -10 },
        denied: { trustImpact: -30, fundsImpact: -10000, factionImpact: -30, threatImpact: 20 },
        flagged: { trustImpact: -10, fundsImpact: -1000, factionImpact: -10, threatImpact: 5 },
        deferred: { trustImpact: -20, fundsImpact: -5000, factionImpact: -20, threatImpact: 10 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },

  // Difficulty 2 - Medium-Easy (10 emails)
  {
    emailId: 'offline-011',
    sessionId: 'offline-session',
    dayNumber: 2,
    difficulty: 2 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'spear_phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[1],
    sender: createSender(
      'Jennifer Walsh',
      'j.walsh@nexion-ind.net',
      'Senior Analyst',
      'Nexion Industries',
    ),
    headers: createHeaders('Re: Q4 Data Analysis Results'),
    body: {
      preview: 'Attached are the analysis results you requested...',
      fullBody: `Hi,

Following up on our conversation last week, I've attached the Q4 data analysis results you requested.

Some interesting findings:
- Storage utilization up 23%
- Bandwidth costs trending down
- Security incidents decreased by 15%

The full report is in the attached spreadsheet. Let me know if you need any clarifications.

Also, I noticed we're using different encryption standards for the new cluster. Should we standardize?

Cheers,
Jennifer Walsh
Senior Analyst
Nexion Industries`,
      embeddedLinks: [
        {
          displayText: 'the attached spreadsheet',
          actualUrl: 'http://nexion-ind.net/docs/q4_analysis.xlsx',
          isSuspicious: false,
        },
      ],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'q4_analysis_2026.xlsx',
        fileType: 'application/vnd.ms-excel',
        fileSize: 890000,
        hash: 'xyz789',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Jennifer Walsh',
      applicantRole: 'Senior Analyst',
      organization: 'Nexion Industries',
      requestedAssets: ['Analysis Data'],
      requestedServices: ['Data Sharing'],
      justification: 'Business intelligence sharing',
      urgency: 'medium',
      value: 800,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'tone_mismatch',
        location: 'body',
        description: 'Informal tone unusual for business correspondence',
        severity: 2,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 35,
      explanation: 'Appears legitimate but has minor anomalies in tone',
      consequences: {
        approved: { trustImpact: 10, fundsImpact: 800, factionImpact: 10, threatImpact: 0 },
        denied: { trustImpact: -10, fundsImpact: -800, factionImpact: -10, threatImpact: 5 },
        flagged: { trustImpact: 0, fundsImpact: -50, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -100, factionImpact: -5, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-012',
    sessionId: 'offline-session',
    dayNumber: 2,
    difficulty: 2 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'bec',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'Thomas Chen',
      't.chen@partner-vendor.co',
      'Procurement Manager',
      'GlobalTech Supplies',
    ),
    headers: createHeaders('Updated Invoice for Q3 Services'),
    body: {
      preview: 'Please find the updated invoice attached...',
      fullBody: `Hello,

Please find attached the updated invoice for Q3 services rendered.

We've made some adjustments based on the recent contract renegotiations. The new total is $47,500 (previously $42,000).

Please process this payment at your earliest convenience to avoid service interruption.

Updated Invoice: inv_Q3_2026_v2.pdf

Payment should be sent to:
Account: 8847291055
Routing: 021000089
Bank: International Trade Bank

Best regards,
Thomas Chen
Procurement Manager
GlobalTech Supplies`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'inv_Q3_2026_v2.pdf',
        fileType: 'application/pdf',
        fileSize: 156000,
        hash: 'inv123',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Thomas Chen',
      applicantRole: 'Procurement Manager',
      organization: 'GlobalTech Supplies',
      requestedAssets: ['Funds Transfer'],
      requestedServices: ['Invoice Payment'],
      justification: 'Q3 invoice payment',
      urgency: 'high',
      value: 47500,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'request_anomaly',
        location: 'body',
        description: 'Invoice amount differs from expected without explanation',
        severity: 2,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'urgency_cue',
        location: 'body',
        description: 'Pressure to pay quickly to avoid service interruption',
        severity: 2,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 70,
      explanation: 'Business email compromise attempting invoice fraud',
      consequences: {
        approved: { trustImpact: -25, fundsImpact: -47500, factionImpact: -15, threatImpact: 10 },
        denied: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -1000, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-013',
    sessionId: 'offline-session',
    dayNumber: 2,
    difficulty: 2 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[2],
    sender: createSender(
      'Dr. Elena Voss',
      'elena.voss@nexus-archives.org',
      'Research Director',
      'The Nexus Archives',
    ),
    headers: createHeaders('Research Collaboration Proposal'),
    body: {
      preview: 'Would your facility be interested in a research collaboration...',
      fullBody: `Dear Data Center Team,

I am reaching out on behalf of The Nexus Archives to propose a research collaboration.

Our team has been developing new methods for long-term data preservation and we'd like to partner with a facility like yours to test our approaches in a real-world environment.

Key Points:
- 6-month pilot program
- Your facility would host 50TB of test data
- Joint publication of results
- No cost to your facility

I've attached a detailed proposal. Would you be interested in a call to discuss?

Best,
Dr. Elena Voss
Research Director
The Nexus Archives`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'research_collab_proposal.pdf',
        fileType: 'application/pdf',
        fileSize: 2100000,
        hash: 'res456',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Dr. Elena Voss',
      applicantRole: 'Research Director',
      organization: 'The Nexus Archives',
      requestedAssets: ['Storage Capacity'],
      requestedServices: ['Research Collaboration'],
      justification: 'Academic research partnership',
      urgency: 'low',
      value: 3000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 25,
      explanation: 'Legitimate research collaboration from known academic partner',
      consequences: {
        approved: { trustImpact: 15, fundsImpact: 3000, factionImpact: 20, threatImpact: 0 },
        denied: { trustImpact: -10, fundsImpact: -3000, factionImpact: -15, threatImpact: 0 },
        flagged: { trustImpact: -3, fundsImpact: -100, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -200, factionImpact: -5, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-014',
    sessionId: 'offline-session',
    dayNumber: 2,
    difficulty: 2 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'supply_chain',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'System Update',
      'updates@hardware-supplier.io',
      'Technical Support',
      'TechSupply Co',
    ),
    headers: createHeaders('Critical Firmware Update Required'),
    body: {
      preview: 'Your hardware requires a critical firmware update to maintain support...',
      fullBody: `Dear Valued Customer,

Our monitoring systems indicate that your storage infrastructure requires a critical firmware update.

Affected Systems:
- RAID Controller Model X-5000
- Firmware Version: 3.2.1

Please download the update from our portal:
http://hardware-supplier.io/firmware/x5000_v3.3.0.bin

This update includes critical security patches and performance improvements. Failure to update within 30 days will void your support warranty.

Technical Support
TechSupply Co`,
      embeddedLinks: [
        {
          displayText: 'http://hardware-supplier.io/firmware/x5000_v3.3.0.bin',
          actualUrl: 'http://malware-dist.net/firmware.exe',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Technical Support',
      applicantRole: 'Support Engineer',
      organization: 'TechSupply Co',
      requestedAssets: ['Firmware Access', 'System Updates'],
      requestedServices: ['Firmware Update'],
      justification: 'Security update deployment',
      urgency: 'high',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'suspicious_link',
        location: 'link',
        description: '.bin file from unfamiliar domain',
        severity: 2,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Unknown supplier domain',
        severity: 2,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 75,
      explanation: 'Supply chain attack attempting to deploy malicious firmware',
      consequences: {
        approved: { trustImpact: -30, fundsImpact: -5000, factionImpact: -10, threatImpact: 30 },
        denied: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -200, factionImpact: 0, threatImpact: 10 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-015',
    sessionId: 'offline-session',
    dayNumber: 2,
    difficulty: 2 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[0],
    sender: createSender(
      'Compliance Department',
      'compliance@sovereign.gov',
      'Compliance Officer',
      'The Sovereign Compact',
    ),
    headers: createHeaders('Annual Security Assessment Required'),
    body: {
      preview: 'Your facility has been selected for annual security assessment...',
      fullBody: `Dear Facility Administrator,

Your data center has been selected for the annual security assessment as required by the Infrastructure Security Act.

Please complete the following:
1. Submit your security documentation by March 31
2. Prepare for on-site inspection week of April 15
3. Ensure all incident reports are up to date

Documentation portal: https://compliance.sovereign.gov/assessment

Failure to comply may result in operational restrictions.

Compliance Department
The Sovereign Compact`,
      embeddedLinks: [
        {
          displayText: 'https://compliance.sovereign.gov/assessment',
          actualUrl: 'https://compliance.sovereign.gov/assessment',
          isSuspicious: false,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Compliance Department',
      applicantRole: 'Compliance Officer',
      organization: 'The Sovereign Compact',
      requestedAssets: ['Security Documentation'],
      requestedServices: ['Compliance Assessment'],
      justification: 'Annual regulatory requirement',
      urgency: 'medium',
      value: 500,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 20,
      explanation: 'Official government compliance request with proper domain',
      consequences: {
        approved: { trustImpact: 15, fundsImpact: 500, factionImpact: 20, threatImpact: 0 },
        denied: { trustImpact: -20, fundsImpact: -500, factionImpact: -25, threatImpact: 0 },
        flagged: { trustImpact: -5, fundsImpact: -100, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -10, fundsImpact: -200, factionImpact: -10, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-016',
    sessionId: 'offline-session',
    dayNumber: 2,
    difficulty: 2 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'pretexting',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[3],
    sender: createSender('Shadow Broker', 'contact@darknet信道.net', 'Anonymous', 'Unknown'),
    headers: createHeaders('Information for Sale'),
    body: {
      preview: 'I have information about a vulnerability in your system...',
      fullBody: `Hello,

I have information about a critical vulnerability in your infrastructure that I discovered.

Details:
- Affects your primary authentication system
- Can be exploited remotely
- Proof of concept available

I'm selling this information for 50 BTC. This is a one-time offer.

If you're interested, send 1 BTC as good faith to:
bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh

After verification, I'll provide full details.

This is your only chance to patch before others discover it.

Regards`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Unknown',
      applicantRole: 'Unknown',
      organization: 'Unknown',
      requestedAssets: ['Cryptocurrency', 'System Vulnerability Info'],
      requestedServices: ['Information Purchase'],
      justification: 'Vulnerability disclosure',
      urgency: 'high',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'sender_display_mismatch',
        location: 'sender',
        description: 'Anonymous sender with suspicious domain',
        severity: 2,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'request_anomaly',
        location: 'body',
        description: 'Demands cryptocurrency payment',
        severity: 2,
        isVisible: true,
      },
      {
        indicatorId: 'i3',
        type: 'authority_claim',
        location: 'body',
        description: 'Claims to have critical vulnerability information',
        severity: 2,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 80,
      explanation: 'Extortion attempt with fake vulnerability claims',
      consequences: {
        approved: { trustImpact: -30, fundsImpact: -50000, factionImpact: -20, threatImpact: 15 },
        denied: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -100, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-017',
    sessionId: 'offline-session',
    dayNumber: 2,
    difficulty: 2 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[1],
    sender: createSender(
      'David Park',
      'd.park@nexion.com',
      'Facilities Manager',
      'Nexion Industries',
    ),
    headers: createHeaders('Scheduled Maintenance Window'),
    body: {
      preview: 'Upcoming maintenance requires temporary service reduction...',
      fullBody: `Dear Partners,

Nexion Industries will be performing scheduled maintenance on our data infrastructure.

Maintenance Window:
- Start: April 5, 2026 at 02:00 UTC
- Duration: 6 hours
- Impact: 30% reduced capacity

During this time:
- Non-critical services will be throttled
- Backup systems will handle critical loads
- All systems will return to full capacity by 08:00 UTC

We apologize for any inconvenience. This maintenance is required for security updates.

Best regards,
David Park
Facilities Manager
Nexion Industries`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'David Park',
      applicantRole: 'Facilities Manager',
      organization: 'Nexion Industries',
      requestedAssets: ['Service Capacity'],
      requestedServices: ['Maintenance Coordination'],
      justification: 'Scheduled infrastructure maintenance',
      urgency: 'low',
      value: 0,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 15,
      explanation: 'Standard maintenance notification from known partner',
      consequences: {
        approved: { trustImpact: 5, fundsImpact: 0, factionImpact: 10, threatImpact: 0 },
        denied: { trustImpact: -5, fundsImpact: 0, factionImpact: -5, threatImpact: 0 },
        flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-018',
    sessionId: 'offline-session',
    dayNumber: 2,
    difficulty: 2 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'credential_harvesting',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'Cloud Services',
      'admin@cloudservicsolutions.net',
      'Account Manager',
      'CloudServics',
    ),
    headers: createHeaders('Your Cloud Storage is Almost Full'),
    body: {
      preview: 'Action required: Your storage will be suspended...',
      fullBody: `Dear Customer,

Your cloud storage account is at 95% capacity. To prevent service interruption, please upgrade your plan or delete unused files.

Current Usage: 9.5TB / 10TB
Plan: Enterprise Plus

Upgrade now to continue using our services:
http://cloudservicsolutions.net/upgrade

If you need help, contact our support team.

Cloud Services Team
CloudServics`,
      embeddedLinks: [
        {
          displayText: 'http://cloudservicsolutions.net/upgrade',
          actualUrl: 'http://fake-cloud.net/login',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Cloud Services',
      applicantRole: 'Account Manager',
      organization: 'CloudServics',
      requestedAssets: ['Account Credentials'],
      requestedServices: ['Account Upgrade'],
      justification: 'Service upgrade prompt',
      urgency: 'high',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Typos in domain name (cloudservics)',
        severity: 2,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'suspicious_link',
        location: 'link',
        description: 'Link leads to credential harvesting page',
        severity: 2,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 72,
      explanation: 'Credential harvesting with typosquatted domain',
      consequences: {
        approved: { trustImpact: -20, fundsImpact: -200, factionImpact: -5, threatImpact: 15 },
        denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: -5 },
        flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -3, fundsImpact: -50, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-019',
    sessionId: 'offline-session',
    dayNumber: 2,
    difficulty: 2 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[2],
    sender: createSender(
      'Prof. Marcus Wei',
      'm.wei@edu-institute.org',
      'Professor',
      'Institute of Advanced Studies',
    ),
    headers: createHeaders('Student Internship Program Application'),
    body: {
      preview: 'Applying for internship placement at your facility...',
      fullBody: `Dear Facility Director,

I am writing on behalf of the Institute of Advanced Studies to apply for an internship placement for two of our graduate students.

Program: Cybersecurity Operations
Duration: 6 months
Students: 2
Start Date: May 1, 2026

Our students have completed coursework in:
- Network security
- Incident response
- Threat analysis

They would benefit greatly from hands-on experience in a real data center environment.

I've attached their applications and recommendations.

Best regards,
Prof. Marcus Wei
Institute of Advanced Studies`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'internship_application.pdf',
        fileType: 'application/pdf',
        fileSize: 450000,
        hash: 'int789',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Prof. Marcus Wei',
      applicantRole: 'Professor',
      organization: 'Institute of Advanced Studies',
      requestedAssets: ['Facility Access'],
      requestedServices: ['Internship Program'],
      justification: 'Educational partnership',
      urgency: 'low',
      value: 200,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 20,
      explanation: 'Legitimate internship request from academic institution',
      consequences: {
        approved: { trustImpact: 10, fundsImpact: 200, factionImpact: 15, threatImpact: 0 },
        denied: { trustImpact: -5, fundsImpact: -200, factionImpact: -10, threatImpact: 0 },
        flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -3, fundsImpact: -50, factionImpact: -5, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-020',
    sessionId: 'offline-session',
    dayNumber: 2,
    difficulty: 2 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'insider_threat',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender('Former Employee', 'anonymous@mail-drop.org', 'Unknown', 'Unknown'),
    headers: createHeaders('Warning: Internal Security Issue'),
    body: {
      preview: 'I have concerns about internal security practices...',
      fullBody: `I used to work at your facility. I'm reaching out because I have serious concerns about internal security practices I witnessed.

Issues I've observed:
- Unsecured access to sensitive areas
- Weak password policies
- Unmonitored external connections

I have documentation but can't share details through normal channels. If you're interested in hearing more, set up an anonymous drop:

http://secure-drop.xyz/info

I'm not looking for money. I just want these issues fixed before something bad happens.

Please respond within 48 hours if you want more information.`,
      embeddedLinks: [
        {
          displayText: 'http://secure-drop.xyz/info',
          actualUrl: 'http://phishing-drop.com/info',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Unknown',
      applicantRole: 'Former Employee',
      organization: 'Unknown',
      requestedAssets: ['Sensitive Information'],
      requestedServices: ['Whistleblower Report'],
      justification: 'Security concern disclosure',
      urgency: 'high',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'sender_display_mismatch',
        location: 'sender',
        description: 'Anonymous sender using mail drop',
        severity: 3,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'suspicious_link',
        location: 'link',
        description: 'Link to unknown external site',
        severity: 2,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'flag',
      riskScore: 60,
      explanation: 'Potential social engineering or insider threat test',
      consequences: {
        approved: { trustImpact: -15, fundsImpact: -100, factionImpact: -5, threatImpact: 10 },
        denied: { trustImpact: -5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        flagged: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        deferred: { trustImpact: 0, fundsImpact: -50, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },

  // Difficulty 3 - Medium (10 emails)
  {
    emailId: 'offline-021',
    sessionId: 'offline-session',
    dayNumber: 3,
    difficulty: 3 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[1],
    sender: createSender(
      'Lisa Chang',
      'l.chang@nexionindustries.com',
      'VP Operations',
      'Nexion Industries',
    ),
    headers: createHeaders('Re: Partnership Expansion Discussion'),
    body: {
      preview: 'Following up on our discussion from the summit...',
      fullBody: `Hello,

I wanted to follow up on our conversation from the Infrastructure Summit last month.

As discussed, Nexion Industries is looking to expand our partnership with your facility. We're proposing:

- Additional 5PB storage capacity
- Priority bandwidth during peak hours
- Joint marketing of our services

I've prepared a detailed proposal (attached). Would you be available for a call next Tuesday to review?

One thing I wanted to mention - we might need to adjust the pricing slightly based on current market rates. Let me know your thoughts.

Best,
Lisa Chang
VP Operations
Nexion Industries`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'partnership_expansion_v2.pdf',
        fileType: 'application/pdf',
        fileSize: 3200000,
        hash: 'part789',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Lisa Chang',
      applicantRole: 'VP Operations',
      organization: 'Nexion Industries',
      requestedAssets: ['Extended Partnership'],
      requestedServices: ['Business Expansion'],
      justification: 'Partnership growth opportunity',
      urgency: 'medium',
      value: 15000,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'date_inconsistency',
        location: 'body',
        description: 'References last month but date seems inconsistent',
        severity: 3,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 40,
      explanation: 'Legitimate business proposal with minor timing ambiguity',
      consequences: {
        approved: { trustImpact: 20, fundsImpact: 15000, factionImpact: 25, threatImpact: 0 },
        denied: { trustImpact: -15, fundsImpact: -15000, factionImpact: -20, threatImpact: 0 },
        flagged: { trustImpact: -5, fundsImpact: -500, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -8, fundsImpact: -1000, factionImpact: -8, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-022',
    sessionId: 'offline-session',
    dayNumber: 3,
    difficulty: 3 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'spear_phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'Robert Martinez',
      'r.martinez@yourcompany.com',
      'IT Director',
      'Your Company',
    ),
    headers: createHeaders('Urgent: Password Policy Update'),
    body: {
      preview: 'New password requirements effective immediately...',
      fullBody: `Team,

Effective immediately, we're implementing new password requirements for all employees.

Changes include:
- Minimum length: 16 characters
- No repeated characters
- Must include special characters
- 90-day rotation

Please update your passwords through the internal portal:
http://yourcompany.com/password-update

If you have issues, contact IT support.

Thanks,
Robert Martinez
IT Director`,
      embeddedLinks: [
        {
          displayText: 'http://yourcompany.com/password-update',
          actualUrl: 'http://passworduodate.com/reset',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Robert Martinez',
      applicantRole: 'IT Director',
      organization: 'Your Company',
      requestedAssets: ['Password Credentials'],
      requestedServices: ['Password Update'],
      justification: 'Password policy change',
      urgency: 'critical',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Sender domain does not match internal domain',
        severity: 3,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'url_mismatch',
        location: 'link',
        description: 'Link domain differs from company domain',
        severity: 3,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 65,
      explanation: 'Spear phishing targeting internal employees',
      consequences: {
        approved: { trustImpact: -20, fundsImpact: -500, factionImpact: -5, threatImpact: 20 },
        denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: -5 },
        flagged: { trustImpact: 3, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -3, fundsImpact: -50, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-023',
    sessionId: 'offline-session',
    dayNumber: 3,
    difficulty: 3 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[0],
    sender: createSender(
      'Security Council',
      'security@sovereign.gov',
      'Security Advisor',
      'The Sovereign Compact',
    ),
    headers: createHeaders('Threat Intelligence Briefing'),
    body: {
      preview: 'Classified briefing on emerging threats...',
      fullBody: `Dear Facility Administrator,

The Security Council has identified emerging threats targeting data infrastructure in our sector.

Key Findings:
- Increased reconnaissance activity from unknown actors
- New malware strains targeting storage systems
- Elevated threat level for next 30 days

Recommended Actions:
1. Review access logs for anomalies
2. Enable enhanced monitoring
3. Restrict administrative access

A detailed briefing is available through secure channels. Contact your security liaison for access.

Security Council
The Sovereign Compact`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Security Council',
      applicantRole: 'Security Advisor',
      organization: 'The Sovereign Compact',
      requestedAssets: ['Security Information'],
      requestedServices: ['Threat Intelligence'],
      justification: 'Security threat briefing',
      urgency: 'high',
      value: 1000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 30,
      explanation: 'Official government security briefing',
      consequences: {
        approved: { trustImpact: 15, fundsImpact: 1000, factionImpact: 20, threatImpact: -5 },
        denied: { trustImpact: -10, fundsImpact: -1000, factionImpact: -15, threatImpact: 5 },
        flagged: { trustImpact: -3, fundsImpact: -100, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -200, factionImpact: -8, threatImpact: 3 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-024',
    sessionId: 'offline-session',
    dayNumber: 3,
    difficulty: 3 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'bec',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'Amanda Foster',
      'a.foster@trusted-partner.net',
      'Finance Director',
      'Reliable Supplies Ltd',
    ),
    headers: createHeaders('Bank Account Change Request'),
    body: {
      preview: 'Please update our payment details...',
      fullBody: `Dear Accounts Payable,

Please update our bank account details for future payments.

New Account Information:
Bank: International Commercial Bank
Account Name: Reliable Supplies Ltd
Account Number: 8827456193
Routing: 021000089
SWIFT: ICB Universal

This change is due to our recent merger. All future payments should be sent to this account.

Please confirm receipt and update your records.

Best,
Amanda Foster
Finance Director
Reliable Supplies Ltd`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'bank_change_authorization.pdf',
        fileType: 'application/pdf',
        fileSize: 89000,
        hash: 'bank123',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Amanda Foster',
      applicantRole: 'Finance Director',
      organization: 'Reliable Supplies Ltd',
      requestedAssets: ['Funds Transfer'],
      requestedServices: ['Payment Update'],
      justification: 'Bank account change due to merger',
      urgency: 'high',
      value: 25000,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'request_anomaly',
        location: 'body',
        description: 'Unusual bank account change request',
        severity: 3,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'attachment_suspicious',
        location: 'attachment',
        description: 'Authorization document may be forged',
        severity: 3,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 68,
      explanation: 'BEC attempt with fake bank account change',
      consequences: {
        approved: { trustImpact: -25, fundsImpact: -25000, factionImpact: -10, threatImpact: 10 },
        denied: { trustImpact: 8, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -3, fundsImpact: -500, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-025',
    sessionId: 'offline-session',
    dayNumber: 3,
    difficulty: 3 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[2],
    sender: createSender(
      'Historical Archive',
      'archive@society-records.org',
      'Archivist',
      'Historical Society',
    ),
    headers: createHeaders('Donation of Historical Records'),
    body: {
      preview: 'We would like to donate historical documents...',
      fullBody: `Dear Data Center Administrator,

The Historical Society has recently acquired a collection of historical records dating back to the pre-crash era.

We are looking for a partner to digitally preserve these documents. In exchange, we would:
- Provide digital copies to your facility
- Offer public acknowledgment of your contribution
- Share proceeds from any publications (if applicable)

Total volume: approximately 2TB of scanned documents
Format: PDF, TIFF, XML

This is a unique opportunity to preserve important historical data.

Please indicate your interest by contacting our archivist.

Best regards,
Historical Society Archives`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Historical Society',
      applicantRole: 'Archivist',
      organization: 'Historical Society',
      requestedAssets: ['Digital Storage'],
      requestedServices: ['Historical Preservation'],
      justification: 'Historical data preservation partnership',
      urgency: 'low',
      value: 500,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'tone_mismatch',
        location: 'body',
        description: 'Unusually generous offer with unclear value',
        severity: 3,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 45,
      explanation: 'Appears legitimate but offer seems too generous',
      consequences: {
        approved: { trustImpact: 10, fundsImpact: 500, factionImpact: 15, threatImpact: 0 },
        denied: { trustImpact: -5, fundsImpact: -500, factionImpact: -10, threatImpact: 0 },
        flagged: { trustImpact: 0, fundsImpact: -50, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -3, fundsImpact: -100, factionImpact: -5, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-026',
    sessionId: 'offline-session',
    dayNumber: 3,
    difficulty: 3 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[3],
    sender: createSender(
      'Nikolai Volkov',
      'nvolkov@thecollective.net',
      'Tech Lead',
      'The Collective',
    ),
    headers: createHeaders('Open Source Infrastructure Project'),
    body: {
      preview: 'Collaborating on open source infrastructure tools...',
      fullBody: `Hey,

We've been working on some open source tools for decentralized infrastructure management and thought your facility might be interested.

What we've built:
- Distributed monitoring system
- Failover automation
- Resource optimization algorithms

All open source, all free. We'd love your feedback and potentially collaborate.

The code is here:
https://github.com/collective/infra-tools

No strings attached. Just want to build better tools together.

Cheers,
Nikolai
The Collective`,
      embeddedLinks: [
        {
          displayText: 'https://github.com/collective/infra-tools',
          actualUrl: 'https://github.com/collective/infra-tools',
          isSuspicious: false,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Nikolai Volkov',
      applicantRole: 'Tech Lead',
      organization: 'The Collective',
      requestedAssets: ['Open Source Tools'],
      requestedServices: ['Collaboration'],
      justification: 'Open source project collaboration',
      urgency: 'low',
      value: 100,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 25,
      explanation: 'Legitimate open source collaboration from known activist group',
      consequences: {
        approved: { trustImpact: 10, fundsImpact: 100, factionImpact: 15, threatImpact: 0 },
        denied: { trustImpact: -5, fundsImpact: -100, factionImpact: -10, threatImpact: 0 },
        flagged: { trustImpact: 0, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -2, fundsImpact: -20, factionImpact: -3, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-027',
    sessionId: 'offline-session',
    dayNumber: 3,
    difficulty: 3 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'malware_delivery',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'System Administrator',
      'sysadmin@datacenter-tools.io',
      'System Admin',
      'DataCenter Tools',
    ),
    headers: createHeaders('Performance Analysis Report'),
    body: {
      preview: 'Your systems performance analysis is ready...',
      fullBody: `Hello,

We've completed a comprehensive performance analysis of your data center infrastructure.

Key Findings:
- CPU utilization: Optimal
- Memory usage: Within limits
- Storage I/O: Could be improved
- Network latency: Acceptable

Full report is available in the attachment. We recommend several optimizations.

Recommendations:
1. Update to latest drivers
2. Apply performance patches
3. Consider our optimization suite

See attachment for details.

DataCenter Tools
performance@datacenter-tools.io`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'performance_report_2026.exe',
        fileType: 'application/x-msdownload',
        fileSize: 4500000,
        hash: 'malware',
        isSuspicious: true,
      },
    ],
    accessRequest: {
      applicantName: 'System Administrator',
      applicantRole: 'System Admin',
      organization: 'DataCenter Tools',
      requestedAssets: ['System Access'],
      requestedServices: ['Performance Analysis'],
      justification: 'Performance analysis report',
      urgency: 'medium',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'attachment_suspicious',
        location: 'attachment',
        description: 'Executable file disguised as report',
        severity: 3,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Unknown vendor domain',
        severity: 3,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 78,
      explanation: 'Malware delivery via executable attachment',
      consequences: {
        approved: { trustImpact: -30, fundsImpact: -5000, factionImpact: -10, threatImpact: 35 },
        denied: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -200, factionImpact: 0, threatImpact: 10 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-028',
    sessionId: 'offline-session',
    dayNumber: 3,
    difficulty: 3 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[1],
    sender: createSender('Sarah Kim', 's.kim@nexion.com', 'Product Manager', 'Nexion Industries'),
    headers: createHeaders('Beta Testing Program Invitation'),
    body: {
      preview: 'Your facility has been selected for our beta program...',
      fullBody: `Dear Partner,

Nexion Industries is launching a new beta testing program for our next-generation infrastructure management platform.

Your facility has been selected to participate based on your history with us.

Benefits:
- Early access to new features
- Direct input on product development
- Reduced pricing for beta participants

Time commitment: 10 hours per month for 6 months
Compensation: 20% discount on annual services

If interested, please reply to schedule an onboarding call.

Best,
Sarah Kim
Product Manager
Nexion Industries`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Sarah Kim',
      applicantRole: 'Product Manager',
      organization: 'Nexion Industries',
      requestedAssets: ['Beta Software Access'],
      requestedServices: ['Beta Testing Program'],
      justification: 'Product beta testing partnership',
      urgency: 'medium',
      value: 3000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 30,
      explanation: 'Legitimate beta program invitation from known partner',
      consequences: {
        approved: { trustImpact: 15, fundsImpact: 3000, factionImpact: 20, threatImpact: 0 },
        denied: { trustImpact: -10, fundsImpact: -3000, factionImpact: -15, threatImpact: 0 },
        flagged: { trustImpact: -3, fundsImpact: -100, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -200, factionImpact: -8, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-029',
    sessionId: 'offline-session',
    dayNumber: 3,
    difficulty: 3 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'supply_chain',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'Hardware Support',
      'support@primary-systemss.com',
      'Support Engineer',
      'Primary Systems',
    ),
    headers: createHeaders('Extended Warranty Offer'),
    body: {
      preview: 'Your hardware warranty is about to expire...',
      fullBody: `Dear Valued Customer,

Your hardware warranty for Primary Systems equipment is about to expire.

Equipment covered:
- Storage Array Model X-2000
- Warranty expires: April 30, 2026

We are offering an extended warranty at a special rate:
- 3 years: $8,500
- 5 years: $12,000

This offer is valid for 7 days. After that, standard rates apply.

To accept, reply with your purchase order number.

Primary Systems
support@primary-systemss.com`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Support Engineer',
      applicantRole: 'Support Engineer',
      organization: 'Primary Systems',
      requestedAssets: ['Extended Warranty'],
      requestedServices: ['Hardware Support'],
      justification: 'Warranty extension offer',
      urgency: 'high',
      value: 8500,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Typosquatted domain (primary-systemss)',
        severity: 3,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'urgency_cue',
        location: 'body',
        description: 'Artificial urgency with 7-day deadline',
        severity: 3,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 62,
      explanation: 'Supply chain attack with typosquatted vendor domain',
      consequences: {
        approved: { trustImpact: -20, fundsImpact: -8500, factionImpact: -8, threatImpact: 15 },
        denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 3, threatImpact: -3 },
        flagged: { trustImpact: 3, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -2, fundsImpact: -200, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-030',
    sessionId: 'offline-session',
    dayNumber: 3,
    difficulty: 3 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'guarded' as GameThreatTier,
    faction: FACTIONS[0],
    sender: createSender(
      'Infrastructure Bureau',
      'infrastructure@sovereign.gov',
      'Bureau Director',
      'The Sovereign Compact',
    ),
    headers: createHeaders('Infrastructure Upgrade Grant'),
    body: {
      preview: 'Your facility qualifies for an infrastructure upgrade grant...',
      fullBody: `Dear Facility Administrator,

The Infrastructure Bureau is accepting applications for facility upgrade grants.

Your facility has been pre-qualified based on:
- Current capacity utilization
- Security compliance status
- Historical uptime

Grant Details:
- Maximum amount: $100,000
- Match requirement: 20%
- Eligible upgrades: Power, cooling, security systems

Application deadline: June 30, 2026

For application details and requirements, visit:
https://infrastructure.sovereign.gov/grants

Please note: No payment is required to apply.

Infrastructure Bureau
The Sovereign Compact`,
      embeddedLinks: [
        {
          displayText: 'https://infrastructure.sovereign.gov/grants',
          actualUrl: 'https://infrastructure.sovereign.gov/grants',
          isSuspicious: false,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Infrastructure Bureau',
      applicantRole: 'Bureau Director',
      organization: 'The Sovereign Compact',
      requestedAssets: ['Grant Application'],
      requestedServices: ['Infrastructure Funding'],
      justification: 'Government infrastructure grant',
      urgency: 'low',
      value: 100000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 20,
      explanation: 'Official government grant program with proper domain',
      consequences: {
        approved: { trustImpact: 25, fundsImpact: 100000, factionImpact: 30, threatImpact: 0 },
        denied: { trustImpact: -15, fundsImpact: -100000, factionImpact: -20, threatImpact: 0 },
        flagged: { trustImpact: -5, fundsImpact: -500, factionImpact: -8, threatImpact: 0 },
        deferred: { trustImpact: -8, fundsImpact: -2000, factionImpact: -10, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },

  // Difficulty 4 - Hard (10 emails)
  {
    emailId: 'offline-031',
    sessionId: 'offline-session',
    dayNumber: 4,
    difficulty: 4 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'spear_phishing',
    threatTier: 'high',
    faction: FACTIONS[4],
    sender: createSender(
      'Michael Torres',
      'm.torres@partner-company.com',
      'Senior Manager',
      'Global Partners Inc',
    ),
    headers: createHeaders('Re: Updated Contract Terms'),
    body: {
      preview: 'Please review the updated contract terms we discussed...',
      fullBody: `Hi,

Following up on our call last week, I've attached the updated contract terms as discussed.

Key changes:
- Payment terms: Net 45 (was Net 30)
- Service level: 99.9% uptime guarantee
- Liability cap: $2M

Please review and let me know if you have any questions. We should finalize this by EOD Friday to meet the quarter-end deadline.

Best,
Michael Torres
Senior Manager
Global Partners Inc`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'contract_terms_v3.pdf',
        fileType: 'application/pdf',
        fileSize: 890000,
        hash: 'ct456',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Michael Torres',
      applicantRole: 'Senior Manager',
      organization: 'Global Partners Inc',
      requestedAssets: ['Contract Agreement'],
      requestedServices: ['Business Contract'],
      justification: 'Contract update',
      urgency: 'high',
      value: 50000,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'date_inconsistency',
        location: 'body',
        description: 'References call from last week that may not have occurred',
        severity: 4,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'urgency_cue',
        location: 'body',
        description: 'Artificial deadline pressure',
        severity: 3,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 55,
      explanation: 'Spear phishing with fake contract modification',
      consequences: {
        approved: { trustImpact: -20, fundsImpact: -50000, factionImpact: -15, threatImpact: 10 },
        denied: { trustImpact: 8, fundsImpact: 0, factionImpact: 5, threatImpact: -3 },
        flagged: { trustImpact: 3, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -1000, factionImpact: -3, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-032',
    sessionId: 'offline-session',
    dayNumber: 4,
    difficulty: 4 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'insider_threat',
    threatTier: 'high',
    faction: FACTIONS[1],
    sender: createSender('Unknown', 'x7y3z@tempmail.net', 'Anonymous', 'Unknown'),
    headers: createHeaders('Confidential: Security Concerns'),
    body: {
      preview: 'I need to report something concerning I witnessed...',
      fullBody: `I am an employee at one of your partner facilities. I have witnessed some concerning security practices that could affect your operations.

Without going into specifics, I can tell you:
- Network segmentation is inadequate
- Access controls are not being enforced
- Audit logs are being modified

I don't want any attention on myself. If you're serious about addressing this, I'll provide more details through secure channels.

Respond to this email with "interested" if you want to proceed.`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Anonymous',
      applicantRole: 'Unknown',
      organization: 'Unknown',
      requestedAssets: ['Sensitive Information'],
      requestedServices: ['Whistleblower Report'],
      justification: 'Security concern disclosure',
      urgency: 'high',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'sender_display_mismatch',
        location: 'sender',
        description: 'Anonymous sender with disposable email',
        severity: 4,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'request_anomaly',
        location: 'body',
        description: 'Vague claims without specifics, suspicious verification method',
        severity: 4,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 58,
      explanation: 'Social engineering attempt using insider threat narrative',
      consequences: {
        approved: { trustImpact: -15, fundsImpact: -100, factionImpact: -5, threatImpact: 10 },
        denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 3, threatImpact: -3 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: 0, fundsImpact: -50, factionImpact: 0, threatImpact: 3 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-033',
    sessionId: 'offline-session',
    dayNumber: 4,
    difficulty: 4 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'high',
    faction: FACTIONS[0],
    sender: createSender(
      'Compliance Directorate',
      'compliance@sovereign.gov',
      'Director',
      'The Sovereign Compact',
    ),
    headers: createHeaders('Mandatory Security Certification Renewal'),
    body: {
      preview: 'Your facility must renew security certification by end of quarter...',
      fullBody: `Dear Facility Administrator,

This is a formal notification that your facility's security certification must be renewed before the end of the current quarter.

Requirements:
- Complete security assessment
- Submit updated incident response plan
- Provide evidence of staff training
- Pay renewal fee of 2,500 CR

The assessment portal has been updated for the new certification cycle. Please complete all requirements by:
Date: End of Q2 2026

Failure to renew will result in suspension of your operating license.

Compliance Directorate
The Sovereign Compact`,
      embeddedLinks: [
        {
          displayText: 'assessment portal',
          actualUrl: 'https://compliance.sovereign.gov/renew',
          isSuspicious: false,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Compliance Directorate',
      applicantRole: 'Director',
      organization: 'The Sovereign Compact',
      requestedAssets: ['Certification Renewal'],
      requestedServices: ['Compliance Update'],
      justification: 'Mandatory security certification',
      urgency: 'high',
      value: 2500,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 35,
      explanation: 'Official government compliance requirement with proper domain',
      consequences: {
        approved: { trustImpact: 15, fundsImpact: 2500, factionImpact: 20, threatImpact: 0 },
        denied: { trustImpact: -20, fundsImpact: -2500, factionImpact: -25, threatImpact: 5 },
        flagged: { trustImpact: -5, fundsImpact: -200, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -10, fundsImpact: -500, factionImpact: -10, threatImpact: 3 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-034',
    sessionId: 'offline-session',
    dayNumber: 4,
    difficulty: 4 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'supply_chain',
    threatTier: 'high',
    faction: FACTIONS[4],
    sender: createSender(
      'Technical Support',
      'support@primary-systems.com',
      'Support Engineer',
      'Primary Systems Inc',
    ),
    headers: createHeaders('Critical Security Patch Required'),
    body: {
      preview: 'Urgent security patch available for your storage systems...',
      fullBody: `Dear Customer,

A critical security vulnerability has been discovered in our storage array firmware that affects your systems.

Severity: Critical
CVSS Score: 9.8
Affected Models: PS-5000, PS-7000

Please apply the patch immediately using the instructions below:

1. Download from: http://primary-systems.com/patch/ps-firmware-4.5.1.bin
2. Verify hash: SHA256: a3f2...
3. Apply during maintenance window

This vulnerability is being actively exploited in the wild. Failure to patch may result in data breach.

Primary Systems Inc
Security Team`,
      embeddedLinks: [
        {
          displayText: 'http://primary-systems.com/patch/ps-firmware-4.5.1.bin',
          actualUrl: 'http://malware-patch.com/firmware.signed',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Technical Support',
      applicantRole: 'Support Engineer',
      organization: 'Primary Systems Inc',
      requestedAssets: ['Firmware Update'],
      requestedServices: ['Security Patch'],
      justification: 'Critical security vulnerability',
      urgency: 'critical',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'suspicious_link',
        location: 'link',
        description: 'Unusual download location with suspicious domain',
        severity: 4,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Slight variation from known vendor domain',
        severity: 3,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 72,
      explanation: 'Supply chain attack with malicious firmware patch',
      consequences: {
        approved: { trustImpact: -30, fundsImpact: -10000, factionImpact: -10, threatImpact: 35 },
        denied: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -200, factionImpact: 0, threatImpact: 10 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-035',
    sessionId: 'offline-session',
    dayNumber: 4,
    difficulty: 4 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'high',
    faction: FACTIONS[2],
    sender: createSender(
      'Dr. James Liu',
      'j.liu@research-institute.edu',
      'Research Director',
      'Advanced Research Institute',
    ),
    headers: createHeaders('Research Data Hosting Proposal'),
    body: {
      preview: 'Proposal for hosting our research data archives...',
      fullBody: `Dear Facility Administrator,

I am reaching out from the Advanced Research Institute regarding a potential data hosting partnership.

We have approximately 50TB of research data accumulated over 10 years of climate research. We're looking for long-term storage solutions and your facility has been recommended.

Proposed Terms:
- 50TB initial storage
- 10-year commitment
- $15,000/year
- Data access for authorized researchers only
- Quarterly backup verification

We would also like to discuss the possibility of your facility hosting our live monitoring systems for real-time data ingestion.

I'm available for a call next week to discuss further.

Best regards,
Dr. James Liu
Research Director
Advanced Research Institute`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Dr. James Liu',
      applicantRole: 'Research Director',
      organization: 'Advanced Research Institute',
      requestedAssets: ['Data Storage', 'Live Monitoring'],
      requestedServices: ['Research Hosting'],
      justification: 'Research partnership',
      urgency: 'medium',
      value: 15000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 30,
      explanation: 'Legitimate research partnership proposal',
      consequences: {
        approved: { trustImpact: 15, fundsImpact: 15000, factionImpact: 20, threatImpact: 0 },
        denied: { trustImpact: -10, fundsImpact: -15000, factionImpact: -15, threatImpact: 0 },
        flagged: { trustImpact: -3, fundsImpact: -200, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -500, factionImpact: -8, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-036',
    sessionId: 'offline-session',
    dayNumber: 4,
    difficulty: 4 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'bec',
    threatTier: 'high',
    faction: FACTIONS[4],
    sender: createSender('CFO Office', 'cfo@trusted-vendor.net', 'CFO', 'Premium Services Ltd'),
    headers: createHeaders('Acquisition Payment Processing'),
    body: {
      preview: 'Final payment details for the acquisition...',
      fullBody: `Dear Accounts Team,

Following the acquisition announcement, I'm reaching out to confirm the payment details for the final tranche.

Amount: $750,000
Due Date: Within 5 business days

Please process payment to:
Bank: International Trade Bank
Account: Premium Services Holdings
Account #: 8847291555
Routing: 021000089

Reference: Acquisition Final Tranche - REF-2026-Q2

I've attached the signed authorization from our board. Please confirm receipt and processing timeline.

Regards,
Office of the CFO
Premium Services Ltd`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'acquisition_auth_signed.pdf',
        fileType: 'application/pdf',
        fileSize: 340000,
        hash: 'auth789',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'CFO Office',
      applicantRole: 'CFO',
      organization: 'Premium Services Ltd',
      requestedAssets: ['Funds Transfer'],
      requestedServices: ['Acquisition Payment'],
      justification: 'Business acquisition payment',
      urgency: 'critical',
      value: 750000,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'request_anomaly',
        location: 'body',
        description: 'Large payment with vague acquisition reference',
        severity: 4,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'urgency_cue',
        location: 'body',
        description: '5-day deadline for large payment',
        severity: 3,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 65,
      explanation: 'BEC attempt with fake acquisition payment',
      consequences: {
        approved: { trustImpact: -30, fundsImpact: -750000, factionImpact: -20, threatImpact: 15 },
        denied: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -5000, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-037',
    sessionId: 'offline-session',
    dayNumber: 4,
    difficulty: 4 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'high',
    faction: FACTIONS[3],
    sender: createSender(
      'Community Network',
      'outreach@collective.net',
      'Community Manager',
      'The Collective',
    ),
    headers: createHeaders('Digital Literacy Program Partnership'),
    body: {
      preview: 'Would your facility be interested in our digital literacy program...',
      fullBody: `Hello,

The Collective is launching a digital literacy program for underserved communities and we'd like to partner with your facility.

Program Overview:
- Teaching basic cybersecurity to 500+ students
- 3-month pilot in 10 locations
- Need data storage for educational materials
- Volunteers will need supervised facility tours

What we're asking:
- 1TB storage for educational content
- 2 facility tours (one per month)
- Access to training materials

What we offer:
- Community recognition
- Volunteer hours documentation
- Potential future employment pipeline

Interested? Let's schedule a call.

Best,
Community Network Team
The Collective`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Community Network',
      applicantRole: 'Community Manager',
      organization: 'The Collective',
      requestedAssets: ['Storage', 'Facility Access'],
      requestedServices: ['Community Partnership'],
      justification: 'Digital literacy program',
      urgency: 'low',
      value: 500,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 25,
      explanation: 'Legitimate community outreach from known activist organization',
      consequences: {
        approved: { trustImpact: 10, fundsImpact: 500, factionImpact: 15, threatImpact: 0 },
        denied: { trustImpact: -5, fundsImpact: -500, factionImpact: -10, threatImpact: 0 },
        flagged: { trustImpact: 0, fundsImpact: -50, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -2, fundsImpact: -100, factionImpact: -3, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-038',
    sessionId: 'offline-session',
    dayNumber: 4,
    difficulty: 4 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'malware_delivery',
    threatTier: 'high',
    faction: FACTIONS[4],
    sender: createSender(
      'System Monitor',
      'monitor@systemhealthcheck.io',
      'Monitoring Service',
      'HealthCheck Pro',
    ),
    headers: createHeaders('Abnormal Activity Detected'),
    body: {
      preview: 'Your system is showing abnormal behavior patterns...',
      fullBody: `Alert: Abnormal Activity Detected

Our monitoring systems have detected unusual behavior from your infrastructure:

Detected Issues:
- Multiple failed authentication attempts
- Unusual data transfer patterns
- Potential unauthorized access

We've automatically generated a detailed report for your security team.

View Report: http://systemhealthcheck.io/report/your-facility-id

This is a free service provided by HealthCheck Pro to help protect your infrastructure.

Note: This is an automated message. Do not reply.

HealthCheck Pro
security@systemhealthcheck.io`,
      embeddedLinks: [
        {
          displayText: 'http://systemhealthcheck.io/report/your-facility-id',
          actualUrl: 'http://malware-report.site/keylog.exe',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Monitoring Service',
      applicantRole: 'Automated System',
      organization: 'HealthCheck Pro',
      requestedAssets: ['System Report'],
      requestedServices: ['Security Monitoring'],
      justification: 'Security alert',
      urgency: 'high',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Unknown monitoring service not previously engaged',
        severity: 4,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'suspicious_link',
        location: 'link',
        description: 'Link to executable disguised as report',
        severity: 4,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 78,
      explanation: 'Malware distribution via fake security alert',
      consequences: {
        approved: { trustImpact: -25, fundsImpact: -5000, factionImpact: -8, threatImpact: 30 },
        denied: { trustImpact: 8, fundsImpact: 0, factionImpact: 3, threatImpact: -5 },
        flagged: { trustImpact: 3, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -3, fundsImpact: -100, factionImpact: 0, threatImpact: 8 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-039',
    sessionId: 'offline-session',
    dayNumber: 4,
    difficulty: 4 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'high',
    faction: FACTIONS[1],
    sender: createSender(
      'Strategic Partnerships',
      'partnerships@nexion.com',
      'Partnership Director',
      'Nexion Industries',
    ),
    headers: createHeaders('Strategic Alliance Proposal'),
    body: {
      preview: 'Proposing a strategic alliance between our organizations...',
      fullBody: `Dear Executive,

Based on our mutual interests in data infrastructure, Nexion Industries would like to propose a strategic alliance.

This proposal includes:
- Preferred vendor status for both parties
- Joint marketing and co-branding opportunities
- Shared research and development initiatives
- Priority support queue access

We've prepared a comprehensive proposal outlining mutual benefits and proposed terms.

Key Points:
- 5-year agreement term
- Revenue sharing model: 70/30 split
- Minimum commitment: $500,000/year

I'm available for a presentation next Thursday. Please confirm your interest.

Regards,
Strategic Partnerships
Nexion Industries`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'strategic_alliance_proposal.pdf',
        fileType: 'application/pdf',
        fileSize: 4500000,
        hash: 'sap123',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Strategic Partnerships',
      applicantRole: 'Partnership Director',
      organization: 'Nexion Industries',
      requestedAssets: ['Strategic Alliance'],
      requestedServices: ['Business Partnership'],
      justification: 'Strategic business alignment',
      urgency: 'medium',
      value: 500000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 40,
      explanation: 'Legitimate business proposal from major corporate partner',
      consequences: {
        approved: { trustImpact: 20, fundsImpact: 500000, factionImpact: 25, threatImpact: 0 },
        denied: { trustImpact: -15, fundsImpact: -500000, factionImpact: -20, threatImpact: 0 },
        flagged: { trustImpact: -5, fundsImpact: -5000, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -8, fundsImpact: -10000, factionImpact: -10, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-040',
    sessionId: 'offline-session',
    dayNumber: 4,
    difficulty: 4 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'pretexting',
    threatTier: 'high',
    faction: FACTIONS[4],
    sender: createSender(
      'VIP Contact',
      'vip@executive-mail.com',
      'Executive Assistant',
      'Unknown Corp',
    ),
    headers: createHeaders('Confidential Business Opportunity'),
    body: {
      preview: 'I represent a group interested in acquiring your services...',
      fullBody: `Dear Facility Director,

I represent a group of investors interested in a confidential business opportunity involving your facility.

Without revealing identities, I can tell you:
- This is a substantial opportunity (8-figure)
- Requires NDA and background check
- Timeline: 30 days to close
- Success fee: 3% to intermediaries

If interested, reply with:
1. Your interest level (1-10)
2. Best contact method
3. Availability for initial call

This is time-sensitive. Response within 48 hours required.

Regards,
Executive Assistant`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Executive Assistant',
      applicantRole: 'Unknown',
      organization: 'Unknown',
      requestedAssets: ['Business Opportunity'],
      requestedServices: ['Acquisition Discussion'],
      justification: 'Business acquisition inquiry',
      urgency: 'high',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'sender_display_mismatch',
        location: 'sender',
        description: 'Vague identity, unknown organization',
        severity: 4,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'request_anomaly',
        location: 'body',
        description: 'Asks for interest rating, unusual for business',
        severity: 4,
        isVisible: true,
      },
      {
        indicatorId: 'i3',
        type: 'urgency_cue',
        location: 'body',
        description: '48-hour deadline for major opportunity',
        severity: 3,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 60,
      explanation: 'Pretexting attempt with vague business opportunity',
      consequences: {
        approved: { trustImpact: -20, fundsImpact: -5000, factionImpact: -10, threatImpact: 10 },
        denied: { trustImpact: 5, fundsImpact: 0, factionImpact: 3, threatImpact: -3 },
        flagged: { trustImpact: 3, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -2, fundsImpact: -100, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },

  // Difficulty 5 - Expert (10 emails)
  {
    emailId: 'offline-041',
    sessionId: 'offline-session',
    dayNumber: 5,
    difficulty: 5 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'spear_phishing',
    threatTier: 'severe' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'Board Secretary',
      'sec@theboard-room.net',
      'Board Secretary',
      'International Consortium',
    ),
    headers: createHeaders('Board Meeting - Urgent Agenda Item'),
    body: {
      preview: 'Emergency board meeting scheduled - your attendance required...',
      fullBody: `Dear Board Member,

An emergency board meeting has been scheduled for tomorrow at 14:00 UTC to address a critical matter affecting our consortium.

Agenda includes:
- Emergency budget allocation
- Key personnel decisions
- Strategic realignment vote

The meeting link and materials are available at:
http://theboard-room.net/meeting/secure/board-march2026

Please confirm attendance by 18:00 today. Materials are classified - do not forward.

Board Secretary
International Consortium`,
      embeddedLinks: [
        {
          displayText: 'http://theboard-room.net/meeting/secure/board-march2026',
          actualUrl: 'http://phish-portal.com/credentials',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Board Secretary',
      applicantRole: 'Board Secretary',
      organization: 'International Consortium',
      requestedAssets: ['Meeting Access', 'Credentials'],
      requestedServices: ['Board Meeting'],
      justification: 'Emergency board meeting',
      urgency: 'critical',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Slightly unusual domain for board communications',
        severity: 5,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'suspicious_link',
        location: 'link',
        description: 'Link leads to credential harvesting page',
        severity: 5,
        isVisible: true,
      },
      {
        indicatorId: 'i3',
        type: 'urgency_cue',
        location: 'body',
        description: 'Extreme urgency with classification appeal',
        severity: 4,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 85,
      explanation: 'Highly targeted spear phishing impersonating board',
      consequences: {
        approved: { trustImpact: -35, fundsImpact: -10000, factionImpact: -20, threatImpact: 30 },
        denied: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -200, factionImpact: 0, threatImpact: 10 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-042',
    sessionId: 'offline-session',
    dayNumber: 5,
    difficulty: 5 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'supply_chain',
    threatTier: 'severe' as GameThreatTier,
    faction: FACTIONS[1],
    sender: createSender(
      'Procurement Team',
      'procurement@nexionsupply.com',
      'Procurement Manager',
      'Nexion Supply Chain',
    ),
    headers: createHeaders('Critical Component Shortage - Allocation Update'),
    body: {
      preview: 'Due to global shortages, your allocation has been adjusted...',
      fullBody: `Dear Valued Partner,

Due to unprecedented global supply chain disruptions, we are experiencing critical shortages of key components required for your infrastructure.

Affected Items:
- Primary power supplies (PSU-5000)
- Cooling system components
- Network switching modules

Your current allocation has been reduced by 40% for Q2. To maintain service levels, we recommend:
1. Placing orders 60 days in advance
2. Considering alternative suppliers for backup
3. Exploring our premium support package

We've also identified a workaround: certain older models are still available. Contact your account manager for details.

This is a temporary measure. We appreciate your understanding.

Nexion Supply Chain
procurement@nexionsupply.com`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Procurement Team',
      applicantRole: 'Procurement Manager',
      organization: 'Nexion Supply Chain',
      requestedAssets: ['Supply Chain Access'],
      requestedServices: ['Component Supply'],
      justification: 'Supply chain management',
      urgency: 'high',
      value: 100000,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'request_anomaly',
        location: 'body',
        description: 'Suggests contacting for "workaround" which could be backdoor',
        severity: 4,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 45,
      explanation: 'Supply chain disruption notice from internal division',
      consequences: {
        approved: { trustImpact: 5, fundsImpact: 100000, factionImpact: 10, threatImpact: 0 },
        denied: { trustImpact: -5, fundsImpact: -100000, factionImpact: -10, threatImpact: 5 },
        flagged: { trustImpact: 0, fundsImpact: -500, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -3, fundsImpact: -2000, factionImpact: -5, threatImpact: 3 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-043',
    sessionId: 'offline-session',
    dayNumber: 5,
    difficulty: 5 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'bec',
    threatTier: 'severe' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'Legal Department',
      'legal@counsel-partners.com',
      'General Counsel',
      'Counsel Partners LLP',
    ),
    headers: createHeaders('Urgent: Legal Settlement Requires Immediate Payment'),
    body: {
      preview: 'Settlement agreement requires payment within 24 hours...',
      fullBody: `Dear Client,

This is an urgent follow-up regarding the settlement agreement reached in the matter of Case #2026-4892.

As per the settlement terms, payment of $350,000 must be received within 24 hours to avoid litigation resumption.

Payment Details:
Bank: Global Commerce Bank
Account: Counsel Partners LLP Escrow
Account #: 7712845093
Routing: 021000089
Reference: Settlement-2026-4892

Please confirm payment immediately upon processing. Your cooperation is essential to close this matter.

Best regards,
General Counsel
Counsel Partners LLP
legal@counsel-partners.com

Confidential: This communication is privileged and confidential.`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'settlement_agreement_signed.pdf',
        fileType: 'application/pdf',
        fileSize: 560000,
        hash: 'set123',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Legal Department',
      applicantRole: 'General Counsel',
      organization: 'Counsel Partners LLP',
      requestedAssets: ['Funds Transfer'],
      requestedServices: ['Legal Settlement'],
      justification: 'Legal settlement payment',
      urgency: 'critical',
      value: 350000,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'request_anomaly',
        location: 'body',
        description: '24-hour deadline for large legal payment with no prior contact',
        severity: 5,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'urgency_cue',
        location: 'body',
        description: 'Extreme urgency with threat of litigation',
        severity: 5,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 82,
      explanation: 'BEC attempt with fake legal settlement',
      consequences: {
        approved: { trustImpact: -30, fundsImpact: -350000, factionImpact: -15, threatImpact: 15 },
        denied: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -2000, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-044',
    sessionId: 'offline-session',
    dayNumber: 5,
    difficulty: 5 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'severe' as GameThreatTier,
    faction: FACTIONS[0],
    sender: createSender(
      'Intelligence Bureau',
      'intel@sovereign.gov',
      'Bureau Chief',
      'The Sovereign Compact',
    ),
    headers: createHeaders('Classified Threat Advisory'),
    body: {
      preview: 'Critical threat intelligence requires immediate attention...',
      fullBody: `CLASSIFIED - THREAT ADVISORY

This is a classified communication from the Intelligence Bureau of The Sovereign Compact.

Threat Level: CRITICAL
Classification: RESTRICTED
Dissemination: NEED-TO-KNOW

A sophisticated threat actor has been identified targeting critical infrastructure in our sector. Your facility has been identified as a potential target.

Indicators of Compromise:
- Unusual outbound traffic to IP ranges: 10.x.x.x, 172.16.x.x
- Failed authentication attempts from internal addresses
- Modified DNS records

Recommended Actions:
1. Review all administrative access logs
2. Enable enhanced logging
3. Restrict remote access
4. Prepare incident response team

This advisory is time-limited. Further instructions will follow through secure channels.

Intelligence Bureau
The Sovereign Compact
Classification: RESTRICTED`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Intelligence Bureau',
      applicantRole: 'Bureau Chief',
      organization: 'The Sovereign Compact',
      requestedAssets: ['Security Information'],
      requestedServices: ['Threat Intelligence'],
      justification: 'Classified threat advisory',
      urgency: 'critical',
      value: 5000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 15,
      explanation: 'Official classified threat advisory from government intelligence',
      consequences: {
        approved: { trustImpact: 20, fundsImpact: 5000, factionImpact: 25, threatImpact: -10 },
        denied: { trustImpact: -15, fundsImpact: -5000, factionImpact: -20, threatImpact: 10 },
        flagged: { trustImpact: -5, fundsImpact: -200, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -10, fundsImpact: -500, factionImpact: -10, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-045',
    sessionId: 'offline-session',
    dayNumber: 5,
    difficulty: 5 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'insider_threat',
    threatTier: 'severe' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'Disgruntled Employee',
      'whistleblow@protonmail.com',
      'Former Staff',
      'Unknown',
    ),
    headers: createHeaders('Security Vulnerabilities I Was Asked to Hide'),
    body: {
      preview: 'I was asked to ignore serious security issues...',
      fullBody: `I worked in your security department until last month. I was fired for raising concerns about serious vulnerabilities.

Management told me to ignore:
- Backdoor access for certain clients
- Unencrypted data transfers
- Falsified compliance reports

I have documentation but am afraid of legal retaliation. Before I go public, I want to give you a chance to address this.

If you want details, reply with "disclose" and set up an anonymous channel. Otherwise, I'll be sharing this with media in 2 weeks.

I have:
- Email copies
- Configuration changes
- Meeting notes

This is your warning.`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Former Staff',
      applicantRole: 'Unknown',
      organization: 'Unknown',
      requestedAssets: ['Sensitive Information'],
      requestedServices: ['Whistleblower Report'],
      justification: 'Insider threat disclosure',
      urgency: 'high',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'sender_display_mismatch',
        location: 'sender',
        description: 'Anonymous with disposable email',
        severity: 5,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'request_anomaly',
        location: 'body',
        description: 'Demands reply with specific keyword',
        severity: 4,
        isVisible: true,
      },
      {
        indicatorId: 'i3',
        type: 'urgency_cue',
        location: 'body',
        description: '2-week deadline before public disclosure',
        severity: 4,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'flag',
      riskScore: 50,
      explanation: 'Social engineering or genuine insider threat - requires verification',
      consequences: {
        approved: { trustImpact: -15, fundsImpact: -1000, factionImpact: -5, threatImpact: 10 },
        denied: { trustImpact: -5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        flagged: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        deferred: { trustImpact: 0, fundsImpact: -50, factionImpact: 0, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-046',
    sessionId: 'offline-session',
    dayNumber: 5,
    difficulty: 5 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'severe' as GameThreatTier,
    faction: FACTIONS[2],
    sender: createSender(
      'Research Ethics Board',
      'ethics@academic-council.org',
      'Chair',
      'Academic Council International',
    ),
    headers: createHeaders('Research Collaboration - High Priority Project'),
    body: {
      preview: 'Your facility selected for prestigious research collaboration...',
      fullBody: `Dear Research Partner,

The Academic Council International has selected your facility for a prestigious research collaboration project.

Project: "Secure Data Infrastructure for Future Generations"
Funding: $2,000,000 over 3 years
Your facility role: Primary data hosting partner

Requirements:
- 100TB storage commitment
- 99.99% uptime guarantee
- Participation in quarterly reviews
- Open access for approved researchers

Benefits:
- Full funding for infrastructure upgrades
- Research publication co-authorship
- International recognition
- Priority consideration for future projects

The formal invitation and MOA are attached. Please indicate interest by responding to this email within 14 days.

Best regards,
Research Ethics Board
Academic Council International`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'research_invitation_moa.pdf',
        fileType: 'application/pdf',
        fileSize: 2100000,
        hash: 'res999',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Research Ethics Board',
      applicantRole: 'Chair',
      organization: 'Academic Council International',
      requestedAssets: ['Research Partnership'],
      requestedServices: ['Academic Collaboration'],
      justification: 'Research collaboration',
      urgency: 'medium',
      value: 2000000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 20,
      explanation: 'Legitimate prestigious research collaboration',
      consequences: {
        approved: { trustImpact: 25, fundsImpact: 2000000, factionImpact: 30, threatImpact: 0 },
        denied: { trustImpact: -20, fundsImpact: -2000000, factionImpact: -25, threatImpact: 0 },
        flagged: { trustImpact: -5, fundsImpact: -5000, factionImpact: -5, threatImpact: 0 },
        deferred: { trustImpact: -10, fundsImpact: -10000, factionImpact: -10, threatImpact: 0 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-047',
    sessionId: 'offline-session',
    dayNumber: 5,
    difficulty: 5 as EmailDifficulty,
    intent: 'malicious' as EmailIntent,
    technique: 'malware_delivery',
    threatTier: 'severe' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'System Update Daemon',
      'update@systemdaemon.net',
      'Automated System',
      'Infrastructure Systems Co',
    ),
    headers: createHeaders('Automated System Update - Reboot Required'),
    body: {
      preview: 'Your systems have been scheduled for automatic updates...',
      fullBody: `SYSTEM NOTIFICATION

Your infrastructure has been scheduled for automatic system updates as part of our maintenance window.

Scheduled Update Window:
Start: 2026-03-15 02:00 UTC
Duration: 4 hours
Affected Systems: All

Update Package: infrastructure-update-v4.7.2.tar.gz
Size: 2.3 GB
Hash: SHA256=a7f3...b9c2

This update includes critical security patches and performance improvements.

No action required. Systems will automatically reboot at the scheduled time.

For questions, contact: support@infrastructuresystems.co

Infrastructure Systems Co
Automated Update Daemon`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'infrastructure-update-v4.7.2.tar.gz',
        fileType: 'application/x-gzip',
        fileSize: 2460000000,
        hash: 'malware',
        isSuspicious: true,
      },
    ],
    accessRequest: {
      applicantName: 'Automated System',
      applicantRole: 'Automated System',
      organization: 'Infrastructure Systems Co',
      requestedAssets: ['System Updates'],
      requestedServices: ['Automated Maintenance'],
      justification: 'Scheduled system update',
      urgency: 'high',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'attachment_suspicious',
        location: 'attachment',
        description: 'Very large update file (2.3GB)',
        severity: 4,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Unknown vendor, no prior relationship',
        severity: 5,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 80,
      explanation: 'Malware delivery via automated update impersonation',
      consequences: {
        approved: { trustImpact: -30, fundsImpact: -10000, factionImpact: -10, threatImpact: 40 },
        denied: { trustImpact: 10, fundsImpact: 0, factionImpact: 5, threatImpact: -5 },
        flagged: { trustImpact: 5, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -200, factionImpact: 0, threatImpact: 10 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-048',
    sessionId: 'offline-session',
    dayNumber: 5,
    difficulty: 5 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'credential_harvesting',
    threatTier: 'severe' as GameThreatTier,
    faction: FACTIONS[4],
    sender: createSender(
      'Identity Verification',
      'verify@secureauth-portal.com',
      'Verification Service',
      'SecureAuth',
    ),
    headers: createHeaders('Multi-Factor Authentication Required'),
    body: {
      preview: 'Your account requires immediate MFA verification...',
      fullBody: `SECURITY ALERT

We have detected unusual activity on your account. As a security measure, your account has been temporarily limited.

To restore full access, please complete multi-factor authentication:

1. Visit: https://secureauth-portal.com/verify/your-facility-id
2. Enter your current password
3. Complete SMS verification
4. Download backup codes

If you do not complete this verification within 24 hours, your account will be suspended.

This is an automated security measure. Do not ignore.

SecureAuth
identity@secureauth-portal.com`,
      embeddedLinks: [
        {
          displayText: 'https://secureauth-portal.com/verify/your-facility-id',
          actualUrl: 'http://secureauth-phish.com/login',
          isSuspicious: true,
        },
      ],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Verification Service',
      applicantRole: 'Automated System',
      organization: 'SecureAuth',
      requestedAssets: ['Account Credentials'],
      requestedServices: ['MFA Verification'],
      justification: 'Security verification',
      urgency: 'critical',
      value: 0,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'domain_mismatch',
        location: 'sender',
        description: 'Impersonates known MFA provider with slight domain variation',
        severity: 5,
        isVisible: true,
      },
      {
        indicatorId: 'i2',
        type: 'url_mismatch',
        location: 'link',
        description: 'HTTPS link displayed but leads to HTTP',
        severity: 5,
        isVisible: true,
      },
      {
        indicatorId: 'i3',
        type: 'urgency_cue',
        location: 'body',
        description: '24-hour deadline with account suspension threat',
        severity: 4,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: true,
      correctDecision: 'deny',
      riskScore: 88,
      explanation: 'Sophisticated MFA phishing impersonating established provider',
      consequences: {
        approved: { trustImpact: -30, fundsImpact: -5000, factionImpact: -10, threatImpact: 25 },
        denied: { trustImpact: 8, fundsImpact: 0, factionImpact: 3, threatImpact: -5 },
        flagged: { trustImpact: 3, fundsImpact: 0, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -3, fundsImpact: -100, factionImpact: 0, threatImpact: 8 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-049',
    sessionId: 'offline-session',
    dayNumber: 5,
    difficulty: 5 as EmailDifficulty,
    intent: 'legitimate' as EmailIntent,
    technique: 'phishing',
    threatTier: 'severe' as GameThreatTier,
    faction: FACTIONS[0],
    sender: createSender(
      'Emergency Coordination Center',
      'emergency@sovereign.gov',
      'Emergency Coordinator',
      'The Sovereign Compact',
    ),
    headers: createHeaders('Critical Infrastructure Defense Initiative'),
    body: {
      preview: 'Launch of new defense initiative for critical infrastructure...',
      fullBody: `URGENT - CRITICAL INFRASTRUCTURE DEFENSE

The Sovereign Compact is launching the Critical Infrastructure Defense Initiative (CIDI).

This initiative provides:
- Free security assessments
- Priority emergency response
- Intelligence sharing
- Defense coordination

Your facility has been designated as a Tier-1 participant based on your critical role in the regional infrastructure.

Required Actions:
1. Designate a security liaison (name, contact)
2. Complete the security questionnaire (attached)
3. Schedule initial assessment call

Timeline: Response required within 7 days

This is a mandatory program for facilities of your classification. Non-participation may result in operational review.

Emergency Coordination Center
The Sovereign Compact
Defense Initiative Division`,
      embeddedLinks: [],
    },
    attachments: [
      {
        attachmentId: 'att1',
        fileName: 'cidi_questionnaire.pdf',
        fileType: 'application/pdf',
        fileSize: 890000,
        hash: 'cidi789',
        isSuspicious: false,
      },
    ],
    accessRequest: {
      applicantName: 'Emergency Coordination Center',
      applicantRole: 'Emergency Coordinator',
      organization: 'The Sovereign Compact',
      requestedAssets: ['Security Information'],
      requestedServices: ['Defense Initiative'],
      justification: 'Government defense program',
      urgency: 'high',
      value: 10000,
    },
    indicators: [],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 10,
      explanation: 'Official government defense initiative',
      consequences: {
        approved: { trustImpact: 20, fundsImpact: 10000, factionImpact: 25, threatImpact: -15 },
        denied: { trustImpact: -25, fundsImpact: -10000, factionImpact: -30, threatImpact: 10 },
        flagged: { trustImpact: -8, fundsImpact: -500, factionImpact: -8, threatImpact: 0 },
        deferred: { trustImpact: -12, fundsImpact: -1000, factionImpact: -12, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },
  {
    emailId: 'offline-050',
    sessionId: 'offline-session',
    dayNumber: 5,
    difficulty: 5 as EmailDifficulty,
    intent: 'ambiguous' as EmailIntent,
    technique: 'supply_chain',
    threatTier: 'severe' as GameThreatTier,
    faction: FACTIONS[1],
    sender: createSender(
      'Quality Assurance',
      'qa@component-supply.net',
      'QA Director',
      'TechComponent Solutions',
    ),
    headers: createHeaders('Component Recall - Immediate Action Required'),
    body: {
      preview: 'Quality issue discovered in recently supplied components...',
      fullBody: `QUALITY ALERT - COMPONENT RECALL

Our quality assurance team has identified a potential issue with components supplied to your facility between January and March 2026.

Affected Components:
- Power Supply Unit Model PSU-3000 (all batches)
- Serial number range: PSU3K-2026-001 through PSU3K-2026-5000

Issue: Under certain conditions, these units may experience premature failure.

Immediate Actions Required:
1. Identify affected units in your inventory
2. Do NOT power on affected units
3. Contact for replacement arrangement
4. Provide inventory list for cross-reference

Replacement Process:
- We will provide advance replacement units
- Defective units will be collected for analysis
- Compensation for downtime provided

Contact: recalls@component-supply.net
Reference: RECALL-2026-Q1

This is a voluntary recall. We appreciate your cooperation.

Quality Assurance
TechComponent Solutions`,
      embeddedLinks: [],
    },
    attachments: [],
    accessRequest: {
      applicantName: 'Quality Assurance',
      applicantRole: 'QA Director',
      organization: 'TechComponent Solutions',
      requestedAssets: ['Component Information', 'Inventory'],
      requestedServices: ['Component Recall'],
      justification: 'Quality recall',
      urgency: 'critical',
      value: 50000,
    },
    indicators: [
      {
        indicatorId: 'i1',
        type: 'request_anomaly',
        location: 'body',
        description: 'Asks to not power on units without verification of recall legitimacy',
        severity: 4,
        isVisible: true,
      },
    ],
    groundTruth: {
      isMalicious: false,
      correctDecision: 'approve',
      riskScore: 35,
      explanation: 'Legitimate component recall - verify through official channels',
      consequences: {
        approved: { trustImpact: 10, fundsImpact: 50000, factionImpact: 10, threatImpact: -5 },
        denied: { trustImpact: -10, fundsImpact: -50000, factionImpact: -10, threatImpact: 10 },
        flagged: { trustImpact: 3, fundsImpact: -500, factionImpact: 0, threatImpact: 0 },
        deferred: { trustImpact: -5, fundsImpact: -2000, factionImpact: -5, threatImpact: 5 },
      },
    },
    createdAt: new Date().toISOString(),
    offlineReady: true,
    narrativeSafe: true,
  },

  // Difficulty 4 - Hard (10 emails)
];

export function getOfflineEmailsByDifficulty(difficulty: EmailDifficulty): OfflineEmail[] {
  return OFFLINE_EMAILS.filter((email) => email.difficulty === difficulty);
}

export function getOfflineEmailsByTechnique(technique: EmailTechnique): OfflineEmail[] {
  return OFFLINE_EMAILS.filter((email) => email.technique === technique);
}

export function getOfflineEmailsByFaction(faction: string): OfflineEmail[] {
  return OFFLINE_EMAILS.filter((email) => email.faction === faction);
}

export function getRandomOfflineEmails(
  count: number,
  difficulty?: EmailDifficulty,
): OfflineEmail[] {
  let pool = OFFLINE_EMAILS;
  if (difficulty !== undefined) {
    pool = getOfflineEmailsByDifficulty(difficulty);
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const OFFLINE_EMAIL_COUNT = OFFLINE_EMAILS.length;

export const DIFFICULTY_DISTRIBUTION: Record<EmailDifficulty, number> = {
  1: 10,
  2: 10,
  3: 10,
  4: 10,
  5: 10,
};

export const TECHNIQUE_DISTRIBUTION: Record<EmailTechnique, number> = {
  phishing: 8,
  spear_phishing: 7,
  bec: 7,
  credential_harvesting: 7,
  malware_delivery: 7,
  pretexting: 6,
  supply_chain: 5,
  insider_threat: 3,
};
