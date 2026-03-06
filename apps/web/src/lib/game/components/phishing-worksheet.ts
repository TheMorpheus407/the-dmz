import type { EmailInstance, IndicatorType } from '@the-dmz/shared';
import { getIndicatorByType } from '@the-dmz/shared/game';

export interface WorksheetIndicator {
  indicatorId: string;
  type: IndicatorType;
  name: string;
  description: string;
  location: string;
  isChecked: boolean;
  note: string;
}

export interface WorksheetAnalysis {
  emailId: string;
  redFlags: WorksheetIndicator[];
  legitimacySignals: WorksheetIndicator[];
  redFlagsNotes: string;
  legitimacyNotes: string;
  autoScore: number;
  overrideScore: number | null;
  finalScore: number;
}

const LEGITIMACY_SIGNAL_TYPES: IndicatorType[] = ['signature_missing'];

export function classifyIndicatorType(type: IndicatorType): 'redFlag' | 'legitimacySignal' {
  if (LEGITIMACY_SIGNAL_TYPES.includes(type)) {
    return 'legitimacySignal';
  }
  return 'redFlag';
}

export function createWorksheetAnalysis(email: EmailInstance): WorksheetAnalysis {
  const redFlags: WorksheetIndicator[] = [];
  const legitimacySignals: WorksheetIndicator[] = [];

  for (const indicator of email.indicators) {
    const catalogEntry = getIndicatorByType(indicator.type);
    const worksheetIndicator: WorksheetIndicator = {
      indicatorId: indicator.indicatorId,
      type: indicator.type,
      name: catalogEntry?.name || indicator.type,
      description: indicator.description,
      location: indicator.location,
      isChecked: false,
      note: '',
    };

    if (classifyIndicatorType(indicator.type) === 'legitimacySignal') {
      legitimacySignals.push(worksheetIndicator);
    } else {
      redFlags.push(worksheetIndicator);
    }
  }

  const autoScore = calculateAutoScore(redFlags, legitimacySignals);

  return {
    emailId: email.emailId,
    redFlags,
    legitimacySignals,
    redFlagsNotes: '',
    legitimacyNotes: '',
    autoScore,
    overrideScore: null,
    finalScore: autoScore,
  };
}

export function calculateAutoScore(
  redFlags: WorksheetIndicator[],
  legitimacySignals: WorksheetIndicator[],
): number {
  const checkedRedFlags = redFlags.filter((rf) => rf.isChecked).length;
  const checkedLegitimacy = legitimacySignals.filter((ls) => ls.isChecked).length;

  const redFlagWeight = 10;
  const legitimacyWeight = -5;

  const baseScore = 50;
  const score = baseScore + checkedRedFlags * redFlagWeight + checkedLegitimacy * legitimacyWeight;

  return Math.max(0, Math.min(100, score));
}

export function getRiskLabel(score: number): string {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  if (score >= 20) return 'LOW';
  return 'SAFE';
}

export function getRiskColor(score: number): string {
  if (score >= 80) return 'var(--color-critical)';
  if (score >= 60) return 'var(--color-threat-4)';
  if (score >= 40) return 'var(--color-warning)';
  if (score >= 20) return 'var(--color-safe)';
  return 'var(--color-safe)';
}

export function toggleIndicator(
  analysis: WorksheetAnalysis,
  indicatorId: string,
): WorksheetAnalysis {
  const updated = { ...analysis };

  const checkRedFlag = updated.redFlags.find((rf) => rf.indicatorId === indicatorId);
  if (checkRedFlag) {
    checkRedFlag.isChecked = !checkRedFlag.isChecked;
    updated.autoScore = calculateAutoScore(updated.redFlags, updated.legitimacySignals);
    updated.finalScore = updated.overrideScore ?? updated.autoScore;
    return updated;
  }

  const checkLegitimacy = updated.legitimacySignals.find((ls) => ls.indicatorId === indicatorId);
  if (checkLegitimacy) {
    checkLegitimacy.isChecked = !checkLegitimacy.isChecked;
    updated.autoScore = calculateAutoScore(updated.redFlags, updated.legitimacySignals);
    updated.finalScore = updated.overrideScore ?? updated.autoScore;
  }

  return updated;
}

export function setIndicatorNote(
  analysis: WorksheetAnalysis,
  indicatorId: string,
  note: string,
): WorksheetAnalysis {
  const updated = { ...analysis };

  const redFlag = updated.redFlags.find((rf) => rf.indicatorId === indicatorId);
  if (redFlag) {
    redFlag.note = note;
    return updated;
  }

  const legitimacySignal = updated.legitimacySignals.find((ls) => ls.indicatorId === indicatorId);
  if (legitimacySignal) {
    legitimacySignal.note = note;
  }

  return updated;
}

export function setOverrideScore(
  analysis: WorksheetAnalysis,
  score: number | null,
): WorksheetAnalysis {
  const updated = { ...analysis };
  updated.overrideScore = score;
  updated.finalScore = score ?? updated.autoScore;
  return updated;
}

export function setColumnNotes(
  analysis: WorksheetAnalysis,
  column: 'redFlags' | 'legitimacy',
  notes: string,
): WorksheetAnalysis {
  const updated = { ...analysis };
  if (column === 'redFlags') {
    updated.redFlagsNotes = notes;
  } else {
    updated.legitimacyNotes = notes;
  }
  return updated;
}
