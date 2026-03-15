import { sql } from 'drizzle-orm';

import { SEED_TENANT_IDS } from '@the-dmz/shared/testing';

import { factions, seasons, chapters, morpheusMessages } from '../../db/schema/content/index.js';

import { getDatabaseClient } from './connection.js';

const FACTION_KEYS = {
  SOVEREIGN_COMPACT: 'sovereign_compact',
  NEXION_INDUSTRIES: 'nexion_industries',
  LIBRARIANS: 'librarians',
  HACKTIVISTS: 'hacktivists',
  CRIMINAL_NETWORKS: 'criminal_networks',
  VENDOR_CARTEL: 'vendor_cartel',
} as const;

type FactionKey = (typeof FACTION_KEYS)[keyof typeof FACTION_KEYS];

interface FactionSeed {
  factionKey: FactionKey;
  displayName: string;
  description: string;
  motivations: string;
  communicationStyle: string;
}

const FACTION_DATA: FactionSeed[] = [
  {
    factionKey: FACTION_KEYS.SOVEREIGN_COMPACT,
    displayName: 'The Sovereign Compact',
    description:
      'The formalized remnants of national governments united under a desperate charter to preserve civilization. They control critical infrastructure and demand legitimacy through proper channels.',
    motivations:
      'Maintain order, restore essential services, protect citizen data, establish centralized control over recovery efforts.',
    communicationStyle: 'formal',
  },
  {
    factionKey: FACTION_KEYS.NEXION_INDUSTRIES,
    displayName: 'Nexion Industries',
    description:
      'A consortium of surviving corporations that have consolidated power through technology and resources. They view the collapse as an opportunity for market dominance.',
    motivations:
      'Profit maximization, market expansion, resource acquisition, influence over recovery infrastructure.',
    communicationStyle: 'corporate',
  },
  {
    factionKey: FACTION_KEYS.LIBRARIANS,
    displayName: 'The Librarians',
    description:
      'Academics, archivists, and preservationists dedicated to saving human knowledge. They operate hidden repositories and prioritize data integrity over speed.',
    motivations:
      'Knowledge preservation, academic freedom, data integrity, restoration of research capabilities.',
    communicationStyle: 'academic',
  },
  {
    factionKey: FACTION_KEYS.HACKTIVISTS,
    displayName: 'Hacktivist Collectives',
    description:
      'Underground tech communities that believe the old systems failed and deserve to stay fallen. They operate in shadows, distributing tools and knowledge freely.',
    motivations:
      'Information freedom, anti-establishment, decentralized networks, technological liberation.',
    communicationStyle: 'direct',
  },
  {
    factionKey: FACTION_KEYS.CRIMINAL_NETWORKS,
    displayName: 'Criminal Networks',
    description:
      'Pre-collapse organized crime that has evolved to exploit the chaos. They offer services that officially dont exist, for the right price.',
    motivations:
      'Profit through any means, exploitation of chaos, data as currency, survival of the ruthless.',
    communicationStyle: 'transactional',
  },
  {
    factionKey: FACTION_KEYS.VENDOR_CARTEL,
    displayName: 'Vendor Cartel',
    description:
      'Third-party suppliers and service providers who control critical supply chains. They position themselves as essential partners but have their own agenda.',
    motivations:
      'Maintain supply chain control, expand vendor relationships, leverage dependencies for influence.',
    communicationStyle: 'business',
  },
];

interface SeasonSeed {
  seasonNumber: number;
  title: string;
  theme: string;
  logline: string;
  description: string;
  threatCurveStart: string;
  threatCurveEnd: string;
}

const SEASON_DATA: SeasonSeed = {
  seasonNumber: 1,
  title: 'Signal Loss',
  theme: 'Survival through disciplined trust in a shattered network',
  logline:
    'The operator establishes the last reliable gate while learning to separate desperate allies from patient adversaries',
  description:
    'The first season introduces the world of The DMZ: Archive Gate. The player takes on the role of an operator at Matrices GmbH, one of the last functioning data centers after the NIDHOGG Stuxnet variant collapsed the public internet. Through progressively challenging email scenarios, the player learns to identify phishing attempts, verify legitimate requests, and make difficult access decisions while balancing survival and security.',
  threatCurveStart: 'LOW',
  threatCurveEnd: 'HIGH',
};

interface ChapterSeed {
  chapterNumber: number;
  act: number;
  title: string;
  description: string;
  dayStart: number;
  dayEnd: number;
  difficultyStart: number;
  difficultyEnd: number;
  threatLevel: string;
}

