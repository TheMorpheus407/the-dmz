export interface HelpTopic {
  id: string;
  name: string;
  description: string;
  content: string;
  category: HelpCategory;
}

export type HelpCategory = 'general' | 'email' | 'facility' | 'upgrades' | 'threats' | 'shortcuts';

export interface HelpCategoryInfo {
  id: HelpCategory;
  name: string;
  description: string;
}

export const HELP_CATEGORIES: HelpCategoryInfo[] = [
  {
    id: 'general',
    name: 'General',
    description: 'Game objective, day cycle, save/load, settings',
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Reading headers, indicators, verification packets, decisions',
  },
  {
    id: 'facility',
    name: 'Facility',
    description: 'Resources, upgrades, maintenance, clients',
  },
  {
    id: 'upgrades',
    name: 'Upgrades',
    description: 'Available upgrades and their effects',
  },
  {
    id: 'threats',
    name: 'Threats',
    description: 'Threat levels, attack types, defense',
  },
  {
    id: 'shortcuts',
    name: 'Shortcuts',
    description: 'Keyboard shortcuts reference',
  },
];

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'intro',
    name: 'intro',
    description: 'Introduction to MATRICES GmbH',
    category: 'general',
    content: `================================================================================
                    MATRICES GmbH OPERATOR MANUAL v4.7
                         SYSOP-7 Reference Guide
================================================================================

Welcome, Operator. You have been selected to manage the data archive 
facility for MATRICES GmbH following the Great Network Collapse.

YOUR MISSION:
-------------
Review incoming data storage requests from various factions and 
organizations. Approve legitimate requests, deny suspicious ones, 
and flag uncertain cases for senior review.

FACILITY STATUS:
---------------
- Facility Tier: STATION (base configuration)
- Resources: Rack space, power, cooling, bandwidth
- Revenue: Earn credits by serving legitimate clients
- Threats: Monitor threat level and defend against attacks

Type 'help general' for more on game objectives.
Type 'help shortcuts' for keyboard shortcuts.
`,
  },
  {
    id: 'general',
    name: 'general',
    description: 'Game objective and core mechanics',
    category: 'general',
    content: `================================================================================
                         GENERAL HELP
================================================================================

GAME OBJECTIVE:
---------------
Manage the MATRICES GmbH data archive facility. Review requests, 
optimize resources, and defend against threats to maximize 
revenue while minimizing security breaches.

DAY CYCLE:
----------
- Each day consists of a review phase and an end-of-day summary
- Advance to the next day with the N key
- Day time is displayed in the header (e.g., "Day 14 | 08:00 CEST")

RESOURCES:
----------
- FUNDS: Credits available for upgrades and operations
- RACKS: Storage rack space (U = units)
- POWER: Power consumption / capacity (kW)
- COOLING: Cooling system capacity (tons)
- BANDWIDTH: Network bandwidth (Mbps)

SAVE/LOAD:
----------
Game state is automatically saved to local storage. Use the 
browser's standard save functionality for manual backups.

SETTINGS:
---------
Access CRT effects, sound, and accessibility options via the 
settings panel (gear icon in header).

KEYBOARD SHORTCUTS:
-------------------
Press ? to view all keyboard shortcuts.
Press F1 for this help system.

================================================================================
Type 'help <topic>' for more information.
Topics: intro, general, email, facility, upgrades, threats, shortcuts
================================================================================
`,
  },
  {
    id: 'email',
    name: 'email',
    description: 'Email operations and verification',
    category: 'email',
    content: `================================================================================
                         EMAIL HELP
================================================================================

READING EMAILS:
---------------
- Click or use arrow keys (↑/↓) to select emails
- Press Enter to open selected email
- Email shows sender, subject, date, and risk indicators

EMAIL INDICATORS:
----------------
- [!] - Flagged for review
- [NEW] - Unread email
- [PENDING] - Awaiting decision
- [APPROVED] - Request granted
- [DENIED] - Request rejected

VERIFICATION PACKETS:
--------------------
Many requests include verification packets (attachments). Click 
to open and verify:
- Identity documents
- Chain of custody
- Institutional credentials

Decisions:
-----------
A - Approve the request
D - Deny the request  
F - Flag for review
V - Request additional verification

PHISHING ANALYSIS WORKSHEET:
-----------------------------
Press W during email triage to open the analysis worksheet.
Use this to systematically evaluate suspicious elements.

DOMAIN VERIFICATION:
--------------------
Click [VERIFY] next to sender domains to check against 
known registries. Look for:
- Domain age (recently registered = suspicious)
- TLD legitimacy (.edu, .gov = higher trust)
- Matching sender identity

================================================================================
Type 'help <topic>' for more information.
Topics: intro, general, email, facility, upgrades, threats, shortcuts
================================================================================
`,
  },
  {
    id: 'facility',
    name: 'facility',
    description: 'Facility management and resources',
    category: 'facility',
    content: `================================================================================
                       FACILITY HELP
================================================================================

RESOURCES:
---------
RACKS: Storage rack units (U). Each client requires specific 
       capacity. Monitor usage to plan upgrades.

POWER: Power consumption in kilowatts (kW). Exceeding 90% 
       capacity triggers warnings. Upgrades increase capacity.

COOLING: Cooling capacity in tons. Heat management is critical
         for system reliability. Upgrade cooling with power.

BANDWIDTH: Network throughput in Mbps. Higher bandwidth supports
           more clients with faster data transfers.

MAINTENANCE:
------------
Facility systems require periodic maintenance. Watch for 
degradation warnings and address them promptly.

CLIENTS:
--------
Your facility serves multiple clients simultaneously. Each client:
- Pays daily revenue based on storage size
- Has a contract duration (Days X-Y)
- May be affected by incidents or threats

View active clients in the facility dashboard.

INCIDENTS:
----------
When security incidents occur, respond quickly:
1. CONTAIN - Isolate affected systems
2. INVESTIGATE - Deploy forensic tools
3. FULL LOCKDOWN - Halt all operations
4. IGNORE - Continue monitoring (risky)

RECOMMENDED RESPONSE is based on current threat level and 
available security tools.

================================================================================
Type 'help <topic>' for more information.
Topics: intro, general, email, facility, upgrades, threats, shortcuts
================================================================================
`,
  },
  {
    id: 'upgrades',
    name: 'upgrades',
    description: 'Available upgrades and shop',
    category: 'upgrades',
    content: `================================================================================
                       UPGRADES HELP
================================================================================

UPGRADE SHOP:
-------------
Press M or click "UPGRADE SHOP" to access the upgrade catalog.
Upgrades improve facility capabilities and security.

CATEGORIES:
-----------
INFRASTRUCTURE:
- Racks: Increase storage capacity
- Power: Increase power capacity
- Cooling: Increase cooling capacity
- Bandwidth: Increase network throughput

SECURITY:
- Email Filter: Auto-flag suspicious emails
- IDS: Intrusion Detection System
- SIEM: Security Information and Event Management
- WAF: Web Application Firewall
- EDR: Endpoint Detection and Response
- Honey Pot: Deception technology
- AI Defense: AI-powered threat detection
- Zero-Trust Gateway: Zero-trust network architecture

STAFF:
- Hire Specialist: Add expert personnel
- Training: Improve decision accuracy

COSTS:
------
- Purchase cost: One-time credit payment
- Install time: Days until operational
- OpEx: Daily operating cost

RECOMMENDATIONS:
---------------
Early game: Focus on infrastructure (Racks, Power)
Mid game: Security tools to reduce threat impact
Late game: AI and advanced security for high difficulty

================================================================================
Type 'help <topic>' for more information.
Topics: intro, general, email, facility, upgrades, threats, shortcuts
================================================================================
`,
  },
  {
    id: 'threats',
    name: 'threats',
    description: 'Threat levels and defense',
    category: 'threats',
    content: `================================================================================
                       THREATS HELP
================================================================================

THREAT LEVELS:
--------------
Level 1 - LOW (Blue): Normal operations
Level 2 - GUARDED (Green): Minor activity detected
Level 3 - ELEVATED (Yellow): Increased vigilance required
Level 4 - HIGH (Orange): Active threats present
Level 5 - SEVERE (Red): Critical situation

THREAT INDICATORS:
------------------
- Shield icon shows damage state
- Segmented progress bar indicates level
- Color coding (Blue→Green→Yellow→Orange→Red)
- Always paired with text label

ATTACK TYPES:
-------------
PHISHING: Spoofed emails attempting to gain access
RECON: Port scanning and network probing
EXPLOIT: Vulnerability attacks against systems
MALWARE: Malicious software installation attempts
DDoS: Distributed denial of service attacks
INSIDER: Compromised internal actors

DEFENSE:
--------
- Email Filter: Blocks phishing attempts
- IDS: Detects reconnaissance and exploitation
- SIEM: Correlates security events
- WAF: Protects web interfaces
- EDR: Endpoint threat detection
- Honey Pot: Detects intrusion via deception
- AI Defense: Advanced threat pattern recognition

THREAT RESPONSE:
----------------
When threat level rises:
1. Check threat monitor for active threats
2. Review recent emails for suspicious activity
3. Ensure security tools are operational
4. Consider facility lockdown if severe

INCIDENT RESPONSE:
------------------
Active incidents require immediate response. Choose wisely -
wrong response can worsen the situation.

================================================================================
Type 'help <topic>' for more information.
Topics: intro, general, email, facility, upgrades, threats, shortcuts
================================================================================
`,
  },
  {
    id: 'shortcuts',
    name: 'shortcuts',
    description: 'Keyboard shortcuts reference',
    category: 'shortcuts',
    content: `================================================================================
                    KEYBOARD SHORTCUTS
================================================================================

CORE DECISION KEYS:
-------------------
A           Approve request
D           Deny request
F           Flag for review
V           Request verification

NAVIGATION:
-----------
↑ / ↓       Navigate email list
Enter       Select email / Confirm
Tab         Cycle between panels
Esc         Close modal / Cancel

EMAIL OPERATIONS:
-----------------
W           Open Phishing Analysis Worksheet
E           Cycle to next email
R           Refresh / Reload

FACILITY:
---------
H           Toggle facility dashboard
M           Open upgrade shop
N           Next day (at day end)

HELP:
-----
?           Toggle help overlay
F1          Show help system

CONTEXT SHORTCUTS:
------------------
Keyboard shortcuts vary by current game phase. The help 
overlay shows phase-specific shortcuts.

For terminal help, type 'help' in the command line.

================================================================================
Type 'help <topic>' for more information.
Topics: intro, general, email, facility, upgrades, threats, shortcuts
================================================================================
`,
  },
  {
    id: 'glossary',
    name: 'glossary',
    description: 'Terminology reference',
    category: 'general',
    content: `================================================================================
                       GLOSSARY
================================================================================

TERMINOLOGY:
------------
CREDITS (CR):   Primary game currency. Earned from clients, 
                spent on upgrades and operations.

TRUST SCORE:    Reputation metric affecting client quality 
                and faction relationships.

INTEL FRAGMENTS: Information pieces used to unlock story 
                 content and bonuses.

RACK (U):       Standard storage unit. 1U = approximately
                1 terabyte in base configuration.

THREAT LEVEL:   Current security posture (1-5 scale). 
                Higher = more danger.

INCIDENT:       Active security breach requiring response.

DAY:            Game time unit. Each day has review phase
                and summary phase.

FACILITY TIER:  Upgrade level determining base capabilities.
                Station → Hub → Nexus → Core.

OPEX:           Daily operating expenses.

CONTRACT:       Client agreement specifying storage terms,
                duration, and payment.

VERIFICATION:   Process of confirming request legitimacy
                through document review and domain checks.

================================================================================
Type 'help <topic>' for more information.
Topics: intro, general, email, facility, upgrades, threats, shortcuts
================================================================================
`,
  },
];

export function getHelpForTopic(topicId: string): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.id === topicId.toLowerCase());
}

export function getTopicsByCategory(category: HelpCategory): HelpTopic[] {
  return HELP_TOPICS.filter((t) => t.category === category);
}

export function getHelpIndex(): string {
  const categoryGroups = HELP_CATEGORIES.map((cat) => {
    const topics = getTopicsByCategory(cat.id);
    const topicList = topics.map((t) => `  ${t.name.padEnd(12)} - ${t.description}`).join('\n');
    return `--- ${cat.name.toUpperCase()} ---\n${cat.description}\n\n${topicList}`;
  }).join('\n\n');

  return `================================================================================
                    MATRICES GmbH OPERATOR MANUAL v4.7
                         SYSOP-7 Reference Guide
================================================================================

Type 'help <topic>' for detailed information on a specific topic.

${categoryGroups}

================================================================================
Examples:
  help email       - Email operations guide
  help threats    - Threat level reference
  help shortcuts - Keyboard shortcuts
================================================================================
`;
}
