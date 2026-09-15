const crypto = require('node:crypto');

function key() {
  const raw = process.env.CCTV_ENCRYPTION_KEY;
  if (!raw || !/^[a-f\d]{64}$/i.test(raw)) throw new Error('CCTV encryption key is not configured');
  return Buffer.from(raw, 'hex');
}

function encrypt(value, context) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
}

function decrypt(value, context) {
  const [version, iv, tag, ciphertext] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('Invalid encrypted value');
  const cipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(ciphertext, 'base64')), cipher.final()]).toString('utf8'));
}

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
function equalSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  return crypto.timingSafeEqual(Buffer.from(hashToken(a)), Buffer.from(hashToken(b)));
}
module.exports = { encrypt, decrypt, hashToken, equalSecret, validateKey: key };
