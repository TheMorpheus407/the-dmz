import { createHash, randomBytes } from 'crypto';

export interface AnonymizationRule {
  field: string;
  method: 'hash' | 'redact' | 'null' | 'fake' | 'preserve';
  options?: {
    salt?: string;
    prefix?: string;
    preserveLength?: boolean;
    preserveFormat?: boolean;
  };
}

export interface AnonymizationConfig {
  rules: AnonymizationRule[];
  defaultMethod: 'hash' | 'redact' | 'null';
}

const DEFAULT_PII_FIELDS: AnonymizationRule[] = [
  { field: 'email', method: 'hash', options: { prefix: 'anon_', preserveFormat: true } },
  { field: 'emailAddress', method: 'hash', options: { prefix: 'anon_', preserveFormat: true } },
  { field: 'ipAddress', method: 'redact', options: { prefix: 'REDACTED_' } },
  { field: 'ip', method: 'redact', options: { prefix: 'REDACTED_' } },
  { field: 'name', method: 'hash', options: { prefix: 'USER_' } },
  { field: 'fullName', method: 'hash', options: { prefix: 'USER_' } },
  { field: 'firstName', method: 'hash', options: { prefix: 'FIRST_' } },
  { field: 'lastName', method: 'hash', options: { prefix: 'LAST_' } },
  { field: 'phone', method: 'redact', options: { prefix: 'PHONE_' } },
  { field: 'phoneNumber', method: 'redact', options: { prefix: 'PHONE_' } },
  { field: 'address', method: 'redact', options: { prefix: 'ADDR_' } },
  { field: 'dateOfBirth', method: 'null' },
  { field: 'ssn', method: 'null' },
  { field: 'socialSecurityNumber', method: 'null' },
  { field: 'creditCard', method: 'null' },
  { field: 'password', method: 'null' },
  { field: 'passwordHash', method: 'null' },
  { field: 'secret', method: 'null' },
  { field: 'apiKey', method: 'redact', options: { prefix: 'KEY_' } },
  { field: 'token', method: 'redact', options: { prefix: 'TOKEN_' } },
  { field: 'accessToken', method: 'redact', options: { prefix: 'TOKEN_' } },
  { field: 'refreshToken', method: 'redact', options: { prefix: 'TOKEN_' } },
];

export class AnonymizationService {
  private config: AnonymizationConfig;
  private salt: string;

  constructor(config?: Partial<AnonymizationConfig>, salt?: string) {
    this.salt = salt || randomBytes(16).toString('hex');
    this.config = {
      rules: config?.rules || DEFAULT_PII_FIELDS,
      defaultMethod: config?.defaultMethod || 'redact',
    };
  }

  public anonymize(data: Record<string, unknown>): {
    anonymized: Record<string, unknown>;
    fieldsAnonymized: string[];
  } {
    const anonymized: Record<string, unknown> = { ...data };
    const fieldsAnonymized: string[] = [];

    for (const rule of this.config.rules) {
      if (this.hasField(anonymized, rule.field)) {
        const result = this.applyRule(anonymized, rule);
        if (result.anonymized) {
          fieldsAnonymized.push(rule.field);
        }
      }
    }

    this.removeNestedPii(anonymized, fieldsAnonymized);

    return { anonymized, fieldsAnonymized };
  }

  public anonymizeUserId(userId: string): string {
    return this.hashValue(userId, 'anon_');
  }

  public anonymizeEmail(email: string): string {
    const hash = this.hashValue(email, '');
    return `anon_${hash.substring(0, 12)}@anonymized.invalid`;
  }

  public anonymizeIpAddress(ip: string): string {
    return `REDACTED_${this.hashValue(ip, '').substring(0, 8)}`;
  }

  public createAnonymizedUserIdMapping(originalUserId: string): {
    originalId: string;
    anonymizedId: string;
    mappingKey: string;
  } {
    const anonymizedId = this.anonymizeUserId(originalUserId);
    const mappingKey = this.createMappingKey(originalUserId, anonymizedId);

    return {
      originalId: originalUserId,
      anonymizedId,
      mappingKey,
    };
  }

  public validateAnonymization(data: Record<string, unknown>): {
    isValid: boolean;
    remainingPii: string[];
  } {
    const piiPatterns = [
      {
        pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        fields: ['email', 'emailAddress'],
      },
      { pattern: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, fields: ['ipAddress', 'ip'] },
      { pattern: /^\d{3}-\d{2}-\d{4}$/, fields: ['ssn'] },
    ];

    const remainingPii: string[] = [];

    for (const { pattern, fields } of piiPatterns) {
      for (const field of fields) {
        if (this.hasField(data, field)) {
          const value = this.getFieldValue(data, field);
          if (typeof value === 'string' && pattern.test(value)) {
            remainingPii.push(field);
          }
        }
      }
    }

    return {
      isValid: remainingPii.length === 0,
      remainingPii,
    };
  }

