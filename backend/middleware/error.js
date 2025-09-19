// backend/middleware/error.js
// Minimal, production-safe error handling with clean logs.

function notFound(req, res, next) {
  const err = new Error(`Not Found - ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProd = (process.env.NODE_ENV || 'development') === 'production';

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

  // Minimal structured log
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({
    level: 'error',
    msg: err.message,
    status,
    method: req.method,
    path: req.originalUrl,
  }));

  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
