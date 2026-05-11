// ══════════════════════════════════════════════════════
// Centralized Error Handler Middleware
// ══════════════════════════════════════════════════════
// Must be registered AFTER all routes in server.js.
// Catches all errors thrown or passed via next(err).
// ══════════════════════════════════════════════════════

const errorHandler = (err, req, res, next) => {
  // Build error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ── Mongoose: Bad ObjectId ──
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 400;
    message = 'Resource not found — invalid ID format';
  }

  // ── Mongoose: Duplicate key ──
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern)[0];
    message = `Duplicate value for "${field}" — this ${field} already exists`;
  }

  // ── Mongoose: Validation error ──
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('. ');
  }

  // ── JWT errors (fallback if not caught by auth middleware) ──
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`\n  ❌ [${statusCode}] ${req.method} ${req.originalUrl}`);
    console.error(`     ${message}`);
    if (statusCode === 500) console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' &&
      statusCode === 500 && { stack: err.stack }),
  });
};

module.exports = errorHandler;
