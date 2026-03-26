const crypto = require('crypto');
const env = require('../config/env');

/** In-memory state for BKASH_USE_MOCK so execute/query stay consistent */
const mockPayments = new Map();

const RETRIES = 3;
const TIMEOUT_MS = 12_000;

/** In-memory id_token cache */
let cached = { token: null, expiresAt: 0 };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function base() {
  const b = env.BKASH_BASE_URL.replace(/\/$/, '');
  return b;
}

async function fetchJson(url, options) {
  let lastErr;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Invalid JSON from bKash');
      }
      if (!res.ok) {
        const msg = data.errorMessage || data.message || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      const retryable =
        e.name === 'AbortError' ||
        e.code === 'ECONNRESET' ||
        e.code === 'ETIMEDOUT' ||
        (e.status >= 500 && e.status < 600);
      if (!retryable || attempt === RETRIES - 1) break;
      await sleep(200 * 2 ** attempt);
    }
  }
  const msg =
    lastErr?.name === 'AbortError'
      ? 'bKash request timed out — please try again'
      : lastErr?.message || 'bKash request failed';
  const err = new Error(msg);
  err.cause = lastErr;
  throw err;
}

/** bKash often returns HTTP 200 with statusCode !== 0000 for business errors */
function checkBkashResponse(data) {
  if (!data) return;
  if (data.errorCode) {
    throw new Error(data.errorMessage || 'bKash error');
  }
  if (data.statusCode != null && String(data.statusCode) !== '0000') {
    throw new Error(data.statusMessage || data.errorMessage || 'bKash error');
  }
}

/**
 * Grant Token — server-side only; credentials never leave this service.
 */
async function grantToken() {
  if (env.BKASH_USE_MOCK) {
    return { id_token: 'mock_id_token', expires_in: '3600' };
  }
  const now = Date.now();
  if (cached.token && now < cached.expiresAt - 60_000) {
    return { id_token: cached.token, expires_in: '3600' };
  }
  const url = `${base()}/tokenized/checkout/token/grant`;
  const data = await fetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: env.BKASH_USERNAME,
      password: env.BKASH_PASSWORD,
    },
    body: JSON.stringify({
      app_key: env.BKASH_APP_KEY,
      app_secret: env.BKASH_APP_SECRET,
    }),
  });
  checkBkashResponse(data);
  const idToken = data.id_token;
  if (!idToken) {
    throw new Error(data.statusMessage || 'Failed to obtain bKash token');
  }
  const expSec = parseInt(String(data.expires_in || '3600'), 10) || 3600;
  cached = { token: idToken, expiresAt: Date.now() + expSec * 1000 };
  return data;
}

async function authHeaders() {
  const t = await grantToken();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: t.id_token,
    'X-App-Key': env.BKASH_APP_KEY,
  };
}

/**
 * Checkout (URL-based) create — mode 0011 (no agreement id).
 * @see https://developer.bka.sh/docs/create-payment-2
 */
async function createPayment({
  amount,
  merchantInvoiceNumber,
  callbackURL,
  payerReference,
}) {
  if (env.BKASH_USE_MOCK) {
    const paymentID = `MOCK${crypto.randomBytes(8).toString('hex')}`;
    mockPayments.set(paymentID, {
      amount: String(amount),
      merchantInvoiceNumber,
      trxID: null,
    });
    const cb = new URL(callbackURL);
    cb.searchParams.set('paymentID', paymentID);
    cb.searchParams.set('status', 'success');
    return {
      statusCode: '0000',
      paymentID,
      bkashURL: cb.toString(),
      transactionStatus: 'Initiated',
      merchantInvoiceNumber,
      amount: String(amount),
      currency: 'BDT',
    };
  }
  const headers = await authHeaders();
  const url = `${base()}/tokenized/checkout/create`;
  const body = {
    mode: '0011',
    payerReference: payerReference || 'customer',
    callbackURL,
    amount: String(amount),
    currency: 'BDT',
    intent: 'sale',
    merchantInvoiceNumber,
  };
  const data = await fetchJson(url, { method: 'POST', headers, body: JSON.stringify(body) });
  checkBkashResponse(data);
  return data;
}

/**
 * @see https://developer.bka.sh/docs/execute-payment-2
 */
async function executePayment(paymentID, { expectedAmount, merchantInvoiceNumber } = {}) {
  if (env.BKASH_USE_MOCK) {
    const rec = mockPayments.get(paymentID) || {};
    const trxID = `MOCKTRX${crypto.randomBytes(4).toString('hex')}`;
    rec.trxID = trxID;
    if (merchantInvoiceNumber) rec.merchantInvoiceNumber = merchantInvoiceNumber;
    if (expectedAmount != null) rec.amount = String(expectedAmount);
    mockPayments.set(paymentID, rec);
    return {
      statusCode: '0000',
      paymentID,
      trxID,
      transactionStatus: 'Completed',
      amount: rec.amount || String(expectedAmount || '1'),
      merchantInvoiceNumber: rec.merchantInvoiceNumber || merchantInvoiceNumber || 'mock',
    };
  }
  const headers = await authHeaders();
  const url = `${base()}/tokenized/checkout/execute`;
  const data = await fetchJson(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ paymentID }),
  });
  checkBkashResponse(data);
  return data;
}

/**
 * Query payment status — verify before marking success.
 * @see https://developer.bka.sh/docs/query-payment-1
 */
async function queryPaymentStatus(paymentID) {
  if (env.BKASH_USE_MOCK) {
    const rec = mockPayments.get(paymentID) || {};
    return {
      statusCode: '0000',
      paymentID,
      transactionStatus: rec.trxID ? 'Completed' : 'Initiated',
      trxID: rec.trxID || '',
      amount: rec.amount || '1',
      merchantInvoice: rec.merchantInvoiceNumber || 'mock',
    };
  }
  const headers = await authHeaders();
  const url = `${base()}/tokenized/checkout/payment/status`;
  const data = await fetchJson(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ paymentID }),
  });
  checkBkashResponse(data);
  return data;
}

/**
 * Slow networks: query may lag behind execute — retry briefly before failing closed.
 */
async function verifyPaymentCompleted(paymentID) {
  let last;
  for (let i = 0; i < 4; i++) {
    last = await queryPaymentStatus(paymentID);
    if (last.transactionStatus === 'Completed' && last.trxID) {
      return last;
    }
    if (last.transactionStatus === 'Initiated' && i < 3) {
      await sleep(400 * (i + 1));
    } else {
      break;
    }
  }
  throw new Error(last?.statusMessage || 'Payment verification incomplete');
}

module.exports = {
  grantToken,
  createPayment,
  executePayment,
  queryPaymentStatus,
  verifyPaymentCompleted,
  checkBkashResponse,
};
