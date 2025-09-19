// backend/middleware/rateLimiters.js
// Minimal, env-driven rate limiters.
// Uses RL_GENERAL_MAX and RL_AUTH_MAX if present, with safe defaults.

const rateLimit = require('express-rate-limit');

const windowMs = 15 * 60 * 1000; // 15 minutes
const GENERAL_MAX = Number(process.env.RL_GENERAL_MAX || 1000);
const AUTH_MAX = Number(process.env.RL_AUTH_MAX || 100);
const WRITE_MAX = Math.max(Math.floor(GENERAL_MAX * 0.3), 200); // derived, safe default

const appLimiter = rateLimit({
  windowMs,
  max: GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs,
  max: AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs,
  max: WRITE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { appLimiter, authLimiter, writeLimiter };