// backend/server.js
/* eslint-disable no-console */

// ------------------------- Core & 3P -------------------------
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const dotenv = require('dotenv');
dotenv.config();
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,

  // aligned with your .env
  CORS_ORIGINS: String(process.env.CORS_ORIGINS || ''),
  JSON_LIMIT: String(process.env.JSON_LIMIT || '100kb'),
  RL_GENERAL_MAX: Number(process.env.RL_GENERAL_MAX || 1000),
  RL_AUTH_MAX: Number(process.env.RL_AUTH_MAX || 100),

  ENABLE_FORGOT_PASSWORD: String(process.env.ENABLE_FORGOT_PASSWORD || 'false').toLowerCase() === 'true',
};

// Fail fast for critical vars
['MONGO_URI', 'JWT_SECRET'].forEach((k) => {
  if (!env[k]) {
    console.error(`[config] Missing required env ${k}`);
    process.exit(1);
  }
});

function getAllowedOrigins() {
  return env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
}
const allowedOrigins = new Set(getAllowedOrigins());

// ------------------------- App/Server ------------------------
const app = express();
const server = http.createServer(app);

// If behind a proxy (NGINX/Heroku/Render/etc.)
app.set('trust proxy', 1);

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:", "blob:", "res.cloudinary.com"],
      "connect-src": ["'self'", ...getAllowedOrigins()],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "frame-ancestors": ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS with allowlist (HTTP)
