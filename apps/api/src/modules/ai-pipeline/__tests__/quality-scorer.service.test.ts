import { describe, expect, it } from 'vitest';

import { scoreGeneratedContent } from '../quality-scorer.service.js';

const emailContent = {
  body: {
    summary:
      'Nexion Industries requests a spear_phishing review during HIGH alert in season 2 chapter 4.',
    justification:
      'The request references the sector ledger and asks the archive desk to verify the packet.',
    call_to_action: 'Review the packet and check the reserved-domain relay.',
  },
  links: [
    {
      label: 'Relay',
      url: 'https://verify.nexion.invalid/portal',
      is_suspicious: true,
    },
  ],
  attachments: [{ name: 'relay_notice.pdf', type: 'pdf', is_suspicious: false }],
  signals: [{ type: 'urgency' }, { type: 'domain_mismatch' }, { type: 'verification_hint' }],
};

describe('quality-scorer.service', () => {
  it('keeps scores normalized between zero and one', () => {
    const result = scoreGeneratedContent('email_phishing', emailContent, {
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      season: 2,
      chapter: 4,
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(Object.values(result.breakdown).every((value) => value >= 0 && value <= 1)).toBe(true);
  });

  it('raises narrative alignment when the generated content reflects the request context', () => {
    const matched = scoreGeneratedContent('email_phishing', emailContent, {
      faction: 'Nexion Industries',
      attackType: 'spear_phishing',
      threatLevel: 'HIGH',
      season: 2,
      chapter: 4,
    });
    const mismatched = scoreGeneratedContent('email_phishing', emailContent, {
      faction: 'Librarians',
      attackType: 'supply_chain',
      threatLevel: 'LOW',
      season: 1,
      chapter: 1,
    });

    expect(matched.breakdown.narrativeAlignment).toBeGreaterThan(
      mismatched.breakdown.narrativeAlignment,
    );
    expect(matched.score).toBeGreaterThan(mismatched.score);
  });
});