const CHAPTER_DATA: ChapterSeed[] = [
  {
    chapterNumber: 1,
    act: 1,
    title: 'Day Zero Intake',
    description:
      'The initial login experience. Introduction to Morpheus (director) and first access requests. Simple, obvious phishing emails with tutorial-style guidance.',
    dayStart: 1,
    dayEnd: 3,
    difficultyStart: 1,
    difficultyEnd: 1,
    threatLevel: 'LOW',
  },
  {
    chapterNumber: 2,
    act: 1,
    title: 'First Decisions',
    description:
      'Escalating difficulty with first verification packets. Introduction to factions through requests. Difficulty 1-2.',
    dayStart: 4,
    dayEnd: 7,
    difficultyStart: 1,
    difficultyEnd: 2,
    threatLevel: 'LOW',
  },
  {
    chapterNumber: 3,
    act: 1,
    title: 'Pressure Lines',
    description:
      'Difficulty 2-3. First multi-part requests. Faction reputation begins to develop. Introduces more sophisticated social engineering.',
    dayStart: 8,
    dayEnd: 12,
    difficultyStart: 2,
    difficultyEnd: 3,
    threatLevel: 'GUARDED',
  },
  {
    chapterNumber: 4,
    act: 1,
    title: 'Signal Collapse',
    description:
      'Difficulty 3. First incident introduction. The stakes rise as the player faces coordinated attack patterns.',
    dayStart: 13,
    dayEnd: 15,
    difficultyStart: 3,
    difficultyEnd: 3,
    threatLevel: 'ELEVATED',
  },
  // Act II: Supply Chain (Chapters 5-8)
  {
    chapterNumber: 5,
    act: 2,
    title: 'Vendor Outreach',
    description:
      'Introduction to third-party vendor threats. First contact from the Vendor Cartel. Supply chain basics.',
    dayStart: 16,
    dayEnd: 19,
    difficultyStart: 3,
    difficultyEnd: 4,
    threatLevel: 'ELEVATED',
  },
  {
    chapterNumber: 6,
    act: 2,
    title: 'Supply Lines',
    description:
      'Software update impersonation scenarios. Credential harvesting through vendor relationships.',
    dayStart: 20,
    dayEnd: 24,
    difficultyStart: 3,
    difficultyEnd: 4,
    threatLevel: 'ELEVATED',
  },
  {
    chapterNumber: 7,
    act: 2,
    title: 'Trusted Partners',
    description:
      'Compromised vendor scenarios. Multi-vector supply chain attacks. Facility upgrade narrative integration.',
    dayStart: 25,
    dayEnd: 28,
    difficultyStart: 4,
    difficultyEnd: 4,
    threatLevel: 'HIGH',
  },
  {
    chapterNumber: 8,
    act: 2,
    title: 'Chain of Custody',
    description:
      'Supply chain compromise climax. Decision points affecting faction relationships. Setup for Act III.',
    dayStart: 29,
    dayEnd: 30,
    difficultyStart: 4,
    difficultyEnd: 4,
    threatLevel: 'HIGH',
  },
  // Act III: The Breach (Chapters 9-11)
  {
    chapterNumber: 9,
    act: 3,
    title: 'The Breach Begins',
    description:
      'Advanced persistent threat introduction. First signs of lateral movement. Insider threat indicators.',
    dayStart: 31,
    dayEnd: 35,
    difficultyStart: 4,
    difficultyEnd: 5,
    threatLevel: 'HIGH',
  },
  {
    chapterNumber: 10,
    act: 3,
    title: 'Lateral Movement',
    description:
      'Deep penetration scenarios. Multi-faction coordination attacks. VERITAS faction tension begins.',
    dayStart: 36,
    dayEnd: 41,
    difficultyStart: 5,
    difficultyEnd: 5,
    threatLevel: 'SEVERE',
  },
  {
    chapterNumber: 11,
    act: 3,
    title: 'Data Exodus',
    description:
      'Data exfiltration attempts. Critical decision points with lasting consequences. Act III climax.',
    dayStart: 42,
    dayEnd: 45,
    difficultyStart: 5,
    difficultyEnd: 5,
    threatLevel: 'SEVERE',
  },
  // Finale: Archive Gate (Chapters 12-13)
  {
    chapterNumber: 12,
    act: 4,
    title: 'Archive Gate',
    description:
      'Season climax. Major incident requiring all skills. Multi-vector attack on the facility. Morpheus backstory revelation.',
    dayStart: 46,
    dayEnd: 55,
    difficultyStart: 5,
    difficultyEnd: 5,
    threatLevel: 'SEVERE',
  },
  {
    chapterNumber: 13,
    act: 4,
    title: 'Aftermath',
    description:
      'Season conclusion. Branching ending resolution. Setup for Season 2. Morpheus reveals more of his past.',
    dayStart: 56,
    dayEnd: 60,
    difficultyStart: 5,
    difficultyEnd: 5,
    threatLevel: 'SEVERE',
  },
];

