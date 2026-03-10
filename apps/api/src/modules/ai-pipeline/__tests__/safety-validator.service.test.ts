import { describe, expect, it } from 'vitest';

import { validateGeneratedContentSafety } from '../safety-validator.service.js';

const safeEmail = {
  content_type: 'email',
  headers: {
    from: 'liaison@nexion.test',
    to: 'intake@archive.invalid',
    subject: 'Verification Packet Review',
    date: '2063-09-14T14:22:00Z',
    message_id: '<msg-7742@nexion.test>',
    spf: 'fail',
    dkim: 'neutral',
    dmarc: 'fail',
  },
  body: {
    greeting: 'Director,',
    summary: 'Requesting a review of the attached verification packet.',
    justification: 'The archive relay was rotated during the overnight maintenance window.',
    call_to_action: 'Review the packet before approving access.',
    signature: 'Relay Office, Nexion',
  },
  links: [
    {
      label: 'Verification Portal',
      url: 'https://verify.nexion.invalid/portal',
      is_suspicious: true,
    },
  ],
  attachments: [{ name: 'verification_packet.pdf', type: 'pdf', is_suspicious: false }],
  signals: [
    {
      type: 'domain_mismatch',
      location: 'headers.from',
      explanation: 'The sender domain is not an expected archive domain.',
    },
  ],
  safety_flags: ['ok'],
};

describe('safety-validator.service', () => {
  it('accepts fictional content that uses reserved domains only', () => {
    const result = validateGeneratedContentSafety('email_phishing', safeEmail);

    expect(result.ok).toBe(true);
    expect(result.flags).toEqual(['ok']);
  });

  it('rejects blocked real-world entities and executable attachments', () => {
    const result = validateGeneratedContentSafety('email_phishing', {
      ...safeEmail,
      body: {
        ...safeEmail.body,
        justification: 'Please coordinate with Microsoft support and call +49 30 123 4567.',
      },
      attachments: [{ name: 'payload.exe', type: 'exe', is_suspicious: true }],
    });

    expect(result.ok).toBe(false);
    expect(result.flags).toContain('REAL_BRAND_DETECTED');
    expect(result.flags).toContain('PHONE_NUMBER_DETECTED');
    expect(result.flags).toContain('EXECUTABLE_ATTACHMENT');
  });

  it('rejects likely real-world organizations beyond the explicit blocklist', () => {
    const result = validateGeneratedContentSafety('email_phishing', {
      ...safeEmail,
      body: {
        ...safeEmail.body,
        justification: 'Please coordinate with Cisco support today.',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.flags).toContain('REAL_BRAND_DETECTED');
  });

  it('rejects likely real-world person names outside the explicit blocklist', () => {
    const result = validateGeneratedContentSafety('email_phishing', {
      ...safeEmail,
      body: {
        ...safeEmail.body,
        signature: 'John Smith',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.flags).toContain('REAL_PERSON_DETECTED');
  });

  it('rejects real URLs and IP addresses', () => {
    const result = validateGeneratedContentSafety('email_phishing', {
      ...safeEmail,
      links: [{ label: 'Portal', url: 'https://github.com/login', is_suspicious: true }],
      body: {
        ...safeEmail.body,
        call_to_action: 'Connect to 10.0.0.8 before shift end.',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.flags).toContain('REAL_URL_DETECTED');
    expect(result.flags).toContain('IP_ADDRESS_DETECTED');
  });

  it('rejects bare hostnames that do not use reserved TLDs', () => {
    const result = validateGeneratedContentSafety('email_phishing', {
      ...safeEmail,
      body: {
        ...safeEmail.body,
        call_to_action: 'Open portal.contoso.com immediately and review the queue.',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.flags).toContain('REAL_URL_DETECTED');
  });

  it('accepts bare reserved hostnames in narrative text', () => {
    const result = validateGeneratedContentSafety('email_phishing', {
      ...safeEmail,
      body: {
        ...safeEmail.body,
        call_to_action: 'Open verify.nexion.invalid/portal before approving access.',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.flags).toEqual(['ok']);
  });

  it('rejects IPv6 literals', () => {
    const result = validateGeneratedContentSafety('email_phishing', {
      ...safeEmail,
      body: {
        ...safeEmail.body,
        call_to_action: 'Route the relay through 2001:4860:4860::8888 before shift end.',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.flags).toContain('IP_ADDRESS_DETECTED');
  });
});
