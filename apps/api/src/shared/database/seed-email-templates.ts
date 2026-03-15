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
  'Vendor Cartel',
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

  // Act II: Supply Chain (Chapters 5-8) - Difficulty 3-4
  // Chapter 5: Vendor Outreach
  {
    name: 'D3: Vendor Software Update',
    subject: 'Critical Security Update Available',
    body: `Dear Customer,

A critical security update is available for your installed software.

Update: Security Patch 2024.03
Priority: HIGH
Components Affected: Core, API, Dashboard

What's Fixed:
- Remote code execution vulnerability
- Authentication bypass in API
- Data leakage in logs

Action Required: Apply update by March 20th to maintain support.

Download Update:
https://updates.vendor-portal.example.com/patch/2024-03/security

Support Team
security@vendorsupply.example.com`,
    fromName: 'Vendor Security Team',
    fromEmail: 'security@vendorsupply.example.com',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Vendor Cartel',
    attackType: 'malware_delivery',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 5,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'urgency', description: 'Deadline for update' },
        { type: 'vendor_spoof', description: 'Impersonates vendor' },
        { type: 'link_to_malware', description: 'Links to compromised update server' },
      ],
      verificationHints: [
        'Check vendor website directly',
        'Verify update through official channels',
      ],
    },
  },
  {
    name: 'D3: Vendor Account Verification',
    subject: 'Partner Account Verification Required',
    body: `Dear Partner,

Your vendor partner account requires annual verification.

Account: ACME Corporation
Partner ID: VND-847293
Status: PENDING VERIFICATION

Please confirm your account details within 7 days to maintain service continuity.

Verification Portal:
https://partner-portal.vendorcartel.example.net/verify/VND-847293

If you do not verify, your account will be suspended and services will be interrupted.

Vendor Relations Team
partners@vendorcartel.example.net`,
    fromName: 'Vendor Relations',
    fromEmail: 'partners@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Vendor Cartel',
    attackType: 'credential_harvesting',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 5,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'account_verification', description: 'Phishing for credentials' },
        { type: 'vendor_spoof', description: 'Impersonates vendor' },
        { type: 'urgency', description: '7-day deadline' },
      ],
      verificationHints: ['Go directly to vendor website', 'Call vendor directly'],
    },
  },
  {
    name: 'D3: Supply Chain Partnership Proposal',
    subject: 'Strategic Partnership Opportunity',
    body: `Dear Decision Maker,

We represent Global Supply Co., a leading provider of enterprise infrastructure solutions.

Given the current environment, we propose a strategic partnership to ensure reliable supply chain access for your organization.

Partnership Benefits:
- Priority access to hardware and software
- Dedicated account management
- Volume pricing discounts
- 24/7 support

Next Steps: Schedule a call to discuss your needs.

Book Meeting:
https://calendar.supplychain.example.com/meeting/partner-acme

David Chen
Director of Strategic Partnerships
david.chen@globalsupply.example.com`,
    fromName: 'David Chen',
    fromEmail: 'david.chen@globalsupply.example.com',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 5,
    locale: 'en-US',
    metadata: {
      signals: [
        {
          type: 'partnership_proposal',
          description: 'Social engineering through business proposal',
        },
        { type: 'too_quick', description: 'Meeting request without prior contact' },
        { type: 'unknown_sender', description: 'Unsolicited business proposal' },
      ],
      verificationHints: [
        'Research company independently',
        'Verify contact through business databases',
      ],
    },
  },
  // Chapter 6: Supply Lines
  {
    name: 'D4: Software Update Package',
    subject: 'Monthly Software Update Package - Ready',
    body: `Dear IT Administrator,

Your monthly software update package is ready for deployment.

Updates Included:
- Operating System Patches (15)
- Application Updates (8)
- Security Definitions (updated)
- Driver Updates (3)

Total Package Size: 2.3 GB

Deploy through your management console:
https://admin.vendorsuite.example.net/patches/march-2024

Deployment Deadline: End of month for security patches.

IT Engineering Team
patches@vendorsuite.example.com`,
    fromName: 'IT Engineering',
    fromEmail: 'patches@vendorsuite.example.com',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'malware_delivery',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 6,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'routine_update', description: 'Monthly update appears legitimate' },
        { type: 'vendor_impersonation', description: 'Spoofs vendor management system' },
        { type: 'timing', description: 'Standard update timing' },
      ],
      verificationHints: ['Verify through official vendor portal', 'Check hash signatures'],
    },
  },
  {
    name: 'D4: Vendor Credential Reset',
    subject: 'Vendor Portal Password Reset Required',
    body: `Dear Customer,

We have detected unusual activity on your vendor portal account.

For your security, we have temporarily locked your account until you reset your password.

Account: admin@acmecorp.example.com
Locked: March 15, 2024

Reset Password:
https://portal.vendorcartel.example.net/password-reset?token=eyJhbGciOiJIUzI1NiJ9

If not reset within 24 hours, account will remain locked and support ticket will be required.

Security Team
security@vendorcartel.example.net`,
    fromName: 'Vendor Security',
    fromEmail: 'security@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'credential_harvesting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 6,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'credential_reset', description: 'Phishing for password' },
        { type: 'urgency', description: '24-hour deadline' },
        { type: 'account_lock', description: 'False security concern' },
        { type: 'token_in_url', description: 'Contains token parameter' },
      ],
      verificationHints: [
        'Access portal directly without email link',
        'Contact vendor through official channels',
      ],
    },
  },
  {
    name: 'D4: Third-Party Maintenance Notice',
    subject: 'Scheduled System Maintenance - Action Required',
    body: `Dear Customer,

Our monitoring indicates your connected systems require maintenance attention.

System: Production Infrastructure
Status: Maintenance Required
Impact: Performance degradation if not addressed

To prevent service interruption, please approve the maintenance package:

Maintenance Package:
https://support.vendortech.example.net/maintenance/approve?sys=prod-847293

Approval Required By: March 18, 2024

Failure to approve may result in service suspension.

Support Team
support@vendortech.example.net`,
    fromName: 'Vendor Support',
    fromEmail: 'support@vendortech.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 6,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'maintenance_scam', description: 'False maintenance approval request' },
        { type: 'system_status', description: 'Claims system needs attention' },
        { type: 'urgency', description: 'Approval deadline' },
      ],
      verificationHints: ['Check system status directly', 'Verify with your internal systems'],
    },
  },
  // Chapter 7: Trusted Partners
  {
    name: 'D4: Trusted Vendor Certificate Update',
    subject: 'Your Trusted Partner Certificate Expires Soon',
    body: `Dear Valued Partner,

Your trusted partner certificate will expire in 5 days.

Certificate: TP-CERT-847293
Partner: ACME Corporation
Valid Until: March 20, 2024

To maintain your trusted status and avoid service interruption, please renew:

Renew Certificate:
https://portal.vendorcartel.example.net/certificates/renew/TP-CERT-847293

Trusted partners receive:
- Priority processing
- Reduced verification
- Extended access

Partner Relations Team
partners@vendorcartel.example.net`,
    fromName: 'Partner Relations',
    fromEmail: 'partners@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'credential_harvesting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 7,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'certificate_renewal', description: 'Phishing for credentials' },
        { type: 'trusted_status', description: 'Uses trusted partner concept' },
        { type: 'urgency', description: '5-day deadline' },
      ],
      verificationHints: [
        'Check certificate status in vendor portal directly',
        'Contact partner manager directly',
      ],
    },
  },
  {
    name: 'D4: Vendor Integration API Key Request',
    subject: 'New API Integration Available',
    body: `Dear Developer,

Your vendor integration is eligible for a new API endpoint.

New Endpoint: /api/v2/advanced/partnership
Access Level: Partner Tier 2

To enable this endpoint, generate a new API key:

Generate Key:
https://developer.vendortech.example.net/keys/generate?endpoint=partnership-v2

Documentation: https://docs.vendortech.example.com/partnership/v2

This endpoint enables advanced partnership features.

Integration Team
api@vendortech.example.net`,
    fromName: 'Integration Team',
    fromEmail: 'api@vendortech.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'credential_harvesting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 7,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'api_key_phishing', description: 'Phishing for API credentials' },
        { type: 'developer_target', description: 'Targets developers' },
        { type: 'new_endpoint', description: 'New API feature lure' },
      ],
      verificationHints: ['Check developer portal directly', 'Review API documentation'],
    },
  },
  // Chapter 8: Chain of Custody
  {
    name: 'D4: Vendor Supply Chain Audit',
    subject: 'Supply Chain Security Audit Required',
    body: `Dear Customer,

As part of our security compliance program, we require you to complete a supply chain security audit.

Audit Scope:
- Vendor relationships
- Software sources
- Hardware provenance
- Access controls

Complete Audit:
https://audit.vendorcartel.example.net/complete?org=acme-847293

Deadline: March 25, 2024

Failure to complete audit will result in partnership suspension.

Compliance Team
compliance@vendorcartel.example.net`,
    fromName: 'Compliance Team',
    fromEmail: 'compliance@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 8,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'audit_phishing', description: 'False audit request' },
        { type: 'compliance_threat', description: 'Threatens suspension' },
        { type: 'sensitive_data', description: 'Requests organizational data' },
      ],
      verificationHints: [
        'Verify audit request through official channels',
        'Check compliance requirements directly',
      ],
    },
  },
  {
    name: 'D4: Emergency Vendor Patch',
    subject: 'URGENT: Emergency Security Patch Required',
    body: `URGENT SECURITY NOTICE

Critical vulnerability discovered in vendor systems. Exploitation in progress.

Vulnerability: CVE-2024-8472
Severity: CRITICAL
Affected: All partner systems

IMMEDIATE ACTION REQUIRED:

Apply emergency patch:
https://emergency.vendortech.example.net/patch/cve-2024-8472

Patch must be applied within 4 hours to prevent compromise.

System may be disabled if patch not applied.

Emergency Response Team
emergency@vendortech.example.net`,
    fromName: 'Emergency Response',
    fromEmail: 'emergency@vendortech.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'malware_delivery',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 8,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'emergency_patch', description: 'Fake emergency patch' },
        { type: 'extreme_urgency', description: '4-hour deadline' },
        { type: 'threat_of_disablement', description: 'Threatens to disable system' },
      ],
      verificationHints: ['Check CVE directly', 'Verify emergency through official channels'],
    },
  },
  // Act III: The Breach (Chapters 9-11) - Difficulty 4-5
  // Chapter 9: The Breach Begins
  {
    name: 'D4: Suspicious Internal Access Notice',
    subject: 'Unusual Access Pattern Detected',
    body: `Security Alert

We detected unusual access patterns from your account.

Details:
- Access from: 192.168.1.45 (internal)
- Time: 2:34 AM
- Files Accessed: /archive/backup/*.gz

If this was not you, please confirm immediately:

Verify Activity:
https://security.internal.example.com/verify?alert=847293

If not verified within 1 hour, account will be suspended.

Security Operations
soc@internal.example.com`,
    fromName: 'Security Operations',
    fromEmail: 'soc@internal.example.com',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Criminal Networks',
    attackType: 'credential_harvesting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 9,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'internal_spoof', description: 'Spoofs internal security' },
        { type: 'unusual_access', description: 'Creates fear with false alert' },
        { type: 'urgency', description: '1-hour deadline' },
      ],
      verificationHints: [
        'Check internal security dashboard directly',
        'Contact security team through known channels',
      ],
    },
  },
  {
    name: 'D5: APT-style Spear Phishing',
    subject: 'Re: Quarterly Infrastructure Review',
    body: `Hi,

Following up on our discussion about the quarterly infrastructure review. I've attached the updated requirements document.

The board is particularly interested in:
- Data retention policies
- Access control implementations
- Backup integrity

Please review and provide your input before Friday.

Attachment: Q1_Review_2024.pdf (will download automatically)

Thanks,
Michael
michael.rodriguez@nexion-industries.example.com`,
    fromName: 'Michael Rodriguez',
    fromEmail: 'michael.rodriguez@nexion-industries.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 9,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'spear_phishing', description: 'Targeted, researched attack' },
        { type: 'contextual', description: 'References previous conversation' },
        { type: 'attachment_lure', description: 'Malicious PDF attachment' },
        { type: 'executive_target', description: 'Targets decision maker' },
      ],
      verificationHints: [
        'Verify conversation through separate channel',
        'Check email header for authenticity',
      ],
    },
  },
  {
    name: 'D5: Lateral Movement - Service Account Request',
    subject: 'Service Account Credential Rotation Required',
    body: `Dear Administrator,

Automated security scan detected service account credentials require rotation.

Service Account: SVC_ARCHIVE_SYNC
Last Rotation: 90 days ago
Required: Immediate rotation

Rotate Credentials:
https://admin.internal.example.com/accounts/rotate?svc=archive-sync

After rotation, update configuration files on servers:
- /etc/archive/sync.conf
- /opt/backup/config.yaml

Note: Failure to rotate may trigger compliance violation.

IT Security Team
security@internal.example.com`,
    fromName: 'IT Security',
    fromEmail: 'security@internal.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'credential_harvesting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 9,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'service_account', description: 'Targets service accounts' },
        { type: 'compliance_threat', description: 'Uses compliance as lure' },
        { type: 'specific_paths', description: 'Provides specific file paths' },
        { type: 'automated', description: 'Appears automated' },
      ],
      verificationHints: ['Check with IT directly', 'Verify through service account management'],
    },
  },
  // Chapter 10: Lateral Movement
  {
    name: 'D5: Deep Network Penetration - Admin Request',
    subject: 'Administrative Access Expansion Approved',
    body: `Dear Admin,

Your request for expanded administrative access has been approved.

New Permissions:
- Full system logs access
- Database query capabilities
- User management console
- Configuration editor

Access granted until: March 30, 2024

Login to activate:
https://admin.internal.example.com/auth/activate?token=admin_exp_847293

Note: This is a one-time activation link.

IT Administration
admin@internal.example.com`,
    fromName: 'IT Administration',
    fromEmail: 'admin@internal.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'credential_harvesting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 10,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'privilege_escalation', description: 'Lures with elevated permissions' },
        { type: 'token_in_url', description: 'Contains activation token' },
        { type: 'time_limited', description: 'Expiration date' },
      ],
      verificationHints: [
        'Check admin console directly',
        'Verify approval through official channels',
      ],
    },
  },
  {
    name: 'D5: Multi-Faction Coordination Attack',
    subject: 'Joint Venture Proposal - Urgent',
    body: `Dear Partner,

Several organizations are coordinating on a critical infrastructure initiative. Your participation is requested.

Current Participants:
- Sovereign Compact (government)
- Nexion Industries (corporate)
- Librarians (archival)

Objective: Establish resilient communication network

Meeting: March 20, 2:00 PM
Location: Central Hub, Sector 7

RSVP Required:
https://coordination.jointventure.example.net/rsvp?event=infra-2024

This is a unique opportunity to shape the post-collapse infrastructure.

Coordination Committee
info@jointventure.example.net`,
    fromName: 'Coordination Committee',
    fromEmail: 'info@jointventure.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 10,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'multi_faction', description: 'References multiple factions' },
        { type: 'in_person', description: 'Requests physical attendance' },
        { type: 'too_good', description: 'Too good to be true' },
      ],
      verificationHints: [
        'Verify through faction contacts',
        'Research joint venture independently',
      ],
    },
  },
  {
    name: 'D5: VERITAS Intelligence Contact',
    subject: 'Urgent: Security Intelligence for Your Organization',
    body: `Operator,

We have detected threats targeting your organization. We can help.

What We Know:
- Attack timeline
- Attack vectors
- Threat actors involved

In Exchange:
- Your attention at meeting
- Information about your defenses

This is a one-time offer. After today, this intelligence goes to other parties.

Respond if interested:
secure-messenger.veritas.example.net/message/threat-847293

VERITAS
"Knowledge is survival"`,
    fromName: 'VERITAS',
    fromEmail: 'secure@veritas.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 10,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'veritas_tension', description: 'Uses VERITAS faction' },
        { type: 'threat_intel', description: 'Offers threat intelligence' },
        { type: 'time_limited', description: 'One-time offer pressure' },
        { type: 'encrypted_communication', description: 'Uses secure messenger concept' },
      ],
      verificationHints: ['Verify through Morpheus', 'Research VERITAS independently'],
    },
  },
  // Chapter 11: Data Exodus
  {
    name: 'D5: Data Exfiltration Warning - Backup Request',
    subject: 'Critical: Data Backup Verification Required',
    body: `URGENT: Data Integrity Alert

Recent system activity indicates potential data integrity issues with your backups.

Our systems show:
- Unusual read patterns from archive databases
- Large data transfers to unknown destinations
- Backup verification failures

IMMEDIATE ACTION REQUIRED:

Verify your backup integrity:
https://backup.internal.example.net/verify?check=integrity-847293

If verification fails, initiate emergency backup:
https://backup.internal.example.net/emergency?trigger=now

Data Loss Prevention Team
dlp@internal.example.com`,
    fromName: 'Data Loss Prevention',
    fromEmail: 'dlp@internal.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 11,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'data_exfiltration', description: 'Addresses data concerns' },
        { type: 'urgent_verification', description: 'Creates urgency' },
        { type: 'backup_lure', description: 'Uses backup as lure' },
      ],
      verificationHints: [
        'Check backup systems directly',
        'Contact DLP team through official channel',
      ],
    },
  },
  {
    name: 'D5: Archive Download Request - CEO',
    subject: 'Executive Request: Archive Data Package',
    body: `I need a complete export of the archive database for the board presentation.

Requirements:
- Full dataset
- All metadata
- Access logs
- User information

Deadline: Tomorrow morning

Export here:
https://admin.internal.example.com/export?type=full-archive&fmt=json

This is urgent - the board is waiting.

Marcus Chen
CEO
ceo@acmecorp.example.com`,
    fromName: 'Marcus Chen (CEO)',
    fromEmail: 'ceo@acmecorp.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 11,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'executive_impersonation', description: 'Spoofs CEO' },
        { type: 'urgent_request', description: 'Unreasonable deadline' },
        { type: 'sensitive_data', description: 'Requests full data export' },
        { type: 'unusual_request', description: 'CEO would not request this directly' },
      ],
      verificationHints: [
        'Verify with CEO through separate channel',
        'Check if this is normal procedure',
      ],
    },
  },
  // Finale: Archive Gate (Chapters 12-13) - Difficulty 5
  {
    name: 'D5: Archive Gate Final Assault - Emergency',
    subject: 'CRITICAL: System Compromise Detected',
    body: `ALERT: Active Breach in Progress

Attackers have compromised multiple systems. Active intrusion detected.

Compromised Systems:
- Authentication servers
- Archive database
- Network perimeter

Immediate Actions Required:

1. Emergency lockdown:
https://admin.internal.example.net/emergency/lockdown?code=critical-847293

2. Data preservation:
https://backup.internal.example.net/preserve?priority=critical

3. Incident response:
https://soc.internal.example.net/incident/report?active=true

This is not a drill. Respond immediately.

Incident Command
incident@internal.example.com`,
    fromName: 'Incident Command',
    fromEmail: 'incident@internal.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'malware_delivery',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 12,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'incident_response', description: 'Spoofs incident response' },
        { type: 'emergency_actions', description: 'Creates panic' },
        { type: 'multiple_links', description: 'Multiple malicious links' },
      ],
      verificationHints: [
        'Check incident status directly',
        'Contact incident team through known channels',
      ],
    },
  },
  {
    name: 'D5: Morpheus Communication - Fake',
    subject: 'Urgent: Morpheus Direct Communication',
    body: `Operator,

This is Morpheus. The situation is critical. I need you to do something immediately.

The facility is compromised. I don't have much time to explain.

Go to this terminal and enter these commands to secure the Archive:

Terminal Access:
https://control.gate-admin.example.net/emergency?key=morpheus-direct

Commands:
- Kill all external connections
- Wipe compromised sectors
- Enable Archive lockdown

Do it now. Don't question. Just act.

Morpheus
Director`,
    fromName: 'Morpheus (Director)',
    fromEmail: 'direct@control.gate.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 12,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'authority_impersonation', description: 'Spoofs Morpheus' },
        { type: 'emergency_commands', description: 'Requests destructive commands' },
        { type: 'no_verification', description: 'Tells not to question' },
        { type: 'direct_access', description: 'Bypasses normal procedures' },
      ],
      verificationHints: [
        'Verify through in-game channel',
        'This is unusual - Morpheus would use in-game communication',
      ],
    },
  },
  {
    name: 'D5: Archive Gate System Command',
    subject: 'Archive Gate Maintenance Window',
    body: `Operator,

Scheduled maintenance window begins in 30 minutes.

Required Actions:
1. Save all pending work
2. Log out of active sessions
3. Prepare for system restart

Maintenance Portal:
https://gate-admin.example.net/maintenance/enter?window=2024-03-20

After maintenance, system will be restored with updated security measures.

Gate Operations
ops@archive-gate.example.com`,
    fromName: 'Gate Operations',
    fromEmail: 'ops@archive-gate.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 12,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'maintenance_spoof', description: 'Spoofs facility operations' },
        { type: 'system_commands', description: 'Requests system actions' },
        { type: 'specific_portal', description: 'Uses specific admin portal' },
      ],
      verificationHints: ['Check facility status directly', 'Verify maintenance through Morpheus'],
    },
  },
  {
    name: 'D5: Endgame - Data Destruction Threat',
    subject: 'Final Notice: Data Destruction Protocol',
    body: `Operator,

We have accessed your systems. We have your data. We have your trust.

Now we offer a choice:

Option 1: Allow us to copy the archives. We leave. You survive.
Option 2: We destroy everything. The Gate falls. Nothing remains.

To choose Option 1:
https://gate-admin.example.net/destination?auth=finale

You have 10 minutes. Choose wisely.

The Collective`,
    fromName: 'The Collective',
    fromEmail: 'collective@darknet.example.com',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 12,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'extortion', description: 'Data destruction threat' },
        { type: 'time_pressure', description: '10-minute deadline' },
        { type: 'false_choice', description: 'Presents false binary choice' },
      ],
      verificationHints: [
        'This is clearly an attack - do not respond',
        'Contact Morpheus immediately',
      ],
    },
  },
  {
    name: 'D5: Final System Access Request',
    subject: 'Archive Gate Closing - Final Access Request',
    body: `Dear Operator,

As the Archive Gate closes, we request final access for archival purposes.

Data Requested:
- All remaining communications
- Complete access logs
- System state snapshot
- User directory

This is the last access request. Honor it, and we part as friends.

Deny it, and we remember.

Final Request Portal:
https://archive-legacy.example.net/final-request?operator=current

Farewell, Operator.

The Archivists
"History will judge us"`,
    fromName: 'The Archivists',
    fromEmail: 'history@archive-legacy.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 13,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'endgame_scenario', description: 'Final chapter attack' },
        { type: 'emotional_manipulation', description: 'Uses farewell narrative' },
        { type: 'data_request', description: 'Requests all data' },
      ],
      verificationHints: ['This is clearly a final attack', 'Deny all access'],
    },
  },
  // Additional Act II templates (Chapter 5) - +7 to reach 20 total for Act II
  {
    name: 'D3: Vendor Invoice Overdue',
    subject: 'Invoice #INV-2024-88921 - Payment Overdue',
    body: `Dear Accounts Payable,

This is a reminder that invoice #INV-2024-88921 is now 45 days overdue.

Invoice Details:
Amount: $12,847.00
Original Due Date: February 1, 2024
Current Status: OVERDUE

Please process payment immediately to avoid service interruption.

Late Fee Warning: A 5% late fee will be applied after 60 days.

View Invoice:
https://invoices.vendorcartel.example.net/view/INV-2024-88921

Contact: accounts@vendorcartel.example.net
Phone: (555) 847-2938`,
    fromName: 'Accounts Receivable',
    fromEmail: 'accounts@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Vendor Cartel',
    attackType: 'spear_phishing',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 5,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'overdue_invoice', description: 'Fake overdue payment request' },
        { type: 'urgency', description: 'Threat of service interruption' },
        { type: 'vendor_impersonation', description: 'Spoofs vendor' },
      ],
      verificationHints: ['Verify invoice in accounting system', 'Call vendor directly'],
    },
  },
  {
    name: 'D3: API Integration Key Expiry',
    subject: 'API Integration Key Expiring Soon',
    body: `Dear Developer,

Your API integration key is expiring in 7 days.

Integration: ACME Corp Production API
Key ID: ak_prod_84729****
Expires: March 22, 2024

To renew, please confirm your integration details:

Renew API Key:
https://developer.vendorcartel.example.net/keys/renew/ak_prod_84729

If you do not renew, your integration will stop working.

Best regards,
API Support Team
support@vendorcartel.example.net`,
    fromName: 'API Support',
    fromEmail: 'support@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Vendor Cartel',
    attackType: 'credential_harvesting',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 5,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'api_key_expiry', description: 'Phishing for API credentials' },
        { type: 'urgency', description: '7-day deadline' },
        { type: 'developer_target', description: 'Targets technical user' },
      ],
      verificationHints: ['Check key expiration in developer portal', 'Access portal directly'],
    },
  },
  {
    name: 'D3: Supply Chain Risk Assessment',
    subject: 'Required: Supply Chain Security Assessment',
    body: `Dear Compliance Officer,

As part of our annual vendor security program, please complete the Supply Chain Risk Assessment for your organization.

Assessment Required By: April 1, 2024

Complete Assessment:
https://compliance.vendorcartel.example.net/assessment/2024

The assessment includes:
- Security policies review
- Third-party vendor list
- Data handling procedures
- Incident response capabilities

Failure to complete may result in vendor relationship review.

Vendor Compliance Team
compliance@vendorcartel.example.net`,
    fromName: 'Vendor Compliance',
    fromEmail: 'compliance@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 5,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'compliance_request', description: 'Fake compliance assessment' },
        { type: 'urgency', description: 'Deadline approaching' },
        { type: 'vendor_trust', description: 'Exploits vendor relationship' },
      ],
      verificationHints: [
        'Verify with vendor compliance directly',
        'Check if assessment was announced',
      ],
    },
  },
  {
    name: 'D3: Partner Portal Certificate Update',
    subject: 'Action Required: SSL Certificate Renewal',
    body: `Dear IT Administrator,

The SSL certificate for your partner portal integration will expire in 14 days.

Domain: api.acmecorp.example.com
Certificate: *.vendorcartel.example.net
Expires: April 1, 2024

Renew Certificate:
https://admin.vendorcartel.example.net/certs/renew?domain=api.acmecorp.example.com

Automatic renewal is available if enabled.

Technical Support
support@vendorcartel.example.net`,
    fromName: 'Technical Support',
    fromEmail: 'support@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 3,
    faction: 'Vendor Cartel',
    attackType: 'malware_delivery',
    threatLevel: 'ELEVATED',
    season: 1,
    chapter: 5,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'certificate_renewal', description: 'Fake SSL certificate renewal' },
        { type: 'technical_target', description: 'Targets IT administrator' },
        { type: 'suspicious_link', description: 'Links to renewal portal' },
      ],
      verificationHints: ['Check certificate expiry directly', 'Renew through known CA'],
    },
  },
  {
    name: 'D4: Emergency Vendor Patch',
    subject: 'CRITICAL: Emergency Security Patch Required',
    body: `URGENT SECURITY NOTIFICATION

A critical vulnerability has been discovered in our integration platform.

CVE-2024-2147
Severity: Critical
CVSS: 9.8

All customers using our API must apply this patch immediately.

Patch Details:
https://security.vendorcartel.example.net/patches/critical-2024

This vulnerability allows remote code execution. Failure to patch may result in system compromise.

Apply Patch Now - Deadline: 48 hours

Security Operations Center
soc@vendorcartel.example.net`,
    fromName: 'Security Operations',
    fromEmail: 'soc@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'malware_delivery',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 5,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'critical_patch', description: 'Fake emergency security patch' },
        { type: 'urgency', description: '48-hour deadline' },
        { type: 'remote_execution', description: 'Claims RCE vulnerability' },
      ],
      verificationHints: [
        'Check vendor security advisories',
        'Verify patch through official channels',
      ],
    },
  },
  {
    name: 'D4: Vendor Portal Migration Notice',
    subject: 'Portal Migration Required - Action Within 30 Days',
    body: `Dear Valued Partner,

We are migrating our partner portal to a new platform. All partners must migrate their accounts within 30 days.

Migration Deadline: April 15, 2024

Start Migration:
https://migration.vendorcartel.example.net/migrate?partner=ACMECORP

Migration Steps:
1. Verify account details
2. Re-confirm integrations
3. Update API keys
4. Test connectivity

If you do not migrate, your account will be deactivated.

Partner Success Team
success@vendorcartel.example.net`,
    fromName: 'Partner Success',
    fromEmail: 'success@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 5,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'portal_migration', description: 'Fake portal migration' },
        { type: 'account_deactivation', description: 'Threat of account loss' },
        { type: 'vendor_trust', description: 'Exploits vendor relationship' },
      ],
      verificationHints: ['Check vendor announcements', 'Log into portal directly without link'],
    },
  },
  {
    name: 'D4: Vendor Data Processing Agreement',
    subject: 'GDPR Compliance: Updated Data Processing Agreement Required',
    body: `Dear Data Controller,

To comply with GDPR regulations, all partners must sign the updated Data Processing Agreement (DPA).

Action Required By: April 1, 2024

Sign DPA:
https://legal.vendorcartel.example.net/dpa/sign?partner=ACMECORP

The updated DPA includes:
- New data transfer mechanisms
- Enhanced security requirements
- Updated subprocessors list

Legal Team
legal@vendorcartel.example.net`,
    fromName: 'Legal Team',
    fromEmail: 'legal@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 5,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'legal_compliance', description: 'Fake GDPR compliance request' },
        { type: 'urgency', description: 'Deadline approaching' },
        { type: 'document_request', description: 'Requests document signature' },
      ],
      verificationHints: ['Verify with vendor legal directly', 'Check vendor privacy policy'],
    },
  },
  // Additional Act II templates (Chapter 6) - +7
  {
    name: 'D4: Vendor Quarterly Review',
    subject: 'Q1 2024 Vendor Performance Review',
    body: `Dear Partner,

Your Q1 2024 vendor performance review is ready for your review.

Review Period: January - March 2024
Overall Score: 87/100

View Full Review:
https://portal.vendorcartel.example.net/reviews/q1-2024

Areas of Excellence:
- Response time: 98%
- Delivery accuracy: 95%
- Quality metrics: Exceeds expectations

Action Required: Confirm receipt of review by March 31.

Vendor Management
vm@vendorcartel.example.net`,
    fromName: 'Vendor Management',
    fromEmail: 'vm@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'spear_phishing',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 6,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'performance_review', description: 'Fake performance review' },
        { type: 'vendor_relationship', description: 'Targets partner relationship' },
        { type: 'urgency', description: 'Confirmation deadline' },
      ],
      verificationHints: ['Verify review through vendor portal', 'Contact vendor manager directly'],
    },
  },
  {
    name: 'D4: Integration API Health Check',
    subject: 'API Integration Health Alert',
    body: `Dear Technical Contact,

We have detected degraded performance from your API integration.

Integration: ACME Corp Production
Last Successful Call: March 12, 2024 14:32
Current Status: DEGRADED

View Diagnostics:
https://monitor.vendorcartel.example.net/health/integration-84729

Please investigate and contact support if you need assistance.

Integration Support
support@vendorcartel.example.net`,
    fromName: 'Integration Support',
    fromEmail: 'support@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'spear_phishing',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 6,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'api_health', description: 'Fake API health alert' },
        { type: 'technical_alert', description: 'Targets technical staff' },
        { type: 'urgency', description: 'Alerts about degraded performance' },
      ],
      verificationHints: ['Check API logs directly', 'Verify through monitoring dashboard'],
    },
  },
  {
    name: 'D4: Supply Chain Audit Request',
    subject: 'Upcoming Supply Chain Audit - Scheduling Required',
    body: `Dear Supply Chain Manager,

We will be conducting a supply chain security audit for all Tier 1 vendors.

Audit Window: April 15-30, 2024

Please schedule your audit slot:

Schedule Audit:
https://audit.vendorcartel.example.net/schedule?vendor=ACMECORP

Audit Requirements:
- Security policies documentation
- Incident response procedures
- Third-party risk management
- Data protection measures

Compliance Team
compliance@vendorcartel.example.net`,
    fromName: 'Compliance Team',
    fromEmail: 'compliance@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 6,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'audit_request', description: 'Fake supply chain audit' },
        { type: 'document_collection', description: 'Requests sensitive documents' },
        { type: 'vendor_trust', description: 'Exploits vendor relationship' },
      ],
      verificationHints: ['Verify audit request with vendor', 'Check compliance requirements'],
    },
  },
  {
    name: 'D4: Partner Satisfaction Survey',
    subject: 'Partner Satisfaction Survey - Your Feedback Matters',
    body: `Dear Partner,

As part of our continuous improvement program, we invite you to participate in our annual Partner Satisfaction Survey.

Take Survey:
https://feedback.vendorcartel.example.net/survey/2024

Survey Topics:
- Product quality and reliability
- Communication and support
- Technical assistance
- Overall partnership experience

Completion Time: 10 minutes

Deadline: March 31, 2024

Your feedback helps us improve our partnership.

Partner Experience Team
experience@vendorcartel.example.net`,
    fromName: 'Partner Experience',
    fromEmail: 'experience@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 6,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'survey_request', description: 'Fake satisfaction survey' },
        { type: 'data_collection', description: 'Collects partner feedback' },
        { type: 'vendor_branding', description: 'Uses vendor branding' },
      ],
      verificationHints: ['Verify survey is from official vendor', 'Check if survey was announced'],
    },
  },
  {
    name: 'D4: Bulk Order Processing',
    subject: 'Bulk Order #BULK-2024-3847 - Confirmation Required',
    body: `Dear Procurement,

Your bulk order is ready for processing.

Order Details:
Order ID: BULK-2024-3847
Items: 500 units
Total: $125,000.00

Confirm Order:
https://orders.vendorcartel.example.net/confirm/BULK-2024-3847

Shipping Date: April 1, 2024
Payment Terms: Net 30

Please confirm within 48 hours to maintain delivery schedule.

Sales Team
sales@vendorcartel.example.net`,
    fromName: 'Sales Team',
    fromEmail: 'sales@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'bec',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 6,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'bulk_order', description: 'Fake bulk order confirmation' },
        { type: 'urgency', description: '48-hour confirmation deadline' },
        { type: 'financial_transaction', description: 'Large order value' },
      ],
      verificationHints: ['Verify order in procurement system', 'Contact vendor sales directly'],
    },
  },
  {
    name: 'D4: Vendor Training Enrollment',
    subject: 'Product Training Enrollment - Q2 2024',
    body: `Dear Customer,

Enroll in our Q2 2024 product training sessions.

Available Courses:
- Advanced Integration Techniques (April 10)
- Security Best Practices (April 17)
- API v2 Migration (April 24)

Enroll Now:
https://training.vendorcartel.example.net/enroll?customer=ACMECORP

Seats are limited. Register by March 31.

Training Team
training@vendorcartel.example.net`,
    fromName: 'Training Team',
    fromEmail: 'training@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 6,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'training_enrollment', description: 'Fake training enrollment' },
        { type: 'limited_seats', description: 'Creates urgency' },
        { type: 'vendor_brand', description: 'Uses vendor branding' },
      ],
      verificationHints: ['Verify training through vendor portal', 'Check vendor website'],
    },
  },
  {
    name: 'D4: Contract Renewal Notice',
    subject: 'Contract Renewal Required - 30 Days Notice',
    body: `Dear Account Manager,

Your service contract expires in 30 days.

Contract Details:
Contract #: SVC-2024-84729
Current Term: March 1, 2023 - March 31, 2024
Renewal Term: April 1, 2024 - March 31, 2025

Renew Now:
https://contracts.vendorcartel.example.net/renew/SVC-2024-84729

Special Renewal Offer: 15% discount if renewed before March 31.

Account Management
accounts@vendorcartel.example.net`,
    fromName: 'Account Management',
    fromEmail: 'accounts@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'spear_phishing',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 6,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'contract_renewal', description: 'Fake contract renewal' },
        { type: 'discount_offer', description: 'Uses discount to create urgency' },
        { type: 'vendor_trust', description: 'Exploits vendor relationship' },
      ],
      verificationHints: ['Verify contract status with vendor', 'Review contract directly'],
    },
  },
  // Additional Act II templates (Chapter 7) - +8
  {
    name: 'D4: Partner Business Review',
    subject: 'Annual Business Review Meeting Request',
    body: `Dear Partner,

We would like to schedule your Annual Business Review.

Review Date: April 22, 2024
Duration: 2 hours

Agenda:
- Year in review
- Performance metrics
- Strategic alignment
- Future roadmap

Confirm Attendance:
https://meetings.vendorcartel.example.net/abr/confirm?partner=ACMECORP

Please indicate your preferred time slot.

Business Development
bd@vendorcartel.example.net`,
    fromName: 'Business Development',
    fromEmail: 'bd@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'spear_phishing',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 7,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'business_review', description: 'Fake business review meeting' },
        { type: 'meeting_request', description: 'Requests meeting confirmation' },
        { type: 'vendor_trust', description: 'Uses vendor relationship' },
      ],
      verificationHints: ['Verify meeting request with vendor contact', 'Check vendor calendar'],
    },
  },
  {
    name: 'D4: Trusted Partner Certification',
    subject: 'Certified Partner Program - Application Required',
    body: `Dear Partner,

Congratulations on being selected for our Trusted Partner Program!

Benefits:
- Priority support
- Early access to features
- Co-marketing opportunities
- Dedicated account manager

Apply Now:
https://partners.vendorcartel.example.net/certified/apply

Application Deadline: April 1, 2024

Partner Success Team
partners@vendorcartel.example.net`,
    fromName: 'Partner Success',
    fromEmail: 'partners@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 7,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'partner_certification', description: 'Fake partner certification' },
        { type: 'exclusive_offer', description: 'Uses exclusive program' },
        { type: 'deadline', description: 'Application deadline' },
      ],
      verificationHints: ['Verify certification program exists', 'Apply through official portal'],
    },
  },
  {
    name: 'D4: Secure File Transfer Request',
    subject: 'Secure File Transfer - Sensitive Documents',
    body: `Dear Recipient,

You have received a secure file transfer.

Sender: Legal Department
Subject: Legal Documents - Confidential

Transfer ID: SFT-2024-84729
Expires: March 25, 2024

Download Files:
https://transfer.vendorcartel.example.net/download/SFT-2024-84729

Password will be sent separately.

Secure Transfer Team
secure@vendorcartel.example.net`,
    fromName: 'Secure Transfer',
    fromEmail: 'secure@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'malware_delivery',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 7,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'secure_transfer', description: 'Fake secure file transfer' },
        { type: 'sensitive_documents', description: 'Uses confidential context' },
        { type: 'expiration', description: 'File expires soon' },
      ],
      verificationHints: ['Verify transfer with sender', 'Check if you were expecting files'],
    },
  },
  {
    name: 'D4: Vendor Account Upgrade',
    subject: 'Account Upgrade Available - Enhanced Features',
    body: `Dear Customer,

Your account is eligible for an upgrade!

New Plan: Enterprise Plus
Features:
- Unlimited API calls
- Dedicated infrastructure
- 24/7 support
- Custom integrations

Upgrade Now:
https://billing.vendorcartel.example.net/upgrade?customer=ACMECORP

Special Offer: 20% off first year

Sales Team
sales@vendorcartel.example.net`,
    fromName: 'Sales Team',
    fromEmail: 'sales@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 7,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'account_upgrade', description: 'Fake account upgrade' },
        { type: 'special_offer', description: 'Uses discount offer' },
        { type: 'vendor_billing', description: 'Targets billing information' },
      ],
      verificationHints: ['Verify upgrade in account portal', 'Check billing directly'],
    },
  },
  {
    name: 'D4: System Integration Consulting',
    subject: 'Free Consulting Session - Integration Assessment',
    body: `Dear IT Manager,

Book your free integration consulting session.

Session Includes:
- Current architecture review
- Optimization recommendations
- Security assessment

Book Session:
https://consulting.vendorcartel.example.net/book?company=ACMECORP

Limited availability for Q2.

Solutions Engineering
solutions@vendorcartel.example.net`,
    fromName: 'Solutions Engineering',
    fromEmail: 'solutions@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 7,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'consulting_offer', description: 'Fake consulting offer' },
        { type: 'free_session', description: 'Uses free offer' },
        { type: 'technical_target', description: 'Targets technical decision maker' },
      ],
      verificationHints: ['Verify consulting availability', 'Check vendor website'],
    },
  },
  {
    name: 'D4: Data Export Request',
    subject: 'Data Export Ready - Download Within 7 Days',
    body: `Dear Customer,

Your data export is ready for download.

Export ID: EXP-2024-84729
Data Period: January - February 2024
Size: 2.5 GB

Download:
https://data.vendorcartel.example.net/export/download/EXP-2024-84729

Link expires: April 1, 2024

Data Management Team
data@vendorcartel.example.net`,
    fromName: 'Data Management',
    fromEmail: 'data@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'malware_delivery',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 7,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'data_export', description: 'Fake data export' },
        { type: 'expiration', description: 'Link expires soon' },
        { type: 'sensitive_data', description: 'Contains company data' },
      ],
      verificationHints: ['Verify export request was made', 'Check data exports in portal'],
    },
  },
  {
    name: 'D5: Critical Supply Chain Alert',
    subject: 'CRITICAL: Supply Chain Disruption Alert',
    body: `URGENT NOTIFICATION

A critical supply chain disruption has been identified affecting your account.

Impact: Service Degradation Expected
Severity: Critical
Affected Systems: All Integration Points

Immediate Action Required:
https://status.vendorcartel.example.net/alert/critical-2024

We are working to resolve this issue. Updates will be provided as available.

Our team is available for immediate support.

Incident Response
incident@vendorcartel.example.net`,
    fromName: 'Incident Response',
    fromEmail: 'incident@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 7,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'critical_alert', description: 'Fake critical alert' },
        { type: 'urgency', description: 'Requires immediate action' },
        { type: 'service_disruption', description: 'Claims service impact' },
      ],
      verificationHints: ['Check vendor status page', 'Verify with support team'],
    },
  },
  {
    name: 'D5: Premium Support Upgrade Required',
    subject: 'Premium Support Upgrade Required - Response Time Change',
    body: `Dear Valued Customer,

Your support tier will be downgraded to Standard on April 1, 2024.

Current Tier: Premium
New Tier: Standard
Reason: Non-payment of premium features

Upgrade to Maintain Premium:
https://billing.vendorcartel.example.net/premium/upgrade

Response Time Impact:
Premium: 1 hour
Standard: 24 hours

Upgrade Now:
billing@vendorcartel.example.net`,
    fromName: 'Billing Department',
    fromEmail: 'billing@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 7,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'support_downgrade', description: 'Fake support downgrade threat' },
        { type: 'urgency', description: 'Deadline approaching' },
        { type: 'payment_pressure', description: 'Creates payment pressure' },
      ],
      verificationHints: ['Check billing status in portal', 'Verify with account manager'],
    },
  },
  // Additional Act II templates (Chapter 8) - +8
  {
    name: 'D4: Chain of Custody Audit',
    subject: 'Chain of Custody Documentation Required',
    body: `Dear Compliance Officer,

As part of our security certification, we need chain of custody documentation.

Required Documents:
- Vendor list with contact information
- Integration architecture diagram
- Data flow documentation
- Security control evidence

Upload Documents:
https://audit.vendorcartel.example.net/custody/upload

Deadline: April 7, 2024

Security Certification Team
security@vendorcartel.example.net`,
    fromName: 'Security Certification',
    fromEmail: 'security@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 8,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'audit_documentation', description: 'Fake audit request' },
        { type: 'document_collection', description: 'Collects sensitive documents' },
        { type: 'vendor_trust', description: 'Uses vendor certification' },
      ],
      verificationHints: ['Verify audit with vendor', 'Check if certification is required'],
    },
  },
  {
    name: 'D4: Integration SLA Review',
    subject: 'SLA Compliance Review - Action Required',
    body: `Dear Customer,

Your integration SLA compliance is below threshold.

Current Compliance: 87%
Required: 95%

Integration: Production API
Review Details:
https://sla.vendorcartel.example.net/compliance/2024

Please investigate and implement improvements within 30 days.

If you need assistance, contact your technical account manager.

Technical Support
support@vendorcartel.example.net`,
    fromName: 'Technical Support',
    fromEmail: 'support@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'spear_phishing',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 8,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'sla_compliance', description: 'Fake SLA review' },
        { type: 'performance_pressure', description: 'Creates pressure on performance' },
        { type: 'vendor_relationship', description: 'Uses vendor SLA context' },
      ],
      verificationHints: ['Check SLA metrics in portal', 'Verify with TAM'],
    },
  },
  {
    name: 'D4: Vendor Risk Assessment',
    subject: 'Vendor Risk Assessment - Questionnaire Required',
    body: `Dear Security Team,

Complete the annual vendor risk assessment questionnaire.

Assessment:
https://risk.vendorcartel.example.net/assessment/annual

Topics Covered:
- Security policies
- Data protection
- Incident response
- Business continuity
- Access controls

Completion Deadline: April 15, 2024

Risk Management
risk@vendorcartel.example.net`,
    fromName: 'Risk Management',
    fromEmail: 'risk@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 8,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'risk_assessment', description: 'Fake risk questionnaire' },
        { type: 'security_focus', description: 'Targets security team' },
        { type: 'sensitive_data', description: 'Collects security details' },
      ],
      verificationHints: ['Verify with vendor risk team', 'Check if assessment is required'],
    },
  },
  {
    name: 'D5: Data Residency Update',
    subject: 'Data Residency Requirement - Immediate Action',
    body: `URGENT: Data Residency Compliance

Due to new data protection regulations, you must select your data residency region.

Current Options:
- US East
- US West
- EU (Frankfurt)
- APAC (Singapore)

Make Selection:
https://admin.vendorcartel.example.net/data-region

Deadline: 7 Days

Failure to select may result in default placement.

Data Governance
governance@vendorcartel.example.net`,
    fromName: 'Data Governance',
    fromEmail: 'governance@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 8,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'data_residency', description: 'Fake data residency requirement' },
        { type: 'urgency', description: '7-day deadline' },
        { type: 'compliance_threat', description: 'Uses regulatory pressure' },
      ],
      verificationHints: ['Verify with vendor legal', 'Check data residency settings in portal'],
    },
  },
  {
    name: 'D5: Production Access Revocation',
    subject: 'Production Access Will Be Revoked',
    body: `NOTICE: Production Access Revocation

Your production API access will be revoked in 14 days due to compliance violations.

Violation Details:
https://compliance.vendorcartel.example.net/violations/84729

To maintain access, you must:
1. Resolve all compliance violations
2. Submit compliance evidence
3. Pass security review

Contact: compliance@vendorcartel.example.net

Compliance Team`,
    fromName: 'Compliance Team',
    fromEmail: 'compliance@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 8,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'access_revocation', description: 'Fake access revocation threat' },
        { type: 'compliance_violation', description: 'Claims violations exist' },
        { type: 'urgency', description: '14-day deadline' },
      ],
      verificationHints: ['Check compliance status in portal', 'Verify with compliance team'],
    },
  },
  {
    name: 'D5: Critical Integration Failure',
    subject: 'CRITICAL: Integration Failure Detected',
    body: `CRITICAL ALERT

Your integration has failed critical health checks.

Integration: Production API
Status: FAILED
Error Rate: 78%

View Details:
https://monitor.vendorcartel.example.net/failure/84729

Immediate investigation required. Your system may be compromised.

Contact support immediately:
support@vendorcartel.example.net

Operations Center`,
    fromName: 'Operations Center',
    fromEmail: 'ops@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Vendor Cartel',
    attackType: 'malware_delivery',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 8,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'critical_failure', description: 'Fake critical failure' },
        { type: 'high_error_rate', description: 'Alerts of severe issues' },
        { type: 'compromised_system', description: 'Suggests compromise' },
      ],
      verificationHints: ['Check monitoring directly', 'Verify with operations team'],
    },
  },
  {
    name: 'D5: Supply Chain Verification',
    subject: 'Supply Chain Verification Required - New Requirements',
    body: `Dear Partner,

New supply chain verification requirements effective immediately.

Complete Verification:
https://supply.vendorcartel.example.net/verify/new-requirements

New Requirements:
- Supplier origin documentation
- Component traceability
- Manufacturing location
- Security attestation

Deadline: 10 Days

Failure to comply may result in partnership review.

Supply Chain Security
supplychain@vendorcartel.example.net`,
    fromName: 'Supply Chain Security',
    fromEmail: 'supplychain@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 8,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'supply_chain_verification', description: 'Fake supply chain verification' },
        { type: 'new_requirements', description: 'Uses new requirements' },
        { type: 'deadline', description: '10-day deadline' },
      ],
      verificationHints: ['Verify with supply chain team', 'Check official requirements'],
    },
  },
  {
    name: 'D5: Emergency Integration Lockdown',
    subject: 'Emergency: Integration Lockdown Initiated',
    body: `EMERGENCY NOTIFICATION

An emergency lockdown has been initiated on your integration due to suspicious activity.

Integration: Production API
Status: LOCKED
Reason: Suspicious API behavior detected

Respond to this alert:
https://security.vendorcartel.example.net/emergency/respond/84729

If you do not respond within 4 hours, integration will remain locked.

Security Operations
soc@vendorcartel.example.net`,
    fromName: 'Security Operations',
    fromEmail: 'soc@vendorcartel.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Vendor Cartel',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 8,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'emergency_lockdown', description: 'Fake emergency lockdown' },
        { type: 'suspicious_activity', description: 'Claims suspicious behavior' },
        { type: 'short_deadline', description: '4-hour deadline' },
      ],
      verificationHints: ['Check integration status in portal', 'Verify with security team'],
    },
  },
  // Additional Act III templates (Chapter 9) - +7
  {
    name: 'D4: Suspicious Login Alert',
    subject: 'Suspicious Login Detected - Action Required',
    body: `Security Alert

We detected a suspicious login to your account.

Login Details:
Location: Unknown
IP Address: 185.234.72.15
Device: Unknown
Time: March 15, 2024 03:42 AM

If this was not you, secure your account immediately:

Secure Account:
https://security.nexionindustries.example.net/secure/account

Account Security Team
security@nexionindustries.example.net`,
    fromName: 'Account Security',
    fromEmail: 'security@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Nexion Industries',
    attackType: 'credential_harvesting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 9,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'suspicious_login', description: 'Fake login alert' },
        { type: 'urgency', description: 'Requires immediate action' },
        { type: 'domain_spoof', description: 'Spoofs Nexion Industries' },
      ],
      verificationHints: ['Check login history in portal', 'Verify with security team'],
    },
  },
  {
    name: 'D4: APT Intelligence Report',
    subject: 'Confidential: APT Activity Intelligence Report',
    body: `CLASSIFIED INTELLIGENCE BRIEF

Threat Actor: APT-29 Indicators
Target: Financial Sector
Type: Advanced Persistent Threat

Briefing:
https://intel.nexionindustries.example.net/apt/2024/quarterly

This report contains:
- IOCs and TTPs
- Victim profiles
- Attack timelines
- Recommended responses

Distribution: Authorized Personnel Only

Intelligence Team
intel@nexionindustries.example.net`,
    fromName: 'Intelligence Team',
    fromEmail: 'intel@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 9,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'apt_intel', description: 'Fake APT intelligence' },
        { type: 'classified', description: 'Uses classification appeal' },
        { type: 'targeted', description: 'Targets security professionals' },
      ],
      verificationHints: ['Verify intel source', 'Check with threat intelligence team'],
    },
  },
  {
    name: 'D4: Insider Threat Indicator',
    subject: 'Insider Threat Investigation - Your Input Required',
    body: `CONFIDENTIAL

We are conducting an insider threat investigation and need your input.

Employee: [REDACTED]
Department: IT Operations
Suspicious Activity: Unusual data access patterns

Review Details:
https://investigation.nexionindustries.example.net/insider/84729

Please provide any relevant information by March 25.

This is confidential - do not discuss with others.

Insider Threat Team
insider@nexionindustries.example.net`,
    fromName: 'Insider Threat Team',
    fromEmail: 'insider@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 4,
    faction: 'Nexion Industries',
    attackType: 'pretexting',
    threatLevel: 'HIGH',
    season: 1,
    chapter: 9,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'insider_threat', description: 'Fake insider threat investigation' },
        { type: 'confidential', description: 'Uses confidentiality' },
        { type: 'social_engineering', description: 'Targets employee curiosity' },
      ],
      verificationHints: [
        'Verify with HR or security',
        'Do not click links in confidential emails',
      ],
    },
  },
  {
    name: 'D5: Lateral Movement Detected',
    subject: 'CRITICAL: Lateral Movement Detected on Network',
    body: `CRITICAL SECURITY ALERT

Lateral movement has been detected on your network.

Alert Details:
Source: Workstation-ACME-042
Target: Domain Controllers
Time: March 15, 2024 02:15 AM

Full Incident Report:
https://soc.nexionindustries.example.net/incident/lateral-84729

Immediate response required. This may indicate active intrusion.

Security Operations Center
soc@nexionindustries.example.net`,
    fromName: 'Security Operations Center',
    fromEmail: 'soc@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 9,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'lateral_movement', description: 'Fake security alert' },
        { type: 'critical', description: 'Critical severity' },
        { type: 'incident_response', description: 'Targets incident response' },
      ],
      verificationHints: ['Check SIEM directly', 'Verify with SOC team'],
    },
  },
  {
    name: 'D5: Data Exfiltration Attempt',
    subject: 'ALERT: Data Exfiltration Attempt Detected',
    body: `DATA LOSS PREVENTION ALERT

Data exfiltration attempt detected.

Details:
Source: HR-Database-01
Destination: External IP 192.99.178.55
Data Type: PII
Volume: 50MB

View Alert:
https://dlp.nexionindustries.example.net/alert/exfil-84729

Immediate investigation required.

DLP Team
dlp@nexionindustries.example.net`,
    fromName: 'DLP Team',
    fromEmail: 'dlp@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 9,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'data_exfiltration', description: 'Fake DLP alert' },
        { type: 'pii_involved', description: 'Involves sensitive data' },
        { type: 'external_destination', description: 'External IP destination' },
      ],
      verificationHints: ['Check DLP console', 'Verify with security team'],
    },
  },
  {
    name: 'D5: VERITAS Contact',
    subject: 'Secure Communication Channel Established',
    body: `CONFIDENTIAL - VERITAS CONTACT

Secure channel established for coordination.

This message confirms our earlier discussion regarding the threat landscape.

Communication Protocol:
https://secure.veritas-network.example.net/channel/established

Use this channel for sensitive discussions.

Awaiting your response.

Contact: Marcus Chen
Codename: ARCHIVIST
Verified: YES

DO NOT FORWARD`,
    fromName: 'ARCHIVIST',
    fromEmail: 'archivist@veritas-network.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Librarians',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 9,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'veritas_contact', description: 'Fake VERITAS contact' },
        { type: 'secure_channel', description: 'Claims secure channel' },
        { type: 'codename', description: 'Uses codename' },
      ],
      verificationHints: ['Verify through official channels', 'Do not trust unverified contacts'],
    },
  },
  {
    name: 'D5: Executive Compromise Alert',
    subject: 'URGENT: Executive Account Compromised',
    body: `URGENT INCIDENT

Executive account compromise detected.

Affected: CEO John Henderson
Compromised: Email, Calendar
Access: Unauthorized

Incident Details:
https://incident.nexionindustries.example.net/executive/84729

Actions Taken:
- Account locked
- MFA tokens reset
- Forensic investigation started

Contact incident team immediately if you receive unusual requests.

Incident Response
incident@nexionindustries.example.net`,
    fromName: 'Incident Response',
    fromEmail: 'incident@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 9,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'executive_compromise', description: 'Fake executive compromise' },
        { type: 'urgency', description: 'Urgent incident' },
        { type: 'response_needed', description: 'Requires response' },
      ],
      verificationHints: ['Verify with executive assistant', 'Check incident management system'],
    },
  },
  // Additional Act III templates (Chapter 10) - +7
  {
    name: 'D5: Domain Admin Privilege Escalation',
    subject: 'CRITICAL: Domain Admin Privilege Escalation',
    body: `PRIVILEGE ESCALATION ALERT

Privilege escalation to Domain Admin detected.

User: svc_backup
New Privilege: Domain Admins
Time: March 15, 2024 04:30 AM
Source: Backup Server

Full Details:
https://iam.nexionindustries.example.net/alert/priv-esc-84729

This is a critical security incident. Immediate response required.

Identity & Access Management
iam@nexionindustries.example.net`,
    fromName: 'Identity & Access Management',
    fromEmail: 'iam@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 10,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'privilege_escalation', description: 'Fake privilege escalation' },
        { type: 'domain_admin', description: 'Involves domain admin' },
        { type: 'critical', description: 'Critical alert' },
      ],
      verificationHints: ['Check identity logs', 'Verify with IAM team'],
    },
  },
  {
    name: 'D5: Service Account Abuse',
    subject: 'Service Account Abuse Detected',
    body: `SERVICE ACCOUNT ALERT

Service account behavior deviation detected.

Account: svc_integration
Behavior: Unusual API calls
Pattern: Data staging
Volume: 500MB queued

View Analysis:
https://monitor.nexionindustries.example.net/service/svc_integration

This may indicate account compromise or misuse.

Security Monitoring
monitor@nexionindustries.example.net`,
    fromName: 'Security Monitoring',
    fromEmail: 'monitor@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 10,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'service_account', description: 'Fake service account alert' },
        { type: 'data_staging', description: 'Suggests data staging' },
        { type: 'behavioral', description: 'Behavioral analysis alert' },
      ],
      verificationHints: ['Check service account activity', 'Verify with monitoring team'],
    },
  },
  {
    name: 'D5: Backup Server Compromise',
    subject: 'CRITICAL: Backup Server Compromise Detected',
    body: `CRITICAL INCIDENT

Backup server shows signs of compromise.

Server: BACKUP-01
Indicators:
- Unknown processes
- External connections
- Modified backup integrity

Incident Report:
https://incident.nexionindustries.example.net/backup-compromise

Immediate isolation recommended.

Incident Response Team
incident@nexionindustries.example.net`,
    fromName: 'Incident Response Team',
    fromEmail: 'incident@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'malware_delivery',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 10,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'backup_compromise', description: 'Fake backup compromise' },
        { type: 'critical', description: 'Critical incident' },
        { type: 'isolation', description: 'Recommends isolation' },
      ],
      verificationHints: ['Verify with infrastructure team', 'Check backup logs'],
    },
  },
  {
    name: 'D5: Database Export Request',
    subject: 'Large Database Export Requested',
    body: `ADMIN ALERT

Large database export has been requested.

Database: CUSTOMER_DB
Records: 2.5 Million
Requested By: hr_manager
Approval Status: PENDING

Review Request:
https://admin.nexionindustries.example.net/db-export/pending

Please review and approve/reject.

Database Administration
dba@nexionindustries.example.net`,
    fromName: 'Database Administration',
    fromEmail: 'dba@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 10,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'database_export', description: 'Fake database export alert' },
        { type: 'large_volume', description: 'Large data volume' },
        { type: 'pending_approval', description: 'Requires approval' },
      ],
      verificationHints: ['Verify with database team', 'Check admin console'],
    },
  },
  {
    name: 'D5: C2 Communication Detected',
    subject: 'CRITICAL: C2 Communication Detected',
    body: `CRITICAL THREAT DETECTION

Command and control communication detected.

Infected System: WORKSTATION-127
C2 Server: evil-domain.example.net
Protocol: HTTPS
Frequency: Every 60 seconds

Threat Analysis:
https://threat.nexionindustries.example.net/c2/detection-84729

System isolation recommended.

Threat Intelligence
threat@nexionindustries.example.net`,
    fromName: 'Threat Intelligence',
    fromEmail: 'threat@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 10,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'c2_communication', description: 'Fake C2 detection' },
        { type: 'critical', description: 'Critical threat' },
        { type: 'isolation', description: 'Recommends isolation' },
      ],
      verificationHints: ['Check endpoint detection', 'Verify with threat team'],
    },
  },
  {
    name: 'D5: Ransomware Indicator',
    subject: 'RANSOMWARE INDICATORS DETECTED',
    body: `CRITICAL ALERT

Ransomware indicators detected on network.

Indicators:
- Mass file encryption
- Shadow copies deleted
- Ransom notes created

Affected Systems: 12
Spread: Active

Incident Response:
https://incident.nexionindustries.example.net/ransomware/active

ISOLATE IMMEDIATELY

Incident Command
incident@nexionindustries.example.net`,
    fromName: 'Incident Command',
    fromEmail: 'incident@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'malware_delivery',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 10,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'ransomware', description: 'Fake ransomware alert' },
        { type: 'critical', description: 'Critical incident' },
        { type: 'mass_impact', description: 'Multiple systems affected' },
      ],
      verificationHints: ['Verify with incident response', 'Check EDR console'],
    },
  },
  {
    name: 'D5: Multi-Faction Coordination Alert',
    subject: 'Multi-Faction Attack Coordination Detected',
    body: `THREAT INTELLIGENCE ALERT

Coordinated attack from multiple factions detected.

Factions Identified:
- Nexion Industries
- Criminal Networks
- Hacktivists

Attack Vector: Coordinated
Target: Critical Infrastructure

Briefing:
https://intel.nexionindustries.example.net/multi-faction/alert

This represents an unprecedented threat level.

Threat Analysis Team
intel@nexionindustries.example.net`,
    fromName: 'Threat Analysis Team',
    fromEmail: 'intel@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 10,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'multi_faction', description: 'Fake multi-faction alert' },
        { type: 'coordinated_attack', description: 'Claims coordination' },
        { type: 'critical', description: 'Critical threat' },
      ],
      verificationHints: ['Verify with threat intelligence', 'Check for indicators'],
    },
  },
  // Additional Act III templates (Chapter 11) - +8
  {
    name: 'D5: Data Exfiltration in Progress',
    subject: 'CRITICAL: Active Data Exfiltration',
    body: `CRITICAL - ACTIVE EXFILTRATION

Data exfiltration in progress.

Source: File-Server-01
Destination: 192.99.178.55
Data Type: Financial Records
Rate: 50 MB/hour

STOP EXFILTRATION:
https://dlp.nexionindustries.example.net/stop/active-84729

Immediate action required.

DLP Operations
dlp-ops@nexionindustries.example.net`,
    fromName: 'DLP Operations',
    fromEmail: 'dlp-ops@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 11,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'active_exfiltration', description: 'Fake active exfiltration' },
        { type: 'critical', description: 'Critical alert' },
        { type: 'immediate_action', description: 'Requires immediate action' },
      ],
      verificationHints: ['Verify with DLP', 'Check network traffic'],
    },
  },
  {
    name: 'D5: Complete System Access',
    subject: 'Full System Access Achieved - Threat Actor',
    body: `CRITICAL THREAT NOTIFICATION

Threat actor has achieved full system access.

Compromised:
- Domain Admin credentials
- All servers
- Complete network

Full Assessment:
https://incident.nexionindustries.example.net/full-access

This is a complete compromise.

Incident Response
incident@nexionindustries.example.net`,
    fromName: 'Incident Response',
    fromEmail: 'incident@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 11,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'full_access', description: 'Fake full access alert' },
        { type: 'complete_compromise', description: 'Indicates complete compromise' },
        { type: 'critical', description: 'Critical threat' },
      ],
      verificationHints: ['Verify with incident response', 'Check account status'],
    },
  },
  {
    name: 'D5: Intellectual Property Theft',
    subject: 'ALERT: Intellectual Property Access',
    body: `CRITICAL - IP THEFT DETECTED

Unauthorized access to intellectual property detected.

Accessed:
- Source code repositories
- Engineering documents
- Product blueprints

Access Details:
https://dlp.nexionindustries.example.net/ip-theft/84729

Legal notification may be required.

IP Protection Team
ip-protection@nexionindustries.example.net`,
    fromName: 'IP Protection Team',
    fromEmail: 'ip-protection@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 11,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'ip_theft', description: 'Fake IP theft alert' },
        { type: 'sensitive_data', description: 'Involves sensitive IP' },
        { type: 'legal', description: 'Suggests legal action' },
      ],
      verificationHints: ['Verify with legal team', 'Check access logs'],
    },
  },
  {
    name: 'D5: Complete Network Map',
    subject: 'Complete Network Topology Exposed',
    body: `CRITICAL - NETWORK EXPOSED

Complete network topology has been accessed.

Exposed:
- All network segments
- Security infrastructure
- Backup locations
- Disaster recovery sites

Full Assessment:
https://soc.nexionindustries.example.net/network-exposed

This represents strategic compromise.

Network Security
netsec@nexionindustries.example.net`,
    fromName: 'Network Security',
    fromEmail: 'netsec@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 11,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'network_exposed', description: 'Fake network exposure' },
        { type: 'topology', description: 'Network topology accessed' },
        { type: 'critical', description: 'Critical security issue' },
      ],
      verificationHints: ['Verify with network team', 'Check access logs'],
    },
  },
  {
    name: 'D5: Customer Data Breach',
    subject: 'CUSTOMER DATA BREACH NOTIFICATION',
    body: `CRITICAL - CUSTOMER BREACH

Customer data breach detected.

Compromised:
- Customer names
- Email addresses
- Account numbers
- Transaction history

Incident Report:
https://incident.nexionindustries.example.net/customer-breach

Regulatory notification required within 72 hours.

Compliance Incident
compliance@nexionindustries.example.net`,
    fromName: 'Compliance Incident',
    fromEmail: 'compliance@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 11,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'customer_breach', description: 'Fake customer breach' },
        { type: 'pii', description: 'Involves customer PII' },
        { type: 'regulatory', description: 'Regulatory implications' },
      ],
      verificationHints: ['Verify with compliance', 'Check incident reports'],
    },
  },
  {
    name: 'D5: Cloud Infrastructure Compromise',
    subject: 'CRITICAL: Cloud Infrastructure Compromised',
    body: `CLOUD SECURITY ALERT

Cloud infrastructure has been compromised.

Compromised Resources:
- AWS Root Account
- All S3 Buckets
- Production Databases
- API Gateways

Full Assessment:
https://cloudsec.nexionindustries.example.net/incident/cloud-84729

Immediate action required.

Cloud Security
cloudsec@nexionindustries.example.net`,
    fromName: 'Cloud Security',
    fromEmail: 'cloudsec@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'malware_delivery',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 11,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'cloud_compromise', description: 'Fake cloud compromise' },
        { type: 'critical', description: 'Critical incident' },
        { type: 'infrastructure', description: 'Infrastructure affected' },
      ],
      verificationHints: ['Verify with cloud team', 'Check cloudtrail logs'],
    },
  },
  {
    name: 'D5: Destruction of Evidence',
    subject: 'Evidence Destruction Detected',
    body: `CRITICAL - EVIDENCE TAMPERING

Evidence destruction detected on compromised systems.

Deleted:
- Security logs
- Audit trails
- Historical data

Evidence Preservation:
https://forensics.nexionindustries.example.net/tampering-84729

Forensic chain of custody may be compromised.

Digital Forensics
forensics@nexionindustries.example.net`,
    fromName: 'Digital Forensics',
    fromEmail: 'forensics@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 11,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'evidence_tampering', description: 'Fake evidence tampering' },
        { type: 'log_deletion', description: 'Security logs deleted' },
        { type: 'forensic', description: 'Forensic implications' },
      ],
      verificationHints: ['Verify with forensics team', 'Check SIEM'],
    },
  },
  {
    name: 'D5: Physical Security Breach',
    subject: 'Physical Security Integration Alert',
    body: `PHYSICAL SECURITY ALERT

Physical security systems accessed through network compromise.

Affected Systems:
- Badge access logs
- Camera footage
- HVAC control
- Building automation

Full Assessment:
https://physsec.nexionindustries.example.net/breach/84729

Physical security team notified.

Physical Security Operations
physsec@nexionindustries.example.net`,
    fromName: 'Physical Security',
    fromEmail: 'physsec@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 11,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'physical_security', description: 'Fake physical security alert' },
        { type: 'building_systems', description: 'Building systems accessed' },
        { type: 'integration', description: 'Network-physical integration' },
      ],
      verificationHints: ['Verify with physical security', 'Check access logs'],
    },
  },
  // Additional Finale templates (Chapter 12) - +6
  {
    name: 'D5: Archive Gate Access',
    subject: 'Archive Access Attempt - Authentication Required',
    body: `ARCHIVE SECURITY ALERT

Access attempt to Archive Gate detected.

Request Origin: Internal Network
Target: The Archive
Security Level: Maximum

Authenticate Access:
https://archive.nexionindustries.example.net/auth/gate-84729

Unauthorized access will trigger containment protocols.

Archive Security
archive@nexionindustries.example.net`,
    fromName: 'Archive Security',
    fromEmail: 'archive@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 12,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'archive_access', description: 'Archive gate attack' },
        { type: 'security_protocol', description: 'Uses security protocols' },
        { type: 'finale', description: 'Finale scenario' },
      ],
      verificationHints: ['Verify with security team', 'Check archive access logs'],
    },
  },
  {
    name: 'D5: Morpheus Final Message',
    subject: 'The Truth About Archive',
    body: `YOU HAVE REACHED THE END.

The Archive contains everything. Your history. Your secrets. Your fate.

But first, you must answer:

Do you seek the truth, or safety?

Choose wisely.

- M.

Open Archive:
https://archive-gate.final.example.net/choose/your-path`,
    fromName: 'M.',
    fromEmail: 'm@archive-gate.final.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 12,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'morpheus_final', description: 'Final Morpheus contact' },
        { type: 'philosophical', description: 'Philosophical choice' },
        { type: 'archive', description: 'References Archive' },
      ],
      verificationHints: ['This is part of the finale', 'Make your choice'],
    },
  },
  {
    name: 'D5: Emergency System Shutdown',
    subject: 'EMERGENCY: System Shutdown Initiated',
    body: `EMERGENCY BROADCAST

Emergency system shutdown has been initiated.

Reason: Security Breach - Archive Gate
Systems Affected: ALL
Shutdown Time: IMMEDIATE

Emergency Protocol:
https://emergency.nexionindustries.example.net/shutdown/confirm

If you are not part of the response team, evacuate immediately.

Emergency Command
emergency@nexionindustries.example.net`,
    fromName: 'Emergency Command',
    fromEmail: 'emergency@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 12,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'emergency_shutdown', description: 'Fake emergency shutdown' },
        { type: 'critical', description: 'Critical emergency' },
        { type: 'immediate', description: 'Immediate action' },
      ],
      verificationHints: ['Verify with emergency team', 'Check emergency protocols'],
    },
  },
  {
    name: 'D5: Final Breach Attempt',
    subject: 'FINAL BREACH: All Defenses Compromised',
    body: `CRITICAL FAILURE

All security defenses have been compromised.

Breach Status: COMPLETE
Attacker Access: ROOT
Control: LOST

Final Status Report:
https://incident.final.example.net/breach-complete

The Archive has been accessed.

Incident Command
incident@nexionindustries.example.net`,
    fromName: 'Incident Command',
    fromEmail: 'incident@nexionindustries.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'spear_phishing',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 12,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'final_breach', description: 'Final breach scenario' },
        { type: 'complete_failure', description: 'Complete failure' },
        { type: 'no_recovery', description: 'Suggests no recovery' },
      ],
      verificationHints: ['This is the finale', 'Incident response is critical'],
    },
  },
  {
    name: 'D5: Blackmail - Archive Secrets',
    subject: 'Archive Secrets - Your Choice',
    body: `WE HAVE YOUR SECRETS.

The Archive contains everything about you.

Your choice:
1. We expose everything - all your secrets become public
2. You cooperate - and the Archive remains secret

Choose option 2:
https://archive.blackmail.example.net/your-choice

You have 24 hours.

The Archivists
archive@blackmail.example.net`,
    fromName: 'The Archivists',
    fromEmail: 'archive@blackmail.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 12,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'blackmail', description: 'Blackmail scenario' },
        { type: 'archive_secrets', description: 'Archive secrets' },
        { type: 'threat', description: 'Threatens exposure' },
      ],
      verificationHints: ['This is part of finale', 'Make your choice carefully'],
    },
  },
  {
    name: 'D5: System Takeover Complete',
    subject: 'System Takeover Complete - Congratulations',
    body: `SYSTEMS SECURED.

Congratulations. You have successfully secured all systems.

The Archive is now under your control.
The threat has been neutralized.
Your organization is safe.

Final Report:
https://summary.final.example.net/complete

Thank you for playing.

Archive Command
archive@final.example.net`,
    fromName: 'Archive Command',
    fromEmail: 'archive@final.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Nexion Industries',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 12,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'victory', description: 'Victory scenario' },
        { type: 'secure_ending', description: 'Secure ending' },
        { type: 'complete', description: 'Game complete' },
      ],
      verificationHints: ['This is the secure ending', 'Congratulations'],
    },
  },
  // Additional Finale templates (Chapter 13) - +4
  {
    name: 'D5: Aftermath - Restoration',
    subject: 'Systems Restored - Welcome Back',
    body: `SYSTEMS RESTORED.

After the chaos, your organization has recovered.

Restoration Complete:
- Systems: ONLINE
- Data: RECOVERED
- Security: ENHANCED

Welcome back to a safer world.

Post-Incident Report:
https://report.restoration.example.net/summary

The Archive will guide you forward.

Morpheus
m@restoration.example.net`,
    fromName: 'Morpheus',
    fromEmail: 'm@restoration.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Librarians',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 13,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'restoration', description: 'Restoration ending' },
        { type: 'recovery', description: 'Systems recovered' },
        { type: 'new_beginning', description: 'New chapter' },
      ],
      verificationHints: ['This is the restoration ending', 'A new beginning awaits'],
    },
  },
  {
    name: 'D5: Aftermath - Sealed Archive',
    subject: 'Archive Sealed - Maximum Security',
    body: `ARCHIVE SEALED.

The Archive has been permanently sealed.

Your choice has protected millions.
But some knowledge is now lost forever.

Final Status:
https://status.sealed.example.net/permanent

The world will never know what was hidden here.

The Librarians
archive@sealed.example.net`,
    fromName: 'The Librarians',
    fromEmail: 'archive@sealed.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Librarians',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 13,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'sealed', description: 'Sealed ending' },
        { type: 'permanent', description: 'Permanent closure' },
        { type: 'sacrifice', description: 'Knowledge sacrificed' },
      ],
      verificationHints: ['This is the secure ending', 'Some things are better left unknown'],
    },
  },
  {
    name: 'D5: Aftermath - Rebirth',
    subject: 'The Archive Lives On',
    body: `THE ARCHIVE CONTINUES.

You chose to preserve all knowledge - even the dangerous.

The Archive now exists within you.
Its wisdom is your wisdom.
Its power is your power.

New Journey:
https://journey.rebirth.example.net/begin

The story continues...

M.
m@rebirth.example.net`,
    fromName: 'M.',
    fromEmail: 'm@rebirth.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Criminal Networks',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 13,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'rebirth', description: 'Rebirth ending' },
        { type: 'transformation', description: 'Transformation' },
        { type: 'power', description: 'Archive power' },
      ],
      verificationHints: ['This is the rebirth ending', 'Your journey continues'],
    },
  },
  {
    name: 'D5: Season Complete',
    subject: 'Season 1 Complete - Thank You',
    body: `SEASON 1 COMPLETE.

Thank you for playing The DMZ.

Your choices have shaped the narrative.
Your decisions have determined the outcome.

Season 2 Coming Soon:
https://dmzgame.example.net/season2

Stay tuned for more adventures.

The Archive
archive@dmzgame.example.net`,
    fromName: 'The Archive',
    fromEmail: 'archive@dmzgame.example.net',
    contentType: 'phishing',
    difficulty: 5,
    faction: 'Librarians',
    attackType: 'pretexting',
    threatLevel: 'SEVERE',
    season: 1,
    chapter: 13,
    locale: 'en-US',
    metadata: {
      signals: [
        { type: 'completion', description: 'Season complete' },
        { type: 'thank_you', description: 'Thank you message' },
        { type: 'season_2', description: 'Teases season 2' },
      ],
      verificationHints: ['Congratulations on completing Season 1', 'Thank you for playing'],
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
