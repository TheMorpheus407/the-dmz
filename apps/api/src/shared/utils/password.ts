const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SPECIAL = '!@#$%^&*';

const ALL_CHARS = LOWERCASE + UPPERCASE + NUMBERS + SPECIAL;

const getRandomIndex = (max: number): number => {
  return Math.floor(Math.random() * max);
};

const getRandomChar = (chars: string): string => {
  const index = getRandomIndex(chars.length);
  return chars[index]!;
};

export const generateSecurePassword = (length: number = 16): string => {
  const password: string[] = [];

  password.push(getRandomChar(LOWERCASE));
  password.push(getRandomChar(UPPERCASE));
  password.push(getRandomChar(NUMBERS));
  password.push(getRandomChar(SPECIAL));

  for (let i = password.length; i < length; i++) {
    password.push(getRandomChar(ALL_CHARS));
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