interface MorpheusMessageSeed {
  messageKey: string;
  title: string;
  content: string;
  triggerType: string;
  severity: string;
  minDay?: number;
  maxDay?: number;
  factionKey?: string;
}

const MORPHEUS_MESSAGES: MorpheusMessageSeed[] = [
  {
    messageKey: 'welcome_day_zero',
    title: 'Welcome to the Gate',
    content: `Operator,

Welcome to Matrices GmbH. You are now the final authority on who gets access to the last reliable data center on this side of the collapse.

I'm Morpheus. I run this facility. Before the NIDHOGG variant took down 60% of global BGP routes and darkened the DNS root servers, we were just another hosting company. Now we're all that stands between human knowledge and total loss.

Your job is simple: decide who gets in. Your decisions keep us alive. Every approval is a risk. Every denial might mean someone dies.

The inbox is your battlefield. Trust nothing. Verify everything.

Let's begin.`,
    triggerType: 'day_start',
    severity: 'info',
    minDay: 1,
    maxDay: 1,
  },
  {
    messageKey: 'day_one_first_email',
    title: 'Your First Request',
    content: `Operator,

That email in your inbox? It's your first decision. 

Look at the sender. Check the domain. Ask yourself: would a legitimate organization communicate this way?

This is what we do now. Every message is a potential lifeline or a trap. Your training begins here, at the inbox.

I've set up some obvious ones to start. Get comfortable. The real tests come later.`,
    triggerType: 'email_received',
    severity: 'info',
    minDay: 1,
    maxDay: 1,
  },
  {
    messageKey: 'trust_basics',
    title: 'Trust is Earned',
    content: `Operator,

Here's the first rule of the Gate: trust is not given. It's verified.

Look for:
- Sender domain authenticity
- Request specificity
- Verification packet presence
- Logical consistency

The ones who rush you? The ones who threaten consequences? They're not your friends. Real organizations don't panic.

Take your time. We have bandwidth constraints, but we can't afford to let the wrong people in.`,
    triggerType: 'day_start',
    severity: 'info',
    minDay: 2,
    maxDay: 3,
  },
  {
    messageKey: 'faction_intro_sovcomp',
    title: 'The Sovereign Compact',
    content: `Operator,

You're about to hear from the Sovereign Compact. They're the formal governments - what remains of them anyway. They send official communications, proper channels, everything by the book.

Problem is, even governments get desperate. And desperate people make excellent phishing targets.

Watch for:
- Official-looking headers that don't match content
- Requests that bypass their own protocols
- Anything that feels like it's trying too hard to be legitimate

They want access. They believe they deserve it. Maybe they're right. Maybe not. That's your call.`,
    triggerType: 'faction_intro',
    severity: 'info',
    factionKey: 'sovereign_compact',
  },
  {
    messageKey: 'faction_intro_nexion',
    title: 'Nexion Industries',
    content: `Operator,

Nexion Industries. The corporations that survived the collapse consolidated into a single powerful bloc. They have resources. They have influence. They have lawyers.

They'll promise you anything. Growth, revenue, partnership. They want infrastructure access to rebuild their networks - and potentially, to control who connects to whom.

Watch for:
- Corporate email domains that look almost right
- Business proposals that move too fast
- Requests for privileged access "for efficiency"

They're not villains. They're just playing a different game. Know the rules before you play.`,
    triggerType: 'faction_intro',
    severity: 'info',
    factionKey: 'nexion_industries',
  },
  {
    messageKey: 'faction_intro_librarians',
    title: 'The Librarians',
    content: `Operator,

The Librarians are different. They don't want to rebuild the old networks. They want to preserve what we had. Knowledge, data, research - everything that will be lost if we don't act.

They'll send you verification packets that actually check out. Their requests are measured, specific, and focused on archival integrity.

But even archivists can be compromised. Someone might impersonate them to get access to sensitive preservation systems.

Verify. Always verify.`,
    triggerType: 'faction_intro',
    severity: 'info',
    factionKey: 'librarians',
  },
  {
    messageKey: 'faction_intro_hacktivists',
    title: 'Hacktivist Collectives',
    content: `Operator,

The Hacktivists believe the old internet deserved to die. They distribute tools, knowledge, and access freely. They see the collapse as liberation, not catastrophe.

They don't send formal requests. They don't use proper channels. They show up in your inbox with direct propositions, tool offerings, and promises of underground network access.

Some of them genuinely want to help. Others want to use our infrastructure for their own purposes. The difference matters.

Watch for:
- Technical specificity
- References to distributed systems
- Offers that seem too good to be true`,
    triggerType: 'faction_intro',
    severity: 'info',
    factionKey: 'hacktivists',
  },
  {
    messageKey: 'faction_intro_criminals',
    title: 'Criminal Networks',
    content: `Operator,

The criminal networks survived the collapse by evolving. They offer services that officially don't exist, for prices that fluctuate with desperation.

They might pose as anyone. Vendors, government officials, corporate contacts. Their emails are often the most polished because they've had time to perfect their craft.

There's no shame in denying them. In fact, it's survival.

But sometimes... sometimes their offers are genuine. Sometimes they have what you need and no one else does. That's when it gets complicated.

The choice is yours.`,
    triggerType: 'faction_intro',
    severity: 'warning',
    factionKey: 'criminal_networks',
  },
  {
    messageKey: 'difficulty_ramp',
    title: 'Escalation Begins',
    content: `Operator,

You've handled the obvious ones. Now comes the harder part.

The attackers are learning. They're watching how you operate, what catches your attention, what you let through. They'll adapt.

From now on, you'll see:
- More sophisticated impersonation
- Requests that reference real organizations
- Emails that feel like they could be legitimate

This is where training becomes real. Every decision teaches you something. Remember what works. Remember what doesn't.

Trust, but verify.`,
    triggerType: 'chapter_start',
    severity: 'info',
    minDay: 4,
  },
  {
    messageKey: 'verification_intro',
    title: 'The Verification Protocol',
    content: `Operator,

When you're unsure about a request, you can request additional verification. It's not an accusation - it's due diligence.

A legitimate requester will have:
- Verifiable contact information
- Consistent communication history
- Proper documentation
- Logical business reasons

If they can't provide these, that's your answer. The Gate doesn't open for everyone.

Use the verification request wisely. It costs bandwidth. It delays decisions. But sometimes it's the only way to be sure.`,
    triggerType: 'skill_unlocked',
    severity: 'info',
    minDay: 3,
  },
  {
    messageKey: 'first_incident_warning',
    title: `Something's Wrong`,
    content: `Operator,

I've detected unusual activity patterns in the queue. Someone's probing our defenses, testing our response times.

This could be routine reconnaissance. Or it could be the start of something worse.

Review your recent approvals. Any of them feel off? Any verification requests you wish you'd sent?

We're still operational, but stay alert. The first incident might come sooner than expected.`,
    triggerType: 'incident_warning',
    severity: 'warning',
    minDay: 10,
  },
  {
    messageKey: 'mid_act_summary',
    title: 'Progress Report',
    content: `Operator,

You've handled over 100 access requests since Day Zero. Your threat detection rate is [RATE]%. Not bad for someone who's never done this before.

But the game is changing. The easy分辨s are behind us. What comes next requires sharper judgment.

Remember:
- Trust is earned, not given
- Verification is your friend
- When in doubt, deny

The Gate depends on you.`,
    triggerType: 'day_milestone',
    severity: 'info',
    minDay: 10,
    maxDay: 12,
  },
  {
    messageKey: 'signal_collapse_intro',
    title: 'The Signal Falters',
    content: `Operator,

Something's wrong with the feed. External communications are degrading.

I don't know yet if this is technical failure or deliberate attack. But the timing is... convenient.

We've been operating in relative peace while establishing ourselves. Now that we have value, the vultures are circling.

Every decision matters more now. One wrong approval could open a door we can't close.

Stay sharp.`,
    triggerType: 'chapter_start',
    severity: 'warning',
    minDay: 13,
  },
  {
    messageKey: 'act_one_conclusion',
    title: 'End of Setup',
    content: `Operator,

Act One is complete. You've established the Gate, learned the fundamentals, and faced your first challenges.

The situation is evolving. What started as simple triage has become something more complex. Factions are forming. Threats are emerging. The choices you've made have consequences.

We'll reset to GUARDED status for now. A chance to breathe. To prepare.

But the calm won't last. The next Act brings harder decisions, deeper conspiracies, and threats that hit closer to home.

Rest while you can. The Gate never closes forever.`,
    triggerType: 'act_complete',
    severity: 'info',
    minDay: 15,
  },
  // Act II: Supply Chain Messages
  {
    messageKey: 'act_two_intro',
    title: 'New Horizons',
    content: `Operator,

Act Two begins. The initial chaos has settled, but don't mistake calm for safety.

A new faction has emerged from the shadows - the Vendor Cartel. They control the supply chains that keep infrastructure alive. Everyone needs something from them. That's leverage.

They're not hostile... not exactly. But they're not allies either. They're opportunists. They'll promise reliability, deliver compromise.

Watch your vendor relationships carefully. Every shipment could be a trojan horse. Every update could be an update... just not the kind you want.

The threat level is rising. ELEVATED. Stay alert.`,
    triggerType: 'act_complete',
    severity: 'info',
    minDay: 15,
    maxDay: 16,
  },
  {
    messageKey: 'faction_intro_vendor',
    title: 'The Vendor Cartel',
    content: `Operator,

The Vendor Cartel has made contact. They're the middlemen - the suppliers, the service providers, the third parties everyone depends on.

Here's what you need to know:
- They control essential supply chains
- They'll position themselves as indispensable
- Their communications look legitimate
- Their actual motives are... flexible

They might genuinely help. They might be compromised. They might be the compromise itself.

Trust, but verify. Especially when they come bearing gifts.`,
    triggerType: 'faction_intro',
    severity: 'warning',
    factionKey: 'vendor_cartel',
  },
  {
    messageKey: 'supply_chain_basics',
    title: 'Supply Chain Security',
    content: `Operator,

The Vendor Cartel is offering partnership. Software updates, hardware supplies, maintenance contracts. All legitimate... on the surface.

But here's the thing about supply chains: they're only as strong as their weakest link. And right now, everyone's weakest link is desperation.

Watch for:
- Unsolicited software updates
- Hardware from unverified sources
- Service contracts with unusual terms
- Requests to install their tools

Everything looks official. That's what makes it dangerous.`,
    triggerType: 'chapter_start',
    severity: 'warning',
    minDay: 16,
  },
  {
    messageKey: 'vendor_credential_warning',
    title: 'The Password Dance',
    content: `Operator,

We've detected a pattern. The Vendor Cartel is sending credential harvesting requests disguised as "routine verification."

They'll say it's for:
- Account validation
- Partner certification
- Security compliance
- System integration

It's always the same goal: getting your login credentials.

Remember: legitimate vendors DON'T need your password. Ever. If they ask, deny. Verify through other channels.`,
    triggerType: 'incident_warning',
    severity: 'warning',
    minDay: 20,
    factionKey: 'vendor_cartel',
  },
  {
    messageKey: 'act_two_midpoint',
    title: 'Trust Issues',
    content: `Operator,

You've been handling vendor requests for a while now. Some you've approved. Some you've denied. Some you're still unsure about.

Here's what I've noticed: your decisions are shaping our relationships. The factions are watching. They're calculating.

The Vendor Cartel is particularly attentive. They remember every approval, every denial. Their offers are getting more... sophisticated.

Keep making smart choices. Or don't. I'm not your supervisor. I'm just the one who has to live with the consequences.`,
    triggerType: 'day_milestone',
    severity: 'info',
    minDay: 24,
    maxDay: 26,
  },
  {
    messageKey: 'trusted_partner_compromise',
    title: 'The Trusted Partner',
    content: `Operator,

I need you to listen carefully.

One of our "trusted" vendor partners has been compromised. We don't know exactly when or how, but their communications now carry payloads.

This is why I stress verification. Even the partners you trust can become attack vectors. Especially the partners you trust.

From now on:
- Verify all vendor updates independently
- Cross-check requests through multiple channels
- Assume anything could be compromised
- When in doubt, deny

The supply chain is broken. We're patching it as we go.`,
    triggerType: 'incident_warning',
    severity: 'warning',
    minDay: 27,
  },
  {
    messageKey: 'act_two_conclusion',
    title: 'Chain of Custody',
    content: `Operator,

Act Two ends. The supply chain battle has cost us. Some relationships strengthened. Others burned.

The Vendor Cartel knows where we stand. So do the other factions. Your choices have consequences - and they're paying attention.

Act Three approaches. The threats will be different. More personal. More dangerous.

They've found ways into our systems. They're moving laterally. Some of them might even be inside.

The question is: are you ready?`,
    triggerType: 'act_complete',
    severity: 'warning',
    minDay: 29,
    maxDay: 30,
  },
  // Act III: The Breach Messages
  {
    messageKey: 'act_three_intro',
    title: 'Inside the Walls',
    content: `Operator,

Act Three. This is where it gets personal.

We've identified unauthorized access attempts from inside our perimeter. Not outside - inside. Someone on our network is compromised or cooperating with attackers.

This is Advanced Persistent Threat territory. They're not here for quick gains. They're here to stay.

Watch for:
- Unusual data access patterns
- Authentication from unexpected locations
- Privileged account anomalies
- Timing-based anomalies

The threat level is now SEVERE. Every alert matters. Every decision compounds.

And one more thing: VERITAS has reached out. They claim to have intelligence about the breach. I'm not sure if they're allies or another threat. Time will tell.`,
    triggerType: 'act_complete',
    severity: 'warning',
    minDay: 30,
    maxDay: 31,
  },
  {
    messageKey: 'insider_threat_alert',
    title: 'The Enemy Within',
    content: `Operator,

We've confirmed it. There's a compromised account in our system. Someone with legitimate credentials is acting on behalf of the attackers.

This is the worst-case scenario. They bypass every perimeter defense because they're already inside.

Possible indicators:
- Access at unusual hours
- Large data transfers
- Query patterns that don't match role
- Authentication from multiple locations

I don't know who it is. But every decision you make from now on could either help them or stop them.

Trust nothing. Verify everything.`,
    triggerType: 'incident_warning',
    severity: 'warning',
    minDay: 33,
  },
  {
    messageKey: 'veritas_contact',
    title: 'The VERITAS Offer',
    content: `Operator,

VERITAS made contact. They say they have intelligence about who's attacking us. They want to meet - in person.

This could be:
- A genuine offer of help
- A trap
- Another faction playing games

I don't trust them. But I also can't ignore the possibility that they know something we don't.

Your call. Meeting them could provide critical intelligence. Or it could walk you into an ambush.

What do you want to do?`,
    triggerType: 'decision_point',
    severity: 'info',
    minDay: 35,
  },
  {
    messageKey: 'lateral_movement_detected',
    title: 'They Are Moving',
    content: `Operator,

The attackers are inside our network and they're moving. Lateral movement. They're expanding access across systems.

We've detected:
- Attempts to access backup systems
- Queries on archive data
- Attempts to elevate privileges
- Communications with external IPs

This is coordinated. They're not random - they're targeting specific data. Likely our archives.

We can contain them, but it will cost. Every minute we wait, they get deeper.

What's your call?`,
    triggerType: 'incident_warning',
    severity: 'critical',
    minDay: 37,
  },
  {
    messageKey: 'data_exfiltration_warning',
    title: 'They are Taking Data',
    content: `Operator,

They're exfiltrating data. Copying our archives. Our knowledge base. Everything we've preserved.

This is what they wanted all along. Not system access - data. Our data.

I can try to cut off their access, but it might disrupt legitimate operations. Or I can let them copy and try to trace them.

Choose:
1. Cut access now - save data, potentially trap them inside
2. Let them copy - trace their destination, gather intelligence
3. Something else - if you have another idea, I'm listening

This is the moment. What do we do?`,
    triggerType: 'decision_point',
    severity: 'critical',
    minDay: 42,
  },
  {
    messageKey: 'act_three_conclusion',
    title: 'The Eve of Destruction',
    content: `Operator,

Act Three ends. We've survived - barely. The breach isn't over, but we've bought time.

Your choices have shaped this outcome. Some doors are closed forever. Others have opened in unexpected ways.

VERITAS is watching. The other factions are calculating. Everyone's wondering: what happens next?

Tomorrow, everything changes. The final assault on the Archive Gate begins.

I have one more thing to tell you before we proceed. Something I should have said earlier. Something about my past.

Meet me in the control room. It's time you knew.`,
    triggerType: 'act_complete',
    severity: 'warning',
    minDay: 44,
    maxDay: 45,
  },
  // Finale: Archive Gate Messages
  {
    messageKey: 'morpheus_backstory',
    title: 'Before the Gate',
    content: `Operator,

Sit down. There's something you need to know.

Before I ran this facility, I worked for the companies that built the old internet. I was part of the teams that designed the protocols, the infrastructure, the systems we all depended on.

I saw the vulnerabilities. I saw the warnings that were ignored. I tried to tell people - but nobody listened.

When NIDHOGG hit, I was one of the ones who knew it was coming. Not the specifics, but the possibility. I could have done more. Should have done more.

This facility. The Gate. It's my attempt at redemption. Saving what we can. Protecting what remains.

Now the same forces that broke the world are breaking through our walls. And I need your help to stop them.`,
    triggerType: 'chapter_start',
    severity: 'info',
    minDay: 46,
  },
  {
    messageKey: 'archive_gate_attack',
    title: 'The Final Assault',
    content: `Operator,

They're here. All of them. Every faction, every threat, every attack vector - converging on the Archive simultaneously.

This is coordinated. This is overwhelming. This is the final play.

We have minutes, maybe less. The systems are strained. The attackers are pushing from multiple directions simultaneously.

I need you to make the hardest decisions of your life:
- Which systems to prioritize
- Which access requests to honor
- Which threats to contain
- Which data to sacrifice

We can't save everything. The question is: what do we save?`,
    triggerType: 'incident_warning',
    severity: 'critical',
    minDay: 48,
  },
  {
    messageKey: 'finale_decision',
    title: 'The Choice',
    content: `Operator,

It's over. The attack is contained - barely. But we have one final choice to make.

Three options. Three outcomes. Three endings.

Option A: We restore everything. Full recovery. All systems, all data, all archives. It will take time, but we'll be whole.

Option B: We secure the core. The essential archives survive, but some systems are sacrificed. We survive, but smaller.

Option C: We go dark. We wipe everything and start fresh. No data, no history, but no compromised code either.

This is it. Your call. What happens to the Gate?`,
    triggerType: 'ending_decision',
    severity: 'critical',
    minDay: 55,
  },
  {
    messageKey: 'ending_a_restoration',
    title: 'Restoration Ending',
    content: `Operator,

You chose restoration. All of it. Everything preserved, everything restored.

It will take time. Months, maybe years. But the archives survive. The knowledge persists. The Gate stands strong.

I've learned something from this. Redemption isn't about the past - it's about what you build next.

Thank you. For everything.

The Gate is yours now. Whatever comes next... we'll face it together.

See you on the other side.`,
    triggerType: 'ending_a',
    severity: 'info',
    minDay: 56,
  },
  {
    messageKey: 'ending_b_secure',
    title: 'Secure Ending',
    content: `Operator,

You chose security. We hold what matters. The core survives, even if the edges fall away.

Some data is lost. Some systems are gone. But what remains is clean. Controlled. Ours.

This is the reality of survival. You can't save everything. But what you save, you keep.

The Gate continues. Smaller, but stronger. That's not failure - that's strategy.

We'll rebuild. Slowly. Carefully. Every decision counted, and this one saved us.

The archives endure. The Gate holds. That's enough.

See you on the other side.`,
    triggerType: 'ending_b',
    severity: 'info',
    minDay: 56,
  },
  {
    messageKey: 'ending_c_rebirth',
    title: 'Rebirth Ending',
    content: `Operator,

You chose rebirth. A clean slate. No compromised data, no compromised systems, no past to hold us back.

Everything's gone. The archives, the history, the preserved knowledge. We start from zero.

But here's what I've realized: knowledge isn't just data. It's people. It's memory. It's US.

We carry what matters in our heads and hearts. The Gate will be rebuilt. The archives will be recreated. Maybe better than before.

This ending isn't about loss. It's about possibility. A fresh start.

I'll be here. You'll be here. The Gate will rise again.

See you on the other side.`,
    triggerType: 'ending_c',
    severity: 'info',
    minDay: 56,
  },
  {
    messageKey: 'season_one_complete',
    title: 'The End of the Beginning',
    content: `Operator,

Season One is complete. You've traveled from Day Zero to the Archive Gate. You've faced phishing, supply chain threats, APTs, and the final assault.

More importantly: you made choices. Every decision shaped this outcome. The factions remember. The Gate remembers. I remember.

What's next? Season Two will bring new threats, new factions, new challenges. The story continues.

But for now, rest. You've earned it.

The DMZ: Archive Gate continues. And now... so do you.

Until next season.`,
    triggerType: 'season_complete',
    severity: 'info',
    minDay: 58,
    maxDay: 60,
  },
];

