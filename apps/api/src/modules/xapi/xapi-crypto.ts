import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_LENGTH = 32;
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env['XAPI_ENCRYPTION_KEY'];
  if (!key || key.length < ENCRYPTION_KEY_LENGTH) {
    throw new Error('XAPI_ENCRYPTION_KEY must be at least 32 characters');
  }
  return Buffer.from(key.slice(0, ENCRYPTION_KEY_LENGTH), 'utf-8');
}

export function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decryptSecret(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, encryptedData] = encrypted.split(':');

  if (!ivHex || !tagHex || !encryptedData) {
    throw new Error('Invalid encrypted secret format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
