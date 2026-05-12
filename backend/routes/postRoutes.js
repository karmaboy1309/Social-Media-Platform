const express = require('express');
const router = express.Router();
const {
  createPost,
  getPosts,
  getPost,
  deletePost,
  editPost,
  likePost,
} = require('../controllers/postController');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload, handleMulterError } = require('../config/upload');

// ── Public Routes (guests can browse) ──
router.get('/', optionalAuth, getPosts);
router.get('/:id', optionalAuth, getPost);

// ── Protected Routes (must be logged in) ──
router.post('/', protect, upload.single('image'), handleMulterError, createPost);
router.delete('/:id', protect, deletePost);
router.put('/:id', protect, editPost);
router.put('/:id/like', protect, likePost);

module.exports = router;