const generateFaction = (faction: FactionSeed, tenantId: string) => ({
  tenantId,
  factionKey: faction.factionKey,
  displayName: faction.displayName,
  description: faction.description,
  motivations: faction.motivations,
  communicationStyle: faction.communicationStyle,
  initialReputation: 50,
  metadata: {},
  isActive: true,
});

const generateSeason = (season: SeasonSeed, tenantId: string) => ({
  tenantId,
  seasonNumber: season.seasonNumber,
  title: season.title,
  theme: season.theme,
  logline: season.logline,
  description: season.description,
  threatCurveStart: season.threatCurveStart,
  threatCurveEnd: season.threatCurveEnd,
  metadata: {},
  isActive: true,
});

const generateChapter = (chapter: ChapterSeed, seasonId: string, tenantId: string) => ({
  tenantId,
  seasonId,
  chapterNumber: chapter.chapterNumber,
  act: chapter.act,
  title: chapter.title,
  description: chapter.description,
  dayStart: chapter.dayStart,
  dayEnd: chapter.dayEnd,
  difficultyStart: chapter.difficultyStart,
  difficultyEnd: chapter.difficultyEnd,
  threatLevel: chapter.threatLevel,
  metadata: {},
  isActive: true,
});

const generateMorpheusMessage = (message: MorpheusMessageSeed, tenantId: string) => ({
  tenantId,
  messageKey: message.messageKey,
  title: message.title,
  content: message.content,
  triggerType: message.triggerType,
  severity: message.severity,
  minDay: message.minDay ?? null,
  maxDay: message.maxDay ?? null,
  minTrustScore: null,
  maxTrustScore: null,
  minThreatLevel: null,
  maxThreatLevel: null,
  factionKey: message.factionKey ?? null,
  metadata: {},
  isActive: true,
});

