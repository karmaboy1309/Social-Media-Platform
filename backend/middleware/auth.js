const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ══════════════════════════════════════════════════════
// Authentication & Authorization Middleware
// ══════════════════════════════════════════════════════
// Provides route protection via JWT tokens.
//
// Exports:
//   protect       — Block unauthorized access (401 if no/invalid token)
//   optionalAuth  — Attach user if token exists, but don't block
// ══════════════════════════════════════════════════════

/**
 * Extract JWT token from request.
 * Supports: Authorization: Bearer <token>
 */
const extractToken = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

/**
 * Decode token and return user document.
 * Throws on invalid/expired token or missing user.
 */
const decodeAndFindUser = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  return user;
};

// ──────────────────────────────────────────
// protect — Require valid JWT (strict)
// ──────────────────────────────────────────
// Use on routes that MUST have an authenticated user:
//   router.post('/posts', protect, createPost)
//   router.put('/posts/:id/like', protect, likePost)
//   router.put('/users/:id/follow', protect, followUser)
// ──────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    // 1. Extract token
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied — no authentication token provided',
      });
    }

    // 2. Verify & decode token, find user
    const user = await decodeAndFindUser(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied — user account no longer exists',
      });
    }

    // 3. Attach full user object to request
    req.user = user;
    next();
  } catch (error) {
    return handleAuthError(error, res);
  }
};

// ──────────────────────────────────────────
// optionalAuth — Attach user if token exists
// ──────────────────────────────────────────
// Use on routes that work for both guests and
// logged-in users (e.g. viewing posts — logged-in
// users see if they've liked a post):
//   router.get('/posts', optionalAuth, getPosts)
// ──────────────────────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const user = await decodeAndFindUser(token);
      if (user) {
        req.user = user;
      }
    }

    // Always proceed — user is optional
    next();
  } catch {
    // Token invalid/expired — just proceed without user
    next();
  }
};

// ──────────────────────────────────────────
// Error handler for auth failures
// ──────────────────────────────────────────
const handleAuthError = (error, res) => {
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Access denied — token is malformed or invalid',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Access denied — token has expired, please login again',
    });
  }

  if (error.name === 'NotBeforeError') {
    return res.status(401).json({
      success: false,
      message: 'Access denied — token is not yet active',
    });
  }

  console.error('Auth Middleware Error:', error.message);
  return res.status(500).json({
    success: false,
    message: 'Internal authentication error',
  });
};

module.exports = { protect, optionalAuth };
