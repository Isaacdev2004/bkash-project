const rateLimit = require('express-rate-limit');

/** Stricter limits for auth endpoints (credential stuffing) */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
});

/** General API throttle */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests' },
  skip: (req) => req.method === 'OPTIONS',
});

module.exports = { authLimiter, apiLimiter };
