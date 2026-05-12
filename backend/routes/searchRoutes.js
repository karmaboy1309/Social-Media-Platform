const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/auth');

// ── Public Routes (with optional auth for consistent context if needed) ──
router.get('/', optionalAuth, globalSearch);

module.exports = router;
