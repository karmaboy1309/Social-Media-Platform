const express = require('express');
const router = express.Router();
const {
  createPost,
  getPosts,
  getPost,
  deletePost,
  likePost,
  commentOnPost,
} = require('../controllers/postController');
const { protect, optionalAuth } = require('../middleware/auth');

// ── Public Routes (guests can browse) ──
router.get('/', optionalAuth, getPosts);
router.get('/:id', optionalAuth, getPost);

// ── Protected Routes (must be logged in) ──
router.post('/', protect, createPost);
router.delete('/:id', protect, deletePost);
router.put('/:id/like', protect, likePost);
router.post('/:id/comment', protect, commentOnPost);

module.exports = router;
