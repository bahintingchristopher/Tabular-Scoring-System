const crypto = require('crypto');

const KEY_LEN = 64;
const SALT_LEN = 16;

function isValidPin(pin) {
  return typeof pin === 'string' && /^[0-9]{4}$/.test(pin);
}

function hashPin(pin) {
  if (!isValidPin(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }
  const salt = crypto.randomBytes(SALT_LEN);
  const hash = crypto.scryptSync(pin, salt, KEY_LEN);
  return salt.toString('hex') + ':' + hash.toString('hex');
}

function verifyPin(pin, stored) {
  if (!isValidPin(pin) || typeof stored !== 'string') return false;

  const parts = stored.split(':');
  if (parts.length !== 2) return false;

  const salt = Buffer.from(parts[0], 'hex');
  const expected = Buffer.from(parts[1], 'hex');
  if (salt.length !== SALT_LEN || expected.length !== KEY_LEN) return false;

  const actual = crypto.scryptSync(pin, salt, KEY_LEN);
  return crypto.timingSafeEqual(actual, expected);
}

module.exports = { hashPin, verifyPin, isValidPin };