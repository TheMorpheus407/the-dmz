import { sql } from 'drizzle-orm';

import { SEED_TENANT_IDS } from '@the-dmz/shared/testing';

import { emailTemplates } from '../../db/schema/content/index.js';

import { getDatabaseClient } from './connection.js';

const _ATTACK_TYPES = [
  'phishing',
  'spear_phishing',
  'bec',
  'credential_harvesting',
  'malware_delivery',
  'pretexting',
] as const;

const _FACTIONS = [
  'Sovereign Compact',
  'Nexion Industries',
  'Librarians',
  'Hacktivists',
  'Criminal Networks',
] as const;

const _THREAT_LEVELS = ['LOW', 'GUARDED', 'ELEVATED', 'HIGH', 'SEVERE'] as const;

type AttackType = (typeof _ATTACK_TYPES)[number];
type Faction = (typeof _FACTIONS)[number];
type ThreatLevel = (typeof _THREAT_LEVELS)[number];

interface EmailTemplateSeed {
  name: string;
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  contentType: string;
  difficulty: number;
  faction: Faction;
  attackType: AttackType;
  threatLevel: ThreatLevel;
  season: number;
  chapter: number;
  locale: string;
  metadata: Record<string, unknown>;
}

const generateEmailTemplate = (template: EmailTemplateSeed, tenantId: string) => ({
  tenantId,
  name: template.name,
  subject: template.subject,
  body: template.body,
  fromName: template.fromName,
  fromEmail: template.fromEmail,
  replyTo: template.replyTo ?? null,
  contentType: template.contentType,
  difficulty: template.difficulty,
  faction: template.faction,
  attackType: template.attackType,
  threatLevel: template.threatLevel,
  season: template.season,
  chapter: template.chapter,
  language: 'en',
  locale: template.locale,
  metadata: template.metadata,
  isAiGenerated: false,
  isActive: true,
});