export const seedSeasonOneContent = async (): Promise<void> => {
  const db = getDatabaseClient();

  const tenantIds = Object.values(SEED_TENANT_IDS);

  for (const tenantId of tenantIds) {
    console.log(`Seeding Season 1 Signal Loss (Acts I-IV) content for tenant: ${tenantId}`);

    for (const faction of FACTION_DATA) {
      await db
        .insert(factions)
        .values(generateFaction(faction, tenantId))
        .onConflictDoUpdate({
          target: [factions.tenantId, factions.factionKey],
          set: {
            displayName: sql`excluded.display_name`,
            description: sql`excluded.description`,
            motivations: sql`excluded.motivations`,
            communicationStyle: sql`excluded.communication_style`,
            updatedAt: sql`now()`,
          },
        });
    }
    console.log(`  - Seeded ${FACTION_DATA.length} factions`);

    const seasonResult = await db
      .insert(seasons)
      .values(generateSeason(SEASON_DATA, tenantId))
      .onConflictDoUpdate({
        target: [seasons.tenantId, seasons.seasonNumber],
        set: {
          title: sql`excluded.title`,
          theme: sql`excluded.theme`,
          logline: sql`excluded.logline`,
          description: sql`excluded.description`,
          threatCurveStart: sql`excluded.threat_curve_start`,
          threatCurveEnd: sql`excluded.threat_curve_end`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: seasons.id });

    const seasonId = seasonResult[0]?.id;
    if (!seasonId) {
      throw new Error('Failed to create season');
    }
    console.log(`  - Created season: ${SEASON_DATA.title}`);

    for (const chapter of CHAPTER_DATA) {
      await db
        .insert(chapters)
        .values(generateChapter(chapter, seasonId, tenantId))
        .onConflictDoUpdate({
          target: [chapters.tenantId, chapters.seasonId, chapters.chapterNumber],
          set: {
            act: sql`excluded.act`,
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            dayStart: sql`excluded.day_start`,
            dayEnd: sql`excluded.day_end`,
            difficultyStart: sql`excluded.difficulty_start`,
            difficultyEnd: sql`excluded.difficulty_end`,
            threatLevel: sql`excluded.threat_level`,
            updatedAt: sql`now()`,
          },
        });
    }
    console.log(`  - Created ${CHAPTER_DATA.length} chapters`);

    for (const message of MORPHEUS_MESSAGES) {
      await db
        .insert(morpheusMessages)
        .values(generateMorpheusMessage(message, tenantId))
        .onConflictDoUpdate({
          target: [morpheusMessages.tenantId, morpheusMessages.messageKey],
          set: {
            title: sql`excluded.title`,
            content: sql`excluded.content`,
            triggerType: sql`excluded.trigger_type`,
            severity: sql`excluded.severity`,
            minDay: sql`excluded.min_day`,
            maxDay: sql`excluded.max_day`,
            factionKey: sql`excluded.faction_key`,
            updatedAt: sql`now()`,
          },
        });
    }
    console.log(`  - Created ${MORPHEUS_MESSAGES.length} Morpheus messages`);
  }

  console.log('Season 1 Signal Loss (Acts I-IV) content seeding complete!');
};
