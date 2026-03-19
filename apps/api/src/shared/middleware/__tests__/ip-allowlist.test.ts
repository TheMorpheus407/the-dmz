import { describe, it, expect } from 'vitest';

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number) as [number, number, number, number];
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const parts = cidr.split('/') as [string, string];
  const range = parts[0];
  const bitsStr = parts[1];
  const bits = parseInt(bitsStr, 10);
  const mask = bits === 0 ? 0 : ~((1 << (32 - bits)) - 1);

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

function validateIpAllowlist(
  clientIp: string | null,
  allowlist: readonly string[] | undefined,
): boolean {
  if (!allowlist || allowlist.length === 0) {
    return true;
  }
  if (!clientIp) {
    return false;
  }
  return allowlist.some((pattern) => {
    if (pattern.includes('/')) {
      return isIpInCidr(clientIp, pattern);
    }
    return clientIp === pattern;
  });
}

function validateRefererRestrictions(
  referer: string | null,
  restrictions: readonly string[] | undefined,
): boolean {
  if (!restrictions || restrictions.length === 0) {
    return true;
  }
  if (!referer) {
    return false;
  }
  return restrictions.some((pattern) => {
    const regex = new RegExp(
      '^' +
        pattern
          .replace(/\*/g, '___WILDCARD___')
          .replace(/\./g, '\\.')
          .replace(/___WILDCARD___/g, '.*') +
        '$',
    );
    return regex.test(referer);
  });
}

describe('IP Allowlist Validation', () => {
  describe('validateIpAllowlist', () => {
    it('should return true when allowlist is empty', () => {
      expect(validateIpAllowlist('192.168.1.1', [])).toBe(true);
    });

    it('should return true when allowlist is undefined', () => {
      expect(validateIpAllowlist('192.168.1.1', undefined)).toBe(true);
    });

    it('should return true when client IP matches allowlist', () => {
      expect(validateIpAllowlist('192.168.1.1', ['192.168.1.1', '10.0.0.1'])).toBe(true);
    });

    it('should return false when client IP does not match allowlist', () => {
      expect(validateIpAllowlist('192.168.1.2', ['192.168.1.1', '10.0.0.1'])).toBe(false);
    });

    it('should return false when client IP is null', () => {
      expect(validateIpAllowlist(null, ['192.168.1.1'])).toBe(false);
    });

    it('should return false when client IP is empty string', () => {
      expect(validateIpAllowlist('', ['192.168.1.1'])).toBe(false);
    });

    it('should return true for exact IP match', () => {
      expect(validateIpAllowlist('10.0.0.1', ['10.0.0.1'])).toBe(true);
    });

    it('should return true when client IP is in CIDR range /24', () => {
      expect(validateIpAllowlist('192.168.1.100', ['192.168.1.0/24'])).toBe(true);
    });

    it('should return true when client IP is in CIDR range /16', () => {
      expect(validateIpAllowlist('192.168.5.10', ['192.168.0.0/16'])).toBe(true);
    });

    it('should return true when client IP is in CIDR range /8', () => {
      expect(validateIpAllowlist('10.50.100.1', ['10.0.0.0/8'])).toBe(true);
    });

    it('should return false when client IP is not in CIDR range', () => {
      expect(validateIpAllowlist('192.168.2.1', ['192.168.1.0/24'])).toBe(false);
    });

    it('should return true for mixed IP and CIDR allowlist', () => {
      expect(validateIpAllowlist('192.168.1.50', ['10.0.0.1', '192.168.1.0/24'])).toBe(true);
    });

    it('should return false when IP does not match any pattern in mixed list', () => {
      expect(validateIpAllowlist('172.16.0.1', ['10.0.0.1', '192.168.1.0/24'])).toBe(false);
    });

    it('should handle /32 CIDR as exact IP match', () => {
      expect(validateIpAllowlist('1.2.3.4', ['1.2.3.4/32'])).toBe(true);
      expect(validateIpAllowlist('1.2.3.5', ['1.2.3.4/32'])).toBe(false);
    });

    it('should handle /0 CIDR as match all', () => {
      expect(validateIpAllowlist('255.255.255.255', ['0.0.0.0/0'])).toBe(true);
    });
  });
});

describe('Referer Restrictions Validation', () => {
  describe('validateRefererRestrictions', () => {
    it('should return true when restrictions is empty', () => {
      expect(validateRefererRestrictions('https://example.com/webhook', [])).toBe(true);
    });

    it('should return true when restrictions is undefined', () => {
      expect(validateRefererRestrictions('https://example.com/webhook', undefined)).toBe(true);
    });

    it('should return true when referer matches restriction', () => {
      expect(
        validateRefererRestrictions('https://example.com/webhook', ['https://example.com/*']),
      ).toBe(true);
    });

    it('should return false when referer does not match restriction', () => {
      expect(
        validateRefererRestrictions('https://evil.com/webhook', ['https://example.com/*']),
      ).toBe(false);
    });

    it('should return false when referer is null', () => {
      expect(validateRefererRestrictions(null, ['https://example.com/*'])).toBe(false);
    });

    it('should return false when referer is empty string', () => {
      expect(validateRefererRestrictions('', ['https://example.com/*'])).toBe(false);
    });

    it('should support wildcard subdomain matching', () => {
      expect(
        validateRefererRestrictions('https://api.example.com/webhook', ['https://*.example.com/*']),
      ).toBe(true);
    });

    it('should match exact URL when no wildcard', () => {
      expect(
        validateRefererRestrictions('https://api.example.com/webhook', [
          'https://api.example.com/webhook',
        ]),
      ).toBe(true);
    });
  });
});