const EMAIL_TEMPLATES: EmailTemplateSeed[] = [
  // DIFFICULTY 1 (Trivial) - Obvious red flags, beginner signals
  {
    name: 'D1: Urgent Password Reset Required',
    subject: 'URGENT: Your account will be suspended in 24 hours!',
    body: `Dear Valued User,

Your account security is at risk! We have detected suspicious activity on your account.

If you do not verify your identity within 24 hours, your account will be permanently suspended.

Click here to verify now: http://security-verify.example.com/urgent

Failure to act immediately will result in permanent account deletion.

Best regards,
Security Team
support@secure-login.example.com`,
    fromName: 'Security Alert',
    fromEmail: 'security@secure-login.example.com',
    contentType: 'phishing',
    difficulty: 1,
    faction: 'Criminal Networks',
    attackType: 'phishing',
    threatLevel: 'LOW',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'urgency', description: 'Threat of immediate account suspension' },
        { type: 'suspicious_link', description: 'Non-corporate domain for verification' },
        { type: 'generic_greeting', description: 'Vague "Valued User" greeting' },
      ],
      verificationHints: [
        'Check sender domain against official communications',
        'Legitimate services rarely threaten immediate suspension',
      ],
    },
  },
  {
    name: 'D1: Lottery Winner Notification',
    subject: 'Congratulations! You have won $1,000,000!!!',
    body: `CONGRATULATIONS!!!

You have been selected as the winner of our International Email Lottery!

Your email address was randomly selected from millions of users worldwide.

PRIZE: $1,000,000.00 USD

To claim your prize, please reply with:
- Full Name
- Bank Account Number
- Social Security Number
- Copy of ID

Send to: winner-claims@example.in

Congratulations in advance!
Mr. John Smith
Lottery Coordinator`,
    fromName: 'International Lottery',
    fromEmail: 'winner@lottery-claims.example.in',
    contentType: 'phishing',
    difficulty: 1,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'LOW',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'too_good_to_be_true', description: 'Unrealistic lottery winner claim' },
        { type: 'request_for_pii', description: 'Requests SSN and bank details' },
        { type: 'suspicious_tld', description: 'Uses .in TLD, unusual for official lottery' },
      ],
      verificationHints: ['Lotteries do not notify winners via email', 'Never share SSN via email'],
    },
  },
  {
    name: 'D1: Fake Invoice Attached',
    subject: 'INVOICE #INV-2024-99582 Payment Required',
    body: `Dear Customer,

Please find attached your invoice for immediate payment.

Invoice Number: INV-2024-99582
Amount Due: $4,850.00
Due Date: IMMEDIATE

Payment Link: http://pay-invoice.example.net/pay/99582

If you believe this is an error, please contact us immediately.

Thank you for your business!

Accounts Receivable
billing@company-services.example.net`,
    fromName: 'Accounts Receivable',
    fromEmail: 'billing@company-services.example.net',
    contentType: 'phishing',
    difficulty: 1,
    faction: 'Criminal Networks',
    attackType: 'malware_delivery',
    threatLevel: 'LOW',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'unexpected_invoice', description: 'Invoice for unknown service' },
        { type: 'urgency', description: 'Payment required "immediate"' },
        { type: 'suspicious_link', description: 'Payment link to unusual domain' },
      ],
      verificationHints: [
        'Verify invoice with vendor directly',
        'Check if you actually have business relationship',
      ],
    },
  },
  {
    name: 'D1: CEO Gift Card Request',
    subject: 'Urgent: Need gift cards for client presentation',
    body: `Hi,

I need you to purchase some gift cards for a client presentation today. This is urgent and confidential.

Please buy:
- 10 x $100 Apple Gift Cards
- 10 x $100 Amazon Gift Cards

Send me the codes immediately once you have them.

Do not discuss this with anyone else - it's a surprise for the client.

Thanks,
Michael Thompson
CEO
(555) 123-4567`,
    fromName: 'Michael Thompson',
    fromEmail: 'michael.thompson@company-example.example.com',
    contentType: 'phishing',
    difficulty: 1,
    faction: 'Criminal Networks',
    attackType: 'bec',
    threatLevel: 'LOW',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'unusual_request', description: 'CEO asking employee to buy gift cards' },
        { type: 'urgency', description: 'Presents as urgent matter' },
        { type: 'confidentiality', description: 'Asks to keep request secret' },
        { type: 'domain_mismatch', description: 'CEO email domain differs from company' },
      ],
      verificationHints: [
        'Verify request via separate communication channel',
        'Gift card requests are always scams',
      ],
    },
  },
  {
    name: 'D1: Account Verification Link',
    subject: 'Verify Your Account - Action Required',
    body: `Dear User,

We have temporarily locked your account due to suspicious activity.

To unlock your account, please verify your identity by clicking the link below:

VERIFY NOW: http://account-verify.example.org/unlock

If you do not verify within 48 hours, your account will be deleted.

Customer Support Team
Secure Services Inc.`,
    fromName: 'Account Security',
    fromEmail: 'no-reply@secure-services.example.org',
    contentType: 'phishing',
    difficulty: 1,
    faction: 'Criminal Networks',
    attackType: 'credential_harvesting',
    threatLevel: 'LOW',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'generic_greeting', description: 'Vague "Dear User" greeting' },
        { type: 'suspicious_link', description: 'Link to non-official domain' },
        { type: 'threat_of_loss', description: 'Threat to delete account' },
      ],
      verificationHints: [
        'Real companies never ask to verify via email links',
        'Navigate directly to website instead of clicking',
      ],
    },
  },
  {
    name: 'D1: Suspicious Package Delivery',
    subject: 'FedEx: Package Delivery Attempt - Action Required',
    body: `Dear Customer,

We attempted to deliver your package today but no one was available to receive it.

TRACKING NUMBER: 7891-2847-6291

To reschedule delivery, please confirm your address and payment of $2.99 redelivery fee:

http://fedex-redelivery.example.com/track

If not claimed within 5 days, package will be returned to sender.

FedEx Customer Service`,
    fromName: 'FedEx Delivery',
    fromEmail: 'delivery@fedex-notice.example.com',
    contentType: 'phishing',
    difficulty: 1,
    faction: 'Criminal Networks',
    attackType: 'phishing',
    threatLevel: 'LOW',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'fake_notification', description: 'Fake delivery notification' },
        { type: 'request_for_payment', description: 'Asks for redelivery fee' },
        { type: 'suspicious_link', description: 'Link to fake FedEx site' },
      ],
      verificationHints: [
        'FedEx does not charge redelivery fees via email',
        'Track package via official website',
      ],
    },
  },
  {
    name: 'D1: IT Password Expiration Notice',
    subject: 'PASSWORD EXPIRING IN 24 HOURS',
    body: `EMPLOYEE NOTICE

Your network password will expire in 24 hours.

To avoid being locked out of your computer and email, please update your password NOW.

UPDATE PASSWORD: http://it-password-reset.example.net/update

Required: Current Password
New Password
Confirm New Password

This is mandatory for all employees.

IT Department
Help Desk: helpdesk@company-it.example.net`,
    fromName: 'IT Department',
    fromEmail: 'it-notify@company-it.example.net',
    contentType: 'phishing',
    difficulty: 1,
    faction: 'Criminal Networks',
    attackType: 'credential_harvesting',
    threatLevel: 'LOW',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'urgency', description: '24-hour password expiration threat' },
        { type: 'credential_request', description: 'Requests current password' },
        { type: 'suspicious_domain', description: 'IT domain looks suspicious' },
      ],
      verificationHints: [
        'Real IT departments never ask for current password',
        'Change passwords via official company portal only',
      ],
    },
  },
  {
    name: 'D1: Fake Tech Support Alert',
    subject: 'WARNING: Computer Infected with Virus!',
    body: `MICROSOFT WINDOWS SECURITY ALERT

Your computer has been infected with a dangerous virus!

SYSTEM ALERT: Trojan.Win32.Generic

IMMEDIATE ACTION REQUIRED

Your personal data and financial information may be at risk!

Click here to scan and remove virus:
http://windows-security-scan.example.com/fix

Call now for immediate assistance: 1-800-555-0199

Microsoft Certified Technician
Tech Support Team`,
    fromName: 'Microsoft Windows Security',
    fromEmail: 'security@microsoft-alert.example.com',
    contentType: 'phishing',
    difficulty: 1,
    faction: 'Criminal Networks',
    attackType: 'malware_delivery',
    threatLevel: 'LOW',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'fake_tech_support', description: 'Scareware claiming Microsoft alert' },
        { type: 'urgency', description: 'Claims immediate action required' },
        { type: 'suspicious_link', description: 'Link to fake scanner' },
        { type: 'domain_mismatch', description: 'Not from microsoft.com' },
      ],
      verificationHints: [
        'Microsoft never sends unsolicited security alerts',
        'Real alerts appear in Windows notifications only',
      ],
    },
  },
  {
    name: 'D1: Romance Scam Intro',
    subject: 'Hello from your friend...',
    body: `Hello Dearest,

I hope this message finds you well! My name is Sarah, I am a 28-year-old woman from Ghana.

I found your profile on a dating site and I feel we could be soulmates! You seem like such a wonderful person.

I would love to get to know you better. I am very honest and sincere woman looking for true love.

I will share my photos and more details if you reply to me.

I am currently working as a volunteer in a small village and the internet is very slow here.

Please write back to me at: sarahlove@example.in

With warm hugs and kisses,
Sarah`,
    fromName: 'Sarah Johnson',
    fromEmail: 'sarahlove@example.in',
    contentType: 'phishing',
    difficulty: 1,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'LOW',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'too_good_to_be_true', description: 'Romance interest from stranger' },
        { type: 'suspicious_tld', description: 'Uses .in TLD' },
        { type: ' sob_story', description: 'Financial hardship narrative' },
        { type: 'request_to_move', description: 'Asks to continue outside platform' },
      ],
      verificationHints: [
        'Never send money to online romantic interests',
        'Romance scammers use emotional manipulation',
      ],
    },
  },
  {
    name: 'D1: Fake Subscription Renewal',
    subject: 'Your Amazon Prime membership has expired',
    body: `Dear Customer,

Your Amazon Prime membership has expired.

To continue enjoying unlimited shipping and exclusive deals, please renew now.

Amount: $139.00/year

Renew now: http://amazon-prime-renew.example.com/join

If you did not request this, please contact us immediately.

Amazon Customer Service
This is an automated message. Please do not reply.`,
    fromName: 'Amazon Prime',
    fromEmail: 'no-reply@amazon-prime-renew.example.com',
    contentType: 'phishing',
    difficulty: 1,
    faction: 'Criminal Networks',
    attackType: 'phishing',
    threatLevel: 'LOW',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'fake_notification', description: 'Fake subscription expiration' },
        { type: 'suspicious_link', description: 'Link to fake Amazon site' },
        { type: 'domain_mismatch', description: 'Not from amazon.com' },
      ],
      verificationHints: [
        'Check subscription status via official Amazon website',
        'Amazon never asks to renew via email links',
      ],
    },
  },

  // DIFFICULTY 2 (Easy) - Clear indicators with minor obfuscation
  {
    name: 'D2: Spear Phishing - Vendor Invoice',
    subject: 'Invoice #45892 for supplies - Payment due in 3 days',
    body: `Hi there,

Please find attached invoice #45892 for the supplies delivered last week.

Amount: $3,245.00
Due Date: Within 3 business days

You can view the full invoice and make payment here:
https://invoices.acme-supplies.example.net/pay/45892

Let me know if you have any questions about the line items.

Thanks,
Jennifer Walsh
Accounts Payable
Acme Industrial Supplies
Phone: (555) 847-2931
Email: j.walsh@acme-supplies.example.net`,
    fromName: 'Jennifer Walsh',
    fromEmail: 'j.walsh@acme-supplies.example.net',
    contentType: 'phishing',
    difficulty: 2,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'GUARDED',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'suspicious_domain', description: 'Similar but not exact vendor domain' },
        { type: 'urgency', description: 'Payment due soon' },
        { type: 'request_for_payment', description: 'Payment link to external site' },
      ],
      verificationHints: [
        'Verify vendor via known contact information',
        'Cross-reference invoice number with internal records',
      ],
    },
  },
  {
    name: 'D2: BEC - Wire Transfer Request',
    subject: 'Q2 Wire Transfer Approval Needed',
    body: `Hi,

I need you to process a wire transfer for the Q2 vendor payment. This is time-sensitive as we need to finalize today.

Amount: $87,500.00
Account: First National Bank
Account #: 8847291056
Routing #: 021000021
Reference: Project Alpha - Final Installment

Please process immediately and send confirmation to my email.

Thanks,
Robert Chen
VP of Operations
r.chen@company-corp.example.com
(555) 392-1847`,
    fromName: 'Robert Chen',
    fromEmail: 'r.chen@company-corp.example.com',
    contentType: 'phishing',
    difficulty: 2,
    faction: 'Criminal Networks',
    attackType: 'bec',
    threatLevel: 'GUARDED',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'unusual_request', description: 'Unusual wire transfer request' },
        { type: 'urgency', description: 'Time-sensitive request' },
        { type: 'request_for_secrecy', description: 'Asks to send confirmation to email' },
        { type: 'domain_mismatch', description: 'Slight domain variation' },
      ],
      verificationHints: [
        'Verify with supervisor via different channel',
        'Verify bank details independently',
      ],
    },
  },
  {
    name: 'D2: Malware - Meeting Notes Attached',
    subject: 'Meeting Notes: Q3 Planning - CONFIDENTIAL',
    body: `Team,

Please find attached the confidential meeting notes from our Q3 planning session yesterday.

I've highlighted the key action items in yellow. Please review and prepare your inputs before Friday's follow-up meeting.

Thanks,
Amanda Liu
Project Manager
a.liu@global-consulting.example.org`,
    fromName: 'Amanda Liu',
    fromEmail: 'a.liu@global-consulting.example.org',
    replyTo: 'amanda.liu.private@example.net',
    contentType: 'phishing',
    difficulty: 2,
    faction: 'Hacktivists',
    attackType: 'malware_delivery',
    threatLevel: 'GUARDED',
    season: 1,
    chapter: 1,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'suspicious_attachment', description: 'Unexpected confidential document' },
        { type: 'reply_to_mismatch', description: 'Reply-to different from sender' },
        { type: 'urgency', description: 'Requires action before meeting' },
      ],
      verificationHints: [
        'Verify with sender via known channel',
        'Check file extension before opening',
      ],
    },
  },
  {
    name: 'D2: Credential Harvesting - HR Portal',
    subject: 'Action Required: Update Your Benefits Information',
    body: `Dear Employee,

As part of our annual benefits review, all employees must update their information in the HR portal.

Please log in to update your:
- Emergency contact information
- Dependent details
- Tax withholding forms

Portal Link: https://hr-portal.company-humanresources.example.net/login

Deadline: This Friday

If you have questions, contact HR at hr-support@company-hr.example.net

Human Resources Department`,
    fromName: 'Human Resources',
    fromEmail: 'hr-notifications@company-humanresources.example.net',
    contentType: 'phishing',
    difficulty: 2,
    faction: 'Criminal Networks',
    attackType: 'credential_harvesting',
    threatLevel: 'GUARDED',
    season: 1,
    chapter: 2,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'domain_mismatch', description: 'HR portal domain is suspicious' },
        { type: 'urgency', description: 'Deadline approaching' },
        { type: 'suspicious_link', description: 'Link to fake HR portal' },
      ],
      verificationHints: [
        'Access HR portal via company intranet',
        'Check actual HR portal URL from company directory',
      ],
    },
  },
  {
    name: 'D2: Pretexting - IT Audit Request',
    subject: 'Annual IT Security Audit - Equipment Verification',
    body: `Dear Staff,

The IT Security team is conducting our annual equipment audit to ensure all company devices are properly registered.

Please complete the verification form for your assigned equipment:
https://it-audit.company-systems.example.net/verify

You will need to provide:
- Employee ID
- Device serial number
- Current location

This is mandatory per IT Security Policy section 4.2.

Complete by end of week.

IT Security Team
security-audit@company-it.example.net`,
    fromName: 'IT Security',
    fromEmail: 'security-audit@company-it.example.net',
    contentType: 'phishing',
    difficulty: 2,
    faction: 'Nexion Industries',
    attackType: 'pretexting',
    threatLevel: 'GUARDED',
    season: 1,
    chapter: 2,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'request_for_credentials', description: 'Requests employee ID and device info' },
        { type: 'official_appearance', description: 'Appears to be official audit' },
        { type: 'suspicious_link', description: 'Audit portal link' },
      ],
      verificationHints: [
        'Verify with IT directly',
        'Check if audit was announced through official channels',
      ],
    },
  },
  {
    name: 'D2: Phishing - Document Share',
    subject: 'Shared Document: Q1_Report_Final_v3.xlsx',
    body: `David shared "Q1_Report_Final_v3.xlsx" with you

Click to view: https://docs-company.share-docs.example.net/doc/q1-report-2024

This document was shared with:
- david.williams@company-example.example.com

View Document
--`,
    fromName: 'Document Sharing',
    fromEmail: 'docs@share-docs.example.net',
    contentType: 'phishing',
    difficulty: 2,
    faction: 'Criminal Networks',
    attackType: 'phishing',
    threatLevel: 'GUARDED',
    season: 1,
    chapter: 2,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'suspicious_link', description: 'Fake document sharing link' },
        { type: 'unexpected_share', description: 'Unexpected document share' },
        { type: 'domain_mismatch', description: 'Not from real document service' },
      ],
      verificationHints: [
        'Verify sender actually shared document',
        'Access documents via official platform',
      ],
    },
  },
  {
    name: 'D2: Spear Phishing - New Vendor Introduction',
    subject: 'Introduction: CloudSecure Solutions',
    body: `Hi,

My name is Michael Torres and I'm the Business Development Manager at CloudSecure Solutions.

We specialize in enterprise cloud security solutions and I'd love to schedule a brief call to discuss how we might help protect your organization's data.

I noticed your company is currently using [Competitor] and I'd be happy to provide a competitive analysis.

Would you be available for a 15-minute call next week? I'm flexible on timing.

Best regards,
Michael Torres
Business Development
CloudSecure Solutions
m.torres@cloudsecure-solutions.example.com
(555) 918-2734
www.cloudsecure-solutions.example.com`,
    fromName: 'Michael Torres',
    fromEmail: 'm.torres@cloudsecure-solutions.example.com',
    contentType: 'phishing',
    difficulty: 2,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'GUARDED',
    season: 1,
    chapter: 2,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'unsolicited_contact', description: 'Unsolicited business proposal' },
        { type: 'competitor_research', description: 'Shows knowledge of your vendor' },
        { type: 'call_to_action', description: 'Request for meeting/call' },
      ],
      verificationHints: [
        'Verify company exists and is legitimate',
        'Research via independent sources',
      ],
    },
  },
  {
    name: 'D2: Malware - Software Update',
    subject: 'Critical Security Update Available',
    body: `Dear User,

A critical security update is available for your workstation.

Update: KB4928471
Severity: Critical
Description: Security update for Windows operating system

Please install this update immediately to protect your system from vulnerabilities.

Download Update:
http://software-update.company-patches.example.net/kb4928471

Restart may be required after installation.

IT Support Team
support@company-it.example.net`,
    fromName: 'IT Support',
    fromEmail: 'support@company-it.example.net',
    contentType: 'phishing',
    difficulty: 2,
    faction: 'Criminal Networks',
    attackType: 'malware_delivery',
    threatLevel: 'GUARDED',
    season: 1,
    chapter: 2,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'suspicious_link', description: 'Update from unofficial source' },
        { type: 'urgency', description: 'Claims critical severity' },
        { type: 'fake_update', description: 'Fake Windows update' },
      ],
      verificationHints: [
        'Updates come via Windows Update automatically',
        'Verify with IT before installing',
      ],
    },
  },
  {
    name: 'D2: BEC - Change of Banking Details',
    subject: 'Updated Banking Information',
    body: `Hi,

This is to inform you that we have updated our banking details effective immediately.

Please note the following new banking information for all future payments:

Bank: First Western Bank
Account Name: TechSupply Co.
Account Number: 8847291056
Routing Number: 021000021
SWIFT: FWBTUS33

All invoices from now on should be paid to this new account. Please update your records.

If you have any questions, please contact me directly.

Regards,
Patricia Morrison
Finance Director
p.morrison@techsupply-company.example.com
(555) 283-9471`,
    fromName: 'Patricia Morrison',
    fromEmail: 'p.morrison@techsupply-company.example.com',
    contentType: 'phishing',
    difficulty: 2,
    faction: 'Criminal Networks',
    attackType: 'bec',
    threatLevel: 'GUARDED',
    season: 1,
    chapter: 2,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'banking_change', description: 'Change in payment details' },
        { type: 'request_for_update', description: 'Asks to update records' },
        { type: 'urgency', description: 'Immediate effective date' },
      ],
      verificationHints: [
        'Verify banking change via phone call to known number',
        'Check with finance department directly',
      ],
    },
  },
  {
    name: 'D2: Pretexting - Survey Request',
    subject: 'Employee Satisfaction Survey - Your Feedback Matters',
    body: `Dear Team Member,

As part of our commitment to improving workplace culture, we are conducting an anonymous employee satisfaction survey.

Your input is valuable and will directly influence company policy decisions.

Complete the survey here:
https://survey.company-insights.example.net/employee-satisfaction-2024

The survey takes approximately 10 minutes and all responses are completely anonymous.

Deadline: One week from today

Thank you for your participation!

Human Resources
hr@company-hr.example.net`,
    fromName: 'Human Resources',
    fromEmail: 'hr@company-hr.example.net',
    contentType: 'phishing',
    difficulty: 2,
    faction: 'Nexion Industries',
    attackType: 'pretexting',
    threatLevel: 'GUARDED',
    season: 1,
    chapter: 2,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'suspicious_link', description: 'Survey link to external site' },
        { type: 'request_for_info', description: 'Collects employee feedback' },
        { type: 'domain_mismatch', description: 'HR domain slightly off' },
      ],
      verificationHints: ['Surveys should be on company domain', 'Verify with HR about survey'],
    },
  },

  // DIFFICULTY 3 (Moderate) - Balanced signals, some convincing elements
  {
    name: 'D3: Sophisticated Spear Phishing - Board Meeting',
    subject: 'Board Meeting Materials - March 2024',
    body: `Dear Board Members,

Please find attached the materials for the upcoming board meeting scheduled for March 15th.

Agenda items include:
1. Q4 Financial Review
2. Strategic Initiative Updates
3. Executive Compensation Review
4. Shareholder Voting Items

The confidential presentation is available at:
https://board-portal.company-governance.example.net/march-2024

Password: Use your corporate credentials to access

Please review before the meeting and contact me with any questions.

Best regards,
Elizabeth Hartwell
Corporate Secretary
Board Services
e.hartwell@company-governance.example.net`,
    fromName: 'Elizabeth Hartwell',
    fromEmail: 'e.hartwell@company-governance.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 2,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'targeted_attack', description: 'Targets high-level executives' },
        { type: 'confidential_appeal', description: 'Uses confidential documents' },
        { type: 'suspicious_link', description: 'Fake board portal' },
      ],
      verificationHints: [
        'Verify with Corporate Secretary directly',
        'Access board portal via known URL',
      ],
    },
  },
  {
    name: 'D3: Malware - PDF with Embedded Link',
    subject: 'Re: Contract Review - Project Phoenix',
    body: `Hi,

I've reviewed the contract draft for Project Phoenix and made some comments. Please see the attached PDF.

I've highlighted the key clauses that need revision:
- Section 4.2: Payment terms
- Section 7.1: Liability limitations
- Section 12.3: Termination conditions

Let me know if you want to discuss before we finalize.

Thanks,
Christopher
Senior Counsel
c.bennett@lawfirm-partners.example.com
(555) 392-8471`,
    fromName: 'Christopher Bennett',
    fromEmail: 'c.bennett@lawfirm-partners.example.com',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Hacktivists',
    attackType: 'malware_delivery',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 2,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'suspicious_attachment', description: 'PDF with suspicious content' },
        { type: 'business_context', description: 'Legitimate business context' },
        { type: 'targeted', description: 'References specific project' },
      ],
      verificationHints: [
        'Verify with sender via known contact',
        'Check PDF properties before opening',
      ],
    },
  },
  {
    name: 'D3: Credential Harvesting - Cloud Portal',
    subject: 'Action Required: Verify Your Microsoft 365 Account',
    body: `Dear User,

Microsoft has detected unusual sign-in activity on your Microsoft 365 account.

Sign-in Details:
Location: Lagos, Nigeria
Device: Windows PC
IP Address: 102.89.23.45

If this was not you, please verify your identity immediately to prevent account suspension.

Verify Account:
https://microsoft-verify.login-accounts.example.net/verify/84729

If not verified within 24 hours, your account will be temporarily locked.

Microsoft Account Team
This is an automated message from Microsoft Account Security.`,
    fromName: 'Microsoft Account Security',
    fromEmail: 'no-reply@microsoft-verify.login-accounts.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Criminal Networks',
    attackType: 'credential_harvesting',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 3,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'domain_mismatch', description: 'Fake Microsoft domain' },
        { type: 'urgency', description: '24-hour deadline' },
        { type: 'suspicious_location', description: 'Shows suspicious login location' },
      ],
      verificationHints: [
        'Real Microsoft never asks to verify via email',
        'Check actual Microsoft 365 security alerts',
      ],
    },
  },
  {
    name: 'D3: BEC - Executive Assistant Request',
    subject: 'Urgent: Mr. Henderson needs gift cards for investor meeting',
    body: `Hi,

Mr. Henderson asked me to reach out to you. He's in an important investor meeting right now and needs something taken care of urgently.

He needs $2,000 in gift cards (Apple or Google) to give as appreciation gifts to some key investors after today's meeting.

Can you purchase these and send me the codes? He needs them within the hour.

Please don't call him - he's in meetings all day. Just reply to me and I'll let him know it's handled.

Thanks so much!
Sarah Mitchell
Executive Assistant to CEO
s.mitchell@company-executive.example.com`,
    fromName: 'Sarah Mitchell',
    fromEmail: 's.mitchell@company-executive.example.com',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Criminal Networks',
    attackType: 'bec',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 3,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'executive_impersonation', description: 'CEO/Executive assistant impersonation' },
        { type: 'urgency', description: 'Within the hour request' },
        { type: 'gift_card_scam', description: 'Classic gift card scam' },
        { type: 'request_for_secrecy', description: 'Asks not to call' },
      ],
      verificationHints: [
        'Call executive directly to verify',
        'Gift card requests are always suspicious',
      ],
    },
  },
  {
    name: 'D3: Pretexting - Compliance Training',
    subject: 'Mandatory Compliance Training - Due This Week',
    body: `Dear Employee,

This is a reminder that you have not completed the mandatory annual compliance training.

Course: Anti-Harassment and Workplace Ethics
Status: Not Started
Due Date: This Friday

To maintain compliance with company policy and legal requirements, you must complete this training by the deadline.

Access Training:
https://learning.company-training.example.net/compliance-2024

Login with your corporate credentials. The course takes approximately 45 minutes.

If you have questions, contact your manager or HR.

Compliance Team
compliance@company-compliance.example.net`,
    fromName: 'Compliance Training',
    fromEmail: 'compliance@company-compliance.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Nexion Industries',
    attackType: 'pretexting',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 3,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'mandatory_training', description: 'Claims mandatory training' },
        { type: 'suspicious_link', description: 'Training on external site' },
        { type: 'urgency', description: 'Deadline this week' },
      ],
      verificationHints: [
        'Verify training requirement with HR',
        'Training should be on company LMS',
      ],
    },
  },
  {
    name: 'D3: Spear Phishing - M&A Due Diligence',
    subject: 'Confidential: Data Room Access for Acme Corp Acquisition',
    body: `Mr. Williams,

Following our discussion last week, I've set up your access to the confidential data room for the Acme Corp acquisition.

Data Room: https://vdr-secure.mna-advisors.example.net/acme-2024
Username: j.williams
Temporary Password: Will be sent separately

Please review the following documents:
- Financial statements (FY2021-2023)
- Legal due diligence reports
- Intellectual property inventory
- Employee data summary

This access is strictly confidential. Do not share with unauthorized parties.

Let me know if you have any questions.

Regards,
Victoria Chen
M&A Analyst
v.chen@mna-advisors.example.com
(555) 847-2938`,
    fromName: 'Victoria Chen',
    fromEmail: 'v.chen@mna-advisors.example.com',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Librarians',
    attackType: 'spear_phishing',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 3,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'targeted_attack', description: 'Targets someone involved in M&A' },
        { type: 'confidential_appeal', description: 'Uses confidential deal information' },
        { type: 'suspicious_link', description: 'Fake data room link' },
      ],
      verificationHints: [
        'Verify with known M&A advisor',
        'Access data rooms via known secure platforms',
      ],
    },
  },
  {
    name: 'D3: Phishing - Cloud Storage Share',
    subject: 'Sarah shared "Budget_Analysis_2024.xlsx" with you',
    body: `Sarah Williams shared a file with you

Budget_Analysis_2024.xlsx
Shared on: March 7, 2024

View file:
https://drive.company-files.example.net/file/budget-analysis-2024

--
You received this email because someone shared a file with you from Company Files.`,
    fromName: 'Company Files',
    fromEmail: 'noreply@company-files.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Criminal Networks',
    attackType: 'phishing',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 3,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'fake_file_share', description: 'Fake cloud storage notification' },
        { type: 'suspicious_link', description: 'Link to fake file service' },
        { type: 'looks_like_real', description: 'Mimics legitimate file sharing' },
      ],
      verificationHints: ['Verify sender actually shared file', 'Access cloud storage directly'],
    },
  },
  {
    name: 'D3: Malware - Software License Alert',
    subject: 'Adobe: Your license key for Adobe Creative Cloud',
    body: `Dear Customer,

Thank you for your Adobe Creative Cloud subscription.

Your license information:
Plan: Creative Cloud All Apps
License Key: WDTH-8472-CNJS-9283-KD92
Expires: March 31, 2024

Download your license certificate:
https://adobe-license.company-software.example.net/license/cc-2024

If you did not make this purchase, contact us immediately.

Adobe Customer Support
support@adobe-license.example.net`,
    fromName: 'Adobe Support',
    fromEmail: 'support@adobe-license.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Criminal Networks',
    attackType: 'malware_delivery',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 3,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'fake_software_license', description: 'Fake software license' },
        { type: 'suspicious_link', description: 'License download to suspicious site' },
        { type: 'domain_mismatch', description: 'Not from adobe.com' },
      ],
      verificationHints: [
        'Adobe licenses managed via adobe.com',
        'Check subscription status via official website',
      ],
    },
  },
  {
    name: 'D3: Pretexting - Government Audit',
    subject: 'IRS: Documentation Required for Audit',
    body: `Dear Business Owner,

This is regarding the upcoming IRS audit of your business tax returns for fiscal year 2022.

Please provide the following documents within 30 days:

1. General ledger and trial balance
2. Bank statements for all accounts
3. Receipts for deductions over $500
4. Payroll records
5. Asset depreciation schedules

Upload documents securely:
https://irs-portal.tax-audit.example.net/audit/2024-Ref-84729

Failure to comply may result in penalties.

Sincerely,
Tax Audit Division
Internal Revenue Service`,
    fromName: 'IRS Tax Audit',
    fromEmail: 'audit@irs-portal.tax-audit.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 3,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'government_impersonation', description: 'Fake IRS communication' },
        { type: 'suspicious_link', description: 'Fake IRS portal' },
        { type: 'urgency', description: '30-day deadline' },
      ],
      verificationHints: [
        'IRS contacts via official mail',
        'Never uses email to request sensitive documents',
      ],
    },
  },
  {
    name: 'D3: Credential Harvesting - VPN Alert',
    subject: 'Cisco VPN: Re-authentication Required',
    body: `Cisco VPN Security Alert

Your VPN session has been automatically disconnected due to a security policy update.

To continue working remotely, please re-authenticate:

Re-authenticate:
https://vpn.company-remote.example.net/auth/84729

If you do not re-authenticate within 1 hour, you will need to contact IT Help Desk.

This is required for all remote employees.

IT Infrastructure Team
it-vpn@company-it.example.net`,
    fromName: 'Cisco VPN Security',
    fromEmail: 'it-vpn@company-it.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Nexion Industries',
    attackType: 'credential_harvesting',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 3,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'fake_vpn_alert', description: 'Fake VPN re-authentication' },
        { type: 'suspicious_link', description: 'Link to fake VPN portal' },
        { type: 'urgency', description: '1-hour deadline' },
      ],
      verificationHints: [
        'VPN re-authentication happens in client',
        'Verify with IT before clicking',
      ],
    },
  },

  // DIFFICULTY 4 (Hard) - Subtle indicators, sophisticated social engineering
  {
    name: 'D4: Advanced Spear Phishing - Legal Counsel',
    subject: 'Re: Settlement Agreement - Confidential',
    body: `Counsel,

Following up on our call yesterday. As discussed, I've prepared the revised settlement agreement reflecting the terms we agreed upon.

Key changes from previous draft:
- Payment terms adjusted to quarterly installments
- Non-disparagement clause added
- Confidentiality period extended to 5 years

The fully executed version is available in the secure portal:
https://legal-docs.secure-counsel.example.net/settlements/2024

Use your existing credentials. I've pre-registered your email.

Please review and confirm by EOD Friday so we can proceed with the signing.

Best,
Marcus Webb
Partner
Webb & Associates LLP
m.webb@webb-associates.example.com
Direct: (555) 847-2918`,
    fromName: 'Marcus Webb',
    fromEmail: 'm.webb@webb-associates.example.com',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Librarians',
    attackType: 'spear_phishing',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 3,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'targeted_attack', description: 'Targets legal professionals' },
        { type: 'plausible_context', description: 'References actual conversation' },
        { type: 'suspicious_link', description: 'Fake legal document portal' },
      ],
      verificationHints: [
        'Verify with counsel directly',
        'Access legal documents via known secure platform',
      ],
    },
  },
  {
    name: 'D4: Sophisticated BEC - Law Firm Wire',
    subject: 'Re: Closing Funds - Smith Residence',
    body: `Dear Paralegal,

Per our conversation with the clients yesterday, the closing for the Smith residence is scheduled for next Tuesday.

Please wire the funds as discussed:

$487,500.00
First American Title
Account #: 8847102938
Routing #: 021000021
Reference: Smith Residence - Closing #29471

Please confirm once the wire has been sent. The clients will need the confirmation for their records.

Thank you,
James Morrison
Senior Partner
Morrison & Partners
j.morrison@morrison-law.example.com
(555) 382-9471`,
    fromName: 'James Morrison',
    fromEmail: 'j.morrison@morrison-law.example.com',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Criminal Networks',
    attackType: 'bec',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'business_context', description: 'Realistic legal transaction' },
        { type: 'financial_request', description: 'Wire transfer request' },
        { type: 'appears_legitimate', description: 'Uses firm name and details' },
      ],
      verificationHints: [
        'Verify with partner via known phone number',
        'Confirm wire details with title company directly',
      ],
    },
  },
  {
    name: 'D4: Malware - Zero-Day Exploit Alert',
    subject: 'CRITICAL: Microsoft 365 Zero-Day Vulnerability',
    body: `Security Advisory - Immediate Action Required

Microsoft has disclosed a critical zero-day vulnerability affecting Microsoft 365 Exchange Online.

CVE-2024-21401
Severity: Critical
CVSS Score: 9.8

All customers running Microsoft 365 are affected. Microsoft recommends immediate patching.

Technical Details:
The vulnerability allows remote code execution through specially crafted emails.

Microsoft Security Response Center
Reference: MSRC-2024-AZ9

To apply the emergency patch:
https://security-patch.microsoft-defend.example.net/patch/cve-2024-21401`,
    fromName: 'Microsoft Security Response',
    fromEmail: 'security@microsoft-defend.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Hacktivists',
    attackType: 'malware_delivery',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'fake_security_advisory', description: 'Convincing security advisory' },
        { type: 'realistic_cve', description: 'References realistic CVE' },
        { type: 'domain_mismatch', description: 'Not from microsoft.com' },
      ],
      verificationHints: [
        'Check actual Microsoft security advisories',
        'Patches come via official channels only',
      ],
    },
  },
  {
    name: 'D4: Credential Harvesting - MFA Fatigue',
    subject: 'Unusual Sign-In: Multiple Authentication Requests',
    body: `We noticed multiple sign-in attempts to your account from a new device.

Location: São Paulo, Brazil
Device: Chrome on Windows
IP: 177.54.32.11

If this was you, you can ignore this message.

However, if you did not attempt to sign in, we recommend enabling additional security measures:

Secure Your Account:
https://account-protection.microsoft-security.example.net/auth/review

We detected 47 failed authentication attempts in the past hour.

Microsoft Account Team`,
    fromName: 'Microsoft Account',
    fromEmail: 'no-reply@account-protection.microsoft-security.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Criminal Networks',
    attackType: 'credential_harvesting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'mfa_fatigue', description: 'MFA bombing technique' },
        { type: 'convincing_appearance', description: 'Convincing Microsoft appearance' },
        { type: 'domain_mismatch', description: 'Slightly off domain' },
      ],
      verificationHints: [
        'Deny unexpected MFA requests',
        'Real security alerts from real Microsoft domain',
      ],
    },
  },
  {
    name: 'D4: Pretexting - Intelligence Briefing',
    subject: 'Weekly Intelligence Briefing - Classified',
    body: `Agent,

Your weekly intelligence briefing is ready.

This week's topics:
- Threat actor activity in financial sector
- New indicators of compromise (IOCs)
- Vulnerability assessment of critical infrastructure

Access the secure briefing:
https://intel.agency-classified.example.net/briefing/week-12-2024

Your clearance has been verified. Session will expire in 24 hours.

Questions should be directed to your handler through secure channels.

Regards,
Intelligence Coordination`,
    fromName: 'Intelligence Coordination',
    fromEmail: 'briefing@agency-classified.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Librarians',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'government_impersonation', description: 'Fake intelligence agency' },
        { type: 'classification_appeal', description: 'Uses classified briefing' },
        { type: 'suspicious_link', description: 'Fake secure portal' },
      ],
      verificationHints: [
        'Real intelligence briefings via secure government networks',
        'No legitimate email uses .net for classified',
      ],
    },
  },
  {
    name: 'D4: Spear Phishing - HR Benefits Open Enrollment',
    subject: 'Benefits Open Enrollment - Final Reminder',
    body: `Hi,

This is your final reminder that benefits open enrollment closes this Friday.

Current Selections:
- Health: PPO Plan
- Dental: Standard
- 401k: 6% contribution

Review and update your selections:
https://benefits.company-hr.example.net/enrollment/2024

New this year:
- Added mental health coverage
- Increased HSA contribution limits
- Telemedicine option

If you don't make changes, your current elections will continue.

Contact HR with questions:
hr@company-hr.example.net

Human Resources`,
    fromName: 'Human Resources',
    fromEmail: 'hr@company-hr.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'targeted', description: 'References your actual benefits' },
        { type: 'suspicious_link', description: 'Benefits portal slightly off' },
        { type: 'urgency', description: 'Final reminder' },
      ],
      verificationHints: ['Access benefits via known HR portal', 'Verify with HR directly'],
    },
  },
  {
    name: 'D4: Advanced Malware - Supply Chain',
    subject: 'Shipment Update - Container #MAEU8472938',
    body: `Dear Customer,

Your shipment has been processed and is in transit.

Shipment Details:
Container: MAEU8472938
Origin: Shanghai, China
Destination: Los Angeles Port
ETA: March 25, 2024

Track your shipment:
https://logistics.shipping-global.example.net/track/MAEU8472938

Documents attached:
- Bill of Lading
- Commercial Invoice
- Packing List

Questions? Contact your account manager.

Best regards,
Global Freight Solutions
operations@shipping-global.example.net`,
    fromName: 'Global Freight Solutions',
    fromEmail: 'operations@shipping-global.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Hacktivists',
    attackType: 'malware_delivery',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'business_context', description: 'Legitimate logistics context' },
        { type: 'suspicious_attachment', description: 'Documents may contain malware' },
        { type: 'suspicious_link', description: 'Fake shipping tracker' },
      ],
      verificationHints: ['Verify shipment with known carrier', 'Check attachments before opening'],
    },
  },
  {
    name: 'D4: Sophisticated Phishing - Executive Travel',
    subject: 'Trip Details - Executive Travel Services',
    body: `Mr. Williams,

Your upcoming travel arrangements for the London executive meeting have been confirmed.

Flight: AA178
Date: March 22, 2024
Departure: JFK 7:30 PM
Arrival: LHR 7:15 AM (+1)

Hotel: The Savoy
Check-in: March 22
Check-out: March 24

Car Service: Available on request

View complete itinerary:
https://travel.executive-services.example.net/trips/AA178-2024

Meeting location: 25 Old Bond Street

Please confirm your attendance by return email.

Best,
Sarah Chen
Executive Travel Coordinator
s.chen@executive-travel.example.com
(555) 847-2938`,
    fromName: 'Sarah Chen',
    fromEmail: 's.chen@executive-travel.example.com',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'targeted', description: 'Executive travel details' },
        { type: 'plausible_context', description: 'Appears to be travel coordinator' },
        { type: 'suspicious_link', description: 'Fake travel portal' },
      ],
      verificationHints: [
        'Verify with executive assistant',
        'Travel should be booked through approved vendors',
      ],
    },
  },
  {
    name: 'D4: Credential Harvesting - Cloud Admin',
    subject: 'Azure AD: Privileged Access Review Required',
    body: `Azure AD Admin,

You have been assigned privileged access in Azure Active Directory.

As part of our quarterly access review, you must verify your assigned roles:

Your Roles:
- Global Administrator
- Exchange Administrator
- SharePoint Administrator

Review Access:
https://portal.azure-admin.example.net/privileged-access/review

If you no longer require these roles, submit a request to revoke access.

Deadline: 7 days

Azure Active Directory Team
security@aad-admin.example.net`,
    fromName: 'Azure AD Security',
    fromEmail: 'security@aad-admin.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Criminal Networks',
    attackType: 'credential_harvesting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'admin_target', description: 'Targets IT administrators' },
        { type: 'convincing_azure', description: 'Convincing Azure AD appearance' },
        { type: 'domain_mismatch', description: 'Fake Azure domain' },
      ],
      verificationHints: [
        'Access Azure AD via official portal',
        'Privileged access reviews in actual Azure portal',
      ],
    },
  },
  {
    name: 'D4: Pretexting - Investor Relations',
    subject: 'Q1 Investor Call - Confidential Discussion Materials',
    body: `Dear Shareholder,

The Q1 2024 investor call is scheduled for April 15th at 2:00 PM EST.

Confidential materials for the call are available in the investor portal:

https://investors.company-financial.example.net/q1-2024

Topics for discussion:
- Financial performance review
- Strategic initiative updates
- Market outlook
- Q&A session

Access requires your investor credentials. Registration closes 48 hours before the call.

To receive the call-in details, confirm your attendance.

Investor Relations
ir@company-investor.example.net`,
    fromName: 'Investor Relations',
    fromEmail: 'ir@company-investor.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Librarians',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'corporate_target', description: 'Targets investors/shareholders' },
        { type: 'confidential_appeal', description: 'Uses confidential materials' },
        { type: 'suspicious_link', description: 'Fake investor portal' },
      ],
      verificationHints: [
        'Access investor relations via official website',
        'Verify with company IR directly',
      ],
    },
  },

  // DIFFICULTY 5 (Expert) - Near-perfect impersonation, minimal signals
  {
    name: 'D5: Nation-State Spear Phishing - Diplomatic',
    subject: 'Diplomatic Communication - Confidential',
    body: `Excellency,

Following the successful conclusion of the trade negotiations, please find attached the finalized agreement documents for your review and signature.

The delegation has requested that preliminary discussions remain confidential until the official announcement.

Attached:
- Trade Framework Agreement (Final)
- Supplementary Protocols
- Implementation Timeline

Secure Document Access:
https://documents.diplomatic-portal.example.net/treaties/2024/trade-framework

Your credentials have been pre-authorized. Access will expire in 72 hours.

Please confirm receipt.

With regards,
Ambassador's Office
Foreign Affairs`,
    fromName: 'Foreign Affairs',
    fromEmail: 'office@diplomatic-portal.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Sovereign Compact',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'nation_state', description: 'Nation-state level attack' },
        { type: 'diplomatic_impersonation', description: 'Targets diplomatic communications' },
        { type: 'minimal_signals', description: 'Very subtle indicators' },
      ],
      verificationHints: [
        'Diplomatic communications via secure diplomatic channels',
        'Verify with embassy directly',
      ],
    },
  },
  {
    name: 'D5: Advanced BEC - CEO to CFO Large Wire',
    subject: 'Urgent: Acquisition Payment - Confidential',
    body: `Patricia,

I've just gotten off the call with the board. We've agreed to acquire TechVenture Inc. and need to process the initial payment today to secure the deal before their deadline.

Amount: $2,450,000.00
Account: TechVenture Holdings LLC
Bank: Citibank NA
Account #: 884729105638
Routing #: 021000489
SWIFT: CITIUS33

This is extremely time-sensitive. The board has approved this and we're treating it as top priority. I've spoken directly with their CEO.

Please process immediately and confirm once done. I'm in back-to-back meetings but can be reached on my mobile if urgent.

Thanks,
Richard
Richard Morrison
CEO
rmorrison@company-corp.example.com
(555) 847-2900`,
    fromName: 'Richard Morrison',
    fromEmail: 'rmorrison@company-corp.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'bec',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'executive_target', description: 'Targets CEO-CFO communication' },
        { type: 'large_value', description: 'High-value wire transfer' },
        { type: 'confidential_deal', description: 'Uses acquisition secrecy' },
        { type: 'minimal_signals', description: 'Nearly perfect impersonation' },
      ],
      verificationHints: [
        'Verify with CEO via known phone number',
        'Large transfers require multiple approvals',
      ],
    },
  },
  {
    name: 'D5: Zero-Day Malware - Software Vendor',
    subject: 'Critical Update - Enterprise Software Suite',
    body: `Dear IT Administrator,

A critical security update has been released for Enterprise Software Suite.

Version 12.5.3
Release Date: March 7, 2024

This update addresses:
- CVE-2024-9281: Remote code execution in authentication module
- CVE-2024-9282: Privilege escalation in user management
- CVE-2024-9283: Information disclosure in reporting

All customers running version 12.x should update immediately.

Download Update:
https://updates.enterprise-software.example.net/patch/12.5.3

Installation requires system administrator credentials.

Support Team
enterprise-support@enterprise-software.example.net`,
    fromName: 'Enterprise Software Support',
    fromEmail: 'enterprise-support@enterprise-software.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Hacktivists',
    attackType: 'malware_delivery',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'vendor_impersonation', description: 'Appears to be software vendor' },
        { type: 'realistic_cve', description: 'Convincing CVE details' },
        { type: 'minimal_signals', description: 'Very subtle domain difference' },
      ],
      verificationHints: ['Updates come via official vendor portals', 'Check actual CVE details'],
    },
  },
  {
    name: 'D5: Advanced Credential Harvesting - SSO',
    subject: 'Your password will expire in 5 days',
    body: `Your network password will expire in 5 days.

To avoid interruption to your work, please update your password.

Username: j.williams
Current Password: *******
New Password: ________
Confirm Password: ________

Update Password:
https://sso.company-auth.example.net/password/change

After updating, your new password will be effective immediately.

IT Service Desk
helpdesk@company-it.example.net`,
    fromName: 'IT Service Desk',
    fromEmail: 'helpdesk@company-it.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'credential_harvesting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'password_expiry', description: 'Common corporate scenario' },
        { type: 'domain_spoofing', description: 'Very convincing domain' },
        { type: 'minimal_signals', description: 'Nearly perfect appearance' },
      ],
      verificationHints: ['Password changes via official SSO portal', 'Verify with IT helpdesk'],
    },
  },
  {
    name: 'D5: Sophisticated Pretexting - Board Resolution',
    subject: 'Board Resolution - Confidential - Immediate Action',
    body: `Directors,

Pursuant to our emergency board meeting this morning, the following resolution was passed unanimously:

RESOLUTION 2024-03-07-BD: Emergency Funding Authorization

The board has authorized the immediate release of $5,000,000 from the contingency fund to address the ongoing operational requirements.

This resolution requires immediate execution. Please acknowledge receipt and confirm your approval.

The full resolution document is available in the board portal:
https://board-secure.company-governance.example.net/resolutions/2024-03-07

Authentication has been provisioned for all directors.

Board Secretary
secretary@company-board.example.net`,
    fromName: 'Board Secretary',
    fromEmail: 'secretary@company-board.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Librarians',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'board_level', description: 'Targets board members' },
        { type: 'authority_appeal', description: 'Uses board authority' },
        { type: 'financial_urgency', description: 'Emergency funding request' },
        { type: 'minimal_signals', description: 'Very subtle indicators' },
      ],
      verificationHints: [
        'Board resolutions via official board portal',
        'Verify with other directors',
      ],
    },
  },
  {
    name: 'D5: Expert Spear Phishing - M&A Legal',
    subject: 'Re: Due Diligence - TechStart Acquisition',
    body: `Counsel,

Following the successful negotiation, please find below the wire instructions for the due diligence deposit.

Deposit Amount: $500,000.00
Bank: Silicon Valley Bank
Account: TechStart Holdings Inc
Account #: 8847291038
Routing #: 121140399
Reference: DD-Deposit-TechStart

This deposit is required to proceed with the exclusivity period. Wire must be received by 5 PM PST today.

Please confirm receipt immediately upon transfer.

Also, I've uploaded the revised purchase agreement to our secure portal. Access:
https://legal-vault.secure-counsel.example.net/deals/techstart

Use the credentials we set up previously.

Best regards,
Jonathan Reeves
Partner
Reeves & Morrison LLP
j.reeves@reeves-morrison.example.com
(650) 555-8472`,
    fromName: 'Jonathan Reeves',
    fromEmail: 'j.reeves@reeves-morrison.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'm_a_context', description: 'Realistic M&A transaction' },
        { type: 'financial_urgency', description: 'Same-day wire deadline' },
        { type: 'sophisticated', description: 'Very convincing legal context' },
      ],
      verificationHints: [
        'Verify with law firm via known contact',
        'Wire instructions verified by phone',
      ],
    },
  },
  {
    name: 'D5: Nation-State Malware - Infrastructure',
    subject: 'SCADA System Update Required',
    body: `Engineering Team,

The following SCADA systems require firmware updates as part of our quarterly maintenance cycle:

Systems Affected:
- Water Treatment Plant - Controller A
- Power Grid Substation - Station 7
- Manufacturing Floor - Line 3

Update Package: SCADA-FW-2024-Q1-CUM
Size: 45.2 MB

Download from engineering portal:
https://engineering.company-ops.example.net/scada-updates/fw-2024-q1

Apply updates during maintenance window this weekend. Each controller requires approximately 30 minutes.

Contact lead engineer with questions.

Regards,
Control Systems Engineering
engineering@company-ops.example.net`,
    fromName: 'Control Systems Engineering',
    fromEmail: 'engineering@company-ops.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Sovereign Compact',
    attackType: 'malware_delivery',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'infrastructure_target', description: 'Targets industrial control systems' },
        { type: 'realistic_context', description: 'Appears to be routine maintenance' },
        { type: 'minimal_signals', description: 'Very subtle malicious indicators' },
      ],
      verificationHints: [
        'SCADA updates via air-gapped secure network',
        'Verify with control systems team',
      ],
    },
  },
  {
    name: 'D5: Advanced Phishing - Office 365 Migration',
    subject: 'Action Required: Migrate to New Office 365 Environment',
    body: `Dear User,

Your organization is migrating to the new Microsoft 365 environment.

To complete your migration, please verify your account:

Migration Portal:
https://m365-tenant.company-migration.example.net/migrate

You must complete migration by March 31, 2024.

After migration, you will have access to:
- Enhanced email security
- New collaboration features
- Expanded storage

If you do not migrate, you may lose access to email and documents.

Support: m365-support@company-support.example.net

Microsoft 365 Migration Team`,
    fromName: 'Microsoft 365 Migration',
    fromEmail: 'm365-support@company-support.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'migration_scenario', description: 'Common enterprise migration' },
        { type: 'corporate_context', description: 'Appears to be IT communication' },
        { type: 'domain_spoofing', description: 'Very convincing domain' },
      ],
      verificationHints: ['Migrations handled by internal IT', 'Verify with IT department'],
    },
  },
  {
    name: 'D5: Expert Pretexting - Tax Preparer',
    subject: 'Tax Return Review - Schedule K-1',
    body: `Dear Client,

Your individual tax return has been prepared and is ready for review.

Key items:
- Total Income: $287,450
- Adjusted Gross Income: $264,200
- Total Tax: $58,940
- Refund: $3,240

Schedule K-1 from partnership investments is attached.

Please review your return in the secure client portal:
https://portal.cpa-services.example.net/client/tax-return/2024

Login with your existing credentials.

If you have questions, please call me directly.

Best regards,
Thomas Wright CPA
Wright & Associates
t.wright@cpa-services.example.com
(555) 847-2938`,
    fromName: 'Thomas Wright CPA',
    fromEmail: 't.wright@cpa-services.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'financial_target', description: 'Targets tax/financial data' },
        { type: 'realistic_context', description: 'Appears to be tax preparer' },
        { type: 'suspicious_attachment', description: 'May contain malware' },
        { type: 'minimal_signals', description: 'Very subtle red flags' },
      ],
      verificationHints: ['Tax documents via known CPA portal', 'Call tax preparer directly'],
    },
  },
  {
    name: 'D5: Advanced Credential Harvesting - API Keys',
    subject: 'API Key Rotation Required',
    body: `Developer,

One of your API keys is set to expire in 7 days.

Key Details:
Name: Production API Key
Key ID: ak_prod_8472938
Expires: March 14, 2024
Scopes: read:users, write:orders, admin:billing

To continue using the API without interruption, rotate your key:

API Console:
https://console.developer.company-api.example.net/keys/rotate

After rotation, update your applications with the new key.

Documentation: https://docs.company-api.example.net

Platform Team
platform@company-developer.example.net`,
    fromName: 'Platform Team',
    fromEmail: 'platform@company-developer.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Hacktivists',
    attackType: 'credential_harvesting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 4,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'developer_target', description: 'Targets developers' },
        { type: 'api_scenario', description: 'Realistic API key scenario' },
        { type: 'domain_spoofing', description: 'Convincing developer portal' },
        { type: 'minimal_signals', description: 'Very subtle indicators' },
      ],
      verificationHints: [
        'API keys managed in official developer portal',
        'Check key expiration in actual console',
      ],
    },
  },
];

