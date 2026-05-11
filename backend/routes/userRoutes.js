const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  followUser,
  unfollowUser,
} = require('../controllers/userController');

router.route('/:id').get(getProfile).put(updateProfile);
router.put('/:id/follow', followUser);
router.put('/:id/unfollow', unfollowUser);

module.exports = router;
