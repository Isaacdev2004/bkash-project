const validator = require('validator');

const MAX_AMOUNT = 500_000; // BDT — adjust for your business limits

/** Trim + length cap for technical IDs (bKash paymentID, etc.) */
function sanitizeString(input, maxLen) {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLen);
}

function sanitizePayerReference(input) {
  if (typeof input !== 'string') return '';
  // bKash disallows "<", ">", "&" in payerReference
  const t = validator.trim(input).replace(/[<>]/g, '').replace(/&/g, '').slice(0, 255);
  return t;
}

function sanitizeCallbackUrl(input) {
  if (typeof input !== 'string') return '';
  const t = validator.trim(input).slice(0, 2048);
  if (!t) return '';
  if (!validator.isURL(t, { protocols: ['http', 'https'], require_protocol: true })) {
    throw new Error('Invalid callback URL');
  }
  return t;
}

function assertPositiveAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Amount must be a positive number');
  }
  if (n > MAX_AMOUNT) {
    throw new Error('Amount exceeds allowed maximum');
  }
  return Math.round(n * 100) / 100;
}

module.exports = {
  sanitizeString,
  sanitizePayerReference,
  sanitizeCallbackUrl,
  assertPositiveAmount,
};
