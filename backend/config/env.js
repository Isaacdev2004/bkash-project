/**
 * Centralized environment loading and validation (fail fast on boot).
 */
require('dotenv').config();

function required(name) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

/** true, 1, yes (case-insensitive) — Render/UI typos break strict === 'true' */
function envFlag(name) {
  const v = String(process.env[name] ?? '')
    .trim()
    .toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

const isMock = envFlag('BKASH_USE_MOCK');
const isSandbox = envFlag('BKASH_SANDBOX') || process.env.NODE_ENV === 'test';

// Sandbox default matches bKash tokenized checkout docs (path includes version).
const defaultSandboxBase = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';

function resolveBkashBaseUrl() {
  if (isMock) return '';
  if (process.env.BKASH_BASE_URL) return process.env.BKASH_BASE_URL;
  if (isSandbox) return defaultSandboxBase;
  throw new Error('BKASH_BASE_URL is required when BKASH_SANDBOX is false');
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ADMIN_API_KEY: required('ADMIN_API_KEY'),
  BKASH_APP_KEY: isMock ? '' : required('BKASH_APP_KEY'),
  BKASH_APP_SECRET: isMock ? '' : required('BKASH_APP_SECRET'),
  BKASH_USERNAME: isMock ? '' : required('BKASH_USERNAME'),
  BKASH_PASSWORD: isMock ? '' : required('BKASH_PASSWORD'),
  get BKASH_BASE_URL() {
    return resolveBkashBaseUrl();
  },
  BKASH_SANDBOX: isSandbox,
  BKASH_USE_MOCK: isMock,
  /** Public callback base (bKash redirects); used when client omits callbackURL */
  BKASH_CALLBACK_BASE_URL: process.env.BKASH_CALLBACK_BASE_URL || 'https://localhost',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
