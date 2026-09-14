import { ValueTransformer } from 'typeorm';
import * as crypto from 'crypto';

/**
 * AES-256-GCM field-level encryption for the most sensitive PII
 * (Phase 11.1: government IDs — student govIdNumber, employee sss/philhealth/
 * pagibig/tin numbers).
 *
 * - Key: ENCRYPTION_KEY env (any passphrase); derived to 32 bytes via scrypt.
 *   In production this must come from the secret vault, not a dotenv file.
 * - Format on disk: `enc:v1:<iv_b64>:<tag_b64>:<cipher_b64>` so key rotation
 *   (future `enc:v2:...`) can re-encrypt lazily on read.
 * - NULL/empty passes through untouched (columns are nullable).
 */
const VERSION = 'v1';
const PREFIX = `enc:${VERSION}:`;

function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || 'dev-only-insecure-key-change-me';
  // Salt is static per deployment; its purpose is key derivation, not secrecy.
  return crypto.scryptSync(secret, 'sms-field-encryption', 32);
}

export class EncryptedField {
  static encrypt(plain: string | null | undefined): string | null {
    if (plain == null || plain === '') return null;
    if (String(plain).startsWith(PREFIX)) return plain; // already encrypted
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
    const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
  }

  static decrypt(stored: string | null | undefined): string | null {
    if (stored == null || stored === '') return null;
    if (!stored.startsWith(PREFIX)) return stored; // plaintext legacy value
    try {
      const [, , ivB64, tagB64, dataB64] = stored.split(':');
      const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
      return dec.toString('utf8');
    } catch {
      // Wrong key or corrupted data — do not crash reads; surface as null.
      return null;
    }
  }

  /** TypeORM column transformer: encrypt on write, decrypt on read. */
  static transformer(): ValueTransformer {
    return {
      to: (value: string | null | undefined) => EncryptedField.encrypt(value),
      from: (value: string | null | undefined) => EncryptedField.decrypt(value),
    };
  }
}