app.use((req, res, next) => {
  if (req.headers.origin) {
    console.log('[CORS] Origin:', req.headers.origin, '->', req.method, req.originalUrl);
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // same-origin / curl
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Compression
app.use(compression());

// Parsers (env-driven limits)
app.use(express.json({ limit: env.JSON_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: env.JSON_LIMIT }));
app.use(cookieParser());

// Sanitization
app.use(mongoSanitize());
app.use(xssClean());

// ------------------------- Rate Limiters ---------------------
const windowMs = 15 * 60 * 1000;
const appLimiter = rateLimit({
  windowMs,
  max: env.RL_GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs,
  max: env.RL_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
const writeLimiter = rateLimit({
  windowMs,
  max: Math.max(Math.floor(env.RL_GENERAL_MAX * 0.3), 200),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(appLimiter);

// ------------------------- Database --------------------------
mongoose.set('strictQuery', true);
mongoose.connect(env.MONGO_URI)
  .then(() => {/* console.log('[mongo] connected') */})
  .catch((err) => {
    console.error('[mongo] connection error', err);
    process.exit(1);
  });

// ------------------------- Health ----------------------------
app.get('/healthz', (req, res) => {
  res.json({ ok: true, env: env.NODE_ENV });
});
app.get('/readyz', (req, res) => {
  const state = mongoose.connection.readyState; // 1 = connected
  res.status(state === 1 ? 200 : 503).json({ mongoConnected: state === 1 });
});

// ------------------------- Routes ----------------------------
// Helper to require routes without crashing if a file is absent.
function tryRequire(p) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(p);
  } catch (e) {
  // console.log(`[routes] skipped ${p} (not found)`);
    return null;
  }
}

// Auth (login/signup/etc.)
const authRoutes = tryRequire('./routes/authroutes') || tryRequire('./routes/authRoutes') || tryRequire('./routes/auth');
if (authRoutes) app.use('/api/auth', authLimiter, authRoutes);

// Users (profiles, search users, etc.)
const userRoutes = tryRequire('./routes/userroutes') || tryRequire('./routes/userRoutes') || tryRequire('./routes/users');
if (userRoutes) app.use('/api/users', userRoutes);

// Insights (posts/articles)
const insightRoutes = tryRequire('./routes/insightroutes') || tryRequire('./routes/insightRoutes') || tryRequire('./routes/insights');
if (insightRoutes) app.use('/api/insights', writeLimiter, insightRoutes);

// Comments (nested)
const commentRoutes = tryRequire('./routes/commentroutes') || tryRequire('./routes/commentRoutes') || tryRequire('./routes/comments');
if (commentRoutes) app.use('/api/comments', writeLimiter, commentRoutes);

// Bookmarks
const bookmarkRoutes = tryRequire('./routes/bookmarkroutes') || tryRequire('./routes/bookmarkRoutes') || tryRequire('./routes/bookmarks');
if (bookmarkRoutes) app.use('/api/bookmarks', writeLimiter, bookmarkRoutes);

// Follows
const followRoutes = tryRequire('./routes/followroutes') || tryRequire('./routes/followRoutes') || tryRequire('./routes/follows');
if (followRoutes) app.use('/api/follows', writeLimiter, followRoutes);

// Reports / Moderation (user reports content)
const reportRoutes = tryRequire('./routes/reportroutes') || tryRequire('./routes/reportRoutes') || tryRequire('./routes/reports');
if (reportRoutes) app.use('/api/reports', writeLimiter, reportRoutes);

// Notifications
const notificationRoutes = tryRequire('./routes/notificationroutes') || tryRequire('./routes/notificationRoutes') || tryRequire('./routes/notifications');
if (notificationRoutes) app.use('/api/notifications', notificationRoutes);

// Media / Uploads (avatars/images)
const mediaRoutes = tryRequire('./routes/mediaroutes') || tryRequire('./routes/mediaRoutes') || tryRequire('./routes/media');
if (mediaRoutes) app.use('/api/media', writeLimiter, mediaRoutes);

// Admin (hide/delete/ban/unban, dashboards)
const adminRoutes = tryRequire('./routes/adminroutes') || tryRequire('./routes/adminRoutes') || tryRequire('./routes/admin');
if (adminRoutes) app.use('/api/admin', authLimiter, adminRoutes);

// If you export a combined router as ./routes/index.js, mount it under /api (kept last so specific mounts above win)
const combinedRouter = tryRequire('./routes');
if (combinedRouter && typeof combinedRouter === 'function') {
  app.use('/api', combinedRouter);
}

// Production safeguard: disable forgot/reset unless enabled
if (!env.ENABLE_FORGOT_PASSWORD) {
  app.all(['/api/auth/forgot-password', '/api/auth/reset-password'], (req, res) => {
    return res.status(501).json({ success: false, message: 'Password reset flow is disabled in production' });
  });
}

// 404 handler (for unmatched routes)
app.use((req, res, next) => {
  const err = new Error(`Not Found - ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

// Central error handler (hide stacks in prod)
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isProd = env.NODE_ENV === 'production';
  const payload = {
    success: false,
    message: isProd
      ? (status === 404 ? 'Resource not found' : 'Something went wrong')
      : (err.message || 'Error'),
  };
  if (!isProd) {
    payload.stack = err.stack;
    payload.details = err.details || undefined;
  }
  console.error(JSON.stringify({
    level: 'error',
    msg: err.message,
    status,
    path: req.originalUrl,
    method: req.method,
  }));
  res.status(status).json(payload);
});

// ------------------------- Socket.IO -------------------------
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});

// Auth gate (expects JWT in handshake.auth.token or Authorization: Bearer)
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      const err = new Error('Unauthorized socket');
      err.data = { code: 'NO_TOKEN' };
      return next(err);
    }
    const payload = jwt.verify(token, env.JWT_SECRET);
    socket.user = { id: payload.id || payload._id || payload.sub || payload.userId || null };
    return next();
  } catch (err) {
    err.data = { code: 'BAD_TOKEN' };
    return next(err);
  }
});

// If you have ./socket.js to wire events, use it; otherwise keep a minimal noop.
(function wireSocketLayer() {
  let wired = false;
  try {
    // eslint-disable-next-line global-require
    const wireSockets = require('./socket');
    if (typeof wireSockets === 'function') {
      wireSockets(io);
      wired = true;
    }
  } catch (e) { /* ignore */ }

  if (!wired) {
    io.on('connection', (socket) => {
  // console.log('[socket] connected', socket.user?.id || 'anon');
      socket.on('disconnect', () => { /* noop */ });
    });
  }
}());

// ------------------------- Start & Shutdown -------------------
const port = env.PORT;
server.listen(port, () => {
  // console.log(`Server running on port ${port} (${env.NODE_ENV})`);
});

async function shutdown(sig) {
  // console.log(`${sig} received — shutting down gracefully`);
  try {
    server.close(async () => {
      try {
        // v7+: returns a Promise; no callback allowed
        await mongoose.connection.close(false);
      } catch (e) {
        // optional log
      }
      process.exit(0);
    });

    // safety timer
    setTimeout(() => process.exit(1), 10_000).unref();
  } catch (e) {
    try { await mongoose.connection.close(false); } catch {}
    process.exit(1);
  }
}

['SIGTERM', 'SIGINT'].forEach(sig => process.on(sig, () => shutdown(sig)));


module.exports = { app, server, io };