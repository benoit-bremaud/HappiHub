import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { foldEmail } from './email.js';

// Field-level encryption at rest (spec db-encryption-at-rest § 4–6). Pure: the keyring is a
// value injected by the composition root; no file, environment or database access here.
const VERSION = 'hh1';
const KID = /^[a-z0-9]{1,16}$/;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/** AAD of every encrypted column (spec § 2, § 4): the single source for writers, readers and reencrypt. */
export const FIELD = Object.freeze({
  accountEmail: 'account.email_enc', accountPendingEmail: 'account.pending_email_enc',
  accountDisplayName: 'account.display_name_enc', invitationEmail: 'invitation.email_enc',
  associationContactEmail: 'association.contact_email_enc',
  outboxRecipient: 'outbox_message.recipient_enc', outboxPayload: 'outbox_message.payload_enc',
});
const COLUMNS = new Set(Object.values(FIELD));

/** Generic failure: never carries a key, an envelope or a plaintext (AC3, AC6). */
export class FieldCipherError extends Error {
  constructor(message = 'Field decryption failed') {
    super(message);
    this.name = 'FieldCipherError';
  }
}

const decodeKey = (value) => {
  const key = typeof value === 'string' ? Buffer.from(value, 'base64') : null;
  if (key?.length !== KEY_BYTES || key.toString('base64') !== value) throw new FieldCipherError('Field keyring is invalid');
  return key;
};

/** Validate `{ active, keys: { kid: base64 }, blindIndex: base64 }` into buffers (§ 6.1, AC4). */
const readKeyring = (keyring) => {
  if (!keyring || typeof keyring !== 'object' || !keyring.keys || typeof keyring.keys !== 'object')
    throw new FieldCipherError('Field keyring is invalid');
  const keys = new Map();
  for (const [kid, value] of Object.entries(keyring.keys)) {
    if (!KID.test(kid)) throw new FieldCipherError('Field keyring is invalid');
    keys.set(kid, decodeKey(value));
  }
  if (!keys.has(keyring.active)) throw new FieldCipherError('Field keyring is invalid');
  const blindIndexKey = decodeKey(keyring.blindIndex);
  if ([...keys.values()].some((key) => key.equals(blindIndexKey))) throw new FieldCipherError('Field keyring is invalid');
  return { active: keyring.active, keys, blindIndexKey };
};

const assertColumn = (column) => {
  if (!COLUMNS.has(column)) throw new FieldCipherError('Field column is invalid');
};

/** `hh1.<kid>.<b64url>` into its parts; anything else is a generic failure. */
const parse = (envelope) => {
  const parts = typeof envelope === 'string' ? envelope.split('.') : [];
  if (parts.length !== 3 || parts[0] !== VERSION || !KID.test(parts[1])) throw new FieldCipherError();
  const bytes = Buffer.from(parts[2], 'base64url');
  if (bytes.length < IV_BYTES + TAG_BYTES || bytes.toString('base64url') !== parts[2]) throw new FieldCipherError();
  return { kid: parts[1], bytes };
};

/**
 * Build the cipher once from a keyring. `column` is one of `FIELD`, bound as AAD so an
 * envelope moved to another column fails (T7). `NULL`, `undefined` and `''` stay `null`;
 * any other non-string value is refused.
 */
export const createFieldCipher = (keyring) => {
  const { active, keys, blindIndexKey } = readKeyring(keyring);
  return Object.freeze({
    encrypt(column, value) {
      assertColumn(column);
      if (value === null || value === undefined || value === '') return null;
      if (typeof value !== 'string') throw new FieldCipherError('Field value must be a string');
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv('aes-256-gcm', keys.get(active), iv);
      cipher.setAAD(Buffer.from(column));
      const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      return `${VERSION}.${active}.${Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString('base64url')}`;
    },
    decrypt(column, envelope) {
      assertColumn(column);
      if (envelope === null || envelope === undefined) return null;
      const { kid, bytes } = parse(envelope);
      const key = keys.get(kid);
      if (!key) throw new FieldCipherError();
      try {
        const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, IV_BYTES));
        decipher.setAAD(Buffer.from(column));
        decipher.setAuthTag(bytes.subarray(bytes.length - TAG_BYTES));
        return Buffer.concat([decipher.update(bytes.subarray(IV_BYTES, bytes.length - TAG_BYTES)), decipher.final()])
          .toString('utf8');
      } catch {
        throw new FieldCipherError();
      }
    },
    /** HMAC-SHA256 over the single `email` purpose and `foldEmail` normalization (§ 5, D5). */
    blindIndex(value) {
      if (value === null || value === undefined || value === '') return null;
      return createHmac('sha256', blindIndexKey).update(`email:${foldEmail(value)}`).digest();
    },
    /** True when the envelope was written with a key other than the active one (§ 6.2). */
    needsRotation(envelope) {
      if (envelope === null || envelope === undefined) return false;
      return parse(envelope).kid !== active;
    },
  });
};