  private hasField(data: Record<string, unknown>, field: string): boolean {
    if (field in data) {
      return true;
    }

    if (field.includes('.')) {
      const parts = field.split('.');
      let current: unknown = data;
      for (const part of parts) {
        if (typeof current === 'object' && current !== null && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  private getFieldValue(data: Record<string, unknown>, field: string): unknown {
    if (field in data) {
      return data[field];
    }

    if (field.includes('.')) {
      const parts = field.split('.');
      let current: unknown = data;
      for (const part of parts) {
        if (typeof current === 'object' && current !== null && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return undefined;
        }
      }
      return current;
    }

    return undefined;
  }

  private setFieldValue(data: Record<string, unknown>, field: string, value: unknown): void {
    if (!field.includes('.')) {
      data[field] = value;
      return;
    }

    const parts = field.split('.');
    let current: Record<string, unknown> = data;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]!] = value;
  }

  private applyRule(
    data: Record<string, unknown>,
    rule: AnonymizationRule,
  ): { anonymized: boolean } {
    const value = this.getFieldValue(data, rule.field);
    if (value === undefined || value === null) {
      return { anonymized: false };
    }

    let anonymizedValue: unknown;

    switch (rule.method) {
      case 'hash':
        anonymizedValue = this.hashValue(
          typeof value === 'object' ? JSON.stringify(value) : String(value as string),
          rule.options?.prefix || '',
        );
        break;
      case 'redact':
        anonymizedValue = `${rule.options?.prefix || 'REDACTED'}`;
        break;
      case 'null':
        anonymizedValue = null;
        break;
      case 'fake':
        anonymizedValue = this.generateFakeValue(rule.field);
        break;
      case 'preserve':
        anonymizedValue = value;
        break;
      default:
        anonymizedValue = this.applyDefault(
          typeof value === 'object' ? JSON.stringify(value) : String(value as string),
        );
    }

    this.setFieldValue(data, rule.field, anonymizedValue);
    return { anonymized: true };
  }

  private hashValue(value: string, prefix: string): string {
    const hash = createHash('sha256')
      .update(value + this.salt)
      .digest('hex');
    return prefix + hash.substring(0, 16);
  }

  private applyDefault(value: string): string {
    switch (this.config.defaultMethod) {
      case 'hash':
        return this.hashValue(value, '');
      case 'redact':
        return 'REDACTED';
      case 'null':
        return null as unknown as string;
      default:
        return 'REDACTED';
    }
  }

  private generateFakeValue(field: string): string {
    const fakes: Record<string, string> = {
      email: 'anonymous@example.com',
      emailAddress: 'anonymous@example.com',
      name: 'Anonymous User',
      fullName: 'Anonymous User',
      firstName: 'Anonymous',
      lastName: 'User',
      phone: '000-000-0000',
      phoneNumber: '000-000-0000',
      address: 'REDACTED ADDRESS',
      ipAddress: '0.0.0.0',
      ip: '0.0.0.0',
    };

    return fakes[field] || 'REDACTED';
  }

  private removeNestedPii(data: Record<string, unknown>, fieldsAnonymized: string[]): void {
    const nestedPiiFields = ['email', 'emailAddress', 'ipAddress', 'ip', 'name', 'fullName'];

    for (const field of nestedPiiFields) {
      if (fieldsAnonymized.includes(field)) {
        continue;
      }

      if (this.hasField(data, field)) {
        const value = this.getFieldValue(data, field);
        if (value && typeof value === 'object') {
          const nested = value as Record<string, unknown>;
          for (const rule of this.config.rules) {
            if (this.hasField(nested, rule.field)) {
              this.applyRule(nested, rule);
              fieldsAnonymized.push(`${field}.${rule.field}`);
            }
          }
        }
      }
    }

    if (data['payload'] && typeof data['payload'] === 'object') {
      const payload = data['payload'] as Record<string, unknown>;
      for (const rule of this.config.rules) {
        if (this.hasField(payload, rule.field)) {
          this.applyRule(payload, rule);
          fieldsAnonymized.push(`payload.${rule.field}`);
        }
      }
    }
  }

  private createMappingKey(originalUserId: string, anonymizedId: string): string {
    return createHash('sha256')
      .update(`${originalUserId}:${anonymizedId}:${this.salt}`)
      .digest('base64');
  }

  public getRules(): AnonymizationRule[] {
    return [...this.config.rules];
  }

  public addRule(rule: AnonymizationRule): void {
    const existingIndex = this.config.rules.findIndex((r) => r.field === rule.field);
    if (existingIndex >= 0) {
      this.config.rules[existingIndex] = rule;
    } else {
      this.config.rules.push(rule);
    }
  }

  public removeRule(field: string): boolean {
    const index = this.config.rules.findIndex((r) => r.field === field);
    if (index >= 0) {
      this.config.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  public resetToDefaults(): void {
    this.config.rules = [...DEFAULT_PII_FIELDS];
  }
}

export const anonymizationService = new AnonymizationService();
