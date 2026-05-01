import { randomBytes } from 'node:crypto';

const PASSWORD_CHARSET_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const PASSWORD_CHARSET_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PASSWORD_CHARSET_DIGIT = '0123456789';
const PASSWORD_CHARSET_SPECIAL = '!@#$%^&*';

const PASSWORD_CHARSET_ALL =
  PASSWORD_CHARSET_LOWERCASE +
  PASSWORD_CHARSET_UPPERCASE +
  PASSWORD_CHARSET_DIGIT +
  PASSWORD_CHARSET_SPECIAL;

const getRandomIndex = (max: number): number => {
  const bytes = randomBytes(4);
  const uint32 = bytes.readUInt32BE(0);
  return uint32 % max;
};

const getRandomChar = (chars: string): string => {
  const index = getRandomIndex(chars.length);
  return chars[index]!;
};

export const generateSecurePassword = (length: number = 16): string => {
  const password: string[] = [];

  password.push(getRandomChar(PASSWORD_CHARSET_LOWERCASE));
  password.push(getRandomChar(PASSWORD_CHARSET_UPPERCASE));
  password.push(getRandomChar(PASSWORD_CHARSET_DIGIT));
  password.push(getRandomChar(PASSWORD_CHARSET_SPECIAL));

  for (let i = password.length; i < length; i++) {
    password.push(getRandomChar(PASSWORD_CHARSET_ALL));
  }

  for (let i = password.length - 1; i > 0; i--) {
    const j = getRandomIndex(i + 1);
    const temp = password[i]!;
    password[i] = password[j]!;
    password[j] = temp;
  }

  return password.join('');
};

export const validatePasswordStrength = (
  password: string,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
