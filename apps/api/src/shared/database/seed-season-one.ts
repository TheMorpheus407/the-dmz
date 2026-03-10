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
    console.log(`Seeding Season 1 Act I content for tenant: ${tenantId}`);

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

  console.log('Season 1 Act I content seeding complete!');
};
