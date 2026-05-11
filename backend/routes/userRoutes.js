const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  uploadProfileImage,
  followUser,
  unfollowUser,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../config/upload');

// ── Public Routes ──
router.get('/:id', getProfile);

// ── Protected Routes (must be logged in) ──
router.put('/:id', protect, updateProfile);
router.put('/:id/avatar', protect, upload.single('profileImage'), uploadProfileImage);
router.put('/:id/follow', protect, followUser);
router.put('/:id/unfollow', protect, unfollowUser);

module.exports = router;
