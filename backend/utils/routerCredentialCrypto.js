const crypto = require('crypto');

const ENCRYPTED_PREFIX = 'enc:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKeyMaterial() {
  const secret =
    process.env.MIKROTIK_CREDENTIAL_KEY ||
    process.env.MIKROTIK_SECRET_KEY ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'Missing MIKROTIK_CREDENTIAL_KEY. Set a long random secret before storing router credentials.'
    );
  }

  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encryptSecret(value) {
  if (!value) {
    return null;
  }

  if (String(value).startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(value) {
  if (!value) {
    return null;
  }

  if (!String(value).startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const [, payload] = String(value).split(ENCRYPTED_PREFIX);
  const [ivHex, tagHex, encryptedHex] = payload.split(':');

  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Invalid encrypted router credential format.');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKeyMaterial(),
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function isEncryptedSecret(value) {
  return Boolean(value && String(value).startsWith(ENCRYPTED_PREFIX));
}

module.exports = {
  encryptSecret,
  decryptSecret,
  isEncryptedSecret,
};
