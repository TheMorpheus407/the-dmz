import {
  type VerificationPacket,
  type VerificationArtifact,
  type VerificationDocumentType,
  rng,
  type RNGInstance,
} from '@the-dmz/shared';

const DOCUMENT_TYPE_CATEGORIES: Record<string, VerificationDocumentType[]> = {
  identity: ['id_document', 'employee_badge'],
  ownership: ['account_record', 'registration'],
  chain_of_custody: ['transfer_log', 'approval_chain'],
  intelligence: ['threat_assessment', 'faction_report'],
};

const DOCUMENT_TEMPLATES: Record<
  VerificationDocumentType,
  { title: string; description: string; issuer: string }
> = {
  id_document: {
    title: 'Government ID',
    description: 'Valid government-issued identification document',
    issuer: 'Department of Identity',
  },
  employee_badge: {
    title: 'Employee Badge',
    description: 'Organizational employee identification badge',
    issuer: 'HR Department',
  },
  account_record: {
    title: 'Account Record',
    description: 'Historical account registration and verification record',
    issuer: 'Accounts Department',
  },
  registration: {
    title: 'Business Registration',
    description: 'Official business registration documentation',
    issuer: 'Business Registry',
  },
  transfer_log: {
    title: 'Transfer Log',
    description: 'Asset transfer authorization and execution log',
    issuer: 'Operations Center',
  },
  approval_chain: {
    title: 'Approval Chain',
    description: 'Multi-level approval authorization chain',
    issuer: 'Compliance Office',
  },
  threat_assessment: {
    title: 'Threat Assessment',
    description: 'Security threat assessment and risk analysis',
    issuer: 'Security Intelligence',
  },
  faction_report: {
    title: 'Faction Report',
    description: 'Faction relationship and reliability report',
    issuer: 'Faction Analysis',
  },
};

interface AssemblePacketParams {
  sessionSeed: bigint;
  emailId: string;
  sessionId: string;
  faction?: string;
  includeIntelligence?: boolean;
}

export function assembleVerificationPacket(params: AssemblePacketParams): VerificationPacket {
  const { sessionSeed, emailId, sessionId, faction, includeIntelligence = false } = params;

  const packetId = generatePacketId(sessionSeed, emailId);
  const seed = deriveSeed(sessionSeed, emailId);
  const random = rng.create(seed);

  const minDocs = 2;
  const maxDocs = 5;
  const docCount = random.nextInt(minDocs, maxDocs);

  const categories = ['identity', 'ownership', 'chain_of_custody'] as const;
  const selectedCategories: string[] = [];

  for (const cat of categories) {
    if (selectedCategories.length < docCount) {
      selectedCategories.push(cat);
    }
  }

  while (selectedCategories.length < docCount) {
    const extraCat = random.pick([...categories, 'intelligence'] as const);
    if (!selectedCategories.includes(extraCat)) {
      selectedCategories.push(extraCat);
    }
  }

  const hasIntelligence = includeIntelligence || (random.nextFloat() > 0.7 && docCount < maxDocs);

  const artifacts: VerificationArtifact[] = [];

  for (const category of selectedCategories.slice(0, docCount)) {
    const docTypes = DOCUMENT_TYPE_CATEGORIES[category];
    if (!docTypes) continue;

    const docType = random.pick(docTypes);
    const template = DOCUMENT_TEMPLATES[docType];
    if (!template) continue;

    const artifactId = random.uuid(`artifact-${category}`);
    const issuedDate = generateIssuedDate(random);

    const validityOptions: VerificationArtifact['validityIndicator'][] = [
      'valid',
      'suspicious',
      'unknown',
    ];
    const validityWeights = category === 'intelligence' ? [0.6, 0.3, 0.1] : [0.8, 0.15, 0.05];
    const validity = weightedRandom(random, validityOptions, validityWeights);

    artifacts.push({
      artifactId,
      documentType: docType,
      title: faction ? `${faction} ${template.title}` : template.title,
      description: template.description,
      issuer: faction ? `${faction} ${template.issuer}` : template.issuer,
      issuedDate,
      validityIndicator: validity,
      metadata: {
        category,
        generatedFrom: 'verification-packet-assembly',
      },
    });
  }

  if (hasIntelligence && artifacts.length < maxDocs) {
    const intDocTypes = DOCUMENT_TYPE_CATEGORIES['intelligence'];
    if (intDocTypes) {
      const intDocType = random.pick(intDocTypes);
      const template = DOCUMENT_TEMPLATES[intDocType];
      if (template) {
        const artifactId = random.uuid('artifact-intelligence');
        const issuedDate = generateIssuedDate(random);

        artifacts.push({
          artifactId,
          documentType: intDocType,
          title: template.title,
          description: template.description,
          issuer: template.issuer,
          issuedDate,
          validityIndicator: random.nextFloat() > 0.5 ? 'suspicious' : 'valid',
          metadata: {
            category: 'intelligence',
            generatedFrom: 'verification-packet-assembly',
          },
        });
      }
    }
  }

  return {
    packetId,
    emailId,
    sessionId,
    createdAt: new Date().toISOString(),
    artifacts,
    hasIntelligenceBrief: hasIntelligence,
  };
}

function generatePacketId(seed: bigint, emailId: string): string {
  const random = rng.create(seed);
  return random.uuid(`packet-${emailId}`);
}

function deriveSeed(sessionSeed: bigint, emailId: string): bigint {
  const combined = `${sessionSeed}-${emailId}`;
  let hash = 0n;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5n) - hash + BigInt(combined.charCodeAt(i));
    hash = hash & 0xffffffffffffffffn;
  }
  return hash | 1n;
}

function generateIssuedDate(random: RNGInstance): string {
  const daysAgo = random.nextInt(0, 365);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0] ?? date.toISOString();
}

function weightedRandom<T>(random: RNGInstance, options: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let randomValue = random.nextFloat() * totalWeight;

  for (let i = 0; i < options.length; i++) {
    randomValue -= weights[i]!;
    if (randomValue <= 0) {
      return options[i]!;
    }
  }

  return options[options.length - 1]!;
}

export function isPacketDeterministic(params: AssemblePacketParams): boolean {
  const packet1 = assembleVerificationPacket(params);
  const packet2 = assembleVerificationPacket(params);

  if (packet1.packetId !== packet2.packetId) return false;
  if (packet1.artifacts.length !== packet2.artifacts.length) return false;

  for (let i = 0; i < packet1.artifacts.length; i++) {
    if (packet1.artifacts[i]!.artifactId !== packet2.artifacts[i]!.artifactId) {
      return false;
    }
  }

  return true;
}