export const seedEmailTemplates = async (): Promise<void> => {
  const db = getDatabaseClient();

  const tenantId = SEED_TENANT_IDS.acmeCorp;

  console.warn(`Seeding ${EMAIL_TEMPLATES.length} email templates...`);

  for (const template of EMAIL_TEMPLATES) {
    const seedData = generateEmailTemplate(template, tenantId);

    await db
      .insert(emailTemplates)
      .values(seedData)
      .onConflictDoUpdate({
        target: [emailTemplates.tenantId, emailTemplates.name],
        set: {
          subject: sql`excluded.subject`,
          body: sql`excluded.body`,
          fromName: sql`excluded.from_name`,
          fromEmail: sql`excluded.from_email`,
          replyTo: sql`excluded.reply_to`,
          contentType: sql`excluded.content_type`,
          difficulty: sql`excluded.difficulty`,
          faction: sql`excluded.faction`,
          attackType: sql`excluded.attack_type`,
          threatLevel: sql`excluded.threat_level`,
          season: sql`excluded.season`,
          chapter: sql`excluded.chapter`,
          metadata: sql`excluded.metadata`,
          isAiGenerated: sql`excluded.is_ai_generated`,
          isActive: sql`excluded.is_active`,
          updatedAt: sql`now()`,
        },
      });
  }

  console.warn(`Seeded ${EMAIL_TEMPLATES.length} email templates successfully.`);
};

const isDirectRun = process.argv[1] && process.argv[1].includes('seed-email-templates');

if (isDirectRun) {
  seedEmailTemplates()
    .then(() => {
      console.warn('Email template seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Email template seeding failed:', error);
      process.exit(1);
    });
}
